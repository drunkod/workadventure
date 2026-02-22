import { MapStore } from "@workadventure/store-utils";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type {
    ChatMessage,
    ChatMessageContent,
    ChatMessageReaction,
    ChatMessageType,
    ChatUser,
} from "../ChatConnection";

export class JazzChatMessage implements ChatMessage {
    id: string;
    sender: ChatUser | undefined;
    content: Writable<ChatMessageContent>;
    isMyMessage: boolean;
    isQuotedMessage: boolean | undefined = undefined;
    date: Date | null;
    quotedMessage: ChatMessage | undefined = undefined;
    type: ChatMessageType;
    reactions = new MapStore<string, ChatMessageReaction>();
    isDeleted = writable(false);
    isModified = writable(false);
    canDelete: Writable<boolean>;
    private imageObjectUrl: string | undefined;

    constructor(
        id: string,
        sender: ChatUser | undefined,
        type: ChatMessageType,
        initialContent: ChatMessageContent,
        timestamp: number,
        isMyMessage: boolean,
        private readonly onEditMessage: (messageId: string, newText: string) => Promise<void>,
        private readonly onRemoveMessage: (messageId: string) => Promise<void>
    ) {
        this.id = id;
        this.sender = sender;
        this.type = type;
        this.content = writable(initialContent);
        this.date = new Date(timestamp);
        this.isMyMessage = isMyMessage;
        this.canDelete = writable(isMyMessage);
        this.imageObjectUrl = initialContent.url;
    }

    updateContent(nextContent: ChatMessageContent, modified = false): void {
        this.content.set(nextContent);
        this.isModified.set(modified);
    }

    setImageObjectUrl(url: string | undefined): void {
        if (this.imageObjectUrl && this.imageObjectUrl !== url) {
            URL.revokeObjectURL(this.imageObjectUrl);
        }
        this.imageObjectUrl = url;
    }

    remove(): void {
        this.onRemoveMessage(this.id).catch((error) => {
            console.error("Failed to remove Jazz message", error);
        });
    }

    async edit(newContent: string): Promise<void> {
        await this.onEditMessage(this.id, newContent);
        this.updateContent({ body: newContent, url: get(this.content).url }, true);
    }

    async addReaction(_reaction: string): Promise<void> {
        return Promise.resolve();
    }

    destroy(): void {
        if (this.imageObjectUrl) {
            URL.revokeObjectURL(this.imageObjectUrl);
            this.imageObjectUrl = undefined;
        }
    }
}
