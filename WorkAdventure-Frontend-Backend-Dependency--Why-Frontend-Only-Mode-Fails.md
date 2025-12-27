# WorkAdventure Frontend-Backend Dependency: Why Frontend-Only Mode Fails

> 📅 **Created:** 27 декабря 2025 г. в 16:21

## Overview

This map traces why WorkAdventure frontend cannot run standalone: the frontend depends on the Pusher backend server to inject configuration via window.env **[4b]** and to serve the /map API endpoint **[5a]** that provides map metadata **[2a]**. Without the Pusher server running, the frontend fails at initialization **[1c]** when trying to fetch map details **[2f]**.

## Table of Contents

1. [Frontend Initialization Flow](#1-frontend-initialization-flow)
2. [Frontend /map API Request Flow](#2-frontend-map-api-request-flow)
3. [Pusher Backend Server Startup](#3-pusher-backend-server-startup)
4. [Pusher HTML Serving with window.env Injection](#4-pusher-html-serving-with-windowenv-injection)
5. [Pusher /map Endpoint Handler](#5-pusher-map-endpoint-handler)

---

## 1. Frontend Initialization Flow

> Frontend system (play/src/front/): Entry point that triggers game initialization and connection setup.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's frontend is a **Phaser-based game client** that needs to know which map to load, authentication requirements, and server configuration before it can start. The problem: this metadata isn't hardcoded—it depends on which room URL the user visits and what the administrator has configured. The frontend must **fetch this information from the Pusher backend** during initialization, which is why running the frontend standalone fails.


#### Details


##### Initialization Sequence

The frontend starts in **EntryScene**, a Phaser scene that acts as the entry point **[1a]**. It immediately delegates to **GameManager** to initialize the game state **[1b]**, which in turn asks **ConnectionManager** to establish the connection to the game world.


##### The Critical Room Creation Step

ConnectionManager creates a **Room instance** by calling `Room.createRoom()` **[1c]**. This is where the frontend-backend dependency becomes unavoidable. The Room object represents a game room/map, but it needs to know:

- The actual map file URL to load
- Whether authentication is mandatory
- Custom branding (logos, colors)
- Feature flags (chat enabled, map editor access, etc.)


##### Fetching Map Details

To get this information, Room immediately calls `getMapDetail()` **[1d]**, which makes an **HTTP GET request to `/map` endpoint** on the Pusher server. The request includes the room URL and authentication token. Without a running Pusher backend, this request fails with a connection error or returns invalid data, causing the exact error you're seeing: **"Data received by the /map endpoint of the Pusher is not in a valid format."**


##### Why This Architecture

This design allows WorkAdventure to be **multi-tenant**: different rooms can have different maps, authentication requirements, and configurations, all managed by the backend. The frontend is intentionally thin—it discovers its configuration at runtime rather than having it baked in.

</details>


### Frontend Initialization Flow

  - EntryScene.create()

    #### [1a] EntryScene triggers game initialization
    📄 `EntryScene.ts:54`

    ```typescript
    await gameManager.init(this.scene);
    ```


      #### [1b] GameManager initiates connection
      📄 `GameManager.ts:60`

      ```typescript
      const result = await connectionManager.initGameConnexion();
      ```


        #### [1c] ConnectionManager creates Room instance
        📄 `ConnectionManager.ts:309`

        ```typescript
        this._currentRoom = await Room.createRoom(roomPathUrl);
        ```


          #### [1d] Room fetches map details from backend
          📄 `Room.ts:94`

          ```typescript
          const result = await room.getMapDetail();
          ```

            - axiosWithRetry.get("map")
              - HTTP GET to PUSHER_URL/map
                - [Requires Pusher backend]

---

## 2. Frontend /map API Request Flow

> Frontend system (play/src/front/): How frontend makes HTTP request to Pusher backend for map metadata.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's frontend needs to know **where the backend server is located** and **what maps are available** before it can render anything. The frontend cannot hardcode these values because they vary by deployment (localhost, staging, production). The `/map` API request flow solves this by having the frontend **dynamically fetch map metadata from the Pusher backend server** using configuration injected at runtime.


#### Details


##### Configuration Injection

The frontend reads its configuration from `window.env` **[2e]**, a global JavaScript object that contains `PUSHER_URL` and other environment variables. This object is **not bundled with the frontend code**—it's injected by the Pusher backend server when serving the HTML page. Without this injection, `window.env` is undefined and the frontend cannot initialize.


##### API Request Construction

When the frontend needs map details, it calls `axiosWithRetry.get("map")` **[2a]**. This axios instance was created with `baseURL: ABSOLUTE_PUSHER_URL` **[2c]**, meaning the request goes to `{PUSHER_URL}/map`. The `ABSOLUTE_PUSHER_URL` is computed from `window.env.PUSHER_URL` **[2d]**, creating a **circular dependency**: the frontend needs `window.env` to know where to make API requests, but `window.env` can only be set by the backend server.


##### Error Condition

If the `/map` endpoint returns invalid data (or no server is running), the frontend throws "Data received by the /map endpoint of the Pusher is not in a valid format" **[2f]**. This is exactly what happens in **frontend-only mode**—the axios request fails because there's no Pusher server listening, and even if you mock the endpoint, the response won't match the expected schema without proper backend logic.


##### Why Frontend-Only Fails

The architecture assumes **the Pusher backend always serves the frontend**. There is no fallback mechanism or mock data path. Running `npm run dev-front` alone starts only the Vite dev server, which serves static files but cannot inject `window.env` or handle `/map` API requests. You must run `npm run dev-pusher` in parallel to provide these backend services.

</details>


### Frontend /map API Request Flow

  - Room.getMapDetail() execution

    #### [2a] Room makes GET request to /map endpoint
    📄 `Room.ts:136`

    ```typescript
    const result = await axiosWithRetry.get<unknown>("map", {
    ```

      - axios instance with baseURL

        #### [2b] Axios instance configured with Pusher URL
        📄 `AxiosUtils.ts:17`

        ```typescript
        export const axiosWithRetry = axios.create({
        ```


        #### [2c] Base URL points to Pusher backend
        📄 `AxiosUtils.ts:18`

        ```typescript
        baseURL: ABSOLUTE_PUSHER_URL,
        ```

          - URL computation from env

            #### [2d] PUSHER_URL computed from window.env
            📄 `ComputedConst.ts:3`

            ```typescript
            export const ABSOLUTE_PUSHER_URL = new URL(PUSHER_URL, window.location.toString()).toString();
            ```


              #### [2e] Frontend reads configuration from window.env
              📄 `EnvironmentVariable.ts:10`

              ```typescript
              const env = window.env;
              ```

                - (injected by Pusher)
    - Response validation

      #### [2f] Error thrown when /map response is invalid
      📄 `Room.ts:221`

      ```typescript
      throw new Error("Data received by the /map endpoint of the Pusher is not in a valid format.");
      ```


---

## 3. Pusher Backend Server Startup

> Backend system (play/src/pusher/): How Pusher server initializes and starts listening for requests.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's frontend cannot run standalone—it **requires the Pusher backend server** to function. The Pusher server solves two critical problems: (1) it **injects runtime configuration** into the frontend via `window.env`, and (2) it **provides API endpoints** like `/map` that the frontend depends on to load game data.

Without the Pusher server running, the frontend has no way to know where to make API requests (no `PUSHER_URL`), what features are enabled (no `ENABLE_CHAT`, `JITSI_URL`, etc.), or how to fetch map metadata.


#### Details

**Server Startup**

The Pusher backend starts in `/home/reader/develop/workadventure/play/src/server.ts`. The entry point calls `app.init()` **[3a]** to initialize the Express application and register controllers (MapController, FrontController, etc.), then calls `app.listenWebServer(PUSHER_HTTP_PORT)` **[3b]** to start the HTTP server that handles incoming requests.

**Configuration Preparation**

The backend prepares a `FRONT_ENVIRONMENT_VARIABLES` object **[3d]** in `/home/reader/develop/workadventure/play/src/pusher/enums/EnvironmentVariable.ts` (lines 154-218). This object contains **all configuration the frontend needs**: `PUSHER_URL` **[3c]**, `DEBUG_MODE`, `ADMIN_URL`, `JITSI_URL`, feature flags like `ENABLE_CHAT`, and 50+ other settings.

This configuration comes from **environment variables** read by the Pusher server at startup. The server validates these using Zod schemas and transforms them into the `FrontConfigurationInterface` format that the frontend expects.

**Why This Architecture**

This design allows **centralized configuration management**—all settings are defined once in environment variables on the backend, then distributed to the frontend. The frontend never needs to know about `.env` files or environment-specific settings; it simply reads `window.env` which the Pusher server injects dynamically based on the deployment environment.

</details>


### Pusher Backend Server Startup

  - src/server.ts

    #### [3a] Server initializes Pusher app
    📄 `server.ts:52`

    ```typescript
    await app.init();
    ```

      - Initializes Express app & controllers
        - MapController, FrontController, etc.

    #### [3b] Pusher starts HTTP server
    📄 `server.ts:56`

    ```typescript
    .listenWebServer(PUSHER_HTTP_PORT)
    ```

      - Starts HTTP server for API requests

### Configuration Preparation

  - src/pusher/enums/EnvironmentVariable.ts

    #### [3d] Backend prepares frontend configuration
    📄 `EnvironmentVariable.ts:154`

    ```typescript
    export const FRONT_ENVIRONMENT_VARIABLES: FrontConfigurationInterface = {
    ```

      - DEBUG_MODE

      #### [3c] PUSHER_URL included in frontend config
      📄 `EnvironmentVariable.ts:156`

      ```typescript
      PUSHER_URL,
      ```

      - ADMIN_URL
      - [50+ other config fields]
        - Injected into frontend via window.env

---

## 4. Pusher HTML Serving with window.env Injection

> Backend system (play/src/pusher/): How Pusher serves HTML and injects configuration into window.env.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's frontend is a **static JavaScript application** that needs runtime configuration (API endpoints, feature flags, authentication settings) to function. The problem: how do you inject backend-specific configuration into a static frontend without hardcoding values or requiring a rebuild for each deployment?

The solution is **server-side HTML templating**. The Pusher backend dynamically generates the HTML page, injecting a `window.env` JavaScript object that contains all necessary configuration before the frontend code executes.


#### Details


##### Configuration Injection Flow

When a user navigates to a room URL like `/_/global/maps/starter/map.json`, the **FrontController** intercepts the request **[4a]**. It calls `getScript()` **[4b]** to build a JavaScript snippet that assigns configuration to `window.env`.

The backend constructs this script by serializing `FRONT_ENVIRONMENT_VARIABLES` **[4c]**, which includes critical values like `PUSHER_URL`, `ADMIN_URL`, feature flags, and authentication settings. This configuration object is defined in `/pusher/enums/EnvironmentVariable.ts` and contains everything the frontend needs to know about the backend environment.


##### Template Rendering

The generated script is injected into the **Mustache template placeholder** `{{{ script }}}` in `index.html` **[4d]**. This happens before any frontend JavaScript executes, ensuring `window.env` is available immediately.

The frontend code reads from `window.env` **[4e]** to configure itself - most importantly, it uses `window.env.PUSHER_URL` to construct the base URL for all API requests. Without this injection, the frontend has no way to know where its backend is located.


##### Why Frontend-Only Mode Fails

Running just `npm run dev-front` serves the static HTML template **without** the Pusher backend processing it. The `{{{ script }}}` placeholder remains empty, `window.env` is undefined, and the frontend crashes when trying to read `window.env.PUSHER_URL`. This is why the Pusher server must always run alongside the frontend.

</details>


### Pusher Backend HTML Serving Flow

  - HTTP Request to /_/room/path

    #### [4a] FrontController handles room URL requests
    📄 `FrontController.ts:90`

    ```typescript
    this.app.get("/_/{*splat}", (req: Request, res: Response) => {
    ```

      - getScript() method
        - adminService.getCapabilities()
        - Build script string

          #### [4b] Injects window.env into script tag
          📄 `FrontController.ts:68`

          ```typescript
          "window.env = " +
          ```


          #### [4c] Converts config object to JSON string
          📄 `FrontController.ts:69`

          ```typescript
          JSON.stringify(FRONT_ENVIRONMENT_VARIABLES) +
          ```

    - Render index.html template
      - Mustache template processing

        #### [4d] HTML template receives injected script
        📄 `index.html:107`

        ```html
        {{{ script }}}
        ```

      - Browser receives HTML

        #### [4e] PUSHER_URL defined in frontend config interface
        📄 `FrontConfigurationInterface.ts:5`

        ```typescript
        PUSHER_URL: string;
        ```


---

## 5. Pusher /map Endpoint Handler

> Backend system (play/src/pusher/): How Pusher handles /map API requests and returns map metadata.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure's frontend needs **map metadata** (map URL, authentication settings, room configuration) before it can load and render a map. This metadata isn't hardcoded—it's dynamically determined based on the room URL the user visits. The **Pusher backend server** acts as the intermediary that resolves room URLs to their corresponding map details by querying an admin API or local configuration.

Without this `/map` endpoint, the frontend cannot know which map file to load, whether authentication is required, or what room-specific settings to apply.


#### Details


##### Request Flow

When a user visits a room URL like `/_/global/example.com/map.json`, the frontend's `Room` class needs to fetch metadata about that room **[5a]**. The frontend makes an HTTP GET request to the Pusher server's `/map` endpoint, passing the `playUri` parameter **[5b]**.


##### Backend Processing

The **MapController** receives the request and validates that a `playUri` was provided **[5b]**. It then delegates to `AdminService.fetchMapDetails()` **[5c]** to retrieve the actual map metadata. This service either:

- Queries an external admin API at `/api/map` if `ADMIN_API_URL` is configured
- Uses local configuration for development/testing scenarios

The admin API returns a `MapDetailsData` object containing the actual map file URL, authentication requirements, room name, customization options, and feature flags.


##### Response

The MapController sends this metadata back as JSON **[5d]**. The frontend receives this response, validates it against expected schemas, and uses it to initialize the room with the correct map URL and settings. If the response format is invalid or the request fails, the frontend throws the error "Data received by the /map endpoint of the Pusher is not in a valid format" that users see when running frontend-only mode.


##### Why Frontend-Only Fails

Running `npm run dev-front` only starts the Vite development server—it doesn't start the Pusher backend. When the frontend tries to call `/map`, there's no server listening, causing the connection to fail and preventing the application from initializing.

</details>


### Pusher /map Endpoint Request Flow

  - HTTP GET /map request from frontend

    #### [5a] MapController handles /map endpoint
    📄 `MapController.ts:55`

    ```typescript
    this.app.get("/map", async (req: Request, res: Response) => {
    ```

      - Query validation

        #### [5b] Validates playUri parameter
        📄 `MapController.ts:61`

        ```typescript
        playUri: z.string(),
        ```


      #### [5c] Fetches map details from admin service
      📄 `MapController.ts:70`

      ```typescript
      let mapDetails = await adminService.fetchMapDetails(
      ```

        - Fetch map metadata from admin API

      #### [5d] Returns map details as JSON response
      📄 `MapController.ts:82`

      ```typescript
      res.json(mapDetails);
      ```

    - Frontend receives map details
      - Room.getMapDetail() resolves

---

---

## Referenced Files

```xml
<files>
<file path="AxiosUtils.ts">
import type { AxiosError, AxiosRequestConfig } from "axios";
import axios, { isAxiosError } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError, exponentialDelay } from "axios-retry";
import { get } from "svelte/store";
import { asError } from "catch-unknown";
import { errorStore } from "../Stores/ErrorStore";
import { LL } from "../../i18n/i18n-svelte";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";

export const axiosToPusher = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});

/**
 * This instance of Axios will retry in case of an issue and display an error message as a HTML overlay.
 */
<!-- [2b] Axios instance configured with Pusher URL (line 17) -->
export const axiosWithRetry = axios.create({
<!-- [2c] Base URL points to Pusher backend (line 18) -->
    baseURL: ABSOLUTE_PUSHER_URL,
});

axiosRetry(axiosWithRetry, {
    retries: Number.MAX_SAFE_INTEGER,
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

axiosWithRetry.interceptors.response.use(
    (res) => {
        hideConnectionIssueMessage();
        return res;
    },
    (error: unknown) => {
        // Do not clear error message if the status code is being retried.
        if (
            isAxiosError(error) &&
            (error.status === undefined || (error.status >= 500 && error.status <= 599) || error.status === 429)
        ) {
            return Promise.reject(error);
        }

        hideConnectionIssueMessage();
        return Promise.reject(asError(error));
    }
);

export function showConnectionIssueMessage() {
    errorStore.addErrorMessage(get(LL).error.connectionRetry.unableConnect(), {
        closable: false,
        id: "axios_retry",
    });
}

export function hideConnectionIssueMessage() {
    errorStore.clearMessageById("axios_retry");
}

</file>
<file path="ComputedConst.ts">
import { PUSHER_URL } from "./EnvironmentVariable";

<!-- [2d] PUSHER_URL computed from window.env (line 3) -->
export const ABSOLUTE_PUSHER_URL = new URL(PUSHER_URL, window.location.toString()).toString();

</file>
<file path="ConnectionManager.ts">
import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import type {
    ApplicationDefinitionInterface,
    AvailabilityStatus,
    ErrorApiErrorData,
    ErrorApiRetryData,
    ErrorApiUnauthorizedData,
} from "@workadventure/messages";
import { isRegisterData, MeResponse, ErrorScreenMessage } from "@workadventure/messages";
import { isAxiosError } from "axios";
import { defautlNativeIntegrationAppName, KlaxoonService } from "@workadventure/shared-utils";
import { Subject } from "rxjs";
import { asError } from "catch-unknown";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { userIsConnected, warningBannerStore } from "../Stores/MenuStore";
import { loginSceneVisibleIframeStore } from "../Stores/LoginSceneStore";
import { _ServiceWorker } from "../Network/ServiceWorker";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import {
    CARDS_ENABLED,
    ENABLE_OPENID,
    ERASER_ENABLED,
    EXCALIDRAW_DOMAINS,
    EXCALIDRAW_ENABLED,
    GOOGLE_DOCS_ENABLED,
    GOOGLE_DRIVE_ENABLED,
    GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED,
    KLAXOON_CLIENT_ID,
    KLAXOON_ENABLED,
    TLDRAW_ENABLED,
    YOUTUBE_ENABLED,
} from "../Enum/EnvironmentVariable";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { locales } from "../../i18n/i18n-util";
import type { Locales } from "../../i18n/i18n-types";
import { setCurrentLocale } from "../Utils/locales";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import { openChatRoom } from "../Chat/Utils";
import LL from "../../i18n/i18n-svelte";
import waLogo from "../Components/images/logo.svg";
import { errorScreenStore } from "../Stores/ErrorScreenStore";
import { axiosToPusher, axiosWithRetry } from "./AxiosUtils";
import { Room } from "./Room";
import { LocalUser } from "./LocalUser";
import { localUserStore } from "./LocalUserStore";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { RoomConnection } from "./RoomConnection";
import { HtmlUtils } from "./../WebRtc/HtmlUtils";
import { hasCapability } from "./Capabilities";

class ConnectionManager {
    private localUser!: LocalUser;

    private connexionType?: GameConnexionTypes;
    private reconnectingTimeout: NodeJS.Timeout | null = null;
    private _unloading = false;
    private authToken: string | null = null;
    private _currentRoom: Room | null = null;

    private serviceWorker?: _ServiceWorker;

    private _klaxoonToolActivated: boolean | undefined;
    private _klaxoonToolClientId: string | undefined;
    private _youtubeToolActivated: boolean | undefined;
    private _googleDocsToolActivated: boolean | undefined;
    private _googleSheetsToolActivated: boolean | undefined;
    private _googleSlidesToolActivated: boolean | undefined;
    private _eraserToolActivated: boolean | undefined;
    private _googleDriveActivated: boolean | undefined;
    private _excalidrawToolActivated: boolean | undefined;
    private _excalidrawToolDomains: string[] | undefined;
    private _cardsToolActivated: boolean | undefined;
    private _tldrawToolActivated: boolean | undefined;

    private _applications: ApplicationDefinitionInterface[] = [];

    private readonly _roomConnectionStream = new Subject<RoomConnection>();
    public readonly roomConnectionStream = this._roomConnectionStream.asObservable();

    get unloading() {
        return this._unloading;
    }

    constructor() {
        // The listener never needs to be removed, because we are in a singleton that is never destroyed.
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        window.addEventListener("beforeunload", () => {
            this._unloading = true;
            if (this.reconnectingTimeout) clearTimeout(this.reconnectingTimeout);
        });

        // Initialise default application
        this.klaxoonToolActivated = KLAXOON_ENABLED;
        this._klaxoonToolClientId = KLAXOON_CLIENT_ID;
        if (this._klaxoonToolClientId) {
            KlaxoonService.initWindowKlaxoonActivityPicker();
        }
        this.youtubeToolActivated = YOUTUBE_ENABLED;
        this.googleDriveToolActivated = GOOGLE_DRIVE_ENABLED;
        this.googleDocsToolActivated = GOOGLE_DOCS_ENABLED;
        this.googleSheetsToolActivated = GOOGLE_SHEETS_ENABLED;
        this.googleSlidesToolActivated = GOOGLE_SLIDES_ENABLED;
        this.eraserToolActivated = ERASER_ENABLED;
        this.excalidrawToolActivated = EXCALIDRAW_ENABLED;
        this.excalidrawToolDomains = EXCALIDRAW_DOMAINS;
        this.cardsToolActivated = CARDS_ENABLED;
        this.tldrawToolActivated = TLDRAW_ENABLED;
    }

    /**
     * TODO fix me to be move in game manager
     *
     * Returns the URL that we need to redirect to load the OpenID screen, or "null" if no redirection needs to happen.
     *
     * @param manuallyTriggered - Whether the login request resulted from a click on the "Sign in" button or from a mandatory authentication.
     * @param providerId - The ID of the OpenID provider to use for authentication.
     * @param providerScopes - The scopes to request from the OpenID provider.
     */
    public loadOpenIDScreen(manuallyTriggered: boolean, providerId?: string, providerScopes?: string[]): URL | null {
        localUserStore.setAuthToken(null);
        if (!ENABLE_OPENID || !this._currentRoom) {
            analyticsClient.loggedWithToken();
            loginSceneVisibleIframeStore.set(false);
            return null;
        }
        analyticsClient.loggedWithSso();
        const redirectUrl = new URL("login-screen", ABSOLUTE_PUSHER_URL);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        if (manuallyTriggered) {
            redirectUrl.searchParams.append("manuallyTriggered", "true");
        }
        if (providerId) {
            redirectUrl.searchParams.append("providerId", providerId);
        }
        if (providerScopes) {
            providerScopes.forEach((scope) => {
                redirectUrl.searchParams.append("providerScopes", scope);
            });
        }
        return redirectUrl;
    }

    /**
     * Logout
     */
    public logout() {
        // save the current token to use it in the redirect logout url
        const tokenTmp = localUserStore.getAuthToken();
        //remove token in localstorage
        localUserStore.setAuthToken(null);
        //user logout, set connected store for menu at false (actually don't do it because we are going to redirect and
        // it shortly displays the "sign in" button before redirect happens)
        //userIsConnected.set(false);

        // check if we are in a room
        if (!ENABLE_OPENID || !this._currentRoom) {
            window.location.assign("/login");
            return;
        }
        // redirect to logout url
        const redirectUrl = new URL(`${this._currentRoom.opidLogoutRedirectUrl}`, window.location.href);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        redirectUrl.searchParams.append("token", tokenTmp ?? "");

        gameManager
            .logout()
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            })
            .finally(() => window.location.assign(redirectUrl));
    }

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     *
     * @return returns a promise to the Room we are going to load OR a pointer to the URL we must redirect to if authentication is needed.
     */
    public async initGameConnexion(): Promise<
        | {
              room: Room;
              nextScene: "selectCharacterScene" | "selectCompanionScene" | "gameScene";
          }
        | {
              nextScene: "errorScene";
              error: ErrorApiErrorData | ErrorApiRetryData | ErrorApiUnauthorizedData | Error;
          }
        | URL
    > {
        this.connexionType = urlManager.getGameConnexionType();
        this._currentRoom = null;

        let nextScene: "selectCharacterScene" | "selectCompanionScene" | "gameScene" = "gameScene";

        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get("token");
        // get token injected by post method from pusher
        if (token == undefined) {
            const input = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("authToken");
            if (input.value != undefined && input.value != "") token = input.value;
        }

        if (token != undefined) {
            this.authToken = token;
            localUserStore.setAuthToken(token);

            //clean token of url
            urlParams.delete("token");
        }

        let matrixLoginToken = urlParams.get("matrixLoginToken");
        // get token injected by post method from pusher
        if (matrixLoginToken == undefined) {
            const input = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("matrixLoginToken");
            if (input.value != undefined && input.value != "") {
                matrixLoginToken = input.value;
            }
        }

        if (matrixLoginToken != undefined) {
            localUserStore.setMatrixLoginToken(matrixLoginToken);
            //clean token of url
            urlParams.delete("matrixLoginToken");
        }

        if (this.connexionType === GameConnexionTypes.login) {
            this._currentRoom = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            const redirect = this.loadOpenIDScreen(true);
            if (redirect !== null) {
                return redirect;
            }
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (this.connexionType === GameConnexionTypes.jwt) {
            /** @deprecated */
            throw new Error("This endpoint is deprecated");
        }

        //@deprecated
        else if (this.connexionType === GameConnexionTypes.register) {
            const organizationMemberToken = urlManager.getOrganizationToken();
            const result = await axiosToPusher.post("register", { organizationMemberToken }).then((res) => res.data);

            const registerDataChecking = isRegisterData.safeParse(result);

            if (!registerDataChecking.success) {
                console.error("Invalid data received from /register route. Data: ", result);
                throw new Error("Invalid data received from /register route.");
            }

            const data = registerDataChecking.data;

            this.localUser = new LocalUser(data.userUuid, data.email);
            this.authToken = data.authToken;
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);
            analyticsClient.loggedWithToken();

            const roomUrl = data.roomUrl;

            const query = urlParams.toString();
            this._currentRoom = await Room.createRoom(
                new URL(
                    window.location.protocol +
                        "//" +
                        window.location.host +
                        roomUrl +
                        (query ? "?" + query : "") + //use urlParams because the token param must be deleted
                        window.location.hash
                )
            );
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (this.connexionType === GameConnexionTypes.room || this.connexionType === GameConnexionTypes.empty) {
            this.authToken = localUserStore.getAuthToken();

            let roomPath: string;
            if (this.connexionType === GameConnexionTypes.empty) {
                roomPath = localUserStore.getLastRoomUrl();
                //get last room path from cache api
                try {
                    const lastRoomUrl = await localUserStore.getLastRoomUrlCacheApi();
                    if (lastRoomUrl != undefined) {
                        roomPath = lastRoomUrl;
                    }
                } catch (err) {
                    console.error(err);
                    if (err instanceof Error) {
                        console.error(err.stack);
                    }
                }
            } else {
                const query = urlParams.toString();
                roomPath =
                    window.location.protocol +
                    "//" +
                    window.location.host +
                    window.location.pathname +
                    (query ? "?" + query : "") + //use urlParams because the token param must be deleted
                    window.location.hash;
            }

            const roomPathUrl = new URL(roomPath);

            //get detail map for anonymous login and set texture in local storage
            //before set token of user we must load room and all information. For example the mandatory authentication could be require on current room
<!-- [1c] ConnectionManager creates Room instance (line 309) -->
            this._currentRoom = await Room.createRoom(roomPathUrl);

            //Set last room visited! (connected or not, must be saved in localstorage and cache API)
            //use href to keep # value
            await localUserStore.setLastRoomUrl(roomPathUrl.href);

            //todo: add here some kind of warning if authToken has expired.
            if (!this.authToken) {
                if (!this._currentRoom.authenticationMandatory) {
                    await this.anonymousLogin();

                    const characterTextures = localUserStore.getCharacterTextures();
                    if (characterTextures === null || characterTextures.length === 0) {
                        nextScene = "selectCharacterScene";
                    }
                } else {
                    const redirect = this.loadOpenIDScreen(false);
                    if (redirect === null) {
                        throw new Error("Unable to redirect on login page.");
                    }
                    return redirect;
                }
            } else {
                try {
                    const response = await this.checkAuthUserConnexion(this.authToken);
                    if (response.status === "error") {
                        /*if (response.type === "retry") {
                            console.warn("Token expired, trying to login anonymously");
                        } else {
                            console.error(response);
                        }*/

                        if (response.type === "redirect") {
                            return new URL(response.urlToRedirect, window.location.href);
                        }

                        return {
                            nextScene: "errorScene",
                            error: response,
                        };
                    }
                    if (response.status === "ok") {
                        if (response.isCharacterTexturesValid === false) {
                            nextScene = "selectCharacterScene";
                        } else if (response.isCompanionTextureValid === false) {
                            nextScene = "selectCompanionScene";
                        }

                        const chatRoomId = urlManager.getHashParameter("chatRoomId");

                        if (chatRoomId) {
                            openChatRoom(chatRoomId).catch((err) => {
                                console.error("Unable to open chat room or establish chat connection", err);
                                Sentry.captureException(err);
                            });
                        }
                    }
                } catch (err) {
                    if (isAxiosError(err) && err.response?.status === 401) {
                        console.warn("Token expired, trying to login anonymously");
                        // if the user must be connected to the current room or if the pusher error is not openid provider access error
                        if (this._currentRoom.authenticationMandatory) {
                            const redirect = this.loadOpenIDScreen(false);
                            if (redirect === null) {
                                throw new Error("Unable to redirect on login page.", { cause: err });
                            }
                            return redirect;
                        } else {
                            await this.anonymousLogin();
                        }
                    } else {
                        Sentry.captureException(err);
                        if (err instanceof Error) {
                            return {
                                nextScene: "errorScene",
                                error: err,
                            };
                        } else {
                            console.error("An unknown error occurred", err);
                            return {
                                nextScene: "errorScene",
                                error: new Error("An unknown error occurred"),
                            };
                        }
                    }
                }
            }
            // Todo: Replace with a real typing
            this.localUser = localUserStore.getLocalUser() as LocalUser; //if authToken exist in localStorage then localUser cannot be null
        }
        if (this._currentRoom == undefined) {
            return Promise.reject(new Error("Invalid URL"));
        }
        if (this.localUser) {
            analyticsClient.identifyUser(this.localUser.uuid, this.localUser.email);
        }

        //if limit room active test headband
        if (this._currentRoom.expireOn !== undefined) {
            warningBannerStore.activateWarningContainer();
            limitMapStore.set(true);

            //check time of map
            if (new Date() > this._currentRoom.expireOn) {
                showLimitRoomModalStore.set(true);
            }
        }

        this.serviceWorker = new _ServiceWorker();

        return Promise.resolve({
            room: this._currentRoom,
            nextScene,
        });
    }

    public async anonymousLogin(isBenchmark = false): Promise<void> {
        const data = await axiosWithRetry.post("anonymLogin").then((res) => res.data);
        this.localUser = new LocalUser(data.userUuid, data.email);
        this.authToken = data.authToken;
        if (!isBenchmark) {
            // In benchmark, we don't have a local storage.
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);
        }
        this.anonymousMatrixLogin();
    }

    private anonymousMatrixLogin() {
        localUserStore.setMatrixLoginToken(null);
        localUserStore.setMatrixUserId(null);
        localUserStore.setMatrixAccessToken(null);
        localUserStore.setMatrixRefreshToken(null);
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser("");
    }

    public connectToRoomSocket(
        roomUrl: string,
        name: string,
        characterTextureIds: string[],
        position: PositionInterface,
        viewport: ViewportInterface,
        companionTextureId: string | null,
        availabilityStatus: AvailabilityStatus,
        lastCommandId?: string
    ): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(
                this.authToken,
                roomUrl,
                name,
                characterTextureIds,
                position,
                viewport,
                companionTextureId,
                availabilityStatus,
                lastCommandId
            );

            // The roomJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            connection.websocketErrorStream.subscribe((error: Event) => {
                console.info("onConnectError => An error occurred while connecting to socket server. Retrying", error);
                reject(asError(error));
            });

            // The roomJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            connection.connectionErrorStream.subscribe((event: CloseEvent) => {
                console.info(
                    "An error occurred while connecting to socket server. Retrying => Event: ",
                    event.reason,
                    event.code,
                    event
                );

                //However, Chrome will rarely report any close code 1006 reasons to the Javascript side.
                //This is likely due to client security rules in the WebSocket spec to prevent abusing WebSocket.
                //(such as using it to scan for open ports on a destination server, or for generating lots of connections for a denial-of-service attack).
                // more detail here: https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
                if (event.code === 1006) {
                    //check cookies
                    const cookies = document.cookie.split(";");
                    for (const cookie of cookies) {
                        //check id cookie posthog exist
                        const numberIndexPh = cookie.indexOf("_posthog=");
                        if (numberIndexPh !== -1) {
                            //if exist, remove posthog cookie
                            document.cookie =
                                cookie.slice(0, numberIndexPh + 9) +
                                "; domain=.workadventu.re; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                        }
                    }
                }

                reject(
                    new Error(
                        "An error occurred while connecting to socket server. Retrying. Code: " +
                            event.code +
                            ", Reason: " +
                            event.reason
                    )
                );
            });

            // The roomJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            connection.roomJoinedMessageStream.subscribe((connect: OnConnectInterface) => {
                // Set the default application integration for the room
                const KlaxoonApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.KLAXOON
                );
                this.klaxoonToolActivated = KlaxoonApp?.enabled ?? KLAXOON_ENABLED;

                const YoutubeApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.YOUTUBE
                );
                this.youtubeToolActivated = YoutubeApp?.enabled ?? YOUTUBE_ENABLED;

                const GoogleDriveApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_DRIVE
                );
                this.googleDriveToolActivated = GoogleDriveApp?.enabled ?? GOOGLE_DRIVE_ENABLED;

                const GoogleDocsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_DOCS
                );
                this.googleDocsToolActivated = GoogleDocsApp?.enabled ?? GOOGLE_DOCS_ENABLED;

                const GoogleSheetsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_SHEETS
                );
                this.googleSheetsToolActivated = GoogleSheetsApp?.enabled ?? GOOGLE_SHEETS_ENABLED;

                const GoogleSlidesApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_SLIDES
                );
                this.googleSlidesToolActivated = GoogleSlidesApp?.enabled ?? GOOGLE_SLIDES_ENABLED;

                const EraserApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.ERASER
                );
                this.eraserToolActivated = EraserApp?.enabled ?? ERASER_ENABLED;

                const ExcalidrawApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.EXCALIDRAW
                );
                this.excalidrawToolActivated = ExcalidrawApp?.enabled ?? EXCALIDRAW_ENABLED;

                const CardsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.CARDS
                );
                this.cardsToolActivated = CardsApp?.enabled ?? CARDS_ENABLED;

                const TldrawApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.TLDRAW
                );
                this.tldrawToolActivated = TldrawApp?.enabled ?? TLDRAW_ENABLED;

                // Set other applications
                for (const app of connect.room.applications ?? []) {
                    if (
                        defautlNativeIntegrationAppName.KLAXOON === app.name ||
                        defautlNativeIntegrationAppName.YOUTUBE === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_DRIVE === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_DOCS === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_SHEETS === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_SLIDES === app.name ||
                        defautlNativeIntegrationAppName.ERASER === app.name ||
                        defautlNativeIntegrationAppName.EXCALIDRAW === app.name ||
                        defautlNativeIntegrationAppName.CARDS === app.name ||
                        defautlNativeIntegrationAppName.TLDRAW === app.name
                    ) {
                        continue;
                    }

                    // Save applications in the connection manager to use it in the map editor
                    if (this._applications.find((a) => a.name === app.name) === undefined) {
                        this._applications.push(app);
                    }
                }
                this._roomConnectionStream.next(connection);
                errorScreenStore.delete();
                resolve(connect);
            });
        }).catch((err) => {
            console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => err", err);

            errorScreenStore.setError(
                ErrorScreenMessage.fromPartial({
                    type: "reconnecting",
                    code: "reconnecting",
                    title: get(LL).messageScreen.connecting(),
                    subtitle: get(LL).messageScreen.pleaseWait(),
                    image: gameManager?.currentStartedRoom?.loadingLogo ?? waLogo,
                })
            );
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve) => {
                console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => reconnectingTimeout");

                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    console.info(
                        "[ConnectionManager] connectToRoomSocket => catch => ew Promise[OnConnectInterface] reconnectingTimeout => setTimeout",
                        roomUrl,
                        name,
                        characterTextureIds,
                        position,
                        viewport,
                        companionTextureId,
                        availabilityStatus,
                        lastCommandId
                    );

                    void this.connectToRoomSocket(
                        roomUrl,
                        name,
                        characterTextureIds,
                        position,
                        viewport,
                        companionTextureId,
                        availabilityStatus,
                        lastCommandId
                    ).then((connection) => {
                        this._roomConnectionStream.next(connection.connection);
                        resolve(connection);
                    });
                }, 4000 + Math.floor(Math.random() * 2000));
            });
        });
    }

    get getConnexionType() {
        return this.connexionType;
    }

    private async checkAuthUserConnexion(token: string) {
        //set connected store for menu at false
        userIsConnected.set(false);

        const playUri = this.currentRoom?.key;
        if (playUri == undefined) {
            throw new Error("playUri is undefined");
        }

        // TODO: the call to "/me" could be completely removed and the request data could come from the FrontController
        // For this to work, the authToken should be stored in a cookie instead of localStorage.
        const data = await axiosToPusher
            .get("me", {
                params: {
                    token,
                    playUri,
                    localStorageCharacterTextureIds: localUserStore.getCharacterTextures() ?? undefined,
                    localStorageCompanionTextureId: localUserStore.getCompanionTextureId() ?? undefined,
                    chatID: localUserStore.getChatId() ?? undefined,
                },
            })
            .then((res) => {
                return res.data;
            })
            .catch((err) => {
                throw err;
            });

        const response = MeResponse.parse(data);

        if (response.status === "error") {
            return response;
        }

        const { authToken, userUuid, email, username, locale, visitCardUrl, matrixUserId, matrixServerUrl } = response;

        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, email, matrixUserId /*, isMatrixRegistered*/);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        if (matrixServerUrl) {
            gameManager.setMatrixServerUrl(matrixServerUrl);
        } else {
            gameManager.setMatrixServerUrl(undefined);
        }

        if (visitCardUrl) {
            gameManager.setVisitCardUrl(visitCardUrl);
        }

        const opidWokaNamePolicy = this.currentRoom?.opidWokaNamePolicy;
        if (username != undefined && opidWokaNamePolicy != undefined) {
            if (hasCapability("api/save-name")) {
                gameManager.setPlayerName(username);
            } else {
                if (opidWokaNamePolicy === "force_opid") {
                    gameManager.setPlayerName(username);
                } else if (opidWokaNamePolicy === "allow_override_opid" && localUserStore.getName() == undefined) {
                    gameManager.setPlayerName(username);
                }
            }
        }

        if (locale) {
            try {
                if (locales.indexOf(locale as Locales) !== -1) {
                    await setCurrentLocale(locale as Locales);
                } else {
                    const nonRegionSpecificLocale = locales.find((l) => l.startsWith(locale.split("-")[0]));
                    if (nonRegionSpecificLocale) {
                        await setCurrentLocale(nonRegionSpecificLocale);
                    }
                }
            } catch (err) {
                console.warn("Could not set locale", err);
            }
        }

        //user connected, set connected store for menu at true
        if (localUserStore.isLogged()) {
            userIsConnected.set(true);
        }

        return response;
    }

    async saveName(name: string): Promise<boolean> {
        if (
            hasCapability("api/save-name") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
            await axiosToPusher.post(
                "save-name",
                {
                    name,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
            return true;
        } else {
            return false;
        }
    }

    async saveTextures(textures: string[]): Promise<boolean> {
        if (
            hasCapability("api/save-textures") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
            await axiosToPusher.post(
                "save-textures",
                {
                    textures,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
            return true;
        } else {
            return false;
        }
    }

    async saveCompanionTexture(texture: string | null): Promise<boolean> {
        if (
            hasCapability("api/save-textures") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
            await axiosToPusher.post(
                "save-companion-texture",
                {
                    texture,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
            return true;
        } else {
            return false;
        }
    }

    get currentRoom() {
        return this._currentRoom;
    }

    get klaxoonToolActivated(): boolean {
        return this._klaxoonToolActivated ?? false;
    }
    set klaxoonToolActivated(activated: boolean | undefined) {
        this._klaxoonToolActivated = activated;
    }
    get klaxoonToolClientId(): string | undefined {
        return this._klaxoonToolClientId;
    }

    get youtubeToolActivated(): boolean {
        return this._youtubeToolActivated ?? false;
    }
    set youtubeToolActivated(activated: boolean | undefined) {
        this._youtubeToolActivated = activated;
    }

    get googleDocsToolActivated(): boolean {
        return this._googleDocsToolActivated ?? false;
    }
    set googleDocsToolActivated(activated: boolean | undefined) {
        this._googleDocsToolActivated = activated;
    }

    get googleSheetsToolActivated(): boolean {
        return this._googleSheetsToolActivated ?? false;
    }
    set googleSheetsToolActivated(activated: boolean | undefined) {
        this._googleSheetsToolActivated = activated;
    }

    get googleSlidesToolActivated(): boolean {
        return this._googleSlidesToolActivated ?? false;
    }
    set googleSlidesToolActivated(activated: boolean | undefined) {
        this._googleSlidesToolActivated = activated;
    }

    get eraserToolActivated(): boolean {
        return this._eraserToolActivated ?? false;
    }
    set eraserToolActivated(activated: boolean | undefined) {
        this._eraserToolActivated = activated;
    }

    get googleDriveToolActivated(): boolean {
        return this._googleDriveActivated ?? false;
    }
    set googleDriveToolActivated(activated: boolean | undefined) {
        this._googleDriveActivated = activated;
    }

    get excalidrawToolActivated(): boolean {
        return this._excalidrawToolActivated ?? false;
    }
    set excalidrawToolActivated(activated: boolean | undefined) {
        this._excalidrawToolActivated = activated;
    }

    get excalidrawToolDomains(): string[] {
        return this._excalidrawToolDomains ?? [];
    }
    set excalidrawToolDomains(domains: string[] | undefined) {
        this._excalidrawToolDomains = domains;
    }

    get cardsToolActivated(): boolean {
        return this._cardsToolActivated ?? false;
    }
    set cardsToolActivated(activated: boolean | undefined) {
        this._cardsToolActivated = activated;
    }

    get tldrawToolActivated(): boolean {
        return this._tldrawToolActivated ?? false;
    }
    set tldrawToolActivated(activated: boolean | undefined) {
        this._tldrawToolActivated = activated;
    }

    get applications(): ApplicationDefinitionInterface[] {
        return this._applications;
    }
}

export const connectionManager = new ConnectionManager();

</file>
<file path="EntryScene.ts">
import { Scene } from "phaser";
import { ErrorApiData } from "@workadventure/messages";
import { asError } from "catch-unknown";
import { gameManager } from "../Game/GameManager";
import { waScaleManager } from "../Services/WaScaleManager";
import { ReconnectingTextures } from "../Reconnecting/ReconnectingScene";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import { localeDetector } from "../../Utils/locales";

export const EntrySceneName = "EntryScene";

/**
 * The EntryScene is not a real scene. It is the first scene loaded and is only used to initialize the gameManager
 * and to route to the next correct scene.
 */
export class EntryScene extends Scene {
    constructor() {
        super({
            key: EntrySceneName,
        });
    }

    // From the very start, let's preload images used in the ReconnectingScene.
    preload() {
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(ReconnectingTextures.mainFont, "resources/fonts/arcade.png", "resources/fonts/arcade.xml");
        this.load.spritesheet("cat", "resources/characters/pipoya/Cat 01-1.png", { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.loadLocale();

        if (gameManager.currentStartedRoom && gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    private loadLocale(): void {
        localeDetector()
            .then(() => {
                gameManager
                    .init(this.scene)
                    .then((nextSceneName) => {
                        this.waitPluginLoad()
                            .then(() => {
                                // Let's rescale before starting the game
                                // We can do it at this stage.
                                waScaleManager.applyNewSize();
                                this.scene.start(nextSceneName);
                            })
                            .catch((e) => {
                                throw new Error("Error while waiting plugin load!" + asError(e).message);
                            });
<!-- [1a] EntryScene triggers game initialization (line 54) -->
                    })
                    .catch((err) => {
                        // TODO: make this safer ?
                        const errorType = ErrorApiData.safeParse(err?.response?.data);
                        if (errorType.success) {
                            if (errorType.data.type === "redirect") {
                                window.location.assign(errorType.data.urlToRedirect);
                            } else errorScreenStore.setError(err?.response?.data);
                        } else {
                            errorScreenStore.setException(err);
                            //ErrorScene.showError(err, this.scene);
                        }
                    });
            })
            .catch((e) => {
                throw new Error("Cannot load locale!" + asError(e).message);
            });
    }

    /**
     * Due to a bug, the rexAwait plugin sometimes does not finish to load in Webkit when the scene is started.
     * This function wait for the plugin to be loaded before starting to load resources.
     */
    private async waitPluginLoad(): Promise<void> {
        return new Promise((resolve) => {
            const check = () => {
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((this.load as any).rexAwait) {
                    resolve();
                } else {
                    console.info("Waiting for rex plugins to be loaded...");
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
}

</file>
<file path="EnvironmentVariable.ts">
import { EnvironmentVariables } from "./EnvironmentVariableValidator";

const envChecking = EnvironmentVariables.safeParse(process.env);

// Will break the process if an error happens
if (!envChecking.success) {
    console.error("\n\n\n-----------------------------------------");
    console.error("FATAL ERRORS FOUND IN ENVIRONMENT VARIABLES!!!");
    console.error("-----------------------------------------\n");
<!-- [2e] Frontend reads configuration from window.env (line 10) -->

    const formattedError = envChecking.error.format();

    for (const [name, value] of Object.entries(formattedError)) {
        if (Array.isArray(value)) {
            continue;
        }

        for (const error of value._errors) {
            console.error(`For variable "${name}": ${error}`);
        }
    }

    console.error("\n-----------------------------------------\n\n\n");

    process.exit(1);
}

const env: EnvironmentVariables = envChecking.data;

export const PLAY_URL = env.PLAY_URL;
export const MINIMUM_DISTANCE = env.MINIMUM_DISTANCE;
export const GROUP_RADIUS = env.GROUP_RADIUS;
export const ADMIN_API_URL = env.ADMIN_API_URL;
export const ADMIN_API_RETRY_DELAY = parseInt(process.env.ADMIN_API_RETRY_DELAY || "500");
export const ADMIN_API_TOKEN = env.ADMIN_API_TOKEN;
export const CPU_OVERHEAT_THRESHOLD = env.CPU_OVERHEAT_THRESHOLD;
export const JITSI_URL = env.JITSI_URL;
export const JITSI_ISS = env.JITSI_ISS;
export const SECRET_JITSI_KEY = env.SECRET_JITSI_KEY;
export const BBB_URL = env.BBB_URL;
export const BBB_SECRET = env.BBB_SECRET;
export const ENABLE_MAP_EDITOR = env.ENABLE_MAP_EDITOR;
export const HTTP_PORT = env.HTTP_PORT;
export const GRPC_PORT = env.GRPC_PORT;
export const MAX_PER_GROUP = env.MAX_PER_GROUP;
export const REDIS_HOST = env.REDIS_HOST;
export const REDIS_PORT = env.REDIS_PORT;
export const REDIS_PASSWORD = env.REDIS_PASSWORD;
export const STORE_VARIABLES_FOR_LOCAL_MAPS = env.STORE_VARIABLES_FOR_LOCAL_MAPS;
export const PROMETHEUS_AUTHORIZATION_TOKEN = env.PROMETHEUS_AUTHORIZATION_TOKEN;
export const PROMETHEUS_PORT = env.PROMETHEUS_PORT === env.HTTP_PORT ? 0 : env.PROMETHEUS_PORT;
export const MAP_STORAGE_URL = env.MAP_STORAGE_URL;
export const PUBLIC_MAP_STORAGE_URL = env.PUBLIC_MAP_STORAGE_URL;
export const PUBLIC_MAP_STORAGE_PREFIX = PUBLIC_MAP_STORAGE_URL ? new URL(PUBLIC_MAP_STORAGE_URL).pathname : undefined;
export const INTERNAL_MAP_STORAGE_URL = env.INTERNAL_MAP_STORAGE_URL;
export const PLAYER_VARIABLES_MAX_TTL = env.PLAYER_VARIABLES_MAX_TTL;
export const ENABLE_CHAT = env.ENABLE_CHAT;
export const ENABLE_CHAT_UPLOAD = env.ENABLE_CHAT_UPLOAD;
export const ENABLE_TELEMETRY = env.ENABLE_TELEMETRY;
export const SECURITY_EMAIL = env.SECURITY_EMAIL;
export const TELEMETRY_URL = env.TELEMETRY_URL;

export const SENTRY_DSN = env.SENTRY_DSN;
export const SENTRY_ENVIRONMENT = env.SENTRY_ENVIRONMENT;
export const SENTRY_RELEASE = env.SENTRY_RELEASE;
export const SENTRY_TRACES_SAMPLE_RATE = env.SENTRY_TRACES_SAMPLE_RATE;

export const GRPC_MAX_MESSAGE_SIZE = env.GRPC_MAX_MESSAGE_SIZE;

export const LIVEKIT_HOST = env.LIVEKIT_HOST;
export const LIVEKIT_API_KEY = env.LIVEKIT_API_KEY;
export const LIVEKIT_API_SECRET = env.LIVEKIT_API_SECRET;

export const MAX_USERS_FOR_WEBRTC = env.MAX_USERS_FOR_WEBRTC;

</file>
<file path="FrontConfigurationInterface.ts">
import type { OpidWokaNamePolicy } from "@workadventure/messages";

export interface FrontConfigurationInterface {
    DEBUG_MODE: boolean;
<!-- [4e] PUSHER_URL defined in frontend config interface (line 5) -->
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
    PEER_VIDEO_LOW_BANDWIDTH: number;
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: number;
    PEER_SCREEN_SHARE_LOW_BANDWIDTH: number;
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: number;
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
    BACKGROUND_TRANSFORMER_ENGINE: "tasks-vision" | "selfie-segmentation" | undefined;
}

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
<!-- [4b] Injects window.env into script tag (line 68) -->
                "window.env = " +
<!-- [4c] Converts config object to JSON string (line 69) -->
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
<!-- [4a] FrontController handles room URL requests (line 90) -->
        this.app.get("/_/{*splat}", (req: Request, res: Response) => {
            debug(`FrontController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            /**
             * get infos from map file details
             */
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
            html = Mustache.render(this.indexFile, {
                ...metaTagsData,
                // TODO change it to push data from admin
                msApplicationTileImage: metaTagsData.favIcons[metaTagsData.favIcons.length - 1].src,
                url,
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
<file path="GameManager.ts">
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { connectionManager } from "../../Connection/ConnectionManager";
import { localUserStore } from "../../Connection/LocalUserStore";
import type { Room } from "../../Connection/Room";
import { showHelpCameraSettings } from "../../Stores/HelpSettingsStore";
import {
    availabilityStatusStore,
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
} from "../../Stores/MediaStore";
import { menuIconVisiblilityStore, userIsConnected } from "../../Stores/MenuStore";
import { EnableCameraSceneName } from "../Login/EnableCameraScene";
import { LoginSceneName } from "../Login/LoginScene";
import { SelectCharacterSceneName } from "../Login/SelectCharacterScene";
import { EmptySceneName } from "../Login/EmptyScene";
import { gameSceneIsLoadedStore, waitForGameSceneStore } from "../../Stores/GameSceneStore";
import { myCameraStore } from "../../Stores/MyMediaStore";
import { SelectCompanionSceneName } from "../Login/SelectCompanionScene";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import { hasCapability } from "../../Connection/Capabilities";
import type { ChatConnectionInterface } from "../../Chat/Connection/ChatConnection";
import { MATRIX_PUBLIC_URI } from "../../Enum/EnvironmentVariable";
import { InvalidLoginTokenError, MatrixClientWrapper } from "../../Chat/Connection/Matrix/MatrixClientWrapper";
import { MatrixChatConnection } from "../../Chat/Connection/Matrix/MatrixChatConnection";
import { VoidChatConnection } from "../../Chat/Connection/VoidChatConnection";
import { loginTokenErrorStore, isMatrixChatEnabledStore } from "../../Stores/ChatStore";
import { initializeChatVisibilitySubscription } from "../../Chat/Stores/ChatStore";
import { GameScene } from "./GameScene";
/**
 * This class should be responsible for any scene starting/stopping
 */
export class GameManager {
    private playerName: string | null;
    private characterTextureIds: string[] | null;
    private companionTextureId: string | null;
    private startRoom!: Room;
    private currentGameSceneName: string | null = null;
    // Note: this scenePlugin is the scenePlugin of the EntryScene. We should always provide a key in methods called on this scenePlugin.
    private scenePlugin!: Phaser.Scenes.ScenePlugin;
    private visitCardUrl: string | null = null;
    private matrixServerUrl: string | undefined = undefined;
    private chatConnectionPromise: Promise<ChatConnectionInterface> | undefined;
    private matrixClientWrapper: MatrixClientWrapper | undefined;
    private _chatConnection: ChatConnectionInterface | undefined;
    private chatVisibilitySubscription: Unsubscriber | undefined;

    constructor() {
        this.playerName = localUserStore.getName();
        this.characterTextureIds = localUserStore.getCharacterTextures();
        this.companionTextureId = localUserStore.getCompanionTextureId();
        this.chatVisibilitySubscription = initializeChatVisibilitySubscription();
    }

    public async init(scenePlugin: Phaser.Scenes.ScenePlugin): Promise<string> {
        this.scenePlugin = scenePlugin;
<!-- [1b] GameManager initiates connection (line 60) -->
        const result = await connectionManager.initGameConnexion();
        if (result instanceof URL) {
            window.location.assign(result.toString());
            // window.location.assign is not immediate and Javascript keeps running after.
            // so we need to redirect to an empty Phaser scene, waiting for the redirection to take place
            return EmptySceneName;
        }
        if (result.nextScene === "errorScene") {
            if (result.error instanceof Error) {
                errorScreenStore.setException(result.error);
            } else {
                errorScreenStore.setErrorFromApi(result.error);
            }
            return EmptySceneName;
        }
        this.startRoom = result.room;
        this.loadMap(this.startRoom);

        const preferredAudioInputDeviceId = localUserStore.getPreferredAudioInputDevice();
        const preferredVideoInputDeviceId = localUserStore.getPreferredVideoInputDevice();

        console.info("Preferred audio input device: " + preferredAudioInputDeviceId);
        console.info("Preferred video input device: " + preferredVideoInputDeviceId);

        //If player name was not set show login scene with player name
        //If Room si not public and Auth was not set, show login scene to authenticate user (OpenID - SSO - Anonymous)
        if (!this.playerName || (this.startRoom.authenticationMandatory && !localUserStore.getAuthToken())) {
            return LoginSceneName;
        } else if (result.nextScene === "selectCharacterScene") {
            return SelectCharacterSceneName;
        } else if (result.nextScene === "selectCompanionScene") {
            return SelectCompanionSceneName;
        } else if (preferredVideoInputDeviceId === undefined || preferredAudioInputDeviceId === undefined) {
            return EnableCameraSceneName;
        } else {
            if (preferredVideoInputDeviceId !== "") {
                requestedCameraDeviceIdStore.set(preferredVideoInputDeviceId);
            }

            if (preferredAudioInputDeviceId !== "") {
                requestedMicrophoneDeviceIdStore.set(preferredAudioInputDeviceId);
            }

            this.activeMenuSceneAndHelpCameraSettings();
            //TODO fix to return href with # saved in localstorage
            return this.startRoom.key;
        }
    }

    public setPlayerName(name: string): void {
        this.playerName = name;
    }

    public setVisitCardUrl(visitCardUrl: string): void {
        this.visitCardUrl = visitCardUrl;
    }

    public setCharacterTextureIds(textureIds: string[]): void {
        this.characterTextureIds = textureIds;
        // Only save the textures if the user is not logged in
        // If the user is logged in, the textures will be fetched from the server. No need to save them locally.
        if (!localUserStore.isLogged() || !hasCapability("api/save-textures")) {
            localUserStore.setCharacterTextures(textureIds);
        }
    }

    getPlayerName(): string | null {
        return this.playerName;
    }

    get myVisitCardUrl(): string | null {
        return this.visitCardUrl;
    }

    getCharacterTextureIds(): string[] | null {
        return this.characterTextureIds;
    }

    setCompanionTextureId(textureId: string | null): void {
        this.companionTextureId = textureId;
    }

    getCompanionTextureId(): string | null {
        return this.companionTextureId;
    }

    public loadMap(room: Room) {
        const roomID = room.key;

        const gameIndex = this.scenePlugin.getIndex(roomID);
        if (gameIndex === -1) {
            const game: Phaser.Scene = new GameScene(room);
            this.scenePlugin.add(roomID, game, false);
        }
    }

    public goToStartingMap(): void {
        console.info("starting " + (this.currentGameSceneName || this.startRoom.key));
        this.scenePlugin.start(this.currentGameSceneName || this.startRoom.key);
        this.activeMenuSceneAndHelpCameraSettings();
    }

    /**
     * @private
     * @return void
     */
    private activeMenuSceneAndHelpCameraSettings(): void {
        if (!get(myCameraStore)) {
            return;
        }

        if (
            !localUserStore.getHelpCameraSettingsShown() &&
            (!get(requestedMicrophoneState) || !get(requestedCameraState))
        ) {
            showHelpCameraSettings();
            localUserStore.setHelpCameraSettingsShown();
        }
    }

    public gameSceneIsCreated(scene: GameScene) {
        this.currentGameSceneName = scene.scene.key;
        menuIconVisiblilityStore.set(true);
    }

    /**
     * Temporary leave a gameScene to go back to the loginScene for example.
     * This will close the socket connections and stop the gameScene, but won't remove it.
     */
    leaveGame(targetSceneName: string, sceneClass: Phaser.Scene): void {
        this.closeGameScene();
        if (!this.scenePlugin.get(targetSceneName)) {
            this.scenePlugin.add(targetSceneName, sceneClass, false);
        }
        this.scenePlugin.run(targetSceneName);
    }

    closeGameScene(): void {
        gameSceneIsLoadedStore.set(false);
        const gameScene = this.scenePlugin.get(this.currentGameSceneName ?? "default");

        if (!(gameScene instanceof GameScene)) {
            throw new Error("Not the Game Scene");
        }

        gameScene.cleanupClosingScene();
        gameScene.createSuccessorGameScene(false, false);
        menuIconVisiblilityStore.set(false);
    }

    /**
     * follow up to leaveGame()
     */
    tryResumingGame(fallbackSceneName: string) {
        if (this.currentGameSceneName) {
            this.scenePlugin.start(this.currentGameSceneName);
            menuIconVisiblilityStore.set(true);
        } else {
            this.scenePlugin.run(fallbackSceneName);
        }
    }

    /**
     * Tries to stop the current scene.
     * @param fallbackSceneName
     */
    tryToStopScene(fallbackSceneName: string) {
        this.scenePlugin.stop(fallbackSceneName);
    }

    public getCurrentGameScene(): GameScene {
        const gameScene = this.scenePlugin.get(
            this.currentGameSceneName == undefined ? "default" : this.currentGameSceneName
        );
        if (!(gameScene instanceof GameScene)) {
            throw new GameSceneNotFoundError("Not the Game Scene");
        }
        return gameScene;
    }

    public get currentStartedRoom() {
        return this.startRoom;
    }

    public setMatrixServerUrl(matrixServerUrl: string | undefined) {
        this.matrixServerUrl = matrixServerUrl;
    }

    public getMatrixServerUrl(): string | undefined {
        return this.matrixServerUrl;
    }

    public async getChatConnection(): Promise<ChatConnectionInterface> {
        if (this.chatConnectionPromise) {
            return this.chatConnectionPromise;
        }

        const matrixServerUrl = this.getMatrixServerUrl() ?? MATRIX_PUBLIC_URI;

        if (matrixServerUrl && get(userIsConnected)) {
            this.matrixClientWrapper = new MatrixClientWrapper(matrixServerUrl, localUserStore);

            const matrixClientPromise = this.matrixClientWrapper.initMatrixClient();

            matrixClientPromise.catch((e) => {
                if (e instanceof InvalidLoginTokenError) {
                    loginTokenErrorStore.set(true);
                }
            });

            const matrixChatConnection = new MatrixChatConnection(matrixClientPromise, availabilityStatusStore);
            this._chatConnection = matrixChatConnection;

            this.chatConnectionPromise = matrixChatConnection.init().then(() => matrixChatConnection);
            isMatrixChatEnabledStore.set(true);

            try {
                const gameScene = await waitForGameSceneStore();

                if (gameScene.room.isChatEnabled) {
                    return this.chatConnectionPromise;
                }
            } catch (e) {
                console.error(e);
                Sentry.captureException(e);
            }

            matrixChatConnection.destroy().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            return new VoidChatConnection();
        } else {
            // No matrix connection? Let's fill the gap with a "void" object
            this._chatConnection = new VoidChatConnection();
            isMatrixChatEnabledStore.set(false);
            return this._chatConnection;
        }
    }
    get chatConnection(): ChatConnectionInterface {
        if (!this._chatConnection) {
            throw new Error("_chatConnection not yet initialized");
        }
        return this._chatConnection;
    }

    /**
     * Performs all cleanup actions specific to someone logging out.
     * Currently, this logs out from the Matrix client.
     */
    public async logout(): Promise<void> {
        if (this._chatConnection) {
            try {
                this._chatConnection.clearListener();
                await this._chatConnection.destroy();
                if (this.chatVisibilitySubscription) {
                    this.chatVisibilitySubscription();
                }
                this.clearChatDataFromLocalStorage();
                this._chatConnection = undefined;
                this.chatConnectionPromise = undefined;
            } catch (e) {
                console.error("Chat connection not closed properly : ", e);
                Sentry.captureException(e);
            }
        }
    }

    private clearChatDataFromLocalStorage(): void {
        localUserStore.setMatrixLoginToken(null);
        localUserStore.setMatrixUserId(null);
        localUserStore.setMatrixAccessToken(null);
        localUserStore.setMatrixRefreshToken(null);
    }
}

export const gameManager = new GameManager();

export class GameSceneNotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}

</file>
<file path="MapController.ts">
import { isMapDetailsData } from "@workadventure/messages";
import { z } from "zod";
import type { Request, Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import Debug from "debug";
import { DISABLE_ANONYMOUS } from "../enums/EnvironmentVariable";
import { adminService } from "../services/AdminService";
import { validateQuery } from "../services/QueryValidator";
import { BaseHttpController } from "./BaseHttpController";

const debug = Debug("pusher:requests");

export class MapController extends BaseHttpController {
    // Returns a map mapping map name to file name of the map
    routes(): void {
        /**
         * @openapi
         * /map:
         *   get:
         *     description: Returns a map mapping map name to file name of the map
         *     produces:
         *      - "application/json"
         *     parameters:
         *      - name: "playUri"
         *        in: "query"
         *        description: "The full URL of WorkAdventure to load this map"
         *        required: true
         *        type: "string"
         *      - name: "authToken"
         *        in: "query"
         *        description: "The authentication token"
         *        required: true
         *        type: "string"
         *     responses:
         *       200:
         *         description: The details of the map
         *         schema:
         *           oneOf:
         *            - $ref: "#/definitions/MapDetailsData"
         *            - $ref: "#/definitions/RoomRedirect"
         *       401:
         *         description: Error while retrieving the data because you are not authorized
         *         schema:
         *             $ref: '#/definitions/ErrorApiRedirectData'
         *       403:
         *         description: Error while retrieving the data because you are not authorized
         *         schema:
         *             $ref: '#/definitions/ErrorApiUnauthorizedData'
         *       404:
         *         description: Error while retrieving the data
         *         schema:
         *             $ref: '#/definitions/ErrorApiErrorData'
         *
         */
<!-- [5a] MapController handles /map endpoint (line 55) -->
        this.app.get("/map", async (req: Request, res: Response) => {
            debug(`MapController => [${req.method}] ${req.originalUrl} — IP: ${req.ip} — Time: ${Date.now()}`);
            const query = validateQuery(
                req,
                res,
                z.object({
<!-- [5b] Validates playUri parameter (line 61) -->
                    playUri: z.string(),
                    authToken: z.string().optional(),
                })
            );
            if (query === undefined) {
                return;
            }

            try {
<!-- [5c] Fetches map details from admin service (line 70) -->
                let mapDetails = await adminService.fetchMapDetails(
                    query.playUri,
                    query.authToken,
                    req.header("accept-language")
                );

                const mapDetailsParsed = isMapDetailsData.safeParse(mapDetails);
                if (DISABLE_ANONYMOUS && mapDetailsParsed.success) {
                    mapDetails = mapDetailsParsed.data;
                    mapDetails.authenticationMandatory = true;
                }

<!-- [5d] Returns map details as JSON response (line 82) -->
                res.json(mapDetails);
                return;
            } catch (error) {
                if (error instanceof JsonWebTokenError) {
                    console.warn("Invalid token received", error);
                    res.status(401);
                    res.send("The Token is invalid");
                    return;
                } /* else if (isAxiosError(error)) {
                    if (error.response?.status === 404) {
                        // An error 404 means the map was not found.
                        // Note: we should definitely change this.
                        throw error;
                    }
                    console.warn("Error while fetching map details", error);
                    const status = error.response?.status ?? 404;
                    res.atomic(() => {
                        res.status(status);
                        res.send("Error while fetching map details");
                    });
                    return;
                }*/ else {
                    throw error;
                }
            }
        });
    }
}

</file>
<file path="Room.ts">
import { isAxiosError } from "axios";
import type { LegalsData, OpidWokaNamePolicy } from "@workadventure/messages";
import { isMapDetailsData, isRoomRedirect, ErrorApiData } from "@workadventure/messages";
import {
    CONTACT_URL,
    DISABLE_ANONYMOUS,
    ENABLE_CHAT,
    ENABLE_CHAT_DISCONNECTED_LIST,
    ENABLE_CHAT_ONLINE_LIST,
    ENABLE_CHAT_UPLOAD,
    ENABLE_ISSUE_REPORT,
    ENABLE_OPENID,
    ENABLE_SAY,
    OPID_WOKA_NAME_POLICY,
    PUBLIC_MAP_STORAGE_PREFIX,
} from "../Enum/EnvironmentVariable";
import { ApiError } from "../Stores/Errors/ApiError";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import { axiosWithRetry } from "./AxiosUtils";
import { localUserStore } from "./LocalUserStore";
export class MapDetail {
    constructor(public readonly mapUrl?: string, public readonly wamUrl?: string) {}
}

export interface RoomRedirect {
    redirectUrl: string;
}

export class Room {
    public readonly id: string;
    private _authenticationMandatory: boolean = DISABLE_ANONYMOUS;
    private _opidLogoutRedirectUrl: string = new URL("logout", ABSOLUTE_PUSHER_URL).toString();
    private _opidWokaNamePolicy: OpidWokaNamePolicy | undefined;
    private _mapUrl: string | undefined;
    private _wamUrl: string | undefined;
    private readonly _search: URLSearchParams;
    private _contactPage: string | undefined;
    private _group: string | null = null;
    private _expireOn: Date | undefined;
    private _canReport = false;
    private _loadingLogo: string | undefined;
    private _loginSceneLogo: string | undefined;
    private _metadata: unknown;
    private _backgroundSceneImage: string | undefined;
    private _showPoweredBy: boolean | undefined = true;
    private _roomName: string | undefined;
    private _pricingUrl: string | undefined;
    private _enableChat: boolean | undefined;
    private _isMatrixChatEnabled: boolean | undefined;
    private _enableChatUpload: boolean | undefined;
    private _enableChatOnlineList: boolean | undefined;
    private _enableChatDisconnectedList: boolean | undefined;
    private _enableSay: boolean | undefined;
    private _enableIssueReport: boolean | undefined;
    private _legals: LegalsData | undefined;
    private _backgroundColor: string | undefined;
    private _primaryColor: string | undefined;
    private _iconClothes: string | undefined;
    private _iconAccessory: string | undefined;
    private _iconHat: string | undefined;
    private _iconHair: string | undefined;
    private _iconEyes: string | undefined;
    private _iconBody: string | undefined;
    private _iconTurn: string | undefined;
    private _reportIssuesUrl: string | undefined;
    private _entityCollectionsUrls: string[] | undefined;
    private _errorSceneLogo: string | undefined;
    private _modules: string[] = [];
    private _isLogged: boolean | undefined;

    private constructor(private roomUrl: URL) {
        this.id = roomUrl.pathname;

        if (this.id.startsWith("/")) {
            this.id = this.id.substring(1);
        }

        if (this.roomUrl.pathname.endsWith("/")) {
            this.roomUrl.pathname = this.roomUrl.pathname.slice(0, -1);
        }

        this._search = new URLSearchParams(roomUrl.search);
    }

    /**
     * Creates a "Room" object representing the room.
     * This method will follow room redirects if necessary, so the instance returned is a "real" room.
     */
    public static async createRoom(roomUrl: URL): Promise<Room> {
        let redirectCount = 0;
        while (redirectCount < 32) {
            const room = new Room(roomUrl);
            //eslint-disable-next-line no-await-in-loop
<!-- [1d] Room fetches map details from backend (line 94) -->
            const result = await room.getMapDetail();
            if (result instanceof MapDetail) {
                return room;
            }
            redirectCount++;
            roomUrl = new URL(result.redirectUrl, window.location.href);
        }
        throw new Error("Room resolving seems stuck in a redirect loop after 32 redirect attempts");
    }

    public static getRoomPathFromExitUrl(exitUrl: string, currentRoomUrl: string): URL {
        const url = new URL(exitUrl, currentRoomUrl);
        return url;
    }

    /**
     * @deprecated USage of exitSceneUrl is deprecated and therefore, this method is deprecated too.
     */
    public static getRoomPathFromExitSceneUrl(
        exitSceneUrl: string,
        currentRoomUrl: string,
        currentMapUrl: string
    ): URL {
        const absoluteExitSceneUrl = new URL(exitSceneUrl, currentMapUrl);
        const baseUrl = new URL(currentRoomUrl);

        const currentRoom = new Room(baseUrl);
        let instance = "global";
        if (currentRoom.id.startsWith("_/") || currentRoom.id.startsWith("*/")) {
            const match = /[_*]\/([^/]+)\/.+/.exec(currentRoom.id);
            if (!match) throw new Error('Could not extract instance from "' + currentRoom.id + '"');
            instance = match[1];
        }

        baseUrl.pathname = "/_/" + instance + "/" + absoluteExitSceneUrl.host + absoluteExitSceneUrl.pathname;
        baseUrl.hash = absoluteExitSceneUrl.hash;

        return baseUrl;
    }

    private async getMapDetail(): Promise<MapDetail | RoomRedirect> {
        try {
<!-- [2a] Room makes GET request to /map endpoint (line 136) -->
            const result = await axiosWithRetry.get<unknown>("map", {
                params: {
                    playUri: this.roomUrl.toString(),
                    authToken: localUserStore.getAuthToken(),
                },
            });

            const data = result.data;

            const roomRedirectChecking = isRoomRedirect.safeParse(data);
            const mapDetailsDataChecking = isMapDetailsData.safeParse(data);
            const errorApiDataChecking = ErrorApiData.safeParse(data);
            if (roomRedirectChecking.success) {
                const data = roomRedirectChecking.data;
                return {
                    redirectUrl: data.redirectUrl,
                };
            } else if (mapDetailsDataChecking.success) {
                const data = mapDetailsDataChecking.data;

                if (data.authenticationMandatory !== undefined) {
                    data.authenticationMandatory = Boolean(data.authenticationMandatory);
                }

                console.info("Map ", this.id, " resolves to URL ", data.mapUrl);
                this._mapUrl = data.mapUrl;
                this._wamUrl = data.wamUrl;
                this._group = data.group;
                this._authenticationMandatory =
                    data.authenticationMandatory != null ? data.authenticationMandatory : DISABLE_ANONYMOUS;
                this._opidLogoutRedirectUrl =
                    data.opidLogoutRedirectUrl || new URL("logout", ABSOLUTE_PUSHER_URL).toString();
                this._contactPage = data.contactPage || CONTACT_URL;
                if (data.expireOn) {
                    this._expireOn = new Date(data.expireOn);
                }
                this._opidWokaNamePolicy = data.opidWokaNamePolicy ?? OPID_WOKA_NAME_POLICY;
                this._canReport = data.canReport ?? false;
                this._loadingLogo = data.loadingLogo ?? undefined;
                this._loginSceneLogo = data.loginSceneLogo ?? undefined;
                this._backgroundSceneImage = data.backgroundSceneImage ?? undefined;
                this._showPoweredBy = data.showPoweredBy ?? true;
                this._backgroundColor = data.backgroundColor ?? undefined;
                this._primaryColor = data.primaryColor ?? undefined;
                this._metadata = data.metadata ?? undefined;

                this._roomName = data.roomName ?? undefined;

                this._pricingUrl = data.pricingUrl ?? undefined;
                this._legals = data.legals ?? undefined;

                this._enableChat = (data.enableChat ?? true) && ENABLE_CHAT;
                this._isMatrixChatEnabled = (data.enableMatrixChat ?? true) && ENABLE_OPENID;
                this._enableChatUpload = (data.enableChatUpload ?? true) && ENABLE_CHAT_UPLOAD;
                this._enableChatOnlineList = (data.enableChatOnlineList ?? true) && ENABLE_CHAT_ONLINE_LIST;
                this._enableChatDisconnectedList =
                    (data.enableChatDisconnectedList ?? true) && ENABLE_CHAT_DISCONNECTED_LIST;
                this._enableSay = (data.enableSay ?? true) && ENABLE_SAY;
                this._enableIssueReport = (data.enableIssueReport ?? true) && ENABLE_ISSUE_REPORT;
                this._iconClothes = data.customizeWokaScene?.clothesIcon ?? undefined;
                this._iconAccessory = data.customizeWokaScene?.accessoryIcon ?? undefined;
                this._iconBody = data.customizeWokaScene?.bodyIcon ?? undefined;
                this._iconEyes = data.customizeWokaScene?.eyesIcon ?? undefined;
                this._iconHair = data.customizeWokaScene?.hairIcon ?? undefined;
                this._iconHat = data.customizeWokaScene?.hatIcon ?? undefined;
                this._iconTurn = data.customizeWokaScene?.turnIcon ?? undefined;
                this._reportIssuesUrl = data.reportIssuesUrl ?? undefined;

                this._entityCollectionsUrls = data.entityCollectionsUrls ?? undefined;

                this._errorSceneLogo = data.errorSceneLogo ?? undefined;
                this._modules = data.modules ?? [];
                // If the server returns a value for "isLogged", let's use it.
                // Even if we are logged in the localUserStore, the user might not be valid for this room.
                // If no data is passed by the server, fallback to the localUserStore value.
                this._isLogged = data.isLogged ?? localUserStore.isLogged();

                return new MapDetail(data.mapUrl, data.wamUrl);
            } else if (errorApiDataChecking.success) {
                const error = errorApiDataChecking.data;
                throw new ApiError(error);
            } else {
                console.error("roomRedirectChecking", roomRedirectChecking.error.issues);
                console.error("mapDetailsDataChecking", mapDetailsDataChecking.error.issues);
                console.error("errorApiDataChecking", errorApiDataChecking.error.issues);
<!-- [2f] Error thrown when /map response is invalid (line 221) -->
                throw new Error("Data received by the /map endpoint of the Pusher is not in a valid format.");
            }
        } catch (e) {
            if (isAxiosError(e) && e.response?.status == 401 && e.response?.data === "The Token is invalid") {
                console.warn("JWT token sent could not be decrypted. Maybe it expired?");
                localUserStore.setAuthToken(null);
                window.location.reload();
            } else if (isAxiosError(e)) {
                console.error("Error => getMapDetail", e, e.response);
            } else {
                console.error("Error => getMapDetail", e);
            }
            throw e;
        }
    }

    public isDisconnected(): boolean {
        const alone = this._search.get("alone");
        if (alone && alone !== "0" && alone.toLowerCase() !== "false") {
            return true;
        }
        return false;
    }

    public get search(): URLSearchParams {
        return this._search;
    }

    /**
     * 2 rooms are equal if they share the same path (but not necessarily the same hash)
     * @param room
     */
    public isEqual(room: Room): boolean {
        return room.key === this.key;
    }

    /**
     * A key representing this room
     */
    public get key(): string {
        const newUrl = new URL(this.roomUrl.toString());
        newUrl.search = "";
        newUrl.hash = "";
        return newUrl.toString();
    }

    public get href(): string {
        return this.roomUrl.toString();
    }

    get mapUrl(): string | undefined {
        return this._mapUrl;
    }

    get wamUrl(): string | undefined {
        return this._wamUrl;
    }

    get mapStorageUrl(): URL | undefined {
        if (!this._wamUrl) {
            return undefined;
        }
        const mapStoragePath = `${PUBLIC_MAP_STORAGE_PREFIX}`;
        return new URL(mapStoragePath, this._wamUrl);
    }

    get authenticationMandatory(): boolean {
        return this._authenticationMandatory;
    }

    get opidLogoutRedirectUrl(): string {
        return this._opidLogoutRedirectUrl;
    }

    get contactPage(): string | undefined {
        return this._contactPage;
    }

    get group(): string | null {
        return this._group;
    }

    get expireOn(): Date | undefined {
        return this._expireOn;
    }

    get canReport(): boolean {
        return this._canReport;
    }

    get opidWokaNamePolicy(): OpidWokaNamePolicy | undefined {
        return this._opidWokaNamePolicy;
    }

    get loadingLogo(): string | undefined {
        return this._loadingLogo;
    }

    get loginSceneLogo(): string | undefined {
        return this._loginSceneLogo;
    }

    get backgroundSceneImage(): string | undefined {
        return this._backgroundSceneImage;
    }

    get metadata(): unknown {
        return this._metadata;
    }

    get roomName(): string | undefined {
        return this._roomName;
    }

    get showPoweredBy(): boolean | undefined {
        return this._showPoweredBy;
    }

    get pricingUrl(): string | undefined {
        return this._pricingUrl;
    }

    get isChatEnabled(): boolean {
        if (this._enableChat === undefined) {
            return true;
        }
        return this._enableChat;
    }

    get isMatrixChatEnabled(): boolean {
        if (this._isMatrixChatEnabled === undefined) {
            return true;
        }
        return this._isMatrixChatEnabled;
    }

    get isChatUploadEnabled(): boolean {
        if (this._enableChatUpload === undefined) {
            return true;
        }
        return this._enableChatUpload;
    }

    get isChatOnlineListEnabled(): boolean {
        if (this._enableChatOnlineList === undefined) {
            return true;
        }
        return this._enableChatOnlineList;
    }

    get isChatDisconnectedListEnabled(): boolean {
        if (this._enableChatDisconnectedList === undefined) {
            return true;
        }
        return this._enableChatDisconnectedList;
    }

    get isSayEnabled(): boolean {
        if (this._enableSay === undefined) {
            return true;
        }
        return this._enableSay;
    }

    get isIssueReportEnabled(): boolean {
        if (this._enableIssueReport === undefined) {
            return true;
        }
        return this._enableIssueReport;
    }

    get legals(): LegalsData | undefined {
        return this._legals;
    }

    get backgroundColor(): string | undefined {
        return this._backgroundColor;
    }

    get primaryColor(): string | undefined {
        return this._primaryColor;
    }

    get iconClothes(): string | undefined {
        return this._iconClothes;
    }

    get iconAccessory(): string | undefined {
        return this._iconAccessory;
    }

    get iconHat(): string | undefined {
        return this._iconHat;
    }

    get iconHair(): string | undefined {
        return this._iconHair;
    }

    get iconEyes(): string | undefined {
        return this._iconEyes;
    }

    get iconBody(): string | undefined {
        return this._iconBody;
    }

    get iconTurn(): string | undefined {
        return this._iconTurn;
    }

    get reportIssuesUrl(): string | undefined {
        return this._reportIssuesUrl;
    }

    get entityCollectionsUrls(): string[] | undefined {
        return this._entityCollectionsUrls;
    }

    get errorSceneLogo(): string | undefined {
        return this._errorSceneLogo;
    }

    get modules(): string[] {
        return this._modules;
    }

    get isLogged(): boolean {
        if (this._isLogged === undefined) {
            throw new Error("isLogged not yet initialized.");
        }
        return this._isLogged;
    }
}

</file>
<file path="index.html">
<!DOCTYPE html>
<html lang="">
    <head>
        <title>{{ title }}</title>
        <meta charset="UTF-8" />
        <meta name="title" content="{{ title }}" />
        <meta name="description" content="{{ description }}" />
        <meta name="author" content="{{ author }}" />
        <meta name="provider" content="{{ provider }}" />
        <meta
            name="viewport"
            content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
        />
        <meta
            http-equiv="Content-Security-Policy"
            content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src data: * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; font-src * data: ; frame-src *; style-src * 'unsafe-inline'; worker-src 'self' blob:;" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />

        <!-- TRACK CODE -->
        <!-- END TRACK CODE -->

        <!-- App Design -->
        <meta name="msapplication-TileColor" content="{{ themeColor }}" />
        <meta name="msapplication-TileImage" content="{{ msApplicationTileImage }}" />
        <meta name="theme-color" content="{{ themeColor }}" />

        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ url }}">
        <meta property="og:title" content="{{ title }}">
        <meta property="og:description" content="{{ description }}">
        <meta property="og:image" content="{{ cardImage }}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="{{ url }}">
        <meta property="twitter:title" content="{{ title }}">
        <meta property="twitter:description" content="{{ description }}">
        <meta property="twitter:image" content="{{ cardImage }}">

        <base href="/" />

        <!-- Icons -->
        {{#favIcons}}
        <link rel="{{ rel }}" type="image/png" sizes="{{ sizes }}" href="{{ src }}" />
        {{/favIcons}}
        <link rel="manifest" href="/static/images/favicons/manifest.json?url={{ url }}" />

        <style>
            /*hide cowebsite container before scss is loaded*/
            #cowebsite,
            #chat-aside {
                visibility: collapse;
            }
        </style>

        <script>
            if (localStorage && localStorage.getItem("debug_throttle")) {
                // This is a TEMPORARY TEST MODE that overloads setTimeout to detect when Chrome is throttling the page.
                // If you see this message in the console, it means that Chrome is throttling the page.
                console.info("Debug mode: setTimeout/setInterval are overloaded to detect when Chrome is throttling the page.")

                // To test, see: https://docs.google.com/document/d/11FhKHRcABGS4SWPFGwoL6g0ALMqrFKapCk5ZTKKupEk/edit
                // google-chrome --enable-features="IntensiveWakeUpThrottling:grace_period_seconds/10,OptOutZeroTimeoutTimersFromThrottling,AllowAggressiveThrottlingWithWebSocket"

                var _ = setTimeout;
                var __ = setInterval;
                window.setTimeout = function (callback, delay) {
                    const startTimestamp = Date.now();
                    return _(() => {
                        const endTimestamp = Date.now();
                        // If the delay is more than 500ms longer than expected, it means that Chrome throttled the page.
                        if (endTimestamp - startTimestamp > delay + 500) {
                            console.warn(
                                'setTimeout was throttled by Chrome! Delay was ' +
                                (endTimestamp - startTimestamp) +
                                'ms, but should have been ' +
                                delay +
                                'ms.'
                            );
                            console.trace();
                        }
                        callback();
                    }, delay);
                };
                window.setInterval = function (callback, delay) {
                    let timestamp = Date.now();
                    return __(() => {
                        const newTimestamp = Date.now();
                        if (newTimestamp - timestamp > delay + 500) {
                            console.warn(
                                'setInterval was throttled by Chrome! Delay was ' +
                                (newTimestamp - timestamp) +
                                'ms, but should have been ' +
                                delay +
                                'ms.'
                            );
                            console.trace();
                        }
                        timestamp = newTimestamp;
                        callback();
                    }, delay);
                };
            }
        </script>
        <script>
<!-- [4d] HTML template receives injected script (line 107) -->
            {{{ script }}}
        </script>

        {{#logRocketId}}
            <!-- LogRocket -->
            <input type="hidden" id="log-rocket-id" value="{{ logRocketId }}">
            <input type="hidden" id="log-rocket-roomurl" value="{{ url }}">
            <script src="https://cdn.lr-in-prod.com/LogRocket.min.js" crossorigin="anonymous"></script>
            <script>
                console.info('Start LogRocket script!');
                window.addEventListener('DOMContentLoaded', (event) => {
                    const logRocketId = document.getElementById('log-rocket-id').value;
                    const roomUrl = document.getElementById('log-rocket-roomurl').value;
                    window.LogRocket && window.LogRocket.init(logRocketId);

                    // This is an example script - don't forget to change it!
                    window.LogRocket.identify("{{ userId }}", {
                        name: "{{ userId }}",
                        // Add your own custom user variables here, ie:
                        roomId: roomUrl
                    });
                });
            </script>
        {{/logRocketId}}

        {{#googleDrivePickerClientId}}
            <script type="text/javascript">
                window.pickerInited = false;
                window.gisInited = false;

                /**
                 * Callback after api.js is loaded.
                 */
                function gapiLoaded() {
                    gapi.load('client:picker', initializePicker);
                }

                /**
                 * Callback after the API client is loaded. Loads the
                 * discovery doc to initialize the API.
                 */
                async function initializePicker() {
                    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
                    pickerInited = true;
                }

                /**
                 * Callback after Google Identity Services are loaded.
                 */
                function gisLoaded() {
                    window.gisInited = true;
                }
            </script>
            <script async defer src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
            <script async defer src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
        {{/googleDrivePickerClientId}}

    </head>
    <body id="body" style="margin: 0;background-color:rgb(27, 42, 65);" class="text-white">
        <input type="hidden" id="authToken" value="{{ authToken }}" name="authToken">
        <input type="hidden" id="matrixLoginToken" value="{{ matrixLoginToken }}" name="matrixLoginToken">
        <div id="app"></div>
        <script type="module" src="/src/svelte.ts"></script>
    </body>
    {{{cssVariablesOverride}}}
</html>

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

(async () => {
    await App.init();
    App.listen();
    App.grpcListen();
})().catch((e) => {
    console.error(e);
    Sentry.captureException(e);
});

</file>
</files>
```

---

*Exported from Code Map on 27.12.2025*