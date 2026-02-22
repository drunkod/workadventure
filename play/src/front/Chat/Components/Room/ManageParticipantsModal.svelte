<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { fade } from "svelte/transition";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import type { ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import RoomParticipant from "./RoomParticipant.svelte";
    import { IconLoader } from "@wa-icons";
    interface Props {
        isOpen: boolean;
        room: ChatRoomMembershipManagement & ChatRoomModeration;
    }

    let { isOpen, room }: Props = $props();
    const members = room.members;

    let invitations: { value: string; label: string }[] = $state([]);
    let sendingInvitationsToRoom = $state(false);
    let invitationToRoomError: string | undefined = $state(undefined);

    const hasPermissionToInvite = room.hasPermissionTo("invite");
    async function inviteUsersAndCloseModalOnSuccess() {
        try {
            sendingInvitationsToRoom = true;
            await room.inviteUsers(invitations.map((invitation) => invitation.value));
            notificationPlayingStore.playNotification($LL.chat.manageRoomUsers.sendInvitationsSuccessNotification());
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                invitationToRoomError = error.message;
            }
        } finally {
            sendingInvitationsToRoom = false;
            setTimeout(() => (invitationToRoomError = undefined), 2000);
        }
    }

    function handleSelectMatrixUserError(e: CustomEvent) {
        invitationToRoomError = e.detail.error;
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 >{$LL.chat.manageRoomUsers.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div  class="w-full flex flex-col gap-2" data-testid="inviteParticipantsModalContent">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                data-testid="roomID"
                class="text-sm text-gray-300 text-center pb-4 cursor-pointer"
                onclick={() => navigator.clipboard.writeText(room.id)}
            >
                {$LL.chat.manageRoomUsers.roomID({ roomId: room.id })}
            </div>
            {#if sendingInvitationsToRoom}
                <div class="animate-[spin_2s_linear_infinite] self-center">
                    <IconLoader font-size="2em" />
                </div>
            {:else}
                {#if invitationToRoomError}
                    <div transition:fade class="bg-red-500 p-2 rounded text-ellipsis overflow-hidden">
                        {$LL.chat.manageRoomUsers.error()} : <b><i>{invitationToRoomError}</i></b>
                    </div>
                {/if}
                <SelectMatrixUser
                    on:error={handleSelectMatrixUserError}
                    bind:value={invitations}
                    placeholder={$LL.chat.createRoom.users()}
                />
                <div class="table-container max-h-96 overflow-auto bg-white/10 rounded-lg">
                    <table class="w-full border-separate border-spacing-2 border-none">
                        <thead>
                            <tr>
                                <th class="text-center">{$LL.chat.manageRoomUsers.participants()}</th>
                                <th class="text-center">{$LL.chat.manageRoomUsers.membership()}</th>
                                <th class="text-center">{$LL.chat.manageRoomUsers.permissionLevel()}</th>
                                <th class="text-center">{$LL.chat.manageRoomUsers.actions()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each $members
                                .filter((participant) => {
                                    return (invitations || []).length > 0 ? invitations.some( (invitation) => get(participant.name).includes(invitation.label) ) : true;
                                })
                                .sort((participantA, participantB) => {
                                    return get(participantA.name).localeCompare(get(participantB.name));
                                }) as member (member.id)}
                                <RoomParticipant {member} {room} />
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/snippet}
    {#snippet action()}
    
            {#if sendingInvitationsToRoom}
                <p>{$LL.chat.createRoom.loadingCreation()}</p>
            {:else}
                <button class="btn btn-secondary flex-1 justify-center" onclick={closeModal}
                    >{$LL.chat.manageRoomUsers.buttons.cancel()}</button
                >
                <button
                    data-testid="createRoomButton"
                    class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                    disabled={invitations === undefined || invitations.length === 0 || !$hasPermissionToInvite}
                    onclick={inviteUsersAndCloseModalOnSuccess}
                    >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
                </button>
            {/if}
        
    {/snippet}
</Popup>

<style>
    /* style scroll bar */
    .table-container {
        scrollbar-width: thin;
        scrollbar-color: #888 #f1f1f1;
    }
    .table-container::-webkit-scrollbar {
        width: 2px;
    }
</style>
