import { createJazzSchemas, type JazzLoadedItem, type JazzLoadedList, type JazzSchema } from "./schema";
import type { JazzSyncPolicy } from "./JazzSyncPolicy";
import { jazzContextSync } from "./JazzSyncPolicy";

type JazzModuleBundle = {
    co: {
        map: (shape: Record<string, unknown>) => JazzSchema;
        list: (item: unknown) => JazzSchema;
        optional: (value: unknown) => unknown;
        plainText: () => unknown;
        image: () => unknown;
    };
    z: {
        string: () => { optional: () => unknown };
        number: () => unknown;
        enum: (values: string[]) => unknown;
    };
    Group: {
        create: () => {
            makePublic?: () => void;
            addMember?: (member: unknown, role: "admin" | "manager" | "writer" | "writeOnly" | "reader") => void;
        };
    };
    CoPlainText: {
        create: (text: string, owner?: unknown) => unknown;
    };
    JazzBrowserContextManager: new () => {
        createContext: (options: {
            sync: {
                peer?: string;
                when: "always" | "never" | "signedUp";
            };
        }) => Promise<void>;
    };
    createImage: (
        image: Blob | File | string,
        options?: {
            owner?: unknown;
            placeholder?: false | "blur";
            maxSize?: number;
            progressive?: boolean;
        }
    ) => Promise<unknown>;
    loadImageBySize: (
        imageDefinitionOrId: unknown,
        width: number,
        height: number
    ) => Promise<{
        image?: { toBlob: () => Blob | null | undefined };
    } | null>;
};

export type { JazzLoadedItem, JazzLoadedList };

type RoomSubscriptionState = {
    room: JazzLoadedList | undefined;
    callback: (room: JazzLoadedList | undefined) => void;
    unsubscribe: () => void;
};

type GlobalJazzState = {
    identity?: string;
    initialization?: Promise<void>;
    ready?: boolean;
};

const globalJazzState = globalThis as typeof globalThis & { __WA_JAZZ_STATE?: GlobalJazzState };

export interface JazzRuntimeConfig {
    policy: JazzSyncPolicy;
}

export interface JazzMessagePayload {
    kind: "text" | "image";
    text: string;
    senderId: string;
    senderName: string;
    createdAt: number;
    image?: unknown;
    fileName?: string;
}

export class JazzRuntime {
    private modules: JazzModuleBundle | undefined;
    private initialized = false;
    private initializedIdentity: string | undefined;
    private initialization: Promise<void> | undefined;
    private initializationIdentity: string | undefined;
    private messageSchema: JazzSchema | undefined;
    private roomSchema: JazzSchema | undefined;
    private roomSubscriptions = new Map<string, RoomSubscriptionState>();

    async init(config: JazzRuntimeConfig): Promise<void> {
        const identity = JSON.stringify(config.policy);
        if (this.initialized) {
            if (this.initializedIdentity !== identity) {
                throw new Error("Jazz runtime is already initialized with an incompatible configuration");
            }
            return;
        }
        if (this.initialization) {
            if (this.initializationIdentity !== identity) {
                throw new Error(
                    "Jazz runtime initialization is already in progress with an incompatible configuration"
                );
            }
            return this.initialization;
        }

        this.initializationIdentity = identity;
        this.initialization = this.initialize(config, identity);
        try {
            await this.initialization;
            this.initialized = true;
            this.initializedIdentity = identity;
        } finally {
            this.initialization = undefined;
            if (!this.initialized) {
                this.initializationIdentity = undefined;
            }
        }
    }

