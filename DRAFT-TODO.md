
Task: run only frontend from my code base with mockup data and others mokup servers
how implement this step by step please create todo
### Answer
# Step-by-Step TODO: Run Only Frontend with Mockup Data

Based on the WorkAdventure codebase structure, here's a comprehensive guide to run only the frontend with mockup data and mock servers:

## Prerequisites Setup

**TODO 1:** Install Node.js dependencies
- Navigate to the root directory and run `npm install` to install workspace dependencies
- The project uses npm workspaces workadventure:13-23 

**TODO 2:** Navigate to the play directory
- Change to the `play` directory which contains the frontend application
- The play package contains both frontend (Vite) and backend (pusher) code workadventure:1-13 

## Environment Configuration

**TODO 3:** Copy and configure environment variables
- Copy `.env.template` to `.env` in the root directory
- The template contains all necessary environment variables workadventure:1-10 

**TODO 4:** Configure frontend-specific environment variables
- Set `VITE_URL` for the frontend dev server (default: `http://localhost:8080`)
- Configure `PUSHER_URL`, `FRONT_URL`, and other URLs to point to mock servers or localhost
- The frontend receives its configuration through environment variables workadventure:154-218 

## Mock Services Setup

**TODO 5:** Decide on mock service strategy
You have two options:

**Option A - Use Docker for mock services only:**
- Run only the mock/support services from docker-compose (OIDC, Redis, etc.)
- Example: `docker-compose up oidc-server-mock redis icon`
- The docker-compose includes a mock OIDC server for authentication workadventure:366-387 

**Option B - Create mock API responses:**
- Create mock data files for API responses
- Modify API calls to use local mock data instead of real backend services

## Generate Required Files

**TODO 6:** Generate protocol buffer files
- Run the messages generation: `cd messages && npm install && npm run proto-all`
- Or wait for the messages container if using partial docker setup

**TODO 7:** Generate i18n typings
- Run `npm run typesafe-i18n` from the play directory
- This generates type-safe internationalization files workadventure:36-37 

**TODO 8:** Build iframe API (if needed)
- Run `npm run build-iframe-api` from the play directory
- This builds the iframe API for map scripting workadventure:24-25 

## Running the Frontend

**TODO 9:** Start the frontend dev server
- Run `npm run dev-front` from the play directory
- This starts Vite on port 8080 workadventure:18-18 
- The Vite configuration is set to run on `0.0.0.0:8080` workadventure:16-26 

**TODO 10:** (Optional) Start the pusher server separately
- If you need WebSocket functionality, run `npm run dev-pusher` in a separate terminal
- This provides the backend API and WebSocket server workadventure:19-19 

## Mock Data Configuration

**TODO 11:** Configure mock authentication
- Set `DISABLE_ANONYMOUS=false` to allow anonymous access, OR
- Use the mock OIDC server with test credentials (User1/pwd) workadventure:401-423 

**TODO 12:** Configure mock map storage
- Set `START_ROOM_URL` to a local or public test map
- Default is `/_/global/maps.workadventure.localhost/starter/map.json` workadventure:97-97 

**TODO 13:** Disable external services
- Set `ENABLE_CHAT=false` if you don't need Matrix chat
- Set `DISABLE_NOTIFICATIONS=true` to disable notifications
- Configure other feature flags as needed workadventure:133-140 

## Testing

**TODO 14:** Add /etc/hosts entries (if needed)
- Add local domain mappings for `*.workadventure.localhost`
- Required for proper routing with mock services workadventure:84-89 

**TODO 15:** Access the application
- Open `http://localhost:8080` (or your configured VITE_URL) in your browser
- Test with mock credentials if authentication is enabled

## Notes

