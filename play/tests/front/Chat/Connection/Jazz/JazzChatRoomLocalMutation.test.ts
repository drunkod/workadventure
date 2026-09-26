import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatUser } from "../../../../../src/front/Chat/Connection/ChatConnection";
import {
    JazzChatRoom,
    type JazzChatConnectionContext,
} from "../../../../../src/front/Chat/Connection/Jazz/JazzChatRoom";
import { JazzRuntime } from "../../../../../src/front/Chat/Connection/Jazz/JazzRuntime";
import type {
    JazzLoadedItem,
    JazzLoadedList,
    JazzSchema,
} from "../../../../../src/front/Chat/Connection/Jazz/schema";

type RuntimeInternals = {
    modules: {
        CoPlainText: { create: (text: string) => string };
        createImage: (file: File, options?: unknown) => Promise<unknown>;
    };
    messageSchema: JazzSchema;
    roomSchema: JazzSchema;
};

function createLoadedRoom(): JazzLoadedList {
    const room = [] as unknown as JazzLoadedList;
    Object.assign(room, {
        $isLoaded: true,
        $jazz: {
            id: "room-1",
            owner: { id: "owner-1" },
            push: (...items: JazzLoadedItem[]) => Array.prototype.push.apply(room, items),
            remove: (...indexes: number[]) => {
                const removed: JazzLoadedItem[] = [];
                for (const index of [...indexes].sort((a, b) => b - a)) {
                    removed.unshift(...room.splice(index, 1));
                }
                return removed;
            },
        },
    });
    return room;
}

function createMessageSchema(): JazzSchema {
    let nextId = 0;
    return {
        create(value: unknown, owner?: unknown) {
            const item = {
                ...(value as Record<string, unknown>),
                $jazz: {
                    id: `message-${++nextId}`,
                    owner,
                    set(key: string, nextValue: unknown) {
                        (item as Record<string, unknown>)[key] = nextValue;
                    },
                },
            };
            return item;
        },
        subscribe: vi.fn(),
    };
}

function configureRuntime(runtime: JazzRuntime) {
    let roomCallback: ((value: JazzLoadedList | undefined) => void) | undefined;
    let active = true;
    const unsubscribe = vi.fn(() => {
        active = false;
    });
    const roomSchema: JazzSchema = {
        create: vi.fn(),
        subscribe: vi.fn((_id, _resolve, callback) => {
            roomCallback = callback;
            active = true;
            return unsubscribe;
        }),
    };
    const internals = runtime as unknown as RuntimeInternals;
    internals.roomSchema = roomSchema;
    internals.messageSchema = createMessageSchema();
    internals.modules = {
        CoPlainText: { create: (text: string) => text },
        createImage: vi.fn().mockResolvedValue({ id: "image-1" }),
    };
    vi.spyOn(runtime, "resolveImageUrl").mockResolvedValue("blob:local-first-image");

    return {
        emit(value: JazzLoadedList | undefined) {
            if (active) {
                if (!roomCallback) throw new Error("room subscription callback not registered");
                roomCallback(value);
            }
        },
        unsubscribe,
    };
}

function createConnection(): JazzChatConnectionContext {
    const currentUser = {
        chatId: "user-1",
        username: "User",
    } as unknown as ChatUser;
    return {
        currentUser,
        getOrCreateUser: () => currentUser,
    };
}

const payload = {
    text: "hello",
    senderId: "user-1",
    senderName: "User",
    createdAt: 1,
};

describe("JazzChatRoom local mutation live projection", () => {
    let runtime: JazzRuntime;
    let loadedRoom: JazzLoadedList;
    let room: JazzChatRoom;
    let emit!: (value: JazzLoadedList | undefined) => void;
    let unsubscribe: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        runtime = new JazzRuntime();
        loadedRoom = createLoadedRoom();
        const configured = configureRuntime(runtime);
        emit = configured.emit;
        unsubscribe = configured.unsubscribe;
        room = new JazzChatRoom(createConnection(), runtime, "room-1", "Jazz chat", "multiple");

        const initialization = room.init();
        emit(loadedRoom);
        await initialization;
        expect(room.messages).toHaveLength(0);
    });

    it("updates the initialized room after text, image, edit, and delete mutations", async () => {
        await runtime.sendText("room-1", payload);
        await vi.waitFor(() => expect(room.messages).toHaveLength(1));
        expect(get(room.messages[0].content).body).toBe("hello");

        await runtime.sendImage(
            "room-1",
            new File(["png"], "local-first.png", { type: "image/png" }),
            { ...payload, text: "local-first.png" },
        );
        await vi.waitFor(() => expect(room.messages).toHaveLength(2));
        expect(get(room.messages[1].content)).toMatchObject({
            body: "local-first.png",
            url: "blob:local-first-image",
        });

        const textId = room.messages[0].id;
        await runtime.editMessage("room-1", textId, "edited");
        await vi.waitFor(() => expect(get(room.messages[0].content).body).toBe("edited"));

        await runtime.removeMessage("room-1", textId);
        await vi.waitFor(() => expect(room.messages).toHaveLength(1));
        expect(get(room.messages[0].content).body).toBe("local-first.png");
    });

    it("does not repopulate the room after destroy", async () => {
        await runtime.sendText("room-1", payload);
        await vi.waitFor(() => expect(room.messages).toHaveLength(1));

        await room.destroy();
        expect(room.messages).toHaveLength(0);
        expect(unsubscribe).toHaveBeenCalledTimes(1);

        loadedRoom.$jazz.push(createMessageSchema().create(payload, loadedRoom.$jazz.owner) as JazzLoadedItem);
        emit(loadedRoom);
        await Promise.resolve();
        expect(room.messages).toHaveLength(0);
    });

    it("invalidates an in-flight image projection when destroyed", async () => {
        let resolveImage!: (url: string | undefined) => void;
        const resolveImageUrl = vi
            .spyOn(runtime, "resolveImageUrl")
            .mockImplementation(() => new Promise((resolve) => (resolveImage = resolve)));

        loadedRoom.$jazz.push(
            createMessageSchema().create(
                {
                    ...payload,
                    kind: "image",
                    text: "delayed.png",
                    image: { id: "image-delayed" },
                },
                loadedRoom.$jazz.owner,
            ) as JazzLoadedItem,
        );
        emit(loadedRoom);
        await vi.waitFor(() => expect(resolveImageUrl).toHaveBeenCalledTimes(1));

        await room.destroy();
        resolveImage("blob:delayed-image");
        await vi.waitFor(() => expect(room.messages).toHaveLength(0));
    });
});
