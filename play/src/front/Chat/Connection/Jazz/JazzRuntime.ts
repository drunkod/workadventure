import { createJazzSchemas, type JazzLoadedItem, type JazzLoadedList, type JazzSchema } from "./schema";

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
                peer: string;
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
    loadImageBySize: (imageDefinitionOrId: unknown, width: number, height: number) => Promise<{
        image?: { toBlob: () => Blob | null | undefined };
    } | null>;
};

export type { JazzLoadedItem, JazzLoadedList };

type RoomSubscriptionState = {
    room: JazzLoadedList | undefined;
    unsubscribe: () => void;
};

export interface JazzRuntimeConfig {
    syncPeer?: string;
    apiKey?: string;
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
    private messageSchema: JazzSchema | undefined;
    private roomSchema: JazzSchema | undefined;
    private roomSubscriptions = new Map<string, RoomSubscriptionState>();

    async init(config: JazzRuntimeConfig): Promise<void> {
        if (this.initialized) {
            return;
        }

        const [toolsModule, browserModule, mediaModule] = (await Promise.all([
            import("jazz-tools"),
            import("jazz-tools/browser"),
            import("jazz-tools/media"),
        ])) as [
            Partial<Pick<JazzModuleBundle, "co" | "z" | "Group" | "CoPlainText">>,
            Partial<Pick<JazzModuleBundle, "JazzBrowserContextManager">>,
            Partial<Pick<JazzModuleBundle, "createImage" | "loadImageBySize">>,
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
            throw new Error(`[Jazz Chat] Incompatible jazz-tools package. Missing exports: ${missingExports.join(", ")}.`);
        }

        this.modules = {
            co: toolsModule.co as JazzModuleBundle["co"],
            z: toolsModule.z as JazzModuleBundle["z"],
            Group: toolsModule.Group as JazzModuleBundle["Group"],
            CoPlainText: toolsModule.CoPlainText as JazzModuleBundle["CoPlainText"],
            JazzBrowserContextManager: browserModule.JazzBrowserContextManager as JazzModuleBundle["JazzBrowserContextManager"],
            createImage: mediaModule.createImage as JazzModuleBundle["createImage"],
            loadImageBySize: mediaModule.loadImageBySize as JazzModuleBundle["loadImageBySize"],
        };

        const globalJazzState = globalThis as { __WA_JAZZ_CONTEXT_READY?: boolean };
        if (!globalJazzState.__WA_JAZZ_CONTEXT_READY) {
            const peer = config.syncPeer ?? this.buildCloudPeer(config.apiKey);
            const manager = new this.modules.JazzBrowserContextManager();
            try {
                await manager.createContext({
                    sync: {
                        peer,
                        when: "always",
                    },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (!/already|existing|initialized/i.test(message)) {
                    throw error;
                }
            }
            globalJazzState.__WA_JAZZ_CONTEXT_READY = true;
        }

        const { messageSchema, roomSchema } = createJazzSchemas(this.modules.co, this.modules.z);
        this.messageSchema = messageSchema;
        this.roomSchema = roomSchema;
        this.initialized = true;
    }

    async resolveRoomId(storageKey: string, explicitRoomId?: string): Promise<string> {
        const roomId = explicitRoomId ?? this.getItem(storageKey);
        if (roomId) {
            return roomId;
        }

        const room = this.createRoom();
        await room.$jazz.waitForSync?.();
        this.setItem(storageKey, room.$jazz.id);
        return room.$jazz.id;
    }

    async createRoomId(): Promise<string> {
        const room = this.createRoom();
        await room.$jazz.waitForSync?.();
        return room.$jazz.id;
    }

    subscribeRoom(roomId: string, callback: (room: JazzLoadedList | undefined) => void): () => void {
        const roomSchema = this.ensureRoomSchema();

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
                const state = this.roomSubscriptions.get(roomId);
                if (state) {
                    state.room = value;
                }
                callback(value);
            }
        );

        const unsubscribe =
            typeof unsubscribeOrSubscription === "function"
                ? unsubscribeOrSubscription
                : unsubscribeOrSubscription.unsubscribe.bind(unsubscribeOrSubscription);

        this.roomSubscriptions.set(roomId, {
            room: undefined,
            unsubscribe,
        });

        return () => {
            const state = this.roomSubscriptions.get(roomId);
            state?.unsubscribe();
            this.roomSubscriptions.delete(roomId);
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
    }

    async sendImage(roomId: string, file: File, payload: Omit<JazzMessagePayload, "kind" | "image" | "fileName">): Promise<void> {
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
    }

    async editMessage(roomId: string, messageId: string, newText: string): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const message = room.find((item) => item?.$jazz?.id === messageId);
        if (!message) {
            return;
        }
        const modules = this.ensureModules();
        message.$jazz.set("text", modules.CoPlainText.create(newText, room.$jazz.owner));
    }

    async removeMessage(roomId: string, messageId: string): Promise<void> {
        const room = this.ensureLoadedRoom(roomId);
        const index = room.findIndex((item) => item?.$jazz?.id === messageId);
        if (index < 0) {
            return;
        }
        room.$jazz.remove(index);
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

    private buildCloudPeer(apiKey?: string): string {
        const safeApiKey = apiKey && apiKey.trim() !== "" ? apiKey : "workadventure-chat@example.com";
        return `wss://cloud.jazz.tools/?key=${encodeURIComponent(safeApiKey)}`;
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
            return globalThis.localStorage?.getItem(key) ?? null;
        } catch {
            return null;
        }
    }

    private setItem(key: string, value: string): void {
        try {
            globalThis.localStorage?.setItem(key, value);
        } catch {
            // Ignore storage errors in private mode / restricted environments.
        }
    }
}
