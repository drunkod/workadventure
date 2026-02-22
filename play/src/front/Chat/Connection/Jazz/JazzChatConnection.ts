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

export interface JazzChatConnectionOptions {
    roomStorageKey: string;
    defaultRoomName: string;
    syncPeer?: string;
    apiKey?: string;
    globalRoomId?: string;
}

function normalizeStorageKey(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

export class JazzChatConnection implements ChatConnectionInterface {
    private readonly runtime = new JazzRuntime();
    private readonly roomList = new MapStore<string, JazzChatRoom>();
    private readonly usersById = new Map<string, ChatUser>();
    private readonly directRoomsByUserId = new Map<string, JazzChatRoom>();
    private readonly roomsStore = writable<JazzChatRoom[]>([]);
    private readonly directRoomsStore = writable<JazzChatRoom[]>([]);
    private readonly invitationStore = writable<JazzChatRoom[]>([]);

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
        this.connectionStatus.set("CONNECTING");
        try {
            await this.runtime.init({
                syncPeer: this.options.syncPeer,
                apiKey: this.options.apiKey,
            });

            const mainRoomId = await this.runtime.resolveRoomId(
                `wa:jazz:main:${normalizeStorageKey(this.options.roomStorageKey)}`,
                this.options.globalRoomId
            );
            const room = new JazzChatRoom(this, this.runtime, mainRoomId, this.options.defaultRoomName, "multiple");
            await room.init();
            this.roomList.set(room.id, room);
            this.roomsStore.set([room]);

            this.connectionStatus.set("ONLINE");
        } catch (error) {
            this.connectionStatus.set("ON_ERROR");
            throw error;
        }
    }

    async createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        this.roomCreationInProgress.set(true);
        try {
            const roomId = await this.runtime.createRoomId();
            const roomName = roomOptions.name ?? `Jazz room ${this.roomList.size + 1}`;
            const room = new JazzChatRoom(this, this.runtime, roomId, roomName, "multiple");
            await room.init();
            this.roomList.set(room.id, room);
            this.roomsStore.update((rooms) => [...rooms, room]);
            return { room_id: roomId };
        } finally {
            this.roomCreationInProgress.set(false);
        }
    }

    async createFolder(roomOptions: CreateRoomOptions): Promise<{ room_id: string }> {
        return this.createRoom(roomOptions);
    }

    async createDirectRoom(userChatId: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined> {
        const existing = this.getDirectRoomFor(userChatId);
        if (existing) {
            return existing;
        }

        this.roomCreationInProgress.set(true);
        try {
            const keyParts = [this.currentUser.chatId, userChatId].sort().join(":");
            const roomId = await this.runtime.resolveRoomId(
                `wa:jazz:direct:${normalizeStorageKey(this.options.roomStorageKey)}:${normalizeStorageKey(keyParts)}`
            );
            const roomName = this.getOrCreateUser(userChatId, userChatId).username ?? userChatId;
            const room = new JazzChatRoom(this, this.runtime, roomId, roomName, "direct");
            await room.init();
            this.directRoomsByUserId.set(userChatId, room);
            this.roomList.set(room.id, room);
            this.directRoomsStore.update((rooms) => [...rooms, room]);
            this.updateDirectRoomsUsers();
            return room;
        } finally {
            this.roomCreationInProgress.set(false);
        }
    }

    getDirectRoomFor(userChatId: string): (ChatRoom & ChatRoomMembershipManagement) | undefined {
        return this.directRoomsByUserId.get(userChatId);
    }

    async searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]> {
        const normalized = searchText.toLowerCase();
        const allRooms = [...get(this.roomsStore), ...get(this.directRoomsStore)];
        return allRooms
            .filter((room) => get(room.name).toLowerCase().includes(normalized))
            .map((room) => ({ id: room.id, name: get(room.name) }));
    }

    async joinRoom(roomId: string): Promise<ChatRoom | undefined> {
        const room = this.roomList.get(roomId);
        if (!room) {
            return undefined;
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
        return [];
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
