# WorkAdventure Global Svelte Store Architecture: State Management Patterns

> 📅 **Created:** 26 декабря 2025 г. в 17:11

## Overview

This map traces how WorkAdventure uses global Svelte stores for state management across Svelte components, Phaser game scenes, WebRTC connections, and Space systems. Key patterns include store creation/export in centralized files, cross-layer subscriptions, and custom store utilities. Notable locations: store creation **[1a]**, component subscription **[2b]**, Phaser integration **[3c]**, WebRTC usage **[4d]**, custom MapStore **[5b]**.

## Table of Contents

1. [Global Media Store Creation and Cross-Layer Usage](#1-global-media-store-creation-and-cross-layer-usage)
2. [Component Multi-Store Subscription Pattern](#2-component-multi-store-subscription-pattern)
3. [Phaser Game Scene Store Integration](#3-phaser-game-scene-store-integration)
4. [WebRTC Layer Store Subscription Pattern](#4-webrtc-layer-store-subscription-pattern)
5. [Custom Store Utilities: MapStore Pattern](#5-custom-store-utilities-mapstore-pattern)
6. [LocalStorage Persistence via LocalUserStore](#6-localstorage-persistence-via-localuserstore)
7. [Store Aggregation: StreamableCollectionStore Pattern](#7-store-aggregation-streamablecollectionstore-patter)

---

## 1. Global Media Store Creation and Cross-Layer Usage

> Core media state management - shows how a global store is created, exported, and consumed across Svelte components and Phaser scenes.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure needs to manage camera/microphone state across **three completely different layers**: Svelte UI components, Phaser game engine scenes, and WebRTC networking code. The problem is that when a user clicks the camera button in the UI, that state change must instantly propagate to the game renderer (to show/hide video overlays), the media capture system (to start/stop the camera), and the WebRTC layer (to send/stop streams to peers). Traditional component-local state would require complex prop drilling and callback chains across these architectural boundaries.

The solution is **global Svelte stores** that act as a single source of truth, allowing any layer to subscribe to state changes and react accordingly.


### Details


#### Store Creation Pattern

Media state stores are created in centralized files like `MediaStore.ts` using Svelte's `writable()` function **[1a]**. The initial value comes from `LocalUserStore`, which reads from browser localStorage to persist state across sessions. The store is then **exported as a singleton** **[1b]** so any module can import it.


#### Multi-Store Derivation

Complex computed state is created using `derived()` stores that combine multiple global stores **[1c]**. For example, `mediaStreamConstraintsStore` derives from 12 different stores (camera state, microphone state, privacy settings, energy saving mode, etc.) to compute the final MediaStream constraints. When any input store changes, the derived store automatically recomputes.


#### Component Consumption

Svelte components import the global store directly **[1d]** and use the `$` prefix syntax for automatic subscription **[1e]**. This creates a reactive binding—whenever the store updates, the component re-renders. Components can also call custom methods like `requestedCameraState.disableWebcam()` to mutate the global state.


#### Cross-Layer Integration

**Non-Svelte code** like Phaser game scenes also imports the same global stores **[1f]**. Since they can't use Svelte's `$` syntax, they manually call `.subscribe()` and store the unsubscriber function for cleanup. This allows the game engine to react to UI state changes without any direct coupling between the UI and game layers.


#### Key Insight

The entire architecture relies on **global mutable state** managed through Svelte stores. Every store is a singleton exported from a centralized file, and any code—whether Svelte components, Phaser scenes, or WebRTC managers—can import and subscribe to it. This creates implicit dependencies across the entire codebase.

</details>


### Global Media Store: Creation to Cross-Layer Usage

  - Store Definition Module (MediaStore.ts)
    - createRequestedCameraState() factory

      #### [1a] Global writable store creation
      📄 `MediaStore.ts:36`

      ```typescript
      const { subscribe, set } = writable(localUserStore.getRequestedCameraState());
      ```

      - returns { subscribe, enableWebcam, ... }

    #### [1b] Store exported globally
    📄 `MediaStore.ts:83`

    ```typescript
    export const requestedCameraState = createRequestedCameraState();
    ```

    - export const mediaStreamConstraintsStore

      #### [1c] Derived store combining multiple globals
      📄 `MediaStore.ts:391`

      ```typescript
      export const mediaStreamConstraintsStore = derived(
      ```

  - Svelte Component Layer (CameraMenuItem.svelte)

    #### [1d] Component imports global store
    📄 `CameraMenuItem.svelte:12`

    ```
    requestedCameraState,
    ```

    - Component template

      #### [1e] Component reads store with $ syntax
      📄 `CameraMenuItem.svelte:37`

      ```
      if ($requestedCameraState === true) {
      ```

    - cameraClick() handler
      - requestedCameraState.disableWebcam()
  - Phaser Game Engine Layer (GameScene.ts)

    #### [1f] Phaser scene imports same global store
    📄 `GameScene.ts:117`

    ```typescript
    requestedCameraState,
    ```

    - GameScene.create()
      - this.unsubscribers.push(
      - requestedCameraState.subscribe(...))

---

## 2. Component Multi-Store Subscription Pattern

> Svelte component layer - demonstrates how components subscribe to multiple global stores and create local derived stores.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure needs to **share state across multiple Svelte components** that aren't in a parent-child relationship. For example, the camera button in the action bar needs to know the current camera state, while the settings menu also needs to display and modify the same state. Rather than prop drilling through many intermediate components, WorkAdventure uses **global Svelte stores** that any component can import and subscribe to.

The pattern solves a fundamental problem: **how do you keep UI elements synchronized** when they're scattered across different parts of the component tree? A user clicking the camera button should immediately update the camera icon, the settings panel, and trigger WebRTC stream changes—all without manual event passing.


### Details


#### Store Import Pattern

Components import global stores directly from centralized Store files **[2a]**. For example, `CameraMenuItem.svelte` imports four different stores from `MediaStore.ts`: `availabilityStatusStore`, `mouseIsHoveringCameraButton`, `requestedCameraState`, and `silentStore`. These are **singleton instances** shared across the entire application.


#### Local Derived Stores

Components often create **local derived stores** that combine multiple global stores **[2b]**. The `cameraButtonStateStore` derives its value from `availabilityStatusStore` and `requestedCameraState`, computing whether the button should be "active", "disabled", "normal", or "forbidden". This keeps business logic in the component while still reacting to global state.


#### Reactive Subscriptions

Svelte's **`$` prefix syntax** provides automatic subscription and cleanup **[2d]**. When you write `$cameraButtonStateStore` in the template, Svelte automatically subscribes when the component mounts and unsubscribes when it unmounts. This is the preferred pattern for most use cases.


#### Manual Subscription Management

For more control, components can manually subscribe to stores **[2e]**. The `Menu.svelte` component calls `activeSubMenuStore.subscribe()` and stores the returned unsubscriber function. This is necessary when subscriptions need to be created conditionally or in lifecycle hooks. **Manual subscriptions must be cleaned up** in `onDestroy()` **[2f]** to prevent memory leaks.


#### Store Mutation

Global stores expose custom methods for updates **[2c]**. Instead of calling `set()` directly, `requestedCameraState` provides `enableWebcam()` and `disableWebcam()` methods. These methods update both the store **and** persist the state to localStorage via `LocalUserStore`, ensuring the user's preference survives page reloads.


#### Key Tradeoff

This architecture makes state **globally accessible** but also **globally mutable**. Any component can import and modify any store, which provides flexibility but requires discipline to avoid unexpected state changes from distant parts of the codebase.

</details>


### CameraMenuItem.svelte Component


  #### [2a] Component imports multiple stores
  📄 `CameraMenuItem.svelte:9`

  ```
  import {
  ```

    - availabilityStatusStore
    - mouseIsHoveringCameraButton
    - requestedCameraState
    - silentStore
  - Component script section

    #### [2b] Local derived store from globals
    📄 `CameraMenuItem.svelte:18`

    ```
    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
    ```

      - derived([availabilityStatusStore,
      - requestedCameraState], ...)
    - cameraClick() handler
      - Check $silentStore condition

      #### [2c] Component mutates global store
      📄 `CameraMenuItem.svelte:38`

      ```
      requestedCameraState.disableWebcam();
      ```

        - requestedCameraState.disableWebcam()
        - requestedCameraState.enableWebcam()
  - Component template
    - <ActionBarButton>

      #### [2d] Reactive binding to derived store
      📄 `CameraMenuItem.svelte:49`

      ```
      state={$cameraButtonStateStore}
      ```

        - state={$cameraButtonStateStore}

### Menu.svelte Component (Lifecycle)

  - onMount() lifecycle

    #### [2e] Manual subscription with cleanup
    📄 `Menu.svelte:38`

    ```
    unsubscriberActiveSubMenuStore = activeSubMenuStore.subscribe((value) => {
    ```

      - activeSubMenuStore.subscribe
        - Store unsubscriberActiveSubMenuStore
  - onDestroy() lifecycle

    #### [2f] Cleanup in onDestroy
    📄 `Menu.svelte:54`

    ```
    unsubscriberSubMenuStore();
    ```

      - unsubscriberSubMenuStore()
      - unsubscriberActiveSubMenuStore()

---

## 3. Phaser Game Scene Store Integration

> Game engine layer - shows how non-Svelte Phaser code subscribes to global stores and manages lifecycle.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure is built with **two fundamentally different UI systems**: Svelte components for menus/overlays and Phaser for the 2D game world. The problem is that both systems need to **share the same application state** (camera on/off, user positions, media streams, etc.).

Svelte has built-in reactivity through stores, but Phaser is a traditional game engine with no native store support. The solution is to use **global Svelte stores as a shared state layer** that both systems can read from and write to [3a, 3b].


### Details


#### Store Import Pattern

Non-Svelte code (like Phaser scenes) imports both the **store utilities** (`get`, `Readable`, `Unsubscriber` types) [3b, 3c] and the **actual global stores** from centralized Store files **[3a]**. The `get()` function allows synchronous reads without subscribing, while manual subscriptions enable reactive updates.


#### Custom Store Creation in Classes

Classes that aren't Svelte components can create their own stores using Svelte's `readable()` factory **[3d]**. The key pattern is the **start/stop callback lifecycle**: when the first subscriber appears, the start callback runs to register resources **[3e]**; when the last subscriber leaves, the stop callback runs cleanup **[3f]**. This ties store lifecycle to subscription lifecycle, preventing memory leaks.


#### Subscription Management

Since Phaser code doesn't have Svelte's automatic subscription cleanup, it must **manually track `Unsubscriber` functions** and call them during teardown. Classes typically maintain arrays of unsubscribers that get invoked when the scene/object is destroyed, ensuring proper cleanup of all store subscriptions.


#### The Trade-off

This architecture enables **seamless state sharing** across UI frameworks, but creates **global coupling**: any code can import and mutate any store. Changes to store structure ripple across the entire codebase, and it's difficult to reason about what code depends on what state.

</details>


### Phaser Game Scene Store Integration

  - GameScene class initialization

    #### [3b] Imports Svelte get() utility
    📄 `GameScene.ts:9`

    ```typescript
    import { get } from "svelte/store";
    ```


    #### [3c] TypeScript types for store management
    📄 `GameScene.ts:8`

    ```typescript
    import type { Readable, Unsubscriber } from "svelte/store";
    ```


    #### [3a] GameScene imports 10+ global stores
    📄 `GameScene.ts:111`

    ```typescript
    import {
    ```

      - (MediaStore, MenuStore, etc.)
  - Non-Svelte class creates own store
    - Space.constructor()

      #### [3d] Space class creates readable store
      📄 `Space.ts:141`

      ```typescript
      this.usersStore = readable(new Map<string, SpaceUserExtended>(), (set) => {
      ```

        - start callback

          #### [3e] Store start callback registers resources
          📄 `Space.ts:142`

          ```typescript
          this.registerSpaceFilter();
          ```

        - stop callback

          #### [3f] Store stop callback cleanup
          📄 `Space.ts:147`

          ```typescript
          if (!this.isDestroyed) {
          ```

  - Store subscription pattern
    - Manual subscribe() calls
      - Store Unsubscriber tracking
    - Cleanup in destroy lifecycle

---

## 4. WebRTC Layer Store Subscription Pattern

> Network layer - demonstrates how WebRTC connection code subscribes to media stores and propagates state.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure's WebRTC layer needs to **synchronize media streams** (video/audio/screen sharing) between users in real-time. The challenge is that media state lives in **global Svelte stores** (designed for UI reactivity), but the WebRTC connection code (SimplePeer) is **non-Svelte TypeScript** that must react to these state changes and propagate streams to remote peers.

The problem: How does a WebRTC peer manager **subscribe to UI state changes** and trigger network actions, while maintaining clean separation between the reactive UI layer and the imperative networking layer?


### Details


#### Store Import Pattern

SimplePeer imports global media stores like `screenSharingLocalStreamStore` **[4a]** as module-level dependencies. These stores are created in centralized Store files and exported as singletons accessible throughout the application.


#### Dependency Injection

The SimplePeer constructor receives stores as **parameters** **[4b]**, not direct imports. This allows the class to be instantiated with different store instances (useful for testing), while defaulting to the global singletons. The stores are stored as private fields like `_screenSharingLocalStreamStore`.


#### Subscription and Side Effects

In the `initialise()` method, SimplePeer **subscribes to the media store** **[4c]**. When the store emits a new value (e.g., user starts screen sharing), the subscription callback receives the `streamResult` and immediately calls `sendLocalScreenSharingStream()` **[4d]** to propagate the stream to all connected peers via WebRTC.

The subscription returns an unsubscriber function that's tracked in `this._unsubscribers` array for cleanup when the peer connection closes.


#### Peer State Management

The reverse direction uses **ForwardableStore** **[4e]**, a custom store utility that wraps a writable store. When remote peers send their video streams, SimplePeer updates `videoStreamStore`, which is then **transformed via derived stores** **[4f]** (Map → Array) for consumption by Svelte components that render the video elements.

This creates a **bidirectional flow**: UI stores → WebRTC actions (outbound), and WebRTC events → UI stores (inbound).

</details>


### WebRTC Layer Store Integration

  - SimplePeer class initialization

    #### [4a] SimplePeer imports global media stores
    📄 `SimplePeer.ts:9`

    ```typescript
    import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
    ```


    #### [4b] Constructor receives store as dependency
    📄 `SimplePeer.ts:58`

    ```typescript
    private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
    ```

      - Store as dependency injection
    - initialise() method

      #### [4c] WebRTC subscribes to media store
      📄 `SimplePeer.ts:68`

      ```typescript
      this._screenSharingLocalStreamStore.subscribe((streamResult) => {
      ```

        - streamResult callback

          #### [4d] Store change triggers WebRTC action
          📄 `SimplePeer.ts:76`

          ```typescript
          this.sendLocalScreenSharingStream(streamResult.stream);
          ```

        - Store unsubscriber tracked
  - Global Peer State Stores

    #### [4e] Custom ForwardableStore for peer state
    📄 `PeerStore.ts:6`

    ```typescript
    export const videoStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());
    ```

      - Custom store utility pattern

    #### [4f] Derived store transforms peer data
    📄 `PeerStore.ts:9`

    ```typescript
    export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    ```

      - Map → Array for components

---

## 5. Custom Store Utilities: MapStore Pattern

> Store utilities layer - shows custom store implementations that extend Svelte's built-in stores with Map-like behavior.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure needs **reactive data structures** that can be observed for changes. While Svelte provides basic stores (writable, readable, derived), the application frequently needs to manage **collections of items** (like video streams, users, or entities) where:

1. Items are accessed by **key** (like a Map)
2. Components need to **react to changes** when items are added, removed, or updated
3. Individual items may contain **nested stores** that also need observation

The problem: JavaScript's native `Map` doesn't trigger Svelte reactivity, and wrapping a Map in a store means components can't efficiently subscribe to changes in specific keys or nested values **[5a]**.


### Details


#### MapStore Architecture

**MapStore** extends JavaScript's `Map` class while implementing Svelte's `Readable` interface **[5a]**. This dual nature allows it to be used like a normal Map (`set()`, `get()`, `delete()`) while also being subscribable like a Svelte store.

Internally, it wraps a **writable store** **[5b]** that holds a reference to the MapStore itself. Every mutation operation (`set()`, `delete()`, `clear()`) calls `this.store.set(this)` **[5c]****[5d]** to notify all subscribers that the Map has changed.


#### Key Features

**Per-key subscriptions**: The `getStore(key)` method returns a store that only updates when that specific key changes, avoiding unnecessary re-renders when other keys are modified.

**Nested store access**: `getNestedStore()` **[5f]** allows subscribing to stores contained within Map values. If a value has a property that is itself a store, this method creates a derived store that updates when either the Map key changes OR the nested store updates.

**Aggregation**: `getAggregatedStore()` can reduce values across all keys, useful for computing totals or combined states.


#### Usage Pattern

The Space class instantiates MapStore for managing video streams **[5e]**:

```
public allVideoStreamStore: MapStore<string, VideoBox>
```

This allows the Space to add/remove video streams using Map methods while UI components automatically react to changes through store subscriptions. The MapStore pattern is used throughout WorkAdventure for managing dynamic collections that need both imperative access and reactive updates.

</details>


### Custom MapStore Implementation & Usage


  #### [5a] MapStore extends Map and implements Readable
  📄 `MapStore.ts:35`

  ```typescript
  export class MapStore<K, V> extends Map<K, V> implements Readable<Map<K, V>> {
  ```


    #### [5b] Internal writable store
    📄 `MapStore.ts:36`

    ```typescript
    private readonly store = writable(this);
    ```

    - subscribe() method (Readable interface)
    - Map mutation methods

      #### [5c] Overridden set triggers store update
      📄 `MapStore.ts:60`

      ```typescript
      set(key: K, value: V): this {
      ```


        #### [5d] Notifies subscribers on mutation
        📄 `MapStore.ts:62`

        ```typescript
        this.store.set(this);
        ```

      - delete() override
        - this.store.set(this)
      - clear() override
        - this.store.set(this)
    - Advanced store methods
      - getStore(key) - per-key store

      #### [5f] Advanced nested store access
      📄 `MapStore.ts:85`

      ```typescript
      getNestedStore<T>(key: K, accessor: (value: V) => Readable<T> | undefined): Readable<T | undefined> {
      ```

      - getAggregatedStore() - reducer
  - Usage in Space class

    #### [5e] Space class uses MapStore
    📄 `Space.ts:78`

    ```typescript
    public allVideoStreamStore: MapStore<string, VideoBox> = new MapStore<string, VideoBox>();
    ```


---

## 6. LocalStorage Persistence via LocalUserStore

> Persistence layer - traces how global stores are initialized from and persisted to localStorage through LocalUserStore.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

#### Motivation

WorkAdventure needs to **persist user preferences across browser sessions**. When a user enables their camera, closes the browser, and returns later, the application should remember that the camera was enabled. The challenge is bridging **three layers**: browser localStorage (synchronous key-value storage), a utility abstraction layer (LocalUserStore), and reactive Svelte stores (for UI updates).


#### Details


##### LocalUserStore: The Persistence Abstraction

The `LocalUserStore` class **[6a]** wraps direct localStorage access with typed getter/setter methods. For example, `getRequestedCameraState()` reads from localStorage **[6b]** using `JSON.parse(localStorage.getItem(requestedCameraStateKey) || "true")`, providing a default value if nothing is stored. The corresponding setter `setRequestedCameraState()` **[6e]** writes back using `localStorage.setItem()` **[6f]**.


##### Store Initialization from Persisted State

Global Svelte stores are initialized with values from LocalUserStore **[6c]**. The pattern is: `writable(localUserStore.getRequestedCameraState())`. This ensures the **initial store value matches the persisted preference** when the application loads.


##### Bidirectional Sync on Mutations

Store mutation methods maintain **bidirectional synchronization**. When `enableWebcam()` is called, it both updates the Svelte store with `set(true)` and persists to localStorage via `localUserStore.setRequestedCameraState(true)` **[6d]**. The `disableWebcam()` method follows the same pattern. This ensures that **every state change is immediately persisted**, so preferences survive page refreshes and browser restarts.


##### The Two-Way Contract

The architecture creates a contract: LocalUserStore owns localStorage access, while Svelte stores own reactivity. Stores read from LocalUserStore on initialization and write back on every mutation, keeping both layers synchronized without tight coupling.

</details>


### LocalStorage Persistence Flow

  - Browser Storage Layer

    #### [6b] Direct localStorage access
    📄 `LocalUserStore.ts:115`

    ```typescript
    return JSON.parse(localStorage.getItem(requestedCameraStateKey) || "true");
    ```


    #### [6f] Direct localStorage write
    📄 `LocalUserStore.ts:119`

    ```typescript
    localStorage.setItem(requestedCameraStateKey, JSON.stringify(value));
    ```

  - LocalUserStore Abstraction

    #### [6a] LocalUserStore reads from localStorage
    📄 `LocalUserStore.ts:114`

    ```typescript
    getRequestedCameraState(): boolean {
    ```


      #### [6b] Direct localStorage access


    #### [6e] LocalUserStore writes to localStorage
    📄 `LocalUserStore.ts:118`

    ```typescript
    setRequestedCameraState(value: boolean): void {
    ```


      #### [6f] Direct localStorage write

  - Global Svelte Store Layer
    - Store Initialization

      #### [6c] Store initialized from localStorage
      📄 `MediaStore.ts:36`

      ```typescript
      const { subscribe, set } = writable(localUserStore.getRequestedCameraState());
      ```

    - Store Mutation
      - enableWebcam() method
        - set(true)

        #### [6d] Store mutation persists to localStorage
        📄 `MediaStore.ts:42`

        ```typescript
        localUserStore.setRequestedCameraState(true);
        ```

      - disableWebcam() method
        - set(false)
        - localUserStore.set...(false)

---

## 7. Store Aggregation: StreamableCollectionStore Pattern

> Aggregation layer - demonstrates how multiple global stores are combined into complex derived stores for UI rendering.

<details>
<summary>📖 <strong>Guide</strong> (click to expand)</summary>

### Motivation

WorkAdventure needs to display **multiple video streams simultaneously** from different sources: local camera, remote peers, screen shares, and scripted videos. The challenge is that each video source has **different availability conditions** - for example, the local camera should be hidden when energy-saving mode is active **[7d]**, or when the user is in silent mode **[7f]**. Rather than having each UI component independently check 12+ different conditions, the **StreamableCollectionStore aggregates all these rules** into a single derived store that components can subscribe to **[7a]**.


### Details


#### Aggregation Pattern

The `createStreamableCollectionStore()` function creates a **derived store that depends on 12 global stores** **[7b]**. These dependencies span multiple domains:

- **Peer state**: `screenShareStreamElementsStore` tracks remote screen shares **[7c]**
- **Media state**: `cameraEnergySavingStore` determines if camera should be off to save power **[7d]**
- **User preferences**: `myCameraStore` and `silentStore` control local media visibility **[7f]**


#### Computation Logic

When any of the 12 input stores changes, the derived store **recomputes the entire video collection** **[7e]**. The computation callback evaluates complex business logic like "show my camera only if it's enabled AND not in energy-saving mode AND not in silent mode" **[7f]**. The result is a **Map of VideoBox objects** that UI components can directly render without knowing the underlying rules.


#### Benefits

This pattern provides **separation of concerns**: business logic lives in one place (the derived store), while components simply subscribe and render. It also ensures **consistency** - all parts of the UI see the same computed state simultaneously when any input changes.

</details>


### StreamableCollectionStore Aggregation Pattern

  - Store Creation & Dependencies

    #### [7a] Factory creates aggregated store
    📄 `StreamableCollectionStore.ts:152`

    ```typescript
    function createStreamableCollectionStore(): Readable<Map<string, VideoBox>> {
    ```


      #### [7b] Derived store with 12 dependencies
      📄 `StreamableCollectionStore.ts:153`

      ```typescript
      return derived(
      ```


        #### [7c] Depends on peer store
        📄 `StreamableCollectionStore.ts:155`

        ```typescript
        screenShareStreamElementsStore,
        ```


        #### [7d] Depends on media store
        📄 `StreamableCollectionStore.ts:161`

        ```typescript
        cameraEnergySavingStore,
        ```

        - myCameraStore (referenced)
        - silentStore (referenced)
        - ...8 other global stores
    - Derived Store Computation Callback

      #### [7e] Derived computation creates new state
      📄 `StreamableCollectionStore.ts:184`

      ```typescript
      const peers = new Map<string, VideoBox>();
      ```

      - Business Logic Evaluation

        #### [7f] Complex logic combining multiple stores
        📄 `StreamableCollectionStore.ts:195`

        ```typescript
        if ($myCameraStore && !$cameraEnergySavingStore && !$silentStore) {
        ```

      - Return computed peers Map
  - Usage by Components
    - Components subscribe to aggregated store
      - Automatic re-computation on any
      - input store change

---

---

## Referenced Files

```xml
<files>
<file path="CameraMenuItem.svelte">
<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import type { Readable } from "svelte/store";
    import { derived } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import CamOnIcon from "../../Icons/CamOnIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import CamOffIcon from "../../Icons/CamOffIcon.svelte";
<!-- [2a] Component imports multiple stores (line 9) -->
    import {
        availabilityStatusStore,
        mouseIsHoveringCameraButton,
<!-- [1d] Component imports global store (line 12) -->
        requestedCameraState,
        silentStore,
    } from "../../../Stores/MediaStore";

    import { openedMenuStore } from "../../../Stores/MenuStore";

<!-- [2b] Local derived store from globals (line 18) -->
    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedCameraState],
        ([$availabilityStatusStore, $requestedCameraState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.BUSY ||
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
                $silentStore === true
            ) {
                return "disabled";
            }
            return $requestedCameraState ? "normal" : "forbidden";
        }
    );

    function cameraClick(): void {
        analyticsClient.camera();
        if ($silentStore) return;
<!-- [1e] Component reads store with $ syntax (line 37) -->
        if ($requestedCameraState === true) {
<!-- [2c] Component mutates global store (line 38) -->
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }
</script>

<ActionBarButton
    on:click={cameraClick}
    classList="group/btn-cam"
    disabledHelp={$openedMenuStore !== undefined}
<!-- [2d] Reactive binding to derived store (line 49) -->
    state={$cameraButtonStateStore}
    dataTestId="camera-button"
    on:mouseenter={() => {
        if ($availabilityStatusStore == AvailabilityStatus.ONLINE) mouseIsHoveringCameraButton.set(true);
        else mouseIsHoveringCameraButton.set(false);
    }}
    on:mouseleave={() => mouseIsHoveringCameraButton.set(false)}
>
    {#if $requestedCameraState && !$silentStore}
        <CamOnIcon />
    {:else}
        <CamOffIcon />
    {/if}
</ActionBarButton>

</file>
<file path="GameScene.ts">
import * as Sentry from "@sentry/svelte";
import type { Subscription } from "rxjs";
import { TimeoutError } from "rxjs";
import Phaser from "phaser";
import AnimatedTiles from "phaser-animated-tiles";
import { Queue } from "queue-typescript";
import type { ComponentType } from "svelte";
<!-- [3c] TypeScript types for store management (line 8) -->
import type { Readable, Unsubscriber } from "svelte/store";
<!-- [3b] Imports Svelte get() utility (line 9) -->
import { get } from "svelte/store";
import { throttle } from "throttle-debounce";
import { ForwardableStore, MapStore } from "@workadventure/store-utils";
import { MathUtils } from "@workadventure/math-utils";
import CancelablePromise from "cancelable-promise";
import { Deferred } from "ts-deferred";
import type { GroupUsersUpdateMessage } from "@workadventure/messages";
import {
    AvailabilityStatus,
    availabilityStatusToJSON,
    ErrorScreenMessage,
    FilterType,
    PositionMessage_Direction,
} from "@workadventure/messages";
import { z } from "zod";
import type { ITiledMap, ITiledMapLayer, ITiledMapObject, ITiledMapTileset } from "@workadventure/tiled-map-type-guard";
import type { AreaData, EntityPrefabType } from "@workadventure/map-editor";
import {
    ENTITIES_FOLDER_PATH_NO_PREFIX,
    ENTITY_COLLECTION_FILE,
    EntityPermissions,
    GameMap,
    GameMapProperties,
    WAMFileFormat,
} from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import Debug from "debug";
import { userMessageManager } from "../../Administration/UserMessageManager";
import { connectionManager } from "../../Connection/ConnectionManager";
import { urlManager } from "../../Url/UrlManager";
import { mediaManager } from "../../WebRtc/MediaManager";
import { iceServersManager } from "../../WebRtc/IceServersManager";
import { UserInputManager } from "../UserInput/UserInputManager";
import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { PinchManager } from "../UserInput/PinchManager";
import { waScaleManager } from "../Services/WaScaleManager";
import { lazyLoadPlayerCharacterTextures } from "../Entity/PlayerTexturesLoadingManager";
import { lazyLoadPlayerCompanionTexture } from "../Companion/CompanionTexturesLoadingManager";
import { iframeListener } from "../../Api/IframeListener";
import { coWebsiteManager, coWebsites } from "../../Stores/CoWebsiteStore";
import {
    ADMIN_URL,
    DEBUG_MODE,
    ENABLE_CHAT_DISCONNECTED_LIST,
    ENABLE_MAP_EDITOR,
    ENABLE_OPENID,
    MAX_PER_GROUP,
    POSITION_DELAY,
    PUBLIC_MAP_STORAGE_PREFIX,
    WOKA_SPEED,
} from "../../Enum/EnvironmentVariable";
import { Room } from "../../Connection/Room";
import { CharacterTextureError } from "../../Exception/CharacterTextureError";
import { localUserStore } from "../../Connection/LocalUserStore";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import { Loader } from "../Components/Loader";
import { RemotePlayer } from "../Entity/RemotePlayer";
import { SelectCharacterScene, SelectCharacterSceneName } from "../Login/SelectCharacterScene";
import { hasMovedEventName, Player, requestEmoteEventName } from "../Player/Player";
import { ErrorSceneName } from "../Reconnecting/ErrorScene";
import { ReconnectingSceneName } from "../Reconnecting/ReconnectingScene";
import { TextUtils } from "../Components/TextUtils";
import { joystickBaseImg, joystickBaseKey, joystickThumbImg, joystickThumbKey } from "../Components/MobileJoystick";
import { PropertyUtils } from "../Map/PropertyUtils";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { PathfindingManager } from "../../Utils/PathfindingManager";
import type {
    GroupCreatedUpdatedMessageInterface,
    MessageUserMovedInterface,
    OnConnectInterface,
    PositionInterface,
    RoomJoinedMessageInterface,
} from "../../Connection/ConnexionModels";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { ActionableItem } from "../Items/ActionableItem";
import type { ItemFactoryInterface } from "../Items/ItemFactoryInterface";
import { biggestAvailableAreaStore } from "../../Stores/BiggestAvailableAreaStore";
import { playersStore } from "../../Stores/PlayersStore";
import { emoteStore } from "../../Stores/EmoteStore";
import {
    jitsiParticipantsCountStore,
    userIsAdminStore,
    userIsEditorStore,
    userIsJitsiDominantSpeakerStore,
} from "../../Stores/GameStore";
import {
    activeSubMenuStore,
    contactPageStore,
    inviteUserActivated,
    mapEditorActivated,
    mapManagerActivated,
    menuVisiblilityStore,
    roomListActivated,
    screenSharingActivatedStore,
    SubMenusInterface,
    subMenusStore,
} from "../../Stores/MenuStore";
import type { WasCameraUpdatedEvent } from "../../Api/Events/WasCameraUpdatedEvent";
import { audioManagerFileStore, bubbleSoundStore } from "../../Stores/AudioManagerStore";
import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
<!-- [3a] GameScene imports 10+ global stores (line 111) -->
import {
    availabilityStatusStore,
    batchGetUserMediaStore,
    lastNewMediaDeviceDetectedStore,
    localVoiceIndicatorStore,
    requestedCameraDeviceIdStore,
<!-- [1f] Phaser scene imports same global store (line 117) -->
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    speakerSelectedStore,
} from "../../Stores/MediaStore";
import { LL, locale } from "../../../i18n/i18n-svelte";
import { GameSceneUserInputHandler } from "../UserInput/GameSceneUserInputHandler";
import { followUsersColorStore, followUsersStore } from "../../Stores/FollowStore";
import { axiosWithRetry, hideConnectionIssueMessage, showConnectionIssueMessage } from "../../Connection/AxiosUtils";
import { StringUtils } from "../../Utils/StringUtils";

import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { embedScreenLayoutStore } from "../../Stores/EmbedScreenLayoutStore";
import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
import type { AddPlayerEvent } from "../../Api/Events/AddPlayerEvent";
import type { AskPositionEvent } from "../../Api/Events/AskPositionEvent";
import { chatVisibilityStore, forceRefreshChatStore } from "../../Stores/ChatStore";
import type { HasPlayerMovedInterface } from "../../Api/Events/HasPlayerMovedInterface";
import { extensionModuleStore, gameSceneIsLoadedStore, gameSceneStore } from "../../Stores/GameSceneStore";
import { myCameraBlockedStore, myMicrophoneBlockedStore } from "../../Stores/MyMediaStore";
import type { GameStateEvent } from "../../Api/Events/GameStateEvent";
import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
import {
    mapEditorModeStore,
    mapEditorRestrictedPropertiesStore,
    mapEditorSelectedToolStore,
    mapEditorWamSettingsEditorToolCurrentMenuItemStore,
    mapExplorationModeStore,
    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM,
} from "../../Stores/MapEditorStore";
import { refreshPromptStore } from "../../Stores/RefreshPromptStore";
import { SpaceRegistry } from "../../Space/SpaceRegistry/SpaceRegistry";
import { SpaceScriptingBridgeService } from "../../Space/Utils/SpaceScriptingBridgeService";
import { debugAddPlayer, debugRemovePlayer, debugUpdatePlayer, debugZoom } from "../../Utils/Debuggers";
import { checkCoturnServer } from "../../Components/Video/utils";
import { BroadcastService } from "../../Streaming/BroadcastService";
import { megaphoneCanBeUsedStore, megaphoneSpaceStore } from "../../Stores/MegaphoneStore";
import { CompanionTextureError } from "../../Exception/CompanionTextureError";
import { SelectCompanionScene, SelectCompanionSceneName } from "../Login/SelectCompanionScene";
import { scriptUtils } from "../../Api/ScriptUtils";
import { statusChanger } from "../../Components/ActionBar/AvailabilityStatus/statusChanger";
import { warningMessageStore } from "../../Stores/ErrorStore";
import { closeCoWebsite, getCoWebSite, openCoWebSite, openCoWebSiteWithoutSource } from "../../Chat/Utils";
import { navChat } from "../../Chat/Stores/ChatStore";
import { ProximityChatRoom } from "../../Chat/Connection/Proximity/ProximityChatRoom";
import { ProximitySpaceManager } from "../../WebRtc/ProximitySpaceManager";
import type { SpaceRegistryInterface } from "../../Space/SpaceRegistry/SpaceRegistryInterface";
import { WorldUserProvider } from "../../Chat/UserProvider/WorldUserProvider";
import { ChatUserProvider } from "../../Chat/UserProvider/ChatUserProvider";
import { UserProviderMerger } from "../../Chat/UserProviderMerger/UserProviderMerger";
import { AdminUserProvider } from "../../Chat/UserProvider/AdminUserProvider";
import { ExtensionModuleStatusSynchronization } from "../../Rules/StatusRules/ExtensionModuleStatusSynchronization";
import { isActivatedStore as isCalendarActiveStore, calendarEventsStore } from "../../Stores/CalendarStore";
import { isActivatedStore as isTodoListActiveStore, todoListsStore } from "../../Stores/TodoListStore";
import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
import type { ExtensionModule } from "../../ExternalModule/ExtensionModule";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import type { UserProviderInterface } from "../../Chat/UserProvider/UserProviderInterface";
import { registerAdditionalMenuItem, unregisterAdditionalMenuItem } from "../../Stores/AdditionalItemsMenuStore";
import { popupStore } from "../../Stores/PopupStore";
import PopUpRoomAccessDenied from "../../Components/PopUp/PopUpRoomAccessDenied.svelte";
import PopUpTriggerActionMessage from "../../Components/PopUp/PopUpTriggerActionMessage.svelte";
import PopUpMapEditorNotEnabled from "../../Components/PopUp/PopUpMapEditorNotEnabled.svelte";
import PopUpMapEditorShortcut from "../../Components/PopUp/PopUpMapEditorShortcut.svelte";
import { enableUserInputsStore } from "../../Stores/UserInputStore";
import { ScriptLoadedError } from "../../Api/ScriptLoadedError";
import { videoStreamStore, screenShareStreamStore } from "../../Stores/PeerStore";
import type { ChatConnectionInterface, ChatUser } from "../../Chat/Connection/ChatConnection";
import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
import { raceTimeout } from "../../Utils/PromiseUtils";
import { ConversationBubble } from "../Entity/ConversationBubble";
import { DarkenOutsideAreaEffect } from "../Components/DarkenOutsideArea/DarkenOutsideAreaEffect";
import { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
import { gameManager } from "./GameManager";
import { EmoteManager } from "./EmoteManager";
import { OutlineManager } from "./UI/OutlineManager";
import { soundManager } from "./SoundManager";
import { SharedVariablesManager } from "./SharedVariablesManager";
import { EmbeddedWebsiteManager } from "./EmbeddedWebsiteManager";
import { DynamicAreaManager } from "./DynamicAreaManager";
import { PlayerMovement } from "./PlayerMovement";
import { PlayersPositionInterpolator } from "./PlayersPositionInterpolator";
import { DirtyScene } from "./DirtyScene";
import { StartPositionCalculator } from "./StartPositionCalculator";
import { GameMapPropertiesListener } from "./GameMapPropertiesListener";
import { ActivatablesManager } from "./ActivatablesManager";
import type { AddPlayerInterface } from "./AddPlayerInterface";
import type { CameraManagerEventCameraUpdateData } from "./CameraManager";
import { CameraManager, CameraManagerEvent } from "./CameraManager";
import { EditorToolName, MapEditorModeManager } from "./MapEditor/MapEditorModeManager";
import type { PlayerDetailsUpdate } from "./RemotePlayersRepository";
import { RemotePlayersRepository } from "./RemotePlayersRepository";
import { IframeEventDispatcher } from "./IframeEventDispatcher";
import { PlayerVariablesManager } from "./PlayerVariablesManager";
import { SayManager } from "./Say/SayManager";
import { EntitiesCollectionsManager } from "./MapEditor/EntitiesCollectionsManager";
import { DEPTH_BUBBLE_CHAT_SPRITE, DEPTH_WHITE_MASK } from "./DepthIndexes";
import { ScriptingEventsManager } from "./ScriptingEventsManager";
import { FollowManager } from "./FollowManager";
import { LocateManager } from "./LocateManager";
import { uiWebsiteManager } from "./UI/UIWebsiteManager";
import { ScriptingVideoManager } from "./ScriptingVideoManager";
import EVENT_TYPE = Phaser.Scenes.Events;
import Sprite = Phaser.GameObjects.Sprite;
import CanvasTexture = Phaser.Textures.CanvasTexture;
import DOMElement = Phaser.GameObjects.DOMElement;
import Tileset = Phaser.Tilemaps.Tileset;
import SpriteSheetFile = Phaser.Loader.FileTypes.SpriteSheetFile;
import FILE_LOAD_ERROR = Phaser.Loader.Events.FILE_LOAD_ERROR;
import Clamp = Phaser.Math.Clamp;

export interface GameSceneInitInterface {
    reconnecting: boolean;
    initPosition?: PositionInterface;
}

interface GroupCreatedUpdatedEventInterface {
    type: "GroupCreatedUpdatedEvent";
    event: GroupCreatedUpdatedMessageInterface;
}

interface DeleteGroupEventInterface {
    type: "DeleteGroupEvent";
    groupId: number;
}

interface GroupUsersUpdatedEventInterface {
    type: "GroupUsersUpdatedEvent";
    event: GroupUsersUpdateMessage;
}

const WORLD_SPACE_NAME = "allWorldUser";
const debug = Debug("GameScene");

export class GameScene extends DirtyScene {
    Terrains: Array<Phaser.Tilemaps.Tileset>;
    CurrentPlayer!: Player;
    MapPlayersByKey: MapStore<number, RemotePlayer> = new MapStore<number, RemotePlayer>();
    CurrentRemotePlayerLocated: RemotePlayer | undefined = undefined;
    CurrentChatUserLocated: ChatUser | undefined = undefined;
    Map!: Phaser.Tilemaps.Tilemap;
    Objects!: Array<Phaser.Physics.Arcade.Sprite>;
    mapFile!: ITiledMap;
    wamFile!: WAMFileFormat;
    animatedTiles!: AnimatedTiles;
    groups: Map<number, ConversationBubble>;
    circleTexture!: CanvasTexture;
    circleRedTexture!: CanvasTexture;
    pendingEvents = new Queue<
        GroupCreatedUpdatedEventInterface | DeleteGroupEventInterface | GroupUsersUpdatedEventInterface
    >();
    public connection: RoomConnection | undefined;
    mapUrlFile!: string;
    wamUrlFile?: string;
    roomUrl: string;
    currentTick!: number;
    lastSentTick!: number; // The last tick at which a position was sent.
    lastMoveEventSent: HasPlayerMovedInterface = {
        direction: PositionMessage_Direction.DOWN,
        moving: false,
        x: -1000,
        y: -1000,
        oldX: -1000,
        oldY: -1000,
    };
    public userInputManager!: UserInputManager;
    public readonly superLoad: SuperLoaderPlugin;
    private initPosition?: PositionInterface;
    private playersPositionInterpolator = new PlayersPositionInterpolator();
    private connectionAnswerPromiseDeferred: Deferred<RoomJoinedMessageInterface>;
    // A promise that will resolve when the "create" method is called (signaling loading is ended)
    private createPromiseDeferred: Deferred<void>;
    // A promise that will resolve when the scene is ready to start (all assets have been loaded and the connection to the room is established)
    private sceneReadyToStartDeferred: Deferred<void> = new Deferred<void>();
    private iframeSubscriptionList: Array<Subscription> = [];
    private gameMapChangedSubscription!: Subscription;
    private messageSubscription: Subscription | null = null;
    private rxJsSubscriptions: Array<Subscription> = [];
    private emoteUnsubscriber!: Unsubscriber;
    private localVolumeStoreUnsubscriber: Unsubscriber | undefined;
    private followUsersColorStoreUnsubscriber!: Unsubscriber;
    private userIsJitsiDominantSpeakerStoreUnsubscriber!: Unsubscriber;
    private jitsiParticipantsCountStoreUnsubscriber!: Unsubscriber;
    private highlightedEmbedScreenUnsubscriber!: Unsubscriber;
    private embedScreenLayoutStoreUnsubscriber!: Unsubscriber;
    private availabilityStatusStoreUnsubscriber!: Unsubscriber;
    private mapEditorModeStoreUnsubscriber!: Unsubscriber;
    private mapExplorationStoreUnsubscriber!: Unsubscriber;
    private modalVisibilityStoreUnsubscriber!: Unsubscriber;
    private lastNewMediaDeviceDetectedStoreUnsubscriber!: Unsubscriber;
    private peerStoreUnsubscriber!: Unsubscriber;
    private unsubscribers: Unsubscriber[] = [];
    private entityPermissions: EntityPermissions | undefined;
    private entityPermissionsDeferred: Deferred<EntityPermissions> = new Deferred();
    private gameMapFrontWrapper!: GameMapFrontWrapper;
    private actionableItems: Map<number, ActionableItem> = new Map<number, ActionableItem>();
    private isReconnecting: boolean | undefined = undefined;
    private playerName!: string;
    private popUpElements: Map<number, DOMElement> = new Map<number, Phaser.GameObjects.DOMElement>();
    private originalMapUrl: string | undefined;
    private pinchManager: PinchManager | undefined;
    private outlineManager!: OutlineManager;
    private mapTransitioning = false; //used to prevent transitions happening at the same time.
    private emoteManager!: EmoteManager;
    private cameraManager!: CameraManager;
    private mapEditorModeManager!: MapEditorModeManager;
    private entitiesCollectionsManager!: EntitiesCollectionsManager;
    private pathfindingManager!: PathfindingManager;
    private activatablesManager!: ActivatablesManager;
    private preloading = true;
    private startPositionCalculator!: StartPositionCalculator;
    private sharedVariablesManager!: SharedVariablesManager;
    private playerVariablesManager!: PlayerVariablesManager;
    private scriptingEventsManager!: ScriptingEventsManager;
    private followManager!: FollowManager;
    private locateManager!: LocateManager;
    private hasMovedThisFrame: boolean = false;

    private proximitySpaceManager: ProximitySpaceManager | undefined;
    private scriptingVideoManager: ScriptingVideoManager | undefined;
    private objectsByType = new Map<string, ITiledMapObject[]>();
    private embeddedWebsiteManager!: EmbeddedWebsiteManager;
    private areaManager!: DynamicAreaManager;
    private _sayManager: SayManager | undefined;
    private loader: Loader;
    private lastCameraEvent: WasCameraUpdatedEvent | undefined;
    private firstCameraUpdateSent = false;
    private currentPlayerGroupId?: number;
    private showVoiceIndicatorChangeMessageSent = false;
    private jitsiDominantSpeaker = false;
    private jitsiParticipantsCount = 0;
    private cleanupDone = false;
    private playersEventDispatcher = new IframeEventDispatcher();
    private playersMovementEventDispatcher = new IframeEventDispatcher();
    private remotePlayersRepository = new RemotePlayersRepository();
    private throttledSendViewportToServer!: throttle<() => void>;
    private playersDebugLogAlreadyDisplayed = false;
    private hideTimeout: ReturnType<typeof setTimeout> | undefined;
    // The promise that will resolve to the current player textures. This will be available only after connection is established.
    private currentPlayerTexturesResolve!: (value: string[]) => void;
    private currentPlayerTexturesReject!: (reason: unknown) => void;
    private currentPlayerTexturesPromise: CancelablePromise<string[]> = new CancelablePromise((resolve, reject) => {
        this.currentPlayerTexturesResolve = resolve;
        this.currentPlayerTexturesReject = reject;
    });
    private currentCompanionTextureResolve!: (value: string) => void;
    private currentCompanionTextureReject!: (reason: unknown) => void;
    private currentCompanionTexturePromise: CancelablePromise<string> = new CancelablePromise((resolve, reject) => {
        this.currentCompanionTextureResolve = resolve;
        this.currentCompanionTextureReject = reject;
    });
    private _spaceRegistry: SpaceRegistryInterface | undefined;
    private spaceScriptingBridgeService: SpaceScriptingBridgeService | undefined;
    private allUserSpace: SpaceInterface | undefined;
    private isLiveStreamingUnsubscriber: Unsubscriber | undefined;
    private _proximityChatRoom: ProximityChatRoom | undefined;
    private _userProviderMergerDeferred: Deferred<UserProviderMerger> = new Deferred();
    private _worldUserCounter: ForwardableStore<number> = new ForwardableStore(0);
    public extensionModule: ExtensionModule | undefined = undefined;
    public landingAreas: AreaData[] = [];
    // Listeners for when the player finishes moving
    private onPlayerMovementEndedCallbacks: Array<(event: HasPlayerMovedInterface) => void> = [];

    public _chatConnection: ChatConnectionInterface | undefined;
    private _proximityChatRoomDeferred: Deferred<ProximityChatRoom> = new Deferred();
    private _focusFx: DarkenOutsideAreaEffect | undefined;
    private abortController: AbortController = new AbortController();

    // FIXME: we need to put a "unknown" instead of a "any" and validate the structure of the JSON we are receiving.

    constructor(private _room: Room, customKey?: string) {
        super({
            key: customKey ?? _room.key,
        });

        this.Terrains = [];
        this.groups = new Map<number, ConversationBubble>();

        // TODO: How to get mapUrl from WAM here?
        if (_room.mapUrl) {
            this.mapUrlFile = _room.mapUrl;
        } else if (_room.wamUrl) {
            this.wamUrlFile = _room.wamUrl;
        }
        this.roomUrl = _room.key;

        this.entitiesCollectionsManager = new EntitiesCollectionsManager();

        this.createPromiseDeferred = new Deferred<void>();
        this.connectionAnswerPromiseDeferred = new Deferred<RoomJoinedMessageInterface>();
        this.loader = new Loader(this);
        this.superLoad = new SuperLoaderPlugin(this);
    }

    private _broadcastService: BroadcastService | undefined;

    public get broadcastService(): BroadcastService {
        if (this._broadcastService === undefined) {
            throw new Error("BroadcastService not initialized yet.");
        }
        return this._broadcastService;
    }

    //hook preload scene
    preload(): void {
        //initialize frame event of scripting API
        this.listenToIframeEvents();

        this.load.image("iconTalk", "/resources/icons/icon_talking.png");
        this.load.image("iconSpeaker", "/resources/icons/icon_speaking.png");
        this.load.image("iconMegaphone", "/resources/icons/icon_megaphone.png");
        this.load.image("iconStatusIndicatorInside", "/resources/icons/icon_status_indicator_inside.png");
        this.load.image("iconStatusIndicatorOutline", "/resources/icons/icon_status_indicator_outline.png");

        this.load.image("iconFocus", "/resources/icons/icon_focus.png");
        this.load.image("iconLink", "/resources/icons/icon_link.png");
        this.load.image("iconListenerMegaphone", "/resources/icons/icon_listener.png");
        this.load.image("iconSpeakerMegaphone", "/resources/icons/icon_speaker.png");
        this.load.image("iconSilent", "/resources/icons/icon_silent.png");
        this.load.image("iconMeeting", "/resources/icons/icon_meeting.png");

        if (touchScreenManager.supportTouchScreen) {
            this.load.image(joystickBaseKey, joystickBaseImg);
            this.load.image(joystickThumbKey, joystickThumbImg);
        }
        // Load the selected bubble sound from bubbleSoundStore
        const selectedBubbleSound = get(bubbleSoundStore);
        this.load.audio(
            `audio-webrtc-in-${selectedBubbleSound}`,
            `/resources/objects/webrtc-in-${selectedBubbleSound}.mp3`
        );
        this.load.audio(
            `audio-webrtc-out-${selectedBubbleSound}`,
            `/resources/objects/webrtc-out-${selectedBubbleSound}.mp3`
        );
        this.load.audio("audio-report-message", "/resources/objects/report-message.mp3");
        this.load.audio("audio-megaphone", "/resources/objects/megaphone.mp3");
        this.load.audio("audio-cloud", "/resources/objects/cloud.mp3");
        this.load.audio("new-message", "/resources/objects/new-message.mp3");

        this.sound.pauseOnBlur = false;

        this.load.on(FILE_LOAD_ERROR, (file: { src: string }) => {
            // If we happen to be in HTTP and we are trying to load a URL in HTTPS only... (this happens only in dev environments)
            if (
                window.location.protocol === "http:" &&
                file.src === this.mapUrlFile &&
                file.src.startsWith("http:") &&
                this.originalMapUrl === undefined
            ) {
                this.originalMapUrl = this.mapUrlFile;
                this.mapUrlFile = this.mapUrlFile.replace("http://", "https://");
                this.load.tilemapTiledJSON(this.mapUrlFile, this.mapUrlFile);
                this.load.on(
                    "filecomplete-tilemapJSON-" + this.mapUrlFile,
                    (key: string, type: string, data: unknown) => {
                        this.onMapLoad(data).catch((e) => console.error(e));
                    }
                );
                return;
            }
            // 127.0.0.1, localhost and *.localhost are considered secure, even on HTTP.
            // So if we are in https, we can still try to load a HTTP local resource (can be useful for testing purposes)
            // See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#when_is_a_context_considered_secure
            const base = new URL(window.location.href);
            base.pathname = "";
            const url = new URL(file.src, base.toString());
            const host = url.host.split(":")[0];
            if (
                window.location.protocol === "https:" &&
                file.src === this.mapUrlFile &&
                (host === "127.0.0.1" || host === "localhost" || host.endsWith(".localhost")) &&
                this.originalMapUrl === undefined
            ) {
                this.originalMapUrl = this.mapUrlFile;
                this.mapUrlFile = this.mapUrlFile.replace("https://", "http://");
                this.load.tilemapTiledJSON(this.mapUrlFile, this.mapUrlFile);
                this.load.on(
                    "filecomplete-tilemapJSON-" + this.mapUrlFile,
                    (key: string, type: string, data: unknown) => {
                        this.onMapLoad(data).catch((e) => console.error(e));
                    }
                );
                // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
                // In this case, we check in the cache to see if the map is here and trigger the event manually.
                if (this.cache.tilemap.exists(this.mapUrlFile)) {
                    const data = this.cache.tilemap.get(this.mapUrlFile);
                    this.onMapLoad(data.data).catch((e) => console.error(e));
                }
                return;
            }

            //once preloading is over, we don't want loading errors to crash the game, so we need to disable this behavior after preloading.
            //if SpriteSheetFile (WOKA file) don't display error and give an access for user
            if (this.preloading && !(file instanceof SpriteSheetFile)) {
                //remove loader in progress
                this.handleErrorAndCleanup(
                    new Error('Cannot load "' + (file?.src ?? this.originalMapUrl) + '"'),
                    "NETWORK_ERROR",
                    "Network error",
                    "An error occurred while loading a resource"
                );
            }
        });

        this.load.scenePlugin("AnimatedTiles", AnimatedTiles, "animatedTiles", "animatedTiles");
        if (this.wamUrlFile) {
            const absoluteWamFileUrl = new URL(this.wamUrlFile, window.location.href).toString();

            this.superLoad.loadPromise(
                axiosWithRetry.get(absoluteWamFileUrl).then((response) => {
                    try {
                        const wamFileResult = WAMFileFormat.safeParse(wamFileMigration.migrate(response.data));
                        if (!wamFileResult.success) {
                            this.handleErrorAndCleanup(
                                wamFileResult.error,
                                "WAM_FORMAT_ERROR",
                                "Format error",
                                "Invalid format while loading a WAM file"
                            );
                            return;
                        }
                        this.wamFile = wamFileResult.data;
                        this.mapUrlFile = new URL(this.wamFile.mapUrl, absoluteWamFileUrl).toString();
                        this.doLoadTMJFile(this.mapUrlFile);
                        this.loadEntityCollections();
                    } catch (error) {
                        this.handleErrorAndCleanup(
                            error,
                            "WAM_FILE_LOAD_ISSUE",
                            "Error when loading WAM file",
                            "Unknown error while loading WAM file"
                        );
                        return;
                    }
                })
            );
        } else {
            this.doLoadTMJFile(this.mapUrlFile);
        }

        // The condition is here for Webkit in headless mode (CI / automated tests). It doesn't have a proper font support.
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (this.load as any).rexWebFont === "function") {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.load as any).rexWebFont({
                custom: {
                    families: ["Press Start 2P"],
                    testString: "abcdefg",
                },
            });
        }

        //this function must stay at the end of preload function
        this.loader.addLoader();
    }

    private handleErrorAndCleanup(
        error: Error | unknown,
        errorCode: string,
        errorTitle: string,
        errorSubtitle: string
    ) {
        console.error(error);

        // In case an error is already displayed, let's do nothing. We want the first error to be kept visible.
        if (get(errorScreenStore)) {
            return;
        }

        this.loader.removeLoader();
        errorScreenStore.setError(
            ErrorScreenMessage.fromPartial({
                type: "error",
                code: errorCode,
                title: errorTitle,
                subtitle: errorSubtitle,
                details: error instanceof Error ? error.message : "Unknown error",
            })
        );

        this.cleanupClosingScene();
        this.scene.stop(this.scene.key);
        this.scene.remove(this.scene.key);
    }

    public getCustomEntityCollectionUrl() {
        const mapStoragePath = `${PUBLIC_MAP_STORAGE_PREFIX}${ENTITIES_FOLDER_PATH_NO_PREFIX}/${ENTITY_COLLECTION_FILE}`;
        return new URL(mapStoragePath, this.wamUrlFile).toString();
    }

    //hook initialisation
    init(initData: GameSceneInitInterface) {
        if (initData.initPosition !== undefined) {
            this.initPosition = initData.initPosition; //todo: still used?
        }
        if (initData.initPosition !== undefined) {
            this.isReconnecting = initData.reconnecting;
        }
    }

    //hook create scene
    create(): void {
        this.input.topOnly = false;
        this.preloading = false;
        this.cleanupDone = false;

        this.bindSceneEventHandlers();

        this.trackDirtyAnims();

        this.outlineManager = new OutlineManager(this);
        gameManager.gameSceneIsCreated(this);
        urlManager.pushRoomIdToUrl(this._room);
        analyticsClient.enteredRoom(this._room.id, this._room.group);
        contactPageStore.set(this._room.contactPage);

        if (touchScreenManager.supportTouchScreen) {
            this.pinchManager = new PinchManager(this);
        }

        const playerName = gameManager.getPlayerName();
        if (!playerName) {
            throw new Error("playerName is not set");
        }
        this.playerName = playerName;
        try {
            this.Map = this.add.tilemap(this.mapUrlFile);
        } catch (e) {
            // Error when loading the map, probably because the map file is not a valid TMJ file.
            this.handleErrorAndCleanup(
                e,
                "MAP_FILE_LOAD_ISSUE",
                "Error when loading map file",
                `An error occurred while loading the map file "${this.mapUrlFile}". Please check the URL or contact the map administrator.`
            );
            return;
        }
        const mapDirUrl = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        this.mapFile.tilesets.forEach((tileset: ITiledMapTileset) => {
            if ("source" in tileset) {
                throw new Error(
                    `Tilesets must be embedded in a map. The tileset "${tileset.source}" must be embedded in the Tiled map "${this.mapUrlFile}".`
                );
            }
            if (!("image" in tileset)) {
                throw new Error(
                    `Tilesets made of a collection of images are not supported in WorkAdventure in the Tiled map "${this.mapUrlFile}".`
                );
            }
            const tilesetImage = this.Map.addTilesetImage(
                tileset.name,
                `${mapDirUrl}/${tileset.image}`,
                tileset.tilewidth,
                tileset.tileheight,
                tileset.margin,
                tileset.spacing /*, tileset.firstgid*/
            );
            if (tilesetImage) {
                this.Terrains.push(tilesetImage);
            } else {
                console.warn(`Failed to add TilesetImage ${tileset.name}: ${`${mapDirUrl}/${tileset.image}`}`);
            }
        });

        this.throttledSendViewportToServer = throttle(200, () => {
            this.sendViewportToServer();
        });

        //permit to set bound collision
        this.physics.world.setBounds(0, 0, this.Map.widthInPixels, this.Map.heightInPixels);

        this.embeddedWebsiteManager = new EmbeddedWebsiteManager(this);

        //add layer on map
        this.gameMapFrontWrapper = new GameMapFrontWrapper(
            this,
            new GameMap(this.mapFile, this.wamFile),
            this.Map,
            this.Terrains
        );
        this.gameMapFrontWrapper.initialize().catch((e) => console.error(e));
        for (const layer of this.gameMapFrontWrapper.getFlatLayers()) {
            if (layer.type === "tilelayer") {
                const exitSceneUrl = this.getExitSceneUrl(layer);
                if (exitSceneUrl !== undefined) {
                    this.loadNextGame(
                        Room.getRoomPathFromExitSceneUrl(exitSceneUrl, window.location.toString(), this.mapUrlFile)
                    ).catch((e) => console.error(e));
                }
                const exitUrl = this.getExitUrl(layer);
                if (exitUrl !== undefined) {
                    this.loadNextGameFromExitUrl(exitUrl).catch((e) => console.error(e));
                }
            }
            if (layer.type === "objectgroup") {
                for (const object of layer.objects) {
                    if (object.text) {
                        TextUtils.createTextFromITiledMapObject(this, object);
                    }
                    if (object.class === "website") {
                        // Let's load iframes in the map
                        const url = PropertyUtils.mustFindStringProperty(
                            GameMapProperties.URL,
                            object.properties,
                            'in the "' + object.name + '" object of type "website"'
                        );
                        const allowApi = PropertyUtils.findBooleanProperty(
                            GameMapProperties.ALLOW_API,
                            object.properties
                        );
                        const policy = PropertyUtils.findStringProperty(GameMapProperties.POLICY, object.properties);

                        this.embeddedWebsiteManager.createEmbeddedWebsite(
                            object.name,
                            url,
                            object.x,
                            object.y,
                            object.width ?? 0,
                            object.height ?? 0,
                            object.visible,
                            allowApi ?? false,
                            policy ?? "",
                            "map",
                            1
                        );
                    }
                }
            }
        }

        this.gameMapFrontWrapper.getExitUrls().forEach((exitUrl) => {
            this.loadNextGameFromExitUrl(exitUrl).catch((e) => console.error(e));
        });

        // TODO: Dynamic areas should be exclusively managed on the front side
        this.areaManager = new DynamicAreaManager(this.gameMapFrontWrapper);

        this.startPositionCalculator = new StartPositionCalculator(
            this.gameMapFrontWrapper,
            this.mapFile,
            this.initPosition,
            urlManager.getStartPositionNameFromUrl()
        );

        //add entities
        this.Objects = new Array<Phaser.Physics.Arcade.Sprite>();

        //create input to move
        this.userInputManager = new UserInputManager(this, new GameSceneUserInputHandler(this));
        mediaManager.setUserInputManager(this.userInputManager);

        if (localUserStore.getFullscreen()) {
            document
                .querySelector("body")
                ?.requestFullscreen()
                .catch((e) => console.error(e));
        }

        this.pathfindingManager = new PathfindingManager(
            this.gameMapFrontWrapper.getCollisionGrid(),
            this.gameMapFrontWrapper.getTileDimensions()
        );

        this.subscribeToGameMapChanged();
        this.subscribeToEntitiesManagerObservables();

        //notify game manager can to create currentUser in map
        this.createCurrentPlayer();
        this.removeAllRemotePlayers(); //cleanup the list  of remote players in case the scene was rebooted

        this.tryMovePlayerWithMoveToParameter();

        this.cameraManager = new CameraManager(
            this,
            { width: this.Map.widthInPixels, height: this.Map.heightInPixels },
            waScaleManager
        );

        this.activatablesManager = new ActivatablesManager(this.CurrentPlayer);

        biggestAvailableAreaStore.recompute();
        this.cameraManager.startFollowPlayer(this.CurrentPlayer);
        if (ENABLE_MAP_EDITOR) {
            this.mapEditorModeManager = new MapEditorModeManager(this);
        }

        this.animatedTiles.init(this.Map);

        // Phaser unsubscribes from the events when the scene is destroyed, so we don't need to unsubscribe here
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        this.events.on("tileanimationupdate", () => (this.dirty = true));
        if (localUserStore.getDisableAnimations()) {
            this.animatedTiles.pause();
        }

        // Let's pause the scene if the connection is not established yet
        if (!this._room.isDisconnected()) {
            if (this.isReconnecting) {
                setTimeout(() => {
                    if (this.connection === undefined) {
                        try {
                            this.hide();
                        } catch (err) {
                            console.error("Scene sleep error: ", err);
                        }
                        if (get(errorScreenStore)) {
                            // If an error message is already displayed, don't display the "connection lost" message.
                            console.error(
                                "Error message store already displayed for CONNECTION_LOST",
                                get(errorScreenStore)
                            );
                            return;
                        }
                        errorScreenStore.setError(
                            ErrorScreenMessage.fromPartial({
                                type: "reconnecting",
                                code: "CONNECTION_LOST",
                                title: get(LL).warning.connectionLostTitle(),
                                details: get(LL).warning.connectionLostSubtitle(),
                                image: this._room.errorSceneLogo,
                            })
                        );
                    }
                }, 0);
            } else if (this.connection === undefined) {
                // Let's wait 1 second before printing the "connecting" screen to avoid blinking
                this.hideTimeout = setTimeout(() => {
                    this.hideTimeout = undefined;
                    if (this.connection === undefined) {
                        try {
                            this.hide();
                        } catch (err) {
                            console.error("Scene sleep error: ", err);
                        }
                        if (get(errorScreenStore)) {
                            // If an error message is already displayed, don't display the "connection lost" message.
                            console.error(
                                "Error message store already displayed for CONNECTION_PENDING: ",
                                get(errorScreenStore)
                            );
                            return;
                        }
                        /*
                         * @fixme
                         * The error awaiting connection appears while the connection is in progress.
                         * In certain cases like the invalid character layer, the connection is close and this error is displayed after selecting Woka scene.
                         * TODO: create connection status with invalid layer case and not display this error.
                         **/
                        /*errorScreenStore.setError(
                            ErrorScreenMessage.fromPartial({
                                type: "reconnecting",
                                code: "CONNECTION_PENDING",
                                title: get(LL).warning.waitingConnectionTitle(),
                                details: get(LL).warning.waitingConnectionSubtitle(),
                            })
                        );*/
                    }
                }, 1000);
            }
        }

        this.createPromiseDeferred.resolve();
        // Now, let's load the script, if any
        const scripts = this.getScriptUrls(this.mapFile);
        const disableModuleMode = PropertyUtils.findBooleanProperty(
            GameMapProperties.SCRIPT_DISABLE_MODULE_SUPPORT,
            this.mapFile.properties
        );
        const scriptPromises = [];
        for (const script of scripts) {
            scriptPromises.push(
                // Note: registerScript fails after 7 seconds if the script cannot be loaded
                iframeListener.registerScript(script, !disableModuleMode)
            );
        }

        this.reposition(true);

        new GameMapPropertiesListener(this, this.gameMapFrontWrapper).register();

        if (!this._room.isDisconnected()) {
            try {
                this.hide();
            } catch (err) {
                console.error("Scene sleep error: ", err);
            }
            this.connect();
        }

        /*this.connectionAnswerPromiseDeferred.promise.then((connectionAnswer) => {
            console.warn("Connection established", connectionAnswer);
        });
        this.CurrentPlayer.getTextureLoadedPromise().then((textures) => {
            console.warn("Current player textures loaded", textures);
        });
        this.gameMapFrontWrapper.initializedPromise.then(() => {
            console.warn("GameMapFrontWrapper initialized");
        });
        Promise.all(scriptPromises).then(() => {
            console.warn("All scripts loaded");
        });*/

        Promise.all([
            this.connectionAnswerPromiseDeferred.promise.then(() =>
                debug("Loading process: Websocket connection ready")
            ),
            Promise.allSettled(scriptPromises).then((results) => {
                debug("Loading process: Scripts loaded");
                return results;
            }),
            this.CurrentPlayer.getTextureLoadedPromise().then(() =>
                debug("Loading process: Current player texture ready")
            ) as Promise<unknown>,
            this.gameMapFrontWrapper.initializedPromise.promise.then(() =>
                debug("Loading process: Game map initialized")
            ),
            // Wait at most 5 seconds for the chat connection to be established
            // If not, we can still proceed starting the scene without chat fully loaded
            raceTimeout(gameManager.getChatConnection(), 5_000)
                .then(() => debug("Loading process: Chat connection ready"))
                .catch((e) => {
                    if (e instanceof TimeoutError) {
                        debug("Loading process: Chat connection timeout. Continuing loading while chat loads.");
                        return;
                    } else {
                        throw e;
                    }
                }),
        ])
            .then((results) => {
                const settledScriptLoadedResult = results[1];
                // Script loading might have failed, in particular if the network connection was lost.
                // In this case, the websocket connection will keep retrying, while the script will not retry.
                // Therefore, just after the websocket connection is established (so at a time we know the scripts
                // can be retried), we retry loading the failed scripts.

                Promise.allSettled(
                    settledScriptLoadedResult.map((result) => {
                        if (result.status === "rejected") {
                            if (result.reason instanceof ScriptLoadedError) {
                                return result.reason.retry();
                            } else {
                                throw result.reason;
                            }
                        }
                        return Promise.resolve();
                    })
                )
                    .then((scriptReload) => {
                        for (const r of scriptReload) {
                            if (r.status === "rejected") {
                                console.error("Error while reloading script after connection established", r.reason);
                            }
                        }

                        this.initUserPermissionsOnEntity();
                        this.hide(false);
                        gameSceneIsLoadedStore.set(true);
                        this.sceneReadyToStartDeferred.resolve();
                        this.initializeAreaManager();
                    })
                    .catch((e) => {
                        console.error("Promise.allSettled should never error", e);
                        Sentry.captureException(e);
                    });
            })
            .catch((e: unknown) => {
                console.error("Initialization failed", e);
                Sentry.captureException(e);
                errorScreenStore.setException(e);
            });

        gameManager
            .getChatConnection()
            .then(() => {
                const connection = this.connection;
                const chatId = localUserStore.getChatId();
                const email: string | null = localUserStore.getLocalUser()?.email || null;
                if (email && chatId && connection) {
                    connection.emitUpdateChatId(email, chatId);
                    connection.emitPlayerChatID(chatId);
                }
            })
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });

        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }

        if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
            this._focusFx = new DarkenOutsideAreaEffect(this, this.cameras.main, {
                feather: 10,
                darkness: 0.65,
                tweenDurationMs: 250,
            });
        }
    }

    public getMapUrl(): string {
        if (!this.mapUrlFile) {
            throw new Error("Trying to access mapUrl before it was fetched");
        }
        return this.mapUrlFile;
    }

    public getEntityPermissions(): EntityPermissions {
        if (this.entityPermissions === undefined) {
            throw new Error("EntityPermissions not instantiated yet");
        }
        return this.entityPermissions;
    }

    public getEntityPermissionsPromise(): Promise<EntityPermissions> {
        return this.entityPermissionsDeferred.promise;
    }

    public async onMapExit(roomUrl: URL) {
        if (this.mapTransitioning) return;
        this.mapTransitioning = true;

        this.gameMapFrontWrapper.triggerExitCallbacks();

        let targetRoom: Room;
        try {
            targetRoom = await Room.createRoom(roomUrl);
        } catch (e /*: unknown*/) {
            console.error('Error while fetching new room "' + roomUrl.toString() + '"', e);

            //show information room access denied
            popupStore.addPopup(
                PopUpRoomAccessDenied,
                {
                    message: get(LL).warning.accessDenied.room(),
                    click: () => {
                        popupStore.removePopup("roomAccessDenied");
                    },
                    userInputManager: this.userInputManager,
                },
                "roomAccessDenied"
            );

            this.mapTransitioning = false;
            return;
        }

        urlManager.pushStartLayerNameToUrl(roomUrl.hash);

        if (!targetRoom.isEqual(this._room)) {
            if (this.scene.get(targetRoom.key) === null) {
                console.error("next room not loaded", targetRoom.key);
                // Try to load next game room from exit URL
                // The policy of room can to be updated during a session and not load before
                await this.loadNextGameFromExitUrl(targetRoom.key);
            }
            this.cleanupClosingScene();

            this.scene.stop();
            this.scene.start(targetRoom.key);
            this.scene.remove(this.scene.key);
            forceRefreshChatStore.forceRefresh();
        } else {
            //if the exit points to the current map, we simply teleport the user back to the startLayer
            this.startPositionCalculator.initStartXAndStartY(urlManager.getStartPositionNameFromUrl());
            this.CurrentPlayer.x = this.startPositionCalculator.startPosition.x;
            this.CurrentPlayer.y = this.startPositionCalculator.startPosition.y;
            this.CurrentPlayer.finishFollowingPath(true);
            // clear properties in case we are moved on the same layer / area in order to trigger them
            this.gameMapFrontWrapper.clearCurrentProperties();
            this.gameMapFrontWrapper.setPosition(this.CurrentPlayer.x, this.CurrentPlayer.y);

            // TODO: we should have a "teleport" parameter to explicitly say the user teleports and should not be moved in 200ms to the new place.
            this.handleCurrentPlayerHasMovedEvent({
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
                direction: this.CurrentPlayer.lastDirection,
                moving: false,
            });

            this.markDirty();
            setTimeout(() => (this.mapTransitioning = false), 500);
        }
    }

    public playSound(sound: string) {
        if (!statusChanger.allowNotificationSound()) return;
        this.sound.play(sound, {
            volume: 0.2,
        });
    }

    public playBubbleInSound() {
        const bubbleSound = get(bubbleSoundStore);
        this.playSound(`audio-webrtc-in-${bubbleSound}`);
    }

    public playBubbleOutSound() {
        const bubbleSound = get(bubbleSoundStore);
        this.playSound(`audio-webrtc-out-${bubbleSound}`);
    }

    public cleanupClosingScene(): void {
        // make sure we restart own medias
        mediaManager.disableMyCamera();
        mediaManager.disableMyMicrophone();
        // stop playing audio, close any open website, stop any open Jitsi, unsubscribe
        coWebsiteManager.cleanup();

        iframeListener.cleanup();
        uiWebsiteManager.closeAll();
        followUsersStore.stopFollowing();

        audioManagerFileStore.unloadAudio();

        this.connection?.closeConnection();
        this.outlineManager?.clear();
        this.userInputManager?.destroy();
        this.isLiveStreamingUnsubscriber?.();
        this.pinchManager?.destroy();
        this.emoteManager?.destroy();
        this.cameraManager?.destroy();
        this.mapEditorModeManager?.destroy();
        this.pathfindingManager?.cleanup();
        this._broadcastService?.destroy().catch((e) => {
            console.error("Error while destroying broadcast service", e);
            Sentry.captureException(e);
        });
        this.proximitySpaceManager?.destroy();
        this._proximityChatRoom?.destroy();
        this.mapEditorModeStoreUnsubscriber?.();
        this.emoteUnsubscriber?.();
        this.followUsersColorStoreUnsubscriber?.();
        this.modalVisibilityStoreUnsubscriber?.();
        this.highlightedEmbedScreenUnsubscriber?.();
        this.embedScreenLayoutStoreUnsubscriber?.();
        this.userIsJitsiDominantSpeakerStoreUnsubscriber?.();
        this.jitsiParticipantsCountStoreUnsubscriber?.();
        this.availabilityStatusStoreUnsubscriber?.();
        this.mapExplorationStoreUnsubscriber?.();
        this.lastNewMediaDeviceDetectedStoreUnsubscriber?.();
        this.peerStoreUnsubscriber?.();
        for (const unsubscriber of this.unsubscribers) {
            unsubscriber();
        }
        this.unsubscribers = [];
        iframeListener.unregisterAnswerer("getState");
        iframeListener.unregisterAnswerer("loadTileset");
        iframeListener.unregisterAnswerer("getMapData");
        iframeListener.unregisterAnswerer("getWamMapData");
        iframeListener.unregisterAnswerer("triggerActionMessage");
        iframeListener.unregisterAnswerer("triggerPlayerMessage");
        iframeListener.unregisterAnswerer("removeActionMessage");
        iframeListener.unregisterAnswerer("removePlayerMessage");
        iframeListener.unregisterAnswerer("openCoWebsite");
        iframeListener.unregisterAnswerer("getCoWebsites");
        iframeListener.unregisterAnswerer("closeCoWebsite");
        iframeListener.unregisterAnswerer("closeCoWebsites");
        iframeListener.unregisterAnswerer("setPlayerOutline");
        iframeListener.unregisterAnswerer("removePlayerOutline");
        iframeListener.unregisterAnswerer("setVariable");
        iframeListener.unregisterAnswerer("openUIWebsite");
        iframeListener.unregisterAnswerer("getUIWebsites");
        iframeListener.unregisterAnswerer("getUIWebsiteById");
        iframeListener.unregisterAnswerer("closeUIWebsite");
        iframeListener.unregisterAnswerer("enablePlayersTracking");
        iframeListener.unregisterAnswerer("getPlayerPosition");
        iframeListener.unregisterAnswerer("movePlayerTo");
        iframeListener.unregisterAnswerer("teleportPlayerTo");
        iframeListener.unregisterAnswerer("getWoka");
        iframeListener.unregisterAnswerer("goToLogin");
        iframeListener.unregisterAnswerer("playSoundInBubble");
        this.sharedVariablesManager?.close();
        this.playerVariablesManager?.close();
        this.scriptingEventsManager?.close();
        this.embeddedWebsiteManager?.close();
        this.scriptingVideoManager?.close();
        this.areaManager?.close();
        this._sayManager?.close();
        this.playersEventDispatcher.cleanup();
        this.playersMovementEventDispatcher.cleanup();
        this.gameMapFrontWrapper?.close();
        this.followManager?.close();
        this.spaceScriptingBridgeService?.destroy();
        iceServersManager.finalize();
        if (this.localVolumeStoreUnsubscriber) {
            this.localVolumeStoreUnsubscriber();
            this.localVolumeStoreUnsubscriber = undefined;
        }
        this.throttledSendViewportToServer?.cancel();

        this._focusFx?.destroy();

        this._spaceRegistry?.destroy().catch((e) => {
            console.error("Error while destroying space registry", e);
            Sentry.captureException(e);
        });

        // We need to destroy all the entities
        get(extensionModuleStore).forEach((extensionModule) => {
            extensionModule.destroy();
        });
        extensionModuleStore.set([]);

        //When we leave game, the camera is stop to be reopen after.
        // I think that we could keep camera status and the scene can manage camera setup
        //TODO find wy chrome don't manage correctly a multiple ask mediaDevices
        //mediaManager.hideMyCamera();

        for (const iframeEvents of this.iframeSubscriptionList) {
            iframeEvents.unsubscribe();
        }
        for (const subscription of this.rxJsSubscriptions) {
            subscription.unsubscribe();
        }
        this.rxJsSubscriptions = [];
        this.gameMapChangedSubscription?.unsubscribe();
        this.messageSubscription?.unsubscribe();

        // Cleanup locate manager
        this.locateManager?.destroy();

        gameSceneIsLoadedStore.set(false);
        gameSceneStore.set(undefined);
        this.cleanupDone = true;
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
    }

    /**
     * @param time
     * @param delta The delta time in ms since the last frame. This is a smoothed and capped value based on the FPS rate.
     */
    public update(time: number, delta: number): void {
        this.dirty = false;
        this.currentTick = time;

        this.CurrentPlayer.moveUser(delta, this.userInputManager.getEventListForGameTick());
        if (this.mapEditorModeManager?.isActive()) {
            this.mapEditorModeManager.update(time, delta);
        }

        for (const addedPlayer of this.remotePlayersRepository.getAddedPlayers()) {
            debugAddPlayer("Player will be add to the GameScene", addedPlayer);
            this.doAddPlayer(addedPlayer);
            debugAddPlayer("Player has been added to the GameScene", addedPlayer);
        }
        for (const movedPlayer of this.remotePlayersRepository.getMovedPlayers()) {
            this.doUpdatePlayerPosition(movedPlayer);
        }
        for (const updatedPlayer of this.remotePlayersRepository.getUpdatedPlayers()) {
            debugUpdatePlayer("Player will be update from GameScene", updatedPlayer);
            this.doUpdatePlayerDetails(updatedPlayer);
            debugUpdatePlayer("Player has been updated from GameScene", updatedPlayer);
        }
        for (const removedPlayerId of this.remotePlayersRepository.getRemovedPlayers()) {
            debugRemovePlayer("Player will be remove from GameScene", removedPlayerId);
            this.doRemovePlayer(removedPlayerId);
            debugRemovePlayer("Player has been removed from GameScene", removedPlayerId);
        }

        if (
            !this.playersDebugLogAlreadyDisplayed &&
            this.remotePlayersRepository.getPlayers().size !== this.MapPlayersByKey.size
        ) {
            console.error(
                "Not the same count of players",
                this.remotePlayersRepository.getPlayers(),
                this.MapPlayersByKey,
                "Added players:",
                this.remotePlayersRepository.getAddedPlayers(),
                "Moved players:",
                this.remotePlayersRepository.getMovedPlayers(),
                "Updated players:",
                this.remotePlayersRepository.getUpdatedPlayers(),
                "Removed players:",
                this.remotePlayersRepository.getRemovedPlayers()
            );
            this.playersDebugLogAlreadyDisplayed = true;
        }

        this.remotePlayersRepository.reset();

        // Let's handle all events
        while (this.pendingEvents.length !== 0) {
            this.dirty = true;
            const event = this.pendingEvents.dequeue();
            switch (event.type) {
                /*case "AddPlayerEvent":
                    this.doAddPlayer(event.event);
                    break;
                case "RemovePlayerEvent":
                    this.doRemovePlayer(event.userId);
                    break;
                case "UserMovedEvent": {
                    this.doUpdatePlayerPosition(event.event);
                    const remotePlayer = this.MapPlayersByKey.get(event.event.userId);
                    if (remotePlayer) {
                        this.activatablesManager.updateDistanceForSingleActivatableObject(remotePlayer);
                        this.activatablesManager.deduceSelectedActivatableObjectByDistance();
                    }
                    break;
                }*/
                case "GroupCreatedUpdatedEvent":
                    this.doShareGroupPosition(event.event);
                    break;
                /*case "PlayerDetailsUpdated":
                    this.doUpdatePlayerDetails(event.details);
                    break;*/
                case "DeleteGroupEvent": {
                    this.doDeleteGroup(event.groupId);
                    if (this.currentPlayerGroupId === event.groupId) {
                        currentPlayerGroupLockStateStore.set(undefined);
                    }
                    break;
                }
                case "GroupUsersUpdatedEvent": {
                    this.doUpdateGroupUsers(event.event.groupId, event.event.userIds);
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = event;
                }
            }
        }
        // Let's move all users
        const updatedPlayersPositions = this.playersPositionInterpolator.getUpdatedPositions(time);
        updatedPlayersPositions.forEach((moveEvent: HasPlayerMovedInterface, userId: number) => {
            this.dirty = true;
            const player: RemotePlayer | undefined = this.MapPlayersByKey.get(userId);
            if (player === undefined) {
                throw new Error('Cannot find player with ID "' + userId + '"');
            }
            player.updatePosition(moveEvent);
        });
        // If any of the users (including me) has moved, we need to recompute the shape of all bubbles
        for (const group of this.groups.values()) {
            if (updatedPlayersPositions.size > 0 || this.hasMovedThisFrame || group.isAnimating) {
                group.step();
            }
        }
        this.hasMovedThisFrame = false;
    }

    deleteGroup(groupId: number): void {
        this.pendingEvents.enqueue({
            type: "DeleteGroupEvent",
            groupId,
        });
    }

    doDeleteGroup(groupId: number): void {
        const group = this.groups.get(groupId);
        if (!group) {
            return;
        }
        group.destroy();
        this.groups.delete(groupId);
    }

    doUpdateGroupUsers(groupId: number, userIds: number[]): void {
        const group = this.groups.get(groupId);
        if (!group) {
            console.warn("Could not find group with ID", groupId);
            return;
        }
        group.updateUsers(userIds);
    }

    doUpdatePlayerDetails(update: PlayerDetailsUpdate): void {
        const character = this.MapPlayersByKey.get(update.player.userId);
        if (character === undefined) {
            console.info(
                "Could not set new details to character with ID ",
                update.player.userId,
                ". Did he/she left before te message was received?"
            );
            return;
        }

        if (update.updated.availabilityStatus) {
            character.setAvailabilityStatus(update.player.availabilityStatus);
        }
        if (update.updated.outlineColor) {
            if (update.player.outlineColor === undefined) {
                character.removeApiOutlineColor();
            } else {
                character.setApiOutlineColor(update.player.outlineColor);
            }
        }
        if (update.updated.showVoiceIndicator) {
            character.toggleTalk(update.player.showVoiceIndicator);
        }
        if (update.updated.sayMessage) {
            character.say(update.player.sayMessage?.message ?? "", update.player.sayMessage?.type ?? 0);
        }
    }

    /**
     * Sends to the server an event emitted by one of the ActionableItems.
     */
    emitActionableEvent(itemId: number, eventName: string, state: unknown, parameters: unknown) {
        this.connection?.emitActionableEvent(itemId, eventName, state, parameters);
    }

    public onResize(): void {
        super.onResize();
        this.reposition(true);

        this.throttledSendViewportToServer();
    }

    public sendViewportToServer(margin = 300): void {
        const camera = this.cameras.main;
        if (!camera) {
            return;
        }

        // We detect NaN values here for obscure reasons (Phaser bug)
        const left = Math.max(0, camera.scrollX - margin);
        const top = Math.max(0, camera.scrollY - margin);
        const right = camera.scrollX + camera.width + margin;
        const bottom = camera.scrollY + camera.height + margin;
        if (Number.isNaN(left) || Number.isNaN(top) || Number.isNaN(right) || Number.isNaN(bottom)) {
            console.error("NaN detected in viewport calculation", { left, top, right, bottom, camera });
            return;
        }

        this.connection?.setViewport({
            left: left,
            top: top,
            right: right,
            bottom: bottom,
        });
    }

    public reposition(instant = false): void {
        // Recompute camera offset if needed
        this.time.delayedCall(0, () => {
            biggestAvailableAreaStore.recompute();
            if (this.cameraManager != undefined) {
                this.cameraManager.updateCameraOffset(get(biggestAvailableAreaStore), instant);
            }
        });
    }

    public createSuccessorGameScene(autostart: boolean, reconnecting: boolean) {
        const gameSceneKey = "somekey" + Math.round(Math.random() * 10000);
        const game = new GameScene(this._room, gameSceneKey);
        this.scene.add(gameSceneKey, game, autostart, {
            initPosition: {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            },
            reconnecting: reconnecting,
        });

        //If new gameScene doesn't start automatically then we change the gameScene in gameManager so that it can start the new gameScene
        if (!autostart) {
            gameManager.gameSceneIsCreated(game);
        }
        this.scene.stop(this.scene.key);
        this.scene.remove(this.scene.key);
    }

    public getGameMap(): GameMap {
        return this.gameMapFrontWrapper.getGameMap();
    }

    public getGameMapFrontWrapper(): GameMapFrontWrapper {
        return this.gameMapFrontWrapper;
    }

    public getCameraManager(): CameraManager {
        return this.cameraManager;
    }

    public getRemotePlayersRepository(): RemotePlayersRepository {
        return this.remotePlayersRepository;
    }

    public getMapEditorModeManager(): MapEditorModeManager {
        return this.mapEditorModeManager;
    }

    public getEntitiesCollectionsManager(): EntitiesCollectionsManager {
        return this.entitiesCollectionsManager;
    }

    public getPathfindingManager(): PathfindingManager {
        return this.pathfindingManager;
    }

    public getActivatablesManager(): ActivatablesManager {
        return this.activatablesManager;
    }

    public getOutlineManager(): OutlineManager {
        return this.outlineManager;
    }

    /**
     * Quickfix for phaser last version breaking the outline on
     * objects and characters
     * TODO: Remove this function after the bug correction on phaser
     */
    public refreshSceneForOutline(): void {
        this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
            this.markDirty();
        });
        this.markDirty();
    }

    private loadEntityCollections() {
        const customEntityCollectionUrl = this.getCustomEntityCollectionUrl();
        const collectionDescriptors: { url: string; type: EntityPrefabType }[] = this.wamFile.entityCollections.map(
            (collectionUrl) => ({
                url: collectionUrl.url,
                type: "Default",
            })
        );
        collectionDescriptors.push({ url: customEntityCollectionUrl, type: "Custom" });

        this.entitiesCollectionsManager.loadCollections(collectionDescriptors);
    }

    private doLoadTMJFile(mapUrlFile: string): void {
        this.load.on("filecomplete-tilemapJSON-" + mapUrlFile, (key: string, type: string, data: unknown) => {
            this.onMapLoad(data).catch((e) => console.error(e));
        });
        this.load.tilemapTiledJSON(mapUrlFile, mapUrlFile);
        // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
        // In this case, we check in the cache to see if the map is here and trigger the event manually.
        if (this.cache.tilemap.exists(mapUrlFile)) {
            const data = this.cache.tilemap.get(mapUrlFile);
            this.onMapLoad(data.data).catch((e) => console.error(e));
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async onMapLoad(data: any): Promise<void> {
        // Triggered when the map is loaded
        // Load tiles attached to the map recursively
        // The map file can be modified by the scripting API and we don't want to tamper the Phaser cache (in case we come back on the map after visiting other maps)
        // So we are doing a deep copy
        this.mapFile = structuredClone(data);

        // Safe parse can take up to 600ms on a 17MB map.
        // TODO: move safeParse to a "map" page and display details of what is going wrong there.
        /*const parseResult = ITiledMap.safeParse(this.mapFile);
        if (!parseResult.success) {
            console.warn("Your map file seems to be invalid. Errors: ", parseResult.error);
        }*/

        const url = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        this.mapFile.tilesets.forEach((tileset) => {
            if ("source" in tileset) {
                throw new Error(
                    `Tilesets must be embedded in a map. The tileset "${tileset.source}" must be embedded in the Tiled map "${this.mapUrlFile}".`
                );
            }
            if (typeof tileset.name === "undefined" || !("image" in tileset)) {
                console.warn("Don't know how to handle tileset ", tileset);
                return;
            }
            //TODO strategy to add access token
            if (tileset.image.includes(".svg")) {
                this.load.svg(`${url}/${tileset.image}`, `${url}/${tileset.image}`, {
                    width: tileset.imagewidth,
                    height: tileset.imageheight,
                });
            } else {
                this.load.image(`${url}/${tileset.image}`, `${url}/${tileset.image}`);
            }
        });

        // Scan the object layers for objects to load and load them.
        this.objectsByType = new Map<string, ITiledMapObject[]>();

        for (const layer of this.mapFile.layers) {
            if (layer.type === "objectgroup") {
                for (const object of layer.objects) {
                    let objectsOfType: ITiledMapObject[] | undefined;
                    if (object.class) {
                        if (!this.objectsByType.has(object.class)) {
                            objectsOfType = new Array<ITiledMapObject>();
                        } else {
                            objectsOfType = this.objectsByType.get(object.class);
                            if (objectsOfType === undefined) {
                                throw new Error("Unexpected object type not found");
                            }
                        }
                        objectsOfType.push(object);
                        this.objectsByType.set(object.class, objectsOfType);
                    }
                }
            }
        }

        // TODO: remove support for these objects. They have been superseded by variables and scripting and entities for a long time.
        for (const [itemType, objectsOfType] of this.objectsByType) {
            // FIXME: we would ideally need for the loader to WAIT for the import to be performed, which means writing our own loader plugin.

            let itemFactory: ItemFactoryInterface;

            switch (itemType) {
                case "computer": {
                    //eslint-disable-next-line no-await-in-loop
                    const module = await import("../Items/Computer/computer");
                    itemFactory = module.default;
                    break;
                }
                default:
                    continue;
                //throw new Error('Unsupported object type: "'+ itemType +'"');
            }

            itemFactory.preload(this.load);
            this.load.start(); // Let's manually start the loader because the import might be over AFTER the loading ends.

            // Note: the code below is probably wrong, but not used anymore.
            // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
            this.load.on("complete", () => {
                // FIXME: the factory might fail because the resources might not be loaded yet...
                // We would need to add a loader ended event in addition to the createPromise
                this.createPromiseDeferred.promise
                    .then(async () => {
                        itemFactory.create(this);

                        const roomJoinedAnswer = await this.connectionAnswerPromiseDeferred.promise;

                        for (const object of objectsOfType) {
                            // TODO: we should pass here a factory to create sprites (maybe?)

                            // Do we have a state for this object?
                            const state = roomJoinedAnswer.items[object.id];

                            const actionableItem = itemFactory.factory(this, object, state);
                            this.actionableItems.set(actionableItem.getId(), actionableItem);
                        }
                    })
                    .catch((e) => console.error(e));
            });
        }
    }

    private initUserPermissionsOnEntity() {
        if (!this.connection) {
            throw new Error("This should never happen");
        }
        const userCanEdit = this.connection.userCanEdit;
        const gameMapAreas = this.getGameMap().getGameMapAreas();
        if (gameMapAreas !== undefined) {
            this.entityPermissions = new EntityPermissions(
                gameMapAreas,
                this.connection.getAllTags() ?? [],
                userCanEdit,
                localUserStore.getLocalUser()?.uuid
            );
            this.entityPermissionsDeferred.resolve(this.entityPermissions);
        }
    }

    private initializeAreaManager() {
        if (!this.connection) {
            throw new Error("This should never happen");
        }
        const userCanEdit = this.connection.userCanEdit;
        const userConnectedTags = this.connection.getAllTags() ?? [];
        this.gameMapFrontWrapper.initializeAreaManager(userConnectedTags, userCanEdit);
    }

    private hide(hide = true): void {
        this.scene.setVisible(!hide);
        iframeListener?.hideIFrames(hide);
    }

    /**
     * Initializes the connection to Pusher.
     */
    private connect(): void {
        const camera = this.cameraManager.getCamera();

        connectionManager
            .connectToRoomSocket(
                this.roomUrl,
                this.playerName,
                gameManager.getCharacterTextureIds() ?? [],
                {
                    ...this.startPositionCalculator.startPosition,
                },
                {
                    left: camera.scrollX,
                    top: camera.scrollY,
                    right: camera.scrollX + camera.width,
                    bottom: camera.scrollY + camera.height,
                },
                gameManager.getCompanionTextureId(),
                get(availabilityStatusStore),
                this.getGameMap().getLastCommandId()
            )
            .then(async (onConnect: OnConnectInterface) => {
                this.connection = onConnect.connection;

                // Initialize TURN credentials manager
                iceServersManager.init(this.connection, this.abortController.signal);

                gameManager.setCharacterTextureIds(onConnect.room.characterTextures.map((texture) => texture.id));
                gameManager.setCompanionTextureId(onConnect.room?.companionTexture?.id ?? null);

                this.mapEditorModeManager?.subscribeToRoomConnection(this.connection);
                const commandsToApply = onConnect.room.commandsToApply;
                if (commandsToApply) {
                    try {
                        await this.mapEditorModeManager?.updateMapToNewest(commandsToApply);
                    } catch (e) {
                        Sentry.captureException(e);
                        console.error("Error while updating map to newest", e);
                    }
                }

                this._spaceRegistry = new SpaceRegistry(this.connection);
                this.spaceScriptingBridgeService = new SpaceScriptingBridgeService(this._spaceRegistry);

                videoStreamStore.forward(this._spaceRegistry.videoStreamStore);
                screenShareStreamStore.forward(this._spaceRegistry.screenShareStreamStore);
                let worldUserProvider: WorldUserProvider | undefined;
                this._spaceRegistry
                    .joinSpace(
                        WORLD_SPACE_NAME,
                        FilterType.ALL_USERS,
                        ["availabilityStatus", "chatID"],
                        this.abortController.signal
                    )
                    .then((space) => {
                        this.allUserSpace = space;
                        worldUserProvider = new WorldUserProvider(space);
                        this._worldUserCounter.forward(worldUserProvider.userCount);
                        return gameManager.getChatConnection();
                    })
                    .then((chatConnection) => {
                        this._chatConnection = chatConnection;
                        const connection = this.connection;
                        const allUserSpace = this.allUserSpace;

                        const userProviders: UserProviderInterface[] = [];

                        if (ENABLE_CHAT_DISCONNECTED_LIST && this._room.isChatDisconnectedListEnabled) {
                            if (connection) {
                                userProviders.push(new AdminUserProvider(connection));
                            }
                            userProviders.push(new ChatUserProvider(chatConnection));
                        }

                        if (allUserSpace && this._room.isChatOnlineListEnabled && worldUserProvider) {
                            userProviders.push(worldUserProvider);
                        }

                        this._userProviderMergerDeferred.resolve(new UserProviderMerger(userProviders));
                    })
                    .catch((e) => {
                        const errorMessage = "Failed to get chatConnection from gameManager : " + e;
                        console.error(errorMessage);
                    });

                this.initExtensionModule();

                this.tryOpenMapEditorWithToolEditorParameter();

                this.subscribeToStores();

                lazyLoadPlayerCharacterTextures(this.superLoad, onConnect.room.characterTextures)
                    .then((textures) => {
                        this.currentPlayerTexturesResolve(textures);
                    })
                    .catch((e) => {
                        this.currentPlayerTexturesReject(e);
                    });

                if (onConnect.room.companionTexture) {
                    lazyLoadPlayerCompanionTexture(this.superLoad, onConnect.room.companionTexture)
                        .then((texture) => {
                            this.currentCompanionTextureResolve(texture);
                        })
                        .catch((e) => {
                            this.currentCompanionTextureReject(e);
                        });
                }

                playersStore.connectToRoomConnection(this.connection);
                userIsAdminStore.set(this.connection.hasTag("admin"));
                userIsEditorStore.set(this.connection.hasTag("editor"));

                // The userJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userJoinedMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.addPlayer(message);

                    this.playersEventDispatcher.postMessage({
                        type: "addRemotePlayer",
                        data: {
                            playerId: message.userId,
                            name: message.name,
                            userUuid: message.userUuid,
                            outlineColor: message.outlineColor,
                            availabilityStatus: availabilityStatusToJSON(message.availabilityStatus),
                            position: message.position,
                            variables: message.variables,
                            chatID: message.chatID,
                        },
                    });
                });

                // The userMovedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userMovedMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.movePlayer(message);
                    const position = message.position;
                    if (position === undefined) {
                        throw new Error("Position missing from UserMovedMessage");
                    }

                    const messageUserMoved: MessageUserMovedInterface = {
                        userId: message.userId,
                        position: position,
                    };

                    this.updatePlayerPosition(messageUserMoved);
                });

                // The userLeftMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userLeftMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.removePlayer(message.userId);
                    this.playersEventDispatcher.postMessage({
                        type: "removeRemotePlayer",
                        data: message.userId,
                    });
                });

                // The refreshRoomMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.refreshRoomMessageStream.subscribe((message) => {
                    refreshPromptStore.set({
                        timeToRefresh: message.timeToRefresh,
                    });
                });

                // The playerDetailsUpdatedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.playerDetailsUpdatedMessageStream.subscribe((message) => {
                    // Is this message for me (exceptionally, we can use this stream to send messages to users
                    // who share the same UUID as us)
                    if (message.userId === this.connection?.getUserId() && message.details?.setVariable) {
                        this.playerVariablesManager.updateVariable(message.details?.setVariable);
                        return;
                    }

                    this.remotePlayersRepository.updatePlayer(message);
                });

                // The groupUpdateMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupUpdateMessageStream.subscribe(
                    (groupPositionMessage: GroupCreatedUpdatedMessageInterface) => {
                        this.shareGroupPosition(groupPositionMessage);
                    }
                );

                // The groupDeleteMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupDeleteMessageStream.subscribe((message) => {
                    try {
                        this.deleteGroup(message.groupId);
                    } catch (e) {
                        console.error(e);
                    }
                });

                // The serverDisconnected stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.serverDisconnected.subscribe(() => {
                    showConnectionIssueMessage();
                    console.info("Player disconnected from server. Reloading scene.");
                    this.cleanupClosingScene();

                    this.createSuccessorGameScene(true, true);
                });
                hideConnectionIssueMessage();

                // The itemEventMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.itemEventMessageStream.subscribe((message) => {
                    const item = this.actionableItems.get(message.itemId);
                    if (item === undefined) {
                        console.warn(
                            'Received an event about object "' +
                                message.itemId +
                                '" but cannot find this item on the map.'
                        );
                        return;
                    }
                    item.fire(message.event, message.state, message.parameters);
                });

                // The groupUsersUpdateMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupUsersUpdateMessageStream.subscribe((message) => {
                    const userId = this.connection?.getUserId();
                    if (userId && message.userIds.includes(userId)) {
                        this.currentPlayerGroupId = message.groupId;
                    }

                    this.pendingEvents.enqueue({
                        type: "GroupUsersUpdatedEvent",
                        event: message,
                    });
                });

                // The worldFullMessageStream stream is completed in the RoomConnection. No need to unsubscribe.

                this.messageSubscription = this.connection.worldFullMessageStream.subscribe((message) => {
                    this.showWorldFullError(message);
                });

                batchGetUserMediaStore.startBatch();
                mediaManager.enableMyCamera();
                mediaManager.enableMyMicrophone();
                batchGetUserMediaStore.commitChanges();

                // Set up manager of audio streams received by the scripting API (useful for bots)

                this._proximityChatRoom = new ProximityChatRoom(
                    this.connection.getSpaceUserId(),
                    this._spaceRegistry,
                    iframeListener,
                    this.remotePlayersRepository,
                    this
                );

                this._proximityChatRoomDeferred.resolve(this._proximityChatRoom);
                this.proximitySpaceManager = new ProximitySpaceManager(this.connection, this._proximityChatRoom);

                this.scriptingVideoManager = new ScriptingVideoManager();

                this._sayManager = new SayManager(this.connection, this.CurrentPlayer);

                userMessageManager.setReceiveBanListener(this.bannedUser.bind(this));

                this.CurrentPlayer.on(hasMovedEventName, (event: HasPlayerMovedInterface) => {
                    this.handleCurrentPlayerHasMovedEvent(event);
                });

                // Set up events manager
                this.scriptingEventsManager = new ScriptingEventsManager(this.connection);

                // Set up follow manager
                this.followManager = new FollowManager(this.connection, this.remotePlayersRepository);

                // Set up locate manager
                this.locateManager = new LocateManager(this, this.cameraManager, this.connection);

                // Set up variables manager
                this.sharedVariablesManager = new SharedVariablesManager(
                    this.connection,
                    this.gameMapFrontWrapper,
                    onConnect.room.variables
                );
                const playerVariables: Map<string, unknown> = onConnect.room.playerVariables;
                // If the user is not logged, we initialize the variables with variables from the local storage
                if (!localUserStore.isLogged()) {
                    if (this._room.group) {
                        for (const [key, { isPublic, value }] of localUserStore
                            .getAllUserProperties(this._room.group)
                            .entries()) {
                            if (isPublic) {
                                this.connection?.emitPlayerSetVariable({
                                    key,
                                    value,
                                    persist: false,
                                    public: true,
                                    scope: "world",
                                });
                            }
                            playerVariables.set(key, value);
                        }
                    }

                    for (const [key, { isPublic, value }] of localUserStore
                        .getAllUserProperties(this._room.id)
                        .entries()) {
                        if (isPublic) {
                            this.connection?.emitPlayerSetVariable({
                                key,
                                value,
                                persist: false,
                                public: true,
                                scope: "room",
                            });
                        }
                        playerVariables.set(key, value);
                    }
                }
                this.playerVariablesManager = new PlayerVariablesManager(
                    this.connection,
                    this.playersEventDispatcher,
                    playerVariables,
                    this._room.id,
                    this._room.group ?? undefined
                );

                const broadcastService = new BroadcastService(this._spaceRegistry);
                this._broadcastService = broadcastService;

                // The megaphoneSettingsMessageStream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.megaphoneSettingsMessageStream.subscribe((megaphoneSettingsMessage) => {
                    if (megaphoneSettingsMessage) {
                        megaphoneCanBeUsedStore.set(megaphoneSettingsMessage.enabled);
                        if (
                            megaphoneSettingsMessage.url &&
                            get(availabilityStatusStore) !== AvailabilityStatus.DO_NOT_DISTURB
                        ) {
                            const oldMegaphoneSpace = get(megaphoneSpaceStore);
                            const spaceName = slugify(megaphoneSettingsMessage.url);

                            // Early return if no space registry available
                            if (!this._spaceRegistry) {
                                console.warn("No space registry available for megaphone space management");
                                return;
                            }

                            // Handle existing megaphone space
                            if (oldMegaphoneSpace) {
                                if (oldMegaphoneSpace.getName() === spaceName) {
                                    return;
                                }
                                // Different space, leave the old one
                                this._spaceRegistry.leaveSpace(oldMegaphoneSpace).catch((e) => {
                                    console.error("Error while leaving space", e);
                                    Sentry.captureException(e);
                                });
                            }

                            broadcastService
                                .joinSpace(spaceName, this.abortController.signal)
                                .then((space) => {
                                    // Update space to add metadata "isMegaphoneSpace" to true
                                    space.setMetadata(new Map([["isMegaphoneSpace", true]]));
                                    megaphoneSpaceStore.set(space);
                                    // eslint-disable-next-line @smarttools/rxjs/no-nested-subscribe
                                    const subscription = space.onLeaveSpace.subscribe(() => {
                                        megaphoneSpaceStore.set(undefined);
                                        subscription.unsubscribe();
                                    });
                                })
                                .catch((e) => {
                                    console.error(e);
                                    Sentry.captureException(e);
                                });
                        }
                    }
                });
                this._broadcastService = broadcastService;

                // The errorMessageStream is completed in the RoomConnection. No need to unsubscribe.

                // this.connection.errorMessageStream.subscribe((errorMessage) => {
                //     console.error("An error occurred server side: " + errorMessage.message);
                //     //warningMessageStore.addWarningMessage(errorMessage.message);
                // });

                this.connectionAnswerPromiseDeferred.resolve(onConnect.room);
                // Analyze tags to find if we are admin. If yes, show console.

                const error = get(errorScreenStore);
                if (error && error?.type === "reconnecting") errorScreenStore.delete();
                //this.scene.stop(ReconnectingSceneName);

                this.landingAreas =
                    this.getGameMap().getGameMapAreas()?.getAreasOnPosition({
                        x: this.CurrentPlayer.x,
                        y: this.CurrentPlayer.y,
                    }) || [];

                this.gameMapFrontWrapper.setPosition(this.CurrentPlayer.x, this.CurrentPlayer.y);
                // Init layer change listener
                this.gameMapFrontWrapper.onEnterLayer((layers) => {
                    layers.forEach((layer) => {
                        iframeListener.sendEnterLayerEvent(layer.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveLayer((layers) => {
                    layers.forEach((layer) => {
                        iframeListener.sendLeaveLayerEvent(layer.name);
                    });
                });

                // NOTE: Leaving events names as "enterArea" and "leaveArea" to not introduce any breaking changes.
                //       We are only looking through dynamic areas when handling those events.
                this.gameMapFrontWrapper.onEnterDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendEnterAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendLeaveAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onEnterDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendEnterMapEditorAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendLeaveMapEditorAreaEvent(area.name);
                    });
                });

                this.emoteManager = new EmoteManager(this, this.connection);

                // Check WebRtc connection
                try {
                    checkCoturnServer().catch((err) => {
                        console.error("Check coturn server error: ", err);
                    });
                } catch (err) {
                    console.error("Check coturn server exception: ", err);
                }

                // Get position from UUID only after the connection to the pusher is established
                this.tryMovePlayerWithMoveToUserParameter();

                gameSceneStore.set(this);
            })
            .catch((e) => console.error(e));
    }

    private initExtensionModule() {
        if (this._room.modules) {
            const externalModules = import.meta.glob("../../external-modules/*/index.ts");

            for (const moduleName of this._room.modules) {
                const moduleFactory = externalModules[`../../external-modules/${moduleName}/index.ts`];

                if (!moduleFactory) {
                    console.warn(`Unable to find module "${moduleName}" inside external modules`);
                    return;
                }
                (async () => {
                    const extensionModule = (await moduleFactory()) as { default: ExtensionModule };
                    const defaultExtensionModule = extensionModule.default;
                    // Check if the module is already initialized
                    if (get(extensionModuleStore).find((module) => module.id === defaultExtensionModule.id)) {
                        return;
                    }

                    const connection = this.connection;
                    if (!connection) {
                        throw new Error("Connection is undefined");
                    }

                    const authToken = localUserStore.getAuthToken();
                    if (!authToken) {
                        throw new Error("Auth token is undefined");
                    }

                    defaultExtensionModule.init(this._room.metadata, {
                        workadventureStatusStore: availabilityStatusStore,
                        userAccessToken: authToken,
                        roomId: this.roomUrl,
                        externalModuleMessage: connection.externalModuleMessage,
                        onExtensionModuleStatusChange: ExtensionModuleStatusSynchronization.onStatusChange,
                        calendarEventsStoreUpdate: calendarEventsStore.update,
                        todoListStoreUpdate: todoListsStore.update,
                        openCoWebSite: openCoWebSiteWithoutSource,
                        closeCoWebsite,
                        getOauthRefreshToken: connection.getOauthRefreshToken.bind(this.connection),
                        adminUrl: ADMIN_URL,
                        externalSvelteComponent: externalSvelteComponentService,
                        spaceRegistry: this._spaceRegistry,
                        logoutCallback: () => {
                            connectionManager.logout();
                        },
                        externalRestrictedMapEditorProperties: mapEditorRestrictedPropertiesStore,
                        showComponentInChat(component: ComponentType, props: Record<string, unknown>) {
                            navChat.switchToCustomComponent(component, props);
                            chatVisibilityStore.set(true);
                        },
                        openErrorScreen: (error: Error) => {
                            errorScreenStore.setException(error);
                            gameManager.closeGameScene();
                        },
                        onPlayerMovementEnded: this.onPlayerMovementEnded.bind(this),
                    });

                    if (defaultExtensionModule.calendarSynchronised) isCalendarActiveStore.set(true);
                    if (defaultExtensionModule.todoListSynchronized) isTodoListActiveStore.set(true);
                    extensionModuleStore.add(defaultExtensionModule);
                    console.info(`Extension module ${moduleName} initialization finished`);
                })().catch((error) => console.error(error));
            }
        }
    }

    private subscribeToStores(): void {
        if (
            this.userIsJitsiDominantSpeakerStoreUnsubscriber != undefined ||
            this.jitsiParticipantsCountStoreUnsubscriber != undefined ||
            this.availabilityStatusStoreUnsubscriber != undefined ||
            this.emoteUnsubscriber != undefined ||
            this.followUsersColorStoreUnsubscriber != undefined ||
            this.mapEditorModeStoreUnsubscriber != undefined ||
            this.mapExplorationStoreUnsubscriber != undefined ||
            this.lastNewMediaDeviceDetectedStoreUnsubscriber != undefined
        ) {
            console.error(
                "subscribeToStores => Check all subscriber undefined ",
                this.userIsJitsiDominantSpeakerStoreUnsubscriber,
                this.jitsiParticipantsCountStoreUnsubscriber,
                this.availabilityStatusStoreUnsubscriber,
                this.emoteUnsubscriber,
                this.followUsersColorStoreUnsubscriber,
                this.mapEditorModeStoreUnsubscriber,
                this.mapExplorationStoreUnsubscriber,
                this.lastNewMediaDeviceDetectedStoreUnsubscriber
            );

            throw new Error("One store is already subscribed.");
        }

        this.userIsJitsiDominantSpeakerStoreUnsubscriber = userIsJitsiDominantSpeakerStore.subscribe(
            (dominantSpeaker) => {
                this.jitsiDominantSpeaker = dominantSpeaker;
                this.tryChangeShowVoiceIndicatorState(this.jitsiDominantSpeaker && this.jitsiParticipantsCount > 1);
            }
        );

        this.jitsiParticipantsCountStoreUnsubscriber = jitsiParticipantsCountStore.subscribe((participantsCount) => {
            this.jitsiParticipantsCount = participantsCount;
            this.tryChangeShowVoiceIndicatorState(this.jitsiDominantSpeaker && this.jitsiParticipantsCount > 1);
        });

        this.availabilityStatusStoreUnsubscriber = availabilityStatusStore.subscribe((availabilityStatus) => {
            if (!this.connection) {
                throw new Error("Connection is undefined");
            }
            this.connection.emitPlayerStatusChange(availabilityStatus);
            this.CurrentPlayer.setAvailabilityStatus(availabilityStatus);
            if (availabilityStatus === AvailabilityStatus.SILENT) {
                this.CurrentPlayer.toggleTalk(false, true);
            }
        });

        this.emoteUnsubscriber = emoteStore.subscribe((emote) => {
            if (emote && get(enableUserInputsStore)) {
                this.CurrentPlayer?.playEmote(emote.emoji);
                this.connection?.emitEmoteEvent(emote.emoji);
                emoteStore.set(null);
            }
        });

        this.followUsersColorStoreUnsubscriber = followUsersColorStore.subscribe((color) => {
            if (color !== undefined) {
                this.CurrentPlayer.setFollowOutlineColor(color);
                this.connection?.emitPlayerOutlineColor(color);
            } else {
                this.CurrentPlayer.removeFollowOutlineColor();
                this.connection?.emitPlayerOutlineColor(null);
            }
        });

        this.highlightedEmbedScreenUnsubscriber = highlightedEmbedScreen.subscribe((value) => {
            //this.reposition();
        });

        this.embedScreenLayoutStoreUnsubscriber = embedScreenLayoutStore.subscribe((layout) => {
            //this.reposition();
        });

        this.mapEditorModeStoreUnsubscriber = mapEditorModeStore.subscribe((isOn) => {
            if (isOn) {
                this.activatablesManager.deactivateSelectedObject();
                this.activatablesManager.handlePointerOutActivatableObject();
                this.activatablesManager.disableSelectingByDistance();
            } else {
                this.activatablesManager.handlePointerOutActivatableObject();
                this.activatablesManager.enableSelectingByDistance();
                // make sure all entities are non-interactive
                this.gameMapFrontWrapper.getEntitiesManager().makeAllEntitiesNonInteractive();
                // add interactions back only for activatables
                this.gameMapFrontWrapper.getEntitiesManager().makeAllEntitiesInteractive(true);
            }
            this.markDirty();
        });

        this.mapExplorationStoreUnsubscriber = mapExplorationModeStore.subscribe((exploration) => {
            if (exploration) {
                this.cameraManager.setExplorationMode();
            } else {
                this.input.keyboard?.enableGlobalCapture();
            }
        });

        this.lastNewMediaDeviceDetectedStoreUnsubscriber = lastNewMediaDeviceDetectedStore.subscribe((devices) => {
            if (devices.length === 0) return;
            // filter device by name tu avoid multiple notification for the same device
            const devicesToNotify = devices.reduce((devices: MediaDeviceInfo[], currentDevice: MediaDeviceInfo) => {
                if (
                    devices.find((device_) => device_.label == currentDevice.label) != undefined ||
                    get(requestedCameraDeviceIdStore) == currentDevice.deviceId ||
                    get(requestedMicrophoneDeviceIdStore) == currentDevice.deviceId ||
                    get(speakerSelectedStore) == currentDevice.deviceId
                )
                    return devices;

                devices.push(currentDevice);
                return devices;
            }, []);

            for (const device of devicesToNotify) {
                const id = `playtext-mediadevice-${device.deviceId}`;
                this.CurrentPlayer.destroyText(id);
                this.CurrentPlayer.playText(
                    id,
                    get(LL).camera.webrtc.newDeviceDetected({ device: device.label }),
                    5000,
                    () => {
                        this.CurrentPlayer.destroyText(id);

                        // get all devices with the same label
                        const devicesToUse = devices.filter((device_) => device_.label === device.label);

                        for (const deviceToUse of devicesToUse) {
                            switch (deviceToUse.kind) {
                                case "videoinput":
                                    requestedCameraDeviceIdStore.set(deviceToUse.deviceId);
                                    localUserStore.setPreferredVideoInputDevice(deviceToUse.deviceId);
                                    break;
                                // use the new device
                                case "audioinput":
                                    requestedMicrophoneDeviceIdStore.set(deviceToUse.deviceId);
                                    localUserStore.setPreferredAudioInputDevice(deviceToUse.deviceId);
                                    break;

                                case "audiooutput":
                                    localUserStore.setSpeakerDeviceId(deviceToUse.deviceId);
                                    speakerSelectedStore.set(deviceToUse.deviceId);
                                    break;
                                default:
                                    console.warn("Unknown device kind: ", deviceToUse.kind);
                            }
                        }
                    },
                    true,
                    "message"
                );
            }
        });

        this.isLiveStreamingUnsubscriber = this.spaceRegistry.isLiveStreamingStore.subscribe((isStreaming) => {
            if (isStreaming) {
                this.enableVoiceIndicator();
            } else {
                this.disableVoiceIndicator();
            }
        });

        // Subscribe to bubble sound changes
        this.unsubscribers.push(
            bubbleSoundStore.subscribe((soundType) => {
                this.load.audio(`audio-webrtc-in-${soundType}`, `/resources/objects/webrtc-in-${soundType}.mp3`);
                this.load.audio(`audio-webrtc-out-${soundType}`, `/resources/objects/webrtc-out-${soundType}.mp3`);
                this.load.start();
            })
        );
    }

    private listenToIframeEvents(): void {
        this.iframeSubscriptionList.push(
            iframeListener.openPopupStream.subscribe((openPopupEvent) => {
                let objectLayerSquare: ITiledMapObject;
                const targetObjectData = this.gameMapFrontWrapper.findObject(openPopupEvent.targetObject);
                if (targetObjectData !== undefined) {
                    objectLayerSquare = targetObjectData;
                } else {
                    console.error(
                        "Error while opening a popup. Cannot find an object on the map with name '" +
                            openPopupEvent.targetObject +
                            "'. The first parameter of WA.openPopup() must be the name of a rectangle object in your map."
                    );
                    return;
                }
                const escapedMessage = HtmlUtils.escapeHtml(openPopupEvent.message);
                let html =
                    '<div id="container" class="relative bg-contrast/80 backdrop-blur pt-4 overflow-hidden rounded-lg text-white" hidden>';
                if (escapedMessage) {
                    html += `<div class="text-xxs text-center px-2">
${escapedMessage}
 </div> `;
                }

                const buttonContainer =
                    '<div class="buttonContainer flex flex-wrap gap-2 bg-contrast py-2 px-2 mt-2"</div>';
                html += buttonContainer;
                let id = 0;
                for (const button of openPopupEvent.buttons) {
                    html += `<div class="flex w-full"><button type="button" class="btn btn-xs hover:bg-contrast-600/50 justify-center w-full pb-4 ${HtmlUtils.escapeHtml(
                        button.className ?? ""
                    )}" id="popup-${openPopupEvent.popupId}-${id}">${HtmlUtils.escapeHtml(button.label)}</button>`;
                    id++;
                }
                html += "</div></div>";
                const domElement = this.add.dom(objectLayerSquare.x, objectLayerSquare.y).createFromHTML(html);

                const container = z.instanceof(HTMLDivElement).parse(domElement.getChildByID("container"));
                container.style.width = objectLayerSquare.width + "px";
                domElement.scale = 0;
                domElement.setClassName("popUpElement");

                setTimeout(() => {
                    container.hidden = false;
                }, 100);

                id = 0;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for (const button of openPopupEvent.buttons) {
                    const button = HtmlUtils.getElementByIdOrFail<HTMLButtonElement>(
                        `popup-${openPopupEvent.popupId}-${id}`
                    );
                    const btnId = id;
                    button.onclick = () => {
                        iframeListener.sendButtonClickedEvent(openPopupEvent.popupId, btnId);
                        // Disable for a short amount of time to let time to the script to remove the popup
                        button.disabled = true;
                        setTimeout(() => {
                            button.disabled = false;
                        }, 100);
                    };
                    id++;
                }
                this.tweens.add({
                    targets: domElement,
                    scale: 1,
                    ease: "EaseOut",
                    duration: 400,
                });

                this.popUpElements.set(openPopupEvent.popupId, domElement);

                // Analytics tracking for popups
                analyticsClient.openedPopup(openPopupEvent.targetObject, openPopupEvent.popupId);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.closePopupStream.subscribe((closePopupEvent) => {
                const popUpElement = this.popUpElements.get(closePopupEvent.popupId);
                if (popUpElement === undefined) {
                    console.error(
                        "Could not close popup with ID ",
                        closePopupEvent.popupId,
                        ". Maybe it has already been closed?"
                    );
                }

                this.tweens.add({
                    targets: popUpElement,
                    scale: 0,
                    ease: "EaseOut",
                    duration: 400,
                    onComplete: () => {
                        popUpElement?.destroy();
                        this.popUpElements.delete(closePopupEvent.popupId);
                    },
                });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.openChatStream.subscribe(() => {
                chatVisibilityStore.set(true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.closeChatStream.subscribe(() => {
                chatVisibilityStore.set(false);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.turnOffMicrophoneStream.subscribe(() => {
                requestedMicrophoneState.disableMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.turnOffWebcamStream.subscribe(() => {
                requestedCameraState.disableWebcam();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disableMicrophoneStream.subscribe(() => {
                myMicrophoneBlockedStore.set(true);
                mediaManager.disableMyMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.restoreMicrophoneStream.subscribe(() => {
                myMicrophoneBlockedStore.set(false);
                mediaManager.enableMyMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disableWebcamStream.subscribe(() => {
                myCameraBlockedStore.set(true);
                mediaManager.disableMyCamera();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.restoreWebcamStream.subscribe(() => {
                myCameraBlockedStore.set(false);
                mediaManager.enableMyCamera();
            })
        );

        this.iframeSubscriptionList.push(
            // FIXME: aren't we making a weird loop here?
            iframeListener.addPersonnalMessageStream.subscribe((text) => {
                iframeListener.sendUserInputChat(text, undefined);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.chatMessageStream.subscribe((chatMessage) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        switch (chatMessage.options.scope) {
                            case "local": {
                                room.addExternalMessage("local", chatMessage.message, chatMessage.options.author);
                                selectedRoomStore.set(room);
                                chatVisibilityStore.set(true);

                                break;
                            }
                            case "bubble": {
                                room.addExternalMessage("bubble", chatMessage.message);
                                selectedRoomStore.set(room);
                                chatVisibilityStore.set(true);
                            }
                        }
                    })
                    .catch((error) => {
                        console.error("Error while sending proximity chat message", error);
                        Sentry.captureException(error);
                    });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.startTypingProximityMessageStream.subscribe((sartWriting) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        room.addExternalTypingUser(
                            btoa(sartWriting.author ?? "unknow"),
                            sartWriting.author ?? "unknow",
                            null
                        );
                    })
                    .catch((error) => {
                        console.error("Error while starting typing proximity message", error);
                        Sentry.captureException(error);
                    });
            })
        );
        this.iframeSubscriptionList.push(
            iframeListener.stopTypingProximityMessageStream.subscribe((stopWriting) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        room.removeExternalTypingUser(btoa(stopWriting.author ?? "unknow"));
                    })
                    .catch((error) => {
                        console.error("Error while stopping typing proximity message", error);
                        Sentry.captureException(error);
                    });
            })
        );

        /*this.iframeSubscriptionList.push(
            iframeListener.newChatMessageWritingStatusStream.subscribe((status) => {
                // TODO: Implement
                console.debug("Not implemented yet with new chat integration", status);
            })
        );*/

        this.iframeSubscriptionList.push(
            iframeListener.disablePlayerControlStream.subscribe((messageEventSource) => {
                if (messageEventSource) {
                    this.userInputManager.disableControls(messageEventSource);

                    iframeListener.onIframeCloseEvent(messageEventSource, () => {
                        this.userInputManager.restoreControls(messageEventSource);
                    });
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.enablePlayerControlStream.subscribe((messageEventSource) => {
                if (messageEventSource) {
                    this.userInputManager.restoreControls(messageEventSource);
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disablePlayerProximityMeetingStream.subscribe(() => {
                mediaManager.disableProximityMeeting();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.enablePlayerProximityMeetingStream.subscribe(() => {
                mediaManager.enableProximityMeeting();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.cameraSetStream.subscribe((cameraSetEvent) => {
                const duration = cameraSetEvent.smooth ? cameraSetEvent.duration ?? 1000 : 0;
                if (cameraSetEvent.lock) {
                    this.cameraManager.enterFocusMode({ ...cameraSetEvent }, undefined, duration);
                } else {
                    this.cameraManager.setPosition({ ...cameraSetEvent }, duration);
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.cameraFollowPlayerStream.subscribe((cameraFollowPlayerEvent) => {
                const duration = cameraFollowPlayerEvent.smooth ? cameraFollowPlayerEvent.duration ?? 1000 : 0;
                this.cameraManager.leaveFocusMode(this.CurrentPlayer, duration);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.playSoundStream.subscribe((playSoundEvent) => {
                const url = new URL(playSoundEvent.url, this.mapUrlFile);
                soundManager
                    .playSound(this.load, this.sound, url.toString(), playSoundEvent.config)
                    .catch((e) => console.error(e));
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.stopSoundStream.subscribe((stopSoundEvent) => {
                const url = new URL(stopSoundEvent.url, this.mapUrlFile);
                soundManager.stopSound(this.sound, url.toString());
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.askPositionStream.subscribe((event: AskPositionEvent) => {
                this.connection?.emitAskPosition(event.uuid, event.playUri);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.openInviteMenuStream.subscribe(() => {
                const inviteMenu = subMenusStore.findByKey(SubMenusInterface.invite);
                if (get(menuVisiblilityStore) && activeSubMenuStore.isActive(inviteMenu)) {
                    menuVisiblilityStore.set(false);
                    activeSubMenuStore.activateByIndex(0);
                    return;
                }
                activeSubMenuStore.activateByMenuItem(inviteMenu);
                menuVisiblilityStore.set(true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.addActionsMenuKeyToRemotePlayerStream.subscribe((data) => {
                this.MapPlayersByKey.get(data.id)?.registerWokaMenuAction({
                    actionName: data.actionKey,
                    callback: () => {
                        iframeListener.sendActionsMenuActionClickedEvent({ actionName: data.actionKey, id: data.id });
                    },
                });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.removeActionsMenuKeyFromRemotePlayerEvent.subscribe((data) => {
                this.MapPlayersByKey.get(data.id)?.unregisterWokaMenuAction(data.actionKey);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.trackCameraUpdateStream.subscribe(() => {
                if (!this.firstCameraUpdateSent) {
                    this.cameraManager.on(
                        CameraManagerEvent.CameraUpdate,
                        (data: CameraManagerEventCameraUpdateData) => {
                            const cameraEvent: WasCameraUpdatedEvent = {
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                                zoom: data.zoom,
                            };
                            if (
                                this.lastCameraEvent?.x == cameraEvent.x &&
                                this.lastCameraEvent?.y == cameraEvent.y &&
                                this.lastCameraEvent?.width == cameraEvent.width &&
                                this.lastCameraEvent?.height == cameraEvent.height &&
                                this.lastCameraEvent?.zoom == cameraEvent.zoom
                            ) {
                                return;
                            }

                            this.lastCameraEvent = cameraEvent;
                            iframeListener.sendCameraUpdated(cameraEvent);
                            this.firstCameraUpdateSent = true;
                        }
                    );
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.loadSoundStream.subscribe((loadSoundEvent) => {
                const url = new URL(loadSoundEvent.url, this.mapUrlFile);
                soundManager.loadSound(this.load, this.sound, url.toString()).catch((e) => console.error(e));
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.loadPageStream.subscribe((url: string) => {
                this.loadNextGameFromExitUrl(url)
                    .then(() => {
                        this.events.once(EVENT_TYPE.POST_UPDATE, () => {
                            this.onMapExit(Room.getRoomPathFromExitUrl(url, window.location.toString())).catch((e) =>
                                console.error(e)
                            );
                        });
                    })
                    .catch((e) => console.error(e));
            })
        );
        let scriptedBubbleSprite: Sprite;
        this.iframeSubscriptionList.push(
            iframeListener.displayBubbleStream.subscribe(() => {
                scriptedBubbleSprite = new Sprite(
                    this,
                    this.CurrentPlayer.x + 25,
                    this.CurrentPlayer.y,
                    "circleSprite-white"
                );
                scriptedBubbleSprite.setDisplayOrigin(48, 48).setDepth(DEPTH_BUBBLE_CHAT_SPRITE);
                this.add.existing(scriptedBubbleSprite);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.removeBubbleStream.subscribe(() => {
                scriptedBubbleSprite.destroy();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.showLayerStream.subscribe((layerEvent) => {
                this.gameMapFrontWrapper.setLayerVisibility(layerEvent.name, true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.hideLayerStream.subscribe((layerEvent) => {
                this.gameMapFrontWrapper.setLayerVisibility(layerEvent.name, false);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.setPropertyStream.subscribe((setProperty) => {
                this.setPropertyLayer(setProperty.layerName, setProperty.propertyName, setProperty.propertyValue);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.setAreaPropertyStream.subscribe((setProperty) => {
                this.setAreaProperty(setProperty.areaName, setProperty.propertyName, setProperty.propertyValue);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.banPlayerIframeEvent.subscribe((banPlayerEvent) => {
                this.connection?.emitBanPlayerMessage(banPlayerEvent.uuid, banPlayerEvent.name);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.mapEditorStream.subscribe((isActivated: boolean) => {
                mapManagerActivated.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.screenSharingStream.subscribe((isActivated: boolean) => {
                screenSharingActivatedStore.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.rightClickStream.subscribe((isRestore: boolean) => {
                if (isRestore) this.userInputManager.restoreRightClick();
                else this.userInputManager.disableRightClick();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.wheelZoomStream.subscribe((isRestore: boolean) => {
                if (isRestore) this.cameraManager.unlockZoom();
                else this.cameraManager.lockZoom();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.inviteUserButtonStream.subscribe((isActivated: boolean) => {
                inviteUserActivated.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.roomListButtonStream.subscribe((isActivated: boolean) => {
                roomListActivated.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.addButtonActionBarStream.subscribe((event) => {
                registerAdditionalMenuItem(event);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.removeButtonActionBarStream.subscribe((event) => {
                unregisterAdditionalMenuItem(event);
            })
        );

        iframeListener.registerAnswerer("openCoWebsite", (openCoWebsite, source) => {
            return openCoWebSite(openCoWebsite, source);
        });

        iframeListener.registerAnswerer("getCoWebsites", () => {
            return getCoWebSite();
        });

        iframeListener.registerAnswerer("closeCoWebsite", (coWebsiteId) => {
            return closeCoWebsite(coWebsiteId);
        });

        iframeListener.registerAnswerer("closeCoWebsites", () => {
            return coWebsites.removeAll();
        });

        iframeListener.registerAnswerer("openUIWebsite", (websiteConfig) => {
            return uiWebsiteManager.open(websiteConfig);
        });

        iframeListener.registerAnswerer("getUIWebsites", () => {
            return uiWebsiteManager.getAll();
        });

        iframeListener.registerAnswerer("getUIWebsiteById", (websiteId) => {
            const website = uiWebsiteManager.getById(websiteId);
            if (!website) {
                throw new Error("Unknown ui-website");
            }
            return website;
        });

        iframeListener.registerAnswerer("closeUIWebsite", (websiteId) => {
            return uiWebsiteManager.close(websiteId);
        });

        iframeListener.registerAnswerer("getMapData", () => {
            return {
                data: this.gameMapFrontWrapper.getMap(),
            };
        });

        iframeListener.registerAnswerer("getWamMapData", () => {
            return {
                data: this.gameMapFrontWrapper.getGameMap().getWam(),
            };
        });

        iframeListener.registerAnswerer("getState", async (query, source): Promise<GameStateEvent> => {
            // The sharedVariablesManager is not instantiated before the connection is established. So we need to wait
            // for the connection to send back the answer.
            await this.connectionAnswerPromiseDeferred.promise;
            return {
                playerId: this.connection?.getUserId(),
                mapUrl: this.mapUrlFile,
                hashParameters: urlManager.getHashParameters(),
                startLayerName: this.startPositionCalculator.getStartPositionName() ?? undefined,
                uuid: localUserStore.getLocalUser()?.uuid,
                nickname: this.playerName,
                language: get(locale),
                roomId: this.roomUrl,
                tags: this.connection ? this.connection.getAllTags() : [],
                variables: this.sharedVariablesManager.variables,
                //playerVariables: localUserStore.getAllUserProperties(),
                playerVariables: this.playerVariablesManager.variables,
                userRoomToken: this.connection ? this.connection.userRoomToken : "",
                metadata: this._room.metadata,
                iframeId: source ? iframeListener.getUIWebsiteIframeIdFromSource(source) : undefined,
                isLogged: this.room.isLogged,
            };
        });
        this.iframeSubscriptionList.push(
            iframeListener.setTilesStream.subscribe((eventTiles) => {
                for (const eventTile of eventTiles) {
                    this.gameMapFrontWrapper.putTile(eventTile.tile, eventTile.x, eventTile.y, eventTile.layer);
                    this.animatedTiles.updateAnimatedTiles(eventTile.x, eventTile.y);
                }
            })
        );
        iframeListener.registerAnswerer("enablePlayersTracking", (enablePlayersTrackingEvent, source) => {
            if (source === null) {
                throw new Error('Missing source in "enablePlayersTracking" query. This should never happen.');
            }

            if (enablePlayersTrackingEvent.movement === true && enablePlayersTrackingEvent.players === false) {
                throw new Error("Cannot enable movement without enabling players first");
            }

            let sendPlayers = false;

            if (enablePlayersTrackingEvent.players) {
                sendPlayers = this.playersEventDispatcher.addIframe(source);
            } else {
                this.playersEventDispatcher.removeIframe(source);
            }
            if (enablePlayersTrackingEvent.movement) {
                this.playersMovementEventDispatcher.addIframe(source);
            } else {
                this.playersMovementEventDispatcher.removeIframe(source);
            }

            const addPlayerEvents: AddPlayerEvent[] = [];
            if (sendPlayers) {
                if (enablePlayersTrackingEvent.players) {
                    for (const player of this.remotePlayersRepository.getPlayers().values()) {
                        addPlayerEvents.push(RemotePlayersRepository.toIframeAddPlayerEvent(player));
                    }
                }
            }
            return addPlayerEvents;
        });
        iframeListener.registerAnswerer("loadTileset", (eventTileset) => {
            return this.connectionAnswerPromiseDeferred.promise.then(() => {
                const jsonTilesetDir = eventTileset.url.substring(0, eventTileset.url.lastIndexOf("/"));
                //Initialise the firstgid to 1 because if there is no tileset in the tilemap, the firstgid will be 1
                let newFirstgid = 1;
                const lastTileset = this.mapFile.tilesets[this.mapFile.tilesets.length - 1];
                if (
                    lastTileset &&
                    lastTileset.firstgid !== undefined &&
                    "tilecount" in lastTileset &&
                    lastTileset.tilecount !== undefined
                ) {
                    //If there is at least one tileset in the tilemap then calculate the firstgid of the new tileset
                    newFirstgid = lastTileset.firstgid + lastTileset.tilecount;
                }

                return new Promise((resolve, reject) => {
                    const errorHandler = (file: Phaser.Loader.File) => {
                        if (file.src === eventTileset.url) {
                            console.error("Error while loading " + eventTileset.url + ".");
                            reject(new Error("Error while loading " + eventTileset.url + "."));
                        }
                        this.load.off("loaderror", errorHandler);
                    };

                    this.load.once("filecomplete-json-" + eventTileset.url, () => {
                        let jsonTileset = this.cache.json.get(eventTileset.url);
                        const imageUrl = jsonTilesetDir + "/" + jsonTileset.image;

                        this.load.image(imageUrl, imageUrl);
                        this.load.once("filecomplete-image-" + imageUrl, () => {
                            //Add the firstgid of the tileset to the json file
                            jsonTileset = { ...jsonTileset, firstgid: newFirstgid };
                            this.mapFile.tilesets.push(jsonTileset);
                            this.Map.tilesets.push(
                                new Tileset(
                                    jsonTileset.name,
                                    jsonTileset.firstgid,
                                    jsonTileset.tileWidth,
                                    jsonTileset.tileHeight,
                                    jsonTileset.margin,
                                    jsonTileset.spacing,
                                    jsonTileset.tiles
                                )
                            );
                            const tilesetImage = this.Map.addTilesetImage(
                                jsonTileset.name,
                                imageUrl,
                                jsonTileset.tilewidth,
                                jsonTileset.tileheight,
                                jsonTileset.margin,
                                jsonTileset.spacing
                            );
                            if (tilesetImage) {
                                this.Terrains.push(tilesetImage);
                            } else {
                                console.warn(`Failed to add TilesetImage ${jsonTileset.name}: ${imageUrl}`);
                            }
                            //destroy the tilemaplayer because they are unique and we need to reuse their key and layerData
                            for (const layer of this.Map.layers) {
                                layer.tilemapLayer.destroy(false);
                            }
                            this.gameMapFrontWrapper?.close();
                            //Create a new GameMap with the changed file
                            this.gameMapFrontWrapper = new GameMapFrontWrapper(
                                this,
                                new GameMap(this.mapFile, this.wamFile),
                                this.Map,
                                this.Terrains
                            );
                            // Unsubscribe if needed and subscribe to GameMapChanged event again
                            this.subscribeToGameMapChanged();
                            this.subscribeToEntitiesManagerObservables();
                            //Destroy the colliders of the old tilemapLayer
                            this.physics.add.world.colliders.destroy();
                            //Create new colliders with the new GameMap
                            this.createCollisionWithPlayer();
                            //Create new trigger with the new GameMap
                            new GameMapPropertiesListener(this, this.gameMapFrontWrapper).register();
                            resolve(newFirstgid);
                        });
                        this.load.off("loaderror", errorHandler);
                    });
                    this.load.on("loaderror", errorHandler);

                    this.load.json(eventTileset.url, eventTileset.url);
                    this.load.start();
                });
            });
        });

        iframeListener.registerAnswerer("triggerActionMessage", (message) =>
            popupStore.addPopup(
                PopUpTriggerActionMessage,
                {
                    message: message.message,
                    click: () => {
                        popupStore.removePopup(message.uuid);
                        iframeListener.sendActionMessageTriggered(message.uuid);
                    },
                    userInputManager: this.userInputManager,
                },
                message.uuid
            )
        );

        iframeListener.registerAnswerer("triggerPlayerMessage", (message) =>
            this.CurrentPlayer.playText(message.uuid, message.message, undefined, () => {
                this.CurrentPlayer.destroyText(message.uuid);
                iframeListener.sendActionMessageTriggered(message.uuid);
            })
        );

        iframeListener.registerAnswerer("setVariable", (event, source) => {
            // TODO: "setVariable" message has a useless "target"
            // TODO: "setVariable" message has a useless "target"
            // TODO: "setVariable" message has a useless "target"
            // TODO: design another message when sending from iframeAPI to front

            this.sharedVariablesManager.setVariable(event, source);
            /*switch (event.target) {
                case "global": {
                    break;
                }
                case "player": {
                    localUserStore.setUserProperty(event.key, event.value);
                    break;
                }
                case "sharedPlayer": {
                    this.connection?.emitPlayerSetVariable(event.key, event.value);
                    // const clientToServerMessage = new ClientToServerMessage();
                    // clientToServerMessage.setSetplayerdetailsmessage(message);
                    // this.socket.send(clientToServerMessage.serializeBinary().buffer);
                    break;
                }
                default: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _exhaustiveCheck: never = event.target;
                }
            }*/
        });

        iframeListener.registerAnswerer("removeActionMessage", (message) => {
            popupStore.removePopup(message.uuid);
        });

        iframeListener.registerAnswerer("removePlayerMessage", (message) => {
            this.CurrentPlayer.destroyText(message.uuid);
        });

        iframeListener.registerAnswerer("setPlayerOutline", (message) => {
            const normalizeColor = (color: number) => Math.min(Math.max(0, Math.round(color)), 255);
            const red = normalizeColor(message.red);
            const green = normalizeColor(message.green);
            const blue = normalizeColor(message.blue);
            const color = (red << 16) | (green << 8) | blue;
            this.CurrentPlayer.setApiOutlineColor(color);
            this.connection?.emitPlayerOutlineColor(color);
        });

        iframeListener.registerAnswerer("removePlayerOutline", () => {
            this.CurrentPlayer.removeApiOutlineColor();
            this.connection?.emitPlayerOutlineColor(null);
        });

        iframeListener.registerAnswerer("getPlayerPosition", () => {
            return {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            };
        });

        iframeListener.registerAnswerer("movePlayerTo", async (message) => {
            return this.moveTo({ x: message.x, y: message.y }, true, message.speed);
        });

        iframeListener.registerAnswerer("teleportPlayerTo", (message) => {
            this.CurrentPlayer.teleportTo(message.x, message.y);
        });

        iframeListener.registerAnswerer("getWoka", () => {
            return new Promise((res, rej) => {
                const woka = get(currentPlayerWokaStore);
                if (woka) {
                    res(woka);
                    return;
                }

                // If we could not get the Woka right away (because it is not available yet), let's subscribe to the update
                // and resolve as soon as we have a value
                let unsubscribe: (() => void) | undefined;
                //eslint-disable-next-line prefer-const
                unsubscribe = currentPlayerWokaStore.subscribe((woka) => {
                    if (woka !== undefined) {
                        if (unsubscribe) {
                            unsubscribe();
                        }
                        res(woka);
                    }
                });
            });
        });

        iframeListener.registerAnswerer("goToLogin", () => {
            if (!ENABLE_OPENID) {
                throw new Error("Cannot access login page. OpenID connect must configured first.");
            }
            scriptUtils.goToPage("/login");
        });

        iframeListener.registerAnswerer("playSoundInBubble", async (message) => {
            const soundUrl = new URL(message.url, this.mapUrlFile);
            try {
                const proximityChatRoom = await this._proximityChatRoomDeferred.promise;
                await proximityChatRoom.dispatchSound(soundUrl);
            } catch (error) {
                console.error("Error playing sound in bubble:", error);
            }
        });
    }

    private setPropertyLayer(
        layerName: string,
        propertyName: string,
        propertyValue: string | number | boolean | undefined
    ): void {
        if (propertyName === GameMapProperties.EXIT_URL && typeof propertyValue === "string") {
            this.loadNextGameFromExitUrl(propertyValue).catch((e) => console.error(e));
        }
        this.gameMapFrontWrapper.setLayerProperty(layerName, propertyName, propertyValue);
    }

    private setAreaProperty(areaName: string, propertyName: string, propertyValue: unknown): void {
        this.gameMapFrontWrapper.setDynamicAreaProperty(areaName, propertyName, propertyValue);
    }

    private removeAllRemotePlayers(): void {
        this.MapPlayersByKey.forEach((player: RemotePlayer) => {
            player.destroy();

            if (player.companion) {
                player.companion.destroy();
            }
        });
        this.MapPlayersByKey.clear();
    }

    private tryOpenMapEditorWithToolEditorParameter(): void {
        const toolEditorParam = urlManager.getHashParameter("mapEditor");
        if (toolEditorParam) {
            if (!get(mapEditorActivated)) {
                popupStore.addPopup(
                    PopUpMapEditorNotEnabled,
                    {
                        message: get(LL).warning.mapEditorNotEnabled(),
                        click: () => {
                            popupStore.removePopup("mapEditorNotEnabled");
                        },
                        userInputManager: this.userInputManager,
                    },
                    "mapEditorNotEnabled"
                );

                setTimeout(() => popupStore.removePopup("mapEditorNotEnabled"), 6_000);
            } else {
                switch (toolEditorParam) {
                    case "wamSettingsEditorTool": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.WAMSettingsEditor);
                        const menuItem = urlManager.getHashParameter("menuItem");
                        if (menuItem) {
                            switch (menuItem) {
                                case "megaphone": {
                                    mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(
                                        WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone
                                    );
                                    break;
                                }
                                default: {
                                    mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(undefined);
                                    break;
                                }
                            }
                        }
                        break;
                    }
                    case "floor": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.FloorEditor);
                        break;
                    }
                    case "entity": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.EntityEditor);
                        break;
                    }
                    case "area": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.AreaEditor);
                        break;
                    }
                    default: {
                        popupStore.addPopup(
                            PopUpMapEditorShortcut,
                            {
                                message: get(LL).warning.mapEditorShortCut(),
                                click: () => {
                                    popupStore.removePopup("mapEditorShortCut");
                                },
                                userInputManager: this.userInputManager,
                            },
                            "mapEditorShortCut"
                        );

                        setTimeout(() => popupStore.removePopup("mapEditorShortCut"), 6_000);
                        break;
                    }
                }
            }
            urlManager.clearHashParameter();
        }
    }

    /**
     * Analyze the #moveTo parameter in the URL.
     * This function will try to move the player
     *
     * - to the X,Y coordinates if this is X,Y coordinates
     * - if not, to the WAM area with the given name
     * - if not found, to the Tiled area with the given name
     * - if not found, to the Tiled layer with the given name
     */
    private tryMovePlayerWithMoveToParameter(): void {
        const moveToParam = urlManager.getHashParameter("moveTo");
        if (moveToParam) {
            try {
                let endPos: { x: number; y: number };
                const posFromParam = StringUtils.parsePointFromParam(moveToParam);
                if (posFromParam) {
                    endPos = posFromParam;
                } else {
                    // First, try by id
                    let areaData = this.gameMapFrontWrapper.getAreas()?.get(moveToParam);
                    if (!areaData) {
                        areaData = this.gameMapFrontWrapper.getAreaByName(moveToParam);
                    }
                    if (areaData) {
                        endPos = MathUtils.randomPositionFromRect(areaData);
                    } else {
                        const destinationObject = this.gameMapFrontWrapper.getObjectWithName(moveToParam);
                        if (destinationObject) {
                            endPos = destinationObject;
                        } else {
                            endPos = this.pathfindingManager.mapTileUnitToPixels(
                                this.gameMapFrontWrapper.getRandomPositionFromLayer(moveToParam)
                            );
                        }
                    }
                }

                this.moveTo(endPos, false, WOKA_SPEED * 2.5).catch((e) => console.warn(e));

                urlManager.clearHashParameter();
            } catch (err) {
                console.warn(`Cannot proceed with moveTo command:\n\t-> ${err}`);
            }
        }
    }

    private tryMovePlayerWithMoveToUserParameter(): void {
        const uuidParam = urlManager.getHashParameter("moveToUser");
        if (uuidParam) {
            this.connection?.emitAskPosition(uuidParam, this.roomUrl);
            urlManager.clearHashParameter();
        }
    }

    /**
     * Walk the player to position x,y expressed in Game pixels.
     */
    public async moveTo(
        position: { x: number; y: number },
        tryFindingNearestAvailable = false,
        speed: number | undefined = undefined
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        const path = await this.getPathfindingManager().findPathFromGameCoordinates(
            {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            },
            position,
            tryFindingNearestAvailable
        );
        if (path.length === 0) throw new Error("No path found");
        return this.CurrentPlayer.setPathToFollow(path, speed ?? this.CurrentPlayer.walkingSpeed);
    }

    /**
     * Walk the player to their personal desk.
     */
    public async walkToPersonalDesk(): Promise<void> {
        const userUUID = localUserStore.getLocalUser()?.uuid;
        if (!userUUID) {
            warningMessageStore.addWarningMessage(get(LL).actionbar.personalDesk.errorNoUser(), { closable: true });
            return;
        }

        const gameMapFrontWrapper = this.getGameMapFrontWrapper();
        const personalAreas =
            gameMapFrontWrapper.areasManager?.getAreasByPropertyType("personalAreaPropertyData") ?? [];

        // Find the user's personal area
        let personalAreaData: AreaData | null = null;
        for (const area of personalAreas) {
            const property = area.areaData.properties.find((property) => property.type === "personalAreaPropertyData");
            if (property && property.type === "personalAreaPropertyData" && property.ownerId === userUUID) {
                personalAreaData = area.areaData;
                break;
            }
        }

        if (!personalAreaData) {
            warningMessageStore.addWarningMessage(get(LL).actionbar.personalDesk.errorNotFound(), { closable: true });
            return;
        }

        // Calculate center of the area
        const centerX = personalAreaData.x + personalAreaData.width * 0.5;
        const centerY = personalAreaData.y + personalAreaData.height * 0.5;

        try {
            await this.moveTo({ x: centerX, y: centerY }, true, WOKA_SPEED * 2.5);
            analyticsClient.goToPersonalDesk();
        } catch (error) {
            console.warn("Error while moving to personal desk", error);
            warningMessageStore.addWarningMessage(get(LL).actionbar.personalDesk.errorMoving(), { closable: true });
        }
    }

    private getExitUrl(layer: ITiledMapLayer): string | undefined {
        const property = PropertyUtils.findStringProperty(GameMapProperties.EXIT_URL, layer.properties);
        return property;
    }

    /**
     * @deprecated the map property exitSceneUrl is deprecated
     */
    private getExitSceneUrl(layer: ITiledMapLayer): string | undefined {
        const property = PropertyUtils.findStringProperty(GameMapProperties.EXIT_SCENE_URL, layer.properties);
        return property;
    }

    private getScriptUrls(map: ITiledMap): string[] {
        const script = PropertyUtils.findStringProperty(GameMapProperties.SCRIPT, map.properties);

        if (!script) {
            return [];
        }

        return script.split("\n").map((scriptSplit) => new URL(scriptSplit, this.mapUrlFile).toString());
    }

    private loadNextGameFromExitUrl(exitUrl: string): Promise<void> {
        return this.loadNextGame(Room.getRoomPathFromExitUrl(exitUrl, window.location.toString()));
    }

    //todo: push that into the gameManager
    private async loadNextGame(exitRoomPath: URL): Promise<void> {
        try {
            const room = await Room.createRoom(exitRoomPath);
            return gameManager.loadMap(room);
        } catch (e /*: unknown*/) {
            console.warn('Error while pre-loading exit room "' + exitRoomPath.toString() + '"', e);
        }
    }

    private handleCurrentPlayerHasMovedEvent(event: HasPlayerMovedInterface): void {
        //listen event to share position of user
        this.pushPlayerPosition(event);
        this.gameMapFrontWrapper.setPosition(event.x, event.y);
        this.activatablesManager.updateActivatableObjectsDistances([
            ...Array.from(this.MapPlayersByKey.values()),
            ...this.actionableItems.values(),
            ...this.gameMapFrontWrapper.getActivatableEntities(),
        ]);
        this.activatablesManager.deduceSelectedActivatableObjectByDistance();

        // Call movement ended callbacks if movement just ended
        for (const cb of this.onPlayerMovementEndedCallbacks) {
            cb(event);
        }
        this.hasMovedThisFrame = true;
    }

    private createCollisionWithPlayer() {
        //add collision layer
        for (const phaserLayer of this.gameMapFrontWrapper.phaserLayers) {
            this.physics.add.collider(
                this.CurrentPlayer,
                phaserLayer,
                (
                    object1:
                        | Phaser.Physics.Arcade.Body
                        | Phaser.Physics.Arcade.StaticBody
                        | Phaser.Tilemaps.Tile
                        | Phaser.Types.Physics.Arcade.GameObjectWithBody,
                    object2:
                        | Phaser.Physics.Arcade.Body
                        | Phaser.Physics.Arcade.StaticBody
                        | Phaser.Tilemaps.Tile
                        | Phaser.Types.Physics.Arcade.GameObjectWithBody
                ) => {}
            );
            phaserLayer.setCollisionByProperty({ collides: true });
            if (DEBUG_MODE) {
                //debug code to see the collision hitbox of the object in the top layer
                phaserLayer.renderDebug(this.add.graphics(), {
                    tileColor: null, //non-colliding tiles
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Colliding face edges
                });
            }
            //});
        }
    }

    private createCurrentPlayer() {
        //TODO create animation moving between exit and start
        try {
            this.CurrentPlayer = new Player(
                this,
                this.startPositionCalculator.startPosition.x,
                this.startPositionCalculator.startPosition.y,
                this.playerName,
                this.currentPlayerTexturesPromise,
                PositionMessage_Direction.DOWN,
                false,
                this.currentCompanionTexturePromise
            );
            this.CurrentPlayer.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
                this.CurrentPlayer.pointerOverOutline(0x365dff);
            });
            this.CurrentPlayer.on(Phaser.Input.Events.POINTER_OUT, (pointer: Phaser.Input.Pointer) => {
                this.CurrentPlayer.pointerOutOutline();
            });
            this.CurrentPlayer.on(requestEmoteEventName, (emoteKey: string) => {
                this.connection?.emitEmoteEvent(emoteKey);
            });
        } catch (error) {
            if (error instanceof CharacterTextureError) {
                console.warn("Error while loading current player character texture", error.message);
                gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
            } else if (error instanceof CompanionTextureError) {
                console.warn("Error while loading current player companion texture", error.message);
                gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
            }
            throw error;
        }

        //create collision
        this.createCollisionWithPlayer();
    }

    private pushPlayerPosition(event: HasPlayerMovedInterface) {
        if (this.lastMoveEventSent === event) {
            return;
        }

        // If the player is not moving, let's send the info right now.
        if (event.moving === false) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If the player is moving, and if it changed direction, let's send an event
        if (event.direction !== this.lastMoveEventSent.direction) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If more than 200ms happened since last event sent
        if (this.currentTick - this.lastSentTick >= POSITION_DELAY) {
            this.doPushPlayerPosition(event);
            return;
        }

        // Otherwise, do nothing.
    }

    private doPushPlayerPosition(event: HasPlayerMovedInterface): void {
        this.lastMoveEventSent = event;
        this.lastSentTick = this.currentTick;
        const camera = this.cameras.main;
        let viewport = {
            left: camera.scrollX,
            top: camera.scrollY,
            right: camera.scrollX + camera.width,
            bottom: camera.scrollY + camera.height,
        };
        if (!this.scene.scene.renderer) {
            // In the very special case where we have no renderer, the viewport will not move along the Woka.
            // We need to adjust it manually. We set it to something very large to make sure the Woka sees
            // everything around (useful for bots, even if so far, it is a trick)
            viewport = {
                left: event.x - 3_000,
                top: event.y - 3_000,
                right: event.x + 3_000,
                bottom: event.y + 3_000,
            };
        }
        this.connection?.sharePosition(event.x, event.y, event.direction, event.moving, viewport);
        iframeListener.hasPlayerMoved(event);
    }

    private doAddPlayer(addPlayerData: AddPlayerInterface): void {
        //check if exist player, if exist, move position
        // Can this really happen? yes..
        if (this.MapPlayersByKey.has(addPlayerData.userId)) {
            console.warn("Got instructed to add a player that already exists: ", addPlayerData.userId);
            console.error(
                "Players status",
                this.remotePlayersRepository.getPlayers(),
                this.MapPlayersByKey,
                "Added players:",
                this.remotePlayersRepository.getAddedPlayers(),
                "Moved players:",
                this.remotePlayersRepository.getMovedPlayers(),
                "Updated players:",
                this.remotePlayersRepository.getUpdatedPlayers(),
                "Removed players:",
                this.remotePlayersRepository.getRemovedPlayers()
            );
            return;
        }

        let player: RemotePlayer;

        try {
            player = new RemotePlayer(
                addPlayerData.userId,
                addPlayerData.userUuid,
                this,
                addPlayerData.position.x,
                addPlayerData.position.y,
                addPlayerData.name,
                lazyLoadPlayerCharacterTextures(this.superLoad, addPlayerData.characterTextures),
                addPlayerData.position.direction,
                addPlayerData.position.moving,
                addPlayerData.visitCardUrl,
                addPlayerData.companionTexture
                    ? lazyLoadPlayerCompanionTexture(this.superLoad, addPlayerData.companionTexture)
                    : new CancelablePromise<string>((_, reject) =>
                          reject(new CompanionTextureError("No companion texture"))
                      ),
                undefined,
                addPlayerData.chatID,
                addPlayerData.sayMessage
            );
        } catch (error) {
            if (error instanceof CharacterTextureError) {
                console.warn("Error while loading remote player character texture", error.message);
            } else if (error instanceof CompanionTextureError) {
                console.warn("Error while loading remote player companion texture", error.message);
            }
            throw error;
        }

        if (addPlayerData.outlineColor !== undefined) {
            player.setApiOutlineColor(addPlayerData.outlineColor);
        }
        if (addPlayerData.availabilityStatus !== 0) {
            player.setAvailabilityStatus(addPlayerData.availabilityStatus, true);
        }
        this.MapPlayersByKey.set(player.userId, player);
        player.updatePosition(addPlayerData.position);

        player.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.activatablesManager.handlePointerOverActivatableObject(player);
            this.markDirty();
        });

        player.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.activatablesManager.handlePointerOutActivatableObject();
            this.markDirty();
        });
    }

    private tryChangeShowVoiceIndicatorState(show: boolean): void {
        this.CurrentPlayer.toggleTalk(show);
        if (this.showVoiceIndicatorChangeMessageSent && !show) {
            this.connection?.emitPlayerShowVoiceIndicator(false);
            this.showVoiceIndicatorChangeMessageSent = false;
        } else if (!this.showVoiceIndicatorChangeMessageSent && show) {
            this.connection?.emitPlayerShowVoiceIndicator(true);
            this.showVoiceIndicatorChangeMessageSent = true;
        }
    }

    private subscribeToGameMapChanged(): void {
        this.gameMapChangedSubscription?.unsubscribe();
        this.gameMapChangedSubscription = this.gameMapFrontWrapper
            .getMapChangedObservable()
            .subscribe((collisionGrid) => {
                this.pathfindingManager.setCollisionGrid(collisionGrid);
                this.markDirty();
                const playerDestination = this.CurrentPlayer.getCurrentPathDestinationPoint();
                if (playerDestination) {
                    this.moveTo(playerDestination, true).catch((reason) => console.warn(reason));
                }
            });
    }

    private subscribeToEntitiesManagerObservables(): void {
        this.rxJsSubscriptions.push(
            this.gameMapFrontWrapper
                .getEntitiesManager()
                .getPointerOverEntityObservable()
                .subscribe((entity) => {
                    if (get(mapEditorModeStore)) {
                        return;
                    }
                    this.activatablesManager.handlePointerOverActivatableObject(entity);
                    this.markDirty();
                })
        );
        this.rxJsSubscriptions.push(
            this.gameMapFrontWrapper
                .getEntitiesManager()
                .getPointerOutEntityObservable()
                .subscribe((entity) => {
                    if (get(mapEditorModeStore)) {
                        return;
                    }
                    this.activatablesManager.handlePointerOutActivatableObject();
                    this.markDirty();
                })
        );
    }

    private doRemovePlayer(userId: number) {
        const player = this.MapPlayersByKey.get(userId);
        if (player === undefined) {
            console.error("Cannot find user with id ", userId);
        } else {
            player.destroy();

            if (player.companion) {
                player.companion.destroy();
            }
        }
        this.MapPlayersByKey.delete(userId);
        // console.debug("User removed in MapPlayersByKey in GameScene", userId);
        this.playersPositionInterpolator.removePlayer(userId);
    }

    private updatePlayerPosition(message: MessageUserMovedInterface): void {
        this.playersMovementEventDispatcher.postMessage({
            type: "remotePlayerChanged",
            data: {
                playerId: message.userId,
                position: {
                    x: message.position.x,
                    y: message.position.y,
                    // TODO: make sure we can also have the "running" and "position" info
                },
            },
        });
    }

    private doUpdatePlayerPosition(message: MessageUserMovedInterface): void {
        const player: RemotePlayer | undefined = this.MapPlayersByKey.get(message.userId);
        if (player === undefined) {
            //throw new Error('Cannot find player with ID "' + message.userId +'"');
            console.error('Cannot update position of player with ID "' + message.userId + '": player not found');
            return;
        }

        // We do not update the player position directly (because it is sent only every 200ms).
        // Instead we use the PlayersPositionInterpolator that will do a smooth animation over the next 200ms.
        const playerMovement = new PlayerMovement(
            { x: player.x, y: player.y },
            this.currentTick,
            {
                ...message.position,
            },
            this.currentTick + POSITION_DELAY
        );
        this.playersPositionInterpolator.updatePlayerPosition(player.userId, playerMovement);
    }

    private shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface) {
        this.pendingEvents.enqueue({
            type: "GroupCreatedUpdatedEvent",
            event: groupPositionMessage,
        });
    }

    private doShareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface): void {
        const userId = this.connection?.getUserId();
        if (userId && groupPositionMessage.userIds.includes(userId)) {
            this.currentPlayerGroupId = groupPositionMessage.groupId;
        }

        if (this.currentPlayerGroupId === groupPositionMessage.groupId) {
            currentPlayerGroupLockStateStore.set(groupPositionMessage.locked);
        }

        // TODO: keep a reference to the group sprite in the conversationBubble
        const existingGroup = this.groups.get(groupPositionMessage.groupId);
        if (existingGroup) {
            existingGroup.setCenter(
                Math.round(groupPositionMessage.position.x),
                Math.round(groupPositionMessage.position.y)
            );
            existingGroup.setLocked(
                groupPositionMessage.groupSize === MAX_PER_GROUP || (groupPositionMessage.locked ?? false)
            );
            return;
        }

        // If we have a new group
        const conversationBubble = new ConversationBubble(
            this,
            Math.round(groupPositionMessage.position.x),
            Math.round(groupPositionMessage.position.y),
            groupPositionMessage.groupSize === MAX_PER_GROUP || (groupPositionMessage.locked ?? false),
            groupPositionMessage.userIds
        );

        this.groups.set(groupPositionMessage.groupId, conversationBubble);
    }

    //todo: put this into an 'orchestrator' scene (EntryScene?)
    private bannedUser() {
        errorScreenStore.setError(
            ErrorScreenMessage.fromPartial({
                type: "error",
                code: "USER_BANNED",
                title: "BANNED",
                subtitle: "You were banned from WorkAdventure",
                details: "If you want more information, you may contact us at: hello@workadventu.re",
            })
        );

        this.cleanupClosingScene();

        this.userInputManager.disableControls("errorScreen");
    }

    //todo: put this into an 'orchestrator' scene (EntryScene?)
    private showWorldFullError(message: string | null): void {
        this.cleanupClosingScene();

        this.scene.stop(ReconnectingSceneName);
        this.scene.remove(ReconnectingSceneName);
        this.userInputManager.disableControls("errorScreen");
        //FIX ME to use status code
        if (message == undefined) {
            this.scene.start(ErrorSceneName, {
                title: "Connection rejected",
                subTitle: "The world you are trying to join is full. Try again later.",
                message: "If you want more information, you may contact us at: hello@workadventu.re",
            });
        } else {
            this.scene.start(ErrorSceneName, {
                title: "Connection rejected",
                subTitle: "You cannot join the World. Try again later. \n\r \n\r Error: " + message + ".",
                message:
                    "If you want more information, you may contact administrator or contact us at: hello@workadventu.re",
            });
        }
    }

    private bindSceneEventHandlers(): void {
        this.events.once("shutdown", () => {
            if (!this.cleanupDone) {
                throw new Error("Scene destroyed without cleanup!");
            }
        });
    }

    handleMouseWheel(deltaY: number) {
        // Calculate the velocity of the zoom
        //const velocity = deltaY / 30;

        // Calculate the zoom factor
        //const zoomFactor = 1 - velocity * 0.1;

        // Explanation of the formula: to Zoom x 2, we need a delta of 200
        // Question: Why 200 ? For mac usage, it's too slow
        let zoomFactor = Math.exp((-deltaY * Math.log(2)) /* / 200 */ / 100);

        // Sometimes, deltaY can be really high (this happens when the browser is lagging for 1 second or so)
        // Let's clamp the value to avoid zooming too much
        zoomFactor = Clamp(zoomFactor, 0.5, 2);

        debugZoom("DeltaY: ", deltaY, "Zoom factor", zoomFactor);

        // Apply the zoom
        this.zoomByFactor(zoomFactor, true);
    }

    zoomByFactor(zoomFactor: number, smooth: boolean) {
        if (this.cameraManager.isZoomLocked()) {
            return;
        }

        this.cameraManager.zoomByFactor(zoomFactor, smooth);
    }

    get room(): Room {
        return this._room;
    }

    get sceneReadyToStartPromise(): Promise<void> {
        return this.sceneReadyToStartDeferred.promise;
    }

    private whiteMask: Phaser.GameObjects.Graphics | undefined;

    /**
     * Applies a white mask on top of the screen with the given alpha value.
     * Useful for the zoom out resistance effect.
     */
    public applyWhiteMask(alpha: number): void {
        if (!this.whiteMask) {
            this.whiteMask = this.add.graphics();
        }

        this.whiteMask.clear();
        this.whiteMask.fillStyle(0xffffff, alpha);
        const camera = this.cameras.main;
        //this.whiteMask.fillRect(camera.scrollX, camera.scrollY, camera.width, camera.height);
        // Let's apply some margin because in the zoom process, the camera will move
        this.whiteMask.fillRect(
            camera.scrollX - camera.width * 0.5,
            camera.scrollY - camera.height * 0.5,
            camera.width * 2,
            camera.height * 2
        );
        this.whiteMask.setDepth(DEPTH_WHITE_MASK);
    }

    public removeWhiteMask(): void {
        if (!this.whiteMask) {
            return;
        }
        this.whiteMask.destroy();
        this.whiteMask = undefined;
    }

    private disableCameraResistance(): void {
        this.cameraManager.disableResistanceZone();
    }

    private proximityChatRoomPromise(): Promise<ProximityChatRoom> {
        if (this._proximityChatRoom) {
            return Promise.resolve(this._proximityChatRoom);
        }

        return this._proximityChatRoomDeferred.promise;
    }

    get spaceRegistry(): SpaceRegistryInterface {
        if (!this._spaceRegistry) {
            throw new Error("_spaceRegistry not yet initialized");
        }
        return this._spaceRegistry;
    }

    get proximityChatRoom(): ProximityChatRoom {
        if (!this._proximityChatRoom) {
            throw new Error("_proximityChatRoom not yet initialized");
        }
        return this._proximityChatRoom;
    }

    get userProviderMerger(): Promise<UserProviderMerger> {
        return this._userProviderMergerDeferred.promise;
    }

    get worldUserCounter(): Readable<number> {
        return this._worldUserCounter;
    }

    getStartPositionNames(): string[] {
        return this.startPositionCalculator.getStartPositionNames();
    }

    get sayManager(): SayManager {
        if (!this._sayManager) {
            throw new Error("_sayManager not yet initialized");
        }
        return this._sayManager;
    }

    // Register a callback that will be called when the player movement ends
    public onPlayerMovementEnded(callback: (event: HasPlayerMovedInterface) => void): void {
        this.onPlayerMovementEndedCallbacks.push(callback);
    }

    private enableVoiceIndicator(): void {
        if (!this.localVolumeStoreUnsubscriber) {
            this.localVolumeStoreUnsubscriber = localVoiceIndicatorStore.subscribe((isTalking) => {
                this.tryChangeShowVoiceIndicatorState(isTalking);

                return () => {
                    this.tryChangeShowVoiceIndicatorState(false);
                };
            });
        }
    }

    private disableVoiceIndicator(): void {
        this.CurrentPlayer.toggleTalk(false, true);
        if (!this.connection?.closed) {
            this.connection?.emitPlayerShowVoiceIndicator(false);
        }
        this.showVoiceIndicatorChangeMessageSent = false;
        //this.MapPlayersByKey.forEach((remotePlayer) => remotePlayer.toggleTalk(false, true));
        if (this.localVolumeStoreUnsubscriber) {
            this.localVolumeStoreUnsubscriber();
            this.localVolumeStoreUnsubscriber = undefined;
        }
    }

    public get focusFx() {
        return this._focusFx;
    }
}

</file>
<file path="LocalUserStore.ts">
import { z } from "zod";
import { PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH, PEER_VIDEO_RECOMMENDED_BANDWIDTH } from "../Enum/EnvironmentVariable";
import type { Emoji } from "../Stores/Utils/emojiSchema";
import { arrayEmoji } from "../Stores/Utils/emojiSchema";
import type { RequestedStatus } from "../Rules/StatusRules/statusRules";
import { requestedStatusFactory } from "../Rules/StatusRules/StatusFactory/RequestedStatusFactory";
import { INITIAL_SIDEBAR_WIDTH } from "../Stores/ChatStore";
import type { LocalUser } from "./LocalUser";
import { areCharacterTexturesValid, isUserNameValid } from "./LocalUserUtils";

const playerNameKey = "playerName";
const selectedPlayerKey = "selectedPlayer";
const customCursorPositionKey = "customCursorPosition";
const requestedCameraStateKey = "requestedCameraStateKey";
const requestedMicrophoneStateKey = "requestedMicrophoneStateKey";
const characterTexturesKey = "characterTextures";
const companionKey = "companion";
const audioPlayerVolumeKey = "audioVolume";
const audioPlayerMuteKey = "audioMute";
const helpCameraSettingsShown = "helpCameraSettingsShown";
const fullscreenKey = "fullscreen";
const blockAudio = "blockAudio";
const forceCowebsiteTriggerKey = "forceCowebsiteTrigger";
const ignoreFollowRequests = "ignoreFollowRequests";
const decreaseAudioPlayerVolumeWhileTalking = "decreaseAudioPlayerVolumeWhileTalking";
const disableAnimations = "disableAnimations";
const lastRoomUrl = "lastRoomUrl";
const authToken = "authToken";
const notification = "notificationPermission";
const allowPictureInPicture = "allowPictureInPicture";
const chatSounds = "chatSounds";
const preferredVideoInputDevice = "preferredVideoInputDevice";
const preferredAudioInputDevice = "preferredAudioInputDevice";
const cacheAPIIndex = "workavdenture-cache";
const userProperties = "user-properties";
const cameraPrivacySettings = "cameraPrivacySettings";
const microphonePrivacySettings = "microphonePrivacySettings";
const emojiFavorite = "emojiFavorite";
const speakerDeviceId = "speakerDeviceId";
const matrixUserId = "matrixUserId";
const matrixAccessToken = "matrixAccessToken";
const matrixAccessTokenExpireDate = "matrixAccessTokenExpireDate";
const matrixRefreshToken = "matrixRefreshToken";
const matrixDeviceId = "matrixDeviceId";
const matrixLoginToken = "matrixLoginToken";
const requestedStatus = "RequestedStatus";
const matrixGuest = "matrixGuest";
const volumeProximityDiscussion = "volumeProximityDiscussion";
const foldersOpened = "foldersOpened";
const cameraContainerHeightKey = "cameraContainerHeight";
const chatSideBarWidthKey = "chatSideBarWidth";
const mapEditorSideBarWidthKey = "mapEditorSideBarWidthKey";
const bubbleSound = "bubbleSound";

const INITIAL_MAP_EDITOR_SIDEBAR_WIDTH = 448;

const JwtAuthToken = z
    .object({
        accessToken: z.string().optional().nullable(),
    })
    .partial();

type JwtAuthToken = z.infer<typeof JwtAuthToken>;

const FoldersOpenedSchema = z.union([z.null(), z.array(z.string()).transform((arr) => new Set(arr))]);

interface PlayerVariable {
    value: undefined;
    isPublic: boolean;
}

class LocalUserStore {
    private jwt: JwtAuthToken | undefined;
    private name: string | undefined;

    saveUser(localUser: LocalUser) {
        localStorage.setItem("localUser", JSON.stringify(localUser));
    }

    getLocalUser(): LocalUser | null {
        const data = localStorage.getItem("localUser");
        return data ? JSON.parse(data) : null;
    }

    setName(name: string): void {
        this.name = name;
        localStorage.setItem(playerNameKey, name);
    }

    getName(): string | null {
        if (this.name) {
            return this.name;
        }
        const value = localStorage.getItem(playerNameKey) || "";
        return isUserNameValid(value) ? value : null;
    }

    setPlayerCharacterIndex(playerCharacterIndex: number): void {
        localStorage.setItem(selectedPlayerKey, "" + playerCharacterIndex);
    }

    getPlayerCharacterIndex(): number {
        return parseInt(localStorage.getItem(selectedPlayerKey) || "");
    }

    setCustomCursorPosition(activeRow: number, selectedLayers: number[]): void {
        localStorage.setItem(customCursorPositionKey, JSON.stringify({ activeRow, selectedLayers }));
    }

    getCustomCursorPosition(): { activeRow: number; selectedLayers: number[] } | null {
        return JSON.parse(localStorage.getItem(customCursorPositionKey) || "null");
    }

<!-- [6a] LocalUserStore reads from localStorage (line 114) -->
    getRequestedCameraState(): boolean {
<!-- [6b] Direct localStorage access (line 115) -->
        return JSON.parse(localStorage.getItem(requestedCameraStateKey) || "true");
    }

<!-- [6e] LocalUserStore writes to localStorage (line 118) -->
    setRequestedCameraState(value: boolean): void {
<!-- [6f] Direct localStorage write (line 119) -->
        localStorage.setItem(requestedCameraStateKey, JSON.stringify(value));
    }

    getRequestedMicrophoneState(): boolean {
        return JSON.parse(localStorage.getItem(requestedMicrophoneStateKey) || "true");
    }

    setRequestedMicrophoneState(value: boolean): void {
        localStorage.setItem(requestedMicrophoneStateKey, JSON.stringify(value));
    }

    setCharacterTextures(textureIds: string[]): void {
        localStorage.setItem(characterTexturesKey, JSON.stringify(textureIds));
    }

    getCharacterTextures(): string[] | null {
        const value = JSON.parse(localStorage.getItem(characterTexturesKey) || "null");
        return areCharacterTexturesValid(value) ? value : null;
    }

    setCompanionTextureId(textureId: string | null): void {
        return localStorage.setItem(companionKey, JSON.stringify(textureId));
    }

    getCompanionTextureId(): string | null {
        const companion = JSON.parse(localStorage.getItem(companionKey) || "null");

        if (typeof companion !== "string" || companion === "") {
            return null;
        }

        return companion;
    }

    wasCompanionSet(): boolean {
        return localStorage.getItem(companionKey) ? true : false;
    }

    setAudioPlayerVolume(value: number): void {
        localStorage.setItem(audioPlayerVolumeKey, "" + value);
    }

    getAudioPlayerVolume(): number {
        return parseFloat(localStorage.getItem(audioPlayerVolumeKey) || "1");
    }

    setAudioPlayerMuted(value: boolean): void {
        localStorage.setItem(audioPlayerMuteKey, value.toString());
    }

    getAudioPlayerMuted(): boolean {
        return localStorage.getItem(audioPlayerMuteKey) === "true";
    }

    setHelpCameraSettingsShown(): void {
        localStorage.setItem(helpCameraSettingsShown, "1");
    }

    getHelpCameraSettingsShown(): boolean {
        return localStorage.getItem(helpCameraSettingsShown) === "1";
    }

    setFullscreen(value: boolean): void {
        localStorage.setItem(fullscreenKey, value.toString());
    }

    getFullscreen(): boolean {
        return localStorage.getItem(fullscreenKey) === "true";
    }

    setBlockAudio(value: boolean): void {
        localStorage.setItem(blockAudio, value.toString());
    }
    getBlockAudio(): boolean {
        return localStorage.getItem(blockAudio) === "true";
    }

    setForceCowebsiteTrigger(value: boolean): void {
        localStorage.setItem(forceCowebsiteTriggerKey, value.toString());
    }

    getForceCowebsiteTrigger(): boolean {
        return localStorage.getItem(forceCowebsiteTriggerKey) === "true";
    }

    setIgnoreFollowRequests(value: boolean): void {
        localStorage.setItem(ignoreFollowRequests, value.toString());
    }

    getIgnoreFollowRequests(): boolean {
        return localStorage.getItem(ignoreFollowRequests) === "true";
    }
    setDecreaseAudioPlayerVolumeWhileTalking(value: boolean): void {
        localStorage.setItem(decreaseAudioPlayerVolumeWhileTalking, value.toString());
    }
    getDecreaseAudioPlayerVolumeWhileTalking(): boolean {
        return localStorage.getItem(decreaseAudioPlayerVolumeWhileTalking) === "true";
    }

    setDisableAnimations(value: boolean): void {
        localStorage.setItem(disableAnimations, value.toString());
    }
    getDisableAnimations(): boolean {
        return localStorage.getItem(disableAnimations) === "true";
    }

    async setLastRoomUrl(roomUrl: string): Promise<void> {
        localStorage.setItem(lastRoomUrl, roomUrl.toString());
        if ("caches" in window) {
            try {
                const cache = await caches.open(cacheAPIIndex);
                const stringResponse = new Response(JSON.stringify({ roomUrl }));
                await cache.put(`/${lastRoomUrl}`, stringResponse);
            } catch (e) {
                console.error("Could not store last room url in Browser cache. Are you using private browser mode?", e);
            }
        }
    }

    getLastRoomUrl(): string {
        return localStorage.getItem(lastRoomUrl) ?? window.location.protocol + "//" + window.location.host + "/";
    }

    getLastRoomUrlCacheApi(): Promise<string | undefined> {
        if (!("caches" in window)) {
            return Promise.resolve(undefined);
        }
        return caches.open(cacheAPIIndex).then((cache) => {
            return cache.match(`/${lastRoomUrl}`).then((res) => {
                return res?.json().then((data) => {
                    return data.roomUrl;
                });
            });
        });
    }

    setAuthToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(authToken, value);
            this.jwt = JwtAuthToken.parse(LocalUserStore.parseJwt(value));
        } else {
            localStorage.removeItem(authToken);
        }
    }

    getAuthToken(): string | null {
        return localStorage.getItem(authToken);
    }

    isLogged(): boolean {
        return this.jwt?.accessToken !== undefined && this.jwt?.accessToken !== null;
    }

    private static parseJwt(token: string) {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );

        return JSON.parse(jsonPayload);
    }

    setNotification(value: boolean): void {
        localStorage.setItem(notification, value.toString());
    }

    getNotification(): boolean {
        return localStorage.getItem(notification) === "true";
    }

    setAllowPictureInPicture(value: boolean): void {
        localStorage.setItem(allowPictureInPicture, value.toString());
    }

    getAllowPictureInPicture(): boolean {
        return localStorage.getItem(allowPictureInPicture) !== "false";
    }

    setChatSounds(value: boolean): void {
        localStorage.setItem(chatSounds, value.toString());
    }

    getChatSounds(): boolean {
        return localStorage.getItem(chatSounds) !== "false";
    }

    private getFoldersOpened(): Set<string> {
        const foldersStr = localStorage.getItem(foldersOpened);
        if (!foldersStr) {
            return new Set<string>();
        }
        try {
            const parsed = FoldersOpenedSchema.parse(JSON.parse(foldersStr));
            return parsed ?? new Set<string>();
        } catch (e) {
            console.warn("Error parsing folders opened from localStorage:", e);
            localStorage.removeItem(foldersOpened);
            return new Set<string>();
        }
    }

    private setFoldersOpened(folders: Set<string>) {
        localStorage.setItem(foldersOpened, JSON.stringify(Array.from(folders)));
    }

    hasFolderOpened(folderId: string): boolean {
        return this.getFoldersOpened().has(folderId);
    }

    addFolderOpened(folderId: string) {
        const folders = this.getFoldersOpened();
        folders.add(folderId);
        this.setFoldersOpened(folders);
    }

    removeFolderOpened(folderId: string) {
        const folders = this.getFoldersOpened();
        folders.delete(folderId);
        this.setFoldersOpened(folders);
    }

    setPreferredVideoInputDevice(deviceId?: string) {
        if (deviceId === undefined) {
            localStorage.removeItem(preferredVideoInputDevice);
            return;
        }

        localStorage.setItem(preferredVideoInputDevice, deviceId);
    }

    setPreferredAudioInputDevice(deviceId?: string) {
        if (deviceId === undefined) {
            localStorage.removeItem(preferredAudioInputDevice);
            return;
        }

        localStorage.setItem(preferredAudioInputDevice, deviceId);
    }

    getPreferredVideoInputDevice(): string | undefined {
        const deviceId = localStorage.getItem(preferredVideoInputDevice);

        if (deviceId === null) {
            return undefined;
        }

        return deviceId;
    }

    getPreferredAudioInputDevice(): string | undefined {
        const deviceId = localStorage.getItem(preferredAudioInputDevice);

        if (deviceId === null) {
            return undefined;
        }

        return deviceId;
    }

    setCameraPrivacySettings(option: boolean) {
        localStorage.setItem(cameraPrivacySettings, option.toString());
    }

    getCameraPrivacySettings() {
        //if this setting doesn't exist in LocalUserStore, we set a default value
        if (localStorage.getItem(cameraPrivacySettings) == null) {
            localStorage.setItem(cameraPrivacySettings, "false");
        }
        return localStorage.getItem(cameraPrivacySettings) === "true";
    }

    setMicrophonePrivacySettings(option: boolean) {
        localStorage.setItem(microphonePrivacySettings, option.toString());
    }

    getMicrophonePrivacySettings() {
        //if this setting doesn't exist in LocalUserStore, we set a default value
        if (localStorage.getItem(microphonePrivacySettings) == null) {
            localStorage.setItem(microphonePrivacySettings, "true");
        }
        return localStorage.getItem(microphonePrivacySettings) === "true";
    }

    getAllUserProperties(context: string): Map<string, PlayerVariable> {
        const now = new Date().getTime();
        const result = new Map<string, PlayerVariable>();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                if (key.startsWith(userProperties + "_" + context + "__|__")) {
                    const storedValue = localStorage.getItem(key);
                    if (storedValue) {
                        const userKey = key.substring((userProperties + "_" + context + "__|__").length);

                        const [expireStr, isPublicStr] = storedValue.split(":", 2);
                        const value = storedValue.split(":").slice(2).join(":");
                        if (isPublicStr === undefined || value === undefined) {
                            console.error(
                                'Invalid value stored in Redis. Expecting the value to be in the "ttl:0|1:value" format. Got: ',
                                storedValue
                            );
                            continue;
                        }
                        let isPublic: boolean;
                        if (isPublicStr === "0") {
                            isPublic = false;
                        } else if (isPublicStr === "1") {
                            isPublic = true;
                        } else {
                            console.error('Invalid value stored in Redis for isPublic. Expecting "0" or "1"');
                            continue;
                        }
                        let expire: number | undefined;
                        if (expireStr === "") {
                            expire = undefined;
                        } else {
                            expire = parseInt(expireStr);
                            if (isNaN(expire)) {
                                console.error("Invalid value stored in Redis. The TTL is not a number");
                                continue;
                            }

                            // Let's check the TTL. If it is less than current date, let's remove the key.
                            if (expire < now) {
                                localStorage.removeItem(key);
                                continue;
                            }
                        }

                        let valueReturned;
                        try {
                            valueReturned = JSON.parse(value);
                        } catch (err) {
                            console.info(
                                "getAllUserProperties => value cannot be parsed to JSON, undefined returned.",
                                err
                            );
                            valueReturned = undefined;
                        }
                        result.set(userKey, {
                            isPublic,
                            value: valueReturned,
                        });
                    }
                }
            }
        }
        return result;
    }

    setUserProperty(
        name: string,
        value: unknown,
        context: string,
        isPublic: boolean,
        expire: number | undefined
    ): void {
        const key = userProperties + "_" + context + "__|__" + name;

        if (value === undefined) {
            localStorage.removeItem(key);
            return;
        }

        const storedValue =
            (expire !== undefined ? expire : "") + ":" + (isPublic ? "1" : "0") + ":" + JSON.stringify(value);

        localStorage.setItem(key, storedValue);
    }

    setEmojiFavorite(value: Map<number, Emoji>) {
        const valueToSave: Array<Emoji> = new Array<Emoji>();
        for (const data of value.values()) {
            valueToSave.push(data);
        }
        localStorage.setItem(emojiFavorite, JSON.stringify(valueToSave));
    }
    getEmojiFavorite(): Map<number, Emoji> | null {
        const value = localStorage.getItem(emojiFavorite);
        if (value == undefined) return null;
        try {
            const emojis: Emoji[] = JSON.parse(value);
            arrayEmoji.parse(emojis);
            const map = new Map<number, Emoji>();
            emojis.forEach((value, index) => {
                map.set(index + 1, value);
            });
            return map;
        } catch (e) {
            localStorage.removeItem(emojiFavorite);
            console.error("The localStorage key 'emojiFavorite' format is incorrect:", e);
            return null;
        }
    }

    setSpeakerDeviceId(value: string) {
        localStorage.setItem(speakerDeviceId, value);
    }

    getSpeakerDeviceId() {
        return localStorage.getItem(speakerDeviceId);
    }

    setVideoBandwidth(value: number | "unlimited") {
        localStorage.setItem("videoBandwidth", value.toString());
    }

    getVideoBandwidth(): number | "unlimited" {
        const value = localStorage.getItem("videoBandwidth");

        if (!value) {
            return PEER_VIDEO_RECOMMENDED_BANDWIDTH;
        }

        if (value === "unlimited") {
            return value;
        }

        return parseInt(value);
    }

    setScreenShareBandwidth(value: number | "unlimited") {
        localStorage.setItem("screenShareBandwidth", value.toString());
    }

    getScreenShareBandwidth(): number | "unlimited" {
        const value = localStorage.getItem("screenShareBandwidth");

        if (!value) {
            return PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH;
        }

        if (value === "unlimited") {
            return value;
        }

        return parseInt(value);
    }

    // Background transformation settings
    setBackgroundMode(value: string) {
        localStorage.setItem("backgroundMode", value);
    }

    getBackgroundMode(): string | null {
        return localStorage.getItem("backgroundMode");
    }

    setBackgroundBlurAmount(value: number) {
        localStorage.setItem("backgroundBlurAmount", value.toString());
    }

    getBackgroundBlurAmount(): number | null {
        const value = localStorage.getItem("backgroundBlurAmount");
        return value ? parseInt(value) : null;
    }

    setBackgroundImage(value: string) {
        localStorage.setItem("backgroundImage", value);
    }

    getBackgroundImage(): string | null {
        return localStorage.getItem("backgroundImage");
    }

    setBackgroundVideo(value: string) {
        localStorage.setItem("backgroundVideo", value);
    }

    getBackgroundVideo(): string | null {
        return localStorage.getItem("backgroundVideo");
    }

    getRequestedStatus(): RequestedStatus | null {
        return requestedStatusFactory.createRequestedStatus(localStorage.getItem(requestedStatus));
    }

    setRequestedStatus(newStatus: RequestedStatus | null) {
        localStorage.setItem(requestedStatus, String(newStatus));
    }

    getLastNotificationPermissionRequest(): string | null {
        return localStorage.getItem("lastNotificationPermissionRequest");
    }
    setLastNotificationPermissionRequest() {
        localStorage.setItem("lastNotificationPermissionRequest", new Date().toString());
    }

    setMatrixUserId(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixUserId, value);
        } else {
            localStorage.removeItem(matrixUserId);
        }
    }

    getMatrixUserId(): string | null {
        return localStorage.getItem(matrixUserId);
    }

    setMatrixAccessToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixAccessToken, value);
        } else {
            localStorage.removeItem(matrixAccessToken);
        }
    }

    getMatrixAccessToken(): string | null {
        return localStorage.getItem(matrixAccessToken);
    }

    setMatrixAccessTokenExpireDate(value: Date | null) {
        if (value !== null) {
            localStorage.setItem(matrixAccessTokenExpireDate, value.toString());
        } else {
            localStorage.removeItem(matrixAccessTokenExpireDate);
        }
    }

    getMatrixAccessTokenExpireDate(): Date | null {
        const value = localStorage.getItem(matrixAccessTokenExpireDate);
        if (value === null) {
            return null;
        }
        return new Date(value);
    }

    setMatrixRefreshToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixRefreshToken, value);
        } else {
            localStorage.removeItem(matrixRefreshToken);
        }
    }

    getMatrixRefreshToken(): string | null {
        return localStorage.getItem(matrixRefreshToken);
    }

    setMatrixDeviceId(value: string | null, userUuid: string) {
        if (value !== null) {
            localStorage.setItem(matrixDeviceId + "_" + userUuid, value);
        } else {
            localStorage.removeItem(matrixDeviceId + "_" + userUuid);
        }
    }

    getMatrixDeviceId(userUuid: string): string | null {
        return localStorage.getItem(matrixDeviceId + "_" + userUuid) ?? "";
    }

    setMatrixLoginToken(value: string | null) {
        if (value !== null) {
            localStorage.setItem(matrixLoginToken, value);
        } else {
            localStorage.removeItem(matrixLoginToken);
        }
    }

    getMatrixLoginToken() {
        return localStorage.getItem(matrixLoginToken);
    }

    //TODO : Remove duplicate code (getMatrixUserId) and change matrix id to chatID in localStorage
    getChatId(): string | null {
        return localStorage.getItem(matrixUserId);
    }

    isGuest(): boolean {
        return localStorage.getItem(matrixGuest) === "true";
    }

    setGuest(isGuest: boolean): void {
        localStorage.setItem(matrixGuest, isGuest.toString());
    }

    getVolumeProximityDiscussion(): number {
        return parseFloat(localStorage.getItem(volumeProximityDiscussion) || "1");
    }

    setVolumeProximityDiscussion(value: number): void {
        localStorage.setItem(volumeProximityDiscussion, `${value}`);
    }

    setCameraContainerHeight(ratio: number): void {
        localStorage.setItem(cameraContainerHeightKey, ratio.toString());
    }

    getCameraContainerHeight(): number {
        const value = localStorage.getItem(cameraContainerHeightKey);
        if (!value) {
            return 0.2; // Default value of 20%
        }
        return parseFloat(value);
    }

    setChatSideBarWidth(width: number): void {
        localStorage.setItem(chatSideBarWidthKey, width.toString());
    }

    getChatSideBarWidth(): number {
        const value = localStorage.getItem(chatSideBarWidthKey);
        if (!value) {
            return INITIAL_SIDEBAR_WIDTH;
        }
        const floatValue = parseFloat(value);
        return isNaN(floatValue) ? INITIAL_SIDEBAR_WIDTH : floatValue;
    }

    setMapEditorSideBarWidth(width: number): void {
        localStorage.setItem(mapEditorSideBarWidthKey, width.toString());
    }

    getMapEditorSideBarWidth(): number {
        const value = localStorage.getItem(mapEditorSideBarWidthKey);
        if (!value) {
            return INITIAL_MAP_EDITOR_SIDEBAR_WIDTH;
        }
        const floatValue = parseFloat(value);
        return isNaN(floatValue) ? INITIAL_MAP_EDITOR_SIDEBAR_WIDTH : floatValue;
    }

    setBubbleSound(value: "ding" | "wobble"): void {
        localStorage.setItem(bubbleSound, value);
    }

    getBubbleSound(): "ding" | "wobble" {
        const value = localStorage.getItem(bubbleSound);
        if (value === "wobble") {
            return "wobble";
        }
        return "ding";
    }
}

export const localUserStore = new LocalUserStore();

</file>
<file path="MapStore.ts">
import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";

/**
 * Is it a Map? Is it a Store? No! It's a MapStore!
 *
 * The MapStore behaves just like a regular JS Map, but... it is also a regular Svelte store.
 *
 * As a bonus, you can also get a store on any given key of the map.
 *
 * For instance:
 *
 * const mapStore = new MapStore<string, string>();
 * mapStore.getStore('foo').subscribe((value) => {
 *     console.log('Foo key has been written to the store. New value: ', value);
 * });
 * mapStore.set('foo', 'bar');
 *
 *
 * Even better, if the items stored in map contain stores, you can directly get the store to those values:
 *
 * const mapStore = new MapStore<string, {
 *     nestedStore: Readable<string>
 * }>();
 *
 * mapStore.getNestedStore('foo', item => item.nestedStore).subscribe((value) => {
 *     console.log('Foo key has been written to the store or the nested store has been updated. New value: ', value);
 * });
 * mapStore.set('foo', {
 *     nestedStore: writable('bar')
 * });
 * // Whenever the nested store is updated OR the 'foo' key is overwritten, the store returned by mapStore.getNestedStore
 * // will be triggered.
 */
<!-- [5a] MapStore extends Map and implements Readable (line 35) -->
export class MapStore<K, V> extends Map<K, V> implements Readable<Map<K, V>> {
<!-- [5b] Internal writable store (line 36) -->
    private readonly store = writable(this);
    private readonly storesByKey = new Map<K, Writable<V | undefined>>();

    subscribe(run: Subscriber<Map<K, V>>, invalidate?: (value?: Map<K, V>) => void): Unsubscriber {
        return this.store.subscribe(run, invalidate);
    }

    clear() {
        super.clear();
        this.store.set(this);
        this.storesByKey.forEach((store) => {
            store.set(undefined);
        });
    }

    delete(key: K): boolean {
        const result = super.delete(key);
        if (result) {
            this.store.set(this);
            this.storesByKey.get(key)?.set(undefined);
        }
        return result;
    }

<!-- [5c] Overridden set triggers store update (line 60) -->
    set(key: K, value: V): this {
        super.set(key, value);
<!-- [5d] Notifies subscribers on mutation (line 62) -->
        this.store.set(this);
        this.storesByKey.get(key)?.set(value);
        return this;
    }

    getStore(key: K): Readable<V | undefined> {
        let store = this.storesByKey.get(key);
        if (store !== undefined) {
            return store;
        }
        store = writable(this.get(key), () => {
            return () => {
                // No more subscribers!
                this.storesByKey.delete(key);
            };
        });
        this.storesByKey.set(key, store);
        return store;
    }

    /**
     * Returns an "inner" store inside a value stored in the map.
     */
<!-- [5f] Advanced nested store access (line 85) -->
    getNestedStore<T>(key: K, accessor: (value: V) => Readable<T> | undefined): Readable<T | undefined> {
        const initVal = this.get(key);
        let initStore: Readable<T> | undefined;
        let initStoreValue: T | undefined;
        if (initVal) {
            initStore = accessor(initVal);
            if (initStore !== undefined) {
                initStoreValue = get(initStore);
            }
        }

        return readable<T | undefined>(initStoreValue, (set) => {
            const storeByKey = this.getStore(key);

            let unsubscribeDeepStore: Unsubscriber | undefined;
            const unsubscribe = storeByKey.subscribe((newMapValue) => {
                if (unsubscribeDeepStore) {
                    unsubscribeDeepStore();
                    unsubscribeDeepStore = undefined;
                }
                if (newMapValue === undefined) {
                    set(undefined);
                } else {
                    const deepValueStore = accessor(newMapValue);
                    if (deepValueStore !== undefined) {
                        set(get(deepValueStore));

                        unsubscribeDeepStore = deepValueStore.subscribe((value) => {
                            set(value);
                        });
                    }
                }
            });

            return () => {
                unsubscribe();
                if (unsubscribeDeepStore) {
                    unsubscribeDeepStore();
                    unsubscribeDeepStore = undefined;
                }
            };
        });
    }

    /**
     * Builds a store by "reducing" stores in keys.
     *
     * An example of a store containing the SUM of all values stored into the field "mySubStore":
     *
     * this.getAggregatedStore(
     *   (value) => value.mySubStore, // Accessor to access the sub stores
     *   (subStores) => subStores.reduce((partialSum, a) => partialSum + a, 0)) // Reduces the value
     *
     * @param accessor
     * @param reducer
     */
    getAggregatedStore<T, U>(
        accessor: (value: V) => Readable<T> | undefined,
        reducer: (stores: T[]) => U
    ): Readable<U | undefined> {
        const initArray = new Array<T>();

        for (const [, value] of this.entries()) {
            const store = accessor(value);
            if (store) {
                initArray.push(get(store));
            }
        }

        const initStoreValue = reducer(initArray);

        let unsubscriber: Unsubscriber | undefined;
        let derivedUnsubscriber: Unsubscriber | undefined;

        return readable(initStoreValue, (set) => {
            const globalUnsubscriber = this.subscribe((map) => {
                if (unsubscriber) {
                    unsubscriber();
                }
                const stores: Array<Readable<T>> = [];
                for (const value of this.values()) {
                    const store = accessor(value);
                    if (store) {
                        stores.push(store);
                    }
                }
                const derivedStore = derived(stores, reducer);
                if (derivedUnsubscriber) {
                    derivedUnsubscriber();
                }
                derivedUnsubscriber = derivedStore.subscribe((value) => {
                    set(value);
                });
            });

            return () => {
                globalUnsubscriber();
                if (unsubscriber) {
                    unsubscriber();
                }
                if (derivedUnsubscriber) {
                    derivedUnsubscriber();
                }
            };
        });
    }
}

</file>
<file path="MediaStore.ts">
import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import deepEqual from "fast-deep-equal";
import { AvailabilityStatus } from "@workadventure/messages";
import * as Sentry from "@sentry/svelte";
import { localUserStore } from "../Connection/LocalUserStore";
import { isIOS, isSafari } from "../WebRtc/DeviceUtils";
import type { ObtainedMediaStreamConstraints } from "../WebRtc/P2PMessages/ConstraintMessage";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import type { RequestedStatus } from "../Rules/StatusRules/statusRules";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import {
    createBackgroundTransformer,
    type BackgroundTransformer,
    type BackgroundConfig,
} from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { LL } from "../../i18n/i18n-svelte";
import { MediaStreamConstraintsError } from "./Errors/MediaStreamConstraintsError";
import { BrowserTooOldError } from "./Errors/BrowserTooOldError";
import { errorStore, warningMessageStore } from "./ErrorStore";
import { WebviewOnOldIOS } from "./Errors/WebviewOnOldIOS";

import { createSilentStore } from "./SilentStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { inExternalServiceStore, myCameraStore, myMicrophoneStore, proximityMeetingStore } from "./MyMediaStore";
import { userMovingStore } from "./GameStore";
import { hideHelpCameraSettings } from "./HelpSettingsStore";
import { isLiveStreamingStore } from "./IsStreamingStore";

import { backgroundConfigStore, backgroundProcessingEnabledStore } from "./BackgroundTransformStore";

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createRequestedCameraState() {
<!-- [1a] Global writable store creation (line 36) -->
<!-- [6c] Store initialized from localStorage (line 36) -->
    const { subscribe, set } = writable(localUserStore.getRequestedCameraState());

    return {
        subscribe,
        enableWebcam: () => {
            set(true);
<!-- [6d] Store mutation persists to localStorage (line 42) -->
            localUserStore.setRequestedCameraState(true);
        },
        disableWebcam: () => {
            set(false);
            localUserStore.setRequestedCameraState(false);
        },
    };
}

/**
 * A store that contains the microphone state requested by the user (on or off).
 */
function createRequestedMicrophoneState() {
    const { subscribe, set } = writable(localUserStore.getRequestedMicrophoneState());

    return {
        subscribe,
        enableMicrophone: () => {
            set(true);
            localUserStore.setRequestedMicrophoneState(true);
        },
        disableMicrophone: () => {
            set(false);
            localUserStore.setRequestedMicrophoneState(false);
        },
    };
}

/**
 * A store that contains whether the EnableCameraScene is shown or not.
 */
function createEnableCameraSceneVisibilityStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        showEnableCameraScene: () => set(true),
        hideEnableCameraScene: () => set(false),
    };
}

<!-- [1b] Store exported globally (line 83) -->
export const requestedCameraState = createRequestedCameraState();
export const requestedMicrophoneState = createRequestedMicrophoneState();
export const enableCameraSceneVisibilityStore = createEnableCameraSceneVisibilityStore();

/**
 * A store that is true when the megaphone screen is displayed.
 */
export const displayedMegaphoneScreenStore = writable<boolean>(false);

/**
 * GetUserMedia is impacted by a number of stores (proximityMeetingStore, myCameraStore, myMicrophoneStore, inExternalServiceStore, privacyShutdownStore...).
 * Each time a change is done to one of these store, we will make a new GetUserMedia call.
 * If we plan to do many changes at once, we want to call GetUserMedia only once.
 *
 * To do this, you can use this store.
 * Use startBatch() to start a batch of changes (this will disable changes to GetUserMedia), and commitChanges() after the final change to call GetUserMedia.
 */
function createBatchGetUserMediaStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        startBatch: () => set(true),
        commitChanges: () => set(false),
    };
}

export const batchGetUserMediaStore = createBatchGetUserMediaStore();

/**
 * A store containing whether the webcam was enabled in the last 10 seconds
 */
const enabledWebCam10secondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribe = requestedCameraState.subscribe((enabled) => {
        if (enabled === true) {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                set(false);
            }, 10000);
            set(true);
        } else {
            set(false);
        }
    });

    return function stop() {
        if (timeout) {
            clearTimeout(timeout);
        }
        unsubscribe();
    };
});

/**
 * A store containing whether the webcam was enabled in the last 5 seconds
 */
const userMoved5SecondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribe = userMovingStore.subscribe((moving) => {
        if (moving === true) {
            if (timeout) {
                clearTimeout(timeout);
            }
            set(true);
        } else {
            timeout = setTimeout(() => {
                set(false);
            }, 5000);
        }
    });

    return function stop() {
        unsubscribe();
    };
});

/**
 * A store awaiting the loading of devices information.
 */
const devicesNotLoaded = writable(true);

const deviceChanged10SecondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribeCamera = videoConstraintStore.subscribe((constraints) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        set(true);
        timeout = setTimeout(() => {
            set(false);
        }, 10000);
    });

    const unsubscribeAudio = audioConstraintStore.subscribe((constraints) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        set(true);
        timeout = setTimeout(() => {
            set(false);
        }, 10000);
    });

    return function stop() {
        unsubscribeCamera();
        unsubscribeAudio();
    };
});

/**
 * A store containing if the mouse is over the camera button
 */
export const mouseIsHoveringCameraButton = writable(false);

export const cameraNoEnergySavingStore = writable<boolean>(false);

export const streamingMegaphoneStore = writable<boolean>(false);

export const requestedCameraDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredVideoInputDevice() ? localUserStore.getPreferredVideoInputDevice() : undefined
);

export const frameRateStore: Writable<number | undefined> = writable();
export const requestedMicrophoneDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredAudioInputDevice() ? localUserStore.getPreferredAudioInputDevice() : undefined
);

export const usedCameraDeviceIdStore: Writable<string | undefined> = writable();
export const usedMicrophoneDeviceIdStore: Writable<string | undefined> = writable();

export const inOpenWebsite = writable(false);

/**
 * A store that contains video constraints.
 */
export const videoConstraintStore = derived(
    [requestedCameraDeviceIdStore, frameRateStore],
    ([$cameraDeviceIdStore, $frameRateStore]) => {
        const constraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
            resizeMode: "crop-and-scale",
            aspectRatio: 1.777777778,

            // Uncomment the lines below to simulate a mobile device
            //height: { min: 640, ideal: 1280, max: 1920 },
            //width: { min: 400, ideal: 720, max: 1080 },
            //resizeMode: "none",
        } as MediaTrackConstraints;

        if ($cameraDeviceIdStore !== undefined) {
            constraints.deviceId = {
                exact: $cameraDeviceIdStore,
            };
        }
        if ($frameRateStore !== undefined) {
            constraints.frameRate = { ideal: $frameRateStore };
        }

        return constraints;
    }
);

/**
 * A store that contains video constraints.
 */
export const audioConstraintStore = derived(requestedMicrophoneDeviceIdStore, ($microphoneDeviceIdStore) => {
    let constraints = {
        //TODO: make these values configurable in the game settings menu and store them in localstorage
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
    } as boolean | MediaTrackConstraints;

    if (typeof constraints === "boolean") {
        constraints = {};
    }
    if (
        $microphoneDeviceIdStore !== undefined &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getSupportedConstraints().deviceId === true
    ) {
        constraints.deviceId = { exact: $microphoneDeviceIdStore };
    }
    return constraints;
});

/**
 * A store that contains "true" if the webcam should be stopped for energy efficiency reason - i.e. we are not moving and not in a conversation.
 */
export const cameraEnergySavingStore = derived(
    [
        deviceChanged10SecondsAgoStore,
        userMoved5SecondsAgoStore,
        enabledWebCam10secondsAgoStore,
        mouseIsHoveringCameraButton,
        cameraNoEnergySavingStore,
        devicesNotLoaded,
        isLiveStreamingStore,
        displayedMegaphoneScreenStore,
    ],
    ([
        $deviceChanged10SecondsAgoStore,
        $userMoved5SecondsAgoStore,
        $enabledWebCam10secondsAgoStore,
        $mouseInBottomRight,
        $cameraNoEnergySavingStore,
        $devicesNotLoaded,
        $isLiveStreamingStore,
        $displayedMegaphoneScreenStore,
    ]) => {
        return (
            !$mouseInBottomRight &&
            !$userMoved5SecondsAgoStore &&
            !$deviceChanged10SecondsAgoStore &&
            !$enabledWebCam10secondsAgoStore &&
            !$cameraNoEnergySavingStore &&
            !$devicesNotLoaded &&
            !$isLiveStreamingStore &&
            !$displayedMegaphoneScreenStore
        );
    }
);

export const inJitsiStore = writable(false);
export const inBbbStore = writable(false);
export const isSpeakerStore = writable(false);
export const inLivekitStore = writable(false);
export const isListenerStore = writable(false);
export const listenerWaitingMediaStore = writable<string | undefined>(undefined);

export const requestedStatusStore: Writable<RequestedStatus | null> = writable(localUserStore.getRequestedStatus());

export const inCowebsiteZone = derived(
    [inJitsiStore, inBbbStore, inOpenWebsite],
    ([$inJitsiStore, $inBbbStore, $inOpenWebsite]) => {
        return $inJitsiStore || $inBbbStore || $inOpenWebsite;
    },
    false
);

export const silentStore = createSilentStore();

export const availabilityStatusStore = derived(
    [
        inJitsiStore,
        inBbbStore,
        silentStore,
        privacyShutdownStore,
        proximityMeetingStore,
        isSpeakerStore,
        requestedStatusStore,
        inLivekitStore,
        isListenerStore,
    ],
    ([
        $inJitsiStore,
        $inBbbStore,
        $silentStore,
        $privacyShutdownStore,
        $proximityMeetingStore,
        $isSpeakerStore,
        $requestedStatusStore,
        $inLivekitStore,
        $isListenerStore,
    ]) => {
        // Important: Statuses that should not switch to BUSY
        // must be checked BEFORE privacyShutdownStore to prevent switching to BUSY when privacy is enabled.
        if ($inJitsiStore) return AvailabilityStatus.JITSI;
        if ($inBbbStore) return AvailabilityStatus.BBB;
        if (!$proximityMeetingStore) return AvailabilityStatus.DENY_PROXIMITY_MEETING;
        if ($isSpeakerStore) return AvailabilityStatus.SPEAKER;
        if ($silentStore) return AvailabilityStatus.SILENT;
        if ($inLivekitStore) return AvailabilityStatus.LIVEKIT;
        if ($isListenerStore) return AvailabilityStatus.LISTENER;
        if ($requestedStatusStore) return $requestedStatusStore;
        if ($privacyShutdownStore) return AvailabilityStatus.AWAY;

        return AvailabilityStatus.ONLINE;
    },
    AvailabilityStatus.ONLINE
);

// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
availabilityStatusStore.subscribe((newStatus: AvailabilityStatus) => {
    try {
        statusChanger.changeStatusTo(newStatus);
    } catch (e) {
        console.error("Error while changing status", e);
        Sentry.captureException(e);
    }
});

let previousComputedVideoConstraint: boolean | MediaTrackConstraints = false;
let previousComputedAudioConstraint: boolean | MediaTrackConstraints = false;

/**
 * A store containing the media constraints we want to apply.
 */
<!-- [1c] Derived store combining multiple globals (line 391) -->
export const mediaStreamConstraintsStore = derived(
    [
        requestedCameraState,
        requestedMicrophoneState,
        myCameraStore,
        myMicrophoneStore,
        inExternalServiceStore,
        enableCameraSceneVisibilityStore,
        videoConstraintStore,
        audioConstraintStore,
        privacyShutdownStore,
        cameraEnergySavingStore,
        availabilityStatusStore,
        batchGetUserMediaStore,
    ],
    (
        [
            $requestedCameraState,
            $requestedMicrophoneState,
            $myCameraStore,
            $myMicrophoneStore,
            $inExternalServiceStore,
            $enableCameraSceneVisibilityStore,
            $videoConstraintStore,
            $audioConstraintStore,
            $privacyShutdownStore,
            $cameraEnergySavingStore,
            $availabilityStatusStore,
            $batchGetUserMediaStore,
        ],
        set
    ) => {
        // If a batch is in process, don't do anything.
        if ($batchGetUserMediaStore) {
            return;
        }

        let currentVideoConstraint: boolean | MediaTrackConstraints = $videoConstraintStore;
        let currentAudioConstraint: boolean | MediaTrackConstraints = $audioConstraintStore;

        // Disable webcam if the user requested so
        if ($requestedCameraState === false) {
            currentVideoConstraint = false;
        }

        // Disable microphone if the user requested so
        if ($requestedMicrophoneState === false) {
            currentAudioConstraint = false;
        }

        // Disable webcam when in a Jitsi
        if ($myCameraStore === false) {
            currentVideoConstraint = false;
        }

        // Disable microphone when in a Jitsi
        if ($myMicrophoneStore === false) {
            currentAudioConstraint = false;
        }

        if ($inExternalServiceStore === true) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Disable webcam for privacy reasons (the game is not visible and we were talking to no one)
        if ($privacyShutdownStore === true) {
            const userMicrophonePrivacySetting = localUserStore.getMicrophonePrivacySettings();
            const userCameraPrivacySetting = localUserStore.getCameraPrivacySettings();
            if (!userMicrophonePrivacySetting) {
                currentAudioConstraint = false;
            }
            if (!userCameraPrivacySetting) {
                currentVideoConstraint = false;
            }
        }

        // Disable webcam for energy reasons (the user is not moving and we are talking to no one)
        if ($cameraEnergySavingStore === true && $enableCameraSceneVisibilityStore === false) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        if (
            $availabilityStatusStore === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            $availabilityStatusStore === AvailabilityStatus.SILENT ||
            //$availabilityStatusStore === AvailabilityStatus.SPEAKER ||
            $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
            $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
            $availabilityStatusStore === AvailabilityStatus.BUSY
        ) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Let's make the changes only if the new value is different from the old one.
        if (
            !deepEqual(previousComputedVideoConstraint, currentVideoConstraint) ||
            !deepEqual(previousComputedAudioConstraint, currentAudioConstraint)
        ) {
            previousComputedVideoConstraint = currentVideoConstraint;
            previousComputedAudioConstraint = currentAudioConstraint;
            // Let's copy the objects.
            if (typeof previousComputedVideoConstraint !== "boolean") {
                previousComputedVideoConstraint = { ...previousComputedVideoConstraint };
            }
            if (typeof previousComputedAudioConstraint !== "boolean") {
                previousComputedAudioConstraint = { ...previousComputedAudioConstraint };
            }

            set({
                video: currentVideoConstraint,
                audio: currentAudioConstraint,
            });
        }
    },
    {
        video: false,
        audio: false,
    } as {
        video: false | MediaTrackConstraints;
        audio: false | MediaTrackConstraints;
    }
);

export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

interface StreamSuccessValue {
    type: "success";
    stream: MediaStream | undefined;
}

interface StreamErrorValue {
    type: "error";
    error: Error;
}

let currentStream: MediaStream | undefined = undefined;
let oldConstraints: { video: MediaTrackConstraints | false; audio: MediaTrackConstraints | false } = {
    video: false,
    audio: false,
};
// Use the factory to create the appropriate transformer
let backgroundTransformer: BackgroundTransformer | undefined = undefined;
// Track the last background config to detect if we need to recreate or just update
let lastBackgroundConfig: BackgroundConfig | undefined = undefined;

/**
 * Update background processor configuration without recreating the transformer
 */
export function updateBackgroundProcessor(config: {
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
    mode?: string;
    segmenterOptions?: unknown;
}) {
    if (backgroundTransformer && backgroundTransformer.updateConfig) {
        try {
            backgroundTransformer
                .updateConfig({
                    mode: config.mode as "none" | "blur" | "image" | "video",
                    blurAmount: config.blurAmount,
                    backgroundImage: config.backgroundImage,
                    backgroundVideo: config.backgroundVideo,
                })
                .catch((error) => {
                    console.warn("[MediaStore] Failed to update background transformer configuration:", error);
                });

            // Update the tracked config
            if (lastBackgroundConfig && config.mode) {
                lastBackgroundConfig.mode = config.mode as "none" | "blur" | "image" | "video";
            }
            if (lastBackgroundConfig && config.blurAmount !== undefined) {
                lastBackgroundConfig.blurAmount = config.blurAmount;
            }
            if (lastBackgroundConfig && config.backgroundImage !== undefined) {
                lastBackgroundConfig.backgroundImage = config.backgroundImage;
            }
            if (lastBackgroundConfig && config.backgroundVideo !== undefined) {
                lastBackgroundConfig.backgroundVideo = config.backgroundVideo;
            }
        } catch (error) {
            console.warn("[MediaStore] Failed to update background transformer configuration:", error);
        }
    }
}

// This promise is important to queue the calls to "getUserMedia"
// Otherwise, this can happen:
// User requests a start then a stop of the camera quickly
// The promise to start the cam starts. Before the promise is fulfilled, the camera is stopped.
// Then, the MediaStream of the camera start resolves (resulting in the LED being turned on instead of off)
let currentGetUserMediaPromise: Promise<MediaStream | undefined> = Promise.resolve(undefined);

/**
 * A store containing the MediaStream object (or undefined if nothing requested, or Error if an error occurred)
 * This stream includes background transformations when enabled
 *
 * NOTE: We depend on forceTransformerRecreationStore to detect when mode changes require recreation.
 * Parameter changes (blurAmount, etc.) are handled by a separate subscriber to avoid recreating
 * the transformer on every change (which causes WebGL context leaks).
 */

export const rawLocalStreamStore = derived<[typeof mediaStreamConstraintsStore], LocalStreamStoreValue>(
    [mediaStreamConstraintsStore],
    ([$mediaStreamConstraintsStore], set) => {
        const constraints = { ...$mediaStreamConstraintsStore };

        function initStream(constraints: MediaStreamConstraints): Promise<MediaStream | undefined> {
            currentGetUserMediaPromise = currentGetUserMediaPromise
                .then(async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia(constraints);
                        // If there is an old video track or audio track in the current stream, we need to reuse it in the new stream
                        if (currentStream) {
                            const oldStream = currentStream;
                            // Reuse old video track
                            if (oldStream.getVideoTracks().length > 0) {
                                if (stream.getVideoTracks().length > 0) {
                                    console.error(
                                        "[MediaStore] New stream already has a video track, cannot reuse old one"
                                    );
                                    oldStream.getVideoTracks().forEach((t) => {
                                        t.stop();
                                    });
                                } else {
                                    const oldVideoTracks = currentStream.getVideoTracks();
                                    oldVideoTracks.forEach((t) => {
                                        if (t.readyState !== "ended") {
                                            stream.addTrack(t);
                                        }
                                        currentStream?.removeTrack(t);
                                    });
                                }
                            }

                            // Reuse old audio track
                            if (oldStream.getAudioTracks().length > 0) {
                                if (stream.getAudioTracks().length > 0) {
                                    console.error(
                                        "[MediaStore] New stream already has an audio track, cannot reuse old one"
                                    );
                                    oldStream.getAudioTracks().forEach((t) => {
                                        t.stop();
                                    });
                                } else {
                                    const oldAudioTracks = currentStream.getAudioTracks();
                                    oldAudioTracks.forEach((t) => {
                                        if (t.readyState !== "ended") {
                                            stream.addTrack(t);
                                        }
                                        currentStream?.removeTrack(t);
                                    });
                                }
                            }
                        }

                        currentStream = stream;
                        set({
                            type: "success",
                            stream: currentStream,
                        });
                        if (currentStream.getVideoTracks().length > 0) {
                            usedCameraDeviceIdStore.set(currentStream.getVideoTracks()[0]?.getSettings().deviceId);
                            obtainedMediaConstraintStore.update((c) => {
                                c.video = true;
                                return c;
                            });
                        }
                        if (currentStream.getAudioTracks().length > 0) {
                            usedMicrophoneDeviceIdStore.set(currentStream.getAudioTracks()[0]?.getSettings().deviceId);
                            obtainedMediaConstraintStore.update((c) => {
                                c.audio = true;
                                return c;
                            });
                        }
                        hideHelpCameraSettings();
                        return stream;
                    } catch (e) {
                        if (isOverConstrainedError(e) && e.constraint === "deviceId") {
                            console.info(
                                "Could not access the requested microphone or webcam. Falling back to default microphone and webcam",
                                constraints,
                                e
                            );
                            batchGetUserMediaStore.startBatch();
                            requestedCameraDeviceIdStore.set(undefined);
                            requestedMicrophoneDeviceIdStore.set(undefined);
                            batchGetUserMediaStore.commitChanges();
                        } else if (constraints.video !== false /* || constraints.audio !== false*/) {
                            console.info(
                                "Error. Unable to get microphone and/or camera access. Trying audio only.",
                                constraints,
                                e
                            );
                            // TODO: does it make sense to pop this error when retrying?
                            set({
                                type: "error",
                                error: e instanceof Error ? e : new Error("An unknown error happened"),
                            });
                            // Let's try without video constraints
                            //if (constraints.video !== false) {
                            requestedCameraState.disableWebcam();
                        } else if (!constraints.video && !constraints.audio) {
                            console.error("Error. getUserMedia called with no audio and no video.");
                            set({
                                type: "error",
                                error: new MediaStreamConstraintsError(),
                            });
                        } else {
                            console.info("Error. Unable to get microphone and/or camera access.", constraints, e);
                            set({
                                type: "error",
                                error: e instanceof Error ? e : new Error("An unknown error happened"),
                            });
                        }
                        return undefined;
                    }
                })
                .catch((e) => {
                    console.error("Error in getUserMedia promise chain", e);
                    set({
                        type: "error",
                        error: e instanceof Error ? e : new Error("An unknown error happened"),
                    });
                    return undefined;
                });
            return currentGetUserMediaPromise;
        }

        if (navigator.mediaDevices === undefined) {
            if (window.location.protocol === "http:") {
                set({
                    type: "error",
                    error: new Error("Unable to access your camera or microphone. You need to use a HTTPS connection."),
                });
                return;
            } else if (isIOS()) {
                set({
                    type: "error",
                    error: new WebviewOnOldIOS(),
                });
                return;
            } else {
                set({
                    type: "error",
                    error: new BrowserTooOldError(),
                });
                return;
            }
        }

        if (currentStream === undefined) {
            // we need to assign a first value to the stream because getUserMedia is async
            set({
                type: "success",
                stream: undefined,
            });
        }

        // Let's see what has changed compared to old constraints
        const mustRequestNewVideo =
            (constraints.video && !deepEqual(oldConstraints.video, constraints.video)) ||
            (!currentStream && constraints.video);
        const mustRequestNewAudio =
            (constraints.audio && !deepEqual(oldConstraints.audio, constraints.audio)) ||
            (!currentStream && constraints.audio);

        if (currentStream) {
            const oldStream = currentStream;
            const mustStopVideo = oldConstraints.video !== false && constraints.video === false;
            const mustStopAudio = oldConstraints.audio !== false && constraints.audio === false;

            if (mustStopVideo) {
                oldStream.getVideoTracks().forEach((t) => {
                    t.stop();
                    oldStream.removeTrack(t);
                });
                obtainedMediaConstraintStore.update((c) => {
                    c.video = false;
                    return c;
                });
            }
            if (mustStopAudio) {
                oldStream.getAudioTracks().forEach((t) => {
                    t.stop();
                    oldStream.removeTrack(t);
                });
                obtainedMediaConstraintStore.update((c) => {
                    c.audio = false;
                    return c;
                });
            }
            if (mustStopVideo || mustStopAudio) {
                set({
                    type: "success",
                    stream: oldStream,
                });
            }
        }

        if (mustRequestNewVideo || mustRequestNewAudio) {
            const newConstraints: MediaStreamConstraints = {};
            if (mustRequestNewVideo) {
                newConstraints.video = constraints.video;
            } else {
                newConstraints.video = false;
            }
            if (mustRequestNewAudio) {
                newConstraints.audio = constraints.audio;
            } else {
                newConstraints.audio = false;
            }
            initStream(newConstraints).catch((e) => {
                set({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            });
        }

        oldConstraints = {
            video: constraints.video ?? false,
            audio: constraints.audio ?? false,
        };
    }
);

export const localStreamStore = derived<
    [typeof rawLocalStreamStore, typeof backgroundProcessingEnabledStore],
    LocalStreamStoreValue
>(
    [rawLocalStreamStore, backgroundProcessingEnabledStore],
    ([$rawLocalStreamStore, $backgroundProcessingEnabled], set) => {
        if (
            $rawLocalStreamStore.type === "error" ||
            $rawLocalStreamStore.stream === undefined ||
            $rawLocalStreamStore.stream.getVideoTracks().length === 0 ||
            !$backgroundProcessingEnabled
        ) {
            if (backgroundTransformer) {
                backgroundTransformer.stop();
            }

            set($rawLocalStreamStore);
            return;
        }

        let finalStream;

        if (!backgroundTransformer) {
            // Get current config from the store
            const currentConfig = get(backgroundConfigStore);

            backgroundTransformer = createBackgroundTransformer(currentConfig);
        }

        (async () => {
            // Only create if we don't have a transformer yet
            if ($rawLocalStreamStore.stream && backgroundTransformer) {
                // Transform the stream using the new approach if available
                finalStream = await backgroundTransformer.transform($rawLocalStreamStore.stream);
                // Store config for next comparison
                lastBackgroundConfig = { ...get(backgroundConfigStore) };

                set({
                    type: "success",
                    stream: finalStream,
                });
            }
        })().catch((error) => {
            console.warn("[MediaStore] Failed to transform stream:", error);
            Sentry.captureException(error);
            warningMessageStore.addWarningMessage(get(LL).warning.backgroundProcessing.failedToApply());
            backgroundConfigStore.reset();
        });
    }
);

/**
 * Firefox does not support the OverconstrainedError class.
 * Instead, it throw an error whose name is "OverconstrainedError"
 */
interface OverconstrainedErrorInterface {
    constraint: string;
}
function isOverConstrainedError(e: unknown): e is OverconstrainedErrorInterface {
    return e instanceof Error && e.name === "OverconstrainedError";
}

/**
 * A store containing the actual states of audio and video (activated or deactivated)
 */
export const obtainedMediaConstraintStore = writable<ObtainedMediaStreamConstraints>({
    audio: false,
    video: false,
});

export const localVolumeStore = derived<typeof localStreamStore, number[] | undefined>(
    localStreamStore,
    ($localStreamStoreValue, set) => {
        if ($localStreamStoreValue.type === "error") {
            set(undefined);
            return;
        }
        const mediaStream = $localStreamStoreValue.stream;

        if (mediaStream === undefined || mediaStream.getAudioTracks().length <= 0) {
            set(undefined);
            return;
        }

        const soundMeter = new SoundMeter(mediaStream);
        let error = false;

        const timeout = setInterval(() => {
            try {
                set(soundMeter.getVolume());
            } catch (err) {
                if (!error) {
                    console.error(err);
                    error = true;
                }
            }
        }, 100);

        return () => {
            clearInterval(timeout);
            soundMeter.stop();
        };
    },
    undefined
);

const talkIconVolumeThreshold = 10;

export const localVoiceIndicatorStore = derived<Readable<number[] | undefined>, boolean>(
    localVolumeStore,
    ($localVolumeStore) => {
        if ($localVolumeStore === undefined) {
            return false;
        }
        const volume = $localVolumeStore;
        if (volume === undefined) {
            return false;
        }
        const averageVolume = volume.reduce((a, b) => a + b, 0);
        return averageVolume > talkIconVolumeThreshold;
    },
    false
);

/**
 * Device list
 */
export const deviceListStore = readable<MediaDeviceInfo[] | undefined>(undefined, function start(set) {
    let deviceListCanBeQueried = false;

    const queryDeviceList = () => {
        // Note: so far, we are ignoring any failures.
        navigator.mediaDevices
            .enumerateDevices()
            .then((mediaDeviceInfos) => {
                // check if the new list has the preferred device
                const preferredVideoInputDevice = localUserStore.getPreferredVideoInputDevice();
                const preferredAudioInputDevice = localUserStore.getPreferredAudioInputDevice();
                const preferredSpeakerDevice = localUserStore.getSpeakerDeviceId();

                if (
                    preferredVideoInputDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredVideoInputDevice)
                ) {
                    requestedCameraDeviceIdStore.set(preferredVideoInputDevice);
                }
                if (
                    preferredAudioInputDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredAudioInputDevice)
                ) {
                    requestedMicrophoneDeviceIdStore.set(preferredAudioInputDevice);
                }
                if (
                    preferredSpeakerDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredSpeakerDevice)
                ) {
                    speakerSelectedStore.set(preferredSpeakerDevice);
                }

                const actualsMediaDevices = get(deviceListStore);
                // get all media that not exist in the list
                if (actualsMediaDevices != undefined) {
                    // set the last new media devices detected
                    const newDevices = mediaDeviceInfos.filter(
                        (device) => actualsMediaDevices.find((d) => d.deviceId === device.deviceId) == undefined
                    );
                    lastNewMediaDeviceDetectedStore.set(newDevices);
                }

                set(mediaDeviceInfos);
                devicesNotLoaded.set(false);
            })
            .catch((e) => {
                console.error(e);
                devicesNotLoaded.set(false);
                throw e;
            });
    };

    const unsubscribe = localStreamStore.subscribe((streamResult) => {
        if (streamResult.type === "success" && streamResult.stream !== undefined) {
            if (deviceListCanBeQueried === false) {
                queryDeviceList();
                deviceListCanBeQueried = true;
            }
        }
    });

    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener("devicechange", queryDeviceList);
    }

    return function stop() {
        unsubscribe();
        if (navigator.mediaDevices) {
            navigator.mediaDevices.removeEventListener("devicechange", queryDeviceList);
        }
    };
});

export const cameraListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "videoinput"));
});

export const microphoneListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "audioinput"));
});

export const speakerListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    // Livekit does not support audio output device selection on Safari
    // Code: https://github.com/livekit/client-sdk-js/blob/dbaf7a9b784114728857a447734bc5d5453345b4/src/room/utils.ts#L144C1-L153C2
    // And it seems there is no plan to support it. Issue: https://github.com/livekit/components-js/issues/1216
    // Because the audio output selector should work in full-mesh WebRTC AND in Livekit, we have to support the same
    // features in both modes. So we disable audio output device selection on Safari here.
    if (isSafari() || isIOS()) {
        return;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "audiooutput"));
});

export const selectDefaultSpeaker = () => {
    const devices = get(speakerListStore);
    if (devices !== undefined && devices.length > 0) {
        speakerSelectedStore.set(devices[0].deviceId);
    } else {
        speakerSelectedStore.set("");
    }
};

// This is a singleton so no need to unsubscribe
//eslint-disable-next-line svelte/no-ignored-unsubscribe
speakerListStore.subscribe((devices) => {
    if (devices === undefined) {
        return;
    }
    // if the previous speaker used isn`t defined in the list, apply default speaker
    const previousSpeakerId = get(speakerSelectedStore);
    const previousAudioOutputDevice = devices.find((device) => device.deviceId === previousSpeakerId);
    if (previousAudioOutputDevice === undefined) {
        selectDefaultSpeaker();
    }
});

export const speakerSelectedStore = writable<string | undefined>(localUserStore.getSpeakerDeviceId() ?? undefined);

function removeDuplicateDevices(devices: MediaDeviceInfo[]) {
    const uniqueDevices = new Map<string, MediaDeviceInfo>();
    devices.forEach((device) => {
        uniqueDevices.set(device.deviceId, device);
    });
    return Array.from(uniqueDevices.values());
}

function isConstrainDOMStringParameters(param: ConstrainDOMString): param is ConstrainDOMStringParameters {
    return (
        typeof param === "object" &&
        ((param as ConstrainDOMStringParameters).ideal !== undefined ||
            (param as ConstrainDOMStringParameters).exact !== undefined)
    );
}

// TODO: detect the new webcam and automatically switch on it.
// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
cameraListStore.subscribe((devices) => {
    // Store not initialized yet
    if (devices === undefined) {
        return;
    }
    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(videoConstraintStore);
    const deviceId = constraints.deviceId;
    if (!deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    if (isConstrainDOMStringParameters(deviceId)) {
        if (!devices.find((device) => device.deviceId === deviceId.exact)) {
            requestedCameraDeviceIdStore.set(undefined);
        }
    }
});

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
microphoneListStore.subscribe((devices) => {
    // Store not initialized yet
    if (devices === undefined) {
        return;
    }

    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(audioConstraintStore);
    if (typeof constraints === "boolean") {
        return;
    }
    const deviceId = constraints.deviceId;
    if (!deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    if (isConstrainDOMStringParameters(deviceId)) {
        if (!devices.find((device) => device.deviceId === deviceId.exact)) {
            requestedMicrophoneDeviceIdStore.set(undefined);
        }
    }
});

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
localStreamStore.subscribe((streamResult) => {
    if (streamResult.type === "error") {
        if (streamResult.error.name === BrowserTooOldError.NAME || streamResult.error.name === WebviewOnOldIOS.NAME) {
            errorStore.addErrorMessage(streamResult.error);
        }
    }
});

// When the stream is initialized, the new sound constraint is recreated and the first speaker is set.
// If the user did not select the new speaker, the first new speaker cannot be selected automatically.
// It is ok to not unsubscribe to this store because it is a singleton.
// // eslint-disable-next-line svelte/no-ignored-unsubscribe
/*speakerSelectedStore.subscribe((speaker) => {
    const oldValue = localUserStore.getSpeakerDeviceId();
    const currentValue = speaker;
    const speakerList = get(speakerListStore);
    const oldDevice =
        oldValue && speakerList
            ? speakerList.find((mediaDeviceInfo) => mediaDeviceInfo.deviceId == oldValue)
            : undefined;
    if (
        oldDevice !== undefined &&
        speakerList !== undefined &&
        currentValue !== oldDevice.deviceId &&
        speakerList.find((value) => value.deviceId == oldValue)
    ) {
        console.warn("speakerSelectedStore.subscribe", oldValue, currentValue, oldDevice.deviceId);
        speakerSelectedStore.set(oldDevice.deviceId);
    }
});*/

function createVideoBandwidthStore() {
    const { subscribe, set } = writable<number | "unlimited">(localUserStore.getVideoBandwidth());

    return {
        subscribe,
        setBandwidth: (bandwidth: number | "unlimited") => {
            set(bandwidth);
            localUserStore.setVideoBandwidth(bandwidth);
        },
    };
}

export const videoBandwidthStore = createVideoBandwidthStore();

export const lastNewMediaDeviceDetectedStore = writable<MediaDeviceInfo[]>([]);

/**
 * Subscribe to background config changes to update the transformer
 * This avoids recreating the entire stream when only parameters change
 */
const backgroundConfigStoreSubscription = backgroundConfigStore.subscribe(($config) => {
    // Skip if no transformer exists yet
    if (!backgroundTransformer || !lastBackgroundConfig) {
        return;
    }

    updateBackgroundProcessor({
        mode: $config.mode,
        blurAmount: $config.blurAmount,
        backgroundImage: $config.backgroundImage,
        backgroundVideo: $config.backgroundVideo,
    });
});
export const unsubscribeBackgroundConfigStoreSubscription = () => {
    backgroundConfigStoreSubscription();
};

</file>
<file path="Menu.svelte">
<script lang="ts">
    import { get } from "svelte/store";
    import { fly } from "svelte/transition";
    import type { ComponentType } from "svelte";
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import chevronImg from "../images/chevron.svg";
    import type { MenuItem } from "../../Stores/MenuStore";
    import {
        activeSubMenuStore,
        customMenuIframe,
        menuVisiblilityStore,
        SubMenusInterface,
        subMenusStore,
    } from "../../Stores/MenuStore";
    import { menuInputFocusStore } from "../../Stores/MenuInputFocusStore";
    import { sendMenuClickedEvent } from "../../Api/Iframe/Ui/MenuItem";
    import { LL } from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import SettingsSubMenu from "./SettingsSubMenu.svelte";
    import ProfileSubMenu from "./ProfileSubMenu.svelte";
    import AboutRoomSubMenu from "./AboutRoomSubMenu.svelte";
    import ContactSubMenu from "./ContactSubMenu.svelte";
    import CustomSubMenu from "./CustomSubMenu.svelte";
    import GuestSubMenu from "./GuestSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import ChatSubMenu from "./ChatSubMenu.svelte";
    import ShortcutSubMenu from "./ShortcutSubMenu.svelte";

    let activeSubMenu: MenuItem = $subMenusStore[$activeSubMenuStore];
    let activeComponent: ComponentType = ProfileSubMenu;
    let props: { url: string; allowApi: boolean; allow: string | undefined };
    let unsubscriberSubMenuStore: Unsubscriber;
    let unsubscriberActiveSubMenuStore: Unsubscriber;

    onMount(async () => {
<!-- [2e] Manual subscription with cleanup (line 38) -->
        unsubscriberActiveSubMenuStore = activeSubMenuStore.subscribe((value) => {
            if ($subMenusStore.length >= value - 1) {
                void switchMenu($subMenusStore[value]);
            }
        });
        unsubscriberSubMenuStore = subMenusStore.subscribe(() => {
            if (!$subMenusStore.includes(activeSubMenu)) {
                void switchMenu($subMenusStore[$activeSubMenuStore]);
            }
        });

        await switchMenu($subMenusStore[$activeSubMenuStore]);
    });

    onDestroy(() => {
        menuInputFocusStore.set(false);
<!-- [2f] Cleanup in onDestroy (line 54) -->
        if (unsubscriberSubMenuStore) {
            unsubscriberSubMenuStore();
        }
        if (unsubscriberActiveSubMenuStore) {
            unsubscriberActiveSubMenuStore();
        }
    });

    async function switchMenu(menu: MenuItem) {
        if (menu.type === "translated") {
            activeSubMenu = menu;
            activeSubMenuStore.activateByMenuItem(menu);
            switch (menu.key) {
                case SubMenusInterface.profile:
                    activeComponent = ProfileSubMenu;
                    analyticsClient.menuProfile();
                    break;
                case SubMenusInterface.settings:
                    activeComponent = SettingsSubMenu;
                    analyticsClient.menuSetting();
                    break;
                case SubMenusInterface.invite:
                    activeComponent = GuestSubMenu;
                    analyticsClient.menuInvite();
                    break;
                case SubMenusInterface.aboutRoom:
                    activeComponent = AboutRoomSubMenu;
                    analyticsClient.menuCredit();
                    break;
                case SubMenusInterface.contact:
                    activeComponent = ContactSubMenu;
                    analyticsClient.menuContact();
                    break;
                case SubMenusInterface.globalMessages:
                    activeComponent = (await import("./GlobalMessagesSubMenu.svelte")).default;
                    analyticsClient.globalMessage();
                    break;
                case SubMenusInterface.report:
                    activeComponent = ReportSubMenu;
                    analyticsClient.reportIssue();
                    break;
                case SubMenusInterface.chat:
                    activeComponent = ChatSubMenu;
                    analyticsClient.menuChat();
                    break;
                case SubMenusInterface.shortcuts:
                    activeComponent = ShortcutSubMenu;
                    analyticsClient.menuShortcuts();
                    break;
            }
        } else {
            // Save custom menu click for analytics
            analyticsClient.menuCustom(menu.key);

            const customMenu = customMenuIframe.get(menu.key);
            if (customMenu !== undefined) {
                activeSubMenu = menu;
                props = { url: customMenu.url, allowApi: customMenu.allowApi, allow: customMenu.allow };
                activeComponent = CustomSubMenu;
            } else {
                sendMenuClickedEvent(menu.key);
                menuVisiblilityStore.set(false);
            }
        }
    }

    function closeMenu() {
        activeSubMenuStore.activateByIndex(0);
        menuVisiblilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeMenu();
        }
    }

    $: subMenuTranslations = $subMenusStore.map((subMenu) =>
        subMenu.type === "scripting" ? subMenu.label : $LL.menu.sub[subMenu.key]()
    );
</script>

<svelte:window on:keydown={onKeyDown} />

<!-- TODO HUGO : REMOVE !important -->
<div
    class="h-3/4 top-0 flex-col gap-3 @md/main-layout:flex-row [@media(min-height:953px)]/main-layout:h-3/4 w-11/12 @2xl:max-w-screen-2xl close-window pointer-events-auto absolute flex right-0 left-0 bottom-0 z-[900] m-auto overflow-hidden font-main"
    transition:fly={{ y: 1000, duration: 150 }}
    on:blur={closeMenu}
>
    <div class="flex flex-row items-center gap-2">
        <div
            class="menu-nav-sidebar rounded-lg @md/main-layout:w-[200px] @md/main-layout:rounded-xl overflow-hidden bg-contrast/80 backdrop-blur w-md relative h-full"
        >
            <!--<h2 class="p-8 text-white/10 h-5 tracking-[1rem] mb-8">{$LL.menu.title()}</h2>-->
            <nav
                class="mt-0 mr-16 @md/main-layout:mr-0 flex flex-row @md/main-layout:flex-col w-full @md/main-layout:w-full items-stretch @md/main-layout:items-start overflow-auto h-full @md/main-layout:overflow-auto p-2.5 @md/main-layout:p-3 gap-1"
            >
                {#each $subMenusStore as submenu, i (`${submenu.key}_${submenu.type}`)}
                    {@const visibleStore = submenu.visible}
                    {#if get(visibleStore)}
                        <div class="flex flex-row items-center justify-center gap-1 w-full group/menu-item relative">
                            <div
                                class=" w-full @md/main-layout:h-full h-1 @md/main-layout:w-1 @md/main-layout:top-0 px-1 @md/main-layout:px-0 @md/main-layout:py-1 flex items-center justify-center absolute -bottom-2 @md/main-layout:-left-2"
                            >
                                <div
                                    class="h-1 @md/main-layout:w-1 bg-secondary rounded-full group-hover/menu-item:h-full transition-all duration-300 z-10 {activeSubMenu ===
                                    submenu
                                        ? 'w-full @md/main-layout:h-full'
                                        : 'w-0 @md/main-layout:h-0'} "
                                />
                            </div>

                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="menu-item-container group flex items-center @md/main-layout:justify-start justify-center h-full py-3.5 px-2 relative transition-all w-auto @md/main-layout:w-full @md/main-layout:hover:pl-4 hover:opacity-100 cursor-pointer rounded-md @md/main-layout:rounded-lg overflow-hidden {activeSubMenu ===
                                submenu
                                    ? 'active opacity-100 bg-contrast/50 text-white'
                                    : 'opacity-60 hover:bg-white/10'}"
                                on:click|preventDefault|stopPropagation={() => switchMenu(submenu)}
                                transition:fly={{ delay: i * 75, x: 200, duration: 150 }}
                            >
                                <button
                                    type="button"
                                    class="menu-item m-0 relative z-10 bold block @md/main-layout:flex text-nowrap text-white"
                                >
                                    {subMenuTranslations[i]}
                                </button>
                                <img
                                    src={chevronImg}
                                    class="hidden @md/main-layout:block absolute transition-all right-4 group-hover:right-6 top-0 bottom-0 m-auto w-4 z-10 {activeSubMenu ===
                                    submenu
                                        ? 'opacity-100 group-hover:right-4'
                                        : 'opacity-30'}"
                                    alt="open submenu"
                                    draggable="false"
                                />
                            </div>
                        </div>
                    {/if}
                {/each}
            </nav>
        </div>
        <div
            class="p-2 rounded-lg bg-contrast/80 backdrop-blur-md flex items-center justify-center w-fit @md/main-layout:hidden"
        >
            <ButtonClose on:click={closeMenu} dataTestId="closeMenuBtn" />
        </div>
    </div>
    <div
        class="menu-submenu-container w-full rounded-xl overflow-y relative h-full bg-contrast/80 backdrop-blur overflow-hidden"
    >
        <div
            class="h-full mt-0 text-white rounded-none @md/main-layout:rounded-tl-lg overflow-y-scroll @md/main-layout:overflow-none"
            id="submenu"
        >
            <svelte:component this={activeComponent} {...props} />
        </div>
    </div>
    <div class="right-menu-side-bar w-fit h-full @md/main-layout:flex flex-col items-start justify-start hidden">
        <div class="p-2 rounded-lg bg-contrast/80 backdrop-blur-md flex items-center justify-center w-fit">
            <ButtonClose on:click={closeMenu} id="closeMenu" dataTestId="closeMenuBtn" />
        </div>
    </div>
</div>

<style lang="scss">
    .menu-nav-sidebar nav::-webkit-scrollbar {
        display: none;
    }
</style>

</file>
<file path="PeerStore.ts">
import { derived, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { localUserStore } from "../Connection/LocalUserStore";
import type { VideoBox } from "../Space/Space";

<!-- [4e] Custom ForwardableStore for peer state (line 6) -->
export const videoStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());
export const screenShareStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());

<!-- [4f] Derived store transforms peer data (line 9) -->
export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    return Array.from($videoStreamStore.values());
});

export const screenShareStreamElementsStore = derived(screenShareStreamStore, ($screenShareStreamStore) => {
    return Array.from($screenShareStreamStore.values());
});

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
export const askPictureInPictureActivatingStore = writable(false);
export const pictureInPictureSupportedStore = writable(true);

</file>
<file path="SimplePeer.ts">
import * as Sentry from "@sentry/svelte";
import type { Readable } from "svelte/store";
import { get, readable } from "svelte/store";
import type { Subscription } from "rxjs";
import type { SignalData } from "simple-peer";
import { asError } from "catch-unknown";
import { raceTimeout } from "../Utils/PromiseUtils";
import type { WebRtcSignalReceivedMessageInterface } from "../Connection/ConnexionModels";
<!-- [4a] SimplePeer imports global media stores (line 9) -->
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { playersStore } from "../Stores/PlayersStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { notificationManager } from "../Notification/NotificationManager";
import type { SimplePeerConnectionInterface, StreamableSubjects } from "../Space/SpacePeerManager/SpacePeerManager";
import type { SpaceInterface, SpaceUserExtended } from "../Space/SpaceInterface";
import { localStreamStore } from "../Stores/MediaStore";
import { apparentMediaContraintStore } from "../Stores/ApparentMediaContraintStore";
import { RemotePeer } from "./RemotePeer";
import { customWebRTCLogger } from "./CustomWebRTCLogger";
import { iceServersManager } from "./IceServersManager";

export interface UserSimplePeerInterface {
    userId: string;
    initiator?: boolean;
}

/**
 * This class manages connections to all the peers in the same group as me.
 *
 */
export class SimplePeer implements SimplePeerConnectionInterface {
    private readonly _unsubscribers: (() => void)[] = [];
    private readonly _rxJsUnsubscribers: Subscription[] = [];

    // A map of all screen sharing peers, indexed by spaceUserId
    private screenSharePeers: Map<
        string,
        {
            promise: Promise<RemotePeer>;
            // Note: the abort controller is used for both the regular shutdown of the screenSharePeer and for cleaning errors
            abortController: AbortController;
        }
    > = new Map();
    // A map of all video peers, indexed by spaceUserId
    private videoPeers: Map<
        string,
        {
            promise: Promise<RemotePeer>;
            // Note: the abort controller is used for the regular shutdown of the videoPeer and for cleaning errors
            abortController: AbortController;
        }
    > = new Map();
    private abortController = new AbortController();

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>,
<!-- [4b] Constructor receives store as dependency (line 58) -->
        private _screenSharingLocalStreamStore = screenSharingLocalStreamStore,
        private _playersStore = playersStore,
        private _analyticsClient = analyticsClient,
        private _notificationManager = notificationManager,
        private _customWebRTCLogger = customWebRTCLogger,
        private _localStreamStore = localStreamStore
    ) {
        let isStreaming: boolean = false;

        this._unsubscribers.push(
<!-- [4c] WebRTC subscribes to media store (line 68) -->
            this._screenSharingLocalStreamStore.subscribe((streamResult) => {
                if (streamResult && streamResult.type === "error") {
                    // Let's ignore screen sharing errors, we will deal with those in a different way.
                    return;
                }

                if (streamResult.stream !== undefined) {
                    isStreaming = true;
<!-- [4d] Store change triggers WebRTC action (line 76) -->
                    this.sendLocalScreenSharingStream(streamResult.stream);
                } else {
                    if (isStreaming) {
                        this.stopLocalScreenSharingStream();
                        isStreaming = false;
                    }
                }
            })
        );

        this.initialise();
    }

    /**
     * permit to listen when user could start visio
     */
    private initialise() {
        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcSignal").subscribe((message) => {
                const webRtcSignalToClientMessage = message.webRtcSignal;

                this.receiveWebrtcSignal(JSON.parse(webRtcSignalToClientMessage.signal) as SignalData, message.sender);
            })
        );

        //receive signal by gemer
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcScreenSharingSignal").subscribe((message) => {
                const webRtcScreenSharingSignalToClientMessage = message.webRtcScreenSharingSignal;

                const webRtcSignalReceivedMessage: WebRtcSignalReceivedMessageInterface = {
                    userId: message.sender.spaceUserId,
                    signal: JSON.parse(webRtcScreenSharingSignalToClientMessage.signal),
                };

                this.receiveWebrtcScreenSharingSignal(webRtcSignalReceivedMessage, message.sender).catch((e) => {
                    console.error(`receiveWebrtcScreenSharingSignal => ${webRtcSignalReceivedMessage.userId}`, e);
                    Sentry.captureException(e);
                });
            })
        );

        /*
        batchGetUserMediaStore.startBatch();
        mediaManager.enableMyCamera();
        mediaManager.enableMyMicrophone();
        batchGetUserMediaStore.commitChanges();
        */

        //receive message start
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcStartMessage").subscribe((message) => {
                const webRtcStartMessage = message.webRtcStartMessage;

                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                    initiator: webRtcStartMessage.initiator,
                };

                this.receiveWebrtcStart(user, message.sender);
            })
        );

        //receive message start
        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent("webRtcDisconnectMessage").subscribe((message) => {
                const user: UserSimplePeerInterface = {
                    userId: message.sender.spaceUserId,
                };

                this.receiveWebrtcDisconnect(user);
            })
        );
    }

    private receiveWebrtcStart(user: UserSimplePeerInterface, spaceUserFromBack: SpaceUserExtended): void {
        // Note: the clients array contain the list of all clients (even the ones we are already connected to in case a user joins a group)
        // So we can receive a request we already had before. (which will abort at the first line of createPeerConnection)
        // This would be symmetrical to the way we handle disconnection.

        this.createPeerConnection(user, spaceUserFromBack, spaceUserFromBack.uuid).catch((e) => {
            console.error(`receiveWebrtcStart => ${user.userId}`, e);
            Sentry.captureException(e);
        });
    }

    private receiveWebrtcDisconnect(user: UserSimplePeerInterface): void {
        this.closeConnection(user.userId);
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerConnection(
        user: UserSimplePeerInterface,
        spaceUser: SpaceUserExtended,
        uuid: string
    ): Promise<RemotePeer | null> {
        const peerConnection = this.videoPeers.get(user.userId);
        if (peerConnection) {
            const peerConnectionValue = await peerConnection.promise;
            if (peerConnectionValue.destroyed) {
                this._streamableSubjects.videoPeerRemoved.next(peerConnectionValue);
                peerConnectionValue.destroy();

                //this.space.livekitVideoStreamStore.delete(user.userId);
            } else if (peerConnection.abortController.signal.aborted) {
                // The previous connection was aborted, we can safely create a new one.
            } else {
                return peerConnectionValue;
            }
        }

        const abortController = new AbortController();

        const peerPromise = new Promise<RemotePeer>((resolve, reject) => {
            (async () => {
                const iceServers = await iceServersManager.getIceServersConfig();
                if (this.abortController.signal.aborted) {
                    reject(asError(this.abortController.signal.reason));
                    return;
                }
                if (abortController.signal.aborted) {
                    reject(asError(abortController.signal.reason));
                    return;
                }

                const peer = new RemotePeer(
                    user,
                    user.initiator ? user.initiator : false,
                    this._space,
                    iceServers,
                    false,
                    this._localStreamStore,
                    "video",
                    spaceUser.spaceUserId,
                    this._blockedUsersStore,
                    () => {
                        abortController.abort();
                    },
                    apparentMediaContraintStore
                );

                // When a connection is established to a video stream, and if a screen sharing is taking place,
                // the user sharing screen should also initiate a connection to the remote user!

                // Event listener is valid for the lifetime of the object and will be garbage collected when the object is destroyed
                // eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener
                peer.on("connect", () => {
                    const streamResult = get(this._screenSharingLocalStreamStore);
                    if (streamResult.type === "success" && streamResult.stream !== undefined) {
                        this.sendLocalScreenSharingStreamToUser(user.userId, streamResult.stream);
                    }

                    // Now, in case a stream is generated from the scripting API, we need to send it to the new peer
                    if (this.scriptingApiStream) {
                        peer.dispatchStream(this.scriptingApiStream);
                    }
                });

                this._analyticsClient.addNewParticipant(peer.uniqueId, user.userId, uuid);

                resolve(peer);
            })().catch((e) => {
                reject(asError(e));
            });
        });

        const peerObj: { promise: Promise<RemotePeer>; abortController: AbortController } = {
            promise: peerPromise,
            abortController: abortController,
        };

        this.videoPeers.set(user.userId, peerObj);

        const onAbort = () => {
            this.videoPeers.delete(user.userId);
        };

        abortController.signal.addEventListener("abort", onAbort, { once: true });

        let peer: RemotePeer;
        try {
            peer = await peerPromise;
        } catch (e) {
            abortController.abort(e);
            throw e;
        }
        if (peer === null) {
            abortController.abort();
            return null;
        }

        if (!this.abortController.signal.aborted) {
            this._streamableSubjects.videoPeerAdded.next(peer);

            const onAbort2 = () => {
                this._streamableSubjects.videoPeerRemoved.next(peer);
                peer.destroy();
            };

            abortController.signal.addEventListener("abort", onAbort2, { once: true });
        }

        return peer;
    }

    /**
     * create peer connection to bind users
     */
    private async createPeerScreenSharingConnection(
        user: UserSimplePeerInterface,
        spaceUserId: string,
        stream: MediaStream | undefined,
        isLocalPeer: boolean
    ): Promise<RemotePeer | null> {
        //const peerScreenSharingConnection = this.space.screenSharingPeerStore.get(user.userId);
        const peerScreenSharingConnection = this.screenSharePeers.get(user.userId);
        if (peerScreenSharingConnection) {
            const peerScreenSharingConnectionValue = await peerScreenSharingConnection.promise;
            if (peerScreenSharingConnectionValue.destroyed) {
                this._streamableSubjects.screenSharingPeerRemoved.next(peerScreenSharingConnectionValue);
                //peerScreenSharingConnection.toClose = true;
                //peerScreenSharingConnection.destroy();
                //this.space.screenSharingPeerStore.delete(user.userId);
            } else if (peerScreenSharingConnection.abortController.signal.aborted) {
                // The previous connection was aborted, we can safely create a new one.
            } else {
                return null;
            }
        }

        const abortController = new AbortController();

        const peerPromise = new Promise<RemotePeer>((resolve, reject) => {
            (async () => {
                const iceServers = await iceServersManager.getIceServersConfig();
                if (this.abortController.signal.aborted) {
                    reject(asError(this.abortController.signal.reason));
                    return;
                }
                if (abortController.signal.aborted) {
                    reject(asError(abortController.signal.reason));
                    return;
                }

                const peer = new RemotePeer(
                    user,
                    user.initiator ? user.initiator : false,
                    this._space,
                    iceServers,
                    isLocalPeer,
                    this._screenSharingLocalStreamStore,
                    "screenSharing",
                    spaceUserId,
                    this._blockedUsersStore,
                    () => {
                        abortController.abort();
                    },
                    readable({
                        audio: true,
                        video: true,
                    })
                );

                resolve(peer);
            })().catch((e) => {
                reject(asError(e));
            });
        });

        const peerObj: { promise: Promise<RemotePeer>; abortController: AbortController } = {
            promise: peerPromise,
            abortController: abortController,
        };

        this.screenSharePeers.set(user.userId, peerObj);

        const onAbort = () => {
            this.screenSharePeers.delete(user.userId);
        };

        abortController.signal.addEventListener("abort", onAbort, { once: true });

        let peer: RemotePeer;
        try {
            peer = await peerPromise;
        } catch (e) {
            abortController.abort(e);
            throw e;
        }
        if (peer === null) {
            abortController.abort();
            return null;
        }

        if (!this.abortController.signal.aborted) {
            this._streamableSubjects.screenSharingPeerAdded.next(peer);

            const onAbort2 = () => {
                this._streamableSubjects.screenSharingPeerRemoved.next(peer);
                peer.destroy();
            };

            abortController.signal.addEventListener("abort", onAbort2, { once: true });
        }

        return peer;
    }

    public blockedFromRemotePlayer(userId: string) {
        this.closeConnection(userId);
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    public closeConnection(userId: string) {
        try {
            const peer = this.videoPeers.get(userId);
            if (!peer) {
                return;
            }

            peer.abortController.abort();

            // FIXME: I don't understand why "Closing connection with" message is displayed TWICE before "Nb users in peerConnectionArray"
            // I do understand the method closeConnection is called twice, but I don't understand how they manage to run in parallel.

            this.closeScreenSharingConnection(userId);
        } catch (err) {
            console.error("An error occurred in closeConnection", err);
        }
    }

    /**
     * This is triggered twice. Once by the server, and once by a remote client disconnecting
     */
    private closeScreenSharingConnection(userId: string) {
        try {
            const peer = this.screenSharePeers.get(userId);
            if (!peer) {
                return;
            }

            peer.abortController.abort();
        } catch (err) {
            console.error("An error occurred in closeScreenSharingConnection", err);
        }
    }

    public destroy() {
        for (const userId of this.videoPeers.keys()) {
            this.closeConnection(userId);
        }

        for (const userId of this.screenSharePeers.keys()) {
            this.closeScreenSharingConnection(userId);
        }

        for (const unsubscriber of this._unsubscribers) {
            unsubscriber();
        }
        for (const subscription of this._rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    private receiveWebrtcSignal(signalData: SignalData, spaceUser: SpaceUserExtended) {
        (async () => {
            const peerObj = this.videoPeers.get(spaceUser.spaceUserId);

            if (peerObj) {
                const peer = await raceTimeout(peerObj.promise, 20_000);
                if (peerObj.abortController.signal.aborted) {
                    return;
                }
                peer.signal(signalData);
            } else {
                // TODO: understand how this can fail (notably in SpeakerZone in Firefox E2E tests.
                console.error(
                    'Could not find peer whose ID is "' +
                        spaceUser.spaceUserId +
                        '" in videoPeers. WebRTC Signal cannot be forwarded.'
                );
                Sentry.captureException(
                    new Error(
                        'Could not find peer whose ID is "' +
                            spaceUser.spaceUserId +
                            '" in videoPeers. WebRTC Signal cannot be forwarded.'
                    )
                );
            }
        })().catch((e) => {
            console.error(`receiveWebrtcSignal => ${spaceUser.spaceUserId}`, e);
            Sentry.captureException(e);
        });
    }

    private async receiveWebrtcScreenSharingSignal(
        data: WebRtcSignalReceivedMessageInterface,
        spaceUser: SpaceUserExtended
    ) {
        const streamResult = get(this._screenSharingLocalStreamStore);
        let stream: MediaStream | undefined = undefined;
        if (streamResult && streamResult.type === "success" && streamResult.stream !== undefined) {
            stream = streamResult.stream;
        }
        try {
            //if offer type, create peer connection
            if (data.signal.type === "offer") {
                await this.createPeerScreenSharingConnection(data, spaceUser.spaceUserId, stream, false);
            }
            const peerObj = this.screenSharePeers.get(data.userId);
            if (peerObj !== undefined) {
                const peer = await raceTimeout(peerObj.promise, 20_000);
                if (peerObj.abortController.signal.aborted) {
                    return;
                }
                peer.signal(data.signal);
            } else {
                console.error(
                    'Could not find peer whose ID is "' + data.userId + '" in receiveWebrtcScreenSharingSignal'
                );
                this._customWebRTCLogger.info("Attempt to create new peer connection");
                if (stream) {
                    this.sendLocalScreenSharingStreamToUser(data.userId, stream);
                }
            }
        } catch (e) {
            console.error(`receiveWebrtcScreenSharingSignal => ${data.userId}`, e);
            Sentry.captureException(e);
            //Comment this peer connection because if we delete and try to reshare screen, the RTCPeerConnection send renegotiate event. This array will be removed when user left circle discussion
            //await this.receiveWebrtcScreenSharingSignal(data, spaceUser);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public sendLocalScreenSharingStream(localScreenCapture: MediaStream) {
        for (const userId of this.videoPeers.keys()) {
            this.sendLocalScreenSharingStreamToUser(userId, localScreenCapture);
        }
    }

    /**
     * Triggered locally when clicking on the screen sharing button
     */
    public stopLocalScreenSharingStream() {
        for (const userId of this.videoPeers.keys()) {
            this.stopLocalScreenSharingStreamToUser(userId);
        }
    }

    private sendLocalScreenSharingStreamToUser(userId: string, localScreenCapture: MediaStream): void {
        // If a connection already exists with user (because it is already sharing a screen with us... let's use this connection)

        if (this.screenSharePeers.has(userId)) {
            return;
        }

        const screenSharingUser: UserSimplePeerInterface = {
            userId,
            initiator: true,
        };
        this.createPeerScreenSharingConnection(screenSharingUser, userId, localScreenCapture, true).catch((e) => {
            console.error(`sendLocalScreenSharingStreamToUser => ${userId}`, e);
            Sentry.captureException(e);
        });
    }

    private stopLocalScreenSharingStreamToUser(userId: string): void {
        const peerConnectionScreenSharingObj = this.screenSharePeers.get(userId);
        if (!peerConnectionScreenSharingObj) {
            return;
        }

        (async () => {
            const peerConnectionScreenSharing = await raceTimeout(peerConnectionScreenSharingObj.promise, 20_000);
            if (peerConnectionScreenSharingObj.abortController.signal.aborted) {
                return;
            }
            // Send message to stop screen sharing
            peerConnectionScreenSharing.stopStreamToRemoteUser();

            // If there are no more screen sharing streams, let's close the connection
            if (!peerConnectionScreenSharing.isReceivingScreenSharingStream()) {
                // Destroy the peer connection
                peerConnectionScreenSharing.destroy();
                // Close the screen sharing connection
                this.closeScreenSharingConnection(userId);
            }
        })().catch((e) => {
            console.error(`stopLocalScreenSharingStreamToUser => ${userId}`, e);
            Sentry.captureException(e);
        });
    }

    private scriptingApiStream: MediaStream | undefined = undefined;

    /**
     * Sends the stream passed in parameter to all the peers.
     * Used to send streams generated by the scripting API.
     */
    public dispatchStream(mediaStream: MediaStream) {
        for (const videoPeer of this.videoPeers.values()) {
            raceTimeout(videoPeer.promise, 20_000)
                .then((peer) => {
                    if (videoPeer.abortController.signal.aborted || this.abortController.signal.aborted) {
                        return;
                    }
                    if (peer.connected) {
                        peer.dispatchStream(mediaStream);
                    }
                })
                .catch((e) => {
                    console.error("An error occurred while waiting for a peer to be ready in dispatchStream", e);
                    Sentry.captureException(e);
                });
        }
        this.scriptingApiStream = mediaStream;
    }

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    public shutdown(): void {
        this.abortController.abort();
    }
}

</file>
<file path="Space.ts">
import { applyFieldMask } from "protobuf-fieldmask";
import { merge } from "lodash";
import * as Sentry from "@sentry/node";
import type {
    BackToPusherSpaceMessage,
    PrivateEvent,
    PublicEvent,
    SpaceAnswerMessage,
    SpaceQueryMessage,
    SpaceUser,
} from "@workadventure/messages";
import {
    AddSpaceUserMessage,
    FilterType,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
import Debug from "debug";
import { asError } from "catch-unknown";
import { clientEventsEmitter } from "../Services/ClientEventsEmitter";
import type { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import type { SpacesWatcher } from "./SpacesWatcher";
import type { EventProcessor } from "./EventProcessor";
import { CommunicationManager } from "./CommunicationManager";
import type { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";

const debug = Debug("space");

type Filter = Exclude<FilterType, FilterType.UNRECOGNIZED>;

export class Space implements CustomJsonReplacerInterface, ICommunicationSpace {
    readonly name: string;
    private users: Map<SpacesWatcher, Map<string, SpaceUser>>;
    private metadata: Map<string, unknown>;
    private communicationManager: ICommunicationManager;
    private usersToNotify: Map<SpacesWatcher, Map<string, SpaceUser>>;
    // Number of users publishing at least one stream (camera, screen or microphone)
    private _nbPublishers = 0;
    // Number of users (number of users in this space)
    private _nbUsers = 0;
    // If there is at least one publishers, nbWatchers = nbUsers. Otherwise nbWatchers = 0
    private _nbWatchers = 0;

    constructor(
        name: string,
        private _filterType: Filter,
        private eventProcessor: EventProcessor,
        private _propertiesToSync: string[],
        public readonly world: string,
        private _spaceUpdatedSubject = clientEventsEmitter.spaceUpdatedSubject
    ) {
        this.name = name;
        this.users = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        //equivalent of watchers in the pusher
        this.usersToNotify = new Map<SpacesWatcher, Map<SpaceUser["spaceUserId"], SpaceUser>>();
        this.metadata = new Map<string, unknown>();
        this.communicationManager = new CommunicationManager(this);
        debug(`${name} => created`);
    }

    public addUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        try {
            const usersList = this.usersList(sourceWatcher);
            usersList.set(spaceUser.spaceUserId, spaceUser);
            this._nbUsers++;
            if (this.isPublishing(spaceUser)) {
                this._nbPublishers++;
            }
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            }
            this._spaceUpdatedSubject.next(this);

            if (!this.filterOneUser(spaceUser)) {
                return;
            }
<!-- [5e] Space class uses MapStore (line 78) -->

            this.notifyWatchers({
                message: {
                    $case: "addSpaceUserMessage",
                    addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        user: spaceUser,
                    }),
                },
            });

            this.communicationManager.handleUserAdded(spaceUser).catch((e) => {
                Sentry.captureException(e);
                console.error(e);
            });
            debug(`${this.name} : user => added ${spaceUser.spaceUserId}`);
        } catch (e) {
            console.error("Error while adding user", e);
            Sentry.captureException(e);
            debug("Error while adding user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.removeUser(sourceWatcher, spaceUser.spaceUserId);
            throw e;
        }
    }

    public updateUser(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser, updateMask: string[]) {
        try {
            const usersList = this.usersList(sourceWatcher);
            const user = usersList.get(spaceUser.spaceUserId);
            if (!user) {
                console.error("User not found in this space", spaceUser);
                return;
            }

            if (this.isPublishing(user)) {
                this._nbPublishers--;
            }

            const oldFilter = this.filterOneUser(user);

            const updateValues = applyFieldMask(spaceUser, updateMask);
            merge(user, updateValues);

            const newFilter = this.filterOneUser(user);

            usersList.set(spaceUser.spaceUserId, user);

            if (this.isPublishing(user)) {
                this._nbPublishers++;
            }
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            } else {
                this._nbWatchers = 0;
            }
            this._spaceUpdatedSubject.next(this);

            if (!oldFilter && newFilter) {
                debug(`${this.name} : user updated => added ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`);
                this.notifyWatchers({
                    message: {
<!-- [3d] Space class creates readable store (line 141) -->
                        $case: "addSpaceUserMessage",
<!-- [3e] Store start callback registers resources (line 142) -->
                        addSpaceUserMessage: AddSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            user,
                        }),
                    },
<!-- [3f] Store stop callback cleanup (line 147) -->
                });

                this.communicationManager.handleUserAdded(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            } else if (oldFilter && !newFilter) {
                debug(
                    `${this.name} : user updated => removed ${user.spaceUserId} updateMask : ${updateMask.join(", ")}`
                );

                this.communicationManager.handleUserDeleted(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });

                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: user.spaceUserId,
                        }),
                    },
                });
            } else if (oldFilter !== false && newFilter !== false) {
                debug(
                    `${this.name} : user updated => updated ${user.spaceUserId} updateMask : ${updateMask.join(
                        ", "
                    )} in space ${this.name}`
                );
                this.notifyWatchers({
                    message: {
                        $case: "updateSpaceUserMessage",
                        updateSpaceUserMessage: {
                            spaceName: this.name,
                            user: spaceUser,
                            updateMask,
                        },
                    },
                });

                this.communicationManager.handleUserUpdated(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        } catch (e) {
            console.error("Error while updating user", e);
            Sentry.captureException(e);
            debug("Error while updating user", e);
            // If we have an error, it means that the user list is not initialized
            // So we need to remove user from the source watcher
            this.removeUser(sourceWatcher, spaceUser.spaceUserId);
        }
    }

    public removeUser(sourceWatcher: SpacesWatcher, spaceUserId: string) {
        let user: SpaceUser | undefined;
        try {
            const usersList = this.usersList(sourceWatcher);
            user = usersList.get(spaceUserId);

            const usersToNotifyList = this.usersListToNotify(sourceWatcher);
            usersToNotifyList.delete(spaceUserId);

            if (!user) {
                console.error("User not found in this space", spaceUserId);
                return;
            }

            usersList.delete(spaceUserId);

            if (this.isPublishing(user)) {
                this._nbPublishers--;
            }
            this._nbUsers--;
            if (this._nbPublishers > 0) {
                this._nbWatchers = this._nbUsers;
            } else {
                this._nbWatchers = 0;
            }
            this._spaceUpdatedSubject.next(this);
            debug(`${this.name} : user => removed ${spaceUserId}`);

            /*if (usersList.size === 0) {
                debug(`${this.name} : users list => deleted ${sourceWatcher.id}`);
                this.users.delete(sourceWatcher);
            }*/

            // this.communicationManager.handleUserDeleted(user);
        } catch (e) {
            console.error("Error while removing user", e);
            Sentry.captureException(e);
            debug("Error while removing user", e);
        } finally {
            if (user && this.filterOneUser(user)) {
                this.communicationManager.handleUserDeleted(user).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });

                this.notifyWatchers({
                    message: {
                        $case: "removeSpaceUserMessage",
                        removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                            spaceName: this.name,
                            spaceUserId: spaceUserId,
                        }),
                    },
                });
            }
        }
    }

    public updateMetadata(watcher: SpacesWatcher, metadata: { [key: string]: unknown }) {
        for (const key in metadata) {
            this.metadata.set(key, metadata[key]);
        }

        this.notifyWatchers({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
        debug(`${this.name} : metadata => updated`);
    }

    private filterOneUser(user: SpaceUser): boolean {
        switch (this._filterType) {
            case FilterType.ALL_USERS: {
                return true;
            }
            case FilterType.LIVE_STREAMING_USERS: {
                return /*(user.screenSharingState || user.microphoneState || user.cameraState) &&*/ user.megaphoneState;
            }
            default: {
                const _exhaustiveCheck: never = this._filterType;
            }
        }
        return false;
    }

    public addWatcher(watcher: SpacesWatcher) {
        this.users.set(watcher, new Map<string, SpaceUser>());
        this.usersToNotify.set(watcher, new Map<string, SpaceUser>());
        debug(`Space ${this.name} => watcher added ${watcher.id}`);

        const allSpaceUsers: SpaceUser[] = [];
        for (const spaceUsers of this.users.values()) {
            const filteredSpaceUsers = Array.from(spaceUsers.values()).filter((user) => this.filterOneUser(user));
            allSpaceUsers.push(...filteredSpaceUsers);
        }

        watcher.write({
            message: {
                $case: "initSpaceUsersMessage",
                initSpaceUsersMessage: {
                    spaceName: this.name,
                    users: allSpaceUsers,
                },
            },
        });

        const metadata: { [key: string]: unknown } = {};

        for (const key of this.metadata.keys()) {
            metadata[key] = this.metadata.get(key);
        }

        watcher.write({
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: UpdateSpaceMetadataMessage.fromPartial({
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                }),
            },
        });
    }

    public removeWatcher(watcher: SpacesWatcher) {
        const spaceUsers = this.users.get(watcher);
        if (spaceUsers) {
            for (const spaceUser of spaceUsers.values()) {
                this.communicationManager.handleUserDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }
        this.users.delete(watcher);

        const spaceUsersToNotify = this.usersToNotify.get(watcher);
        if (spaceUsersToNotify) {
            for (const spaceUser of spaceUsersToNotify.values()) {
                this.communicationManager.handleUserToNotifyDeleted(spaceUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        }
        this.usersToNotify.delete(watcher);
        // In case was not empty when it was removed, we need to notify the other watchers
        for (const spaceUser of spaceUsers?.values() || []) {
            if (!this.filterOneUser(spaceUser)) {
                continue;
            }

            debug(
                `${this.name} => removing space user ${spaceUser.spaceUserId} from watcher ${watcher.id} before removing watcher`
            );
            this.notifyWatchers({
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: RemoveSpaceUserMessage.fromPartial({
                        spaceName: this.name,
                        spaceUserId: spaceUser.spaceUserId,
                    }),
                },
            });
        }

        debug(`${this.name} => watcher removed ${watcher.id}`);
    }

    public addUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.set(spaceUser.spaceUserId, spaceUser);

        this.communicationManager.handleUserToNotifyAdded(spaceUser).catch((e) => {
            Sentry.captureException(e);
            console.error(e);
        });
        debug(`${this.name} : user to notify => added ${spaceUser.spaceUserId}`);
    }

    public deleteUserToNotify(sourceWatcher: SpacesWatcher, spaceUser: SpaceUser) {
        const usersList = this.usersListToNotify(sourceWatcher);
        usersList.delete(spaceUser.spaceUserId);
        this.communicationManager.handleUserToNotifyDeleted(spaceUser).catch((e) => {
            Sentry.captureException(e);
            console.error(e);
        });
        debug(`${this.name} : user to notify => deleted ${spaceUser.spaceUserId}`);
    }

    public removeUserFromNotify(watcher: SpacesWatcher, spaceUser: SpaceUser) {
        this.usersToNotify.delete(watcher);
    }
    /**
     * Notify all watchers expect the one that sent the message
     */
    private notifyWatchers(message: BackToPusherSpaceMessage) {
        for (const watcher_ of this.users.keys()) {
            watcher_.write(message);
        }
    }

    public canBeDeleted(): boolean {
        debug(`${this.name} : canBeDeleted => size ${this.users.size}`);
        return this.users.size === 0;
    }

    private usersList(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.users.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher :" + this.name);
        }
        return usersList;
    }

    private usersListToNotify(watcher: SpacesWatcher): Map<string, SpaceUser> {
        const usersList = this.usersToNotify.get(watcher);
        if (!usersList) {
            throw new Error("No users list associated to the watcher :" + this.name);
        }
        return usersList;
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        // TODO : Better way to display date in the /dump
        if (key === "name") {
            return this.name;
        } else if (key === "users") {
            return `Users : ${this.users.size}`;
        }
        return undefined;
    }

    public dispatchPublicEvent(publicEvent: PublicEvent) {
        if (!publicEvent.spaceEvent?.event) {
            // If there is no event, just forward the public event as-is
            this.notifyWatchers({
                message: {
                    $case: "publicEvent",
                    publicEvent,
                },
            });
            return;
        }

        // Process the event
        const processedEvent = this.eventProcessor.processPublicEvent(
            publicEvent.spaceEvent.event,
            publicEvent.senderUserId,
            this.getAllUsers()
        );

        // Create new public event with processed event
        const processedPublicEvent: PublicEvent = {
            ...publicEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };

        this.notifyWatchers({
            message: {
                $case: "publicEvent",
                publicEvent: processedPublicEvent,
            },
        });
    }
    public dispatchPrivateEvent(privateEvent: PrivateEvent) {
        const sender = this.getAllUsers().find((user) => user.spaceUserId === privateEvent.senderUserId);
        if (!sender) {
            // If the sender is the receiver, it means the message is sent from the server itself.
            // This is a special case, where (if the receiver is gone), we don't want to throw an error.
            if (privateEvent.senderUserId === privateEvent.receiverUserId) {
                return;
            }
            throw new Error(`Sender ${privateEvent.senderUserId} not found in space ${this.name}`);
        }

        // Let's notify the watcher that contains the user
        if (!privateEvent.spaceEvent?.event) {
            // If there is no event, just forward the private event as-is
            for (const [watcher, users] of this.users.entries()) {
                if (users.has(privateEvent.receiverUserId)) {
                    watcher.write({
                        message: {
                            $case: "privateEvent",
                            privateEvent: {
                                spaceName: privateEvent.spaceName,
                                receiverUserId: privateEvent.receiverUserId,
                                spaceEvent: privateEvent.spaceEvent,
                                sender,
                            },
                        },
                    });
                }
            }
            return;
        }

        // Process the event
        const processedEvent = this.eventProcessor.processPrivateEvent(
            privateEvent.spaceEvent.event,
            privateEvent.senderUserId,
            privateEvent.receiverUserId
        );

        // Create new private event with processed event
        const processedPrivateEvent: PrivateEvent = {
            ...privateEvent,
            spaceEvent: {
                event: processedEvent,
            },
        };

        // Send to target user
        for (const [watcher, users] of this.users.entries()) {
            if (users.has(privateEvent.receiverUserId)) {
                watcher.write({
                    message: {
                        $case: "privateEvent",
                        privateEvent: {
                            ...processedPrivateEvent,
                            sender,
                        },
                    },
                });
            }
        }
    }

    public syncUsersFromPusher(watcher: SpacesWatcher, users: SpaceUser[]) {
        this.users.set(watcher, new Map<string, SpaceUser>(users.map((user) => [user.spaceUserId, user])));
    }

    public handleQuery(
        watcher: SpacesWatcher,
        spaceQueryMessage: SpaceQueryMessage
    ): Pick<SpaceAnswerMessage, "answer"> {
        try {
            if (!spaceQueryMessage.query) {
                throw new Error("SpaceQueryMessage has no query");
            }

            const queryCase = spaceQueryMessage.query.$case;

            switch (queryCase) {
                case "addSpaceUserQuery": {
                    if (!spaceQueryMessage.query.addSpaceUserQuery.user) {
                        throw new Error("SpaceQueryMessage has no user");
                    }

                    if (this.filterType !== spaceQueryMessage.query.addSpaceUserQuery.filterType) {
                        throw new Error("Filter type mismatch when adding user to space");
                    }

                    this.addUser(watcher, spaceQueryMessage.query.addSpaceUserQuery.user);
                    this._spaceUpdatedSubject.next(this);
                    return {
                        answer: {
                            $case: "addSpaceUserAnswer",
                            addSpaceUserAnswer: {
                                spaceName: this.name,
                                spaceUserId: spaceQueryMessage.query.addSpaceUserQuery.user.spaceUserId,
                            },
                        },
                    };
                }
                case "removeSpaceUserQuery": {
                    this.removeUser(watcher, spaceQueryMessage.query.removeSpaceUserQuery.spaceUserId);
                    return {
                        answer: {
                            $case: "removeSpaceUserAnswer",
                            removeSpaceUserAnswer: {
                                spaceName: this.name,
                                spaceUserId: spaceQueryMessage.query.removeSpaceUserQuery.spaceUserId,
                            },
                        },
                    };
                }

                default: {
                    const _exhaustiveCheck: never = queryCase;
                    throw new Error("Unknown query");
                }
            }
        } catch (e) {
            const error = asError(e);
            console.error("Error while handling query", error);
            Sentry.captureException(error);
            return {
                answer: {
                    $case: "error",
                    error: {
                        message: `Error while handling query : ${error.message}}`,
                    },
                },
            };
        }
    }

    public get filterType(): Filter {
        return this._filterType;
    }

    /*
     * This function is used to shutdown the pusher connection of the space. for testing purpose.
     */
    public closeAllWatcherConnections() {
        for (const watcher of this.users.keys()) {
            watcher.error("Space closed by back");
            watcher.end();
            this.users.delete(watcher);
        }
    }
    public getAllUsers(): SpaceUser[] {
        return Array.from(this.users.values()).flatMap((users) => Array.from(users.values()));
    }
    public getUsersInFilter(): SpaceUser[] {
        return this.getAllUsers().filter((user) => this.filterOneUser(user));
    }

    public getUsersToNotify(): SpaceUser[] {
        return Array.from(this.usersToNotify.values()).flatMap((users) => Array.from(users.values()));
    }

    public getSpaceName(): string {
        return this.name;
    }
    public getPropertiesToSync(): string[] {
        return this._propertiesToSync;
    }

    private isPublishing(spaceUser: SpaceUser): boolean {
        return (
            (this.filterType === FilterType.ALL_USERS &&
                (spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState)) ||
            (this.filterType === FilterType.LIVE_STREAMING_USERS &&
                spaceUser.megaphoneState &&
                (spaceUser.cameraState || spaceUser.microphoneState || spaceUser.screenSharingState))
        );
    }

    get nbWatchers(): number {
        return this._nbWatchers;
    }
    get nbUsers(): number {
        return this._nbUsers;
    }
    get nbPublishers(): number {
        return this._nbPublishers;
    }
}

