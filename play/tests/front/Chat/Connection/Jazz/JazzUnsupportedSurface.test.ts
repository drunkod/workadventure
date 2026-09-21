import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";

vi.mock("../../../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: {
        getLocalUser: () => undefined,
        getChatId: () => "test-chat-id",
        getName: () => "Test User",
    },
}));

import { JazzChatConnection } from "../../../../../src/front/Chat/Connection/Jazz/JazzChatConnection";
import { JazzChatRoom } from "../../../../../src/front/Chat/Connection/Jazz/JazzChatRoom";
import type { ChatUser } from "../../../../../src/front/Chat/Connection/ChatConnection";

function currentUser(): ChatUser {
    return {
        chatId: "test-chat-id",
        availabilityStatus: readable(AvailabilityStatus.ONLINE),
        username: "Test User",
        pictureStore: readable(undefined),
        roomName: undefined,
        playUri: undefined,
        color: undefined,
        spaceUserId: undefined,
    };
}

describe("Jazz local supported surface", () => {
    it("hides the chat search entry point for Jazz", () => {
        const source = readFileSync(
            path.join(process.cwd(), "src/front/Chat/Components/ChatHeader.svelte"),
            "utf8"
        );

        expect(source).toContain('hasSearch={!isJazz && $chatStatusStore !== "OFFLINE" && !isInSpecificDiscussion}');
        expect(source).toContain('{#if !isJazz && searchActive && $chatStatusStore !== "OFFLINE"}');
    });

    it("rejects unsupported connection-level room and discovery operations", async () => {
        const connection = new JazzChatConnection({
            roomStorageKey: "test",
            defaultRoomName: "Main",
            syncMode: "local",
        });

        await expect(connection.createRoom({ name: "Nope" })).rejects.toThrow("does not support creating rooms");
        await expect(connection.createFolder({ name: "Nope" })).rejects.toThrow("does not support creating folders");
        await expect(connection.createDirectRoom("user")).rejects.toThrow("does not support direct rooms");
        await expect(connection.searchAccessibleRooms("room")).rejects.toThrow(
            "does not support shared room discovery"
        );
        await expect(connection.searchChatUsers("user")).rejects.toThrow("does not support user discovery");
        await expect(connection.joinRoom("other-room")).rejects.toThrow("does not support joining rooms");
    });

    it("rejects unsupported membership, invitation, and moderation mutations", async () => {
        const user = currentUser();
        const connectionContext = {
            currentUser: user,
            getOrCreateUser: () => user,
        };
        const room = new JazzChatRoom(connectionContext, {} as never, "main-room", "Main", "multiple");

        await expect(room.joinRoom()).rejects.toThrow("does not support joining rooms");
        await expect(room.leaveRoom()).rejects.toThrow("does not support leaving rooms");
        await expect(room.inviteUsers(["other"])).rejects.toThrow("does not support invitations");
        await expect(room.kick("other")).rejects.toThrow("does not support moderation");
        await expect(room.ban("other")).rejects.toThrow("does not support moderation");
        await expect(room.unban("other")).rejects.toThrow("does not support moderation");
        await expect(room.changePermissionLevelFor(undefined as never, undefined as never)).rejects.toThrow(
            "does not support moderation"
        );
    });

    it("rejects non-image files instead of converting them to text", async () => {
        const user = currentUser();
        const runtime = {
            sendImage: vi.fn(),
            sendText: vi.fn(),
        };
        const room = new JazzChatRoom(
            { currentUser: user, getOrCreateUser: () => user },
            runtime as never,
            "main-room",
            "Main",
            "multiple"
        );
        const files = [new File(["not an image"], "notes.txt", { type: "text/plain" })] as unknown as FileList;

        await expect(room.sendFiles(files)).rejects.toThrow("supports image files only");
        expect(runtime.sendImage).not.toHaveBeenCalled();
        expect(runtime.sendText).not.toHaveBeenCalled();
    });
});
