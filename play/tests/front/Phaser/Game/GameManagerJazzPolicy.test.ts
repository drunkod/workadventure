import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    runtimeInit: vi.fn(),
    matrixConstructor: vi.fn(),
    matrixInit: vi.fn(),
    trueStore: {
        subscribe(run: (value: boolean) => void) {
            run(true);
            return () => undefined;
        },
    },
}));

vi.mock("@sentry/svelte", () => ({
    captureException: vi.fn(),
    setUser: vi.fn(),
}));

vi.mock("../../../../src/front/Enum/EnvironmentVariable", () => ({
    JAZZ_CHAT_ENABLED: true,
    JAZZ_SYNC_MODE: "invalid",
    JAZZ_SYNC_PEER: undefined,
    JAZZ_API_KEY: undefined,
    JAZZ_GLOBAL_ROOM_ID: undefined,
    MATRIX_PUBLIC_URI: "https://matrix.example.test",
}));
vi.mock("../../../../src/front/Chat/Connection/Jazz/JazzRuntime", () => ({
    JazzRuntime: class {
        init() {
            return mocks.runtimeInit();
        }

        destroy() {}
    },
}));

vi.mock("../../../../src/front/Chat/Connection/Jazz/JazzChatRoom", () => ({
    JazzChatRoom: class {},
}));

vi.mock("../../../../src/front/Chat/Connection/Matrix/MatrixClientWrapper", () => ({
    InvalidLoginTokenError: class InvalidLoginTokenError extends Error {},
    MatrixClientWrapper: class {
        constructor(...args: unknown[]) {
            mocks.matrixConstructor(...args);
        }

        initMatrixClient() {
            mocks.matrixInit();
            return Promise.resolve({});
        }
    },
}));

vi.mock("../../../../src/front/Chat/Connection/Matrix/MatrixChatConnection", () => ({
    MatrixChatConnection: class {},
}));
vi.mock("../../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: {
        getName: () => null,
        getCharacterTextures: () => [],
        getCompanionTextureId: () => null,
        getLocalUser: () => undefined,
        getChatId: () => "test-chat-id",
        isLogged: () => false,
    },
}));

vi.mock("../../../../src/front/Connection/ConnectionManager", () => ({
    connectionManager: {},
}));

vi.mock("../../../../src/front/Connection/Capabilities", () => ({
    hasCapability: () => false,
}));

vi.mock("../../../../src/front/Chat/Stores/ChatStore", () => ({
    initializeChatVisibilitySubscription: () => undefined,
}));

vi.mock("../../../../src/front/Stores/ChatStore", () => ({
    loginTokenErrorStore: { set: vi.fn() },
    isMatrixChatEnabledStore: { set: vi.fn() },
}));

vi.mock("../../../../src/front/Stores/MenuStore", () => ({
    menuIconVisiblilityStore: { set: vi.fn() },
    userIsConnected: mocks.trueStore,
}));

vi.mock("../../../../src/front/Stores/MediaStore", () => ({
    availabilityStatusStore: {},
    requestedCameraDeviceIdStore: {},
    requestedCameraState: mocks.trueStore,
    requestedMicrophoneDeviceIdStore: {},
    requestedMicrophoneState: mocks.trueStore,
}));

vi.mock("../../../../src/front/Stores/GameSceneStore", () => ({
    gameSceneIsLoadedStore: { set: vi.fn() },
    waitForGameSceneStore: vi.fn(),
}));

vi.mock("../../../../src/front/Stores/HelpSettingsStore", () => ({
    showHelpCameraSettings: vi.fn(),
}));

vi.mock("../../../../src/front/Stores/MyMediaStore", () => ({
    myCameraStore: mocks.trueStore,
}));

vi.mock("../../../../src/front/Stores/ErrorScreenStore", () => ({
    errorScreenStore: { setException: vi.fn(), setErrorFromApi: vi.fn() },
}));
vi.mock("../../../../src/front/Phaser/Login/EnableCameraScene", () => ({
    EnableCameraSceneName: "EnableCameraScene",
}));
vi.mock("../../../../src/front/Phaser/Login/LoginScene", () => ({
    LoginSceneName: "LoginScene",
}));
vi.mock("../../../../src/front/Phaser/Login/SelectCharacterScene", () => ({
    SelectCharacterSceneName: "SelectCharacterScene",
}));
vi.mock("../../../../src/front/Phaser/Login/EmptyScene", () => ({
    EmptySceneName: "EmptyScene",
}));
vi.mock("../../../../src/front/Phaser/Login/SelectCompanionScene", () => ({
    SelectCompanionSceneName: "SelectCompanionScene",
}));
vi.mock("../../../../src/front/Phaser/Game/GameScene", () => ({
    GameScene: class {},
}));
vi.mock("../../../../src/front/Enum/ComputedConst", () => ({
    ABSOLUTE_PUSHER_URL: "http://pusher.test/",
}));
vi.mock("../../../../src/front/Utils/RandomNameGenerator", () => ({
    generateRandomName: () => "Test User",
}));

import { GameManager } from "../../../../src/front/Phaser/Game/GameManager";
describe("GameManager Jazz provider policy", () => {
    beforeEach(() => {
        mocks.runtimeInit.mockReset().mockRejectedValue(new Error("runtime should not be reached for invalid policy"));
        mocks.matrixConstructor.mockReset();
        mocks.matrixInit.mockReset();
    });

    it("retains failed Jazz and never initializes Matrix", async () => {
        const manager = new GameManager();

        const first = await manager.getChatConnection();
        const second = await manager.getChatConnection();

        let status: string | undefined;
        const unsubscribe = first.connectionStatus.subscribe((value) => {
            status = value;
        });
        unsubscribe();

        expect(first).toBe(second);
        expect(status).toBe("ON_ERROR");
        expect(mocks.runtimeInit).not.toHaveBeenCalled();
        expect(mocks.matrixConstructor).not.toHaveBeenCalled();
        expect(mocks.matrixInit).not.toHaveBeenCalled();
    });
});
