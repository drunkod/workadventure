# WorkAdventure Local Development Startup: npm run dev in play folder

> 📅 **Created:** 28 декабря 2025 г. в 12:54

## Overview

This map traces how WorkAdventure starts locally with npm run dev, launching three concurrent services: Vite frontend dev server (port 8080), Pusher WebSocket/HTTP server (ports 3000/3001), and Back gRPC service (port 50051). Key entry points: **[1b]** for the dev command orchestration, **[2c]** for Pusher startup, **[3b]** for Back service initialization, and **[5c]** for frontend WebSocket connection establishment.

## Table of Contents

1. [Dev command execution and service orchestration](#1-dev-command-execution-and-service-orchestration)
2. [Pusher service initialization and server startup](#2-pusher-service-initialization-and-server-startup)
3. [Back service initialization and gRPC server startup](#3-back-service-initialization-and-grpc-server-startu)
4. [Vite frontend dev server and entry point loading](#4-vite-frontend-dev-server-and-entry-point-loading)
5. [Frontend WebSocket connection establishment to Pusher](#5-frontend-websocket-connection-establishment-to-pus)
6. [Pusher WebSocket connection handling and routing](#6-pusher-websocket-connection-handling-and-routing)
7. [Pusher-to-Back gRPC communication for room management](#7-pusher-to-back-grpc-communication-for-room-managem)
8. [Pusher serves frontend HTML with environment configuration](#8-pusher-serves-frontend-html-with-environment-confi)

---

## 1. Dev command execution and service orchestration

> Play service package.json - Shows how npm run dev spawns multiple concurrent processes.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure is a **multi-service architecture** that requires three separate Node.js processes to run simultaneously during local development: a **frontend dev server** (Vite), a **Pusher service** (WebSocket/HTTP gateway), and a **Back service** (game logic via gRPC). The problem is coordinating these services so they all start together, restart on code changes, and fail together if any one crashes—essential for a productive development workflow.


#### Details


##### Concurrent Process Orchestration

The `npm run dev` command **[1a]** uses **concurrently** to spawn six parallel processes that must all run simultaneously. The `--kill-others-on-fail` flag ensures that if any critical service crashes, all processes terminate together rather than leaving orphaned servers running.


##### Three Core Services

The three main services are:

1. **Frontend (Vite)** **[1b]** - Runs on port 8080, serves the Svelte application with hot module replacement for instant UI updates
2. **Pusher** **[1c]** - Runs on ports 3000 (HTTP) and 3001 (WebSocket), acts as the gateway between browser clients and the Back service
3. **Back** **[1d]****[1e]** - Runs on port 50051 (gRPC), manages game rooms, user state, and multiplayer logic


##### Supporting Processes

Three additional watchers run alongside the core services:

- **typesafe-i18n** watches translation files and regenerates type-safe i18n code
- **iframe-api** rebuilds the iframe API that external scripts use to interact with WorkAdventure
- **svelte-check** continuously type-checks Svelte components for errors


##### Hot Reload Architecture

Both Pusher **[1c]** and Back **[1e]** use **tsx watch** which provides TypeScript hot-reloading—when you edit server code, the process automatically restarts without requiring manual intervention. The Vite dev server provides similar hot module replacement for frontend code. This architecture enables **rapid iteration** across the entire stack.


##### Cross-Directory Execution

The Back service lives in a separate directory (`../back`), so the dev-back script **[1d]** changes directories before executing. This workspace structure keeps frontend and backend concerns separated while allowing them to be developed in parallel.

</details>


### npm run dev execution in play folder

  - package.json scripts

    #### [1a] Main dev script
    📄 `package.json:17`

    ```json
    "dev": "cross-env concurrently --kill-others-on-fail \"npm:dev-front\" \"npm:typesafe-i18n-watch\" \"npm:watch-iframe-api\" \"npm:svelte-check-watch\" \"npm:dev-pusher\" \"npm:dev-back\"",
    ```


      #### [1b] Frontend Vite server
      📄 `package.json:18`

      ```json
      "dev-front": "cross-env vite",
      ```

      - "typesafe-i18n-watch" → i18n
      - "watch-iframe-api" → iframe API
      - "svelte-check-watch" → type check

      #### [1c] Pusher service with hot-reload
      📄 `package.json:19`

      ```json
      "dev-pusher": "TSX_TSCONFIG_PATH=tsconfig-pusher.json tsx watch --clear-screen=false --inspect=0.0.0.0:9229 ./src/server.ts",
      ```


      #### [1d] Back service startup
      📄 `package.json:20`

      ```json
      "dev-back": "cd ../back && HTTP_PORT=8081 PLAY_URL=http://127.0.0.1:3000 npm run dev",
      ```

        - ../back/package.json

          #### [1e] Back service dev command
          📄 `package.json:8`

          ```json
          "dev": "tsx watch --inspect=0.0.0.0:9229 src/server.ts",
          ```

            - → src/server.ts (Pusher)
            - → ../back/src/server.ts (Back)
  - All processes run concurrently with hot-reload

---

## 2. Pusher service initialization and server startup

> Play/Pusher service - Initializes Express HTTP server, uWebSockets WebSocket server, and Room API gRPC server.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's **Pusher service** is the critical middleware that sits between browser clients and the game backend. When you run `npm run dev` in the play folder, the Pusher service must start **three different server types simultaneously**: an Express HTTP server for REST APIs, a uWebSockets server for real-time WebSocket connections, and a gRPC server for external integrations. This multi-protocol architecture allows the Pusher to handle thousands of concurrent users while maintaining low latency for real-time game interactions.


#### Details


##### Startup Sequence

The Pusher service starts with an **async IIFE** **[2a]** that orchestrates the entire initialization. First, it calls `app.init()` **[2b]** to fetch **capabilities from the Admin API** and configure companion/woka services based on the deployment's feature flags. This ensures the Pusher knows what features are enabled before accepting any client connections.


##### Parallel Server Startup

The service uses `Promise.race()` to start all servers concurrently [2c, 2d]. The **Express HTTP server** listens on port 3000 for REST endpoints like authentication, map metadata, and user profiles. The **uWebSockets server** listens on port 3001 for WebSocket connections—this is where all real-time game traffic flows (player movements, chat messages, emotes). Both servers must be running for the application to function.


##### Room API (Optional)

If configured with `ROOM_API_SECRET_KEY`, the Pusher also starts a **gRPC Room API server** on port 50051 [2e, 2f]. This allows external systems to programmatically manage rooms, send announcements, and monitor user activity. The Room API is separate from the internal Back service communication—it's designed for third-party integrations.


##### Why This Architecture?

The separation of HTTP, WebSocket, and gRPC servers allows each protocol to be optimized independently. HTTP handles occasional requests, WebSockets maintain persistent connections for real-time updates, and gRPC provides efficient binary communication for external integrations. All three run in the same Node.js process, sharing memory and state, which simplifies deployment while maintaining protocol flexibility.

</details>


### Pusher Service Startup (play/src/server.ts)


  #### [2a] Async IIFE entry point
  📄 `server.ts:51`

  ```typescript
  (async () => {
  ```


    #### [2b] Initialize app
    📄 `server.ts:52`

    ```typescript
    await app.init();
    ```

      - adminApi.initialise()
        - Fetch capabilities from Admin API
      - Setup companion/woka services
    - Promise.race() - Start all servers

      #### [2c] Start HTTP server
      📄 `server.ts:56`

      ```typescript
      .listenWebServer(PUSHER_HTTP_PORT)
      ```

        - Express HTTP server starts

      #### [2d] Start WebSocket server
      📄 `server.ts:59`

      ```typescript
      .listenWebSocket(PUSHER_WS_PORT)
      ```

        - uWebSockets server starts
      - app.listenPrometheusPort()
    - Room API gRPC Server (if configured)

      #### [2e] Register Room API service
      📄 `server.ts:74`

      ```typescript
      RoomAPI.addService(RoomApiService, RoomApiServer);
      ```

        - Register RoomApiServer handler

      #### [2f] Bind Room API gRPC server
      📄 `server.ts:76`

      ```typescript
      RoomAPI.bindAsync(`0.0.0.0:${ROOM_API_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      ```

        - gRPC server starts listening

---

## 3. Back service initialization and gRPC server startup

> Back service - Initializes HTTP API for debugging/metrics and gRPC server for room/space management.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure is a distributed real-time multiplayer application that requires a **Back service** to manage game rooms, player positions, and synchronize state across multiple connected clients. When you run `npm run dev` in the play folder, it spawns the Back service as a separate process **[1d]** that handles the core game logic independently from the frontend and WebSocket gateway (Pusher).

The Back service solves a critical architectural problem: **centralizing game state management**. Without it, each Pusher instance would need to maintain its own room state, making horizontal scaling impossible and creating consistency issues when players interact across different server instances.


#### Details


##### Service Startup

The Back service starts via **tsx watch** **[1e]**, which provides hot-reloading during development. The entry point is an async IIFE **[3a]** that orchestrates three initialization steps in sequence.


##### Initialization Phase

First, `App.init()` **[3b]** fetches **capabilities** from the Admin API **[3b]**. This configuration determines what features are enabled (map editor, chat, integrations) and must complete before accepting any connections. The capabilities are stored globally via `setCapabilities()` for use throughout the service.


##### HTTP API Server

`App.listen()` **[3c]** starts an **Express HTTP server on port 8080** for debugging and monitoring endpoints. This includes Prometheus metrics (`/metrics`) and debug routes (`/dump`) but is not used for game traffic—it's purely operational.


##### gRPC Server

The critical component is `App.grpcListen()` **[3d]**, which creates a **gRPC server on port 50051**. This server exposes two key services:

- **RoomManagerService** **[3e]**: Handles player join/leave, movement updates, and room state synchronization
- **SpaceManagerService**: Manages virtual spaces for voice/video proximity chat

The gRPC server uses **bidirectional streaming**, allowing Pusher instances to maintain long-lived connections where both sides can send messages asynchronously. When `server.bindAsync()` **[3f]** completes, the Back service is ready to accept connections from Pusher instances and begin managing game rooms.


##### Architecture Note

The Back service communicates **exclusively via gRPC**—it never directly connects to browsers. All browser WebSocket connections terminate at Pusher, which then forwards game messages to Back via gRPC. This separation allows the Back service to focus purely on game logic while Pusher handles connection management, authentication, and protocol translation.

</details>


### Back Service Startup (npm run dev → back)

  - npm run dev in back/
    - tsx watch src/server.ts

      #### [3a] Back service entry point
      📄 `server.ts:35`

      ```typescript
      (async () => {
      ```


        #### [3b] Initialize capabilities
        📄 `server.ts:36`

        ```typescript
        await App.init();
        ```

          - sharedAdminApi.initialise()
            - setCapabilities()

        #### [3c] Start HTTP API
        📄 `App.ts:51`

        ```typescript
        this.app.listen(HTTP_PORT, () => console.info(`WorkAdventure HTTP API starting on port ${HTTP_PORT}!`));
        ```

          - Express HTTP on port 8080

        #### [3d] Start gRPC server
        📄 `server.ts:38`

        ```typescript
        App.grpcListen();
        ```

          - new grpc.Server()

          #### [3e] Register RoomManager service
          📄 `App.ts:83`

          ```typescript
          server.addService(RoomManagerService, roomManager);
          ```

          - addService(SpaceManagerService)

          #### [3f] Bind gRPC server
          📄 `App.ts:86`

          ```typescript
          server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
          ```

            - gRPC on port 50051

---

## 4. Vite frontend dev server and entry point loading

> Play/Frontend - Vite serves the Svelte application with hot module replacement.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure's frontend needs a **development server** that provides fast hot-module replacement (HMR) for rapid iteration during development. When developers run `npm run dev` in the play folder, they need the Svelte/TypeScript frontend to rebuild instantly on file changes without full page reloads. Vite solves this by serving the application as native ES modules with on-demand compilation, making the development experience significantly faster than traditional bundlers.


### Details


#### Vite Configuration

The development server is configured in `vite.config.mts` [4a, 4b]. Vite binds to **all network interfaces** (`0.0.0.0`) on **port 8080**, making it accessible both locally and from Docker containers. The configuration includes the Svelte plugin for component compilation, Icons plugin for SVG handling, and legacy browser polyfills.


#### Entry Point Flow

When a browser requests the application, Vite serves `index.html` which contains a **module script tag** pointing to `/src/svelte.ts` **[4c]**. This is the critical difference from production: in development, Vite intercepts this request and compiles the TypeScript on-the-fly.

The `svelte.ts` entry point [4d, 4e] imports three key dependencies:

- **Phaser** game engine for rendering the 2D world
- **SCSS styles** for the UI components
- **App.svelte** root component

It then **instantiates the Svelte application** and mounts it to the `#app` div in the HTML. From this point, Svelte's reactivity system takes over and renders the entire WorkAdventure interface.


#### Hot Module Replacement

Vite watches the filesystem for changes. When you edit a `.svelte` or `.ts` file, Vite recompiles only that module and sends an update over WebSocket to the browser, which hot-swaps the module without losing application state. This is why developers can see their changes instantly without manual refreshes.

</details>


### Vite Frontend Dev Server Startup

  - vite.config.mts configuration

    #### [4a] Vite server host
    📄 `vite.config.mts:17`

    ```
    host: "0.0.0.0",
    ```


    #### [4b] Vite server port
    📄 `vite.config.mts:18`

    ```
    port: 8080,
    ```

    - plugins: [svelte(), Icons(), ...]
  - index.html served by Vite
    - <head> with meta tags
    - <body id="app">

    #### [4c] Frontend entry point
    📄 `index.html:169`

    ```html
    <script type="module" src="/src/svelte.ts"></script>
    ```

  - /src/svelte.ts entry point
    - import "phaser"
    - import "./front/style/index.scss"

    #### [4d] Import root Svelte component
    📄 `svelte.ts:4`

    ```typescript
    import App from "./front/Components/App.svelte";
    ```


    #### [4e] Instantiate Svelte app
    📄 `svelte.ts:16`

    ```typescript
    const app = new App({
    ```


---

## 5. Frontend WebSocket connection establishment to Pusher

> Play/Frontend - Browser creates WebSocket connection to Pusher for real-time game communication.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure is a real-time multiplayer virtual world where users move avatars, interact with others, and collaborate. The frontend needs **bidirectional, low-latency communication** with the server to:

- Send user movements and actions instantly
- Receive updates about other users in real-time
- Handle game state changes (groups forming, items being triggered, etc.)

WebSockets provide this persistent connection, allowing the server to push updates without polling. The frontend establishes this connection to the **Pusher service**, which acts as the WebSocket gateway.


#### Details


##### Connection Establishment

The `RoomConnection` class manages the WebSocket lifecycle [5a, 5b, 5c]. When a user enters a room, the frontend:

1. **Constructs the WebSocket URL** pointing to the Pusher service (typically `ws://play.workadventure.localhost/ws/room`) **[5a]**
2. **Adds query parameters** including room ID, user token, character texture, companion, camera/mic states **[5b]**
3. **Creates the WebSocket** using the native browser API, passing the auth token via the subprotocols parameter (an abuse of the WebSocket spec to avoid query string exposure) **[5c]**


##### Message Protocol

The connection uses **Protocol Buffers** for efficient binary serialization **[5e]**. When messages arrive:

1. The `onmessage` handler receives raw ArrayBuffer data **[5d]**
2. `ServerToClientMessageTsProto.decode()` deserializes the binary into typed TypeScript objects **[5e]**
3. Messages are routed by their `$case` discriminator (e.g., `userJoinedMessage`, `userMovedMessage`, `groupUpdateMessage`)

Each message type flows into RxJS Subjects that other parts of the application subscribe to. For example, `userMovedMessage` updates the Phaser game scene to animate other players' avatars.


##### Why This Architecture

The frontend doesn't connect directly to the Back service (which manages game logic). Instead, **Pusher acts as a proxy** that:

- Handles WebSocket connections at scale
- Manages authentication and rate limiting
- Translates between WebSocket (frontend) and gRPC (Back service)

This separation allows the Back service to focus on game logic while Pusher handles connection management.

</details>


### Frontend WebSocket Connection to Pusher

  - RoomConnection constructor

    #### [5a] Build WebSocket URL
    📄 `RoomConnection.ts:291`

    ```typescript
    const urlObj = new URL(ABSOLUTE_PUSHER_URL);
    ```

      - Add query params (roomId, etc.)

      #### [5b] Finalize connection URL
      📄 `RoomConnection.ts:307`

      ```typescript
      const url = urlObj.toString();
      ```


    #### [5c] Create WebSocket connection
    📄 `RoomConnection.ts:317`

    ```typescript
    this.socket = new WebSocket(url, subProtocols);
    ```

      - Pass auth token via subprotocols
      - Set binaryType = "arraybuffer"
    - Setup message handlers
      - socket.onopen handler
      - socket.onclose handler

      #### [5d] Register message handler
      📄 `RoomConnection.ts:329`

      ```typescript
      this.socket.onmessage = (messageEvent) => {
      ```


        #### [5e] Decode protobuf messages
        📄 `RoomConnection.ts:333`

        ```typescript
        const serverToClientMessage = ServerToClientMessageTsProto.decode(new Uint8Array(arrayBuffer));
        ```

          - Route by message.$case
            - Handle userJoinedMessage
            - Handle userMovedMessage
            - Handle groupUpdateMessage
            - [other message types...]

---

## 6. Pusher WebSocket connection handling and routing

> Play/Pusher - IoSocketController accepts WebSocket connections and routes messages to SocketManager.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure needs to handle **real-time bidirectional communication** between browser clients and the server. When players move around virtual rooms, send chat messages, or interact with objects, these events must be transmitted instantly to other players. The Pusher service solves this by running **two separate servers**: an Express HTTP server for REST endpoints (serving HTML, handling authentication) and a **uWebSockets server for WebSocket connections** that provide the low-latency real-time channel.


#### Details


##### Architecture Overview

The Pusher service is initialized in `/play/src/server.ts` as a singleton `app` object. It creates two distinct server instances **[6a]**:

- **Express HTTP server** on port 3000 for traditional request/response patterns
- **uWebSockets server** on port 3001 for persistent WebSocket connections


##### WebSocket Controller Setup

The `IoSocketController` is instantiated during app construction **[6a]** and immediately calls `this.ioConnection()` **[6b]** to register the main WebSocket route at `/ws/room`. This registration defines four critical handlers:

- **upgrade**: Validates the connection request and extracts authentication tokens
- **open**: Initializes connection state when a client successfully connects
- **message**: Processes incoming binary protobuf messages from clients
- **close**: Cleans up resources when a connection terminates


##### Server Binding

After all routes and handlers are configured, the app binds both servers to their respective ports [6c, 6d]. The WebSocket server listens on port 3001 using uWebSockets' high-performance event loop, while the HTTP server listens on port 3000 using Node's standard HTTP implementation. Both servers run concurrently in the same process, allowing the Pusher to handle both REST API calls (like serving the frontend HTML) and real-time game events through a single service.


##### Why Two Servers?

Express provides excellent middleware and routing for HTTP, but **uWebSockets offers significantly better performance** for handling thousands of concurrent WebSocket connections with minimal CPU overhead. By separating concerns, the Pusher can serve static assets and API endpoints through Express while delegating real-time communication to the more efficient uWebSockets implementation.

</details>


### Pusher WebSocket Server Initialization

  - App constructor (pusher/app.ts)
    - this.websocketApp = uWebsockets.App()
    - this.app = express()

    #### [6a] Initialize WebSocket controller
    📄 `app.ts:85`

    ```typescript
    new IoSocketController(this.websocketApp);
    ```

      - IoSocketController constructor

        #### [6b] Setup main WebSocket route
        📄 `IoSocketController.ts:65`

        ```typescript
        this.ioConnection();
        ```

          - app.ws("/ws/room", handlers)
            - upgrade handler
            - open handler
            - message handler
            - close handler
  - App.listenWebSocket() / listenWebServer()

    #### [6c] Start WebSocket listener
    📄 `app.ts:208`

    ```typescript
    this.websocketApp.listen(port, (token) => {
    ```


    #### [6d] Start HTTP listener
    📄 `app.ts:196`

    ```typescript
    this.app.listen(port, (err) => {
    ```

      - Express HTTP server started

---

## 7. Pusher-to-Back gRPC communication for room management

> Play/Pusher to Back - Pusher establishes gRPC connection to Back service for room state management.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure is a distributed system where the **Pusher service** (running in the play container) acts as a gateway between browser clients and the **Back service** (running in the back container). The Pusher handles WebSocket connections from potentially thousands of clients, but it doesn't manage game logic itself. Instead, it needs to communicate with the Back service, which maintains the authoritative game state for all rooms and users.

The problem: **How does Pusher efficiently communicate with Back to coordinate room state, user positions, and real-time events?** The solution is **gRPC with bidirectional streaming**, which provides type-safe, efficient binary communication between the two services.


#### Details


##### gRPC Client Management

The `ApiClientRepository` **[7a]** is a singleton that manages a pool of gRPC client connections to the Back service. It's initialized with the `API_URL` environment variable (typically `back:50051` in Docker), allowing the Pusher to connect to one or more Back instances.

When a client needs to interact with a room, the `SocketManager` calls `apiClientRepository.getClient(roomId)` **[7b]** to retrieve or create a gRPC client connection. This ensures efficient connection reuse across multiple requests.


##### Bidirectional Streaming

For admin room monitoring, Pusher opens a **bidirectional gRPC stream** using `apiClient.adminRoom()` **[7c]**. This stream allows both services to send messages asynchronously without waiting for request-response cycles, which is critical for real-time game updates.


##### Back Service Processing

On the Back side, the `RoomManager` **[7d]** implements the gRPC service interface. When a user joins a room, the `joinRoom` method receives the gRPC stream call. It registers a data handler **[7e]** that processes incoming messages from Pusher.

The actual game logic is delegated to `socketManager.handleJoinRoom()` **[7f]**, which creates the `GameRoom` and `User` objects, adds the user to the room's state, and begins streaming position updates and events back to Pusher through the same gRPC connection.


##### Why gRPC?

This architecture uses **gRPC instead of REST** because:

- **Bidirectional streaming** enables real-time push updates without polling
- **Protocol Buffers** provide efficient binary serialization (smaller than JSON)
- **Type safety** through generated TypeScript/Node.js code from `.proto` files
- **Connection multiplexing** over HTTP/2 reduces overhead

The separation allows Pusher to scale horizontally (handling more WebSocket connections) independently from Back (handling more game rooms), with gRPC providing the efficient glue between them.

</details>


### Pusher-to-Back gRPC Communication Flow

  - Pusher Service Initialization

    #### [7a] Create gRPC client repository
    📄 `ApiClientRepository.ts:4`

    ```typescript
    const apiClientRepository = new ApiClientRepository(API_URL.split(","));
    ```

      - Manages gRPC client pool
  - Client Connection Handling (Pusher)
    - SocketManager.handleAdminRoom()

      #### [7b] Get gRPC client for room
      📄 `SocketManager.ts:95`

      ```typescript
      const apiClient = await apiClientRepository.getClient(roomId, GRPC_MAX_MESSAGE_SIZE);
      ```

        - Returns gRPC client to Back

      #### [7c] Open bidirectional stream
      📄 `SocketManager.ts:97`

      ```typescript
      const adminRoomStream = apiClient.adminRoom();
      ```

        - Opens bidirectional stream
  - Back Service Room Management
    - RoomManager gRPC service

      #### [7d] Back handles join room
      📄 `RoomManager.ts:46`

      ```typescript
      joinRoom: (call: UserSocket): void => {
      ```

        - call.on("data", message)

          #### [7e] Delegate to SocketManager
          📄 `RoomManager.ts:68`

          ```typescript
          socketManager
          ```


            #### [7f] Handle join room logic
            📄 `RoomManager.ts:69`

            ```typescript
            .handleJoinRoom(call, message.message.joinRoomMessage)
            ```

              - Creates GameRoom
              - Creates User object
              - Streams updates to Pusher

---

## 8. Pusher serves frontend HTML with environment configuration

> Play/Pusher - FrontController serves index.html with injected environment variables and capabilities.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

When a user visits WorkAdventure in their browser, they need to receive an HTML page that contains the frontend application. However, this isn't just a static HTML file—it needs to be **dynamically generated** with environment-specific configuration, authentication tokens, and metadata about the map they're visiting. The Pusher service's FrontController solves this by serving a customized HTML page that injects all necessary runtime configuration before the frontend JavaScript even loads.


#### Details


##### Route Registration and Request Handling

The FrontController registers Express routes to catch various URL patterns like `/_/*`, `/@/*`, and `/~/*` **[8a]**. When a request comes in, it calls `displayFront()` **[8b]** which orchestrates the entire HTML generation process.


##### Metadata Fetching

Before rendering, the controller fetches two key pieces of information:

- **Map metadata** via `MetaTagsBuilder.getMeta()` for Open Graph tags, favicons, and SEO
- **Map details** via `getMapDetails()` for custom colors and theming


##### Template Rendering with Mustache

The core of the process is **Mustache template rendering** **[8c]**. The controller takes the base `index.html` template and injects multiple data sources:

1. **Environment variables**: The `getScript()` method **[8d]** builds a JavaScript snippet that exposes `window.env` **[8e]** containing `FRONT_ENVIRONMENT_VARIABLES` (API URLs, feature flags, etc.) and `window.capabilities` (server capabilities from Admin API)
2. **Authentication**: The `authToken` from the request body is injected into a hidden input field, allowing the frontend to authenticate with the Pusher WebSocket
3. **Visual customization**: CSS variable overrides based on the map's color scheme


##### Response Delivery

Finally, the rendered HTML is sent to the browser with **no-cache headers** to ensure users always get fresh configuration. This approach means the frontend JavaScript can immediately access `window.env` and `window.capabilities` without making additional API calls, enabling faster startup.

</details>


### Pusher FrontController Serving Frontend HTML

  - Express Route Registration

    #### [8a] Register frontend route
    📄 `FrontController.ts:90`

    ```typescript
    this.app.get("/_/{*splat}", (req: Request, res: Response) => {
    ```


      #### [8b] Serve frontend HTML
      📄 `FrontController.ts:95`

      ```typescript
      return this.displayFront(req, res, this.getFullUrl(req));
      ```

        - MetaTagsBuilder.getMeta()
        - MetaTagsBuilder.getMapDetails()

        #### [8c] Render HTML template
        📄 `FrontController.ts:291`

        ```typescript
        html = Mustache.render(this.indexFile, {
        ```

          - inject metaTagsData

          #### [8d] Inject environment script
          📄 `FrontController.ts:296`

          ```typescript
          script: await this.getScript(),
          ```

            - getScript()

              #### [8e] Build environment object
              📄 `FrontController.ts:68`

              ```typescript
              "window.env = " +
              ```

                - FRONT_ENVIRONMENT_VARIABLES
                - capabilities
          - inject authToken
          - inject cssVariablesOverride
  - res.send(html) to browser

---

---

## Referenced Files

```xml
<files>
<file path="ApiClientRepository.ts">
/**
 * A class to get connections to the correct "api" server given a room name.
 */
<!-- [7a] Create gRPC client repository (line 4) -->
import crypto from "crypto";
import * as grpc from "@grpc/grpc-js";

import Debug from "debug";
import { RoomManagerClient, SpaceManagerClient } from "@workadventure/messages/src/ts-proto-generated/services";

const debug = Debug("apiClientRespository");

export class ApiClientRepository {
    private roomManagerClients: RoomManagerClient[] = [];
    private spaceManagerClients: SpaceManagerClient[] = [];

    public constructor(private apiUrls: string[]) {}

    public async getClient(roomId: string, GRPC_MAX_MESSAGE_SIZE: number): Promise<RoomManagerClient> {
        const index = this.getIndex(roomId);

        let client = this.roomManagerClients[index];
        if (client === undefined) {
            this.roomManagerClients[index] = client = new RoomManagerClient(
                this.apiUrls[index],
                grpc.credentials.createInsecure(),
                {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                }
            );
        }
        debug("Mapping room %s to API server %s", roomId, this.apiUrls[index]);

        return Promise.resolve(client);
    }

    public getAllClients(GRPC_MAX_MESSAGE_SIZE: number): Promise<RoomManagerClient[]> {
        for (let i = 0; i < this.apiUrls.length; i++) {
            if (this.roomManagerClients[i] === undefined) {
                this.roomManagerClients[i] = new RoomManagerClient(this.apiUrls[i], grpc.credentials.createInsecure(), {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                });
            }
        }
        return Promise.resolve(this.roomManagerClients);
    }

    async getSpaceClient(spaceName: string, GRPC_MAX_MESSAGE_SIZE: number): Promise<SpaceManagerClient> {
        const index = this.getIndex(spaceName);

        let client = this.spaceManagerClients[index];
        if (client === undefined) {
            this.spaceManagerClients[index] = client = new SpaceManagerClient(
                this.apiUrls[index],
                grpc.credentials.createInsecure(),
                {
                    "grpc.max_receive_message_length": GRPC_MAX_MESSAGE_SIZE,
                    "grpc.max_send_message_length": GRPC_MAX_MESSAGE_SIZE,
                }
            );
        }
        debug("Mapping room %s to API server %s", spaceName, this.apiUrls[index]);

        return Promise.resolve(client);
    }

    public getIndex(name: string) {
        const array = new Uint32Array(crypto.createHash("md5").update(name).digest());
        return array[0] % this.apiUrls.length;
    }
}

</file>
<file path="App.ts">
// lib/app.ts
import express, {Express} from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import morgan from "morgan";
import {FileController} from "./Controller/FileController";
import {ALLOWED_CORS_ORIGIN} from "./Enum/EnvironmentVariable";

class App {
    public app: Express;
    public fileController: FileController;

    constructor() {
        this.app = express();

        // Global middlewares
        this.app.use(cors({
            origin: ALLOWED_CORS_ORIGIN
        }));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(morgan('dev'));

        this.fileController = new FileController(this.app);
    }
}

export default new App().app;

</file>
<file path="FrontController.ts">
import fs from "fs";
import type { Request, Response, Application } from "express";
import Mustache from "mustache";
import { uuid } from "stanza/Utils";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import Debug from "debug";
import { MetaTagsBuilder } from "../services/MetaTagsBuilder";
import { adminService } from "../services/AdminService";
import { getStringPalette, wrapWithStyleTag } from "../services/GenerateCustomColors";
import { notWaHost } from "../middlewares/NotWaHost";
import { version } from "../../../package.json";
import {
    FRONT_ENVIRONMENT_VARIABLES,
    VITE_URL,
    LOGROCKET_ID,
    AUTOLOGIN_URL,
    GOOGLE_DRIVE_PICKER_CLIENT_ID,
} from "../enums/EnvironmentVariable";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class FrontController extends BaseHttpController {
    private indexFile: string;
    private redirectToAdminFile: string;
    private script: Promise<string> | undefined;

    constructor(protected app: Application) {
        super(app);

        let indexPath: string;
        if (fs.existsSync("dist/public/index.html")) {
            // In prod mode
            indexPath = "dist/public/index.html";
        } else if (fs.existsSync("index.html")) {
            // In dev mode
            indexPath = "index.html";
        } else {
            throw new Error("Could not find index.html file");
        }

        let redirectToAdminPath: string;
        if (fs.existsSync("dist/public/redirectToAdmin.html")) {
            // In prod mode
            redirectToAdminPath = "dist/public/redirectToAdmin.html";
        } else if (fs.existsSync("redirectToAdmin.html")) {
            // In dev mode
            redirectToAdminPath = "redirectToAdmin.html";
        } else {
            throw new Error("Could not find redirectToAdmin.html file");
        }

        this.indexFile = fs.readFileSync(indexPath, "utf8");
        this.redirectToAdminFile = fs.readFileSync(redirectToAdminPath, "utf8");

        // Pre-parse the index file for speed (and validation)
        Mustache.parse(this.indexFile);
    }

    private async getScript() {
        if (this.script) {
            return this.script;
        }
        this.script = adminService.getCapabilities().then((capabilities) => {
            return (
<!-- [8e] Build environment object (line 68) -->
                "window.env = " +
                JSON.stringify(FRONT_ENVIRONMENT_VARIABLES) +
                "\nwindow.capabilities = " +
                JSON.stringify(capabilities)
            );
        });
        return this.script;
    }

    routes(): void {
        this.front();
    }

    private getFullUrl(req: Request): string {
        let protocol = req.header("X-Forwarded-Proto");
        if (!protocol) {
            protocol = req.protocol;
        }
        return `${protocol}://${req.get("host")}${req.originalUrl}`;
    }

    front(): void {
<!-- [8a] Register frontend route (line 90) -->
        this.app.get("/_/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
<!-- [8b] Serve frontend HTML (line 95) -->
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/_/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // this.app.get("/*/{*splat}", (req: Request, res: Response) => {
        //     /**
        //      * get infos from map file details
        //      */
        //     return this.displayFront(req, res, this.getFullUrl(req));
        // });
        // this.app.post("/*/{*splat}", (req: Request, res: Response) => {
        //     /**
        //      * get infos from map file details
        //      */
        //     return this.displayFront(req, res, this.getFullUrl(req));
        // });

        this.app.get("/@/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/@/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from admin else map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/~/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });
        this.app.post("/~/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get("/index.html", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect("/");
            return;
        });

        this.app.get("/static/images/favicons/manifest.json", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const query = validateQuery(
                req,
                res,
                z.object({
                    url: z.string(),
                })
            );
            if (query === undefined) {
                return;
            }
            return this.displayManifestJson(req, res, query.url);
        });

        this.app.get("/login", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/jwt", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        // @deprecated
        this.app.get("/register/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            return this.displayFront(req, res, this.getFullUrl(req));
        });

        this.app.get(
            "/.well-known/cf-custom-hostname-challenge/{*splat}",
            [notWaHost],
            async (req: Request, res: Response) => {
                debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
                try {
                    const response = await adminService.fetchWellKnownChallenge(req.hostname);
                    res.status(200).send(response);
                    return;
                } catch (e) {
                    Sentry.captureException(e);
                    console.error(e);
                    res.status(526).send("Fail on challenging hostname");
                    return;
                }
            }
        );

        this.app.get("/server.json", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.json({
                domain: process.env.PUSHER_URL,
                name: process.env.SERVER_NAME || "WorkAdventure Server",
                motd: process.env.SERVER_MOTD || "A WorkAdventure Server",
                icon: process.env.SERVER_ICON || process.env.PUSHER_URL + "/static/images/favicons/icon-512x512.png",
                version: version + (process.env.NODE_ENV !== "production" ? "-dev" : ""),
            });
            return;
        });

        this.app.get("/src/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });

        this.app.get("/node_modules/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });

        this.app.get("/@fs/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            res.status(303).redirect(`${VITE_URL}${decodeURI(req.path)}`);
        });
    }

    private async displayFront(req: Request, res: Response, url: string) {
        const builder = new MetaTagsBuilder(url);
        let html = this.indexFile;

        let redirectUrl: string | undefined;

        try {
            redirectUrl = await builder.getRedirectUrl();
        } catch (e) {
            console.info(`Cannot get redirect URL "%s"`, url, e);
        }

        if (redirectUrl) {
            const redirect = redirectUrl;
            res.redirect(redirect);
            return;
        }

        // Read the access_key from the query parameter. If it is set, redirect to the admin to attempt a login.
        const accessKey = req.query.access_key;
        if (accessKey && typeof accessKey === "string" && accessKey.length > 0) {
            if (!AUTOLOGIN_URL) {
                res.status(400).send("AUTOLOGIN_URL is not configured.");
                return;
            }
            const html = Mustache.render(this.redirectToAdminFile, {
                accessKey,
                AUTOLOGIN_URL,
            });
            res.set("Cache-Control", "no-cache").type("html").send(html);
            return;
        }

        // get auth token from post /authToken
        const { authToken } = req.body ?? {};

        try {
            const metaTagsData = await builder.getMeta(req.header("User-Agent"));
            const mapDetails = await builder.getMapDetails();
            let option = {};
            const secondaryPalette = getStringPalette(mapDetails?.primaryColor, "secondary");
            const contrastPalette = getStringPalette(mapDetails?.backgroundColor, "contrast");
            let cssVariablesOverride = "";
            if (secondaryPalette || contrastPalette) {
                cssVariablesOverride = wrapWithStyleTag(`${secondaryPalette}\n${contrastPalette}`);
            }
            if (req.query.logrocket === "true" && LOGROCKET_ID != undefined) {
                option = {
                    ...option,
                    /* TODO change it to push data from admin */
                    logRocketId: LOGROCKET_ID,
                    userId: uuid(),
                };
            }
<!-- [8c] Render HTML template (line 291) -->
            html = Mustache.render(this.indexFile, {
                ...metaTagsData,
                // TODO change it to push data from admin
                msApplicationTileImage: metaTagsData.favIcons[metaTagsData.favIcons.length - 1].src,
                url,
<!-- [8d] Inject environment script (line 296) -->
                script: await this.getScript(),
                authToken: authToken,
                googleDrivePickerClientId: GOOGLE_DRIVE_PICKER_CLIENT_ID,
                cssVariablesOverride,
                ...option,
            });
        } catch (e) {
            console.info(`Cannot render metatags on "%"`, url, e);
        }

        res.set("Cache-Control", "no-cache").type("html").send(html);
        return;
    }

    private async displayManifestJson(req: Request, res: Response, url: string) {
        const builder = new MetaTagsBuilder(url);

        const metaTagsData = await builder.getMeta(req.header("User-Agent"));

        const manifest = {
            short_name: metaTagsData.title,
            name: metaTagsData.title,
            icons: metaTagsData.manifestIcons,
            start_url: url.replace(`${req.protocol}://${req.hostname}`, ""),
            background_color: metaTagsData.themeColor,
            display_override: ["window-control-overlay", "minimal-ui"],
            display: "standalone",
            orientation: "portrait-primary",
            scope: "/",
            lang: "en",
            theme_color: metaTagsData.themeColor,
            shortcuts: [
                {
                    name: metaTagsData.title,
                    short_name: metaTagsData.title,
                    description: metaTagsData.description,
                    url: "/",
                    icons: [
                        {
                            src: "/static/images/favicons/android-icon-192x192.png",
                            sizes: "192x192",
                            type: "image/png",
                        },
                    ],
                },
            ],
            description: metaTagsData.description,
            screenshots: [],
            related_applications: [
                {
                    platform: "web",
                    url: "https://workadventu.re",
                },
                {
                    platform: "play",
                    url: "https://play.workadventu.re",
                },
            ],
        };

        res.contentType("application/manifest+json").json(manifest);
        return;
    }
}

</file>
<file path="IoSocketController.ts">
import { z } from "zod";
import type { AnswerMessage, CompanionDetail, ErrorApiData, SubMessage, WokaDetail } from "@workadventure/messages";
import {
    apiVersionHash,
    ClientToServerMessage,
    noUndefined,
    ServerToClientMessage as ServerToClientMessageTsProto,
    ServerToClientMessage,
} from "@workadventure/messages";
import { JsonWebTokenError } from "jsonwebtoken";
import * as Sentry from "@sentry/node";
import type { TemplatedApp, WebSocket } from "uWebSockets.js";
import { asError } from "catch-unknown";
import Debug from "debug";
import { AxiosError } from "axios";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { FetchMemberDataByUuidResponse } from "../services/AdminApi";
import type { AdminSocketTokenData } from "../services/JWTTokenManager";
import { jwtTokenManager, tokenInvalidException } from "../services/JWTTokenManager";
import type { Socket, SocketUpgradeFailed } from "../services/SocketManager";
import { socketManager } from "../services/SocketManager";
import { ADMIN_SOCKETS_TOKEN, DISABLE_ANONYMOUS, SOCKET_IDLE_TIMER } from "../enums/EnvironmentVariable";
import type { AdminSocketData } from "../models/Websocket/AdminSocketData";
import type { AdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { isAdminMessageInterface } from "../models/Websocket/Admin/AdminMessages";
import { adminService } from "../services/AdminService";
import { validateWebsocketQuery } from "../services/QueryValidator";
import type { SocketData, SpaceName } from "../models/Websocket/SocketData";
import { emitInBatch } from "../services/IoSocketHelpers";
import { ClientAbortError } from "../models/ClientAbortError";

const debug = Debug("pusher:requests");

type UpgradeFailedInvalidData = {
    rejected: true;
    reason: "tokenInvalid" | "invalidVersion" | null;
    message: string;
    roomId: string;
};

type UpgradeFailedErrorData = {
    rejected: true;
    reason: "error";
    error: ErrorApiData;
};

type UpgradeFailedInvalidTexture = {
    rejected: true;
    reason: "invalidTexture";
    entityType: "character" | "companion";
};

export type UpgradeFailedData = UpgradeFailedErrorData | UpgradeFailedInvalidData | UpgradeFailedInvalidTexture;

export class IoSocketController {
    constructor(private readonly app: TemplatedApp) {
        // Global handler for unhandled Promises
        // The listener never needs to be removed, because we are in a singleton that is never destroyed.
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Rejection at:", promise, "reason:", reason);
            Sentry.captureException(reason);
        });

<!-- [6b] Setup main WebSocket route (line 65) -->
        this.ioConnection();
        if (ADMIN_SOCKETS_TOKEN) {
            this.adminRoomSocket();
        }
    }

    adminRoomSocket(): void {
        this.app.ws<AdminSocketData>("/ws/admin/rooms", {
            upgrade: (res, req, context) => {
                const websocketKey = req.getHeader("sec-websocket-key");
                const websocketProtocol = req.getHeader("sec-websocket-protocol");
                const websocketExtensions = req.getHeader("sec-websocket-extensions");

                res.upgrade<AdminSocketData>(
                    {
                        adminConnections: new Map(),
                        disconnecting: false,
                    },
                    websocketKey,
                    websocketProtocol,
                    websocketExtensions,
                    context
                );
            },
            open: (ws) => {
                console.info(
                    "Admin socket connect to client on " + Buffer.from(ws.getRemoteAddressAsText()).toString()
                );
                ws.getUserData().disconnecting = false;
            },
            message: (ws, arrayBuffer): void => {
                try {
                    const message: AdminMessageInterface = JSON.parse(
                        new TextDecoder("utf-8").decode(new Uint8Array(arrayBuffer))
                    );

                    try {
                        isAdminMessageInterface.parse(message);
                    } catch (err) {
                        if (err instanceof z.ZodError) {
                            console.error(err.issues);
                            Sentry.captureException(err.issues);
                        }
                        Sentry.captureException(`Invalid message received. ${JSON.stringify(message)}`);
                        console.error("Invalid message received.", message);
                        ws.send(
                            JSON.stringify({
                                type: "Error",
                                data: {
                                    message: "Invalid message received! The connection has been closed.",
                                },
                            })
                        );
                        ws.end(1007, "Invalid message received!");
                        return;
                    }

                    const token = message.jwt;

                    let data: AdminSocketTokenData;

                    try {
                        data = jwtTokenManager.verifyAdminSocketToken(token);
                    } catch (e) {
                        console.error("Admin socket access refused for token: " + token, e);
                        ws.send(
                            JSON.stringify({
                                type: "Error",
                                data: {
                                    message: "Admin socket access refused! The connection has been closed.",
                                },
                            })
                        );
                        ws.end(1008, "Access refused");
                        return;
                    }

                    const authorizedRoomIds = data.authorizedRoomIds;

                    if (message.event === "listen") {
                        const notAuthorizedRoom = message.roomIds.filter(
                            (roomId) => !authorizedRoomIds.includes(roomId)
                        );

                        if (notAuthorizedRoom.length > 0) {
                            const errorMessage = `Admin socket refused for client on ${Buffer.from(
                                ws.getRemoteAddressAsText()
                            ).toString()} listening of : \n${JSON.stringify(notAuthorizedRoom)}`;
                            Sentry.captureException(errorMessage);
                            console.error(errorMessage);
                            ws.send(
                                JSON.stringify({
                                    type: "Error",
                                    data: {
                                        message: errorMessage,
                                    },
                                })
                            );
                            ws.end(1008, "Access refused");
                            return;
                        }

                        for (const roomId of message.roomIds) {
                            socketManager.handleAdminRoom(ws, roomId).catch((e) => {
                                console.error(e);
                                Sentry.captureException(e);
                            });
                        }
                    } else if (message.event === "user-message") {
                        const messageToEmit = message.message;
                        // Get roomIds of the world where we want broadcast the message
                        const roomIds = authorizedRoomIds.filter(
                            (authorizeRoomId) => authorizeRoomId.split("/")[5] === message.world
                        );

                        for (const roomId of roomIds) {
                            if (messageToEmit.type === "banned") {
                                socketManager
                                    .emitBan(messageToEmit.userUuid, messageToEmit.message, messageToEmit.type, roomId)
                                    .catch((error) => {
                                        Sentry.captureException(error);
                                        console.error(error);
                                    });
                            } else if (messageToEmit.type === "ban") {
                                socketManager
                                    .emitSendUserMessage(
                                        messageToEmit.userUuid,
                                        messageToEmit.message,
                                        messageToEmit.type,
                                        roomId
                                    )
                                    .catch((error) => {
                                        Sentry.captureException(error);
                                        console.error(error);
                                    });
                            }
                        }
                    }
                } catch (err) {
                    Sentry.captureException(err);
                    console.error(err);
                }
            },
            close: (ws) => {
                try {
                    ws.getUserData().disconnecting = true;
                    socketManager.leaveAdminRoom(ws);
                } catch (e) {
                    Sentry.captureException(`An error occurred on admin "disconnect" ${e}`);
                    console.error(`An error occurred on admin "disconnect" ${e}`);
                }
            },
        });
    }

    ioConnection(): void {
        this.app.ws<SocketData | UpgradeFailedData>("/ws/room", {
            /* Options */
            //compression: uWS.SHARED_COMPRESSOR,
            idleTimeout: SOCKET_IDLE_TIMER,
            maxPayloadLength: 16 * 1024 * 1024,
            maxBackpressure: 65536, // Maximum 64kB of data in the buffer.
            upgrade: (res, req, context) => {
                (async () => {
                    /* Keep track of abortions */
                    const upgradeAborted = { aborted: false };

                    res.onAborted(() => {
                        /* We can simply signal that we were aborted */
                        upgradeAborted.aborted = true;
                    });

                    const query = validateWebsocketQuery(
                        req,
                        res,
                        context,
                        z.object({
                            roomId: z.string(),
                            name: z.string(),
                            characterTextureIds: z.union([z.string(), z.string().array()]).optional(),
                            x: z.coerce.number(),
                            y: z.coerce.number(),
                            top: z.coerce.number(),
                            bottom: z.coerce.number(),
                            left: z.coerce.number(),
                            right: z.coerce.number(),
                            companionTextureId: z.string().optional(),
                            availabilityStatus: z.coerce.number(),
                            lastCommandId: z.string().optional(),
                            version: z.string(),
                            chatID: z.string(),
                            roomName: z.string(),
                            cameraState: z.string().transform((val) => val === "true"),
                            microphoneState: z.string().transform((val) => val === "true"),
                        })
                    );

                    if (query === undefined) {
                        return;
                    }

                    debug(
                        `FrontController => [${req.getMethod()}] ${req.getUrl()} — IP: ${req.getHeader(
                            "x-forwarded-for"
                        )} — Time: ${Date.now()}`
                    );

                    const websocketKey = req.getHeader("sec-websocket-key");
                    const websocketProtocol = req.getHeader("sec-websocket-protocol");
                    // We abuse the protocol header to pass the JWT token (to avoid sending it in the query string)
                    const token = websocketProtocol;
                    const websocketExtensions = req.getHeader("sec-websocket-extensions");
                    const ipAddress = req.getHeader("x-forwarded-for");
                    const locale = req.getHeader("accept-language");

                    const {
                        roomId,
                        x,
                        y,
                        top,
                        bottom,
                        left,
                        right,
                        name,
                        availabilityStatus,
                        lastCommandId,
                        version,
                        companionTextureId,
                        roomName,
                        cameraState,
                        microphoneState,
                    } = query;

                    const chatID = query.chatID ? query.chatID : undefined;

                    try {
                        if (version !== apiVersionHash) {
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            return res.upgrade(
                                {
                                    rejected: true,
                                    reason: "error",
                                    error: {
                                        status: "error",
                                        type: "retry",
                                        title: "Please refresh",
                                        subtitle: "New version available",
                                        image: "/resources/icons/new_version.png",
                                        imageLogo: "/static/images/logo.png",
                                        code: "NEW_VERSION",
                                        details:
                                            "A new version of WorkAdventure is available. Please refresh your window",
                                        canRetryManual: true,
                                        buttonTitle: "Refresh",
                                        timeToRetry: 999999,
                                    },
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }

                        const characterTextureIds: string[] =
                            query.characterTextureIds === undefined
                                ? []
                                : typeof query.characterTextureIds === "string"
                                ? [query.characterTextureIds]
                                : query.characterTextureIds;

                        const tokenData = token ? jwtTokenManager.verifyJWTToken(token) : null;

                        if (DISABLE_ANONYMOUS && !tokenData) {
                            throw new Error("Expecting token");
                        }

                        const userIdentifier = tokenData ? tokenData.identifier : "";
                        const isLogged = !!tokenData?.accessToken;

                        let memberTags: string[] = [];
                        let memberVisitCardUrl: string | null = null;
                        let memberUserRoomToken: string | undefined;
                        let userData: FetchMemberDataByUuidResponse = {
                            status: "ok",
                            email: userIdentifier,
                            userUuid: userIdentifier,
                            tags: tokenData?.tags ?? [],
                            visitCardUrl: null,
                            isCharacterTexturesValid: true,
                            characterTextures: [],
                            isCompanionTextureValid: true,
                            companionTexture: undefined,
                            messages: [],
                            userRoomToken: undefined,
                            activatedInviteUser: true,
                            canEdit: false,
                            world: "",
                            chatID,
                        };

                        let characterTextures: WokaDetail[];
                        let companionTexture: CompanionDetail | undefined;

                        try {
                            try {
                                userData = await adminService.fetchMemberDataByUuid(
                                    userIdentifier,
                                    tokenData?.accessToken,
                                    roomId,
                                    ipAddress,
                                    characterTextureIds,
                                    companionTextureId,
                                    locale,
                                    userData.tags,
                                    chatID
                                );

                                if (userData.status === "ok" && !userData.isCharacterTexturesValid) {
                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "invalidTexture",
                                            entityType: "character",
                                        } satisfies UpgradeFailedInvalidTexture,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }
                                if (userData.status === "ok" && !userData.isCompanionTextureValid) {
                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "invalidTexture",
                                            entityType: "companion",
                                        } satisfies UpgradeFailedInvalidTexture,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }

                                if (userData.status !== "ok") {
                                    if (upgradeAborted.aborted) {
                                        // If the response points to nowhere, don't attempt an upgrade
                                        return;
                                    }

                                    return res.upgrade(
                                        {
                                            rejected: true,
                                            reason: "error",
                                            error: userData,
                                        } satisfies UpgradeFailedData,
                                        websocketKey,
                                        websocketProtocol,
                                        websocketExtensions,
                                        context
                                    );
                                }
                            } catch (err) {
                                if (upgradeAborted.aborted) {
                                    // If the response points to nowhere, don't attempt an upgrade
                                    return;
                                }
                                throw err;
                            }
                            memberTags = userData.tags;
                            memberVisitCardUrl = userData.visitCardUrl;
                            characterTextures = userData.characterTextures;
                            companionTexture = userData.companionTexture ?? undefined;
                            memberUserRoomToken = userData.userRoomToken;
                        } catch (e) {
                            console.info(
                                "access not granted for user " + (userIdentifier || "anonymous") + " and room " + roomId
                            );
                            Sentry.captureException(e);
                            console.error(e);
                            throw new Error("User cannot access this world", { cause: e });
                        }

                        if (upgradeAborted.aborted) {
                            console.info("Ouch! Client disconnected before we could upgrade it!");
                            /* You must not upgrade now */
                            return;
                        }

                        const socketData: SocketData = {
                            rejected: false,
                            disconnecting: false,
                            token: token && typeof token === "string" ? token : "",
                            roomId,
                            userId: undefined,
                            userUuid: userData.userUuid,
                            isLogged,
                            ipAddress,
                            name,
                            characterTextures,
                            companionTexture,
                            position: {
                                x: x,
                                y: y,
                                direction: "down",
                                moving: false,
                            },
                            viewport: {
                                top,
                                right,
                                bottom,
                                left,
                            },
                            availabilityStatus,
                            lastCommandId,
                            messages: [],
                            tags: memberTags,
                            visitCardUrl: memberVisitCardUrl,
                            userRoomToken: memberUserRoomToken,
                            activatedInviteUser: userData.activatedInviteUser ?? undefined,
                            applications: userData.applications,
                            canEdit: userData.canEdit ?? false,
                            spaceUserId: "",
                            emitInBatch: (payload: SubMessage): void => {},
                            batchedMessages: {
                                event: "",
                                payload: [],
                            },
                            batchTimeout: null,
                            backConnection: undefined,
                            listenedZones: new Set<string>(),
                            pusherRoom: undefined,
                            spaces: new Set<SpaceName>(),
                            joinSpacesPromise: new Map<SpaceName, Promise<void>>(),
                            chatID,
                            world: userData.world,
                            currentChatRoomArea: [],
                            roomName,
                            microphoneState,
                            cameraState,
                            queryAbortControllers: new Map<number, AbortController>(),
                            keepAliveInterval: undefined,
                        };

                        /* This immediately calls open handler, you must not use res after this call */
                        res.upgrade<SocketData>(
                            socketData,
                            /* Spell these correctly */
                            websocketKey,
                            websocketProtocol,
                            websocketExtensions,
                            context
                        );
                    } catch (e) {
                        if (e instanceof Error) {
                            if (!(e instanceof JsonWebTokenError)) {
                                Sentry.captureException(e);
                                console.error(e);
                            }
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: e instanceof JsonWebTokenError ? tokenInvalidException : null,
                                    message: e.message,
                                    roomId,
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        } else {
                            if (upgradeAborted.aborted) {
                                // If the response points to nowhere, don't attempt an upgrade
                                return;
                            }
                            res.upgrade(
                                {
                                    rejected: true,
                                    reason: null,
                                    message: "500 Internal Server Error",
                                    roomId,
                                } satisfies UpgradeFailedData,
                                websocketKey,
                                websocketProtocol,
                                websocketExtensions,
                                context
                            );
                        }
                    }
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            },
            /* Handlers */
            open: (ws) => {
                (async () => {
                    const socketData = ws.getUserData();
                    debug("WebSocket connection established");
                    if (socketData.rejected === true) {
                        const socket = ws as SocketUpgradeFailed;
                        // If there is a room in the error, let's check if we need to clean it.
                        if ("roomId" in socketData) {
                            socketManager.deleteRoomIfEmptyFromId(socketData.roomId);
                        }

                        if (socketData.reason === tokenInvalidException) {
                            socketManager.emitTokenExpiredMessage(socket);
                        } else if (socketData.reason === "error") {
                            socketManager.emitErrorScreenMessage(socket, socketData.error);
                        } else if (socketData.reason === "invalidTexture") {
                            if (socketData.entityType === "character") {
                                socketManager.emitInvalidCharacterTextureMessage(socket);
                            } else {
                                socketManager.emitInvalidCompanionTextureMessage(socket);
                            }
                        } else {
                            socketManager.emitConnectionErrorMessage(socket, socketData.message.toString());
                        }
                        ws.end(1000, "Error message sent");
                        return;
                    }

                    // Mandatory for typing hint
                    const socket = ws as Socket;

                    socketData.emitInBatch = (payload: SubMessage): void => {
                        emitInBatch(socket, payload);
                    };

                    await socketManager.handleJoinRoom(socket);

                    //get data information and show messages
                    if (socketData.messages && Array.isArray(socketData.messages)) {
                        socketData.messages.forEach((c: unknown) => {
                            const messageToSend = z.object({ type: z.string(), message: z.string() }).parse(c);
                            const bytes = ServerToClientMessageTsProto.encode({
                                message: {
                                    $case: "sendUserMessage",
                                    sendUserMessage: {
                                        type: messageToSend.type,
                                        message: messageToSend.message,
                                    },
                                },
                            }).finish();
                            if (!socketData.disconnecting) {
                                socket.send(bytes, true);
                            }
                        });
                    }

                    // Let's send a ping to keep the connection alive. Note: there is ANOTHER ping/pong mechanism
                    // at the application level, between the front and the back. This other mechanism is in charge
                    // of shutting down the connection when idle. However, because of limitations in the browser
                    // (heavy throttling of setTimeout when tab is in background), that mechanism cannot manage
                    // ping delays lower than 1 minute.
                    // Because there are proxies and load balancers on the path that might cut the connection if
                    // idle for more than ~30 seconds, we need this additional ping/pong mechanism here at the
                    // pusher WebSocket level.

                    socketData.keepAliveInterval = setInterval(() => {
                        if (!socketData.disconnecting) {
                            socket.ping();
                        }
                    }, 25000); // Every 25 seconds

                    // Performance test
                    /*
                    const positionMessage = new PositionMessage();
                    positionMessage.setMoving(true);
                    positionMessage.setX(300);
                    positionMessage.setY(300);
                    positionMessage.setDirection(PositionMessage.Direction.DOWN);

                    const userMovedMessage = new UserMovedMessage();
                    userMovedMessage.setUserid(1);
                    userMovedMessage.setPosition(positionMessage);

                    const subMessage = new SubMessage();
                    subMessage.setUsermovedmessage(userMovedMessage);

                    const startTimestamp2 = Date.now();
                    for (let i = 0; i < 100000; i++) {
                        const batchMessage = new BatchMessage();
                        batchMessage.setEvent("");
                        batchMessage.setPayloadList([
                            subMessage
                        ]);

                        const serverToClientMessage = new ServerToClientMessage();
                        serverToClientMessage.setBatchmessage(batchMessage);

                        client.send(serverToClientMessage.serializeBinary().buffer, true);
                    }
                    const endTimestamp2 = Date.now();

                    const startTimestamp = Date.now();
                    for (let i = 0; i < 100000; i++) {
                        // Let's do a performance test!
                        const bytes = ServerToClientMessageTsProto.encode({
                            message: {
                                $case: "batchMessage",
                                batchMessage: {
                                    event: '',
                                    payload: [
                                        {
                                            message: {
                                                $case: "userMovedMessage",
                                                userMovedMessage: {
                                                    userId: 1,
                                                    position: {
                                                        moving: true,
                                                        x: 300,
                                                        y: 300,
                                                        direction: PositionMessage_Direction.DOWN,
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }).finish();

                        client.send(bytes);
                    }
                    const endTimestamp = Date.now();
                    */
                })().catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            },
            message: (ws, arrayBuffer): void => {
                const socket = ws as Socket;
                Sentry.withIsolationScope(() => {
                    Sentry.setTag("userUuid", socket.getUserData().userUuid);
                    Sentry.setTag("roomId", socket.getUserData().roomId);
                    Sentry.setTag("world", socket.getUserData().world);
                    (async () => {
                        const message = ClientToServerMessage.decode(new Uint8Array(arrayBuffer));
                        if (!message.message) {
                            console.warn("Empty message received.");
                            return;
                        }

                        switch (message.message.$case) {
                            case "viewportMessage": {
                                socketManager.handleViewport(socket, message.message.viewportMessage);
                                break;
                            }
                            case "userMovesMessage": {
                                socketManager.handleUserMovesMessage(socket, message.message.userMovesMessage);
                                break;
                            }
                            case "playGlobalMessage": {
                                await socketManager.emitPlayGlobalMessage(socket, message.message.playGlobalMessage);
                                break;
                            }
                            case "reportPlayerMessage": {
                                await socketManager.handleReportMessage(socket, message.message.reportPlayerMessage);
                                break;
                            }
                            case "addSpaceFilterMessage": {
                                if (message.message.addSpaceFilterMessage.spaceFilterMessage !== undefined)
                                    message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName = `${
                                        socket.getUserData().world
                                    }.${message.message.addSpaceFilterMessage.spaceFilterMessage.spaceName}`;
                                await socketManager.handleAddSpaceFilterMessage(
                                    socket,
                                    noUndefined(message.message.addSpaceFilterMessage)
                                );
                                break;
                            }
                            case "removeSpaceFilterMessage": {
                                if (message.message.removeSpaceFilterMessage.spaceFilterMessage !== undefined)
                                    message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName = `${
                                        socket.getUserData().world
                                    }.${message.message.removeSpaceFilterMessage.spaceFilterMessage.spaceName}`;
                                socketManager.handleRemoveSpaceFilterMessage(
                                    socket,
                                    noUndefined(message.message.removeSpaceFilterMessage)
                                );
                                break;
                            }
                            case "setPlayerDetailsMessage": {
                                await socketManager.handleSetPlayerDetails(
                                    socket,
                                    message.message.setPlayerDetailsMessage
                                );
                                break;
                            }

                            case "updateSpaceMetadataMessage": {
                                const isMetadata = z
                                    .record(z.string(), z.unknown())
                                    .safeParse(JSON.parse(message.message.updateSpaceMetadataMessage.metadata));
                                if (!isMetadata.success) {
                                    Sentry.captureException(
                                        `Invalid metadata received. ${message.message.updateSpaceMetadataMessage.metadata}`
                                    );
                                    console.error(
                                        "Invalid metadata received.",
                                        message.message.updateSpaceMetadataMessage.metadata
                                    );
                                    return;
                                }

                                message.message.updateSpaceMetadataMessage.spaceName = `${socket.getUserData().world}.${
                                    message.message.updateSpaceMetadataMessage.spaceName
                                }`;

                                socketManager.handleUpdateSpaceMetadata(
                                    socket,
                                    message.message.updateSpaceMetadataMessage.spaceName,
                                    isMetadata.data
                                );
                                break;
                            }
                            case "updateSpaceUserMessage": {
                                message.message.updateSpaceUserMessage.spaceName = `${socket.getUserData().world}.${
                                    message.message.updateSpaceUserMessage.spaceName
                                }`;

                                await socketManager.handleUpdateSpaceUser(
                                    socket,
                                    message.message.updateSpaceUserMessage
                                );
                                break;
                            }
                            case "updateChatIdMessage": {
                                await socketManager.handleUpdateChatId(
                                    socket,
                                    message.message.updateChatIdMessage.email,
                                    message.message.updateChatIdMessage.chatId
                                );
                                break;
                            }
                            case "leaveChatRoomAreaMessage": {
                                await socketManager.handleLeaveChatRoomArea(
                                    socket,
                                    message.message.leaveChatRoomAreaMessage.roomID
                                );
                                break;
                            }
                            case "queryMessage": {
                                try {
                                    const answerMessage: AnswerMessage = {
                                        id: message.message.queryMessage.id,
                                    };
                                    const abortController = new AbortController();
                                    socket
                                        .getUserData()
                                        .queryAbortControllers.set(message.message.queryMessage.id, abortController);
                                    switch (message.message.queryMessage.query?.$case) {
                                        case "roomTagsQuery": {
                                            await socketManager.handleRoomTagsQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "embeddableWebsiteQuery": {
                                            await socketManager.handleEmbeddableWebsiteQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "roomsFromSameWorldQuery": {
                                            await socketManager.handleRoomsFromSameWorldQuery(
                                                socket,
                                                message.message.queryMessage
                                            );
                                            break;
                                        }
                                        case "searchMemberQuery": {
                                            const searchMemberAnswer = await socketManager.handleSearchMemberQuery(
                                                socket,
                                                message.message.queryMessage.query.searchMemberQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "searchMemberAnswer",
                                                searchMemberAnswer: searchMemberAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "chatMembersQuery": {
                                            const chatMembersAnswer = await socketManager.handleChatMembersQuery(
                                                socket,
                                                message.message.queryMessage.query.chatMembersQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "chatMembersAnswer",
                                                chatMembersAnswer: chatMembersAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "searchTagsQuery": {
                                            const searchTagsAnswer = await socketManager.handleSearchTagsQuery(
                                                socket,
                                                message.message.queryMessage.query.searchTagsQuery
                                            );
                                            answerMessage.answer = {
                                                $case: "searchTagsAnswer",
                                                searchTagsAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "iceServersQuery": {
                                            const iceServersAnswer = await socketManager.handleIceServersQuery(socket);
                                            answerMessage.answer = {
                                                $case: "iceServersAnswer",
                                                iceServersAnswer,
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "getMemberQuery": {
                                            const getMemberAnswer = await socketManager.handleGetMemberQuery(
                                                message.message.queryMessage.query.getMemberQuery
                                            );
                                            if (!getMemberAnswer) {
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message: "User not found, probably left",
                                                    },
                                                };
                                            } else {
                                                answerMessage.answer = {
                                                    $case: "getMemberAnswer",
                                                    getMemberAnswer,
                                                };
                                            }
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "enterChatRoomAreaQuery": {
                                            try {
                                                await socketManager.handleEnterChatRoomAreaQuery(
                                                    socket,
                                                    message.message.queryMessage.query.enterChatRoomAreaQuery.roomID
                                                );
                                                answerMessage.answer = {
                                                    $case: "enterChatRoomAreaAnswer",
                                                    enterChatRoomAreaAnswer: {},
                                                };
                                            } catch (e) {
                                                console.warn("Error entering chat room area", e);
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message: "Error entering chat room area, try again later 🙏",
                                                    },
                                                };
                                            }
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "oauthRefreshTokenQuery": {
                                            try {
                                                answerMessage.answer = {
                                                    $case: "oauthRefreshTokenAnswer",
                                                    oauthRefreshTokenAnswer:
                                                        await socketManager.handleOauthRefreshTokenQuery(
                                                            message.message.queryMessage.query.oauthRefreshTokenQuery
                                                        ),
                                                };
                                                this.sendAnswerMessage(socket, answerMessage);
                                            } catch (error) {
                                                // The refresh token error could be arrived by anything, so let's just log it and send a generic error to the user.
                                                if (error instanceof AxiosError)
                                                    console.warn(
                                                        `Token refresh failed for access token: ${error.request?.data} with response => `,
                                                        error.request?.data,
                                                        error.response?.status,
                                                        error.response?.data
                                                    );
                                                const answerMessage: AnswerMessage = {
                                                    id: message.message.queryMessage.id,
                                                };
                                                answerMessage.answer = {
                                                    $case: "error",
                                                    error: {
                                                        message:
                                                            "The token refresh failed. Please try to login again to be connected 🙏",
                                                    },
                                                };
                                                this.sendAnswerMessage(socket, answerMessage);
                                            }
                                            break;
                                        }
                                        case "joinSpaceQuery": {
                                            const localSpaceName =
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName;
                                            message.message.queryMessage.query.joinSpaceQuery.spaceName = `${
                                                socket.getUserData().world
                                            }.${message.message.queryMessage.query.joinSpaceQuery.spaceName}`;
                                            await socketManager.handleJoinSpace(
                                                socket,
                                                message.message.queryMessage.query.joinSpaceQuery.spaceName,
                                                localSpaceName,
                                                message.message.queryMessage.query.joinSpaceQuery.filterType,
                                                message.message.queryMessage.query.joinSpaceQuery.propertiesToSync,
                                                {
                                                    signal: abortController.signal,
                                                }
                                            );

                                            answerMessage.answer = {
                                                $case: "joinSpaceAnswer",
                                                joinSpaceAnswer: {
                                                    spaceUserId: socket.getUserData().spaceUserId,
                                                },
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);

                                            break;
                                        }
                                        case "leaveSpaceQuery": {
                                            message.message.queryMessage.query.leaveSpaceQuery.spaceName = `${
                                                socket.getUserData().world
                                            }.${message.message.queryMessage.query.leaveSpaceQuery.spaceName}`;
                                            await socketManager.handleLeaveSpace(
                                                socket,
                                                message.message.queryMessage.query.leaveSpaceQuery.spaceName
                                            );

                                            answerMessage.answer = {
                                                $case: "leaveSpaceAnswer",
                                                leaveSpaceAnswer: {},
                                            };

                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        case "mapStorageJwtQuery": {
                                            answerMessage.answer = {
                                                $case: "mapStorageJwtAnswer",
                                                mapStorageJwtAnswer: {
                                                    jwt: await socketManager.handleMapStorageJwtQuery(socket),
                                                },
                                            };
                                            this.sendAnswerMessage(socket, answerMessage);
                                            break;
                                        }
                                        default: {
                                            socket
                                                .getUserData()
                                                .queryAbortControllers.delete(message.message.queryMessage.id);
                                            socketManager.forwardMessageToBack(socket, message.message);
                                        }
                                    }
                                } catch (error) {
                                    const err = asError(error);
                                    // If the error is due to an abort, don't log it as an error
                                    if (!(err instanceof AbortError)) {
                                        console.error("Error handling query message: ", error);
                                        Sentry.captureException(err);
                                    }
                                    const answerMessage: AnswerMessage = {
                                        id: message.message.queryMessage.id,
                                    };
                                    answerMessage.answer = {
                                        $case: "error",
                                        error: {
                                            message: err.message,
                                        },
                                    };
                                    this.sendAnswerMessage(socket, answerMessage);
                                    socket.getUserData().queryAbortControllers.delete(message.message.queryMessage.id);
                                }
                                break;
                            }
                            case "abortQueryMessage": {
                                const abortController = socket
                                    .getUserData()
                                    .queryAbortControllers.get(message.message.abortQueryMessage.id);
                                if (abortController) {
                                    debug(`Aborting query with id ${message.message.abortQueryMessage.id} locally`);
                                    abortController.abort(new ClientAbortError());
                                } else {
                                    debug(
                                        `Forwarding abort query with id ${message.message.abortQueryMessage.id} to back`
                                    );
                                    // If no abort controller found, it means the query has already been treated or has been forwarded to the back.
                                    // Let's forward the abort message to the back anyway, just in case.
                                    socketManager.forwardMessageToBack(socket, message.message);
                                }
                                break;
                            }
                            case "itemEventMessage":
                            case "variableMessage":
                            case "emotePromptMessage":
                            case "followRequestMessage":
                            case "followConfirmationMessage":
                            case "followAbortMessage":
                            case "lockGroupPromptMessage":
                            case "pingMessage":
                            case "askPositionMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
                            case "editMapCommandMessage": {
                                socketManager.forwardMessageToBack(socket, message.message);
                                break;
                            }
                            // case "muteParticipantIdMessage": {
                            //     message.message.muteParticipantIdMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.muteParticipantIdMessage.spaceName
                            //     }`;
                            //     socketManager.handleMuteParticipantIdMessage(
                            //         socket,
                            //         message.message.muteParticipantIdMessage.spaceName,
                            //         message.message.muteParticipantIdMessage.mutedUserUuid,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteVideoParticipantIdMessage": {
                            //     message.message.muteVideoParticipantIdMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.muteVideoParticipantIdMessage.spaceName
                            //     }`;
                            //
                            //     socketManager.handleMuteVideoParticipantIdMessage(
                            //         socket,
                            //         message.message.muteVideoParticipantIdMessage.spaceName,
                            //         message.message.muteVideoParticipantIdMessage.mutedUserUuid,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "kickOffUserMessage": {
                            //     message.message.kickOffUserMessage.spaceName = `${socket.getUserData().world}.${
                            //         message.message.kickOffUserMessage.spaceName
                            //     }`;
                            //     socketManager.handleKickOffSpaceUserMessage(
                            //         socket,
                            //         message.message.kickOffUserMessage.spaceName,
                            //         message.message.kickOffUserMessage.userId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteEveryBodyParticipantMessage": {
                            //     message.message.muteEveryBodyParticipantMessage.spaceName = `${
                            //         socket.getUserData().world
                            //     }.${message.message.muteEveryBodyParticipantMessage.spaceName}`;
                            //     socketManager.handleMuteEveryBodyParticipantMessage(
                            //         socket,
                            //         message.message.muteEveryBodyParticipantMessage.spaceName,
                            //         message.message.muteEveryBodyParticipantMessage.senderUserId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            // case "muteVideoEveryBodyParticipantMessage": {
                            //     message.message.muteVideoEveryBodyParticipantMessage.spaceName = `${
                            //         socket.getUserData().world
                            //     }.${message.message.muteVideoEveryBodyParticipantMessage.spaceName}`;
                            //     socketManager.handleMuteVideoEveryBodyParticipantMessage(
                            //         socket,
                            //         message.message.muteVideoEveryBodyParticipantMessage.spaceName,
                            //         message.message.muteVideoEveryBodyParticipantMessage.userId,
                            //         message.message
                            //     );
                            //     break;
                            // }
                            case "banPlayerMessage": {
                                await socketManager.handleBanPlayerMessage(socket, message.message.banPlayerMessage);
                                break;
                            }

                            case "publicEvent": {
                                message.message.publicEvent.spaceName = `${socket.getUserData().world}.${
                                    message.message.publicEvent.spaceName
                                }`;
                                await socketManager.handlePublicEvent(socket, message.message.publicEvent);
                                break;
                            }
                            case "privateEvent": {
                                message.message.privateEvent.spaceName = `${socket.getUserData().world}.${
                                    message.message.privateEvent.spaceName
                                }`;
                                await socketManager.handlePrivateEvent(socket, message.message.privateEvent);
                                break;
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }

                        /* Ok is false if backpressure was built up, wait for drain */
                        //let ok = ws.send(message, isBinary);
                    })().catch((e) => {
                        // If the error is due to an abort triggered by the client, don't log it as an error and don't send an error message back.
                        if (e instanceof ClientAbortError) {
                            return;
                        }

                        Sentry.captureException(e);
                        console.error("An error occurred while processing a message: ", e);

                        try {
                            if (!socket.getUserData().disconnecting) {
                                socket.send(
                                    ServerToClientMessage.encode({
                                        message: {
                                            $case: "errorMessage",
                                            errorMessage: {
                                                message: "An error occurred in pusher: " + asError(e).message,
                                            },
                                        },
                                    }).finish(),
                                    true
                                );
                            }
                        } catch (error) {
                            Sentry.captureException(error);
                            console.error(error);
                        }
                    });
                });
            },
            drain: (ws) => {
                console.info("WebSocket backpressure: " + ws.getBufferedAmount());
            },
            close: (ws) => {
                const socketData = ws.getUserData();

                if (socketData.rejected === true) {
                    return;
                }

                const socket = ws as Socket;
                socketManager.cleanupSocket(socket);
            },
        });
    }

    private sendAnswerMessage(socket: WebSocket<SocketData>, answerMessage: AnswerMessage) {
        if (socket.getUserData().disconnecting) {
            return;
        }
        // We don't delete the abort controller right away because between the moment where we send the answer
        // and the moment where it is received by the client, the client could send an abort message.
        // So we wait a few seconds before deleting it.
        setTimeout(() => {
            socket.getUserData().queryAbortControllers.delete(answerMessage.id);
        }, 5000);
        socket.send(
            ServerToClientMessage.encode({
                message: {
                    $case: "answerMessage",
                    answerMessage,
                },
            }).finish(),
            true
        );
    }
}

</file>
<file path="RoomConnection.ts">
import axios from "axios";
import Debug from "debug";
import * as Sentry from "@sentry/svelte";

import type { AreaData, AtLeast, EntityDimensions, WAMEntityData } from "@workadventure/map-editor";
import type {
    AddSpaceFilterMessage,
    AnswerMessage,
    ApplicationMessage,
    AvailabilityStatus,
    CharacterTextureMessage,
    ChatMembersAnswer,
    CompanionTextureMessage,
    DeleteCustomEntityMessage,
    EditMapCommandMessage,
    EmbeddableWebsiteAnswer,
    EmoteEventMessage as EmoteEventMessageTsProto,
    ErrorMessage as ErrorMessageTsProto,
    ErrorScreenMessage as ErrorScreenMessageTsProto,
    FollowAbortMessage,
    FollowConfirmationMessage,
    FollowRequestMessage,
    GroupDeleteMessage as GroupDeleteMessageTsProto,
    GroupUpdateMessage as GroupUpdateMessageTsProto,
    JitsiJwtAnswer,
    JoinBBBMeetingAnswer,
    MegaphoneSettings,
    Member,
    ModifiyWAMMetadataMessage,
    ModifyCustomEntityMessage,
    MoveToPositionMessage as MoveToPositionMessageProto,
    LocatePositionMessage as LocatePositionMessageProto,
    PlayerDetailsUpdatedMessage as PlayerDetailsUpdatedMessageTsProto,
    PositionMessage as PositionMessageTsProto,
    PositionMessage_Direction,
    QueryMessage,
    RefreshRoomMessage,
    RemoveSpaceFilterMessage,
    RoomShortDescription,
    TokenExpiredMessage,
    UpdateWAMSettingsMessage,
    UploadEntityMessage,
    UserJoinedMessage as UserJoinedMessageTsProto,
    UserLeftMessage as UserLeftMessageTsProto,
    UserMovedMessage as UserMovedMessageTsProto,
    ViewportMessage as ViewportMessageTsProto,
    WorldConnectionMessage,
    PublicEvent,
    JoinSpaceRequestMessage,
    LeaveSpaceRequestMessage,
    SpaceEvent,
    PrivateSpaceEvent,
    UpdateSpaceUserPusherToFrontMessage,
    AddSpaceUserMessage,
    RemoveSpaceUserPusherToFrontMessage,
    PublicEventFrontToPusher,
    PrivateEventFrontToPusher,
    OauthRefreshToken,
    ExternalModuleMessage,
    SpaceDestroyedMessage,
    SayMessage,
    FilterType,
    UploadFileMessage,
    MapStorageJwtAnswer,
    PrivateEventPusherToFront,
    InitSpaceUsersMessage,
    IceServersAnswer,
    AskPositionMessage_AskType,
} from "@workadventure/messages";
import {
    AskPositionMessage_AskType as AskPositionMessageAskType,
    apiVersionHash,
    ClientToServerMessage as ClientToServerMessageTsProto,
    ServerToClientMessage as ServerToClientMessageTsProto,
    SetPlayerDetailsMessage as SetPlayerDetailsMessageTsProto,
    SetPlayerVariableMessage_Scope,
    UpdateSpaceMetadataMessage,
    SpaceUser,
    LeaveChatRoomAreaMessage,
} from "@workadventure/messages";
import { BehaviorSubject, Subject } from "rxjs";
import { get } from "svelte/store";
import { generateFieldMask } from "protobuf-fieldmask";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { asError } from "catch-unknown";
import { abortAny } from "@workadventure/shared-utils/src/Abort/AbortAny";
import { abortTimeout } from "@workadventure/shared-utils/src/Abort/AbortTimeout";
import type { ReceiveEventEvent } from "../Api/Events/ReceiveEventEvent";
import type { SetPlayerVariableEvent } from "../Api/Events/SetPlayerVariableEvent";
import { iframeListener } from "../Api/IframeListener";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import { ENABLE_MAP_EDITOR, UPLOADER_URL, WOKA_SPEED } from "../Enum/EnvironmentVariable";
import type { CompanionTextureDescriptionInterface } from "../Phaser/Companion/CompanionTextures";
import type { WokaTextureDescriptionInterface } from "../Phaser/Entity/PlayerTextures";
import { gameManager } from "../Phaser/Game/GameManager";
import { SelectCharacterScene, SelectCharacterSceneName } from "../Phaser/Login/SelectCharacterScene";
import { SelectCompanionScene, SelectCompanionSceneName } from "../Phaser/Login/SelectCompanionScene";
import { chatZoneLiveStore } from "../Stores/ChatStore";
import { errorScreenStore } from "../Stores/ErrorScreenStore";
import { followRoleStore, followUsersStore } from "../Stores/FollowStore";
import { isSpeakerStore, requestedMicrophoneState, requestedCameraState } from "../Stores/MediaStore";
import { currentLiveStreamingSpaceStore } from "../Stores/MegaphoneStore";
import {
    inviteUserActivated,
    mapEditorActivated,
    menuIconVisiblilityStore,
    menuVisiblilityStore,
    warningBannerStore,
} from "../Stores/MenuStore";
import { requestedScreenSharingState } from "../Stores/ScreenSharingStore";
import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
import { selectCharacterSceneVisibleStore } from "../Stores/SelectCharacterStore";
import { adminMessagesService } from "./AdminMessagesService";
import { connectionManager } from "./ConnectionManager";
import type {
    GroupCreatedUpdatedMessageInterface,
    GroupUsersUpdateMessageInterface,
    MessageUserJoined,
    PlayGlobalMessageInterface,
    PositionInterface,
    RoomJoinedMessageInterface,
    ViewportInterface,
} from "./ConnexionModels";
import { localUserStore } from "./LocalUserStore";
import { ConnectionClosedError } from "./ConnectionClosedError";

// This must be greater than RoomManager's PING_INTERVAL
const manualPingDelay = 100_000;

export class RoomConnection implements RoomConnection {
    private static websocketFactory: null | ((url: string, protocols?: string[]) => any) = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    public readonly socket: WebSocket;
    private userId: number | null = null;
    private _closed = false;
    private tags: string[] = [];
    private canEdit = false;

    public readonly _serverDisconnected = new Subject<void>();
    public readonly serverDisconnected = this._serverDisconnected.asObservable();

    private readonly _errorMessageStream = new Subject<ErrorMessageTsProto>();
    public readonly errorMessageStream = this._errorMessageStream.asObservable();
    private readonly _errorScreenMessageStream = new Subject<ErrorScreenMessageTsProto>();
    public readonly errorScreenMessageStream = this._errorScreenMessageStream.asObservable();
    private readonly _roomJoinedMessageStream = new Subject<{
        connection: RoomConnection;
        room: RoomJoinedMessageInterface;
    }>();
    public readonly roomJoinedMessageStream = this._roomJoinedMessageStream.asObservable();
    private readonly _teleportMessageMessageStream = new Subject<string>();
    public readonly teleportMessageMessageStream = this._teleportMessageMessageStream.asObservable();
    private readonly _worldFullMessageStream = new Subject<string | null>();
    public readonly worldFullMessageStream = this._worldFullMessageStream.asObservable();
    private readonly _worldConnectionMessageStream = new Subject<WorldConnectionMessage>();
    public readonly worldConnectionMessageStream = this._worldConnectionMessageStream.asObservable();
    private readonly _tokenExpiredMessageStream = new Subject<TokenExpiredMessage>();
    public readonly tokenExpiredMessageStream = this._tokenExpiredMessageStream.asObservable();
    private readonly _userMovedMessageStream = new Subject<UserMovedMessageTsProto>();
    public readonly userMovedMessageStream = this._userMovedMessageStream.asObservable();
    private readonly _groupUpdateMessageStream = new Subject<GroupCreatedUpdatedMessageInterface>();
    public readonly groupUpdateMessageStream = this._groupUpdateMessageStream.asObservable();
    private readonly _groupUsersUpdateMessageStream = new Subject<GroupUsersUpdateMessageInterface>();
    public readonly groupUsersUpdateMessageStream = this._groupUsersUpdateMessageStream.asObservable();
    private readonly _groupDeleteMessageStream = new Subject<GroupDeleteMessageTsProto>();
    public readonly groupDeleteMessageStream = this._groupDeleteMessageStream.asObservable();
    private readonly _userJoinedMessageStream = new Subject<MessageUserJoined>();
    public readonly userJoinedMessageStream = this._userJoinedMessageStream.asObservable();
    private readonly _userLeftMessageStream = new Subject<UserLeftMessageTsProto>();
    public readonly userLeftMessageStream = this._userLeftMessageStream.asObservable();
    private readonly _refreshRoomMessageStream = new Subject<RefreshRoomMessage>();
    public readonly refreshRoomMessageStream = this._refreshRoomMessageStream.asObservable();

    private readonly _followRequestMessageStream = new Subject<FollowRequestMessage>();
    public readonly followRequestMessageStream = this._followRequestMessageStream.asObservable();

    private readonly _followConfirmationMessageStream = new Subject<FollowConfirmationMessage>();
    public readonly followConfirmationMessageStream = this._followConfirmationMessageStream.asObservable();

    private readonly _followAbortMessageStream = new Subject<FollowAbortMessage>();
    public readonly followAbortMessageStream = this._followAbortMessageStream.asObservable();

    private readonly _itemEventMessageStream = new Subject<{
        itemId: number;
        event: string;
        parameters: unknown;
        state: unknown;
    }>();
    public readonly itemEventMessageStream = this._itemEventMessageStream.asObservable();
    private readonly _emoteEventMessageStream = new Subject<EmoteEventMessageTsProto>();
    public readonly emoteEventMessageStream = this._emoteEventMessageStream.asObservable();
    private readonly _variableMessageStream = new Subject<{ name: string; value: unknown }>();
    public readonly variableMessageStream = this._variableMessageStream.asObservable();
    private readonly _editMapCommandMessageStream = new Subject<EditMapCommandMessage>();
    public readonly editMapCommandMessageStream = this._editMapCommandMessageStream.asObservable();
    private readonly _playerDetailsUpdatedMessageStream = new Subject<PlayerDetailsUpdatedMessageTsProto>();
    public readonly playerDetailsUpdatedMessageStream = this._playerDetailsUpdatedMessageStream.asObservable();

    private readonly _websocketErrorStream = new Subject<Event>();
    public readonly websocketErrorStream = this._websocketErrorStream.asObservable();
    // Triggered if a "close" event is received from the WebSocket before a message is received
    private readonly _connectionErrorStream = new Subject<CloseEvent>();
    public readonly connectionErrorStream = this._connectionErrorStream.asObservable();
    // If this timeout triggers, we consider the connection is lost (no ping received)
    private timeout: ReturnType<typeof setInterval> | undefined = undefined;
    private readonly _moveToPositionMessageStream = new Subject<MoveToPositionMessageProto>();
    public readonly moveToPositionMessageStream = this._moveToPositionMessageStream.asObservable();
    private readonly _locatePositionMessageStream = new Subject<LocatePositionMessageProto>();
    public readonly locatePositionMessageStream = this._locatePositionMessageStream.asObservable();
    private readonly _initSpaceUsersMessageStream = new Subject<InitSpaceUsersMessage>();
    public readonly initSpaceUsersMessageStream = this._initSpaceUsersMessageStream.asObservable();
    private readonly _addSpaceUserMessageStream = new Subject<AddSpaceUserMessage>();
    public readonly addSpaceUserMessageStream = this._addSpaceUserMessageStream.asObservable();
    private readonly _updateSpaceUserMessageStream = new Subject<UpdateSpaceUserPusherToFrontMessage>();
    public readonly updateSpaceUserMessageStream = this._updateSpaceUserMessageStream.asObservable();
    private readonly _removeSpaceUserMessageStream = new Subject<RemoveSpaceUserPusherToFrontMessage>();
    public readonly removeSpaceUserMessageStream = this._removeSpaceUserMessageStream.asObservable();
    private readonly _updateSpaceMetadataMessageStream = new Subject<UpdateSpaceMetadataMessage>();
    public readonly updateSpaceMetadataMessageStream = this._updateSpaceMetadataMessageStream.asObservable();
    private readonly _megaphoneSettingsMessageStream = new BehaviorSubject<MegaphoneSettings | undefined>(undefined);
    public readonly megaphoneSettingsMessageStream = this._megaphoneSettingsMessageStream.asObservable();
    private readonly _receivedEventMessageStream = new Subject<ReceiveEventEvent>();
    public readonly receivedEventMessageStream = this._receivedEventMessageStream.asObservable();
    private readonly _spacePrivateMessageEvent = new Subject<PrivateEventPusherToFront>();
    public readonly spacePrivateMessageEvent = this._spacePrivateMessageEvent.asObservable();
    private readonly _spacePublicMessageEvent = new Subject<PublicEvent>();
    public readonly spacePublicMessageEvent = this._spacePublicMessageEvent.asObservable();
    private readonly _joinSpaceRequestMessage = new Subject<JoinSpaceRequestMessage>();
    public readonly joinSpaceRequestMessage = this._joinSpaceRequestMessage.asObservable();
    private readonly _leaveSpaceRequestMessage = new Subject<LeaveSpaceRequestMessage>();
    public readonly leaveSpaceRequestMessage = this._leaveSpaceRequestMessage.asObservable();
    private readonly _externalModuleMessage = new Subject<ExternalModuleMessage>();
    public readonly externalModuleMessage = this._externalModuleMessage.asObservable();
    private readonly _spaceDestroyedMessage = new Subject<SpaceDestroyedMessage>();
    public readonly spaceDestroyedMessage = this._spaceDestroyedMessage.asObservable();

    private queries = new Map<
        number,
        {
            answerType: string;
            resolve: (message: Required<AnswerMessage>["answer"]) => void;
            reject: (e: unknown) => void;
        }
    >();
    private lastQueryId = 0;

    /**
     *
     * @param token A JWT token containing the email of the user
     * @param roomUrl The URL of the room in the form "https://example.com/_/[instance]/[map_url]" or "https://example.com/@/[org]/[event]/[map]"
     * @param name
     * @param characterTextureIds
     * @param position
     * @param viewport
     * @param companionTextureId
     * @param availabilityStatus
     * @param lastCommandId
     */
    public constructor(
        token: string | null,
        private roomUrl: string,
        name: string,
        characterTextureIds: string[],
        position: PositionInterface,
        viewport: ViewportInterface,
        companionTextureId: string | null,
        availabilityStatus: AvailabilityStatus,
        lastCommandId?: string
    ) {
        const urlObj = new URL("ws/room", ABSOLUTE_PUSHER_URL);
        urlObj.protocol = urlObj.protocol.replace("http", "ws");

        // Workaround for local development without Traefik:
        // Pusher HTTP is on 3000, but WS is on 3001.
        if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
            if (urlObj.port === "3000" || urlObj.port === "8080") {
                urlObj.port = "3001";
            }
        }

        const params = urlObj.searchParams;
        params.set("roomId", roomUrl);
        params.set("name", name);
        for (const textureId of characterTextureIds) {
            params.append("characterTextureIds", textureId);
        }
        params.set("x", Math.floor(position.x).toString());
        params.set("y", Math.floor(position.y).toString());
        params.set("top", Math.floor(viewport.top).toString());
        params.set("bottom", Math.floor(viewport.bottom).toString());
        params.set("left", Math.floor(viewport.left).toString());
<!-- [5a] Build WebSocket URL (line 291) -->
        params.set("right", Math.floor(viewport.right).toString());
        if (companionTextureId) {
            params.set("companionTextureId", companionTextureId);
        }
        params.set("availabilityStatus", availabilityStatus.toString());
        if (lastCommandId) {
            params.set("lastCommandId", lastCommandId);
        }
        params.set("version", apiVersionHash);
        params.set("chatID", localUserStore.getChatId() ?? "");
        params.set("roomName", gameManager.currentStartedRoom.roomName ?? "");
        params.set("cameraState", get(requestedCameraState) ? "true" : "false");
        params.set("microphoneState", get(requestedMicrophoneState) ? "true" : "false");
        // TODO: check if the screenSharingState variable is used
        params.set("screenSharingState", get(requestedScreenSharingState) ? "true" : "false");

<!-- [5b] Finalize connection URL (line 307) -->
        const url = urlObj.toString();
        let subProtocols: string[] | undefined = undefined;
        if (token) {
            // We abuse the subprotocols to pass the token to the server
            subProtocols = [token];
        }

        if (RoomConnection.websocketFactory) {
            this.socket = RoomConnection.websocketFactory(url, subProtocols);
        } else {
<!-- [5c] Create WebSocket connection (line 317) -->
            this.socket = new WebSocket(url, subProtocols);
        }

        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
            console.info("Socket has been opened");
            this.resetPingTimeout();
        };

        this.socket.addEventListener("close", this.handleSocketClose);

<!-- [5d] Register message handler (line 329) -->
        this.socket.onmessage = (messageEvent) => {
            try {
                const arrayBuffer: ArrayBuffer = messageEvent.data;

<!-- [5e] Decode protobuf messages (line 333) -->
                const serverToClientMessage = ServerToClientMessageTsProto.decode(new Uint8Array(arrayBuffer));

                const message = serverToClientMessage.message;
                if (message === undefined) {
                    return;
                }

                switch (message.$case) {
                    case "batchMessage": {
                        for (const subMessageWrapper of message.batchMessage.payload) {
                            try {
                                const subMessage = subMessageWrapper.message;
                                if (subMessage === undefined) {
                                    return;
                                }
                                switch (subMessage.$case) {
                                    case "errorMessage": {
                                        this._errorMessageStream.next(subMessage.errorMessage);
                                        console.error(
                                            "An error occurred server side: " + subMessage.errorMessage.message
                                        );
                                        break;
                                    }
                                    case "userJoinedMessage": {
                                        this._userJoinedMessageStream.next(
                                            this.toMessageUserJoined(subMessage.userJoinedMessage)
                                        );
                                        break;
                                    }
                                    case "userLeftMessage": {
                                        this._userLeftMessageStream.next(subMessage.userLeftMessage);
                                        break;
                                    }
                                    case "userMovedMessage": {
                                        this._userMovedMessageStream.next(subMessage.userMovedMessage);
                                        break;
                                    }
                                    case "groupUpdateMessage": {
                                        this._groupUpdateMessageStream.next(
                                            this.toGroupCreatedUpdatedMessage(subMessage.groupUpdateMessage)
                                        );
                                        break;
                                    }
                                    case "groupDeleteMessage": {
                                        this._groupDeleteMessageStream.next(subMessage.groupDeleteMessage);
                                        break;
                                    }
                                    case "itemEventMessage": {
                                        this._itemEventMessageStream.next({
                                            itemId: subMessage.itemEventMessage.itemId,
                                            event: subMessage.itemEventMessage.event,
                                            parameters: JSON.parse(subMessage.itemEventMessage.parametersJson),
                                            state: JSON.parse(subMessage.itemEventMessage.stateJson),
                                        });
                                        break;
                                    }
                                    case "emoteEventMessage": {
                                        this._emoteEventMessageStream.next(subMessage.emoteEventMessage);
                                        break;
                                    }
                                    case "playerDetailsUpdatedMessage": {
                                        this._playerDetailsUpdatedMessageStream.next(
                                            subMessage.playerDetailsUpdatedMessage
                                        );
                                        break;
                                    }
                                    case "variableMessage": {
                                        const name = subMessage.variableMessage.name;
                                        const value = RoomConnection.unserializeVariable(
                                            subMessage.variableMessage.value
                                        );
                                        this._variableMessageStream.next({ name, value });
                                        break;
                                    }
                                    case "pingMessage": {
                                        this.resetPingTimeout();
                                        this.sendPong();
                                        break;
                                    }
                                    case "editMapCommandMessage": {
                                        const message = subMessage.editMapCommandMessage;
                                        this._editMapCommandMessageStream.next(message);
                                        break;
                                    }
                                    case "initSpaceUsersMessage": {
                                        this._initSpaceUsersMessageStream.next(subMessage.initSpaceUsersMessage);
                                        break;
                                    }
                                    case "addSpaceUserMessage": {
                                        this._addSpaceUserMessageStream.next(subMessage.addSpaceUserMessage);
                                        break;
                                    }
                                    case "updateSpaceUserMessage": {
                                        this._updateSpaceUserMessageStream.next(subMessage.updateSpaceUserMessage);
                                        break;
                                    }
                                    case "removeSpaceUserMessage": {
                                        this._removeSpaceUserMessageStream.next(subMessage.removeSpaceUserMessage);
                                        break;
                                    }
                                    case "updateSpaceMetadataMessage": {
                                        this._updateSpaceMetadataMessageStream.next(
                                            subMessage.updateSpaceMetadataMessage
                                        );
                                        break;
                                    }
                                    case "megaphoneSettingsMessage": {
                                        this._megaphoneSettingsMessageStream.next(subMessage.megaphoneSettingsMessage);
                                        break;
                                    }
                                    case "receivedEventMessage": {
                                        this._receivedEventMessageStream.next({
                                            name: subMessage.receivedEventMessage.name,
                                            data: subMessage.receivedEventMessage.data,
                                            senderId: subMessage.receivedEventMessage.senderId,
                                        });
                                        break;
                                    }
                                    // FIXME: not sure where kickOffMessage belongs
                                    case "kickOffMessage": {
                                        if (subMessage.kickOffMessage.userId !== this.userId?.toString()) break;

                                        isSpeakerStore.set(false);
                                        currentLiveStreamingSpaceStore.set(undefined);
                                        const scene = gameManager.getCurrentGameScene();
                                        scene.broadcastService
                                            .leaveSpace(subMessage.kickOffMessage.spaceName)
                                            .catch((e) => {
                                                console.error("Error while leaving space", e);
                                                Sentry.captureException(e);
                                            });

                                        chatZoneLiveStore.set(false);
                                        break;
                                    }
                                    case "publicEvent": {
                                        this._spacePublicMessageEvent.next(subMessage.publicEvent);
                                        break;
                                    }
                                    case "privateEvent": {
                                        this._spacePrivateMessageEvent.next(subMessage.privateEvent);
                                        break;
                                    }
                                    case "spaceDestroyedMessage": {
                                        this._spaceDestroyedMessage.next(subMessage.spaceDestroyedMessage);
                                        break;
                                    }
                                    case "groupUsersUpdateMessage": {
                                        this._groupUsersUpdateMessageStream.next(subMessage.groupUsersUpdateMessage);
                                        break;
                                    }
                                    default: {
                                        const _exhaustiveCheck: never = subMessage;
                                    }
                                }
                            } catch (e) {
                                console.error("Error while processing a submessage of a batchMessage", e);
                                Sentry.captureException(e);
                            }
                        }
                        break;
                    }
                    case "roomJoinedMessage": {
                        const roomJoinedMessage = message.roomJoinedMessage;

                        const items: { [itemId: number]: unknown } = {};
                        for (const item of roomJoinedMessage.item) {
                            items[item.itemId] = JSON.parse(item.stateJson);
                        }

                        const variables = new Map<string, unknown>();
                        for (const variable of roomJoinedMessage.variable) {
                            variables.set(variable.name, RoomConnection.unserializeVariable(variable.value));
                        }

                        const playerVariables = new Map<string, unknown>();
                        for (const variable of roomJoinedMessage.playerVariable) {
                            playerVariables.set(variable.name, RoomConnection.unserializeVariable(variable.value));
                        }

                        const editMapCommandsArrayMessage = roomJoinedMessage.editMapCommandsArrayMessage;
                        let commandsToApply: EditMapCommandMessage[] | undefined = undefined;
                        if (editMapCommandsArrayMessage) {
                            commandsToApply = editMapCommandsArrayMessage.editMapCommands;
                        }

                        this.userId = roomJoinedMessage.currentUserId;
                        this.tags = roomJoinedMessage.tag;
                        this._userRoomToken = roomJoinedMessage.userRoomToken;
                        //define if there is invite user option activated
                        inviteUserActivated.set(
                            roomJoinedMessage.activatedInviteUser != undefined
                                ? roomJoinedMessage.activatedInviteUser
                                : true
                        );
                        this.canEdit = roomJoinedMessage.canEdit;
                        mapEditorActivated.set(ENABLE_MAP_EDITOR && this.canEdit);

                        // If there are scripts from the admin, run it
                        const applications: ApplicationMessage[] = [];
                        if (roomJoinedMessage.applications != undefined) {
                            roomJoinedMessage.applications.forEach((application, index) => {
                                if (application.script == undefined) {
                                    applications.push(application);
                                    return;
                                }
                                iframeListener.registerScript(application.script).catch((err) => {
                                    console.error("roomJoinedMessage => registerScript => err", err);
                                });
                            });
                        }

                        const characterTextures = roomJoinedMessage.characterTextures.map(
                            this.mapWokaTextureToResourceDescription.bind(this)
                        );

                        this._roomJoinedMessageStream.next({
                            connection: this,
                            room: {
                                items,
                                variables,
                                characterTextures,
                                companionTexture: roomJoinedMessage.companionTexture,
                                playerVariables,
                                commandsToApply,
                                applications: applications,
                            } as RoomJoinedMessageInterface,
                        });

                        if (roomJoinedMessage.megaphoneSettings) {
                            this._megaphoneSettingsMessageStream.next(roomJoinedMessage.megaphoneSettings);
                        }

                        break;
                    }
                    case "worldFullMessage": {
                        this._worldFullMessageStream.next(null);
                        this.closeConnection();
                        break;
                    }
                    case "invalidCharacterTextureMessage": {
                        console.warn(
                            "One of your Woka textures is invalid for this world, you will be redirect to the Woka selection screen"
                        );
                        this.goToSelectYourWokaScene();

                        this.closeConnection();
                        break;
                    }
                    case "invalidCompanionTextureMessage": {
                        console.warn(
                            "Your companion texture is invalid for this world, you will be redirect to the companion selection screen"
                        );
                        this.goToSelectYourCompanionScene();

                        this.closeConnection();
                        break;
                    }
                    case "tokenExpiredMessage": {
                        connectionManager.logout();
                        this.closeConnection(); //technically, this isn't needed since loadOpenIDScreen() will do window.location.assign() but I prefer to leave it for consistency
                        break;
                    }
                    case "worldConnectionMessage": {
                        this._worldFullMessageStream.next(message.worldConnectionMessage.message);
                        this.closeConnection();
                        break;
                    }
                    case "teleportMessageMessage": {
                        // FIXME: WHY IS THIS UNUSED? CAN WE REMOVE THIS???
                        this._teleportMessageMessageStream.next(message.teleportMessageMessage.map);
                        break;
                    }
                    case "sendUserMessage": {
                        adminMessagesService.onSendusermessage(message.sendUserMessage);
                        break;
                    }
                    case "banUserMessage": {
                        adminMessagesService.onSendusermessage(message.banUserMessage);
                        break;
                    }
                    case "worldFullWarningMessage": {
                        warningBannerStore.activateWarningContainer();
                        break;
                    }
                    case "refreshRoomMessage": {
                        this._refreshRoomMessageStream.next(message.refreshRoomMessage);
                        break;
                    }
                    case "followRequestMessage": {
                        this._followRequestMessageStream.next(message.followRequestMessage);
                        break;
                    }
                    case "followConfirmationMessage": {
                        this._followConfirmationMessageStream.next(message.followConfirmationMessage);
                        break;
                    }
                    case "followAbortMessage": {
                        this._followAbortMessageStream.next(message.followAbortMessage);
                        break;
                    }
                    case "errorMessage": {
                        this._errorMessageStream.next(message.errorMessage);
                        console.error("An error occurred server side: " + message.errorMessage.message);
                        break;
                    }
                    case "errorScreenMessage": {
                        this._errorScreenMessageStream.next(message.errorScreenMessage);
                        console.error("An error occurred server side: " + JSON.stringify(message.errorScreenMessage));
                        if (message.errorScreenMessage.code !== "retry") {
                            this._closed = true;
                        }
                        if (
                            message.errorScreenMessage.type === "redirect" &&
                            message.errorScreenMessage.urlToRedirect
                        ) {
                            window.location.assign(message.errorScreenMessage.urlToRedirect);
                        } else {
                            errorScreenStore.setError(message.errorScreenMessage);
                        }
                        break;
                    }
                    case "moveToPositionMessage": {
                        if (message.moveToPositionMessage && message.moveToPositionMessage.position) {
                            gameManager
                                .getCurrentGameScene()
                                .moveTo(message.moveToPositionMessage.position, false, WOKA_SPEED * 2.5)
                                .catch((error) => {
                                    console.warn(error);
                                });
                        }
                        this._moveToPositionMessageStream.next(message.moveToPositionMessage);
                        break;
                    }
                    case "locatePositionMessage": {
                        this._locatePositionMessageStream.next(message.locatePositionMessage);
                        break;
                    }
                    case "answerMessage": {
                        const queryId = message.answerMessage.id;
                        const query = this.queries.get(queryId);
                        if (query === undefined) {
                            throw new Error("Got an answer to a query we have no track of: " + queryId.toString());
                        }
                        if (message.answerMessage.answer === undefined) {
                            throw new Error("Invalid message received. Answer missing.");
                        }
                        if (message.answerMessage.answer.$case === "error") {
                            query.reject(new Error(message.answerMessage.answer.error.message));
                        } else {
                            query.resolve(message.answerMessage.answer);
                        }
                        this.queries.delete(queryId);
                        break;
                    }
                    case "joinSpaceRequestMessage": {
                        this._joinSpaceRequestMessage.next(message.joinSpaceRequestMessage);
                        break;
                    }
                    case "leaveSpaceRequestMessage": {
                        this._leaveSpaceRequestMessage.next(message.leaveSpaceRequestMessage);
                        break;
                    }
                    case "externalModuleMessage": {
                        this._externalModuleMessage.next(message.externalModuleMessage);
                        break;
                    }
                    default: {
                        // Security check: if we forget a "case", the line below will catch the error at compile-time.
                        const _exhaustiveCheck: never = message;
                    }
                }
            } catch (e) {
                console.error("Error while handling message from server", e);
                Sentry.captureException(e);
            }
        };

        this.socket.addEventListener("error", this.handleSocketError);
    }

    // Event handlers as arrow function in order not to have to bind this explicitly
    private handleSocketClose = (event: CloseEvent) => {
        console.info("Socket has been closed", this.userId, this._closed, event);
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // If we are not connected yet (if a JoinRoomMessage was not sent), we need to retry.
        if (this.userId === null && !this._closed) {
            this._connectionErrorStream.next(event);
            return;
        }

        this.cleanupConnection(event.code === 1000);
    };

    private handleSocketError = (event: Event) => {
        this._websocketErrorStream.next(event);
    };

    private cleanupConnection(isNormalClosure: boolean) {
        // Cleanup queries:
        for (const query of this.queries.values()) {
            query.reject(new ConnectionClosedError("Socket closed"));
        }

        this.completeStreams();

        if (this._closed || connectionManager.unloading) {
            return;
        }

        if (isNormalClosure) {
            // Normal closure case
            return;
        }

        this._serverDisconnected.next();
        this._serverDisconnected.complete();
    }

    private _userRoomToken: string | undefined;

    public get userRoomToken(): string | undefined {
        return this._userRoomToken;
    }

    get userCanEdit() {
        return this.canEdit;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static setWebsocketFactory(websocketFactory: (url: string) => any): void {
        RoomConnection.websocketFactory = websocketFactory;
    }

    /**
     * Unserializes a string received from the server.
     * If the value cannot be unserialized, returns undefined and outputs a console error.
     */
    public static unserializeVariable(serializedValue: string): unknown {
        let value: unknown = undefined;
        if (serializedValue) {
            try {
                value = JSON.parse(serializedValue);
            } catch (e) {
                console.error(
                    "Unable to unserialize value received from server for a variable. " +
                    'Value received: "' +
                    serializedValue +
                    '". Error: ',
                    e
                );
            }
        }
        return value;
    }

    public emitPlayerShowVoiceIndicator(show: boolean): void {
        const message = SetPlayerDetailsMessageTsProto.fromPartial({
            showVoiceIndicator: show,
        });
        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: message,
            },
        });
    }

    public emitPlayerStatusChange(availabilityStatus: AvailabilityStatus): void {
        const message = SetPlayerDetailsMessageTsProto.fromPartial({
            availabilityStatus,
        });
        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: message,
            },
        });
    }

    public emitPlayerChatID(chatID: string): void {
        const message = SetPlayerDetailsMessageTsProto.fromPartial({
            chatID,
        });
        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: message,
            },
        });
    }

    public emitPlayerOutlineColor(color: number | null) {
        let message: SetPlayerDetailsMessageTsProto;
        if (color === null) {
            message = SetPlayerDetailsMessageTsProto.fromPartial({
                removeOutlineColor: true,
            });
        } else {
            message = SetPlayerDetailsMessageTsProto.fromPartial({
                outlineColor: color,
            });
        }
        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: message,
            },
        });
    }

    public emitPlayerSayMessage(sayMessage: SayMessage | undefined) {
        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: SetPlayerDetailsMessageTsProto.fromPartial({
                    sayMessage,
                }),
            },
        });
    }

    public closeConnection(): void {
        this.socket?.close();
        this.cleanupConnection(true);
        this.socket?.removeEventListener("close", this.handleSocketClose);
        this.socket?.removeEventListener("error", this.handleSocketError);
        this._closed = true;
    }

    public sharePosition(
        x: number,
        y: number,
        direction: PositionMessage_Direction,
        moving: boolean,
        viewport: ViewportInterface
    ): void {
        if (!this.socket) {
            return;
        }

        const positionMessage = this.toPositionMessage(x, y, direction, moving);

        const viewportMessage = this.toViewportMessage(viewport);

        this.send({
            message: {
                $case: "userMovesMessage",
                userMovesMessage: {
                    position: positionMessage,
                    viewport: viewportMessage,
                },
            },
        });
    }

    public setViewport(viewport: ViewportInterface): void {
        this.send({
            message: {
                $case: "viewportMessage",
                viewportMessage: this.toViewportMessage(viewport),
            },
        });
    }

    public getUserId(): number {
        if (this.userId === null) throw new Error("UserId cannot be null!");
        return this.userId;
    }

    public getSpaceUserId(): string {
        return this.roomUrl + "_" + this.getUserId();
    }

    emitActionableEvent(itemId: number, event: string, state: unknown, parameters: unknown): void {
        this.send({
            message: {
                $case: "itemEventMessage",
                itemEventMessage: {
                    itemId,
                    event,
                    stateJson: JSON.stringify(state),
                    parametersJson: JSON.stringify(parameters),
                },
            },
        });
    }

    emitSetVariableEvent(name: string, value: unknown): void {
        this.send({
            message: {
                $case: "variableMessage",
                variableMessage: {
                    name,
                    value: JSON.stringify(value),
                },
            },
        });
    }

    public async emitScriptableEvent(name: string, data: unknown, targetUserIds: number[] | undefined): Promise<void> {
        const answer = await this.query({
            $case: "sendEventQuery",
            sendEventQuery: {
                name,
                data,
                targetUserIds: targetUserIds ?? [],
            },
        });
        if (answer.$case !== "sendEventAnswer") {
            throw new Error("Unexpected answer");
        }
        return;
    }

    public uploadAudio(file: FormData) {
        return axios
            .post<unknown>(`${UPLOADER_URL}/upload-audio-message`, file)
            .then((res: { data: unknown }) => {
                return res.data;
            })
            .catch((err) => {
                console.error(err);
                throw err;
            });
    }

    public emitGlobalMessage(message: PlayGlobalMessageInterface): void {
        this.send({
            message: {
                $case: "playGlobalMessage",
                playGlobalMessage: {
                    type: message.type,
                    content: message.content,
                    broadcastToWorld: message.broadcastToWorld,
                },
            },
        });
    }

    public emitReportPlayerMessage(reportedUserUuid: string, reportComment: string): void {
        this.send({
            message: {
                $case: "reportPlayerMessage",
                reportPlayerMessage: {
                    reportedUserUuid,
                    reportComment,
                },
            },
        });
    }

    public emitBanPlayerMessage(banUserUuid: string, banUserName: string): void {
        this.send({
            message: {
                $case: "banPlayerMessage",
                banPlayerMessage: {
                    banUserUuid,
                    banUserName,
                },
            },
        });
    }

    public hasTag(tag: string): boolean {
        return this.tags.includes(tag);
    }

    public isAdmin(): boolean {
        return this.hasTag("admin");
    }

    public emitEmoteEvent(emoteName: string): void {
        this.send({
            message: {
                $case: "emotePromptMessage",
                emotePromptMessage: {
                    emote: emoteName,
                },
            },
        });
    }

    public emitFollowRequest(forceFollow = false): void {
        if (!this.userId) {
            return;
        }

        this.send({
            message: {
                $case: "followRequestMessage",
                followRequestMessage: {
                    leader: this.userId,
                    forceFollow,
                },
            },
        });
    }

    public emitFollowConfirmation(leaderId: number): void {
        if (!this.userId) {
            return;
        }

        this.send({
            message: {
                $case: "followConfirmationMessage",
                followConfirmationMessage: {
                    leader: leaderId,
                    follower: this.userId,
                },
            },
        });
    }

    public emitFollowAbort(): void {
        const isLeader = get(followRoleStore) === "leader";
        if (!this.userId) {
            return;
        }

        this.send({
            message: {
                $case: "followAbortMessage",
                followAbortMessage: {
                    leader: isLeader ? this.userId : get(followUsersStore)[0],
                    follower: isLeader ? 0 : this.userId,
                },
            },
        });
    }

    public emitLockGroup(lock = true): void {
        this.send({
            message: {
                $case: "lockGroupPromptMessage",
                lockGroupPromptMessage: {
                    lock,
                },
            },
        });
    }

    public emitMapEditorModifyArea(commandId: string, config: AtLeast<AreaData, "id">): void {
        // We need to round the values because previous versions of WorkAdventure saved them as floats
        if (config.x !== undefined) {
            config.x = Math.round(config.x);
        }
        if (config.y !== undefined) {
            config.y = Math.round(config.y);
        }
        if (config.width !== undefined) {
            config.width = Math.round(config.width);
        }
        if (config.height !== undefined) {
            config.height = Math.round(config.height);
        }
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "modifyAreaMessage",
                            modifyAreaMessage: {
                                ...config,
                                properties: config.properties ?? [],
                                modifyProperties: config.properties !== undefined,
                            },
                        },
                    },
                },
            },
        });
    }

    public emitUpdateWAMSettingMessage(commandId: string, updateWAMSettingsMessage: UpdateWAMSettingsMessage) {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "updateWAMSettingsMessage",
                            updateWAMSettingsMessage,
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorDeleteArea(commandId: string, id: string): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "deleteAreaMessage",
                            deleteAreaMessage: {
                                id,
                            },
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorCreateArea(commandId: string, config: AreaData): void {
        if (config.x !== undefined) {
            config.x = Math.round(config.x);
        }
        if (config.y !== undefined) {
            config.y = Math.round(config.y);
        }
        if (config.width !== undefined) {
            config.width = Math.round(config.width);
        }
        if (config.height !== undefined) {
            config.height = Math.round(config.height);
        }
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "createAreaMessage",
                            createAreaMessage: config,
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorModifyEntity(
        commandId: string,
        entityId: string,
        config: AtLeast<WAMEntityData, "x" | "y">,
        entityDimensions: EntityDimensions
    ): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "modifyEntityMessage",
                            modifyEntityMessage: {
                                ...config,
                                id: entityId,
                                properties: config.properties ?? [],
                                modifyProperties: config.properties !== undefined,
                                width: entityDimensions.width,
                                height: entityDimensions.height,
                            },
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorCreateEntity(
        commandId: string,
        entityId: string,
        config: WAMEntityData,
        entityDimensions: EntityDimensions
    ): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "createEntityMessage",
                            createEntityMessage: {
                                id: entityId,
                                x: config.x,
                                y: config.y,
                                collectionName: config.prefabRef.collectionName,
                                prefabId: config.prefabRef.id,
                                properties: config.properties ?? [],
                                name: config.name,
                                width: entityDimensions.width,
                                height: entityDimensions.height,
                            },
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorDeleteEntity(commandId: string, id: string): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "deleteEntityMessage",
                            deleteEntityMessage: {
                                id,
                            },
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorUploadEntity(commandId: string, uploadEntityMessage: UploadEntityMessage): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "uploadEntityMessage",
                            uploadEntityMessage,
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorUploadFile(commandId: string, uploadFileMessage: UploadFileMessage): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "uploadFileMessage",
                            uploadFileMessage,
                        },
                    },
                },
            },
        });
    }

    public emitModifiyWAMMetadataMessage(
        commandId: string,
        modifiyWAMMetadataMessage: ModifiyWAMMetadataMessage
    ): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "modifiyWAMMetadataMessage",
                            modifiyWAMMetadataMessage,
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorModifyCustomEntity(
        commandId: string,
        modifyCustomEntityMessage: ModifyCustomEntityMessage
    ): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "modifyCustomEntityMessage",
                            modifyCustomEntityMessage,
                        },
                    },
                },
            },
        });
    }

    public emitMapEditorDeleteCustomEntity(
        commandId: string,
        deleteCustomEntityMessage: DeleteCustomEntityMessage
    ): void {
        this.send({
            message: {
                $case: "editMapCommandMessage",
                editMapCommandMessage: {
                    id: commandId,
                    editMapMessage: {
                        message: {
                            $case: "deleteCustomEntityMessage",
                            deleteCustomEntityMessage,
                        },
                    },
                },
            },
        });
    }

    public getAllTags(): string[] {
        return this.tags;
    }

    public emitAskPosition(
        uuid: string,
        playUri: string,
        type: AskPositionMessage_AskType = AskPositionMessageAskType.MOVE
    ) {
        this.send({
            message: {
                $case: "askPositionMessage",
                askPositionMessage: {
                    userIdentifier: uuid,
                    playUri,
                    askType: type,
                },
            },
        });
    }

    public emitAddSpaceFilter(filter: AddSpaceFilterMessage) {
        this.send({
            message: {
                $case: "addSpaceFilterMessage",
                addSpaceFilterMessage: filter,
            },
        });
    }

    public emitRemoveSpaceFilter(filter: RemoveSpaceFilterMessage) {
        this.send({
            message: {
                $case: "removeSpaceFilterMessage",
                removeSpaceFilterMessage: filter,
            },
        });
    }

    public async queryJitsiJwtToken(jitsiRoom: string): Promise<JitsiJwtAnswer> {
        const answer = await this.query({
            $case: "jitsiJwtQuery",
            jitsiJwtQuery: {
                jitsiRoom,
            },
        });
        if (answer.$case !== "jitsiJwtAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.jitsiJwtAnswer;
    }

    public async queryMapStorageJwtToken(signal?: AbortSignal): Promise<MapStorageJwtAnswer> {
        const answer = await this.query(
            {
                $case: "mapStorageJwtQuery",
                mapStorageJwtQuery: {},
            },
            {
                signal,
            }
        );
        if (answer.$case !== "mapStorageJwtAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.mapStorageJwtAnswer;
    }

    public async queryIceServers(): Promise<IceServersAnswer> {
        const answer = await this.query({
            $case: "iceServersQuery",
            iceServersQuery: {},
        });
        if (answer.$case !== "iceServersAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.iceServersAnswer;
    }

    public async queryBBBMeetingUrl(
        meetingId: string,
        props: Map<string, string | number | boolean>
    ): Promise<JoinBBBMeetingAnswer> {
        const meetingName = props.get("meetingName") as string;
        const localMeetingId = props.get("bbbMeeting") as string;

        const answer = await this.query({
            $case: "joinBBBMeetingQuery",
            joinBBBMeetingQuery: {
                meetingId,
                localMeetingId,
                meetingName,
            },
        });
        if (answer.$case !== "joinBBBMeetingAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.joinBBBMeetingAnswer;
    }

    public emitPlayerSetVariable(event: SetPlayerVariableEvent): void {
        let scope: SetPlayerVariableMessage_Scope;
        switch (event.scope) {
            case "room": {
                scope = SetPlayerVariableMessage_Scope.ROOM;
                break;
            }
            case "world": {
                scope = SetPlayerVariableMessage_Scope.WORLD;
                break;
            }
            default: {
                const _exhaustiveCheck: never = event.scope;
                return;
            }
        }

        this.send({
            message: {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: SetPlayerDetailsMessageTsProto.fromPartial({
                    setVariable: {
                        name: event.key,
                        value: JSON.stringify(event.value),
                        public: event.public,
                        ttl: event.ttl,
                        scope,
                        persist: event.persist,
                    },
                }),
            },
        });
    }

    public async emitJoinSpace(
        spaceName: string,
        filterType: FilterType,
        propertiesToSync: string[],
        options?: { signal: AbortSignal }
    ): Promise<SpaceUser["spaceUserId"]> {
        const answer = await this.query(
            {
                $case: "joinSpaceQuery",
                joinSpaceQuery: {
                    spaceName,
                    filterType,
                    propertiesToSync,
                },
            },
            options
        );

        if (answer.$case !== "joinSpaceAnswer") {
            throw new Error("Unexpected answer");
        }

        return answer.joinSpaceAnswer.spaceUserId;
    }

    public async emitLeaveSpace(spaceName: string): Promise<void> {
        const answer = await this.query({
            $case: "leaveSpaceQuery",
            leaveSpaceQuery: {
                spaceName,
            },
        });
        if (answer.$case !== "leaveSpaceAnswer") {
            throw new Error("Unexpected answer");
        }
        return;
    }

    public emitUpdateSpaceMetadata(spaceName: string, metadata: { [key: string]: unknown }): void {
        this.send({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
    }

    public emitUpdateSpaceUserMessage(spaceName: string, spaceUser: Omit<Partial<SpaceUser>, "id">): void {
        const userId = this.userId;
        if (!userId) {
            throw new Error("userId cannot be null when updating spaceUserMessage");
        }
        this.send({
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName,
                    user: SpaceUser.fromPartial({
                        spaceUserId: this.getSpaceUserId(),
                        ...spaceUser,
                    }),
                    updateMask: generateFieldMask(spaceUser),
                },
            },
        });
    }

    public async queryRoomTags(): Promise<string[]> {
        const answer = await this.query({
            $case: "roomTagsQuery",
            roomTagsQuery: {},
        });
        if (answer.$case !== "roomTagsAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.roomTagsAnswer.tags;
    }

    public async queryRoomsFromSameWorld(): Promise<RoomShortDescription[]> {
        const answer = await this.query({
            $case: "roomsFromSameWorldQuery",
            roomsFromSameWorldQuery: {},
        });
        if (answer.$case !== "roomsFromSameWorldAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.roomsFromSameWorldAnswer.roomDescriptions;
    }

    public async queryEmbeddableWebsite(url: string): Promise<EmbeddableWebsiteAnswer> {
        const answer = await this.query({
            $case: "embeddableWebsiteQuery",
            embeddableWebsiteQuery: {
                url,
            },
        });
        if (answer.$case !== "embeddableWebsiteAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.embeddableWebsiteAnswer;
    }

    public async queryTags(searchText: string): Promise<string[]> {
        const answer = await this.query({
            $case: "searchTagsQuery",
            searchTagsQuery: {
                searchText,
            },
        });
        if (answer.$case !== "searchTagsAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.searchTagsAnswer.tags;
    }

    public async queryMembers(searchText: string): Promise<Member[]> {
        const answer = await this.query({
            $case: "searchMemberQuery",
            searchMemberQuery: {
                searchText,
            },
        });
        if (answer.$case !== "searchMemberAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.searchMemberAnswer.members;
    }

    public async queryMember(memberUUID: string): Promise<Member> {
        const answer = await this.query({
            $case: "getMemberQuery",
            getMemberQuery: {
                uuid: memberUUID,
            },
        });
        if (answer.$case !== "getMemberAnswer") {
            throw new Error("Unexpected answer");
        }
        if (answer.getMemberAnswer.member === undefined) {
            throw new Error("Member is undefined.");
        }
        return answer.getMemberAnswer.member;
    }

    public async queryChatMembers(searchText: string): Promise<ChatMembersAnswer> {
        const answer = await this.query({
            $case: "chatMembersQuery",
            chatMembersQuery: {
                searchText,
            },
        });
        if (answer.$case !== "chatMembersAnswer") {
            throw new Error("Unexpected answer");
        }
        return answer.chatMembersAnswer;
    }

    public async getOauthRefreshToken(
        tokenToRefresh: string,
        provider?: string,
        userIdentifier?: string
    ): Promise<OauthRefreshToken> {
        try {
            const answer = await this.query({
                $case: "oauthRefreshTokenQuery",
                oauthRefreshTokenQuery: {
                    tokenToRefresh,
                    provider,
                    userIdentifier,
                },
            });
            if (answer.$case !== "oauthRefreshTokenAnswer") {
                throw new Error("Unexpected answer");
            }
            return answer.oauthRefreshTokenAnswer;
        } catch (error) {
            // FIWME: delete me when the fresh token query and answer are stable
            Debug(
                `RoomConnection => getOauthRefreshToken => Error getting oauth refresh token: ${(error as Error).message
                }`
            );
            throw error;
        }
    }

    public emitUpdateChatId(email: string, chatId: string) {
        if (chatId && email) {
            this.send({
                message: {
                    $case: "updateChatIdMessage",
                    updateChatIdMessage: {
                        email,
                        chatId,
                    },
                },
            });
        }
    }

    public async queryEnterChatRoomArea(roomID: string): Promise<void> {
        const answer = await this.query({
            $case: "enterChatRoomAreaQuery",
            enterChatRoomAreaQuery: {
                roomID,
            },
        });

        if (answer.$case !== "enterChatRoomAreaAnswer") {
            throw new Error("Unexpected answer");
        }

        return;
    }

    public emitLeaveChatRoomArea(roomID: string): void {
        this.send({
            message: {
                $case: "leaveChatRoomAreaMessage",
                leaveChatRoomAreaMessage: LeaveChatRoomAreaMessage.fromPartial({
                    roomID,
                }),
            },
        });
    }

    private resetPingTimeout(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.timeout = setTimeout(() => {
            console.warn(
                "Timeout detected. No ping from the server received. Is your connection down? Closing connection."
            );
            this.socket.close();
            this.cleanupConnection(false);
        }, manualPingDelay);
    }

    private sendPong(): void {
        this.send({
            message: {
                $case: "pingMessage",
                pingMessage: {},
            },
        });
    }

    public emitPublicSpaceEvent(spaceName: string, spaceEvent: NonNullable<SpaceEvent["event"]>): void {
        this.send({
            message: {
                $case: "publicEvent",
                publicEvent: {
                    spaceName,
                    spaceEvent: {
                        event: spaceEvent,
                    },
                } satisfies PublicEventFrontToPusher,
            },
        });
    }

    public emitPrivateSpaceEvent(
        spaceName: string,
        spaceEvent: NonNullable<PrivateSpaceEvent["event"]>,
        receiverUserId: string
    ): void {
        this.send({
            message: {
                $case: "privateEvent",
                privateEvent: {
                    spaceName,
                    receiverUserId,
                    spaceEvent: {
                        event: spaceEvent,
                    },
                } satisfies PrivateEventFrontToPusher,
            },
        });
    }

    private toPositionMessage(
        x: number,
        y: number,
        direction: PositionMessage_Direction,
        moving: boolean
    ): PositionMessageTsProto {
        return {
            x: Math.floor(x),
            y: Math.floor(y),
            moving,
            direction,
        };
    }

    private toViewportMessage(viewport: ViewportInterface): ViewportMessageTsProto {
        return {
            left: Math.floor(viewport.left),
            right: Math.floor(viewport.right),
            top: Math.floor(viewport.top),
            bottom: Math.floor(viewport.bottom),
        };
    }

    private mapWokaTextureToResourceDescription(texture: CharacterTextureMessage): WokaTextureDescriptionInterface {
        return {
            id: texture.id,
            url: texture.url,
        };
    }

    private mapCompanionTextureToResourceDescription(
        texture: CompanionTextureMessage
    ): CompanionTextureDescriptionInterface {
        return {
            id: texture.id,
            url: texture.url,
        };
    }

    // TODO: move this to protobuf utils
    private toMessageUserJoined(message: UserJoinedMessageTsProto): MessageUserJoined {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Invalid JOIN_ROOM message");
        }

        const characterTextures = message.characterTextures.map(this.mapWokaTextureToResourceDescription.bind(this));
        const companionTexture = message.companionTexture
            ? this.mapCompanionTextureToResourceDescription(message.companionTexture)
            : undefined;

        const variables = new Map<string, unknown>();
        for (const variable of Object.entries(message.variables)) {
            variables.set(variable[0], RoomConnection.unserializeVariable(variable[1]));
        }

        return {
            userId: message.userId,
            name: message.name,
            characterTextures,
            visitCardUrl: message.visitCardUrl,
            position: position,
            availabilityStatus: message.availabilityStatus,
            companionTexture,
            userUuid: message.userUuid,
            outlineColor: message.hasOutline ? message.outlineColor : undefined,
            variables: variables,
            chatID: message.chatID,
            sayMessage: message.sayMessage,
        };
    }

    private toGroupCreatedUpdatedMessage(message: GroupUpdateMessageTsProto): GroupCreatedUpdatedMessageInterface {
        const position = message.position;
        if (position === undefined) {
            throw new Error("Missing position in GROUP_CREATE_UPDATE");
        }

        return {
            groupId: message.groupId,
            position: position,
            groupSize: message.groupSize,
            locked: message.locked,
            userIds: message.userIds,
        };
    }

    /**
     * Sends a message to all observers: we are not going to send anything anymore on streams.
     */
    private completeStreams(): void {
        this._errorMessageStream.complete();
        this._errorScreenMessageStream.complete();
        this._roomJoinedMessageStream.complete();
        this._teleportMessageMessageStream.complete();
        this._worldFullMessageStream.complete();
        this._worldConnectionMessageStream.complete();
        this._tokenExpiredMessageStream.complete();
        this._userMovedMessageStream.complete();
        this._groupUpdateMessageStream.complete();
        this._groupUsersUpdateMessageStream.complete();
        this._groupDeleteMessageStream.complete();
        this._userJoinedMessageStream.complete();
        this._userLeftMessageStream.complete();
        this._refreshRoomMessageStream.complete();
        this._followRequestMessageStream.complete();
        this._followConfirmationMessageStream.complete();
        this._followAbortMessageStream.complete();
        this._itemEventMessageStream.complete();
        this._emoteEventMessageStream.complete();
        this._variableMessageStream.complete();
        this._editMapCommandMessageStream.complete();
        this._playerDetailsUpdatedMessageStream.complete();
        this._websocketErrorStream.complete();
        this._connectionErrorStream.complete();
        this._moveToPositionMessageStream.complete();
        this._addSpaceUserMessageStream.complete();
        this._updateSpaceUserMessageStream.complete();
        this._removeSpaceUserMessageStream.complete();
        this._updateSpaceMetadataMessageStream.complete();
        this._megaphoneSettingsMessageStream.complete();
        this._receivedEventMessageStream.complete();
        this._spacePrivateMessageEvent.complete();
        this._spacePublicMessageEvent.complete();
        this._joinSpaceRequestMessage.complete();
        this._leaveSpaceRequestMessage.complete();
        this._externalModuleMessage.complete();
        this._spaceDestroyedMessage.complete();
    }

    private goToSelectYourWokaScene(): void {
        menuVisiblilityStore.set(false);
        menuIconVisiblilityStore.set(false);
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }

    private goToSelectYourCompanionScene(): void {
        menuVisiblilityStore.set(false);
        menuIconVisiblilityStore.set(false);
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }

    private send(message: ClientToServerMessageTsProto): void {
        const bytes = ClientToServerMessageTsProto.encode(message).finish();

        if (this.socket.readyState === WebSocket.CLOSING || this.socket.readyState === WebSocket.CLOSED) {
            console.warn("Trying to send a message to the server, but the connection is closed. Message: ", message);
            return;
        }

        this.socket.send(bytes);
    }

    private query<T extends Required<QueryMessage>["query"]>(
        message: T,
        options?: {
            signal?: AbortSignal;
            // timeout in milliseconds, default is 15000ms
            timeout?: number;
        }
    ): Promise<Required<AnswerMessage>["answer"]> {
        if (options?.signal?.aborted) {
            return Promise.reject(asError(options?.signal?.reason));
        }
        // Let's add a timeout to avoid waiting forever for an answer that will never come
        // We cannot use AbortSignal.timeout() because it is not supported in Safari 15. Let's do it manually
        const signals: AbortSignal[] = [];
        if (options?.signal) {
            signals.push(options.signal);
        }
        signals.push(
            abortTimeout(options?.timeout ?? 15000, new AbortError("The query took too long and was aborted"))
        );
        const finalSignal = abortAny(signals);

        return new Promise<Required<AnswerMessage>["answer"]>((resolve, reject) => {
            if (!message.$case.endsWith("Query")) {
                throw new Error("Query types are supposed to be suffixed with Query");
            }
            const answerType = message.$case.substring(0, message.$case.length - 5) + "Answer";

            const queryId = this.lastQueryId;
            const onAbort = () => {
                // If we abort AFTER the query was answered, nothing to do
                if (!this.queries.has(queryId)) {
                    return;
                }

                // Let's inform the server that we don't want the answer anymore
                // Note that due to latency, it is possible that the answer will arrive anyway
                // and we will have to ignore it when it arrives
                this.send({
                    message: {
                        $case: "abortQueryMessage",
                        abortQueryMessage: {
                            id: queryId,
                        },
                    },
                });

                // Let's do nothing when the query answer actually finishes
                this.queries.set(queryId, {
                    answerType,
                    resolve: () => { },
                    reject: () => { },
                });
                // After 10 seconds, let's remove the query to avoid memory leaks. If the answer arrives after that, we will have a warning in the console, but it's better than a memory leak.
                setTimeout(() => {
                    this.queries.delete(queryId);
                }, 10000);
                reject(new AbortError());
            };

            finalSignal.addEventListener("abort", onAbort, { once: true });

            this.queries.set(queryId, {
                answerType,
                resolve,
                reject,
            });

            this.send({
                message: {
                    $case: "queryMessage",
                    queryMessage: {
                        id: queryId,
                        query: message,
                    },
                },
            });

            this.lastQueryId++;
        });
    }

    get closed(): boolean {
        return this._closed;
    }
}

</file>
<file path="RoomManager.ts">
import { clearInterval } from "timers";
import type {
    AdminGlobalMessage,
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    BatchToPusherRoomMessage,
    EventRequest,
    EventResponse,
    PingMessage,
    PusherToBackMessage,
    PusherToBackRoomMessage,
    RefreshRoomPromptMessage,
    RoomsList,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    VariableRequest,
    WorldFullWarningToRoomMessage,
} from "@workadventure/messages";
import type { RoomManagerServer } from "@workadventure/messages/src/ts-proto-generated/services";
import type { sendUnaryData, ServerDuplexStream, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import Debug from "debug";
import type { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import * as Sentry from "@sentry/node";
import { socketManager } from "./Services/SocketManager";
import { emitError, emitErrorOnAdminSocket, emitErrorOnRoomSocket } from "./Services/MessageHelpers";
import type { User, UserSocket } from "./Model/User";
import type { GameRoom } from "./Model/GameRoom";
import { Admin } from "./Model/Admin";
import { getMapStorageClient } from "./Services/MapStorageClient";

const debug = Debug("roommanager");

export type AdminSocket = ServerDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
export type RoomSocket = ServerDuplexStream<PusherToBackRoomMessage, BatchToPusherRoomMessage>;
export type VariableSocket = ServerWritableStream<VariableRequest, unknown>;
export type EventSocket = ServerWritableStream<EventRequest, EventResponse>;

// Maximum time to wait for a pong answer to a ping before closing connection.
// Note: PONG_TIMEOUT must be less than PING_INTERVAL
const PONG_TIMEOUT = 70000; // PONG_TIMEOUT is > 1 minute because of Chrome heavy throttling. See: https://docs.google.com/document/d/11FhKHRcABGS4SWPFGwoL6g0ALMqrFKapCk5ZTKKupEk/edit#
const PING_INTERVAL = 80000;

const roomManager = {
<!-- [7d] Back handles join room (line 46) -->
    joinRoom: (call: UserSocket): void => {
        let room: GameRoom | null = null;
        let user: User | null = null;
        let pongTimeoutId: NodeJS.Timeout | undefined;

        call.on("data", (message: PusherToBackMessage) => {
            // On each message, let's reset the pong timeout
            if (pongTimeoutId) {
                clearTimeout(pongTimeoutId);
                pongTimeoutId = undefined;
            }

            (async () => {
                if (!message.message) {
                    console.error("Empty message received");
                    Sentry.captureException(`Empty message received ${JSON.stringify(room)}`);
                    return;
                }

                try {
                    if (room === null || user === null) {
                        if (message.message.$case === "joinRoomMessage") {
<!-- [7e] Delegate to SocketManager (line 68) -->
                            socketManager
<!-- [7f] Handle join room logic (line 69) -->
                                .handleJoinRoom(call, message.message.joinRoomMessage)
                                .then(({ room: gameRoom, user: myUser }) => {
                                    if (call.writable) {
                                        room = gameRoom;
                                        user = myUser;
                                    } else {
                                        // Connection may have been closed before the init was finished, so we have to manually disconnect the user.
                                        // TODO: Remove this debug line
                                        console.info(
                                            "message handleJoinRoom connection have been closed before. Check 'call.writable': ",
                                            call.writable
                                        );
                                        socketManager.leaveRoom(gameRoom, myUser);
                                    }
                                })
                                .catch((e) => {
                                    console.error("message handleJoinRoom error: ", e);
                                    Sentry.captureException(e);
                                    emitError(call, e);
                                });
                        } else if (message.message.$case !== "pingMessage") {
                            throw new Error("The first message sent MUST be of type JoinRoomMessage");
                        }
                    } else {
                        switch (message.message.$case) {
                            case "joinRoomMessage": {
                                throw new Error("Cannot call JoinRoomMessage twice!");
                            }
                            case "userMovesMessage": {
                                socketManager.handleUserMovesMessage(room, user, message.message.userMovesMessage);
                                break;
                            }
                            case "itemEventMessage": {
                                socketManager.handleItemEvent(room, user, message.message.itemEventMessage);
                                break;
                            }
                            case "variableMessage": {
                                await socketManager.handleVariableEvent(room, user, message.message.variableMessage);
                                break;
                            }
                            case "queryMessage": {
                                await socketManager.handleQueryMessage(room, user, message.message.queryMessage);
                                break;
                            }
                            case "abortQueryMessage": {
                                socketManager.handleAbortQueryMessage(room, user, message.message.abortQueryMessage);
                                break;
                            }
                            case "emotePromptMessage": {
                                socketManager.handleEmoteEventMessage(room, user, message.message.emotePromptMessage);
                                break;
                            }
                            case "followRequestMessage": {
                                socketManager.handleFollowRequestMessage(
                                    room,
                                    user,
                                    message.message.followRequestMessage
                                );
                                break;
                            }
                            case "followConfirmationMessage": {
                                socketManager.handleFollowConfirmationMessage(
                                    room,
                                    user,
                                    message.message.followConfirmationMessage
                                );
                                break;
                            }
                            case "followAbortMessage": {
                                socketManager.handleFollowAbortMessage(room, user, message.message.followAbortMessage);
                                break;
                            }
                            case "lockGroupPromptMessage": {
                                socketManager.handleLockGroupPromptMessage(
                                    room,
                                    user,
                                    message.message.lockGroupPromptMessage
                                );
                                break;
                            }
                            case "editMapCommandMessage": {
                                room.forwardEditMapCommandMessage(user, message.message.editMapCommandMessage);
                                break;
                            }
                            case "sendUserMessage": {
                                socketManager.handleSendUserMessage(user, message.message.sendUserMessage);
                                break;
                            }
                            case "banUserMessage": {
                                socketManager.handleBanUserMessage(room, user, message.message.banUserMessage);
                                break;
                            }
                            case "setPlayerDetailsMessage": {
                                socketManager.handleSetPlayerDetails(
                                    room,
                                    user,
                                    message.message.setPlayerDetailsMessage
                                );
                                break;
                            }
                            case "pingMessage": {
                                // Do nothing
                                break;
                            }
                            case "askPositionMessage": {
                                socketManager.handleAskPositionMessage(room, user, message.message.askPositionMessage);
                                break;
                            }
                            case "publicEvent":
                            case "privateEvent": {
                                throw new Error("Cannot reach here, this is handled by the space manager");
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }
                    }
                } catch (e) {
                    console.error(
                        "An error occurred while managing a message of type PusherToBackMessage:" +
                            message.message.$case,
                        e
                    );
                    Sentry.captureException(e);
                    emitError(call, e);
                    call.end();
                }
            })().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        });

        const closeConnection = () => {
            if (user !== null && room !== null) {
                socketManager.leaveRoom(room, user);
            }
            if (pingIntervalId) {
                clearInterval(pingIntervalId);
            }
            if (pongTimeoutId) {
                clearTimeout(pongTimeoutId);
                pongTimeoutId = undefined;
            }
            call.end();
            room = null;
            user = null;
        };

        call.on("end", () => {
            debug("joinRoom ended for user %s", user?.name);
            closeConnection();
        });

        call.on("error", (err: unknown) => {
            // Note: it seems "end" is called before "error" and therefore, user is null
            console.error("An error occurred in joinRoom stream for user", user?.name, ":", err);
            Sentry.captureException(err, {
                user: user ?? undefined,
            });
            closeConnection();
        });

        // Let's set up a ping mechanism
        const serverToClientMessage: ServerToClientMessage = {
            message: {
                $case: "batchMessage",
                batchMessage: {
                    event: "",
                    payload: [
                        {
                            message: {
                                $case: "pingMessage",
                                pingMessage: {},
                            },
                        },
                    ],
                },
            },
        };

        // Ping requests are sent from the server because the setTimeout on the browser is unreliable when the tab is hidden.
        const pingIntervalId = setInterval(() => {
            call.write(serverToClientMessage);

            if (pongTimeoutId) {
                console.warn("Warning, emitting a new ping message before previous pong message was received.");
                clearTimeout(pongTimeoutId);
            }
            const today = new Date();
            pongTimeoutId = setTimeout(() => {
                console.info(
                    "Connection lost with user ",
                    user?.uuid,
                    user?.name,
                    "in room",
                    room?.roomUrl,
                    "at : ",
                    today.toLocaleString("en-GB")
                );
                call.write({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "Connection lost with user. The user did not send a pong message in time. You should never see this message in the browser.",
                        },
                    },
                });
                closeConnection();
            }, PONG_TIMEOUT);
        }, PING_INTERVAL);
    },

    listenRoom(call: RoomSocket): void {
        debug("listenRoom called");
        let roomId: string | null = null;
        const subscribedZones = new Map<string, { x: number; y: number }>();
        // We use this promise to serialize the processing of incoming messages. Only one message is processed at a time.
        let messageProcessingPromise = Promise.resolve();

        call.on("data", (message: PusherToBackRoomMessage) => {
            messageProcessingPromise = messageProcessingPromise
                .then(async () => {
                    if (!message.message) {
                        console.error("Empty message received in listenRoom");
                        Sentry.captureException("Empty message received in listenRoom");
                        return;
                    }

                    try {
                        switch (message.message.$case) {
                            case "initRoomMessage": {
                                const initMessage = message.message.initRoomMessage;
                                roomId = initMessage.roomId;
                                await socketManager.addRoomListener(call, roomId);
                                break;
                            }
                            case "subscribeZoneMessage": {
                                const subscribeMessage = message.message.subscribeZoneMessage;
                                if (roomId === null) {
                                    throw new Error(`subscribeZoneMessage called before initRoomMessage`);
                                }

                                const zoneKey = `${subscribeMessage.x},${subscribeMessage.y}`;
                                if (subscribedZones.has(zoneKey)) {
                                    console.warn(
                                        `WARNING: Double subscription to zone (${subscribeMessage.x},${subscribeMessage.y}) in room ${roomId}. This indicates a bug in the pusher.`
                                    );
                                    return;
                                }

                                subscribedZones.set(zoneKey, { x: subscribeMessage.x, y: subscribeMessage.y });
                                await socketManager.addZoneListener(
                                    call,
                                    roomId,
                                    subscribeMessage.x,
                                    subscribeMessage.y
                                );
                                break;
                            }
                            case "unsubscribeZoneMessage": {
                                const unsubscribeMessage = message.message.unsubscribeZoneMessage;
                                if (roomId === null) {
                                    throw new Error(`unsubscribeZoneMessage called before initRoomMessage`);
                                }

                                const zoneKey = `${unsubscribeMessage.x},${unsubscribeMessage.y}`;
                                if (!subscribedZones.has(zoneKey)) {
                                    console.warn(
                                        `Attempting to unsubscribe from non-subscribed zone (${unsubscribeMessage.x},${unsubscribeMessage.y})`
                                    );
                                    return;
                                }

                                subscribedZones.delete(zoneKey);
                                await socketManager.removeZoneListener(
                                    call,
                                    roomId,
                                    unsubscribeMessage.x,
                                    unsubscribeMessage.y
                                );
                                break;
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }
                    } catch (e) {
                        console.error("An error occurred while managing a listenRoom message:", e);
                        Sentry.captureException(e);
                        emitErrorOnRoomSocket(call, e);
                    }
                })
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e, { tags: { roomId: roomId || "unknown" } });
                });
        });

        const cleanupAllZones = async () => {
            if (roomId !== null) {
                try {
                    await socketManager.removeRoomListener(call, roomId);
                } finally {
                    const theRoomId = roomId;
                    await Promise.all(
                        Array.from(subscribedZones.values()).map((zone) =>
                            socketManager.removeZoneListener(call, theRoomId, zone.x, zone.y)
                        )
                    );
                }
            }
        };

        call.on("cancelled", () => {
            debug("listenRoom cancelled");
            cleanupAllZones()
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                })
                .finally(() => {
                    call.end();
                });
        });

        call.on("close", () => {
            debug("listenRoom connection closed");
            cleanupAllZones().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            console.error("An error occurred in listenRoom stream:", e);
            Sentry.captureException(`An error occurred in listenRoom stream: ${JSON.stringify(e)}`);
            cleanupAllZones()
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                })
                .finally(() => {
                    call.end();
                });
        });
    },

    adminRoom(call: AdminSocket): void {
        const admin = new Admin(call);
        let room: GameRoom | null = null;

        call.on("data", (message: AdminPusherToBackMessage) => {
            try {
                if (!message.message) {
                    console.error("Received an empty message in adminRoom");
                    Sentry.captureException(`Received an empty message in adminRoom ${JSON.stringify(room)}`);
                    return;
                }
                if (room === null) {
                    if (message.message.$case === "subscribeToRoom") {
                        const roomId = message.message.subscribeToRoom;
                        socketManager
                            .handleJoinAdminRoom(admin, roomId)
                            .then((gameRoom: GameRoom) => {
                                room = gameRoom;
                            })
                            .catch((e) => {
                                console.error(e);
                                Sentry.captureException(e);
                            });
                    } else {
                        throw new Error("The first message sent MUST be of type JoinRoomMessage");
                    }
                }
            } catch (e) {
                emitErrorOnAdminSocket(call, e);
                call.end();
            }
        });

        call.on("end", () => {
            debug("joinRoom ended");
            if (room !== null) {
                socketManager.leaveAdminRoom(room, admin);
            }
            call.end();
            room = null;
        });

        call.on("error", (err: Error) => {
            console.error("An error occurred in joinAdminRoom stream:", err);
            Sentry.captureException(`An error occurred in joinAdminRoom stream: ${JSON.stringify(err)}`);
        });
    },
    sendAdminMessage(call: ServerUnaryCall<AdminMessage, Empty>, callback: sendUnaryData<Empty>): void {
        const adminMessage = call.request;
        socketManager
            .sendAdminMessage(adminMessage.roomId, adminMessage.recipientUuid, adminMessage.message, adminMessage.type)
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });

        callback(null, {});
    },
    sendGlobalAdminMessage(call: ServerUnaryCall<AdminGlobalMessage, Empty>, callback: sendUnaryData<Empty>): void {
        throw new Error("Not implemented yet");
        // TODO
        callback(null, {});
    },
    ban(call: ServerUnaryCall<BanMessage, Empty>, callback: sendUnaryData<Empty>): void {
        // FIXME Work in progress
        socketManager.banUser(call.request.roomId, call.request.recipientUuid, call.request.message).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });

        callback(null, {});
    },
    sendAdminMessageToRoom(call: ServerUnaryCall<AdminRoomMessage, Empty>, callback: sendUnaryData<Empty>): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.sendAdminRoomMessage(call.request.roomId, call.request.message, call.request.type).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    sendWorldFullWarningToRoom(
        call: ServerUnaryCall<WorldFullWarningToRoomMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchWorldFullWarning(call.request.roomId).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    sendRefreshRoomPrompt(
        call: ServerUnaryCall<RefreshRoomPromptMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchRoomRefresh(call.request.roomId).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    getRooms(call: ServerUnaryCall<Empty, Empty>, callback: sendUnaryData<RoomsList>): void {
        callback(null, socketManager.getAllRooms());
    },
    ping(call: ServerUnaryCall<PingMessage, Empty>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    readVariable(call, callback) {
        socketManager
            .readVariable(call.request.room, call.request.name)
            .then((value) => {
                callback(null, value === undefined ? undefined : JSON.parse(value));
            })
            .catch((error) => {
                throw error;
            });
    },
    listenVariable(call) {
        socketManager.addVariableListener(call).catch((e) => {
            call.end();
        });

        call.on("cancelled", () => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end();
        });

        call.on("close", () => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end(e);
        });
    },
    saveVariable(call, callback) {
        socketManager
            .saveVariable(call.request.room, call.request.name, JSON.stringify(call.request.value))
            .then(() => {
                callback(null);
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
                throw error;
            });
    },
    handleMapStorageUploadMapDetected(call) {
        /**
         * We are calling the mapstorage connected to this back server and asking to purge the wamUrl from memory.
         * We are not sure this particular mapstorage has this particular WAM map in memory. But since the message
         * is dispatched to all back servers, one of the back servers will be connected to the correct map storage.
         */
        getMapStorageClient().handleClearAfterUpload(
            {
                wamUrl: call.request.wamUrl,
            },
            (err) => {
                if (err) {
                    console.error(err);
                    Sentry.captureException(err);
                    return;
                }
                Promise.all(socketManager.getWorlds().values())
                    .then((gameRooms) => {
                        for (const gameRoom of gameRooms) {
                            if (gameRoom.wamUrl === call.request.wamUrl) {
                                gameRoom.sendRefreshRoomMessageToUsers();
                            }
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        Sentry.captureException(error);
                    });
            }
        );
    },
    /** Dispatch an event to all users in the room */
    dispatchEvent(call, callback) {
        socketManager
            .dispatchEvent(call.request.room, call.request.name, call.request.data, call.request.targetUserIds)
            .then(() => {
                callback(null);
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
                throw error;
            });
    },
    /** Listen to events dispatched in the room */
    listenEvent(call) {
        socketManager.addEventListener(call).catch((e) => {
            call.end();
        });

        call.on("cancelled", () => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end();
        });

        call.on("close", () => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            console.error(e);
            Sentry.captureException(e);
            call.end();
        });
    },
    dispatchGlobalEvent(call, callback) {
        socketManager.dispatchGlobalEvent(call.request.name, call.request.value);
        callback(null);
    },
    /** Dispatch external module event */
    dispatchExternalModuleMessage(call) {
        socketManager.handleExternalModuleMessage(call.request).catch((e) => console.error(e));
    },
} satisfies RoomManagerServer;