</file>
<file path="StreamableCollectionStore.ts">
import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { RemoteVideoTrack } from "livekit-client";
import { LayoutMode } from "../WebRtc/LayoutManager";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import LL from "../../i18n/i18n-svelte";
import type { VideoBox } from "../Space/Space";
import { localSpaceUser } from "../Space/localSpaceUser";
import { screenSharingLocalMedia } from "./ScreenSharingStore";

import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { embedScreenLayoutStore } from "./EmbedScreenLayoutStore";
import { highlightFullScreen } from "./ActionsCamStore";
import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    cameraEnergySavingStore,
    isListenerStore,
    localVoiceIndicatorStore,
    localVolumeStore,
    mediaStreamConstraintsStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
    localStreamStore,
} from "./MediaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";
import { windowSize } from "./CoWebsiteStore";
import { muteMediaStreamStore } from "./MuteMediaStreamStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { createDelayedUnsubscribeStore } from "./Utils/createDelayedUnsubscribeStore";

export interface LivekitStreamable {
    type: "livekit";
    remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
    readonly streamStore: Readable<MediaStream | undefined>;
    readonly isBlocked: Readable<boolean>;
}

export interface WebRtcStreamable {
    type: "webrtc";
    readonly streamStore: Readable<MediaStream | undefined>;
    readonly isBlocked: Readable<boolean>;
}

