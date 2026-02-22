 research how migrate to another chat system
what files for changes in my code base
get examples with list files
### Answer
# How to Migrate to Another Chat System in WorkAdventure

Based on my research of the codebase, here's a comprehensive guide on migrating from Matrix to another chat system.

## Current Architecture

WorkAdventure's chat system is built with an abstraction layer that makes it possible to swap chat providers. The system currently uses Matrix as the primary implementation, but includes a `ChatConnectionInterface` that defines the contract any chat provider must implement. workadventure:178-213 

## Key Files to Modify

### 1. **Core Interface and Implementation Files**

**Chat Connection Interface:**
- `play/src/front/Chat/Connection/ChatConnection.ts` - The main interface that defines all required methods and types for any chat provider workadventure:1-215 

**Current Matrix Implementation (to be replaced or used as reference):**
- `play/src/front/Chat/Connection/Matrix/MatrixChatConnection.ts` - Main Matrix implementation workadventure:61-96 

- `play/src/front/Chat/Connection/Matrix/MatrixClientWrapper.ts` - Wrapper for Matrix client initialization
- `play/src/front/Chat/Connection/Matrix/MatrixChatRoom.ts` - Room implementation
- `play/src/front/Chat/Connection/Matrix/MatrixRoomFolder.ts` - Folder/space implementation
- `play/src/front/Chat/Connection/Matrix/MatrixSecurity.ts` - Security and encryption handling

**Void Implementation (disabled chat reference):**
- `play/src/front/Chat/Connection/VoidChatConnection.ts` - Stub implementation showing minimal interface compliance workadventure:14-76 

### 2. **Environment Variables and Configuration**

**Frontend Environment Variables:**
- `play/src/front/Enum/EnvironmentVariable.ts` - Frontend environment variable exports workadventure:66-76 

**Backend Environment Variables:**
- `play/src/pusher/enums/EnvironmentVariable.ts` - Backend environment variable definitions workadventure:153-158 

- `play/src/pusher/enums/EnvironmentVariableValidator.ts` - Validation logic for environment variables

**Configuration Files:**
- `.env.template` - Main environment template workadventure:157-165 

- `contrib/docker/.env.prod.template` - Production environment template
- `play/src/common/FrontConfigurationInterface.ts` - TypeScript interface for frontend configuration

### 3. **Initialization and Lifecycle Management**

**Game Manager (where chat connection is initialized):**
- `play/src/front/Phaser/Game/GameManager.ts` - Manages chat connection creation and lifecycle workadventure:341-386 

### 4. **Backend Services**

**Matrix Provider Service (to be replaced with your provider):**
- `play/src/pusher/services/MatrixProvider.ts` - Backend service for Matrix admin operations workadventure:1-69 

- `play/src/pusher/controllers/IoSocketController.ts` - WebSocket controller handling chat queries
- `play/src/pusher/controllers/AuthenticateController.ts` - Authentication controller with Matrix user provisioning
- `play/src/pusher/services/LocalAdmin.ts` - Admin service with Matrix integration

### 5. **Docker and Deployment Configuration**

- `docker-compose.yaml` - Development Docker Compose with Matrix environment variables
- `contrib/docker/docker-compose.prod.yaml` - Production Docker Compose configuration
- `synapse/homeserver.template.yaml` - Matrix server configuration (can be removed)
- `synapse/start.sh` - Matrix server startup script (can be removed)

### 6. **UI Components** (May need updates depending on features)

- `play/src/front/Chat/Components/RoomList.svelte` - Room list component
- `play/src/front/Chat/Components/Room/RoomTimeline.svelte` - Message timeline
- `play/src/front/Chat/Components/Room/MessageInputBar.svelte` - Message input
- `play/src/front/Chat/Components/Room/CreateRoomModal.svelte` - Room creation UI

## Migration Steps

### Step 1: Create Your Chat Provider Implementation