export { roomManager };

</file>
<file path="SocketManager.ts">
import crypto from "crypto";
import type {
    ZoneMessage,
    AskPositionMessage,
    BanUserMessage,
    BatchToPusherRoomMessage,
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EmoteEventMessage,
    EmotePromptMessage,
    FollowAbortMessage,
    FollowConfirmationMessage,
    FollowRequestMessage,
    ItemEventMessage,
    ItemStateMessage,
    JitsiJwtAnswer,
    JitsiJwtQuery,
    JoinBBBMeetingAnswer,
    JoinBBBMeetingQuery,
    JoinRoomMessage,
    KickOffMessage,
    LockGroupPromptMessage,
    PlayerDetailsUpdatedMessage,
    QueryMessage,
    RoomDescription,
    RoomsList,
    SendEventQuery,
    SendUserMessage,
    SetPlayerDetailsMessage,
    SubToPusherRoomMessage,
    UpdateMapToNewestWithKeyMessage,
    UpdateSpaceMetadataMessage,
    UpdateSpaceUserMessage,
    UserMovesMessage,
    VariableMessage,
    Zone as ProtoZone,
    PublicEvent,
    PrivateEvent,
    LeaveSpaceMessage,
    JoinSpaceMessage,
    ExternalModuleMessage,
    SyncSpaceUsersMessage,
    SpaceQueryMessage,
    AddSpaceUserToNotifyMessage,
    DeleteSpaceUserToNotifyMessage,
    AbortQueryMessage,
} from "@workadventure/messages";
import {
    AnswerMessage,
    RoomJoinedMessage,
    UserJoinedZoneMessage,
    FilterType,
    AskPositionMessage_AskType,
} from "@workadventure/messages";
import Jwt from "jsonwebtoken";
import BigbluebuttonJs from "bigbluebutton-js";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { WAMSettingsUtils } from "@workadventure/map-editor";
import { z } from "zod";
import type { ServiceError } from "@grpc/grpc-js";
import { asError } from "catch-unknown";
import { GameRoom } from "../Model/GameRoom";
import type { UserSocket } from "../Model/User";
import { User } from "../Model/User";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import { Group } from "../Model/Group";
import { GROUP_RADIUS, MINIMUM_DISTANCE } from "../Enum/EnvironmentVariable";
import type { Movable } from "../Model/Movable";
import type { PositionInterface } from "../Model/PositionInterface";
import type { EventSocket, RoomSocket, VariableSocket } from "../RoomManager";
import type { Zone, ZonePosition } from "../Model/Zone";
import type { Admin } from "../Model/Admin";
import { Space } from "../Model/Space";
import type { SpacesWatcher } from "../Model/SpacesWatcher";
import { eventProcessor } from "../Model/EventProcessorInit";
import { gaugeManager } from "./GaugeManager";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { getMapStorageClient } from "./MapStorageClient";
import { emitError } from "./MessageHelpers";
import { cpuTracker } from "./CpuTracker";

