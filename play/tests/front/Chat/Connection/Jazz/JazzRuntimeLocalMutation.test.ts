import { beforeEach, describe, expect, it, vi } from "vitest";
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

function configureRuntime(runtime: JazzRuntime, room: JazzLoadedList) {
    let roomCallback: ((value: JazzLoadedList | undefined) => void) | undefined;
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_id, _resolve, callback) => {
        roomCallback = callback;
        return unsubscribe;
    });
    const roomSchema: JazzSchema = {
        create: vi.fn(),
        subscribe,
    };
    const internals = runtime as unknown as RuntimeInternals;
    internals.roomSchema = roomSchema;
    internals.messageSchema = createMessageSchema();
    internals.modules = {
        CoPlainText: { create: (text: string) => text },
        createImage: vi.fn().mockResolvedValue({ id: "image-1" }),
    };

    return {
        emit(value: JazzLoadedList | undefined) {
            if (!roomCallback) throw new Error("room subscription callback not registered");
            roomCallback(value);
        },
        subscribe,
        unsubscribe,
    };
}

const payload = {
    text: "hello",
    senderId: "user-1",
    senderName: "User",
    createdAt: 1,
};

describe("JazzRuntime local mutation projection", () => {
    let runtime: JazzRuntime;
    let room: JazzLoadedList;
    let emit!: (value: JazzLoadedList | undefined) => void;
    let subscribe: ReturnType<typeof vi.fn>;
    let unsubscribe: ReturnType<typeof vi.fn>;
    let observer: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        runtime = new JazzRuntime();
        room = createLoadedRoom();
        const configured = configureRuntime(runtime, room);
        emit = configured.emit;
        subscribe = configured.subscribe;
        unsubscribe = configured.unsubscribe;
        observer = vi.fn();
        runtime.subscribeRoom("room-1", observer);
        emit(room);
        expect(observer).toHaveBeenCalledTimes(1);
    });

    it("notifies the active room projection after text and image pushes", async () => {
        await runtime.sendText("room-1", payload);
        expect(room).toHaveLength(1);
        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenLastCalledWith(room);

        await runtime.sendImage(
            "room-1",
            new File(["png"], "image.png", { type: "image/png" }),
            { ...payload, text: "image.png" },
        );
        expect(room).toHaveLength(2);
        expect(observer).toHaveBeenCalledTimes(3);
        expect(observer).toHaveBeenLastCalledWith(room);
    });

    it("notifies only successful edit and remove mutations", async () => {
        const item = createMessageSchema().create(payload, room.$jazz.owner) as JazzLoadedItem;
        room.$jazz.push(item);

        await runtime.editMessage("room-1", item.$jazz.id, "edited");
        expect(item.text).toBe("edited");
        expect(observer).toHaveBeenCalledTimes(2);

        await runtime.editMessage("room-1", "missing", "ignored");
        expect(observer).toHaveBeenCalledTimes(2);

        await runtime.removeMessage("room-1", item.$jazz.id);
        expect(room).toHaveLength(0);
        expect(observer).toHaveBeenCalledTimes(3);

        await runtime.removeMessage("room-1", "missing");
        expect(observer).toHaveBeenCalledTimes(3);
    });

    it("preserves the existing active subscription when replacement setup fails", async () => {
        const replacementObserver = vi.fn();
        subscribe.mockImplementationOnce(() => {
            throw new Error("replacement failed");
        });

        expect(() => runtime.subscribeRoom("room-1", replacementObserver)).toThrow("replacement failed");

        await runtime.sendText("room-1", payload);
        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenLastCalledWith(room);
        expect(replacementObserver).not.toHaveBeenCalled();
        expect(unsubscribe).not.toHaveBeenCalled();
    });
});
