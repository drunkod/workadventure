(function () {
    if (typeof window === "undefined") {
        return;
    }

    // Frontend-only mock mode must run disconnected from websocket by default.
    const roomUrl = new URL(window.location.href);
    if (!roomUrl.searchParams.has("alone")) {
        roomUrl.searchParams.set("alone", "true");
        const search = roomUrl.search ? roomUrl.search : "";
        window.history.replaceState({}, "", roomUrl.pathname + search + roomUrl.hash);
    }

    const parseBooleanParam = (paramName, fallbackValue) => {
        const value = roomUrl.searchParams.get(paramName);
        if (value === null) {
            return fallbackValue;
        }
        return value === "1" || value === "true" || value === "yes" || value === "on";
    };

    const parseOptionalParam = (paramName) => {
        const value = roomUrl.searchParams.get(paramName);
        return value && value.trim() !== "" ? value : undefined;
    };

    const enableChat = parseBooleanParam("mockEnableChat", false);
    const enableChatUpload = parseBooleanParam("mockEnableChatUpload", enableChat);
    const enableChatOnlineList = parseBooleanParam("mockEnableChatOnlineList", enableChat);
    const enableChatDisconnectedList = parseBooleanParam("mockEnableChatDisconnectedList", enableChat);
    const enableJazzChat = parseBooleanParam("mockEnableJazzChat", false);
    const enableOpenId = parseBooleanParam("mockEnableOpenId", false);
    const jazzSyncPeer = parseOptionalParam("mockJazzSyncPeer");
    const jazzApiKey = parseOptionalParam("mockJazzApiKey");
    const jazzGlobalRoomId = parseOptionalParam("mockJazzGlobalRoomId");

    const roomUrlString = roomUrl.toString();
    window.localStorage?.setItem("lastRoomUrl", roomUrlString);
    if ("caches" in window) {
        window.caches
            .open("workavdenture-cache")
            .then((cache) => cache.put("/lastRoomUrl", new Response(JSON.stringify({ roomUrl: roomUrlString }))))
            .catch((e) => console.warn("Unable to seed lastRoomUrl in cache storage", e));
    }

    // Start onboarding from a clean user state in frontend-only mock mode.
    const localUserKeysToReset = ["playerName", "characterTextures", "companion", "authToken", "localUser"];
    for (const key of localUserKeysToReset) {
        window.localStorage?.removeItem(key);
    }

    if (window.env === undefined) {
        window.env = {
            DEBUG_MODE: false,
            PUSHER_URL: "/",
            FRONT_URL: window.location.origin,
            ADMIN_URL: undefined,
            UPLOADER_URL: "",
            ICON_URL: "",
            SKIP_RENDER_OPTIMIZATIONS: false,
            DISABLE_NOTIFICATIONS: false,
            JITSI_URL: undefined,
            JITSI_PRIVATE_MODE: false,
            ENABLE_MAP_EDITOR: false,
            PUBLIC_MAP_STORAGE_PREFIX: undefined,
            MAX_USERNAME_LENGTH: 20,
            MAX_PER_GROUP: 4,
            MAX_DISPLAYED_VIDEOS: 4,
            NODE_ENV: "development",
            CONTACT_URL: undefined,
            POSTHOG_API_KEY: undefined,
            POSTHOG_URL: undefined,
            DISABLE_ANONYMOUS: false,
            ENABLE_OPENID: enableOpenId,
            OPID_PROFILE_SCREEN_PROVIDER: undefined,
            ENABLE_CHAT_UPLOAD: enableChatUpload,
            FALLBACK_LOCALE: "en",
            OPID_WOKA_NAME_POLICY: undefined,
            ENABLE_REPORT_ISSUES_MENU: false,
            REPORT_ISSUES_URL: undefined,
            SENTRY_DSN_FRONT: undefined,
            SENTRY_DSN_PUSHER: undefined,
            SENTRY_ENVIRONMENT: undefined,
            SENTRY_RELEASE: undefined,
            SENTRY_TRACES_SAMPLE_RATE: undefined,
            WOKA_SPEED: 8,
            FEATURE_FLAG_BROADCAST_AREAS: false,
            KLAXOON_ENABLED: false,
            KLAXOON_CLIENT_ID: undefined,
            YOUTUBE_ENABLED: false,
            GOOGLE_DRIVE_ENABLED: false,
            GOOGLE_DOCS_ENABLED: false,
            GOOGLE_SHEETS_ENABLED: false,
            GOOGLE_SLIDES_ENABLED: false,
            ERASER_ENABLED: false,
            MINIMUM_DISTANCE: 2,
            GOOGLE_DRIVE_PICKER_CLIENT_ID: undefined,
            GOOGLE_DRIVE_PICKER_APP_ID: undefined,
            EXCALIDRAW_ENABLED: false,
            EXCALIDRAW_DOMAINS: [],
            CARDS_ENABLED: false,
            TLDRAW_ENABLED: false,
            EMBEDLY_KEY: undefined,
            MATRIX_PUBLIC_URI: undefined,
            MATRIX_ADMIN_USER: undefined,
            MATRIX_DOMAIN: undefined,
            JAZZ_CHAT_ENABLED: enableJazzChat,
            JAZZ_SYNC_PEER: jazzSyncPeer,
            JAZZ_API_KEY: jazzApiKey,
            JAZZ_GLOBAL_ROOM_ID: jazzGlobalRoomId,
            ENABLE_CHAT: enableChat,
            ENABLE_CHAT_ONLINE_LIST: enableChatOnlineList,
            ENABLE_CHAT_DISCONNECTED_LIST: enableChatDisconnectedList,
            ENABLE_SAY: false,
            ENABLE_ISSUE_REPORT: false,
            GRPC_MAX_MESSAGE_SIZE: 4194304,
            TURN_CREDENTIALS_RENEWAL_TIME: 0,
            BACKGROUND_TRANSFORMER_ENGINE: "selfie-segmentation",
            DEFAULT_WOKA_NAME: "Guest",
            DEFAULT_WOKA_TEXTURE: "color_22",
            SKIP_CAMERA_PAGE: true,
            PROVIDE_DEFAULT_WOKA_NAME: "fix-plus-random-numbers",
            PROVIDE_DEFAULT_WOKA_TEXTURE: "fix",
        };
    }

    if (window.capabilities === undefined) {
        window.capabilities = {
            "api/save-name": "v1",
            "api/save-textures": "v1",
            "api/woka/list": "v1",
            "api/companion/list": "v1",
        };
    }
})();