const debug = Debug("socketmanager");

function emitZoneMessage(subMessage: SubToPusherRoomMessage, socket: RoomSocket): void {
    // TODO: should we batch those every 100ms?
    const batchMessage: BatchToPusherRoomMessage = {
        payload: [subMessage],
    };
    socket.write(batchMessage);
}

export class SocketManager {
    /**
<!-- [7b] Get gRPC client for room (line 95) -->
     * Helper to generate a SubToPusherRoomMessage zoneMessage
     */
<!-- [7c] Open bidirectional stream (line 97) -->
    private static toZoneMessage(
        zonePosition: ZonePosition,
        zonePayload: ZoneMessage["message"]
    ): SubToPusherRoomMessage {
        return {
            message: {
                $case: "zoneMessage",
                zoneMessage: {
                    x: zonePosition.x,
                    y: zonePosition.y,
                    message: zonePayload,
                },
            },
        };
    }
    /**
     * List of rooms already loaded (note: never use this directly).
     * It is only here for the very specific getAllRooms case that needs to return all available rooms
     * without waiting for pending rooms.
     */
    private resolvedRooms = new Map<string, GameRoom>();
    // List of rooms (or rooms in process of loading).
    private roomsPromises = new Map<string, PromiseLike<GameRoom>>();

    private spaces = new Map<string, Space>();