- The frontend communicates with the pusher server for game logic and WebSocket connections workadventure:3-11 
- For a completely standalone frontend, you'll need to mock or stub the pusher API endpoints
- The application requires several backend services for full functionality (back, map-storage, uploader), but basic frontend rendering can work with minimal setup
- Consider using the full `docker-compose up` approach for the most reliable development experience, as documented in the README workadventure:52-76
### Citations
**File:** package.json (L13-23)
```json
  "workspaces": [
    "play",
    "back",
    "map-storage",
    "libs/*",
    "benchmark",
    "uploader",
    "play/packages/iframe-api-typings",
    "tests",
    "contrib/tools/generate-env-docs"
  ],
```
**File:** play/package.json (L1-13)
```json
{
  "private": true,
  "name": "workadventure-play",
  "version": "1.0.0",
  "license": "SEE LICENSE IN LICENSE.txt",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/thecodingmachine/workadventure.git"
  },
  "bugs": {
    "url": "https://github.com/thecodingmachine/workadventure/issues"
  },
  "homepage": "https://github.com/thecodingmachine/workadventure#readme",
```
**File:** play/package.json (L18-18)
```json
    "dev-front": "cross-env vite",
```
**File:** play/package.json (L19-19)
```json
    "dev-pusher": "TSX_TSCONFIG_PATH=tsconfig-pusher.json tsx watch --clear-screen=false --inspect=0.0.0.0:9229 ./src/server.ts",
```
**File:** play/package.json (L24-25)
```json
    "build-iframe-api": "vite --config iframe-api.vite.config.mts build",
    "watch-iframe-api": "npm run build-iframe-api -- --watch",
```
**File:** play/package.json (L36-37)
```json
    "typesafe-i18n": "typesafe-i18n --no-watch",
    "typesafe-i18n-watch": "typesafe-i18n",
```
**File:** .env.template (L1-10)
```text
# Server Information
SERVER_NAME=
SERVER_MOTD=
SERVER_ICON=

DEBUG_MODE=false
JITSI_URL=meet.jit.si
# If your Jitsi environment has authentication set up, you MUST set JITSI_PRIVATE_MODE to "true" and you MUST pass a SECRET_JITSI_KEY to generate the JWT secret
JITSI_PRIVATE_MODE=false
JITSI_ISS=
```
**File:** .env.template (L133-140)
```text
ENABLE_CHAT=true
# Enable / disable upload of file in chat (MUST BE TRUE ONLY IF ENABLE_CHAT IS TRUE)
ENABLE_CHAT_UPLOAD=true
ENABLE_CHAT_ONLINE_LIST=true
ENABLE_CHAT_DISCONNECTED_LIST=true
# Chat max uploadable file size (Byte)
UPLOAD_MAX_FILESIZE=10485760

```
**File:** play/src/pusher/enums/EnvironmentVariable.ts (L97-97)
```typescript
export const START_ROOM_URL: string = env.START_ROOM_URL || "/_/global/maps.workadventu.re/starter/map.json";
```
**File:** play/src/pusher/enums/EnvironmentVariable.ts (L154-218)
```typescript
export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
    DEBUG_MODE: env.DEBUG_MODE,
    PUSHER_URL,
    FRONT_URL,
    ADMIN_URL,
    UPLOADER_URL: env.UPLOADER_URL,
    ICON_URL: env.ICON_URL,
    SKIP_RENDER_OPTIMIZATIONS: env.SKIP_RENDER_OPTIMIZATIONS,
    DISABLE_NOTIFICATIONS: env.DISABLE_NOTIFICATIONS,
    JITSI_URL: env.JITSI_URL,
    JITSI_PRIVATE_MODE: env.JITSI_PRIVATE_MODE,
    ENABLE_MAP_EDITOR: env.ENABLE_MAP_EDITOR,
    PUBLIC_MAP_STORAGE_PREFIX: env.PUBLIC_MAP_STORAGE_URL ? new URL(env.PUBLIC_MAP_STORAGE_URL).pathname : undefined,
    MAX_USERNAME_LENGTH: env.MAX_USERNAME_LENGTH,
    MAX_PER_GROUP: env.MAX_PER_GROUP,
    MAX_DISPLAYED_VIDEOS: env.MAX_DISPLAYED_VIDEOS,
    NODE_ENV: env.NODE_ENV || "development",
    CONTACT_URL: env.CONTACT_URL,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY,
    POSTHOG_URL: env.POSTHOG_URL,
    DISABLE_ANONYMOUS,
    ENABLE_OPENID: !!env.OPENID_CLIENT_ID || !!env.OPID_CLIENT_ID,
    OPID_PROFILE_SCREEN_PROVIDER: env.OPENID_PROFILE_SCREEN_PROVIDER || env.OPID_PROFILE_SCREEN_PROVIDER,
    OPID_WOKA_NAME_POLICY,
    ENABLE_CHAT_UPLOAD,
    FALLBACK_LOCALE,
    ENABLE_REPORT_ISSUES_MENU: env.ENABLE_REPORT_ISSUES_MENU,
    REPORT_ISSUES_URL: env.REPORT_ISSUES_URL,
    SENTRY_DSN_FRONT: env.SENTRY_DSN_FRONT,
    SENTRY_DSN_PUSHER: env.SENTRY_DSN_PUSHER,
    SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: env.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: env.SENTRY_TRACES_SAMPLE_RATE,
    WOKA_SPEED: env.WOKA_SPEED,
    FEATURE_FLAG_BROADCAST_AREAS: env.FEATURE_FLAG_BROADCAST_AREAS,
    KLAXOON_ENABLED: env.KLAXOON_ENABLED,
    KLAXOON_CLIENT_ID: env.KLAXOON_CLIENT_ID,
    YOUTUBE_ENABLED: env.YOUTUBE_ENABLED,
    GOOGLE_DRIVE_ENABLED: env.GOOGLE_DRIVE_ENABLED,
    GOOGLE_DOCS_ENABLED: env.GOOGLE_DOCS_ENABLED,
    GOOGLE_SHEETS_ENABLED: env.GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED: env.GOOGLE_SLIDES_ENABLED,
    ERASER_ENABLED: env.ERASER_ENABLED,
    EXCALIDRAW_ENABLED: env.EXCALIDRAW_ENABLED,
    EXCALIDRAW_DOMAINS: env.EXCALIDRAW_DOMAINS,
    CARDS_ENABLED: env.CARDS_ENABLED,
    TLDRAW_ENABLED: env.TLDRAW_ENABLED,
    PEER_VIDEO_LOW_BANDWIDTH: parseInt(env.PEER_VIDEO_LOW_BANDWIDTH || "150"),
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: parseInt(env.PEER_VIDEO_RECOMMENDED_BANDWIDTH || "600"),
    PEER_SCREEN_SHARE_LOW_BANDWIDTH: parseInt(env.PEER_SCREEN_SHARE_LOW_BANDWIDTH || "250"),
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: parseInt(env.PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH || "1000"),
    GOOGLE_DRIVE_PICKER_CLIENT_ID: env.GOOGLE_DRIVE_PICKER_CLIENT_ID,
    GOOGLE_DRIVE_PICKER_APP_ID: env.GOOGLE_DRIVE_PICKER_APP_ID,
    EMBEDLY_KEY: env.EMBEDLY_KEY,
    MATRIX_PUBLIC_URI,
    ENABLE_CHAT,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_DISCONNECTED_LIST,
    MATRIX_ADMIN_USER,
    MATRIX_DOMAIN,
    ENABLE_SAY: env.ENABLE_SAY || true,
    ENABLE_ISSUE_REPORT: env.ENABLE_ISSUE_REPORT || true,
    GRPC_MAX_MESSAGE_SIZE: env.GRPC_MAX_MESSAGE_SIZE,
    BACKGROUND_TRANSFORMER_ENGINE: env.BACKGROUND_TRANSFORMER_ENGINE || "selfie-segmentation",
};
```
**File:** docker-compose.yaml (L366-387)
```yaml
  # A mock server to test OpenID connect connectivity
  oidc-server-mock:
    image: ghcr.io/soluto/oidc-server-mock:0.7.0
    environment:
      ASPNETCORE_ENVIRONMENT: Development
      SERVER_OPTIONS_INLINE: |
        {
          "AccessTokenJwtType": "JWT",
          "Discovery": {
            "ShowKeySet": true
          },
          "Authentication": {
            "CookieSameSiteMode": "Lax",
            "CheckSessionCookieSameSiteMode": "Lax"
          }
        }
      LOGIN_OPTIONS_INLINE: |
        {
          "AllowRememberLogin": false
        }
      LOGOUT_OPTIONS_INLINE: |
        {
```
**File:** docker-compose.yaml (L401-423)
```yaml
      USERS_CONFIGURATION_INLINE: |
        [
          {
            "SubjectId":"1",
            "Username":"User1",
            "Password":"pwd",
            "Claims": [
              {
                "Type": "name",
                "Value": "John Doe",
                "ValueType": "string",
              },
              {
                "Type": "email",
                "Value": "john.doe@example.com",
                "ValueType": "string"
              },
              {
                "Type": "tags",
                "Value": "[\"admin\"]",
                "ValueType": "json"
              },
            ]
```
**File:** play/vite.config.mts (L16-26)
```typescript
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
```
**File:** README.md (L52-76)
```markdown
## Setting up a development environment

> [!NOTE]
> These installation instructions are for local development only. They will not work on
> remote servers as local environments do not have HTTPS certificates.

Install Docker and clone this repository.

> [!WARNING]
> If you are using Windows, make sure the End-Of-Line character is not modified by the cloning process by setting
> the `core.autocrlf` setting to false: `git config --global core.autocrlf false`

Run:

```
cp .env.template .env
docker-compose up
```

The environment will start with the OIDC mock server enabled by default.

You should now be able to browse to http://play.workadventure.localhost/ and see the application.
You can view the Traefik dashboard at http://traefik.workadventure.localhost

(Test user is "User1" and password is "pwd")
```
**File:** README.md (L84-89)
```markdown
Note: on some OSes, you will need to add this line to your `/etc/hosts` file:

**/etc/hosts**
```
127.0.0.1 oidc.workadventure.localhost redis.workadventure.localhost play.workadventure.localhost traefik.workadventure.localhost matrix.workadventure.localhost extra.workadventure.localhost icon.workadventure.localhost map-storage.workadventure.localhost uploader.workadventure.localhost maps.workadventure.localhost api.workadventure.localhost front.workadventure.localhost
```
```
**File:** play/src/common/FrontConfigurationInterface.ts (L3-11)
```typescript
export interface FrontConfigurationInterface {
    DEBUG_MODE: boolean;
    PUSHER_URL: string;
    FRONT_URL: string;
    ADMIN_URL: string | undefined;
    UPLOADER_URL: string;
    ICON_URL: string;
    SKIP_RENDER_OPTIMIZATIONS: boolean;
    DISABLE_NOTIFICATIONS: boolean;
```
## Q2
Task: run only frontend from my code base with mockup data and others mokup servers
how implement this step by step please create todo
## Frontend-Only Development with Mock Services
This codemap traces the setup and execution flow for running WorkAdventure's frontend independently with mock data and servers. It covers environment configuration, protocol buffer generation, frontend startup, and mock service integration. Key locations include the main dev script [1b], environment variable handling [2c], Vite configuration [3a], and server startup [4d].
### 1. Development Environment Setup
Initial setup process for frontend-only development with mock services
### 1a. Main development script (`package.json:17`)
Runs frontend, pusher server, and build processes concurrently
```text
"dev": "cross-env concurrently --kill-others-on-fail \"npm:dev-front\" \"npm:typesafe-i18n-watch\" \"npm:watch-iframe-api\" \"npm:svelte-check-watch\" \"npm:dev-pusher\""
```
### 1b. Frontend-only command (`package.json:18`)
Standalone Vite development server for the frontend
```text
"dev-front": "cross-env vite"
```
### 1c. Pusher server command (`package.json:19`)
Backend WebSocket and API server for game logic
```text
"dev-pusher": "TSX_TSCONFIG_PATH=tsconfig-pusher.json tsx watch --clear-screen=false --inspect=0.0.0.0:9229 ./src/server.ts"
```
### 2. Environment Configuration
How environment variables configure mock services and frontend behavior
### 2a. Environment setup (`README.md:67`)
Copy template environment file for configuration
```text
cp .env.template .env
```
### 2b. Frontend URL configuration (`docker-compose.yaml:65`)
Configures where the frontend dev server runs
```text
VITE_URL: "http://front.workadventure.localhost"
```
### 2c. Backend API URL (`docker-compose.yaml:66`)
URL for WebSocket and API connections
```text
PUSHER_URL: http://play.workadventure.localhost
```
### 2d. Authentication control (`docker-compose.yaml:96`)
Enables/disables anonymous access for mock setup
```text
DISABLE_ANONYMOUS: $DISABLE_ANONYMOUS
```
### 3. Frontend Server Configuration
Vite setup for frontend development with mock data
### 3a. Vite server config (`vite.config.mts:16`)
Frontend dev server runs on port 8080
```text
server: {
            host: "0.0.0.0",
            port: 8080,
            hmr: {
                // workaround for development in docker
                clientPort: 80,
            },
```
### 3b. File watching exclusions (`vite.config.mts:23`)
Ignores backend server files during frontend dev
```text
watch: {
                ignored: ["./src/pusher"],
            },
```
### 3c. Environment loading (`vite.config.mts:14`)
Loads environment variables for configuration
```text
const env = loadEnv(mode, process.cwd(), "");
```
### 4. Backend Server Startup
Pusher server initialization for WebSocket and API services
### 4a. Import pusher app (`server.ts:7`)
Imports the main Express application
```text
import app from "./pusher/app";
```
### 4b. App initialization (`server.ts:51`)
Initializes the Express application and middleware
```text
await app.init();
```
### 4c. HTTP server start (`server.ts:54`)
Starts the HTTP API server
```text
app
            .listenWebServer(PUSHER_HTTP_PORT)
            .then(() => console.info(`WorkAdventure Pusher web-server started on port ${PUSHER_HTTP_PORT}!`)),
```
### 4d. WebSocket server start (`server.ts:57`)
Starts the WebSocket server for real-time communication
```text
app
            .listenWebSocket(PUSHER_WS_PORT)
            .then(() => console.info(`WorkAdventure Pusher web-socket server started on port ${PUSHER_WS_PORT}!`)),
```
### 5. Mock Service Integration
How mock services are configured and integrated
### 5a. OIDC mock server (`docker-compose.yaml:367`)
Mock authentication server for testing
```text
# A mock server to test OpenID connect connectivity
  oidc-server-mock:
    image: ghcr.io/soluto/oidc-server-mock:0.7.0
```
### 5b. Build dependencies (`docker-compose.yaml:48`)
Generates protocol buffers and installs dependencies
```text
STARTUP_COMMAND_1: ../wait-proto.sh
      STARTUP_COMMAND_2: ../npm-install.sh
      STARTUP_COMMAND_3: npm run typesafe-i18n
```
### 5c. Protocol buffer generation (`package.json:6`)
Generates TypeScript types from proto files
```text
"ts-proto": "grpc_tools_node_protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=../libs/messages/src/ts-proto-generated"
```
### 5d. Proto file watching (`package.json:8`)
Watches for proto file changes and regenerates
```text
"proto:watch": "npm run proto-all; npm run proto:watch-files"
```
### 6. Frontend Configuration Interface
How frontend receives configuration from backend
### 6a. Frontend config object (`EnvironmentVariable.ts:154`)
Creates configuration object passed to frontend
```text
export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
```
### 6b. Service URLs (`EnvironmentVariable.ts:156`)
Configures URLs for various backend services
```text
PUSHER_URL,
    FRONT_URL,
    ADMIN_URL,
    UPLOADER_URL: env.UPLOADER_URL,
    ICON_URL: env.ICON_URL,
```
### 6c. Authentication settings (`EnvironmentVariable.ts:174`)
Configures authentication and OIDC settings
```text
DISABLE_ANONYMOUS,
    ENABLE_OPENID: !!env.OPENID_CLIENT_ID || !!env.OPID_CLIENT_ID,
```
### 6d. Feature flags (`EnvironmentVariable.ts:209`)
Enables/disables various frontend features
```text
ENABLE_CHAT,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_DISCONNECTED_LIST,
```
## Q3
Task: run frontend with only local first storage without others deps and storages
please create todo step by step
### Answer
# WorkAdventure Storage System Architecture