Create a new directory similar to the Matrix implementation:
- `play/src/front/Chat/Connection/YourProvider/YourProviderChatConnection.ts`
- Implement the `ChatConnectionInterface`
- Implement required classes for rooms, messages, and users

### Step 2: Update Environment Variables

Modify these files to add your provider's configuration:
- `.env.template` - Add your provider's variables (replace MATRIX_* variables)
- `play/src/front/Enum/EnvironmentVariable.ts` - Export your provider's variables
- `play/src/pusher/enums/EnvironmentVariable.ts` - Define backend variables
- `play/src/common/FrontConfigurationInterface.ts` - Update the interface

### Step 3: Update Initialization Logic

Modify `GameManager.getChatConnection()` method to instantiate your provider instead of MatrixChatConnection: workadventure:341-386 

### Step 4: Create Backend Provider Service

Replace `MatrixProvider` with your own provider service:
- Implement user provisioning
- Implement room creation and management
- Handle admin operations

### Step 5: Update Docker Configuration

Update `docker-compose.yaml` and related files to:
- Remove Synapse/Matrix container (if not needed)
- Add your chat provider's container (if needed)
- Update environment variable mappings

### Step 6: Remove Matrix-Specific Code

- Remove the `play/src/front/Chat/Connection/Matrix/` directory
- Remove `synapse/` directory
- Clean up Matrix-related imports and dependencies from `package.json`

## Notes

- The `VoidChatConnection` class provides a good minimal example of implementing the interface when chat is disabled
- The `ChatConnectionInterface` is well-designed for abstraction, making migration feasible
- Proximity chat functionality is separate and doesn't depend on Matrix
- You'll need to handle authentication/authorization according to your new provider's requirements
- Consider keeping encryption features if your provider supports end-to-end encryption
- Test thoroughly with the Proximity chat system as it's independent of the persistent chat provider

