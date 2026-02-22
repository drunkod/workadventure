import type { ChatPermissionLevel, ChatRoomMember, ChatRoomMembership } from "../ChatConnection";
import { writable } from "svelte/store";

export function createJazzChatRoomMember(id: string, name: string): ChatRoomMember {
    return {
        id,
        name: writable(name),
        membership: writable<ChatRoomMembership>("join"),
        permissionLevel: writable<ChatPermissionLevel>("ADMIN" as ChatPermissionLevel),
    };
}
