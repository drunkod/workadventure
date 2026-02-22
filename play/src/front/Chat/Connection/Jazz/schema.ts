import type { ChatMessageContent, ChatMessageType } from "../ChatConnection";

export type JazzSchema = {
    create: (value: unknown, owner?: unknown) => unknown;
    subscribe: (
        id: string,
        resolve: unknown,
        callback: (value: JazzLoadedList | undefined) => void
    ) => (() => void) | { unsubscribe: () => void };
};

export type JazzLoadedItem = {
    $jazz: {
        id: string;
        owner: unknown;
        set: (key: string, value: unknown) => void;
    };
    kind?: unknown;
    text?: unknown;
    senderId?: unknown;
    senderName?: unknown;
    createdAt?: unknown;
    image?: unknown;
    fileName?: unknown;
    [key: string]: unknown;
};

export type JazzLoadedList = JazzLoadedItem[] & {
    $isLoaded: boolean;
    $jazz: {
        id: string;
        owner: unknown;
        push: (...items: JazzLoadedItem[]) => number;
        remove: (...indexes: number[]) => JazzLoadedItem[];
        waitForSync?: (options?: unknown) => Promise<void>;
    };
};

export type JazzSchemaCo = {
    map: (shape: Record<string, unknown>) => JazzSchema;
    list: (item: unknown) => JazzSchema;
    optional: (value: unknown) => unknown;
    plainText: () => unknown;
    image: () => unknown;
};

export type JazzSchemaZ = {
    string: () => { optional: () => unknown };
    number: () => unknown;
    enum: (values: string[]) => unknown;
};

export function createJazzSchemas(co: JazzSchemaCo, z: JazzSchemaZ): { messageSchema: JazzSchema; roomSchema: JazzSchema } {
    const messageSchema = co.map({
        kind: z.enum(["text", "image"]),
        text: co.plainText(),
        senderId: z.string(),
        senderName: z.string(),
        createdAt: z.number(),
        image: co.optional(co.image()),
        fileName: z.string().optional(),
    });
    const roomSchema = co.list(messageSchema);
    return { messageSchema, roomSchema };
}

type JazzToChatMessageInput = {
    kind: unknown;
    text: unknown;
    imageUrl?: string;
};

export function mapJazzMessageToChatMessage(input: JazzToChatMessageInput): {
    type: ChatMessageType;
    content: ChatMessageContent;
} {
    const body =
        typeof input.text === "string" ? input.text : input.text !== null && input.text !== undefined ? String(input.text) : "";
    const isImageMessage = input.kind === "image" || (!!input.imageUrl && input.kind !== "text");
    if (isImageMessage && input.imageUrl) {
        return {
            type: "image",
            content: {
                body,
                url: input.imageUrl,
            },
        };
    }

    return {
        type: "text",
        content: {
            body,
            url: undefined,
        },
    };
}
