
Based on my analysis of the WorkAdventure codebase, here's a comprehensive guide to implementing a complete frontend-only mock mode for the play service:

## Files to Create/Modify

### 1. **Package.json Script Addition**

You need to modify the `package.json` to add the `dev-front-mock` script: [1](#13-0) 

Add a new script:
```json
"dev-front-mock": "cross-env VITE_MOCK_MODE=true vite --config vite.mock.config.mts"
```

### 2. **Create New Vite Mock Configuration File**

Create a new file `play/vite.mock.config.mts` that extends the existing Vite configuration: [2](#13-1) 

Your new config should import the base config and add a custom middleware plugin for API mocking.

### 3. **Mock Middleware Implementation**

Create `play/src/mock/mockMiddleware.ts` to implement the mock API endpoints. The middleware needs to intercept the following endpoints:

**For `/map` endpoint**, return a `MapDetailsData` object: [3](#13-2) 

**For `/anonymLogin` endpoint**, return an auth response: [4](#13-3) 

**For `/me` endpoint**, return a `MeResponse`: [5](#13-4) 

**For `/woka/list` endpoint**, serve the local woka data: [6](#13-5) [7](#13-6) 

**For `/companion/list` endpoint**, serve the local companion data: [8](#13-7) 

**For persistence endpoints** (`/save-name`, `/save-textures`, `/save-companion-texture`), handle gracefully: [9](#13-8) [10](#13-9) [11](#13-10) 

### 4. **Environment Variable Configuration**

Create `play/src/mock/mockEnv.ts` to inject mock environment variables into `window.env`: [12](#13-11) 

Key environment variables to mock:
- `PUSHER_URL`: Set to empty string or same-origin to prevent WebSocket connections
- `DISABLE_ANONYMOUS`: Set to `false` to allow anonymous login
- `ADMIN_URL`: Set to `undefined` to disable admin API calls
- All other optional features can be disabled

### 5. **Axios Interceptor for Error Handling**

To prevent fatal errors when backend endpoints are unavailable, you need to understand how the frontend makes API calls: [13](#13-12) 

The mock middleware should intercept these axios instances at the Vite server level before they reach the network layer.

### 6. **Static Map Assets Serving**

Configure Vite to serve the maps directory: [14](#13-13) 

In your mock config, add a middleware to serve files from the `maps/` directory at `/mock-maps/*` paths.

### 7. **Ensure alone=true Parameter Handling**

The frontend already has built-in support for the `alone=true` parameter to disable WebSocket connections: [15](#13-14) 

Ensure your mock mode automatically appends `?alone=true` to the URL or documents this requirement.

### 8. **Mock Environment Variables Injection**

Create `play/public/mock-env.js` to be included in the HTML during mock mode:

The frontend reads environment variables from `window.env`: [16](#13-15) 

Your mock-env.js should populate all required properties from the `FrontConfigurationInterface`.

## Implementation Details

### Vite Middleware Structure

Your `vite.mock.config.mts` should:

1. Import the base config from `vite.config.mts`
2. Add a custom plugin with a `configureServer` hook
3. Use `server.middlewares.use()` to add custom route handlers
4. Handle both GET and POST requests for the endpoints above
5. Add a static file server for `/mock-maps/*` → `maps/` directory

### Mock Data Generation

For the `/map` endpoint, create a minimal `MapDetailsData` response with:
- `mapUrl`: Point to a map file in your mock-maps directory (e.g., `/mock-maps/starter/map.json`)
- `authenticationMandatory`: `false`
- `group`: `null`
- All optional fields can be omitted or set to sensible defaults

For the `/me` endpoint, generate:
- `status`: `"ok"`
- `authToken`: A static mock JWT string (doesn't need to be valid)
- `userUuid`: A consistent UUID (can use a fixed string)
- `isCharacterTexturesValid`: `false` to force character selection
- `isCompanionTextureValid`: `false` to force companion selection
- All other fields: `null` or `undefined`

### Error Handling

The axios retry mechanism is already configured: [17](#13-16) 

Your mock middleware should always return 200 responses to avoid triggering the retry logic.

## Testing the Mock Mode

1. Run `npm run dev-front-mock` from the `play/` directory
2. Navigate to `http://localhost:8080/?alone=true`
3. The frontend should load without attempting WebSocket connections
4. Character and companion selection screens should display mock data
5. Saving selections should succeed (mocked as 204 responses)

## Notes

- The `alone=true` parameter is critical as it prevents the frontend from attempting to establish WebSocket connections to the pusher service
- All persistence operations will be local to the browser session (localStorage)
- The mock mode is purely for frontend development and testing - no actual multiplayer functionality will work
- Map assets must be properly structured in the `maps/` directory with valid Tiled JSON format
- The `ABSOLUTE_PUSHER_URL` is computed from `PUSHER_URL` and used throughout the frontend for API calls: [18](#13-17)

### Citations

**File:** play/package.json (L14-19)
```json
  "scripts": {
    "start": "if [ -n \"$STARTUP_COMMAND\" ]; then sh -c \"$STARTUP_COMMAND\"; fi && TSX_TSCONFIG_PATH=tsconfig-pusher.json tsx ./src/server.ts",
    "old_start": "node -r source-map-support/register --max-old-space-size=4096 ./dist/server.js",
    "dev": "cross-env concurrently --kill-others-on-fail \"npm:dev-front\" \"npm:typesafe-i18n-watch\" \"npm:watch-iframe-api\" \"npm:svelte-check-watch\" \"npm:dev-pusher\"",
    "dev-front": "cross-env vite",
    "dev-pusher": "TSX_TSCONFIG_PATH=tsconfig-pusher.json tsx watch --clear-screen=false --inspect=0.0.0.0:9229 ./src/server.ts",
```

**File:** play/vite.config.mts (L1-131)
```typescript
import { basename } from "path";
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
                clientPort: 80,
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
```

**File:** libs/messages/src/JsonMessages/MapDetailsData.ts (L150-328)
```typescript
export const isMapDetailsData = z.object({
  mapUrl: extendApi(z.string().optional(), {
    description: "The full URL to the JSON map file",
    example: "https://myuser.github.io/myrepo/map.json",
  }),
  wamUrl: extendApi(z.string().url().optional(), {
    description: "The full URL to the WAM map file",
    example: "https://map-storage.myworkadventure.com/myrepo/map.wam",
  }),
  authenticationMandatory: extendApi(z.boolean().nullable().optional(), {
    description: "Whether the authentication is mandatory or not for this map",
    example: true,
  }),
  group: extendApi(z.string().nullable(), {
    description:
      'The group this room is part of (maps the notion of "world" in WorkAdventure SAAS)',
    example: "myorg/myworld",
  }),
  contactPage: extendApi(z.string().nullable().optional(), {
    description: "The URL to the contact page",
    example: "https://mycompany.com/contact-us",
  }),
  opidLogoutRedirectUrl: extendApi(z.string().nullable().optional(), {
    description: "The URL of the logout redirect",
    example: "https://mycompany.com/logout",
  }),
  opidWokaNamePolicy: extendApi(OpidWokaNamePolicy.nullable().optional(), {
    description: "Username policy",
    example: "user_input",
  }),
  // The date (in ISO 8601 format) at which the room will expire
  expireOn: extendApi(z.optional(z.string()), {
    description: "The date (in ISO 8601 format) at which the room will expire",
    example: "2022-11-05T08:15:30-05:00",
  }),
  // Whether the "report" feature is enabled or not on this room
  canReport: extendApi(z.boolean().optional(), {
    description: 'Whether the "report" feature is enabled or not on this room',
    example: true,
  }),
  editable: extendApi(z.optional(z.boolean()), {
    description:
      'Whether the "map editor" feature is enabled or not on this room (true if the map comes from the map-storage)',
    example: true,
  }),
  // The URL of the logo image on the loading screen
  loadingLogo: extendApi(z.string().nullable().optional(), {
    description: "The URL of the image to be used on the loading page",
    example: "https://example.com/logo.png",
  }),
  // The URL of the logo image on "LoginScene"
  loginSceneLogo: extendApi(z.string().nullable().optional(), {
    description: "The URL of the image to be used on the LoginScene",
    example: "https://example.com/logo_login.png",
  }),
  backgroundSceneImage: extendApi(z.string().nullable().optional(), {
    description:
      "The URL of the background image to be used on the loading page",
    example: "https://example.com/background.png",
  }),
  showPoweredBy: extendApi(z.boolean().nullable().optional(), {
    description: "Whether the logo PoweredBy is enabled or not on this room",
    example: true,
  }),
  thirdParty: extendApi(isMapThirdPartyData.nullable().optional(), {
    description: "Configuration data for third party services",
  }),
  metadata: extendApi(z.unknown().optional(), {
    description: "Metadata from administration",
  }),
  roomName: extendApi(z.string().nullable().optional(), {
    description: "The name of the current room.",
    example: "WA Village",
  }),
  pricingUrl: extendApi(z.string().nullable().optional(), {
    description:
      "The url of the page where the user can see the price to upgrade and can use the features he wants in the future.",
    example: "https://example.com/pricing",
  }),
  enableMatrixChat: extendApi(z.boolean().optional(), {
    description: "Whether the matrix chat is enabled or not on this room",
    example: true,
  }),
  enableChat: extendApi(z.boolean().optional(), {
    description: "Whether the chat is enabled or not on this room",
    example: true,
  }),
  enableChatUpload: extendApi(z.boolean().optional(), {
    description:
      "Whether the feature 'upload' in the chat is enabled or not on this room",
    example: true,
  }),
  enableChatOnlineList: extendApi(z.boolean().optional(), {
    description:
      "Whether the feature 'Users list' in the chat is enabled or not on this room",
    example: true,
  }),
  enableChatDisconnectedList: extendApi(z.boolean().optional(), {
    description:
      "Whether the feature 'disconnected users' in the chat is enabled or not on this room",
    example: true,
  }),
  enableSay: extendApi(z.boolean().optional(), {
    description:
      "Whether the users can communicate via 'comics-like' conversation bubbles.",
    example: true,
  }),
  enableIssueReport: extendApi(z.boolean().optional(), {
    description:
      "Whether the feature 'issue report' is enabled or not on this room",
    example: true,
  }),
  defaultWokaName: extendApi(z.string().nullable().optional(), {
    description:
      "The default name to use for woka users when they join the room.",
    example: "Guest123",
  }),
  defaultWokaTexture: extendApi(z.string().nullable().optional(), {
    description:
      "The default texture URL to use for woka users when they join the room.",
    example: "https://example.com/textures/guest.png",
  }),
  metatags: extendApi(MetaTagsData.nullable().optional(), {
    description:
      "Data related to METATAGS / meta tags. Contains page title, favicons, og data, etc...",
  }),
  legals: extendApi(isLegalsData.nullable().optional(), {
    description: "Configuration of the legals link (privacy policy, etc...)",
  }),
  customizeWokaScene: extendApi(CustomizeSceneData.nullable().optional(), {
    description: "Configuration of the 'Customize your Woka' scene (WIP)",
  }),
  backgroundColor: extendApi(z.string().nullable().optional(), {
    description:
      "The background color used on configuration scenes (enter your name, select a woka, etc...) (WIP)",
    example: "#330033",
  }),
  primaryColor: extendApi(z.string().nullable().optional(), {
    description:
      "The primary color used on configuration scenes (enter your name, select a woka, etc...)",
    example: "#330033",
  }),
  reportIssuesUrl: extendApi(z.string().nullable().optional(), {
    description:
      "The URL of the page to report issues (in the 'Report issues' menu). If this parameter is null, report issues menu is hidden",
    example: "https://my-report-issues-form.com/issues",
  }),
  entityCollectionsUrls: extendApi(z.array(z.string()).optional().nullable(), {
    description: "What entity collections are available for this map",
  }),
  // The URL of the error image on "ErrorScene"
  errorSceneLogo: extendApi(z.string().nullable().optional(), {
    description: "The URL of the error image to be used on the ErrorScene",
    example: "https://example.com/error_logo_login.png",
  }),
  modules: extendApi(z.array(z.string()).optional().nullable(), {
    description: "List of external-modules to load",
  }),
  isLogged: extendApi(z.boolean().optional(), {
    description:
      "True if the UUID passed in parameter belongs to a legitimate user. Return false for anonymous users.",
  }),
  // Woka access settings
  provideDefaultWokaName: extendApi(z.enum(["no", "random", "fix", "fix-plus-random-numbers"]).optional(), {
    description: "How woka names are assigned: manually, randomly, fixed, or fixed with random numbers",
    example: "random",
  }),
  provideDefaultWokaTexture: extendApi(z.enum(["no", "random", "fix"]).optional(), {
    description: "How woka textures/avatars are assigned: manually, randomly, or fixed",
    example: "random",
  }),
  skipCameraPage: extendApi(z.boolean().optional(), {
    description: "Whether to skip the camera permission request page",
    example: true,
  }),
  recording: extendApi(RecordingData.optional(), {
    description: "Recording settings for the room",
  }),
});
```

**File:** play/src/pusher/controllers/AuthenticateController.ts (L519-530)
```typescript
    private anonymLogin(): void {
        this.app.post("/anonymLogin", (req, res) => {
            debug(`AuthenticateController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            // We refuse the anonymous login if the anonymous mode is disabled AND that the default woka name is not set
            if (DISABLE_ANONYMOUS) {
                res.status(403).send("");
                return;
            } else {
                const userUuid = v4();
                const authToken = jwtTokenManager.createAuthToken(userUuid);
                res.json({
                    authToken,
```

**File:** libs/messages/src/JsonMessages/MeResponse.ts (L6-75)
```typescript
export const MeSuccessResponse = extendApi(
    z.object({
        status: z.literal("ok"),
        authToken: extendApi(z.string(), {
            description:
                "The authToken.",
        }),
        userUuid: extendApi(z.string(), {
            description: "A unique identifier for the user.",
        }),
        email: extendApi(z.string().nullable().optional(), {
            description:
                "The email of the user.",
        }),
        username: extendApi(z.string().nullable().optional(), {
            description:
                "The name of the Woka.",
            example:
                "John",
        }),
        locale: extendApi(z.string().nullable().optional(), {
            description:
                "The locale (if returned by OpenID Connect).",
        }),
        /*textures: extendApi(z.array(z.object({
            id: extendApi(z.string(), {
                description:
                    "The id of the texture.",
            }),
        })), {
            description:
                "The textures of the Woka.",
        }),*/
        visitCardUrl: extendApi(z.string().nullable().optional(), {
            description:
                "The visit card URL of the Woka.",
        }),
        isCharacterTexturesValid: extendApi(z.boolean(), {
            description:
                "True if the character textures are valid, false if we need to redirect the user to the Woka selection page.",
            example: true,
        }),
        isCompanionTextureValid: extendApi(z.boolean(), {
            description:
                "True if the companion texture is valid, false if we need to redirect the user to the companion selection page.",
            example: true,
        }),
        matrixUserId: extendApi(z.string().nullable().optional(), {
            description:
                "The matrix user id of the user.", // Note: do we need this with OpenID Connect?
        }),
        matrixServerUrl: extendApi(z.string().nullable().optional(), {
            description:
                "The matrix server url for this user.",
        }),
        /*isMatrixRegistered: extendApi(z.boolean(), {
            description:
                "???",
        }),*/
    }),
    {
        description:
            'This is a response to the /me endpoint.',
    }
);

export type MeSuccessResponse = z.infer<typeof MeSuccessResponse>;

export const MeResponse = z.union([MeSuccessResponse, ErrorApiData]);
export type MeResponse = z.infer<typeof MeResponse>;
```

**File:** play/src/pusher/services/LocalWokaService.ts (L9-17)
```typescript
    async getWokaList(roomUrl: string, token: string): Promise<WokaList | undefined> {
        // "import" does not support loading JSON files
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const wokaData: WokaList = await require("../data/woka.json");
        if (!wokaData) {
            return undefined;
        }
        return wokaData;
    }
```

**File:** play/src/pusher/data/woka.json (L1-155)
```json
{
    "woka": {
        "collections": [
            {
                "name": "default",
                "position": 0,
                "textures": [
                    {
                        "id": "male1",
                        "name": "male1",
                        "url": "resources/characters/pipoya/Male 01-1.png",
                        "position": 0
                    },
                    {
                        "id": "male2",
                        "name": "male2",
                        "url": "resources/characters/pipoya/Male 02-2.png",
                        "position": 1
                    },
                    {
                        "id": "male3",
                        "name": "male3",
                        "url": "resources/characters/pipoya/Male 03-4.png",
                        "position": 2
                    },
                    {
                        "id": "male4",
                        "name": "male4",
                        "url": "resources/characters/pipoya/Male 09-1.png",
                        "position": 3
                    },
                    {
                        "id": "male5",
                        "name": "male5",
                        "url": "resources/characters/pipoya/Male 10-3.png",
                        "position": 4
                    },
                    {
                        "id": "male6",
                        "name": "male6",
                        "url": "resources/characters/pipoya/Male 17-2.png",
                        "position": 5
                    },
                    {
                        "id": "male7",
                        "name": "male7",
                        "url": "resources/characters/pipoya/Male 18-1.png",
                        "position": 6
                    },
                    {
                        "id": "male8",
                        "name": "male8",
                        "url": "resources/characters/pipoya/Male 16-4.png",
                        "position": 7
                    },
                    {
                        "id": "male9",
                        "name": "male9",
                        "url": "resources/characters/pipoya/Male 07-2.png",
                        "position": 8
                    },
                    {
                        "id": "male10",
                        "name": "male10",
                        "url": "resources/characters/pipoya/Male 05-3.png",
                        "position": 9
                    },
                    {
                        "id": "male11",
                        "name": "male11",
                        "url": "resources/characters/pipoya/Teacher male 02.png",
                        "position": 10
                    },
                    {
                        "id": "male12",
                        "name": "male12",
                        "url": "resources/characters/pipoya/su4 Student male 12.png",
                        "position": 11
                    },
                    {
                        "id": "female1",
                        "name": "female1",
                        "url": "resources/characters/pipoya/Female 01-1.png",
                        "position": 12
                    },
                    {
                        "id": "female2",
                        "name": "female2",
                        "url": "resources/characters/pipoya/Female 02-2.png",
                        "position": 13
                    },
                    {
                        "id": "female3",
                        "name": "female3",
                        "url": "resources/characters/pipoya/Female 03-4.png",
                        "position": 14
                    },
                    {
                        "id": "female4",
                        "name": "female4",
                        "url": "resources/characters/pipoya/Female 09-1.png",
                        "position": 15
                    },
                    {
                        "id": "female5",
                        "name": "female5",
                        "url": "resources/characters/pipoya/Female 10-3.png",
                        "position": 16
                    },
                    {
                        "id": "female6",
                        "name": "female6",
                        "url": "resources/characters/pipoya/Female 17-2.png",
                        "position": 17
                    },
                    {
                        "id": "female7",
                        "name": "female7",
                        "url": "resources/characters/pipoya/Female 18-1.png",
                        "position": 18
                    },
                    {
                        "id": "female8",
                        "name": "female8",
                        "url": "resources/characters/pipoya/Female 16-4.png",
                        "position": 19
                    },
                    {
                        "id": "female9",
                        "name": "female9",
                        "url": "resources/characters/pipoya/Female 07-2.png",
                        "position": 20
                    },
                    {
                        "id": "female10",
                        "name": "female10",
                        "url": "resources/characters/pipoya/Female 05-3.png",
                        "position": 21
                    },
                    {
                        "id": "female11",
                        "name": "female11",
                        "url": "resources/characters/pipoya/Teacher fmale 02.png",
                        "position": 22
                    },
                    {
                        "id": "female12",
                        "name": "female12",
                        "url": "resources/characters/pipoya/su4 Student fmale 12.png",
                        "position": 23
                    }
                ]
            }
        ]
    },
```

**File:** play/src/pusher/data/companions.json (L1-44)
```json
[
  {
    "name": "default",
    "position": 0,
    "textures": [
      {
        "id": "dog1",
        "name": "dog1",
        "behavior": "dog",
        "url": "resources/characters/pipoya/Dog 01-1.png"
      },
      {
        "id": "dog2",
        "name": "dog2",
        "behavior": "dog",
        "url": "resources/characters/pipoya/Dog 01-2.png"
      },
      {
        "id": "dog3",
        "name": "dog3",
        "behavior": "dog",
        "url": "resources/characters/pipoya/Dog 01-3.png"
      },
      {
        "id": "cat1",
        "name": "cat1",
        "behavior": "cat",
        "url": "resources/characters/pipoya/Cat 01-1.png"
      },
      {
        "id": "cat2",
        "name": "cat2",
        "behavior": "cat",
        "url": "resources/characters/pipoya/Cat 01-2.png"
      },
      {
        "id": "cat3",
        "name": "cat3",
        "behavior": "cat",
        "url": "resources/characters/pipoya/Cat 01-3.png"
      }
    ]
  }
]
```

**File:** play/src/pusher/controllers/UserController.ts (L55-88)
```typescript
    private saveName(): void {
        this.app.options("/save-name", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post("/save-name", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(
                req,
                res,
                z.object({
                    name: z.string(),
                    roomUrl: z.string(),
                })
            );

            if (body === undefined) {
                return;
            }

            if (!res.userIdentifier) {
                res.status(401).send("Undefined userIdentifier");
                return;
            }

            // Not logged? Nothing to save!
            if (res.isLogged) {
                await adminService.saveName(res.userIdentifier, body.name, body.roomUrl);
            }

            res.status(204).send("");
            return;
        });
```

**File:** play/src/pusher/controllers/UserController.ts (L128-161)
```typescript
    private saveTextures(): void {
        this.app.options("/save-textures", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post("/save-textures", [authenticated], async (req: Request, res: ResponseWithUserIdentifier) => {
            debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const body = validatePostQuery(
                req,
                res,
                z.object({
                    textures: z.array(z.string()),
                    roomUrl: z.string(),
                })
            );

            if (body === undefined) {
                return;
            }

            if (!res.userIdentifier) {
                res.status(401).send("Undefined userIdentifier");
                return;
            }

            // Not logged? Nothing to save!
            if (res.isLogged) {
                await adminService.saveTextures(res.userIdentifier, body.textures, body.roomUrl);
            }

            res.status(204).send("");
            return;
        });
```

**File:** play/src/pusher/controllers/UserController.ts (L199-236)
```typescript
    private saveCompanionTexture(): void {
        this.app.options("/save-companion-texture", (req: Request, res: Response) => {
            res.status(200).send("");
            return;
        });

        this.app.post(
            "/save-companion-texture",
            [authenticated],
            async (req: Request, res: ResponseWithUserIdentifier) => {
                debug(`UserController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
                const body = validatePostQuery(
                    req,
                    res,
                    z.object({
                        texture: z.string().nullable(),
                        roomUrl: z.string(),
                    })
                );

                if (body === undefined) {
                    return;
                }

                if (!res.userIdentifier) {
                    res.status(401).send("Undefined userIdentifier");
                    return;
                }

                // Not logged? Nothing to save!
                if (res.isLogged) {
                    await adminService.saveCompanionTexture(res.userIdentifier, body.texture, body.roomUrl);
                }

                res.status(204).send("");
                return;
            }
        );
```

**File:** play/src/common/FrontConfigurationInterface.ts (L1-71)
```typescript
import type { OpidWokaNamePolicy } from "@workadventure/messages";

export interface FrontConfigurationInterface {
    DEBUG_MODE: boolean;
    PUSHER_URL: string;
    FRONT_URL: string;
    ADMIN_URL: string | undefined;
    UPLOADER_URL: string;
    ICON_URL: string;
    SKIP_RENDER_OPTIMIZATIONS: boolean;
    DISABLE_NOTIFICATIONS: boolean;
    JITSI_URL: string | undefined;
    JITSI_PRIVATE_MODE: boolean;
    ENABLE_MAP_EDITOR: boolean;
    PUBLIC_MAP_STORAGE_PREFIX: string | undefined;
    MAX_USERNAME_LENGTH: number;
    MAX_PER_GROUP: number;
    MAX_DISPLAYED_VIDEOS: number;
    NODE_ENV: string;
    CONTACT_URL: string | undefined;
    POSTHOG_API_KEY: string | undefined;
    POSTHOG_URL: string | undefined;
    DISABLE_ANONYMOUS: boolean;
    ENABLE_OPENID: boolean;
    OPID_PROFILE_SCREEN_PROVIDER: string | undefined;
    ENABLE_CHAT_UPLOAD: boolean;
    FALLBACK_LOCALE: string | undefined;
    OPID_WOKA_NAME_POLICY: OpidWokaNamePolicy | undefined;
    ENABLE_REPORT_ISSUES_MENU: boolean | undefined;
    REPORT_ISSUES_URL: string | undefined;
    SENTRY_DSN_FRONT: string | undefined;
    SENTRY_DSN_PUSHER: string | undefined;
    SENTRY_ENVIRONMENT: string | undefined;
    SENTRY_RELEASE: string | undefined;
    SENTRY_TRACES_SAMPLE_RATE: number | undefined;
    WOKA_SPEED: number;
    FEATURE_FLAG_BROADCAST_AREAS: boolean;
    KLAXOON_ENABLED: boolean;
    KLAXOON_CLIENT_ID: string | undefined;
    YOUTUBE_ENABLED: boolean;
    GOOGLE_DRIVE_ENABLED: boolean;
    GOOGLE_DOCS_ENABLED: boolean;
    GOOGLE_SHEETS_ENABLED: boolean;
    GOOGLE_SLIDES_ENABLED: boolean;
    ERASER_ENABLED: boolean;
    MINIMUM_DISTANCE: number;
    GOOGLE_DRIVE_PICKER_CLIENT_ID: string | undefined;
    GOOGLE_DRIVE_PICKER_APP_ID: string | undefined;
    EXCALIDRAW_ENABLED: boolean;
    EXCALIDRAW_DOMAINS: string[];
    CARDS_ENABLED: boolean;
    TLDRAW_ENABLED: boolean;
    EMBEDLY_KEY: string | undefined;
    MATRIX_PUBLIC_URI: string | undefined;
    MATRIX_ADMIN_USER: string | undefined;
    MATRIX_DOMAIN: string | undefined;
    ENABLE_CHAT: boolean | undefined;
    ENABLE_CHAT_ONLINE_LIST: boolean | undefined;
    ENABLE_CHAT_DISCONNECTED_LIST: boolean | undefined;
    ENABLE_SAY: boolean | undefined;
    ENABLE_ISSUE_REPORT: boolean | undefined;
    GRPC_MAX_MESSAGE_SIZE: number;
    TURN_CREDENTIALS_RENEWAL_TIME: number;
    BACKGROUND_TRANSFORMER_ENGINE: "tasks-vision" | "selfie-segmentation" | undefined;
    // Woka settings
    DEFAULT_WOKA_NAME: string | undefined;
    DEFAULT_WOKA_TEXTURE: string | undefined;
    SKIP_CAMERA_PAGE: boolean | undefined;
    PROVIDE_DEFAULT_WOKA_NAME: "no" | "random" | "fix" | "fix-plus-random-numbers" | undefined;
    PROVIDE_DEFAULT_WOKA_TEXTURE: "no" | "random" | "fix" | undefined;
}
```

**File:** play/src/front/Connection/AxiosUtils.ts (L11-20)
```typescript
export const axiosToPusher = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});

/**
 * This instance of Axios will retry in case of an issue and display an error message as a HTML overlay.
 */
export const axiosWithRetry = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});
```

**File:** play/src/front/Connection/AxiosUtils.ts (L22-43)
```typescript
axiosRetry(axiosWithRetry, {
    retries: Number.MAX_SAFE_INTEGER,
    shouldResetTimeout: true,
    retryDelay: (retryCount: number) => {
        const time = exponentialDelay(retryCount);
        if (time >= 60_000) {
            return 60_000;
        }
        return time;
    },
    retryCondition: (error: AxiosError) => {
        if (isNetworkOrIdempotentRequestError(error)) {
            return true;
        }

        return error.code !== "ECONNABORTED" && (!error.response || error.response.status == 429);
    },
    onRetry: (retryCount, error: AxiosError, requestConfig: AxiosRequestConfig) => {
        console.info(`Retry attempt #${retryCount} on URL '${requestConfig.url}':`, error.message);
        showConnectionIssueMessage();
    },
});
```

**File:** play/src/front/Connection/Room.ts (L252-258)
```typescript
    public isDisconnected(): boolean {
        const alone = this._search.get("alone");
        if (alone && alone !== "0" && alone.toLowerCase() !== "false") {
            return true;
        }
        return false;
    }
```

**File:** play/src/front/Enum/EnvironmentVariable.ts (L1-12)
```typescript
//import { getEnvConfig } from "@geprog/vite-plugin-env-config/getEnvConfig";
import type { FrontConfigurationInterface } from "../../common/FrontConfigurationInterface";

declare global {
    interface Window {
        env: FrontConfigurationInterface;
    }
}

const env = window.env;
export const DEBUG_MODE = env.DEBUG_MODE;
export const PUSHER_URL = env.PUSHER_URL;
```

**File:** play/src/front/Enum/ComputedConst.ts (L1-3)
```typescript
import { PUSHER_URL } from "./EnvironmentVariable";

export const ABSOLUTE_PUSHER_URL = new URL(PUSHER_URL, window.location.toString()).toString();
```



## WorkAdventure Frontend-Only Mock Mode Implementation

This codemap traces the current WorkAdventure play service architecture showing how the frontend depends on the pusher backend for authentication [4a], map loading [5c], and avatar customization [5a, 5b]. The key insight is that all HTTP API calls flow through ABSOLUTE_PUSHER_URL [2a] using axios clients [2b, 2c], and environment variables are injected via window.env [3a, 3b]. To implement frontend-only mock mode, you need to create a new Vite configuration with middleware to mock these endpoints, serve static data [5a, 5b], and handle persistence operations [6a, 6b, 6c] while leveraging the existing alone mode [7a] for offline operation.
### 1. Current Development Architecture
How the play service currently runs both frontend and backend concurrently
### 1a. Concurrent dev script (`package.json:17`)
Runs both Vite frontend and Express pusher backend together
```text
"dev": "cross-env concurrently --kill-others-on-fail \"npm:dev-front\" \"npm:typesafe-i18n-watch\" \"npm:watch-iframe-api\" \"npm:svelte-check-watch\" \"npm:dev-pusher\""
```
### 1b. Frontend-only script (`package.json:18`)
Runs only Vite dev server on port 8080
```text
"dev-front": "cross-env vite",
```
### 1c. Vite server config (`vite.config.mts:19`)
Frontend runs on port 8080 with HMR support
```text
host: "0.0.0.0",
            port: 8080,
```
### 2. Frontend API Communication Layer
How the frontend connects to the pusher backend via HTTP APIs
### 2a. Pusher URL resolution (`ComputedConst.ts:3`)
Computes absolute URL for API calls based on environment
```text
export const ABSOLUTE_PUSHER_URL = new URL(PUSHER_URL, window.location.toString()).toString();
```
### 2b. Authenticated API client (`AxiosUtils.ts:11`)
Axios instance for authenticated endpoints
```text
export const axiosToPusher = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});
```
### 2c. Retry-enabled API client (`AxiosUtils.ts:18`)
Axios instance with retry logic for critical endpoints
```text
export const axiosWithRetry = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});
```
### 3. Environment Variable Injection System
How configuration flows from server to frontend
### 3a. Environment access (`EnvironmentVariable.ts:10`)
Frontend reads config from window.env
```text
const env = window.env;
```
### 3b. Server-side injection (`FrontController.ts:68`)
Backend serializes env into JavaScript for frontend
```text
"window.env = " +
                JSON.stringify(FRONT_ENVIRONMENT_VARIABLES) +
```
### 3c. Test environment setup (`vitest.setup.ts:94`)
Example of how window.env can be mocked for testing
```text
window.env = defaultEnv;
```
### 4. Authentication Flow Dependencies
Critical endpoints the frontend needs for user authentication
### 4a. Anonymous login response (`AuthenticateController.ts:527`)
Backend generates JWT token for anonymous users
```text
const userUuid = v4();
                const authToken = jwtTokenManager.createAuthToken(userUuid);
                res.json({
                    authToken,
                    userUuid,
                });
```
### 4b. Character validation field (`MeResponse.ts:43`)
Controls redirect to character selection screen
```text
isCharacterTexturesValid: extendApi(z.boolean(), {
```
### 4c. Companion validation field (`MeResponse.ts:48`)
Controls redirect to companion selection screen
```text
isCompanionTextureValid: extendApi(z.boolean(), {
```
### 5. Character and Companion Data Sources
Static data files that need to be served for customization screens
### 5a. Woka collections structure (`woka.json:3`)
JSON data for character textures
```text
"collections": [
            {
                "name": "default",
```
### 5b. Companion collections structure (`companions.json:3`)
JSON data for companion textures
```text
"name": "default",
    "position": 0,
    "textures": [
```
### 5c. Map URL field (`MapDetailsData.ts:151`)
Controls which map file the frontend loads
```text
"mapUrl": extendApi(z.string().optional(), {
```
### 6. User Persistence Endpoints
Save operations that need to be mocked to prevent UI errors
### 6a. Save name success response (`UserController.ts:86`)
Returns 204 after saving user name
```text
res.status(204).send("");
```
### 6b. Save textures success response (`UserController.ts:159`)
Returns 204 after saving character textures
```text
res.status(204).send("");
```
### 6c. Save companion success response (`UserController.ts:233`)
Returns 204 after saving companion texture
```text
res.status(204).send("");
```
### 7. Alone Mode Implementation
How the frontend handles offline/disconnected mode
### 7a. Alone mode detection (`Room.ts:252`)
Frontend checks if alone=true parameter enables offline mode
```text
public isDisconnected(): boolean {
        const alone = this._search.get("alone");
        if (alone && alone !== "0" && alone.toLowerCase() !== "false") {
            return true;
        }
        return false;
    }
```
### 8. Map Assets Structure
Map files that need to be served for room loading
### 8a. Map file structure (`map.json:1`)
Tiled JSON map format for starter room
```text
{ "compressionlevel":-1,
 "height":17,
 "infinite":false,
 "layers":[
```