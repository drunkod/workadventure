import { basename, extname, normalize, resolve } from "path";
import fs from "fs";
import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import legacy from "@vitejs/plugin-legacy";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import Icons from "unplugin-icons/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");
    const config = {
        server: {
            host: "0.0.0.0",
            port: 8080,
            hmr: {
                // workaround for development in docker
                clientPort: env.FRONTEND_ONLY === "true" ? 8080 : 80,
            },
            watch: {
                ignored: ["./src/pusher"],
            },
        },
        build: {
            sourcemap: env.GENERATE_SOURCEMAP !== "false",
            outDir: "./dist/public",
            rollupOptions: {
                plugins: [mediapipe_workaround()],
                // external: ["@mediapipe/tasks-vision"],
                //plugins: [inject({ Buffer: ["buffer/", "Buffer"] })],
            },
            assetsInclude: ["**/*.tflite", "**/*.wasm"],
        },
        plugins: [
            nodePolyfills({
                include: ["events", "buffer"],
                globals: {
                    Buffer: true,
                },
            }),
            svelte({
                preprocess: sveltePreprocess(),
                onwarn(warning, defaultHandler) {
                    // don't warn on:
                    if (warning.code === "a11y-click-events-have-key-events") return;
                    if (warning.code === "security-anchor-rel-noreferrer") return;
                    if (warning.code === "Unknown at rule @container (css)") return;
                    if (warning.message.includes("Unknown at rule @container")) return;

                    // handle all other warnings normally
                    if (defaultHandler) {
                        defaultHandler(warning);
                    }
                },
            }),
            Icons({
                compiler: "svelte",
            }),
            // Conditional plugin inclusion
            ...(env.DISABLE_LEGACY_BROWSERS === "true"
                ? []
                : [
                      legacy({
                          //targets: ['defaults', 'not IE 11', 'iOS > 14.3']
                          // Structured clone is needed for Safari < 15.4
                          polyfills: ["web.structured-clone"],
                          modernPolyfills: ["web.structured-clone"],
                      }),
                  ]),
            tsconfigPaths(),
            ...(env.FRONTEND_ONLY === "true" ? [frontendOnlyMockPlugin(env)] : []),
        ],
        resolve: {
            alias: {
                events: "events",
            },
        },
        test: {
            environment: "jsdom",
            globals: true,
            setupFiles: ["./tests/setup/vitest.setup.ts"],
            coverage: {
                all: true,
                include: ["src/*.ts", "src/**/*.ts"],
                exclude: ["src/i18n", "src/enum"],
            },
        },
        optimizeDeps: {
            include: ["olm"],
            exclude: ["svelte-modals"],
            esbuildOptions: {
                define: {
                    global: "globalThis",
                },
            },
        },
    };

    if (env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_AUTH_TOKEN && env.SENTRY_RELEASE && env.SENTRY_ENVIRONMENT) {
        console.info("Sentry plugin enabled");
        config.plugins.push(
            sentryVitePlugin({
                url: env.SENTRY_URL || "https://sentry.io/",
                org: env.SENTRY_ORG,
                project: env.SENTRY_PROJECT,
                // Specify the directory containing build artifacts
                sourcemaps: {
                    assets: "./dist/public/**",
                },
                // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
                // and needs the `project:releases` and `org:read` scopes
                authToken: env.SENTRY_AUTH_TOKEN,
                // Optionally uncomment the line below to override automatic release name detection
                release: {
                    name: env.SENTRY_RELEASE,
                    deploy: {
                        env: env.SENTRY_ENVIRONMENT,
                    },
                    finalize: true,
                },
            })
        );
    } else {
        console.info("Sentry plugin disabled");
    }
    return config;
});

