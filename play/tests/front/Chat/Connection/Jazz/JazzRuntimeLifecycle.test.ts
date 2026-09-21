import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JazzBrowserContextManager } from "jazz-tools/browser";
import { JazzRuntime } from "../../../../../src/front/Chat/Connection/Jazz/JazzRuntime";

const localConfig = { policy: { mode: "local" as const } };
const peerConfig = { policy: { mode: "peer" as const, peer: "ws://localhost:9000" } };

type TestStorage = {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
};

type FakeRoom = ReturnType<typeof fakeRoom>;

function fakeRoom(waitForSync: (() => Promise<void>) | undefined) {
    return Object.assign([], {
        $isLoaded: true,
        $jazz: {
            id: "room-created",
            owner: {},
            push: vi.fn(),
            remove: vi.fn(),
            waitForSync,
        },
    });
}

describe("JazzRuntime lifecycle", () => {
    let originalStorageDescriptor: PropertyDescriptor | undefined;
    let storage: TestStorage;
    let createContext: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        delete (globalThis as typeof globalThis & { __WA_JAZZ_STATE?: unknown }).__WA_JAZZ_STATE;
        originalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
        storage = {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
        };
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: storage,
        });

        createContext = vi
            .spyOn(JazzBrowserContextManager.prototype, "createContext")
            .mockResolvedValue(undefined as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete (globalThis as typeof globalThis & { __WA_JAZZ_STATE?: unknown }).__WA_JAZZ_STATE;
        if (originalStorageDescriptor) {
            Object.defineProperty(globalThis, "localStorage", originalStorageDescriptor);
        } else {
            Reflect.deleteProperty(globalThis, "localStorage");
        }
    });

    it("shares one compatible global context initialization and keeps same-config init idempotent", async () => {
        let releaseContext!: () => void;
        createContext.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    releaseContext = resolve;
                }) as never
        );

        const firstRuntime = new JazzRuntime();
        const secondRuntime = new JazzRuntime();
        const first = firstRuntime.init(localConfig);
        const second = secondRuntime.init(localConfig);

        await vi.waitFor(() => expect(createContext).toHaveBeenCalledTimes(1));
        expect(createContext).toHaveBeenCalledWith({ sync: { when: "never" } });

        releaseContext();
        await Promise.all([first, second]);

        await firstRuntime.init(localConfig);
        expect(createContext).toHaveBeenCalledTimes(1);
    });

    it("rejects incompatible reinitialization without replacing the active context", async () => {
        const runtime = new JazzRuntime();
        await runtime.init(localConfig);

        await expect(runtime.init(peerConfig)).rejects.toThrow("incompatible configuration");

        const secondRuntime = new JazzRuntime();
        await expect(secondRuntime.init(peerConfig)).rejects.toThrow("incompatible configuration");
        expect(createContext).toHaveBeenCalledTimes(1);
    });

    it("clears a failed context attempt so an equivalent retry can succeed", async () => {
        createContext.mockRejectedValueOnce(new Error("indexeddb denied")).mockResolvedValueOnce(undefined as never);
        const runtime = new JazzRuntime();

        await expect(runtime.init(localConfig)).rejects.toThrow("indexeddb denied");
        await expect(runtime.init(localConfig)).resolves.toBeUndefined();

        expect(createContext).toHaveBeenCalledTimes(2);
    });

    it("preserves an existing pointer and never allocates a replacement room", async () => {
        storage.getItem.mockReturnValue("stale-room-id");
        const runtime = new JazzRuntime();
        const createRoom = vi.spyOn(runtime as unknown as { createRoom: () => FakeRoom }, "createRoom");

        await expect(runtime.resolveRoomId("wa:jazz:main:test")).resolves.toBe("stale-room-id");
        expect(createRoom).not.toHaveBeenCalled();
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it("fails before allocation when room-pointer storage cannot be read", async () => {
        storage.getItem.mockImplementation(() => {
            throw new Error("denied");
        });
        const runtime = new JazzRuntime();
        const createRoom = vi.spyOn(runtime as unknown as { createRoom: () => FakeRoom }, "createRoom");

        await expect(runtime.resolveRoomId("wa:jazz:main:test")).rejects.toThrow("Unable to read Jazz room pointer");
        expect(createRoom).not.toHaveBeenCalled();
    });

    it("accepts an explicit room id without consulting local pointer storage", async () => {
        storage.getItem.mockImplementation(() => {
            throw new Error("denied");
        });
        const runtime = new JazzRuntime();

        await expect(runtime.resolveRoomId("wa:jazz:main:test", "explicit-room")).resolves.toBe("explicit-room");
        expect(storage.getItem).not.toHaveBeenCalled();
    });

    it("confirms persistence before writing a newly created room pointer", async () => {
        const runtime = new JazzRuntime();
        await runtime.init(localConfig);
        const waitForSync = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(runtime as unknown as { createRoom: () => FakeRoom }, "createRoom").mockReturnValue(
            fakeRoom(waitForSync)
        );

        await expect(runtime.resolveRoomId("wa:jazz:main:test")).resolves.toBe("room-created");

        expect(waitForSync).toHaveBeenCalledTimes(1);
        expect(storage.setItem).toHaveBeenCalledWith("wa:jazz:main:test", "room-created");
        expect(waitForSync.mock.invocationCallOrder[0]).toBeLessThan(storage.setItem.mock.invocationCallOrder[0]);
    });

    it("fails closed when Jazz cannot provide persistence confirmation", async () => {
        const runtime = new JazzRuntime();
        await runtime.init(localConfig);
        vi.spyOn(runtime as unknown as { createRoom: () => FakeRoom }, "createRoom").mockReturnValue(
            fakeRoom(undefined)
        );

        await expect(runtime.resolveRoomId("wa:jazz:main:test")).rejects.toThrow(
            "Jazz room persistence confirmation is unavailable"
        );
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it("surfaces pointer write failures after persistence confirmation", async () => {
        const runtime = new JazzRuntime();
        await runtime.init(localConfig);
        const waitForSync = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(runtime as unknown as { createRoom: () => FakeRoom }, "createRoom").mockReturnValue(
            fakeRoom(waitForSync)
        );
        storage.setItem.mockImplementation(() => {
            throw new Error("denied");
        });

        await expect(runtime.resolveRoomId("wa:jazz:main:test")).rejects.toThrow("Unable to persist Jazz room pointer");
        expect(waitForSync).toHaveBeenCalledTimes(1);
    });
});