export interface ScriptingVideoStreamable {
    type: "scripting";
    url: string;
    config: VideoConfig;
    readonly isBlocked: Readable<boolean>;
}

export type StreamOrigin = "local" | "remote";
export type StreamCategory = "video" | "screenSharing" | "scripting";

export type StreamOriginCategory = `${StreamOrigin}_${StreamCategory}`;

export interface Streamable {
    readonly uniqueId: string;
    readonly media: LivekitStreamable | WebRtcStreamable | ScriptingVideoStreamable;
    readonly volumeStore: Readable<number[] | undefined> | undefined;
    readonly hasVideo: Readable<boolean>;
    readonly hasAudio: Readable<boolean>;
    readonly isMuted: Readable<boolean>;
    readonly statusStore: Readable<PeerStatus>;
    readonly name: Readable<string>;
    readonly showVoiceIndicator: Readable<boolean>;
    readonly flipX: boolean;
    // If set to true, the video will be muted (no sound will come out, even if the underlying stream has an audio track attached).
    // This does not prevent the volume bar from being displayed.
    // We use this for local camera feedback.
    readonly muteAudio: boolean;
    // In fit mode, the video will fit into the container and be fully visible, even if it does not fill the full container
    // In cover mode, the video will cover the full container, even if it means that some parts of the video are not visible
    readonly displayMode: "fit" | "cover";
    readonly displayInPictureInPictureMode: boolean;
    readonly usePresentationMode: boolean;
    readonly once: (event: string, callback: (...args: unknown[]) => void) => void;
    readonly spaceUserId: string | undefined;
    readonly closeStreamable: () => void;
    readonly volume: Writable<number>;
    readonly videoType: StreamOriginCategory;
}