export function frontendOnlyMockPlugin(env: Record<string, string>) {
    const mapsRoot = resolve(process.cwd(), "../maps");
    const mockWokaData = getMockWokaData(resolve(process.cwd(), "src/pusher/data/woka.json"));
    const mockCompanionData = getMockCompanionData(resolve(process.cwd(), "src/pusher/data/companions.json"));
    const mockMapUrl = env.MOCK_MAP_URL || "/mock-maps/starter/map.json";
    const mockRoomName = env.MOCK_ROOM_NAME || "Frontend Mock Room";
    const mockAuthToken = ensureJwtAuthToken(env.MOCK_AUTH_TOKEN || "frontend-only-mock-token");
    const mockUserUuid = env.MOCK_USER_UUID || "frontend-only-user";
    const mockRegisterRoomUrl = env.MOCK_REGISTER_ROOM_URL || "/_/global/mock-maps/starter/map.json";
    const mockRegisterMapUrlStart = env.MOCK_REGISTER_MAP_URL_START || "/mock-maps/starter/map.json";
    const defaultDelayMs = parseNonNegativeInteger(env.MOCK_DELAY_MS, 0);
    const mapDelayMs = parseNonNegativeInteger(env.MOCK_MAP_DELAY_MS, defaultDelayMs);
    const meDelayMs = parseNonNegativeInteger(env.MOCK_ME_DELAY_MS, defaultDelayMs);

    const shouldFailMap = parseBooleanWithDefault(env.MOCK_FAIL_MAP, false);
    const shouldFailMe = parseBooleanWithDefault(env.MOCK_FAIL_ME, false);
    const mapErrorStatus = parseHttpStatusCode(env.MOCK_FAIL_MAP_STATUS, 500);
    const meErrorStatus = parseHttpStatusCode(env.MOCK_FAIL_ME_STATUS, 500);

    const defaultMapResponse = {
        mapUrl: mockMapUrl,
        group: null,
        authenticationMandatory: parseBooleanWithDefault(env.MOCK_AUTH_MANDATORY, false),
        roomName: mockRoomName,
        provideDefaultWokaName: (env.MOCK_PROVIDE_DEFAULT_WOKA_NAME as "no" | "random" | "fix" | "fix-plus-random-numbers") ?? "no",
        defaultWokaName: env.MOCK_DEFAULT_WOKA_NAME || undefined,
        provideDefaultWokaTexture: (env.MOCK_PROVIDE_DEFAULT_WOKA_TEXTURE as "no" | "random" | "fix") ?? "no",
        defaultWokaTexture: env.MOCK_DEFAULT_WOKA_TEXTURE || undefined,
        skipCameraPage: parseBooleanWithDefault(env.MOCK_SKIP_CAMERA_PAGE, true),
        enableChat: parseBooleanWithDefault(env.MOCK_ENABLE_CHAT, false),
        enableChatUpload: parseBooleanWithDefault(env.MOCK_ENABLE_CHAT_UPLOAD, false),
        enableChatOnlineList: parseBooleanWithDefault(env.MOCK_ENABLE_CHAT_ONLINE_LIST, false),
        enableChatDisconnectedList: parseBooleanWithDefault(env.MOCK_ENABLE_CHAT_DISCONNECTED_LIST, false),
        enableSay: parseBooleanWithDefault(env.MOCK_ENABLE_SAY, false),
        enableIssueReport: parseBooleanWithDefault(env.MOCK_ENABLE_ISSUE_REPORT, false),
        enableMatrixChat: parseBooleanWithDefault(env.MOCK_ENABLE_MATRIX_CHAT, false),
    };

    const mapErrorResponse = {
        status: "error" as const,
        type: "error" as const,
        code: env.MOCK_FAIL_MAP_CODE || "MOCK_MAP_ERROR",
        title: env.MOCK_FAIL_MAP_TITLE || "Mock map failure",
        subtitle: env.MOCK_FAIL_MAP_SUBTITLE || "Forced failure of /map endpoint in mock mode",
        details: env.MOCK_FAIL_MAP_DETAILS || "Set MOCK_FAIL_MAP=false to disable this injected failure.",
    };

    const meErrorResponse = {
        status: "error" as const,
        type: "error" as const,
        code: env.MOCK_FAIL_ME_CODE || "MOCK_ME_ERROR",
        title: env.MOCK_FAIL_ME_TITLE || "Mock me failure",
        subtitle: env.MOCK_FAIL_ME_SUBTITLE || "Forced failure of /me endpoint in mock mode",
        details: env.MOCK_FAIL_ME_DETAILS || "Set MOCK_FAIL_ME=false to disable this injected failure.",
    };

    const sendJson = (res: any, body: unknown, statusCode = 200) => {
        res.statusCode = statusCode;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(body));
    };

    const sendNoContent = (res: any) => {
        res.statusCode = 204;
        res.setHeader("Cache-Control", "no-store");
        res.end("");
    };

    const sendText = (res: any, body: string) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
    };

    const sendHtml = (res: any, body: string) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(body);
    };

    const sendWithDelay = (delayMs: number, send: () => void) => {
        if (delayMs <= 0) {
            send();
            return;
        }
        setTimeout(send, delayMs);
    };

    return {
        name: "frontend-only-mock-plugin",
        transformIndexHtml(html: string) {
            return stripMustacheTemplates(html);
        },
        configureServer(server: any) {
            server.middlewares.use((req: any, res: any, next: any) => {
                if (!req.url) {
                    next();
                    return;
                }

                const requestUrl = new URL(req.url, "http://localhost");
                const pathname = requestUrl.pathname;
                const rawPathname = req.url.split("?")[0] ?? "";
                const method = req.method || "GET";

                if (pathname === "/local-script" && method === "GET") {
                    const scriptParam = requestUrl.searchParams.get("script");
                    if (!scriptParam) {
                        res.statusCode = 400;
                        res.end("Invalid query parameters");
                        return;
                    }

                    let scriptUrl: URL;
                    try {
                        scriptUrl = new URL(scriptParam);
                    } catch {
                        res.statusCode = 400;
                        res.end("Invalid query parameters");
                        return;
                    }

                    const hostname = scriptUrl.hostname;
                    const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost");
                    if (!isLocalhost) {
                        res.statusCode = 400;
                        res.end("Script URL must be from localhost or *.localhost domain for security reasons");
                        return;
                    }

                    sendHtml(
                        res,
                        `<!DOCTYPE html>
<html>
  <head>
    <script src="/iframe_api.js"></script>
    <script type="module" src="${escapeHtmlAttr(scriptParam)}"></script>
  </head>
  <body></body>
</html>`
                    );
                    return;
                }

                if (pathname === "/map" && method === "GET") {
                    sendWithDelay(mapDelayMs, () => {
                        if (shouldFailMap) {
                            sendJson(res, mapErrorResponse, mapErrorStatus);
                            return;
                        }
                        sendJson(res, defaultMapResponse);
                    });
                    return;
                }

                if (pathname === "/anonymLogin" && method === "POST") {
                    sendJson(res, {
                        authToken: mockAuthToken,
                        userUuid: mockUserUuid,
                    });
                    return;
                }

                if (pathname === "/me" && method === "GET") {
                    sendWithDelay(meDelayMs, () => {
                        if (shouldFailMe) {
                            sendJson(res, meErrorResponse, meErrorStatus);
                            return;
                        }
                        sendJson(res, {
                            status: "ok",
                            authToken: ensureJwtAuthToken(requestUrl.searchParams.get("token") || mockAuthToken),
                            userUuid: mockUserUuid,
                            email: null,
                            username: env.MOCK_USERNAME || "Guest",
                            locale: env.MOCK_LOCALE || "en",
                            visitCardUrl: null,
                            isCharacterTexturesValid: parseBooleanWithDefault(env.MOCK_IS_CHARACTER_TEXTURES_VALID, false),
                            isCompanionTextureValid: parseBooleanWithDefault(
                                env.MOCK_IS_COMPANION_TEXTURES_VALID ?? env.MOCK_IS_COMPANION_TEXTURE_VALID,
                                false
                            ),
                            matrixUserId: null,
                            matrixServerUrl: null,
                        });
                    });
                    return;
                }

                if (pathname === "/woka/list" && method === "GET") {
                    sendJson(res, mockWokaData);
                    return;
                }

                if (pathname === "/companion/list" && method === "GET") {
                    sendJson(res, mockCompanionData);
                    return;
                }

                if (
                    (pathname === "/save-name" ||
                        pathname === "/save-textures" ||
                        pathname === "/save-companion-texture") &&
                    method === "POST"
                ) {
                    sendNoContent(res);
                    return;
                }

                if (pathname === "/register" && method === "POST") {
                    sendJson(res, {
                        roomUrl: mockRegisterRoomUrl,
                        email: null,
                        organizationMemberToken: null,
                        mapUrlStart: mockRegisterMapUrlStart,
                        userUuid: mockUserUuid,
                        authToken: mockAuthToken,
                        messages: [],
                    });
                    return;
                }

                if (pathname === "/ping" && method === "GET") {
                    sendText(res, "pong");
                    return;
                }

                if (pathname === "/package.json" && method === "GET") {
                    res.statusCode = 403;
                    res.end("Forbidden");
                    return;
                }

                const mockMapsPathname = rawPathname.startsWith("/mock-maps/") ? rawPathname : pathname;

                if (!mockMapsPathname.startsWith("/mock-maps/")) {
                    next();
                    return;
                }

                let relativePath: string;
                try {
                    relativePath = decodeURIComponent(mockMapsPathname.slice("/mock-maps/".length));
                } catch {
                    res.statusCode = 400;
                    res.end("Bad request");
                    return;
                }

                if (hasParentTraversalSegment(relativePath)) {
                    res.statusCode = 403;
                    res.end("Forbidden");
                    return;
                }

                const normalizedPath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
                const filePath = resolve(mapsRoot, normalizedPath);
                const isInsideMapsRoot =
                    filePath === mapsRoot || filePath.startsWith(mapsRoot + "/") || filePath.startsWith(mapsRoot + "\\");

                if (!isInsideMapsRoot) {
                    res.statusCode = 403;
                    res.end("Forbidden");
                    return;
                }

                if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    res.statusCode = 404;
                    res.end("Not found");
                    return;
                }

                res.statusCode = 200;
                res.setHeader("Content-Type", getContentType(filePath));
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Access-Control-Allow-Origin", "*");
                fs.createReadStream(filePath).pipe(res);
            });
        },
    };
}

