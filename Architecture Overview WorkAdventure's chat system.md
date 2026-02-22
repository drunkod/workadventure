# Chat System

Relevant source files
* [back/src/Model/GameRoom.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/Model/GameRoom.ts)
* [back/src/Model/Space.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/Model/Space.ts)
* [back/src/Model/SpacesWatcher.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/Model/SpacesWatcher.ts)
* [back/src/Model/User.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/Model/User.ts)
* [back/src/RoomManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/RoomManager.ts)
* [back/src/Services/SocketManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/Services/SocketManager.ts)
* [back/src/SpaceManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/src/SpaceManager.ts)
* [back/tests/Space.test.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/tests/Space.test.ts)
* [back/tests/SpacesWatcher.test.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/back/tests/SpacesWatcher.test.ts)
* [messages/protos/messages.proto](https://github.com/workadventure/workadventure/blob/6fe3baf2/messages/protos/messages.proto)
* [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts)
* [play/src/front/Connection/RoomConnection.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Connection/RoomConnection.ts)
* [play/src/front/Livekit/LiveKitRoom.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Livekit/LiveKitRoom.ts)
* [play/src/front/Livekit/LivekitParticipant.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Livekit/LivekitParticipant.ts)
* [play/src/front/Phaser/Game/GameScene.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Phaser/Game/GameScene.ts)
* [play/src/front/Space/Space.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/Space.ts)
* [play/src/front/Space/SpaceInterface.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/SpaceInterface.ts)
* [play/src/front/Space/SpaceRegistry/SpaceRegistry.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/SpaceRegistry/SpaceRegistry.ts)
* [play/src/front/Space/SpaceRegistry/SpaceRegistryInterface.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/SpaceRegistry/SpaceRegistryInterface.ts)
* [play/src/front/Space/tests/MockRoomConnectionForSpaces.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/tests/MockRoomConnectionForSpaces.ts)
* [play/src/front/Stores/MediaStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/MediaStore.ts)
* [play/src/front/Stores/ScreenSharingStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/ScreenSharingStore.ts)
* [play/src/front/Stores/ScriptingVideoStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/ScriptingVideoStore.ts)
* [play/src/front/Stores/StreamableCollectionStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/StreamableCollectionStore.ts)
* [play/src/front/WebRtc/RemotePeer.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/WebRtc/RemotePeer.ts)
* [play/src/front/WebRtc/SimplePeer.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/WebRtc/SimplePeer.ts)
* [play/src/pusher/controllers/IoSocketController.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/controllers/IoSocketController.ts)
* [play/src/pusher/models/Space.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/models/Space.ts)
* [play/src/pusher/models/SpaceConnection.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/models/SpaceConnection.ts)
* [play/src/pusher/models/SpaceToFrontDispatcher.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/models/SpaceToFrontDispatcher.ts)
* [play/src/pusher/models/Websocket/SocketData.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/models/Websocket/SocketData.ts)
* [play/src/pusher/services/SocketManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/pusher/services/SocketManager.ts)
* [play/tests/pusher/Space.test.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/tests/pusher/Space.test.ts)

The Chat System provides text-based communication capabilities in WorkAdventure, supporting both proximity-based chat (users near each other in the virtual world) and Matrix-based persistent chat. This document covers the proximity chat implementation, Matrix integration for text messaging, message routing, and the integration with the Space system for real-time communication.

For information about video/audio conferencing, see [Video Conferencing](/workadventure/workadventure/6.2-video-conferencing). For live streaming features, see [Live Streaming](/workadventure/workadventure/6.4-live-streaming).

---

## Architecture Overview

WorkAdventure's chat system operates on two levels: proximity-based ephemeral chat and Matrix-based persistent chat. The proximity chat is tightly integrated with the Space system, allowing users in the same virtual space to exchange messages in real-time. Matrix integration provides persistent chat rooms and direct messages that survive beyond individual play sessions.

**Diagram: Chat System Architecture**

The chat system consists of three main layers: the UI layer handles user interactions, the connection layer manages different chat protocols, and the space system provides real-time message routing through WebSockets.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L1-L184](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L1-L184) [play/src/front/Space/Space.ts#L70-L445](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/Space.ts#L70-L445) [play/src/front/Phaser/Game/GameScene.ts#L159-L161](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Phaser/Game/GameScene.ts#L159-L161)

---

## Proximity Chat System

The proximity chat system is implemented through the `ProximityChatRoom` class, which represents a chat room for users within proximity of each other in the virtual world. Unlike Matrix rooms, proximity chat messages are ephemeral and only visible to users currently in range.

### ProximityChatRoom Class

**Diagram: ProximityChatRoom Structure**

The `ProximityChatRoom` implements the `ChatRoom` interface and manages proximity-based communication. Key responsibilities include message sending/receiving, user presence tracking, typing indicators, and audio streaming integration.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L80-L148](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L80-L148)