    public async handleJoinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        //join new previous room
        const { room, user } = await this.joinRoom(socket, joinRoomMessage);
        const lastCommandId = joinRoomMessage.lastCommandId;
        let commandsToApply: EditMapCommandMessage[] | undefined = undefined;

        if (room.wamUrl) {
            const updateMapToNewestWithKeyMessage: UpdateMapToNewestWithKeyMessage = {
                mapKey: room.wamUrl,
                updateMapToNewestMessage: {
                    commandId: lastCommandId,
                },
            };

            commandsToApply = await new Promise<EditMapCommandMessage[]>((resolve, reject) => {
                getMapStorageClient().handleUpdateMapToNewestMessage(
                    updateMapToNewestWithKeyMessage,
                    (err: ServiceError | null, message: EditMapCommandsArrayMessage) => {
                        if (err) {
                            emitError(user.socket, err);
                            reject(err);
                            return;
                        }
                        resolve(message.editMapCommands);
                    }
                );
            });
        }

        if (!socket.writable) {
            console.warn("Socket was aborted");
            return {
                room,
                user,
            };
        }

        let editMapCommandsArrayMessage: EditMapCommandsArrayMessage | undefined = undefined;
        if (commandsToApply) {
            editMapCommandsArrayMessage = {
                editMapCommands: commandsToApply,
            };
        }