WorkAdventure uses **two separate services** for storage, each handling different types of data:

## 1. Map Storage Service (`map-storage`)

The `map-storage` service handles storage of maps, map assets, and map editor data. workadventure:3-7 

### Storage Backend Selection

The map-storage service uses a **factory pattern** to automatically select between two storage backends: workadventure:6-7 

- **S3 Storage**: Used when AWS credentials are configured
- **Local Disk Storage**: Used as the default when S3 is not configured

The selection logic checks if S3 environment variables are present. S3 storage is enabled when `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are all set. workadventure:43-45 

### Configuration for Local Storage

To use **local/first-party storage only** for maps, simply **do not set** the AWS-related environment variables. The system will automatically use disk storage.

The local storage directory is configured via the `STORAGE_DIRECTORY` environment variable, which defaults to `./public` if not specified. workadventure:69-73 

In the Docker environment, this defaults to `/maps` at the root of the container. workadventure:52-52 

The `DiskFileSystem` class handles all local file operations including reading, writing, and serving static files. workadventure:11-12 

### Key Map Storage Environment Variables workadventure:169-184 

- `STORAGE_DIRECTORY`: Local storage path (defaults to `./public`)
- `AWS_ACCESS_KEY_ID`: If empty, local storage is used
- `AWS_SECRET_ACCESS_KEY`: If empty, local storage is used
- `AWS_BUCKET`: If empty, local storage is used
- `MAP_STORAGE_API_TOKEN`: Required for authentication

## 2. Uploader Service (`uploader`)

The `uploader` service handles file uploads from users, primarily for chat attachments and audio messages. workadventure:1-4 

### Storage Provider Selection

The uploader service supports two storage backends with a **priority-based selection**: workadventure:6-9 

1. **S3 Storage** (permanent files): Preferred when configured
2. **Redis Storage** (temporary and permanent files): Used when S3 is not available
3. **NullStorageProvider**: Fallback when neither is configured

Each provider has an `isEnabled()` method that checks for required environment variables:

- **S3** is enabled when `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` are all set. workadventure:17-19 

- **Redis** is enabled when `REDIS_HOST` and `REDIS_PORT` are set. workadventure:19-21 

### Configuration for Local Storage

For **local/first-party storage without external dependencies**, configure the uploader to use **Redis** (which you can run locally): workadventure:111-118 

**Environment variables for Redis storage:**
- `UPLOADER_REDIS_HOST`: Redis hostname (e.g., `redis` or `localhost`)
- `UPLOADER_REDIS_PORT`: Redis port (defaults to `6379`)
- `UPLOADER_REDIS_DB_NUMBER`: Redis database number

**Do not set** the AWS variables to avoid external S3 dependencies.

A Redis instance is included in the default docker-compose setup. workadventure:347-348 

The uploader configuration in docker-compose shows both storage options as optional. workadventure:310-322 

## 3. Frontend Configuration

The frontend needs to know the URLs of these storage services: workadventure:56-57 

- `UPLOADER_URL`: URL of the file uploader service
- `PUBLIC_MAP_STORAGE_URL`: Public URL to the map-storage server
- `INTERNAL_MAP_STORAGE_URL`: Internal URL to the map-storage server

## Summary: Local-Only Configuration

To run WorkAdventure with **only local/first-party storage**:

1. **For Maps**: Don't configure AWS variables - the system automatically uses local disk storage via `STORAGE_DIRECTORY`

2. **For File Uploads**: 
   - Set up a local Redis instance
   - Configure: `UPLOADER_REDIS_HOST=redis`, `UPLOADER_REDIS_PORT=6379`
   - Leave AWS variables unset

3. **No external dependencies** required - both services will use local storage backends

## Notes

- The map-storage service supports authentication via Basic, Digest, or Bearer tokens to protect the upload endpoint. workadventure:56-64 
- Redis storage for the uploader supports temporary files (e.g., audio messages) with expiration, while S3 does not support this feature natively. workadventure:88-91 
- The maximum upload file size can be controlled via `UPLOAD_MAX_FILESIZE` environment variable. workadventure:138-139 
- Player variables for logged users are stored in Redis (configured separately from uploader Redis), while anonymous player data is stored in browser local storage. workadventure:149-149
### Citations
**File:** map-storage/README.md (L3-7)
```markdown
The map-storage component is in charge of:

