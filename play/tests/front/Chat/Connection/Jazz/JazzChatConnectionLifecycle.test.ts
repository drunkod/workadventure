import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

const mocks = vi.hoisted(() => ({
    runtimeInit: vi.fn(),
    resolveRoomId: vi.fn(),
    subscribeRoom: vi.fn(),
    runtimeDestroy: vi.fn(),
    unsubscribe: vi.fn(),
}));

vi.mock("../../../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: {
        getLocalUser: () => undefined,
        getChatId: () => "test-chat-id",
        getName: () => "Test User",
    },
}));

vi.mock("../../../../../src/front/Chat/Connection/Jazz/JazzRuntime", () => ({
    JazzRuntime: class {
        init(config: unknown) {
            return mocks.runtimeInit(config);
        }

        resolveRoomId(storageKey: string, explicitRoomId?: string) {
            return mocks.resolveRoomId(storageKey, explicitRoomId);
        }

        subscribeRoom(roomId: string, callback: (room: unknown) => void) {
            return mocks.subscribeRoom(roomId, callback);
        }

        destroy() {
            mocks.runtimeDestroy();
        }
    },
}));

import { JazzChatConnection } from "../../../../../src/front/Chat/Connection/Jazz/JazzChatConnection";

function loadedRoom() {
    return Object.assign([], {
        $isLoaded: true,
        $jazz: {
            id: "main-room",
            owner: {},
            push: vi.fn(),
            remove: vi.fn(),
        },
    });
}

function unloadedRoom() {
    return Object.assign([], {
        $isLoaded: false,
        $jazz: {
            id: "main-room",
            owner: {},
            push: vi.fn(),
            remove: vi.fn(),
        },
    });
}

function createConnection() {
    return new JazzChatConnection({
        roomStorageKey: "test",
        defaultRoomName: "Main",
        syncMode: "local",
    });
}

describe("JazzChatConnection lifecycle", () => {
    beforeEach(() => {
        vi.useRealTimers();
        mocks.runtimeInit.mockReset().mockResolvedValue(undefined);
        mocks.resolveRoomId.mockReset().mockResolvedValue("main-room");
        mocks.unsubscribe.mockReset();
        mocks.runtimeDestroy.mockReset();
        mocks.subscribeRoom.mockReset().mockImplementation((_roomId, callback) => {
            queueMicrotask(() => callback(loadedRoom()));
            return mocks.unsubscribe;
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shares one in-flight initialization and remains idempotent after readiness", async () => {
        const connection = createConnection();

        const first = connection.init();
        const second = connection.init();
        await Promise.all([first, second]);

        expect(mocks.runtimeInit).toHaveBeenCalledTimes(1);
        expect(mocks.resolveRoomId).toHaveBeenCalledTimes(1);
        expect(mocks.subscribeRoom).toHaveBeenCalledTimes(1);
        expect(get(connection.connectionStatus)).toBe("ONLINE");

        await connection.init();
        expect(mocks.runtimeInit).toHaveBeenCalledTimes(1);
        expect(mocks.subscribeRoom).toHaveBeenCalledTimes(1);
    });

    it("does not report ONLINE until the real room subscription is loaded and usable", async () => {
        let callback!: (room: unknown) => void;
        mocks.subscribeRoom.mockImplementation((_roomId, next) => {
            callback = next;
            return mocks.unsubscribe;
        });

        const connection = createConnection();
        let settled = false;
        const init = connection.init().then(() => {
            settled = true;
        });

        await vi.waitFor(() => expect(mocks.subscribeRoom).toHaveBeenCalledTimes(1));
        callback(undefined);
        callback(unloadedRoom());
        await Promise.resolve();

        expect(settled).toBe(false);
        expect(get(connection.connectionStatus)).toBe("CONNECTING");

        callback(loadedRoom());
        await init;

        expect(settled).toBe(true);
        expect(get(connection.connectionStatus)).toBe("ONLINE");
    });

    it("times out at 5000 ms, aborts readiness, and fences a late loaded callback", async () => {
        vi.useFakeTimers();
        let callback!: (room: unknown) => void;
        mocks.subscribeRoom.mockImplementation((_roomId, next) => {
            callback = next;
            return mocks.unsubscribe;
        });

        const connection = createConnection();
        const init = connection.init();
        const rejection = expect(init).rejects.toThrow("Jazz main room readiness timed out after 5000 ms");

        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(mocks.subscribeRoom).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(5000);
        await rejection;

        expect(get(connection.connectionStatus)).toBe("ON_ERROR");
        expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);

        callback(loadedRoom());
        await Promise.resolve();
        expect(get(connection.connectionStatus)).toBe("ON_ERROR");
        expect(vi.getTimerCount()).toBe(0);
    });

    it("clears the readiness timer after successful initialization", async () => {
        vi.useFakeTimers();
        const connection = createConnection();

        const init = connection.init();
        await vi.runAllTicks();
        await init;

        expect(get(connection.connectionStatus)).toBe("ONLINE");
        expect(vi.getTimerCount()).toBe(0);
    });

    it("clears only a failed connection attempt so an equivalent retry can succeed", async () => {
        mocks.resolveRoomId.mockRejectedValueOnce(new Error("pointer read denied")).mockResolvedValueOnce("main-room");
        const connection = createConnection();

        await expect(connection.init()).rejects.toThrow("pointer read denied");
        expect(get(connection.connectionStatus)).toBe("ON_ERROR");

        await expect(connection.init()).resolves.toBeUndefined();
        expect(get(connection.connectionStatus)).toBe("ONLINE");
        expect(mocks.runtimeInit).toHaveBeenCalledTimes(2);
        expect(mocks.resolveRoomId).toHaveBeenCalledTimes(2);
        expect(mocks.subscribeRoom).toHaveBeenCalledTimes(1);
    });
});