// MyLocalStreamable is a streamable that is the local camera streamable
// It is used to display the local camera stream in the picture in picture mode when the user have an highlighted embed screen
export interface MyLocalStreamable extends Streamable {
    // No readonly because it is used to update the displayInPictureInPictureMode of the local camera streamable
    displayInPictureInPictureMode: boolean;
    setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => void;
}

export const SCREEN_SHARE_STARTING_PRIORITY = 1000; // Priority for screen sharing streams
export const VIDEO_STARTING_PRIORITY = 2000; // Priority for other video streams
export const LAST_VIDEO_BOX_PRIORITY = 20000; // Priority for the last video boxes

const localstreamStoreValue = derived(localStreamStore, (myLocalStream) => {
    if (myLocalStream.type === "success") {
        return myLocalStream.stream;
    }
    return undefined;
});

// Let's build a derived store from localstreamStoreValue that returns a stream containing only the video tracks
// (we don't want to play audio from our own microphone, that would create a feedback loop)
// We also need to handle the case where the video track is removed or added (because the user enabled or disabled his camera)

const mutedLocalStream = muteMediaStreamStore(localstreamStoreValue);

export const myCameraPeerStore: Readable<VideoBox> = derived([LL], ([$LL]) => {
    const streamable: MyLocalStreamable = {
        uniqueId: "-1",
        media: {
            type: "webrtc" as const,
            streamStore: createDelayedUnsubscribeStore(mutedLocalStream, 1000),
            isBlocked: writable(false),
        },
        volumeStore: localVolumeStore,
        hasVideo: derived(
            mediaStreamConstraintsStore,
            ($mediaStreamConstraintsStore) => $mediaStreamConstraintsStore.video !== false
        ),
        // hasAudio = true because the webcam has a microphone attached and could potentially play sound
        hasAudio: writable(true),
        isMuted: derived(requestedMicrophoneState, (micState) => !micState),
        statusStore: writable("connected" as const),
        name: writable($LL.camera.my.nameTag()),
        showVoiceIndicator: localVoiceIndicatorStore,
        flipX: true,
        muteAudio: true,
        displayMode: "cover" as const,
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        once: (event: string, callback: (...args: unknown[]) => void) => {
            callback();
        },
        spaceUserId: undefined,
        closeStreamable: () => {},
        volume: writable(1),
        videoType: "local_video",
        setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => {
            streamable.displayInPictureInPictureMode = displayInPictureInPictureMode;
        },
    };
    return streamableToVideoBox(streamable, -2);
});

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
<!-- [7a] Factory creates aggregated store (line 152) -->
function createStreamableCollectionStore(): Readable<Map<string, VideoBox>> {
<!-- [7b] Derived store with 12 dependencies (line 153) -->
    return derived(
        [
<!-- [7c] Depends on peer store (line 155) -->
            screenShareStreamElementsStore,
            videoStreamElementsStore,
            screenSharingLocalMedia,
            scriptingVideoStore,
            myCameraStore,
            myCameraPeerStore,
<!-- [7d] Depends on media store (line 161) -->
            cameraEnergySavingStore,
            silentStore,
            requestedCameraState,
            windowSize,
            isLiveStreamingStore,
            isListenerStore,
        ],
        (
            [
                $screenShareStreamElementsStore,
                $videoStreamElementsStore,
                $screenSharingLocalMedia,
                $scriptingVideoStore,
                $myCameraStore,
                $myCameraPeerStore,
                $cameraEnergySavingStore,
                $silentStore,
                $requestedCameraState,
                $windowSize,
                $isLiveStreamingStore,
                $isListenerStore,
            ] /*, set*/
        ) => {
<!-- [7e] Derived computation creates new state (line 184) -->
            const peers = new Map<string, VideoBox>();

            const addPeer = (videoBox: VideoBox) => {
                peers.set(videoBox.uniqueId, videoBox);
                // if peer is ScreenSharing, change for presentation Layout mode
                if (get(videoBox.streamable)?.usePresentationMode) {
                    // FIXME: we should probably do that only when the screen sharing is activated for the first time
                    embedScreenLayoutStore.set(LayoutMode.Presentation);
                }
            };

<!-- [7f] Complex logic combining multiple stores (line 195) -->
            if ($myCameraStore && !$cameraEnergySavingStore && !$silentStore) {
                let shouldAddMyCamera = true;
                // Are we the only one to display video AND are we not publishing a video stream? If so, let's hide the video.
                // Are we the only one to display video AND we are on a small screen? If so, let's hide the video (because the webcam takes space and makes iPhones laggy when it starts)
                if (!$isLiveStreamingStore && (!$requestedCameraState || $windowSize.width < 768)) {
                    shouldAddMyCamera = false;
                }

                if ($isListenerStore) {
                    shouldAddMyCamera = false;
                }

                if (shouldAddMyCamera) {
                    addPeer($myCameraPeerStore);
                }
            }

            $screenShareStreamElementsStore.forEach(addPeer);

            $videoStreamElementsStore.forEach(addPeer);
            $scriptingVideoStore.forEach((streamable) => addPeer(streamableToVideoBox(streamable, 0)));

            if ($screenSharingLocalMedia && $screenSharingLocalMedia.media.type === "webrtc") {
                addPeer(streamableToVideoBox($screenSharingLocalMedia, -1));
            }

            const $highlightedEmbedScreen = get(highlightedEmbedScreen);

            if ($highlightedEmbedScreen && !peers.has($highlightedEmbedScreen.uniqueId)) {
                highlightedEmbedScreen.removeHighlight();
                highlightFullScreen.set(false);
            }

            return peers;
        }
    );
}