function escapeHtmlAttr(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function hasParentTraversalSegment(relativePath: string): boolean {
    return relativePath.split(/[\\/]+/).some((segment) => segment === "..");
}

function parseBooleanWithDefault(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    switch (value.trim().toLowerCase()) {
        case "true":
        case "1":
        case "yes":
        case "on":
            return true;
        case "false":
        case "0":
        case "no":
        case "off":
            return false;
        default:
            return defaultValue;
    }
}

function parseNonNegativeInteger(value: string | undefined, defaultValue: number): number {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const parsedValue = Number.parseInt(value, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
        return defaultValue;
    }
    return parsedValue;
}

function parseHttpStatusCode(value: string | undefined, defaultValue: number): number {
    const parsedValue = parseNonNegativeInteger(value, defaultValue);
    if (parsedValue < 100 || parsedValue > 599) {
        return defaultValue;
    }
    return parsedValue;
}

function ensureJwtAuthToken(token: string): string {
    const tokenParts = token.split(".");
    if (tokenParts.length === 3 && tokenParts[1]) {
        return token;
    }

    const header = toBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = toBase64Url(JSON.stringify({ accessToken: token }));
    return `${header}.${payload}.mock-signature`;
}

function toBase64Url(value: string): string {
    return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stripMustacheTemplates(html: string): string {
    let transformed = html;

    // Remove full Mustache sections (e.g. {{#foo}}...{{/foo}}).
    transformed = transformed.replace(/\{\{#([^}]+)\}\}[\s\S]*?\{\{\/\1\}\}/g, "");

    // Remove remaining variables (e.g. {{ title }} or {{{ script }}}).
    transformed = transformed.replace(/\{\{\{[^}]+\}\}\}/g, "");
    transformed = transformed.replace(/\{\{[^}]+\}\}/g, "");

    return transformed;
}

function getMockWokaData(wokaJsonPath: string) {
    try {
        const wokaData = JSON.parse(fs.readFileSync(wokaJsonPath, "utf8"));
        if (wokaData && typeof wokaData === "object") {
            return wokaData;
        }
    } catch (error) {
        console.warn(`Unable to load wokas from "${wokaJsonPath}". Falling back to inline mock data.`, error);
    }

    return {
        woka: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "color_22", url: "/resources/customisation/character_color/character_color21.png" }],
                },
            ],
        },
        body: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "color_22", url: "/resources/customisation/character_color/character_color21.png" }],
                },
            ],
        },
        eyes: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "eyes_23", url: "/resources/customisation/character_eyes/character_eyes23.png" }],
                },
            ],
        },
        hair: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "hair_1", url: "/resources/customisation/character_hairs/character_hairs1.png" }],
                },
            ],
        },
        clothes: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "clothes_1", url: "/resources/customisation/character_clothes/character_clothes1.png" }],
                },
            ],
        },
        hat: {
            collections: [
                {
                    name: "default",
                    textures: [{ id: "hat_1", url: "/resources/customisation/character_hats/character_hats1.png" }],
                },
            ],
        },
        accessory: {
            collections: [
                {
                    name: "default",
                    textures: [
                        { id: "accessory_1", url: "/resources/customisation/character_accessories/character_accessories1.png" },
                    ],
                },
            ],
        },
    };
}

