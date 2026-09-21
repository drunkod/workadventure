import { AvailabilityStatus } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { localUserStore } from "../../../Connection/LocalUserStore";
import type {
    ChatConnectionInterface,
    ChatRoom,
    ChatRoomMembershipManagement,
    ChatUser,
    ConnectionStatus,
    CreateRoomOptions,
    RoomFolder,
} from "../ChatConnection";
import { JazzChatRoom } from "./JazzChatRoom";
import { JazzRuntime } from "./JazzRuntime";
import { resolveJazzSyncPolicy } from "./JazzSyncPolicy";

export interface JazzChatConnectionOptions {
    roomStorageKey: string;
    defaultRoomName: string;
    syncMode?: string;
    syncPeer?: string;
    apiKey?: string;
    globalRoomId?: string;
}

function normalizeStorageKey(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

export class JazzChatConnection implements ChatConnectionInterface {
    readonly isJazz = true;
    private readonly runtime = new JazzRuntime();
    private readonly roomList = new MapStore<string, JazzChatRoom>();
    private readonly usersById = new Map<string, ChatUser>();
    private readonly directRoomsByUserId = new Map<string, JazzChatRoom>();
    private readonly roomsStore = writable<JazzChatRoom[]>([]);
    private readonly directRoomsStore = writable<JazzChatRoom[]>([]);
    private readonly invitationStore = writable<JazzChatRoom[]>([]);
    private initAttempt: Promise<void> | undefined;

    readonly currentUser: ChatUser;
    connectionStatus: Writable<ConnectionStatus> = writable("CONNECTING");
    directRooms: Readable<ChatRoom[]> = this.directRoomsStore;
    rooms: Readable<(ChatRoom & ChatRoomMembershipManagement)[]> = this.roomsStore;
    invitations: Readable<ChatRoom[]> = this.invitationStore;
    folders: Readable<RoomFolder[]> = writable([]);
    roomCreationInProgress: Writable<boolean> = writable(false);
    isEncryptionRequiredAndNotSet: Readable<boolean> = writable(false);
    isGuest: Readable<boolean> = writable(false);
    directRoomsUsers: Writable<ChatUser[]> = writable([]);
    shouldRetrySendingEvents: Readable<boolean> = writable(false);
    nbUnreadRoomsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadInvitationsMessages: Readable<number>;
    hasUnreadMessages: Readable<boolean>;

    constructor(private readonly options: JazzChatConnectionOptions) {
        this.currentUser = this.createCurrentUser();
        this.usersById.set(this.currentUser.chatId, this.currentUser);

        this.nbUnreadRoomsMessages = derived(this.roomsStore, (rooms) =>
            rooms.reduce((sum, room) => sum + get(room.unreadNotificationCount), 0)
        );
        this.nbUnreadDirectRoomsMessages = derived(this.directRoomsStore, (rooms) =>
            rooms.reduce((sum, room) => sum + get(room.unreadNotificationCount), 0)
        );
        this.nbUnreadInvitationsMessages = derived(this.invitationStore, (rooms) =>
            rooms.reduce((sum, room) => sum + get(room.unreadNotificationCount), 0)
        );
        this.hasUnreadMessages = derived(
            [this.nbUnreadRoomsMessages, this.nbUnreadDirectRoomsMessages, this.nbUnreadInvitationsMessages],
            ([roomsUnread, directUnread, invitationUnread]) => roomsUnread + directUnread + invitationUnread > 0
        );
    }

    async init(): Promise<void> {
        if (this.initAttempt) return this.initAttempt;
        this.initAttempt = this.initialize();
        try {
            await this.initAttempt;
        } catch (error) {
            this.initAttempt = undefined;
            throw error;
        }
    }

    private async initialize(): Promise<void> {
        this.connectionStatus.set("CONNECTING");
        let room: JazzChatRoom | undefined;
        const abortController = new AbortController();
        try {
            await this.runtime.init({
                policy: resolveJazzSyncPolicy({
                    mode: this.options.syncMode,
                    peer: this.options.syncPeer,
                    apiKey: this.options.apiKey,
                }),
            });

            const mainRoomId = await this.runtime.resolveRoomId(
                `wa:jazz:main:${normalizeStorageKey(this.options.roomStorageKey)}`,
                this.options.globalRoomId
            );
            room = new JazzChatRoom(this, this.runtime, mainRoomId, this.options.defaultRoomName, "multiple");
            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            const timeout = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error("Jazz main room readiness timed out after 5000 ms"));
                    abortController.abort();
                }, 5000);
            });
            try {
                await Promise.race([room.init(abortController.signal), timeout]);
            } finally {
                if (timeoutId !== undefined) clearTimeout(timeoutId);
            }
            this.roomList.set(room.id, room);
            this.roomsStore.set([room]);

            this.connectionStatus.set("ONLINE");
        } catch (error) {
            abortController.abort();
            this.connectionStatus.set("ON_ERROR");
            try {
                await room?.destroy();
            } catch {
                // Preserve the original initialization error; chat is already terminally unavailable.
            }
            throw error;
        }
    }

    async createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        void roomOptions;
        throw new Error("Jazz local mode does not support creating rooms");
    }

    async createFolder(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        void roomOptions;
        throw new Error("Jazz local mode does not support creating folders");
    }

    async createDirectRoom(userChatId: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined> {
        void userChatId;
        throw new Error("Jazz local mode does not support direct rooms");
    }

    getDirectRoomFor(userChatId: string): (ChatRoom & ChatRoomMembershipManagement) | undefined {
        return this.directRoomsByUserId.get(userChatId);
    }

    async searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]> {
        void searchText;
        throw new Error("Jazz local mode does not support shared room discovery");
    }

    async joinRoom(roomId: string): Promise<ChatRoom | undefined> {
        const room = this.roomList.get(roomId);
        if (!room) {
            throw new Error("Jazz local mode does not support joining rooms");
        }
        await room.joinRoom();
        return room;
    }

    async destroy(): Promise<void> {
        const allRooms = [...this.roomList.values()];
        for (const room of allRooms) {
            await room.destroy();
        }
        this.roomList.clear();
        this.directRoomsByUserId.clear();
        this.roomsStore.set([]);
        this.directRoomsStore.set([]);
        this.invitationStore.set([]);
        this.runtime.destroy();
        this.connectionStatus.set("OFFLINE");
    }

    async searchChatUsers(_searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined> {
        throw new Error("Jazz local chat does not support user discovery");
    }

    initEndToEndEncryption(): Promise<void> {
        return Promise.resolve();
    }

    clearListener(): void {
        // No-op for Jazz in phase 1.
    }

    async isUserExist(address: string): Promise<boolean> {
        return this.usersById.has(address);
    }

    getRoomByID(roomId: string): ChatRoom {
        const room = this.roomList.get(roomId);
        if (!room) {
            throw new Error(`Room not found: ${roomId}`);
        }
        return room;
    }

    retrySendingEvents(): Promise<void> {
        return Promise.resolve();
    }

    getOrCreateUser(chatId: string, username: string): ChatUser {
        const existing = this.usersById.get(chatId);
        if (existing) {
            return existing;
        }
        const user: ChatUser = {
            chatId,
            availabilityStatus: writable(AvailabilityStatus.ONLINE),
            username,
            pictureStore: readable(undefined),
            roomName: undefined,
            playUri: undefined,
            color: undefined,
            spaceUserId: undefined,
        };
        this.usersById.set(chatId, user);
        return user;
    }

    private updateDirectRoomsUsers(): void {
        const directUsers = Array.from(this.directRoomsByUserId.keys()).map((chatId) =>
            this.getOrCreateUser(chatId, chatId)
        );
        this.directRoomsUsers.set(directUsers);
    }

    private createCurrentUser(): ChatUser {
        const localUser = localUserStore.getLocalUser();
        const chatId = localUserStore.getChatId() ?? localUser?.uuid ?? `jazz-user-${uuidv4()}`;
        const username = localUserStore.getName() ?? localUser?.email ?? "Anonymous";
        return {
            chatId,
            uuid: localUser?.uuid,
            availabilityStatus: writable(AvailabilityStatus.ONLINE),
            username,
            pictureStore: readable(undefined),
            roomName: undefined,
            playUri: undefined,
            color: undefined,
            spaceUserId: undefined,
        };
    }
}