        const itemStateMessage: ItemStateMessage[] = [];
        for (const [itemId, item] of room.getItemsState().entries()) {
            itemStateMessage.push({
                itemId: itemId,
                stateJson: JSON.stringify(item),
            });
        }

        const variables = await room.getVariablesForTags(user.tags);
        const variablesMessage: VariableMessage[] = [];

        for (const [name, value] of variables.entries()) {
            variablesMessage.push({
                name: name,
                value: value,
            });
        }

        const playerVariables = user.getVariables().getVariables();
        const playerVariablesMessage: VariableMessage[] = [];

        for (const [name, value] of playerVariables.entries()) {
            playerVariablesMessage.push({
                name: name,
                value: value.value,
            });
        }

        const roomJoinedMessage: Partial<RoomJoinedMessage> = {
            tag: joinRoomMessage.tag,
            userRoomToken: joinRoomMessage.userRoomToken,
            characterTextures: joinRoomMessage.characterTextures,
            companionTexture: joinRoomMessage.companionTexture,
            canEdit: joinRoomMessage.canEdit,
            editMapCommandsArrayMessage,
            item: itemStateMessage,
            variable: variablesMessage,
            currentUserId: user.id,
            activatedInviteUser: user.activatedInviteUser != undefined ? user.activatedInviteUser : true,
            applications: user.applications ?? [],
            playerVariable: playerVariablesMessage,
            megaphoneSettings: {
                enabled: WAMSettingsUtils.canUseMegaphone(room.wamSettings, user.tags),
                url: WAMSettingsUtils.getMegaphoneUrl(
                    room.wamSettings,
                    room.roomGroup ?? new URL(room.roomUrl).host,
                    room.roomUrl
                ),
            },
        };

