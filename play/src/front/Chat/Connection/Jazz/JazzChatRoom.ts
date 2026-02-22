import { SearchableArrayStore } from "@workadventure/store-utils";
import type { Readable, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { chatVisibilityStore } from "../../../Stores/ChatStore";
import type { PictureStore } from "../../../Stores/PictureStore";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import type {
    ChatPermissionLevel,
    ChatRoom,
    ChatRoomMember,
    ChatRoomMembership,
    ChatRoomMembershipManagement,
    ChatRoomModeration,
    ChatRoomNotificationControl,
    ChatUser,
    ModerationAction,
} from "../ChatConnection";
import { JazzRuntime } from "./JazzRuntime";
import { JazzChatMessage } from "./JazzChatMessage";
import { createJazzChatRoomMember } from "./JazzChatRoomMember";
import { mapJazzMessageToChatMessage, type JazzLoadedItem, type JazzLoadedList } from "./schema";

type TypingMember = {
    id: string;
    name: string | null;
    pictureStore: PictureStore;
};

export type JazzChatConnectionContext = {
    currentUser: ChatUser;
    getOrCreateUser: (chatId: string, username: string) => ChatUser;
};

function toSafeString(value: unknown, fallback = ""): string {
    if (typeof value === "string") {
        return value;
    }
    if (value !== null && value !== undefined) {
        return String(value);
    }
    return fallback;
}

function toSafeNumber(value: unknown, fallback = Date.now()): number {
    return typeof value === "number" ? value : fallback;
}

export class JazzChatRoom implements ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration, ChatRoomNotificationControl {
    readonly id: string;
    readonly name: Writable<string>;
    readonly type: "direct" | "multiple";
    readonly hasUnreadMessages = writable(false);
    readonly unreadNotificationCount = writable(0);
    readonly pictureStore: PictureStore = readable(undefined);
    readonly messages = new SearchableArrayStore<string, JazzChatMessage>((message) => message.id);
    readonly hasPreviousMessage = writable(false);
    readonly isEncrypted = writable(false);
    readonly typingMembers: Writable<TypingMember[]> = writable([]);
    readonly isRoomFolder = false;
    readonly myMembership = writable<ChatRoomMembership>("join");
    readonly members: Writable<ChatRoomMember[]>;
    readonly areNotificationsMuted = writable(false);
    lastMessageTimestamp = 0;
    private syncVersion = 0;
    private unsubscribeRoom: (() => void) | undefined;

    constructor(
        private readonly connection: JazzChatConnectionContext,
        private readonly runtime: JazzRuntime,
        id: string,
        roomName: string,
        type: "direct" | "multiple"
    ) {
        this.id = id;
        this.name = writable(roomName);
        this.type = type;
        this.members = writable([
            createJazzChatRoomMember(this.connection.currentUser.chatId, this.connection.currentUser.username ?? "You"),
        ]);
    }

    async init(): Promise<void> {
        this.unsubscribeRoom = this.runtime.subscribeRoom(this.id, (room) => {
            void this.syncMessages(room);
        });
    }

    async destroy(): Promise<void> {
        this.unsubscribeRoom?.();
        this.unsubscribeRoom = undefined;
        this.clearMessages();
    }

    sendMessage(message: string): void {
        const text = message.trim();
        if (!text) {
            return;
        }
        this.runtime
            .sendText(this.id, {
                text,
                senderId: this.connection.currentUser.chatId,
                senderName: this.connection.currentUser.username ?? "Anonymous",
                createdAt: Date.now(),
            })
            .catch((error) => {
                console.error("Failed to send Jazz text message", error);
            });
    }

    async sendFiles(files: FileList): Promise<void> {
        for (const file of Array.from(files)) {
            if (file.type.startsWith("image/")) {
                await this.runtime.sendImage(this.id, file, {
                    text: file.name,
                    senderId: this.connection.currentUser.chatId,
                    senderName: this.connection.currentUser.username ?? "Anonymous",
                    createdAt: Date.now(),
                });
            } else {
                await this.runtime.sendText(this.id, {
                    text: `[file] ${file.name} (only image sharing is enabled in Jazz phase 1)`,
                    senderId: this.connection.currentUser.chatId,
                    senderName: this.connection.currentUser.username ?? "Anonymous",
                    createdAt: Date.now(),
                });
            }
        }
    }

    setTimelineAsRead(): void {
        this.hasUnreadMessages.set(false);
        this.unreadNotificationCount.set(0);
    }

    loadMorePreviousMessages(): Promise<void> {
        return Promise.resolve();
    }

    startTyping(): Promise<object> {
        return Promise.resolve({});
    }

    stopTyping(): Promise<object> {
        return Promise.resolve({});
    }

    joinRoom(): Promise<void> {
        this.myMembership.set("join");
        return Promise.resolve();
    }

    leaveRoom(): Promise<void> {
        this.myMembership.set("leave");
        return Promise.resolve();
    }

    muteNotification(): Promise<void> {
        this.areNotificationsMuted.set(true);
        return Promise.resolve();
    }

    unmuteNotification(): Promise<void> {
        this.areNotificationsMuted.set(false);
        return Promise.resolve();
    }

    inviteUsers(_userIds: string[]): Promise<void> {
        return Promise.resolve();
    }

    hasPermissionTo(_action: ModerationAction, _member?: ChatRoomMember): Readable<boolean> {
        return readable(false);
    }

    hasPermissionForRoomStateEvent(
        _eventType: Parameters<ChatRoomModeration["hasPermissionForRoomStateEvent"]>[0]
    ): Readable<boolean> {
        return readable(false);
    }

    kick(_userID: string): Promise<void> {
        return Promise.resolve();
    }

    ban(_userID: string): Promise<void> {
        return Promise.resolve();
    }

    unban(_userID: string): Promise<void> {
        return Promise.resolve();
    }

    changePermissionLevelFor(_member: ChatRoomMember, _permissionLevel: ChatPermissionLevel): Promise<void> {
        return Promise.resolve();
    }

    getAllowedRolesToAssign(): ChatPermissionLevel[] {
        return [];
    }

    canModifyRoleOf(_permissionLevel?: ChatPermissionLevel): boolean {
        return false;
    }

    private async syncMessages(room: JazzLoadedList | undefined): Promise<void> {
        if (!room || !room.$isLoaded) {
            return;
        }

        const syncVersion = ++this.syncVersion;
        const previousLastMessageId = this.messages.length > 0 ? this.messages[this.messages.length - 1]?.id : undefined;
        const isRoomVisible = get(selectedRoomStore)?.id === this.id && get(chatVisibilityStore);

        const nextMessages = await Promise.all(room.map((item) => this.buildMessage(item)));
        if (syncVersion !== this.syncVersion) {
            nextMessages.forEach((message) => message.destroy());
            return;
        }

        this.clearMessages();
        this.messages.push(...nextMessages);
        this.lastMessageTimestamp = nextMessages[nextMessages.length - 1]?.date?.getTime() ?? this.lastMessageTimestamp;

        const nextLastMessage = nextMessages[nextMessages.length - 1];
        const isNewRemoteMessage =
            nextLastMessage !== undefined &&
            nextLastMessage.id !== previousLastMessageId &&
            !nextLastMessage.isMyMessage &&
            !isRoomVisible;

        if (isNewRemoteMessage) {
            const unreadCount = get(this.unreadNotificationCount) + 1;
            this.unreadNotificationCount.set(unreadCount);
            this.hasUnreadMessages.set(unreadCount > 0);
        } else if (isRoomVisible) {
            this.setTimelineAsRead();
        }
    }

    private async buildMessage(item: JazzLoadedItem): Promise<JazzChatMessage> {
        const senderId = toSafeString(item.senderId, "unknown");
        const senderName = toSafeString(item.senderName, senderId);
        const imageDefinition = item.image;
        const kindFromPayload = toSafeString(item.kind, imageDefinition ? "image" : "text");
        const kind = kindFromPayload === "image" ? "image" : "text";
        const createdAt = toSafeNumber(item.createdAt, Date.now());
        const isMyMessage = senderId === this.connection.currentUser.chatId;
        const sender = this.connection.getOrCreateUser(senderId, senderName);

        let imageUrl: string | undefined;

        if (kind === "image") {
            imageUrl = await this.runtime.resolveImageUrl(imageDefinition);
        }

        const messageProjection = mapJazzMessageToChatMessage({
            kind: item.kind,
            text: item.text,
            imageUrl,
        });

        const message = new JazzChatMessage(
            item.$jazz.id || uuidv4(),
            sender,
            messageProjection.type,
            messageProjection.content,
            createdAt,
            isMyMessage,
            (messageId, newText) => this.runtime.editMessage(this.id, messageId, newText),
            (messageId) => this.runtime.removeMessage(this.id, messageId)
        );
        message.setImageObjectUrl(messageProjection.content.url);
        return message;
    }

    private clearMessages(): void {
        this.messages.forEach((message) => message.destroy());
        this.messages.clear();
    }
}