    private async initialize(config: JazzRuntimeConfig, identity: string): Promise<void> {
        const [toolsModule, browserModule, mediaModule] = (await Promise.all([
            import("jazz-tools"),
            import("jazz-tools/browser"),
            import("jazz-tools/media"),
        ])) as [
            Partial<Pick<JazzModuleBundle, "co" | "z" | "Group" | "CoPlainText">>,
            Partial<Pick<JazzModuleBundle, "JazzBrowserContextManager">>,
            Partial<Pick<JazzModuleBundle, "createImage" | "loadImageBySize">>
        ];

        const missingExports: string[] = [];
        if (!toolsModule.co) missingExports.push("co");
        if (!toolsModule.z) missingExports.push("z");
        if (!toolsModule.Group) missingExports.push("Group");
        if (!toolsModule.CoPlainText) missingExports.push("CoPlainText");
        if (!browserModule.JazzBrowserContextManager) missingExports.push("JazzBrowserContextManager");
        if (!mediaModule.createImage) missingExports.push("createImage");
        if (!mediaModule.loadImageBySize) missingExports.push("loadImageBySize");
        if (missingExports.length > 0) {
            throw new Error(
                `[Jazz Chat] Incompatible jazz-tools package. Missing exports: ${missingExports.join(", ")}.`
            );
        }

        this.modules = {
            co: toolsModule.co as JazzModuleBundle["co"],
            z: toolsModule.z as JazzModuleBundle["z"],
            Group: toolsModule.Group as JazzModuleBundle["Group"],
            CoPlainText: toolsModule.CoPlainText as JazzModuleBundle["CoPlainText"],
            JazzBrowserContextManager:
                browserModule.JazzBrowserContextManager as JazzModuleBundle["JazzBrowserContextManager"],
            createImage: mediaModule.createImage as JazzModuleBundle["createImage"],
            loadImageBySize: mediaModule.loadImageBySize as JazzModuleBundle["loadImageBySize"],
        };

        const state = globalJazzState.__WA_JAZZ_STATE ?? (globalJazzState.__WA_JAZZ_STATE = {});
        if (state.identity && state.identity !== identity) {
            throw new Error("Jazz context is already initialized with an incompatible configuration");
        }
        if (!state.ready) {
            state.identity ??= identity;
            state.initialization ??= (async () => {
                const manager = new this.modules!.JazzBrowserContextManager();
                await manager.createContext({ sync: { ...jazzContextSync(config.policy) } });
                state.ready = true;
            })().catch((error) => {
                state.initialization = undefined;
                if (!state.ready && state.identity === identity) {
                    state.identity = undefined;
                }
                throw error;
            });
            await state.initialization;
        }

        const { messageSchema, roomSchema } = createJazzSchemas(this.modules.co, this.modules.z);
        this.messageSchema = messageSchema;
        this.roomSchema = roomSchema;
    }

    async resolveRoomId(storageKey: string, explicitRoomId?: string): Promise<string> {
        const roomId = explicitRoomId ?? this.getItem(storageKey);
        if (roomId) {
            return roomId;
        }

        const room = this.createRoom();
        await this.confirmRoomPersistence(room);
        this.setItem(storageKey, room.$jazz.id);
        return room.$jazz.id;
    }

    async createRoomId(): Promise<string> {
        const room = this.createRoom();
        await this.confirmRoomPersistence(room);
        return room.$jazz.id;
    }

    subscribeRoom(roomId: string, callback: (room: JazzLoadedList | undefined) => void): () => void {
        const roomSchema = this.ensureRoomSchema();
        const previousState = this.roomSubscriptions.get(roomId);
        const state: RoomSubscriptionState = {
            room: undefined,
            callback,
            unsubscribe: () => undefined,
        };
        this.roomSubscriptions.set(roomId, state);

        try {
            const unsubscribeOrSubscription = roomSchema.subscribe(
                roomId,
                {
                    resolve: {
                        $each: {
                            text: true,
                            image: true,
                        },
                    },
                },
                (value: JazzLoadedList | undefined) => {
                    state.room = value;
                    callback(value);
                }
            );

            state.unsubscribe =
                typeof unsubscribeOrSubscription === "function"
                    ? unsubscribeOrSubscription
                    : unsubscribeOrSubscription.unsubscribe.bind(unsubscribeOrSubscription);
            previousState?.unsubscribe();
        } catch (error) {
            if (this.roomSubscriptions.get(roomId) === state) {
                if (previousState) {
                    this.roomSubscriptions.set(roomId, previousState);
                } else {
                    this.roomSubscriptions.delete(roomId);
                }
            }
            throw error;
        }

        return () => {
            state.unsubscribe();
            if (this.roomSubscriptions.get(roomId) === state) {
                this.roomSubscriptions.delete(roomId);
            }
        };
    }