The architecture is modular enough that a new chat provider can be integrated by implementing the interface and updating configuration, without major architectural changes to WorkAdventure.
### Citations
**File:** play/src/front/Chat/Connection/ChatConnection.ts (L1-215)
```typescript
import type { Readable, Writable } from "svelte/store";
import type { AvailabilityStatus } from "@workadventure/messages";
import type { MapStore } from "@workadventure/store-utils";
import type { StateEvents } from "matrix-js-sdk";
import type { ComponentType, SvelteComponent } from "svelte";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { PictureStore } from "../../Stores/PictureStore";

export type memberTypingInformation = { id: string; name: string | null; pictureStore: PictureStore };
export type ChatUser = {
    chatId: string;
    uuid?: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    pictureStore: PictureStore | undefined;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
};

export type AdminUser = {
    chatId?: string;
    uuid: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    pictureStore: PictureStore | undefined;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
};

export type AnyKindOfUser = ChatUser | AdminUser;

export type PartialChatUser = Partial<ChatUser> & { chatId: string };
export type PartialAdminUser = Partial<AdminUser> & { uuid: string };
export type PartialAnyKindOfUser = PartialChatUser | PartialAdminUser;

export type ChatRoomMembership = "ban" | "leave" | "knock" | "join" | "invite" | string;

export enum ChatPermissionLevel {
    USER = "USER",
    MODERATOR = "MODERATOR",
    ADMIN = "ADMIN",
}

export type ModerationAction = "ban" | "kick" | "invite" | "redact";

export interface ChatRoomMember {
    id: string;
    name: Readable<string>;
    membership: Readable<ChatRoomMembership>;
    permissionLevel: Readable<ChatPermissionLevel>;
}
export interface ChatRoom {
    readonly id: string;
    readonly name: Readable<string>;
    readonly type: "direct" | "multiple";
    readonly hasUnreadMessages: Readable<boolean>;
    readonly unreadNotificationCount: Readable<number>;
    readonly pictureStore: PictureStore;
    readonly messages: Readable<readonly ChatMessage[]>;
    readonly sendMessage: (message: string) => void;
    readonly sendFiles: (files: FileList) => Promise<void>;
    readonly setTimelineAsRead: () => void;
    readonly hasPreviousMessage: Readable<boolean>;
    readonly loadMorePreviousMessages: () => Promise<void>;
    readonly isEncrypted: Readable<boolean>;
    readonly typingMembers: Readable<Array<{ id: string; name: string | null; pictureStore: PictureStore }>>;
    readonly startTyping: () => Promise<object>;
    readonly stopTyping: () => Promise<object>;
    readonly isRoomFolder: boolean;
    readonly lastMessageTimestamp: number;
}

export interface ChatRoomMembershipManagement {
    readonly name: Readable<string>;
    readonly myMembership: Readable<ChatRoomMembership>;
    readonly members: Readable<ChatRoomMember[]>;
    readonly joinRoom: () => Promise<void>;
    readonly leaveRoom: () => Promise<void>;
}

export interface ChatRoomNotificationControl {
    readonly areNotificationsMuted: Readable<boolean>;
    readonly unmuteNotification: () => Promise<void>;
    readonly muteNotification: () => Promise<void>;
}

export interface ChatRoomModeration {
    readonly id: string;
    readonly inviteUsers: (userIds: string[]) => Promise<void>;
    readonly hasPermissionTo: (action: ModerationAction, member?: ChatRoomMember) => Readable<boolean>;
    readonly hasPermissionForRoomStateEvent: (eventType: keyof StateEvents) => Readable<boolean>;
    readonly kick: (userID: string) => Promise<void>;
    readonly ban: (userID: string) => Promise<void>;
    readonly unban: (userID: string) => Promise<void>;
    readonly changePermissionLevelFor: (member: ChatRoomMember, permissionLevel: ChatPermissionLevel) => Promise<void>;
    readonly getAllowedRolesToAssign: () => ChatPermissionLevel[];
    readonly canModifyRoleOf: (permissionLevel?: ChatPermissionLevel) => boolean;
}

//Readonly attributes
export interface ChatMessage {
    id: string;
    sender: AnyKindOfUser | undefined;
    content: Readable<ChatMessageContent>;
    isMyMessage: boolean;
    isQuotedMessage: boolean | undefined;
    date: Date | null;
    quotedMessage: ChatMessage | undefined;
    type: ChatMessageType;
    reactions: MapStore<string, ChatMessageReaction>;
    remove: () => void;
    edit: (newContent: string) => Promise<void>;
    isDeleted: Readable<boolean>;
    isModified: Readable<boolean>;
    addReaction: (reaction: string) => Promise<void>;
    canDelete: Readable<boolean>;
}

export interface ChatMessageReaction {
    readonly key: string;
    readonly users: MapStore<string, ChatUser>;
    readonly react: () => void;
    readonly reacted: Readable<boolean>;
    readonly component: { component: ComponentType<SvelteComponent>; props: Record<string, unknown> };
}

export type ChatMessageType = "proximity" | "text" | "incoming" | "outcoming" | "image" | "file" | "audio" | "video";
export type ChatMessageContent = {
    /**
     * The body can contain HTML. It will be run against DOMPurify before being outputted to the user.
     */
    body: string;
    url: string | undefined;
};
export const historyVisibilityOptions = ["joined", "invited", "world_readable"] as const;
export type historyVisibility = (typeof historyVisibilityOptions)[number];

export interface RoomFolder extends ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration {
    id: string;
    name: Readable<string>;
    rooms: Readable<ChatRoom[]>;
    folders: Readable<RoomFolder[]>;
    invitations: Readable<ChatRoom[]>;
    suggestedRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    joinableRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    hasChildRoomsError: Writable<boolean>;
}

export interface CreateRoomOptions {
    name?: string;
    visibility?: "private" | "public" | "restricted";
    is_direct?: boolean;
    historyVisibility?: historyVisibility;
    invite?: { value: string; label: string }[];
    preset?: "private_chat" | "public_chat" | "trusted_private_chat";
    encrypt?: boolean;
    parentSpaceID?: string;
    description?: string;
    suggested?: boolean;
}

export type ConnectionStatus = "ONLINE" | "ON_ERROR" | "CONNECTING" | "OFFLINE";

export type userId = number;
export type ChatId = string & { __chatIdBrand: never };
export type UserUuid = string & { __userUuidBrand: never };
export type ChatSpaceRoom = ChatRoom;
export interface ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus>;
    directRooms: Readable<ChatRoom[]>;
    rooms: Readable<(ChatRoom & ChatRoomMembershipManagement)[]>;
    invitations: Readable<ChatRoom[]>;
    folders: Readable<RoomFolder[]>;
    createRoom: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
    createFolder: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
    createDirectRoom(userChatId: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined>;
    roomCreationInProgress: Readable<boolean>;
    getDirectRoomFor(userChatId: string): (ChatRoom & ChatRoomMembershipManagement) | undefined;
    searchAccessibleRooms(searchText: string): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    >;

    joinRoom(roomId: string): Promise<ChatRoom | undefined>;

    destroy(): Promise<void>;
    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined>;
    isEncryptionRequiredAndNotSet: Readable<boolean>;
    initEndToEndEncryption(): Promise<void>;
    isGuest: Readable<boolean>;
    hasUnreadMessages: Readable<boolean>;
    clearListener: () => void;
    directRoomsUsers: Readable<ChatUser[]>;
    isUserExist: (address: string) => Promise<boolean>;
    getRoomByID(roomId: string): ChatRoom;
    retrySendingEvents: () => Promise<void>;
    shouldRetrySendingEvents: Readable<boolean>;
    nbUnreadRoomsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadInvitationsMessages: Readable<number>;
}

export type Connection = Pick<RoomConnection, "queryChatMembers" | "emitPlayerChatID" | "emitBanPlayerMessage">;
```
**File:** play/src/front/Chat/Connection/Matrix/MatrixChatConnection.ts (L61-96)
```typescript
export class MatrixChatConnection implements ChatConnectionInterface {
    private readonly roomList: MapStore<string, MatrixChatRoom>;
    private client: MatrixClient | undefined;
    private handleRoom: (room: Room) => void;
    private handleDeleteRoom: (roomId: string) => void;
    private handleMyMembership: (room: Room, membership: string, prevMembership: string | undefined) => void;
    private handleRoomStateEvent: (event: MatrixEvent) => void;
    private handleName: (room: Room) => void;
    private handleAccountDataEvent: (event: MatrixEvent) => void;
    private handleUserPresence: (event: MatrixEvent | undefined, user: User) => void;
    private handleVerificationRequestReceived: (request: VerificationRequest) => void;
    private statusUnsubscriber: Unsubscriber | undefined;
    private isClientReady = false;
    private usersStatus: MapStore<string, AvailabilityStatus>;
    private userIdsNeedingPresenceUpdate = new Set();
    private matrixRateLimiter: MatrixRateLimiter;
    nbUnreadInvitationsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadRoomsMessages: Readable<number>;
    connectionStatus: Writable<ConnectionStatus>;
    directRooms: Readable<MatrixChatRoom[]>;
    invitations: Readable<MatrixChatRoom[]>;
    rooms: Readable<MatrixChatRoom[]>;
    isEncryptionRequiredAndNotSet: Writable<boolean>;
    isGuest: Writable<boolean> = writable(false);
    hasUnreadMessages: Readable<boolean>;
    roomCreationInProgress: Writable<boolean> = writable(false);
    roomFolders: MapStore<MatrixRoomFolder["id"], MatrixRoomFolder> = new MapStore<
        MatrixRoomFolder["id"],
        MatrixRoomFolder
    >();
    folders: Readable<MatrixRoomFolder[]>;
    directRoomsUsers: Readable<ChatUser[]>;
    clientPromise: Promise<MatrixClient>;
    shouldRetrySendingEvents: Readable<boolean>;

```
**File:** play/src/front/Chat/Connection/VoidChatConnection.ts (L14-76)
```typescript
export class VoidChatConnection implements ChatConnectionInterface {
    directRoomsUsers: Readable<ChatUser[]> = readable([]);
    connectionStatus: Readable<ConnectionStatus> = writable("OFFLINE");
    directRooms: Readable<ChatRoom[]> = writable([]);
    rooms: Readable<(ChatRoom & ChatRoomMembershipManagement)[]> = writable([]);
    invitations: Readable<ChatRoom[]> = writable([]);
    roomFolders: MapStore<RoomFolder["id"], RoomFolder> = new MapStore();
    roomCreationInProgress: Readable<boolean> = writable(false);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(false);
    hasUnreadMessages: Readable<boolean> = writable(false);
    folders: Readable<RoomFolder[]> = writable([]);
    shouldRetrySendingEvents: Readable<boolean> = writable(false);
    nbUnreadRoomsMessages: Readable<number> = writable(0);
    nbUnreadDirectRoomsMessages: Readable<number> = writable(0);
    nbUnreadInvitationsMessages: Readable<number> = writable(0);
    retrySendingEvents: () => Promise<void> = () => Promise.resolve();

    createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        throw new Error("VoidChatConnection: createRoom is not implemented.");
    }

    createFolder(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        throw new Error("VoidChatConnection: createFolder is not implemented.");
    }

    createDirectRoom(userChatId: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined> {
        throw new Error("VoidChatConnection: createDirectRoom is not implemented.");
    }

    getDirectRoomFor(userChatId: string): (ChatRoom & ChatRoomMembershipManagement) | undefined {
        return undefined;
    }

    searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]> {
        return Promise.resolve([]);
    }

    joinRoom(roomId: string): Promise<ChatRoom | undefined> {
        return Promise.resolve(undefined);
    }

    getRoomByID(roomId: string): ChatRoom {
        throw new Error("Method not implemented.");
    }

    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined> {
        return Promise.resolve(undefined);
    }

    initEndToEndEncryption(): Promise<void> {
        return Promise.resolve();
    }

    isUserExist(userId: string): Promise<boolean> {
        return Promise.resolve(false);
    }

    destroy(): Promise<void> {
        return Promise.resolve();
    }
    clearListener(): void {}
}
```
**File:** play/src/front/Enum/EnvironmentVariable.ts (L66-76)
```typescript
//Chat ENV
export const EMBEDLY_KEY = env.EMBEDLY_KEY;
export const MATRIX_PUBLIC_URI = env.MATRIX_PUBLIC_URI;
export const MATRIX_ADMIN_USER = env.MATRIX_ADMIN_USER;
export const MATRIX_DOMAIN = env.MATRIX_DOMAIN;

export const ENABLE_CHAT = env.ENABLE_CHAT;

export const ENABLE_CHAT_ONLINE_LIST = env.ENABLE_CHAT_ONLINE_LIST;

export const ENABLE_CHAT_DISCONNECTED_LIST = env.ENABLE_CHAT_DISCONNECTED_LIST;
```
**File:** play/src/pusher/enums/EnvironmentVariable.ts (L153-158)
```typescript
// Matrix
export const MATRIX_PUBLIC_URI: string | undefined = env.MATRIX_PUBLIC_URI;
export const MATRIX_API_URI: string | undefined = env.MATRIX_API_URI;
export const MATRIX_ADMIN_USER: string | undefined = env.MATRIX_ADMIN_USER;
export const MATRIX_ADMIN_PASSWORD: string | undefined = env.MATRIX_ADMIN_PASSWORD;
export const MATRIX_DOMAIN: string | undefined = env.MATRIX_DOMAIN;
```
**File:** .env.template (L157-165)
```text
# Enable / disable chat
ENABLE_CHAT=true
# Enable / disable upload of file in chat (MUST BE TRUE ONLY IF ENABLE_CHAT IS TRUE)
ENABLE_CHAT_UPLOAD=true
ENABLE_CHAT_ONLINE_LIST=true
ENABLE_CHAT_DISCONNECTED_LIST=true
# Chat max uploadable file size (Byte)
UPLOAD_MAX_FILESIZE=10485760

```
**File:** play/src/front/Phaser/Game/GameManager.ts (L341-386)
```typescript
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
```
**File:** play/src/pusher/services/MatrixProvider.ts (L1-69)
```typescript
import type { AxiosInstance } from "axios";
import axios from "axios";
import pLimit from "p-limit";
import type { ICreateRoomOpts } from "matrix-js-sdk";
import { EventType, Visibility } from "matrix-js-sdk";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { MATRIX_ADMIN_PASSWORD, MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;

const limit = pLimit(10);
class MatrixProvider {
    private accessToken: string | undefined;
    private roomAreaFolderName = slugify("current visited room");
    private roomAreaFolderID: string | undefined;

    constructor() {
        this.overrideRateLimitForAdminAccount().catch((error) => {
            console.error("Failed to override admin account ratelimit:", error);
        });

        this.createChatFolderAreaAndSetID()
            .then((roomID) => {
                this.roomAreaFolderID = roomID;
            })
            .catch((error) => {
                console.error("Failed to create chat folder for room area:", error);
            });
    }

    private async getAxios(): Promise<AxiosInstance> {
        const accessToken = await this.getAccessToken();
        return axios.create({
            baseURL: MATRIX_API_URI,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
    }

    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    private async getAccessToken(): Promise<string> {
        if (!this.accessToken) {
            const response = await axios.post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                type: "m.login.password",
                user: MATRIX_ADMIN_USER,
                password: MATRIX_ADMIN_PASSWORD,
            });
            if (response.status === 200 && response.data.errcode === undefined) {
                this.accessToken = response.data.access_token;
                return response.data.access_token;
            } else {
                throw new Error("Failed with errcode " + response.data.errcode);
            }
        }

        if (!this.accessToken) {
            throw new Error("No access token found");
        }

        return this.accessToken;
    }
```
## Q2
please research how migrate to another chat system
what files for changes in my code base
get examples with list files
## WorkAdventure Chat System Migration Architecture
This codemap traces the complete architecture of WorkAdventure's chat system, showing how the abstraction layer enables provider migration. Key locations include the initialization logic in GameManager [1a-1e], the core interface contract [2a-2d], environment configuration [3a-3d], backend Matrix services [4a-4d], the Void implementation template [5a-5d], and Matrix SDK dependencies [6a-6c].
### 1. Chat Connection Initialization Flow
How the game manager decides which chat provider to use and initializes the connection
### 1a. Check Matrix Server URL (`GameManager.ts:346`)
GameManager retrieves Matrix server URL from environment or config
```text
const matrixServerUrl = this.getMatrixServerUrl() ?? MATRIX_PUBLIC_URI;
```
### 1b. Condition for Matrix Chat (`GameManager.ts:348`)
Only initialize Matrix if server URL exists and user is connected
```text
if (matrixServerUrl && get(userIsConnected)) {
```
### 1c. Create Matrix Connection (`GameManager.ts:359`)
Instantiate Matrix-specific chat connection implementation
```text
const matrixChatConnection = new MatrixChatConnection(matrixClientPromise, availabilityStatusStore);
```
### 1d. Fallback to Void Connection (`GameManager.ts:380`)
When Matrix is unavailable, use stub implementation
```text
return new VoidChatConnection();
```
### 1e. Void Connection Default (`GameManager.ts:383`)
Default case when no Matrix server is configured
```text
this._chatConnection = new VoidChatConnection();
```
### 2. Chat Provider Interface Contract
The core abstraction that enables swapping chat providers
### 2a. Main Interface Definition (`ChatConnection.ts:178`)
Defines the complete contract any chat provider must implement
```text
export interface ChatConnectionInterface {
```
### 2b. Connection Status Property (`ChatConnection.ts:179`)
Reactive status monitoring required for all providers
```text
connectionStatus: Readable<ConnectionStatus>;
```
### 2c. Room Creation Method (`ChatConnection.ts:184`)
Standardized room creation across providers
```text
createRoom: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
```
### 2d. Cleanup Method (`ChatConnection.ts:192`)
Required cleanup for proper resource management
```text
destroy(): Promise<void>;
```
### 3. Environment Configuration System
How Matrix-specific configuration is defined and used throughout the system
### 3a. Frontend Matrix URI (`EnvironmentVariable.ts:68`)
Frontend environment variable for Matrix server URL
```text
export const MATRIX_PUBLIC_URI = env.MATRIX_PUBLIC_URI;
```
### 3b. Backend Matrix API URI (`EnvironmentVariable.ts:154`)
Backend environment variable for Matrix API endpoint
```text
export const MATRIX_API_URI: string | undefined = env.MATRIX_API_URI;
```
### 3c. Docker Matrix Configuration (`docker-compose.yaml:155`)
Docker Compose sets Matrix API URI for Synapse container
```text
MATRIX_API_URI: http://synapse:8008/
```
### 3d. Frontend Config Interface (`FrontConfigurationInterface.ts:54`)
TypeScript interface defining frontend configuration structure
```text
MATRIX_PUBLIC_URI: string | undefined;
```
### 4. Matrix Backend Service Integration
Backend services that handle Matrix-specific operations
### 4a. Matrix Provider Dependencies (`MatrixProvider.ts:7`)
Backend service imports Matrix configuration
```text
import { MATRIX_ADMIN_PASSWORD, MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";
```
### 4b. Admin User Construction (`MatrixProvider.ts:9`)
Builds Matrix admin user ID from environment variables
```text
const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;
```
### 4c. Admin Rate Limit Override (`MatrixProvider.ts:18`)
Matrix-specific admin account setup on initialization
```text
this.overrideRateLimitForAdminAccount().catch((error) => {
```
### 4d. API Client Configuration (`MatrixProvider.ts:34`)
Axios client configured with Matrix API URI
```text
baseURL: MATRIX_API_URI,
```
### 5. Void Implementation as Migration Template
The stub implementation shows minimal interface compliance for new providers
### 5a. Void Class Declaration (`VoidChatConnection.ts:14`)
Stub implementation of the chat interface
```text
export class VoidChatConnection implements ChatConnectionInterface {
```
### 5b. Offline Status Default (`VoidChatConnection.ts:16`)
Minimal implementation of required status property
```text
connectionStatus: Readable<ConnectionStatus> = writable("OFFLINE");
```
### 5c. Unimplemented Room Creation (`VoidChatConnection.ts:32`)
Throws error for unimplemented methods
```text
createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
```
### 5d. No-op Destroy Method (`VoidChatConnection.ts:75`)
Minimal cleanup implementation
```text
destroy(): Promise<void> {
```
### 6. Matrix SDK Dependencies
Core Matrix SDK dependency that would need replacement
### 6a. Matrix SDK Package (`package.json:157`)
Primary Matrix SDK dependency in package.json
```text
"matrix-js-sdk": "^32.3.0",
```
### 6b. Matrix SDK Imports (`MatrixProvider.ts:5`)
Backend service imports Matrix SDK types
```text
import { EventType, Visibility } from "matrix-js-sdk";
```
### 6c. Interface Matrix Types (`ChatConnection.ts:4`)
Even the interface imports Matrix-specific types
```text
import type { StateEvents } from "matrix-js-sdk";
```