const streamableToVideoBox = (streamable: Streamable, priority: number): VideoBox => {
    return {
        uniqueId: streamable.uniqueId,
        spaceUser: localSpaceUser(get(streamable.name)),
        streamable: writable(streamable),
        priority,
        displayOrder: writable(9999),
    };
};

export const streamableCollectionStore = createStreamableCollectionStore();

// Store to track if we are in a conversation with someone else
export const isInRemoteConversation = derived(
    [videoStreamElementsStore, screenShareStreamElementsStore, scriptingVideoStore, silentStore, isLiveStreamingStore],
    ([
        $screenSharingStreamStore,
        $videoStreamElementsStore,
        $scriptingVideoStore,
        $silentStore,
        $isLiveStreamingStore,
    ]) => {
        // If we are live streaming, we are in a conversation
        if ($isLiveStreamingStore) {
            return true;
        }

        // If we are silent, we are not in a conversation
        if ($silentStore) {
            return false;
        }

        // Check if we have any peers
        if ($videoStreamElementsStore.length > 0) {
            return true;
        }

        // Check if we have any screen sharing streams
        if ($screenSharingStreamStore.length > 0) {
            return true;
        }

        // Check if we have any scripting videos
        if ($scriptingVideoStore.size > 0) {
            return true;
        }

        return false;
    }
);

// No need to unsubscribe, the store is global
// eslint-disable-next-line svelte/no-ignored-unsubscribe
streamableCollectionStore.subscribe((streamableCollection) => {
    // If the highlightedEmbedScreen is not in the streamableCollection, we remove the highlight
    const $highlightedEmbedScreen = get(highlightedEmbedScreen);
    if ($highlightedEmbedScreen && !streamableCollection.has($highlightedEmbedScreen.uniqueId)) {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
    }
});

</file>
</files>
```

---

*Exported from Code Map on 28.12.2025*