    async sendText(roomId: string, payload: Omit<JazzMessagePayload, "kind" | "image">): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const message = this.createMessage(
            {
                ...payload,
                kind: "text",
            },
            room.$jazz.owner
        );
        room.$jazz.push(message);
        this.notifyRoomSubscription(roomId, room);
    }

    async sendImage(
        roomId: string,
        file: File,
        payload: Omit<JazzMessagePayload, "kind" | "image" | "fileName">
    ): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const modules = this.ensureModules();

        const image = await modules.createImage(file, {
            owner: room.$jazz.owner,
        });

        const message = this.createMessage(
            {
                ...payload,
                kind: "image",
                text: file.name,
                fileName: file.name,
                image,
            },
            room.$jazz.owner
        );
        room.$jazz.push(message);
        this.notifyRoomSubscription(roomId, room);
    }

    async editMessage(roomId: string, messageId: string, newText: string): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const message = room.find((item) => item?.$jazz?.id === messageId);
        if (!message) {
            return;
        }
        const modules = this.ensureModules();
        message.$jazz.set("text", modules.CoPlainText.create(newText, room.$jazz.owner));
        this.notifyRoomSubscription(roomId, room);
    }

    async removeMessage(roomId: string, messageId: string): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const index = room.findIndex((item) => item?.$jazz?.id === messageId);
        if (index < 0) {
            return;
        }
        room.$jazz.remove(index);
        this.notifyRoomSubscription(roomId, room);
    }

    async resolveImageUrl(imageDefinitionOrId: unknown): Promise<string | undefined> {
        if (!imageDefinitionOrId) {
            return undefined;
        }
        const modules = this.ensureModules();
        const loaded = await modules.loadImageBySize(imageDefinitionOrId, 1280, 1280);
        const blob = loaded?.image?.toBlob?.();
        if (!blob) {
            return undefined;
        }
        return URL.createObjectURL(blob);
    }

    destroy(): void {
        for (const subscription of this.roomSubscriptions.values()) {
            subscription.unsubscribe();
        }
        this.roomSubscriptions.clear();
    }

    private notifyRoomSubscription(roomId: string, room: JazzLoadedList): void {
        const subscription = this.roomSubscriptions.get(roomId);
        if (!subscription || subscription.room !== room || !room.$isLoaded) {
            return;
        }
        subscription.callback(room);
    }

    private async confirmRoomPersistence(room: JazzLoadedList): Promise<void> {
        const waitForSync = room.$jazz.waitForSync;
        if (typeof waitForSync !== "function") {
            throw new Error("Jazz room persistence confirmation is unavailable");
        }
        await waitForSync.call(room.$jazz);
    }

    private createRoom(): JazzLoadedList {
        const roomSchema = this.ensureRoomSchema();
        const modules = this.ensureModules();
        const owner = modules.Group.create();
        owner.makePublic?.();
        owner.addMember?.("everyone", "writer");
        return roomSchema.create([], owner) as JazzLoadedList;
    }

    private createMessage(payload: JazzMessagePayload, owner: unknown): JazzLoadedItem {
        const messageSchema = this.ensureMessageSchema();
        const modules = this.ensureModules();
        return messageSchema.create(
            {
                kind: payload.kind,
                text: modules.CoPlainText.create(payload.text, owner),
                senderId: payload.senderId,
                senderName: payload.senderName,
                createdAt: payload.createdAt,
                image: payload.image,
                fileName: payload.fileName,
            },
            owner
        ) as JazzLoadedItem;
    }

    private ensureLoadedRoom(roomId: string): JazzLoadedList {
        const room = this.roomSubscriptions.get(roomId)?.room;
        if (!room || !room.$isLoaded) {
            throw new Error(`Jazz room ${roomId} is not loaded yet`);
        }
        return room;
    }

    private ensureModules(): JazzModuleBundle {
        if (!this.modules) {
            throw new Error("Jazz runtime is not initialized");
        }
        return this.modules;
    }

    private ensureMessageSchema(): JazzSchema {
        if (!this.messageSchema) {
            throw new Error("Jazz message schema is not initialized");
        }
        return this.messageSchema;
    }

    private ensureRoomSchema(): JazzSchema {
        if (!this.roomSchema) {
            throw new Error("Jazz room schema is not initialized");
        }
        return this.roomSchema;
    }

    private getItem(key: string): string | null {
        try {
            const storage = globalThis.localStorage;
            if (!storage) throw new Error("localStorage is unavailable");
            return storage.getItem(key);
        } catch (error) {
            throw new Error(`Unable to read Jazz room pointer ${key}: ${String(error)}`);
        }
    }

    private setItem(key: string, value: string): void {
        try {
            if (!globalThis.localStorage) throw new Error("localStorage is unavailable");
            globalThis.localStorage.setItem(key, value);
        } catch (error) {
            throw new Error(`Unable to persist Jazz room pointer ${key}: ${String(error)}`);
        }
    }
}