function getMockCompanionData(companionJsonPath: string) {
    try {
        const companionData = JSON.parse(fs.readFileSync(companionJsonPath, "utf8"));
        if (Array.isArray(companionData)) {
            return companionData;
        }
    } catch (error) {
        console.warn(`Unable to load companions from "${companionJsonPath}". Falling back to inline mock data.`, error);
    }

    return [
        {
            name: "default",
            textures: [
                {
                    id: "dog1",
                    name: "dog1",
                    behavior: "dog",
                    url: "resources/characters/pipoya/Dog 01-1.png",
                },
                {
                    id: "cat1",
                    name: "cat1",
                    behavior: "cat",
                    url: "resources/characters/pipoya/Cat 01-1.png",
                },
            ],
        },
    ];
}

function getContentType(filePath: string): string {
    switch (extname(filePath).toLowerCase()) {
        case ".json":
        case ".tmj":
            return "application/json; charset=utf-8";
        case ".js":
            return "text/javascript; charset=utf-8";
        case ".ts":
            return "text/plain; charset=utf-8";
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".gif":
            return "image/gif";
        case ".svg":
            return "image/svg+xml";
        case ".webp":
            return "image/webp";
        case ".mp3":
            return "audio/mpeg";
        case ".ogg":
            return "audio/ogg";
        case ".wav":
            return "audio/wav";
        case ".css":
            return "text/css; charset=utf-8";
        case ".html":
            return "text/html; charset=utf-8";
        default:
            return "application/octet-stream";
    }
}

// use to fix the build issue with mediapipe ==> https://github.com/tensorflow/tfjs/issues/7165
// TODO: remove this when we migrate to mediapipe/tasks-vision
function mediapipe_workaround() {
    return {
        name: "mediapipe_workaround",
        load(id: string) {
            if (basename(id) === "selfie_segmentation.js") {
                let code = fs.readFileSync(id, "utf-8");
                code += "exports.SelfieSegmentation = SelfieSegmentation;";
                return { code };
            } else {
                return null;
            }
        },
    };
}