        user.write({
            $case: "roomJoinedMessage",
            roomJoinedMessage: RoomJoinedMessage.fromPartial(roomJoinedMessage),
        });

        return {
            room,
            user,
        };
    }

    handleUserMovesMessage(room: GameRoom, user: User, userMoves: UserMovesMessage) {
        const position = userMoves.position;

        // If CPU is high, let's drop messages of users moving (we will only dispatch the final position)
        if (cpuTracker.isOverHeating() && userMoves.position?.moving === true) {
            return;
        }

        if (position === undefined) {
            throw new Error("Position not found in message");
        }
        const viewport = userMoves.viewport;
        if (viewport === undefined) {
            throw new Error("Viewport not found in message");
        }

        // update position in the world
        room.updatePosition(user, ProtobufUtils.toPointInterface(position));
        //room.setViewport(client, client.viewport);
    }

    handleSetPlayerDetails(room: GameRoom, user: User, playerDetailsMessage: SetPlayerDetailsMessage) {
        room.updatePlayerDetails(user, playerDetailsMessage);
    }

    handleItemEvent(room: GameRoom, user: User, itemEventMessage: ItemEventMessage) {
        const itemEvent = ProtobufUtils.toItemEvent(itemEventMessage);

        // Let's send the event without using the SocketIO room.
        // TODO: move this in the GameRoom class.
        for (const user of room.getUsers().values()) {
            user.emitInBatch({
                message: {
                    $case: "itemEventMessage",
                    itemEventMessage,
                },
            });
        }

        room.setItemState(itemEvent.itemId, itemEvent.state);
    }

    handleVariableEvent(room: GameRoom, user: User, variableMessage: VariableMessage): Promise<void> {
        return room.setVariable(variableMessage.name, variableMessage.value, user);
    }

    async readVariable(roomUrl: string, variable: string): Promise<string | undefined> {
        const room = await this.getOrCreateRoom(roomUrl);
        // Info: Admin tag is given to bypass the tags checking
        const variables = await room.getVariablesForTags(undefined);
        return variables.get(variable);
    }

    async saveVariable(roomUrl: string, variable: string, newValue: string): Promise<void> {
        const room = await this.getOrCreateRoom(roomUrl);
        await room.setVariable(variable, newValue, "RoomApi");
    }

    leaveRoom(room: GameRoom, user: User) {
        // leave previous room and world
        try {
            //user leave previous world
            room.leave(user);
            this.cleanupRoomIfEmpty(room);
        } finally {
            clientEventsEmitter.clientLeaveSubject.next({ clientUUid: user.uuid, roomId: room.roomUrl });
        }
    }

    async getOrCreateRoom(roomId: string): Promise<GameRoom> {
        //check and create new room
        let roomPromise = this.roomsPromises.get(roomId);
        if (roomPromise === undefined) {
            roomPromise = GameRoom.create(
                roomId,
                (user: User, group: Group) => {
                    this.joinWebRtcRoom(user, group);
                },
                (user: User, group: Group) => {
                    this.disConnectedUser(user, group);
                },
                MINIMUM_DISTANCE,
                GROUP_RADIUS,
                (thing: Movable, currentZone: ZonePosition, fromZone: Zone | null, listener: RoomSocket) => {
                    this.onZoneEnter(thing, currentZone, fromZone, listener);
                },
                (thing: Movable, currentZone: ZonePosition, position: PositionInterface, listener: RoomSocket) =>
                    this.onClientMove(thing, currentZone, position, listener),
                (thing: Movable, currentZone: ZonePosition, newZone: Zone | null, listener: RoomSocket) =>
                    this.onClientLeave(thing, currentZone, newZone, listener),
                (emoteEventMessage: EmoteEventMessage, currentZone: ZonePosition, listener: RoomSocket) =>
                    this.onEmote(emoteEventMessage, currentZone, listener),
                (currentZone: ZonePosition, groupId: number, listener: RoomSocket) => {
                    this.onLockGroup(currentZone, groupId, listener, roomPromise).catch((e) => {
                        console.error("An error happened while handling a lock group event:", e);
                        Sentry.captureException(e);
                    });
                },
                (
                    currentZone: ZonePosition,
                    playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
                    listener: RoomSocket
                ) => this.onPlayerDetailsUpdated(currentZone, playerDetailsUpdatedMessage, listener),
                (currentZone: ZonePosition, group: Group, listener: RoomSocket) => {
                    this.onUserEntersOrLeavesBubble(currentZone, group, listener);
                }
            )
                .then((gameRoom) => {
                    gaugeManager.incNbRoomGauge();
                    this.resolvedRooms.set(roomId, gameRoom);
                    return gameRoom;
                })
                .catch((e) => {
                    this.roomsPromises.delete(roomId);
                    throw e;
                });
            this.roomsPromises.set(roomId, roomPromise);
        }
        return roomPromise;
    }

    private async joinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        const roomId = joinRoomMessage.roomId;

        const room = await socketManager.getOrCreateRoom(roomId);

        //join world
        const user = await room.join(socket, joinRoomMessage);

        clientEventsEmitter.clientJoinSubject.next({ clientUUid: user.uuid, roomId: roomId });

        return { room, user };
    }

    private onZoneEnter(thing: Movable, currentZone: ZonePosition, fromZone: Zone | null, listener: RoomSocket) {
        if (thing instanceof User) {
            const subMessage = SocketManager.toUserJoinedZoneMessage(thing, currentZone, fromZone);
            emitZoneMessage(subMessage, listener);
            //listener.emitInBatch(subMessage);
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, currentZone, fromZone, thing);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private static toUserJoinedZoneMessage(
        user: User,
        currentZone: ZonePosition,
        fromZone?: Zone | null
    ): SubToPusherRoomMessage {
        if (!Number.isInteger(user.id)) {
            throw new Error(`clientUser.userId is not an integer ${user.id}`);
        }
        const userJoinedZoneMessage: Partial<UserJoinedZoneMessage> = {
            userId: user.id,
            userUuid: user.uuid,
            name: user.name,
            availabilityStatus: user.getAvailabilityStatus(),
            characterTextures: user.characterTextures,
            position: ProtobufUtils.toPositionMessage(user.getPosition()),
            chatID: user.chatID,
        };
        if (fromZone) {
            userJoinedZoneMessage.fromZone = SocketManager.toProtoZone(fromZone);
        }
        if (user.visitCardUrl) {
            userJoinedZoneMessage.visitCardUrl = user.visitCardUrl;
        }
        userJoinedZoneMessage.companionTexture = user.companionTexture;
        const outlineColor = user.getOutlineColor();
        if (outlineColor === undefined) {
            userJoinedZoneMessage.hasOutline = false;
        } else {
            userJoinedZoneMessage.hasOutline = true;
            userJoinedZoneMessage.outlineColor = outlineColor;
        }
        userJoinedZoneMessage.variables = {};
        for (const entry of user.getVariables().getVariables().entries()) {
            const key = entry[0];
            const value = entry[1].value;
            const isPublic = entry[1].isPublic;
            if (isPublic) {
                userJoinedZoneMessage.variables[key] = value;
            }
        }
        userJoinedZoneMessage.sayMessage = user.getSayMessage();

        return SocketManager.toZoneMessage(currentZone, {
            $case: "userJoinedZoneMessage",
            userJoinedZoneMessage: UserJoinedZoneMessage.fromPartial(userJoinedZoneMessage),
        });
    }

    private onClientMove(
        thing: Movable,
        currentZone: ZonePosition,
        position: PositionInterface,
        listener: RoomSocket
    ): void {
        if (thing instanceof User) {
            // Note: the position parameter is not used because the thing has already been User.setPosition
            const posMsg = ProtobufUtils.toPositionMessage(thing.getPosition());
            /*const posMsg = ProtobufUtils.toPositionMessage({
                x: position.x,
                y: position.y,
                direction: "down",
                moving: false,
            });*/
            emitZoneMessage(
                SocketManager.toZoneMessage(currentZone, {
                    $case: "userMovedMessage",
                    userMovedMessage: {
                        userId: thing.id,
                        position: posMsg,
                    },
                }),
                listener
            );
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, currentZone, null, thing);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private onClientLeave(thing: Movable, currentZone: ZonePosition, newZone: Zone | null, listener: RoomSocket) {
        if (thing instanceof User) {
            this.emitUserLeftEvent(listener, currentZone, thing.id, newZone);
        } else if (thing instanceof Group) {
            this.emitDeleteGroupEvent(listener, currentZone, thing.getId(), newZone);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private onUserEntersOrLeavesBubble(currentZone: ZonePosition, group: Group, client: RoomSocket) {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupUsersUpdateMessage",
                groupUsersUpdateMessage: {
                    groupId: group.getId(),
                    userIds: group.getUsers().map((user) => user.id),
                },
            }),
            client
        );
    }

    private onEmote(emoteEventMessage: EmoteEventMessage, currentZone: ZonePosition, client: RoomSocket) {
        // Ideally, we should pass the position of the concerned user
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "emoteEventMessage",
                emoteEventMessage,
            }),
            client
        );
    }

    private async onLockGroup(
        currentZone: ZonePosition,
        groupId: number,
        client: RoomSocket,
        roomPromise: PromiseLike<GameRoom> | undefined
    ): Promise<void> {
        if (!roomPromise) {
            return;
        }
        const group = (await roomPromise).getGroupById(groupId);
        if (!group) {
            return;
        }
        this.emitCreateUpdateGroupEvent(client, currentZone, null, group);
    }

    private onPlayerDetailsUpdated(
        currentZone: ZonePosition,
        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
        client: RoomSocket
    ) {
        // Ideally, we should pass the position of the concerned user
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage,
            }),
            client
        );
    }

    private emitCreateUpdateGroupEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        fromZone: Zone | null,
        group: Group
    ): void {
        const position = group.getPosition();
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupUpdateZoneMessage",
                groupUpdateZoneMessage: {
                    groupId: group.getId(),
                    position: {
                        x: Math.floor(position.x),
                        y: Math.floor(position.y),
                    },
                    groupSize: group.getSize,
                    fromZone: SocketManager.toProtoZone(fromZone),
                    locked: group.isLocked(),
                    userIds: group.getUsers().map((user) => user.id),
                },
            }),
            client
        );
    }

    private emitDeleteGroupEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        groupId: number,
        newZone: Zone | null
    ): void {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupLeftZoneMessage",
                groupLeftZoneMessage: {
                    groupId,
                    toZone: SocketManager.toProtoZone(newZone),
                },
            }),
            client
        );
    }

    private emitUserLeftEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        userId: number,
        newZone: Zone | null
    ): void {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "userLeftZoneMessage",
                userLeftZoneMessage: {
                    userId,
                    toZone: SocketManager.toProtoZone(newZone),
                },
            }),
            client
        );
    }

    private static toProtoZone(zone: Zone | null): ProtoZone | undefined {
        if (zone !== null) {
            return {
                x: zone.x,
                y: zone.y,
            };
        }
        return undefined;
    }

    private joinWebRtcRoom(user: User, group: Group) {
        user.write({
            $case: "joinSpaceRequestMessage",
            joinSpaceRequestMessage: {
                // FIXME: before fixing the fact that spaceName is undefined, let's try to understand why I don't have any info about the user in the error caught above
                spaceName: group.spaceName,
                propertiesToSync: ["cameraState", "microphoneState", "screenSharingState"],
            },
        });
    }

    //disconnect user
    private disConnectedUser(user: User, group: Group) {
        user.write({
            $case: "leaveSpaceRequestMessage",
            leaveSpaceRequestMessage: {
                spaceName: group.spaceName,
            },
        });
    }

    public getWorlds(): Map<string, PromiseLike<GameRoom>> {
        return this.roomsPromises;
    }

    public async handleQueryMessage(gameRoom: GameRoom, user: User, queryMessage: QueryMessage): Promise<void> {
        if (!queryMessage.query) {
            console.error("QueryMessage has no query");
            Sentry.captureException("QueryMessage has no query");
            return;
        }
        const queryCase = queryMessage.query.$case;
        const answerMessage: Partial<AnswerMessage> = {
            id: queryMessage.id,
        };
        const abortController = new AbortController();
        user.queryMessageAbortControllers.set(queryMessage.id, abortController);

        try {
            switch (queryCase) {
                case "jitsiJwtQuery": {
                    const answer = await this.handleQueryJitsiJwtMessage(
                        gameRoom,
                        user,
                        queryMessage.query.jitsiJwtQuery
                    );
                    answerMessage.answer = {
                        $case: "jitsiJwtAnswer",
                        jitsiJwtAnswer: answer,
                    };
                    break;
                }
                case "joinBBBMeetingQuery": {
                    const answer = await this.handleJoinBBBMeetingMessage(
                        gameRoom,
                        user,
                        queryMessage.query.joinBBBMeetingQuery
                    );
                    answerMessage.answer = {
                        $case: "joinBBBMeetingAnswer",
                        joinBBBMeetingAnswer: answer,
                    };
                    break;
                }
                case "sendEventQuery": {
                    // TODO: in the future, if the event system is abused, we can throttle message by user id, here.
                    this.handleSendEventQuery(gameRoom, user, queryMessage.query.sendEventQuery);
                    answerMessage.answer = {
                        $case: "sendEventAnswer",
                        sendEventAnswer: {},
                    };
                    break;
                }
                case "iceServersQuery":
                case "embeddableWebsiteQuery":
                case "roomTagsQuery":
                case "roomsFromSameWorldQuery":
                case "searchMemberQuery":
                case "getMemberQuery":
                case "searchTagsQuery":
                case "chatMembersQuery":
                case "oauthRefreshTokenQuery":
                case "joinSpaceQuery":
                case "leaveSpaceQuery":
                case "mapStorageJwtQuery":
                case "enterChatRoomAreaQuery": {
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = queryCase;
                }
            }
        } catch (e) {
            const error = asError(e);
            console.error("An error happened while answering a query:", e);
            Sentry.captureException(`An error happened while answering a query: ${error.message}`, {
                extra: { queryMessage, userId: user.id, userUuid: user.uuid, roomId: gameRoom.roomUrl },
            });
            answerMessage.answer = {
                $case: "error",
                error: {
                    message: error.message,
                },
            };
        } finally {
            user.queryMessageAbortControllers.delete(queryMessage.id);
        }

        user.write({
            $case: "answerMessage",
            answerMessage: AnswerMessage.fromPartial(answerMessage),
        });
    }

    public handleAbortQueryMessage(room: GameRoom, user: User, abortQueryMessage: AbortQueryMessage) {
        const controller = user.queryMessageAbortControllers.get(abortQueryMessage.id);
        if (controller) {
            controller.abort();
        }
    }

    public async handleQueryJitsiJwtMessage(
        gameRoom: GameRoom,
        user: User,
        queryJitsiJwtMessage: JitsiJwtQuery
    ): Promise<JitsiJwtAnswer> {
        const jitsiRoom = queryJitsiJwtMessage.jitsiRoom;
        const jitsiSettings = gameRoom.getJitsiSettings();

        if (jitsiSettings === undefined || !jitsiSettings.secret) {
            throw new Error("You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi.");
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            const moderatorTag = await gameRoom.getModeratorTagForJitsiRoom(jitsiRoom);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            }
        }

        const jwt = Jwt.sign(
            {
                aud: "jitsi",
                context: {
                    user: {
                        id: user.id,
                        name: user.name,
                    },
                    features: {
                        livestreaming: isAdmin,
                        recording: isAdmin,
                    },
                },
                iss: jitsiSettings.iss,
                sub: jitsiSettings.url,
                room: jitsiRoom,
                moderator: isAdmin,
            },
            jitsiSettings.secret,
            {
                expiresIn: "1d",
                algorithm: "HS256",
                header: {
                    alg: "HS256",
                    typ: "JWT",
                },
            }
        );

        return {
            jwt,
            url: jitsiSettings.url,
        };
    }

    public async handleJoinBBBMeetingMessage(
        gameRoom: GameRoom,
        user: User,
        joinBBBMeetingQuery: JoinBBBMeetingQuery
    ): Promise<JoinBBBMeetingAnswer> {
        const meetingId = joinBBBMeetingQuery.meetingId;
        const localMeetingId = joinBBBMeetingQuery.localMeetingId;
        const meetingName = joinBBBMeetingQuery.meetingName;
        const bbbSettings = gameRoom.getBbbSettings();

        if (bbbSettings === undefined) {
            throw new Error(
                "Unable to join the conference because either " +
                    "the BBB_URL or BBB_SECRET environment variables are not set."
            );
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            const moderatorTag = await gameRoom.getModeratorTagForBbbMeeting(localMeetingId);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            } else if (moderatorTag === undefined) {
                // If the bbbMeetingAdminTag is not set, everyone is a moderator.
                isAdmin = true;
            }
        }

        if (bbbSettings === undefined || !bbbSettings.secret) {
            throw new Error("You must set the SECRET_BBB_KEY key to the secret to generate JWT tokens for BBB.");
        }

        const api = BigbluebuttonJs.api(bbbSettings.url, bbbSettings.secret);
        // It seems bbb-api is limiting password length to 50 chars
        const maxPWLen = 50;
        const attendeePW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`attendee-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);
        const moderatorPW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`moderator-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);

        // This is idempotent, so we call it on each join in order to be sure that the meeting exists.
        const createOptions = { attendeePW, moderatorPW, record: true };
        const createURL = api.administration.create(meetingName, meetingId, createOptions);
        await BigbluebuttonJs.http(createURL);

        const joinParams: Record<string, string> = {};

        // XXX: figure out how to know if the user has admin status and use the moderatorPW
        // in that case
        const clientURL = api.administration.join(user.name, meetingId, isAdmin ? moderatorPW : attendeePW, {
            ...joinParams,
            userID: user.id,
            joinViaHtml5: true,
        });
        debug(
            `User "${user.name}" (${user.uuid}) joined the BBB meeting "${meetingName}" as ${
                isAdmin ? "Admin" : "Participant"
            }.`
        );

        return {
            meetingId,
            clientURL,
        };
    }

    public handleSendUserMessage(user: User, sendUserMessageToSend: SendUserMessage) {
        user.write({
            $case: "sendUserMessage",
            sendUserMessage: sendUserMessageToSend,
        });
    }

    public handleBanUserMessage(room: GameRoom, user: User, banUserMessageToSend: BanUserMessage) {
        user.write({
            $case: "sendUserMessage",
            sendUserMessage: banUserMessageToSend,
        });

        setTimeout(() => {
            // Let's leave the room now.
            room.leave(user);
            // Let's close the connection when the user is banned.
            user.socket.end();
        }, 10000);
    }

    public async addZoneListener(call: RoomSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In addZoneListener, could not find room with id '" + roomId + "'");
        }

        const things = room.addZoneListener(call, x, y);

        const batchMessage: BatchToPusherRoomMessage = {
            payload: [],
        };

        for (const thing of things) {
            if (thing instanceof User) {
                const subMessage = SocketManager.toUserJoinedZoneMessage(thing, { x, y });
                batchMessage.payload.push(subMessage);
            } else if (thing instanceof Group) {
                const position = thing.getPosition();
                batchMessage.payload.push(
                    SocketManager.toZoneMessage(
                        { x, y },
                        {
                            $case: "groupUpdateZoneMessage",
                            groupUpdateZoneMessage: {
                                groupId: thing.getId(),
                                position: ProtobufUtils.toPointMessage(position),
                                groupSize: thing.getSize,
                                fromZone: undefined,
                                locked: thing.isLocked(),
                                userIds: thing.getUsers().map((user) => user.id),
                            },
                        }
                    )
                );
            } else {
                console.error("Unexpected type for Movable returned by setViewport");
                Sentry.captureException("Unexpected type for Movable returned by setViewport");
            }
        }

        call.write(batchMessage);
    }

    async removeZoneListener(call: RoomSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.warn("In removeZoneListener, could not find room with id '" + roomId + "'");
            return;
        }

        room.removeZoneListener(call, x, y);
        this.cleanupRoomIfEmpty(room);
    }

    async addRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.getOrCreateRoom(roomId);
        if (!room) {
            throw new Error("In addRoomListener, could not find room with id '" + roomId + "'");
        }

        room.addRoomListener(call);

        /*const batchMessage = new BatchToPusherRoomMessage();

        call.write(batchMessage);*/
    }

    async removeRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In removeRoomListener, could not find room with id '" + roomId + "'");
        }

        room.removeRoomListener(call);
    }

    async addVariableListener(call: VariableSocket) {
        const room = await this.getOrCreateRoom(call.request.room);
        if (!room) {
            throw new Error("In addVariableListener, could not find room with id '" + call.request.room + "'");
        }

        room.addVariableListener(call);
    }

    async removeVariableListener(call: VariableSocket) {
        const room = await this.roomsPromises.get(call.request.room);
        if (!room) {
            throw new Error("In removeVariableListener, could not find room with id '" + call.request.room + "'");
        }

        room.removeVariableListener(call);

        this.cleanupRoomIfEmpty(room);
    }

    public async handleJoinAdminRoom(admin: Admin, roomId: string): Promise<GameRoom> {
        const room = await socketManager.getOrCreateRoom(roomId);

        room.adminJoin(admin);

        return room;
    }

    public leaveAdminRoom(room: GameRoom, admin: Admin) {
        room.adminLeave(admin);
        this.cleanupRoomIfEmpty(room);
    }

    private cleanupRoomIfEmpty(room: GameRoom): void {
        if (room.isEmpty()) {
            this.roomsPromises.delete(room.roomUrl);
            const deleted = this.resolvedRooms.delete(room.roomUrl);
            if (deleted) {
                gaugeManager.decNbRoomGauge();
            }
            debug('Room is empty. Deleting room "%s"', room.roomUrl);
        }
    }

    public async sendAdminMessage(roomId: string, recipientUuid: string, message: string, type: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In sendAdminMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In sendAdminMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            recipient.write({
                $case: "sendUserMessage",
                sendUserMessage: {
                    message,
                    type,
                },
            });
        }
    }

    public async banUser(roomId: string, recipientUuid: string, message: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In banUser, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In banUser, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In banUser, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In banUser, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            // Let's leave the room now.
            room.leave(recipient);

            // Let's close the connection when the user is banned.
            recipient.write({
                $case: "banUserMessage",
                banUserMessage: {
                    message,
                    type: "banned",
                },
            });
            recipient.socket.end();
        }
    }

    async sendAdminRoomMessage(roomId: string, message: string, type: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In sendAdminRoomMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminRoomMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "sendUserMessage",
                sendUserMessage: {
                    message,
                    type,
                },
            });
        });
    }

    async dispatchWorldFullWarning(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In dispatchWorldFullWarning, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In dispatchWorldFullWarning, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "worldFullWarningMessage",
                worldFullWarningMessage: {},
            });
        });
    }

    async dispatchRoomRefresh(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            return;
        }

        const versionNumber = await room.incrementVersion();
        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "refreshRoomMessage",
                refreshRoomMessage: {
                    roomId,
                    versionNumber,
                },
            });
        });
    }

    handleEmoteEventMessage(room: GameRoom, user: User, emotePromptMessage: EmotePromptMessage) {
        room.emitEmoteEvent(user, {
            emote: emotePromptMessage.emote,
            actorUserId: user.id,
        });
    }

    handleFollowRequestMessage(room: GameRoom, user: User, message: FollowRequestMessage) {
        room.sendToOthersInGroupIncludingUser(user, {
            message: {
                $case: "followRequestMessage",
                followRequestMessage: message,
            },
        });
    }

    handleFollowConfirmationMessage(room: GameRoom, user: User, message: FollowConfirmationMessage) {
        const leader = room.getUserById(message.leader);
        if (!leader) {
            const message = `Could not follow user "{message.getLeader()}" in room "{room.roomUrl}".`;
            console.info(message, "Maybe the user just left.");
            return;
        }

        // By security, we look at the group leader. If the group leader is NOT the leader in the message,
        // everybody should stop following the group leader (to avoid having 2 group leaders)
        if (user?.group?.leader && user?.group?.leader !== leader) {
            user?.group?.leader?.stopLeading();
        }

        leader.addFollower(user);
    }

    handleFollowAbortMessage(room: GameRoom, user: User, message: FollowAbortMessage) {
        const leader = room.getUserById(message.leader);
        if (user.id === message.leader) {
            leader?.stopLeading();
        } else {
            // Forward message
            leader?.delFollower(user);
        }
    }

    handleLockGroupPromptMessage(room: GameRoom, user: User, message: LockGroupPromptMessage) {
        const group = user.group;
        if (!group) {
            return;
        }
        group.lock(message.lock);
        room.emitLockGroupEvent(user, group.getId());
    }

    handleUpdateMapToNewestMessage(room: GameRoom, user: User, message: UpdateMapToNewestWithKeyMessage) {
        getMapStorageClient().handleUpdateMapToNewestMessage(
            message,
            (err: ServiceError | null, message: EditMapCommandsArrayMessage) => {
                if (err) {
                    emitError(user.socket, err);
                    throw err;
                }
                const commands = message.editMapCommands;
                for (const editMapCommandMessage of commands) {
                    user.emitInBatch({
                        message: {
                            $case: "editMapCommandMessage",
                            editMapCommandMessage,
                        },
                    });
                }
            }
        );
    }

    getAllRooms(): RoomsList {
        const roomsList: RoomDescription[] = [];

        for (const room of this.resolvedRooms.values()) {
            const roomDescription = {
                roomId: room.roomUrl,
                nbUsers: room.getUsers().size,
            };

            roomsList.push(roomDescription);
        }

        return {
            roomDescription: roomsList,
        };
    }

    handleAskPositionMessage(room: GameRoom, user: User, askPositionMessage: AskPositionMessage) {
        if (room) {
            const userToJoin = room.getUserByUuid(askPositionMessage.userIdentifier);
            const position = userToJoin?.getPosition();
            if (position && askPositionMessage.askType === AskPositionMessage_AskType.MOVE) {
                user.write({
                    $case: "moveToPositionMessage",
                    moveToPositionMessage: {
                        position: ProtobufUtils.toPositionMessage(position),
                    },
                });
            } else if (userToJoin && position && askPositionMessage.askType === AskPositionMessage_AskType.LOCATE) {
                user.write({
                    $case: "locatePositionMessage",
                    locatePositionMessage: {
                        position: ProtobufUtils.toPositionMessage(position),
                        userId: userToJoin.id,
                    },
                });
            }

            if (room.isEmpty()) {
                // TODO delete room;
            }
        }
    }

    handleJoinSpaceMessage(pusher: SpacesWatcher, joinSpaceMessage: JoinSpaceMessage) {
        let space: Space | undefined = this.spaces.get(joinSpaceMessage.spaceName);
        if (!space) {
            if (joinSpaceMessage.filterType === FilterType.UNRECOGNIZED) {
                throw new Error("Unrecognized filter type when joining space");
            }
            space = new Space(
                joinSpaceMessage.spaceName,
                joinSpaceMessage.filterType,
                eventProcessor,
                joinSpaceMessage.propertiesToSync,
                joinSpaceMessage.world
            );
            this.spaces.set(joinSpaceMessage.spaceName, space);
            clientEventsEmitter.newSpaceSubject.next(space);
        }

        if (space.filterType !== joinSpaceMessage.filterType) {
            throw new Error("Filter type mismatch when joining space");
        }

        pusher.watchSpace(space.name);
        try {
            space.addWatcher(pusher);
        } catch (e) {
            pusher.unwatchSpace(space.name);
            throw e;
        }
    }

    handleLeaveSpaceMessage(pusher: SpacesWatcher, leaveSpaceMessage: LeaveSpaceMessage) {
        const space: Space | undefined = this.spaces.get(leaveSpaceMessage.spaceName);
        if (!space) {
            throw new Error(
                `In handleLeaveSpaceMessage, can't unwatch space ${leaveSpaceMessage.spaceName}, space not found`
            );
        }
        this.removeSpaceWatcher(pusher, space);
    }

    handleUnwatchAllSpaces(pusher: SpacesWatcher) {
        pusher.spacesWatched.forEach((spaceName) => {
            const space = this.spaces.get(spaceName);
            if (!space) {
                console.error(`In handleUnwatchAllSpaces, can't unwatch space ${spaceName}, space not found`);
                return;
            }
            this.removeSpaceWatcher(pusher, space);
        });
    }

    private removeSpaceWatcher(watcher: SpacesWatcher, space: Space) {
        watcher.unwatchSpace(space.name);
        space.removeWatcher(watcher);

        // If there are no more watchers, we delete the space
        if (space.canBeDeleted()) {
            debug("[space] Space %s => deleted", space.name);
            this.spaces.delete(space.name);
            clientEventsEmitter.deleteSpaceSubject.next(space);
        }
    }

    handleUpdateSpaceUserMessage(pusher: SpacesWatcher, updateSpaceUserMessage: UpdateSpaceUserMessage) {
        const updateMask = updateSpaceUserMessage.updateMask;
        if (!updateSpaceUserMessage.user || !updateMask) {
            console.error("UpdateSpaceUserMessage has no user or updateMask");
            Sentry.captureException("UpdateSpaceUserMessage has no user or updateMask");
            return;
        }

        const space = this.spaces.get(updateSpaceUserMessage.spaceName);
        if (!space) {
            console.error("Could not find space to update in UpdateSpaceUserMessage");
            Sentry.captureException("Could not find space to update in UpdateSpaceUserMessage");
            return;
        }

        space.updateUser(pusher, updateSpaceUserMessage.user, updateMask);
    }

    handleUpdateSpaceMetadataMessage(pusher: SpacesWatcher, updateSpaceMetadataMessage: UpdateSpaceMetadataMessage) {
        const space = this.spaces.get(updateSpaceMetadataMessage.spaceName);

        const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(updateSpaceMetadataMessage.metadata));
        if (!isMetadata.success) {
            console.error("Metadata is not a valid json object");
            return;
        }

        if (space) {
            space.updateMetadata(pusher, isMetadata.data);
        }
    }

    handleKickSpaceUserMessage(pusher: SpacesWatcher, kickUserMessage: KickOffMessage) {
        const space = this.spaces.get(kickUserMessage.spaceName);
        if (!space) return;
        pusher.write({
            message: {
                $case: "kickOffMessage",
                kickOffMessage: {
                    spaceName: kickUserMessage.spaceName,
                    userId: kickUserMessage.userId,
                },
            },
        });
    }

    handleSyncSpaceUsersMessage(pusher: SpacesWatcher, syncSpaceUsersMessage: SyncSpaceUsersMessage) {
        const { spaceName, users } = syncSpaceUsersMessage;
        const space = this.spaces.get(spaceName);
        if (!space) {
            console.error("Could not find space to sync users in SyncSpaceUsersMessage");
            Sentry.captureException("Could not find space to sync users in SyncSpaceUsersMessage");
            return;
        }
        space.syncUsersFromPusher(pusher, users);
    }

    handlePublicEvent(pusher: SpacesWatcher, publicEvent: PublicEvent) {
        const space = this.spaces.get(publicEvent.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${publicEvent.spaceName} to dispatch public event`);
        }
        space.dispatchPublicEvent(publicEvent);
    }

    handlePrivateEvent(pusher: SpacesWatcher, privateEvent: PrivateEvent) {
        const space = this.spaces.get(privateEvent.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${privateEvent.spaceName} to dispatch public event`);
        }
        space.dispatchPrivateEvent(privateEvent);
    }

    private handleSendEventQuery(gameRoom: GameRoom, user: User, sendEventQuery: SendEventQuery) {
        gameRoom.dispatchEvent(sendEventQuery.name, sendEventQuery.data, user.id, sendEventQuery.targetUserIds);
    }

    async dispatchEvent(roomUrl: string, name: string, value: unknown, targetUserIds: number[]): Promise<void> {
        const roomPromise = this.roomsPromises.get(roomUrl);
        if (!roomPromise) {
            // The room does not exist. No need to instantiate it, there is no one in.
            return Promise.resolve();
        }
        const room = await roomPromise;
        room.dispatchEvent(name, value, "RoomApi", targetUserIds);
    }

    async addEventListener(call: EventSocket) {
        const room = await this.getOrCreateRoom(call.request.room);
        if (!room) {
            throw new Error("In addEventListener, could not find room with id '" + call.request.room + "'");
        }

        room.addEventListener(call);
    }

    async removeEventListener(call: EventSocket) {
        const room = await this.roomsPromises.get(call.request.room);
        if (!room) {
            throw new Error("In removeEventListener, could not find room with id '" + call.request.room + "'");
        }

        room.removeEventListener(call);

        this.cleanupRoomIfEmpty(room);
    }

    dispatchGlobalEvent(name: string, value: unknown) {
        for (const room of this.resolvedRooms.values()) {
            room.dispatchEvent(name, value, "RoomApi", []);
        }
    }

    // TODO: connect this.
    handleKickOffUserMessage(user: User, userKickedUuid: string) {
        const group = user.group;
        if (!group) {
            return;
        }
        if (!user.tags.includes("admin")) {
            return;
        }
        const usersKiked = group.getUsers().filter((user) => user.uuid === userKickedUuid);
        if (usersKiked.length === 0) return;
        for (const userKiked of usersKiked) {
            group.leave(userKiked);
        }
        // TODO fixme to notify only user kiked
        group.setOutOfBounds(true);
    }

    async handleExternalModuleMessage(externalModuleMessage: ExternalModuleMessage) {
        if (!externalModuleMessage.roomId) {
            console.error("externalModuleMessage has no roomId. This feature isn't implemented yet.");
            return;
        }
        if (!externalModuleMessage.recipientUuid) {
            console.error("externalModuleMessage has no recipientUuid. This feature isn't implemented yet.");
            return;
        }
        const roomId = externalModuleMessage.roomId;
        const recipientUuid = externalModuleMessage.recipientUuid;

        const room = await this.roomsPromises.get(externalModuleMessage.roomId);
        if (!room) {
            console.info(
                "In handleExternalModuleMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.info(
                "In handleExternalModuleMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            recipient.socket.write({
                message: {
                    $case: "externalModuleMessage",
                    externalModuleMessage: externalModuleMessage,
                },
            });
        }
    }

    /*
     * This function is used to close the connection of the space. for testing purpose.
     */
    closeSpaceConnection(spaceName: string) {
        const space = this.spaces.get(spaceName);
        if (!space) {
            throw new Error(`Space ${spaceName} not found`);
        }
        space.closeAllWatcherConnections();
        this.spaces.delete(spaceName);
        clientEventsEmitter.deleteSpaceSubject.next(space);
    }

    handleSpaceQueryMessage(pusher: SpacesWatcher, spaceQueryMessage: SpaceQueryMessage) {
        const space = this.spaces.get(spaceQueryMessage.spaceName);

        if (!space) {
            throw new Error(`Could not find space ${spaceQueryMessage.spaceName} to handle query`);
        }

        if (!spaceQueryMessage.query) {
            console.error("SpaceQueryMessage has no query");
            Sentry.captureException("SpaceQueryMessage has no query");
            return;
        }

        try {
            const answer = space.handleQuery(pusher, spaceQueryMessage);
            pusher.write({
                message: {
                    $case: "spaceAnswerMessage",
                    spaceAnswerMessage: {
                        id: spaceQueryMessage.id,
                        answer: answer.answer,
                        spaceName: spaceQueryMessage.spaceName,
                    },
                },
            });
        } catch (e) {
            console.error("Error while handling space query", e);
            Sentry.captureException("Error while handling space query");
            return;
        }
    }

    handleAddSpaceUserToNotifyMessage(pusher: SpacesWatcher, addSpaceUserToNotifyMessage: AddSpaceUserToNotifyMessage) {
        const space = this.spaces.get(addSpaceUserToNotifyMessage.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${addSpaceUserToNotifyMessage.spaceName} to add user to notify`);
        }
        if (!addSpaceUserToNotifyMessage.user) {
            throw new Error(`User to add to notify is undefined in AddSpaceUserToNotifyMessage`);
        }
        space.addUserToNotify(pusher, addSpaceUserToNotifyMessage.user);
    }

    handleDeleteSpaceUserToNotifyMessage(
        pusher: SpacesWatcher,
        deleteSpaceUserToNotifyMessage: DeleteSpaceUserToNotifyMessage
    ) {
        const space = this.spaces.get(deleteSpaceUserToNotifyMessage.spaceName);
        if (!space) {
            throw new Error(
                `Could not find space ${deleteSpaceUserToNotifyMessage.spaceName} to delete user to notify`
            );
        }
        if (!deleteSpaceUserToNotifyMessage.user) {
            throw new Error(`User to delete from notify is undefined in DeleteSpaceUserToNotifyMessage`);
        }
        space.deleteUserToNotify(pusher, deleteSpaceUserToNotifyMessage.user);
    }
}

export const socketManager = new SocketManager();

</file>
<file path="app.ts">
import { app, BrowserWindow, globalShortcut } from "electron";

import { createWindow, getWindow } from "./window";
import { createTray } from "./tray";
import autoUpdater from "./auto-updater";
import { updateAutoLaunch } from "./auto-launch";
import ipc from "./ipc";
import settings from "./settings";
import { setLogLevel } from "./log";
import "./serve"; // prepare custom url scheme
import { loadShortcuts } from "./shortcuts";

async function init() {
    const appLock = app.requestSingleInstanceLock();

    if (!appLock) {
        console.log("Application already running");
        app.quit();
        return;
    }

    app.on("second-instance", () => {
        // re-create window if closed
        void createWindow();

        const mainWindow = getWindow();

        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }

            mainWindow.focus();
        }
    });

    // This method will be called when Electron has finished loading
    await app.whenReady().then(async () => {
        await settings.init();

        setLogLevel(settings.get("log_level") || "info");

        await autoUpdater.init();

        // enable auto launch
        await updateAutoLaunch();

        // load ipc handler
        ipc();

        // Don't show the app in the doc
        // if (app.dock) {
        //   app.dock.hide();
        // }

        await createWindow();
        createTray();

        loadShortcuts();
    });

    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
        // macOs users have to press Cmd + Q to stop the app
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            void createWindow();
        }
    });

    app.on("quit", () => {
        // TODO
    });

    app.on("will-quit", () => {
        globalShortcut.unregisterAll();
<!-- [6a] Initialize WebSocket controller (line 85) -->
    });
}

export default {
    init,
};

</file>
<file path="index.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="src-ui/icons/icon-512x512.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WorkAdventure MapStorage</title>
</head>
<body>
<div id="app"></div>
<script type="module" src="src-ui/main.ts"></script>
</body>
</html>

</file>
<file path="package.json">
{
  "name": "@workadventure/generate-env-docs",
  "version": "1.0.0",
  "private": true,
  "description": "Generate environment variables documentation from Zod schemas",
  "scripts": {
    "generate": "tsx src/generate.ts",
<!-- [1e] Back service dev command (line 8) -->
    "check": "tsx src/check.ts"
  },
  "dependencies": {
    "@types/node": "^18.8.1",
    "@workadventure/messages": "1.0.0",
    "@workadventure/shared-utils": "1.0.0",
    "tsx": "^4.7.1",
    "typescript": "^5.7.2",
    "zod": "^3.23.8"
<!-- [1a] Main dev script (line 17) -->
  }
<!-- [1b] Frontend Vite server (line 18) -->
}
<!-- [1c] Pusher service with hot-reload (line 19) -->

</file>
<file path="server.ts">
// lib/server.ts
import * as Sentry from "@sentry/node";
import App from "./App";
import {
    ENABLE_TELEMETRY,
    SENTRY_DSN,
    SENTRY_RELEASE,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
} from "./Enum/EnvironmentVariable";
import { telemetryService } from "./Services/TelemetryService";

if (ENABLE_TELEMETRY) {
    telemetryService.startTelemetry().catch((e) => console.error(e));
}

// Sentry integration
if (SENTRY_DSN != undefined) {
    try {
        const sentryOptions: Sentry.NodeOptions = {
            dsn: SENTRY_DSN,
            release: SENTRY_RELEASE,
            environment: SENTRY_ENVIRONMENT,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
            attachStacktrace: true,
        };

        Sentry.init(sentryOptions);
        console.info("Sentry initialized");
    } catch (e) {
        console.error("Error while initializing Sentry", e);
    }
}

<!-- [3a] Back service entry point (line 35) -->
(async () => {
<!-- [3b] Initialize capabilities (line 36) -->
    await App.init();
    App.listen();
<!-- [3d] Start gRPC server (line 38) -->
    App.grpcListen();
})().catch((e) => {
    console.error(e);
    Sentry.captureException(e);
});

</file>
<file path="svelte.ts">
import "phaser";
import "./front/style/index.scss";

<!-- [4d] Import root Svelte component (line 4) -->
import App from "./front/Components/App.svelte";
import { HtmlUtils } from "./front/WebRtc/HtmlUtils";
import { e2eHooks } from "./front/Utils/E2EHooks";

// Initialize E2E hooks
declare global {
    interface Window {
        e2eHooks: typeof e2eHooks;
    }
}
window.e2eHooks = e2eHooks;

<!-- [4e] Instantiate Svelte app (line 16) -->
const app = new App({
    target: HtmlUtils.getElementByIdOrFail("app"),
});

export default app;

</file>
<file path="vite.config.mts">
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
<!-- [4a] Vite server host (line 17) -->
            host: "0.0.0.0",
<!-- [4b] Vite server port (line 18) -->
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
                plugins: [],
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

</file>
</files>
```

---

*Exported from Code Map on 28.12.2025*