### Message Sending Flow

When a user sends a proximity chat message, the following sequence occurs:

**Diagram: Proximity Chat Message Flow**

Messages are first added locally for immediate feedback, then broadcast through the Space system to all users in the same space. The Space uses the underlying RoomConnection WebSocket to transmit messages to the Pusher server, which broadcasts them to other clients.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L186-L234](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L186-L234) [play/src/front/Space/Space.ts#L434-L444](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Space/Space.ts#L434-L444)

### Message Reception

Remote messages are received through the Space system's event observers:

| Component | Method | Purpose |
| --- | --- | --- |
| `Space` | `observePublicEvent("spaceMessage")` | Observable for space messages |
| `ProximityChatRoom` | Subscription setup (constructor) | Subscribes to space message events |
| `ProximityChatRoom` | `addNewMessage()` | Processes incoming messages |
| `CharacterLayerManager` | `wokaBase64()` | Generates avatar images for senders |

The `ProximityChatRoom` subscribes to the `"spaceMessage"` event on its associated `Space` instance. When a message arrives, it creates a `ProximityChatMessage` with the sender's information and adds it to the local message store.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L271-L318](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L271-L318)

---

## Message Data Structures

### ChatMessage Interface

The chat system uses the `ChatMessage` interface to represent individual messages.

### ProximityChatMessage Implementation

**Diagram: Message Data Structure**

The `ProximityChatMessage` class implements the `ChatMessage` interface for proximity chat. Messages store sender information, content, timestamps, and reactive properties for UI updates.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L49-L76](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L49-L76)

---

## Chat Room Management

### ChatRoom Interface

All chat rooms (proximity and Matrix) implement the `ChatRoom` interface:

| Property/Method | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique room identifier |
| `name` | `Writable<string>` | Room display name |
| `type` | `"direct" | "multiple"` | Room type |
| `messages` | `SearchableArrayStore<ChatMessage>` | Message history |
| `hasUnreadMessages` | `Writable<boolean>` | Unread indicator |
| `sendMessage()` | `(message: string) => void` | Send a message |
| `typingMembers` | `Writable<Array>` | Currently typing users |

### Room Selection and Navigation

The chat UI uses several stores to manage room selection and visibility:

**Diagram: Chat Navigation Stores**

The chat system uses multiple Svelte stores to coordinate UI state. The `selectedRoomStore` tracks the active room, while `chatVisibilityStore` controls panel visibility.

Sources: [play/src/front/Chat/Stores/SelectRoomStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Stores/SelectRoomStore.ts) [play/src/front/Stores/ChatStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/ChatStore.ts)

---

## User Presence and Typing Indicators

### Typing Status

The proximity chat supports typing indicators to show when users are composing messages:

**Diagram: Typing Indicator Flow**

Typing indicators are broadcast through the Space system as public messages. The `IframeListener` detects typing activity and notifies the `ProximityChatRoom`, which broadcasts the status.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L151-L163](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L151-L163)

### User Join/Leave Notifications

The proximity chat automatically generates system messages when users enter or leave the space:

**Diagram: User Presence Notifications**

When users enter or leave the space, the proximity chat generates system messages. These are distinct from regular chat messages and appear as timeline events.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L236-L269](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L236-L269)

---

## Audio Streaming Integration

The proximity chat includes audio streaming capabilities for voice chat features:

### Audio Stream Managers

| Component | Purpose |
| --- | --- |
| `ScriptingOutputAudioStreamManager` | Manages outgoing audio from the scripting API |
| `ScriptingInputAudioStreamManager` | Manages incoming audio to the scripting API |
| `startListeningToStreamInBubbleStream` | Observable for starting audio input |
| `stopListeningToStreamInBubbleStream` | Observable for stopping audio input |

**Diagram: Audio Streaming in Chat**