- serving map files and assets to the game over HTTP
- accepting uploads of new maps and assets (as a ZIP file)
- editing the uploaded maps. The map-storage will receive edit messages from the back container directly.
```
**File:** map-storage/README.md (L52-52)
```markdown
Note: in the Docker image, the `STORAGE_DIRECTORY` defaults to `/maps` at the root of the container. 
```
**File:** map-storage/README.md (L56-64)
```markdown
### Configuring authentication

The `/upload` endpoint MUST be protected by authentication.

As of now, the map-storage supports 3 mechanisms for authentication basic enough (there is no integration with third party systems yet).

- Basic auth (with environment variable `ENABLE_BASIC_AUTHENTICATION=true`)
- Digest auth (with environment variable `ENABLE_DIGEST_AUTHENTICATION=true`)
- Bearer token (with environment variable `ENABLE_BEARER_AUTHENTICATION=true`)
```
**File:** map-storage/src/fileSystem.ts (L6-7)
```typescript
export const fileSystem =
    hasS3Bucket() && AWS_BUCKET ? new S3FileSystem(getS3Client(), AWS_BUCKET) : new DiskFileSystem(STORAGE_DIRECTORY);
```
**File:** map-storage/src/Services/S3Client.ts (L43-45)
```typescript
export function hasS3Bucket(): boolean {
    return Boolean(AWS_ACCESS_KEY_ID) && Boolean(AWS_SECRET_ACCESS_KEY) && Boolean(AWS_BUCKET);
}
```
**File:** map-storage/src/Enum/EnvironmentVariableValidator.ts (L69-73)
```typescript
    STORAGE_DIRECTORY: z
        .string()
        .optional()
        .transform(emptyStringToDefault("./public"))
        .describe("Storage directory for the maps on physical disk. Used if S3 storage is not configured."),