The chat system can stream audio bidirectionally between the scripting API and the Space system. This enables custom voice chat implementations through the iframe API.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L164-L183](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L164-L183) [play/src/front/WebRtc/AudioStream/ScriptingOutputAudioStreamManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/WebRtc/AudioStream/ScriptingOutputAudioStreamManager.ts) [play/src/front/WebRtc/AudioStream/ScriptingInputAudioStreamManager.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/WebRtc/AudioStream/ScriptingInputAudioStreamManager.ts)

---

## Matrix Integration

WorkAdventure integrates with Matrix for persistent text chat that survives beyond individual game sessions:

### Matrix Connection

| Component | Purpose |
| --- | --- |
| `matrix-js-sdk` | Matrix client library |
| `@matrix-org/olm` | End-to-end encryption library |
| Matrix chat rooms | Persistent chat rooms |
| Direct messages | Private conversations |

The Matrix integration provides features not available in proximity chat:
* **Persistence**: Messages survive across sessions
* **Encryption**: Optional end-to-end encryption
* **History**: Full message history
* **Reactions**: Message reactions and threading
* **File sharing**: Attachment support

Sources: [play/package.json#L155](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/package.json#L155-L155) High-level architecture diagram (Diagram 1)

---

## Chat Store Architecture

The chat system uses multiple Svelte stores for reactive state management:

**Diagram: Chat Store Organization**

The chat system separates concerns into visibility management, navigation state, and room-specific state. This allows different parts of the UI to react independently to state changes.

Sources: [play/src/front/Stores/ChatStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Stores/ChatStore.ts) [play/src/front/Chat/Stores/ChatStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Stores/ChatStore.ts) [play/src/front/Chat/Stores/SelectRoomStore.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Stores/SelectRoomStore.ts)

---

## Scripting API Integration

The chat system exposes functionality to the iframe scripting API:

### Integration Flow

**Diagram: Scripting API Chat Integration**

The scripting API can both send and receive chat messages. Outgoing messages go through the normal proximity chat flow, while incoming messages trigger registered callbacks.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L226-L233](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L226-L233) [play/src/front/Api/IframeListener.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Api/IframeListener.ts)

---

## Notifications

The chat system integrates with the notification system to alert users of new messages:

### Notification Flow

**Diagram: Chat Notification System**

When new messages arrive, the system creates notifications, plays sounds, and updates the favicon. Users can mute notifications per-room using the `areNotificationsMuted` store.

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L136-L147](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L136-L147) [play/src/front/Notification/MessageNotification.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Notification/MessageNotification.ts)

### Notification Settings

| Setting | Store | Purpose |
| --- | --- | --- |
| Chat sounds | `localUserStore.getChatSounds()` | Enable/disable chat sounds |
| Room mute | `areNotificationsMuted` | Mute notifications for specific room |
| Unread count | `unreadNotificationCount` | Track unread messages |
| Unread indicator | `hasUnreadMessages` | Display unread badge |

Sources: [play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L105-L107](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/Connection/Proximity/ProximityChatRoom.ts#L105-L107)

---

## User Provider System

The chat system uses a user provider architecture to merge user data from different sources:

**Diagram: User Provider Architecture**

The `UserProviderMerger` combines users from multiple sources (world, Matrix, admin) into a unified view. This allows the chat UI to display all relevant users regardless of their source.

Sources: [play/src/front/Phaser/Game/GameScene.ts#L164-L167](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Phaser/Game/GameScene.ts#L164-L167) [play/src/front/Chat/UserProvider/UserProviderMerger.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/UserProvider/UserProviderMerger.ts)

### Mapping Space Users to Chat Users

The `mapExtendedSpaceUserToChatUser()` function converts `SpaceUserExtended` objects to the `AnyKindOfUser` format used by the chat UI.

Sources: [play/src/front/Chat/UserProvider/ChatUserMapper.ts](https://github.com/workadventure/workadventure/blob/6fe3baf2/play/src/front/Chat/UserProvider/ChatUserMapper.ts)

---

## Summary

The WorkAdventure chat system provides a dual-layered approach to communication, combining the immediate relevance of proximity-based ephemeral chat with the persistent, feature-rich capabilities of Matrix integration. By centralizing management through the `ProximityChatRoom` class and utilizing reactive stores for UI state, the system maintains a robust, decoupled architecture while integrating tightly with broader platform capabilities like real-time spatial networking and third-party script integrations.