```
**File:** map-storage/src/Upload/DiskFileSystem.ts (L11-12)
```typescript
export class DiskFileSystem implements FileSystemInterface {
    public constructor(private baseDirectory: string) {}
```
**File:** docs/others/self-hosting/env-variables.md (L56-57)
```markdown
| `UPLOADER_URL` | Yes | URL of the file uploader service |
| `ICON_URL` | Yes | Base URL for icon resources |
```
**File:** docs/others/self-hosting/env-variables.md (L149-149)
```markdown
| `PLAYER_VARIABLES_MAX_TTL` | No | The maximum time to live of player variables for logged players, expressed in seconds (no limit by default). Use "-1" for infinity. Note that anonymous players don't have any TTL limit because their data is stored in local storage, not in Redis database.  |
```
**File:** docs/others/self-hosting/env-variables.md (L169-184)
```markdown
| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | The URI(s) of the back server |
| `AWS_ACCESS_KEY_ID` | No | AWS access key ID for S3 storage. If empty, local storage is used instead. |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret access key for S3 storage. If empty, local storage is used instead. |
| `AWS_DEFAULT_REGION` | No | AWS region for S3 storage (e.g., 'us-east-1', 'eu-west-1') |
| `AWS_BUCKET` | No | S3 bucket name for map storage. If empty, local storage is used instead. |
| `AWS_URL` | No | URL of the S3 endpoint. |
| `S3_MAX_PARALLEL_REQUESTS` | No | The maximum parallel number of requests done to the S3 bucket. Defaults to 50. |
| `S3_CONNECTION_TIMEOUT` | No | The timeout in milliseconds for the S3 connection in milliseconds. Defaults to 5000 (5 seconds). |
| `S3_REQUEST_TIMEOUT` | No | The timeout in milliseconds for the S3 requests in milliseconds. Defaults to 60000 (60 seconds). |
| `S3_UPLOAD_CONCURRENCY_LIMIT` | No | Maximum number of concurrent S3 upload operations. Defaults to 100 |
| `MAX_UNCOMPRESSED_SIZE` | No | The maximum size of an uploaded file. This the total size of the uncompressed file (not the ZIP file). Defaults to 1GB |
| `USE_DOMAIN_NAME_IN_PATH` | No | If true, the domain name will be used as a top level directory when fetching/storing files |
| `PATH_PREFIX` | No | The prefix to strip if a reverse proxy is proxying calls to the map-storage from a path, e.g. /map-storage |
| `STORAGE_DIRECTORY` | No | Storage directory for the maps on physical disk. Used if S3 storage is not configured. |
```
**File:** uploader/README.md (L1-4)
```markdown
# Uploader

The uploader component is in charge of accepting incoming files that can be downloaded by other users.
It is currently used by administrators of maps to send sounds/recordings to everyone on a map.
```
**File:** uploader/README.md (L88-91)
```markdown
## A note on temporary files

As of now, only Redis storage support "temporary files" (for example, audio files). You can have both AWS
and Redis setup and the uploader will favor AWS for permanent files and Redis for temporary files.
```
**File:** uploader/src/Service/StorageProviderService.ts (L6-9)
```typescript
export const storageProviderService: StorageProvider =
    s3StorageProvider || redisStorageProvider || new NullStorageProvider()

export const tempProviderService = redisStorageProvider || new NullStorageProvider()
```
**File:** uploader/src/Service/S3StorageProvider.ts (L17-19)
```typescript
    static isEnabled():boolean {
        return !!AWS_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY && !!AWS_DEFAULT_REGION
    }
```
**File:** uploader/src/Service/RedisStorageProvider.ts (L19-21)
```typescript
    static isEnabled(): boolean {
        return !!REDIS_HOST && !!REDIS_PORT
    }
```
**File:** .env.template (L111-118)
```text
# Redis for uploader service of WorkAdventure
## The uploader service stores all files uploaded by the chat service
## 2 possibilities to setup the uploader storage: AWS, REDIS
### AWS with all environement variable AWS
### Redis with this environment variable
UPLOADER_REDIS_HOST=redis
UPLOADER_REDIS_PORT=6379
UPLOADER_REDIS_DB_NUMBER=1
```
**File:** .env.template (L138-139)
```text
# Chat max uploadable file size (Byte)
UPLOAD_MAX_FILESIZE=10485760
```
**File:** docker-compose.yaml (L310-322)
```yaml
      #AWS
      AWS_ACCESS_KEY_ID: "${AWS_ACCESS_KEY_ID:-}"
      AWS_SECRET_ACCESS_KEY: "${AWS_SECRET_ACCESS_KEY:-}"
      AWS_DEFAULT_REGION: "${AWS_DEFAULT_REGION:-}"
      AWS_BUCKET: "${AWS_BUCKET:-}"
      AWS_ENDPOINT: "${AWS_ENDPOINT:-}"
      UPLOADER_AWS_SIGNED_URL_EXPIRATION: "${UPLOADER_AWS_SIGNED_URL_EXPIRATION:-}"
      #REDIS
      REDIS_HOST: "${UPLOADER_REDIS_HOST:-}"
      REDIS_PORT: "${UPLOADER_REDIS_PORT:-}"
      REDIS_DB_NUMBER: "${UPLOADER_REDIS_DB_NUMBER:-}"
      ENABLE_CHAT_UPLOAD: "$ENABLE_CHAT_UPLOAD"
      UPLOAD_MAX_FILESIZE: "${UPLOAD_MAX_FILESIZE:-}"
```
**File:** docker-compose.yaml (L347-348)
```yaml
  redis:
    image: redis:6
```