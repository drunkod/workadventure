<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoomMember, ChatRoomMembership, ChatRoomModeration } from "../../Connection/ChatConnection";
    import { ChatPermissionLevel } from "../../Connection/ChatConnection";
    import { IconLoader, IconCheck, IconForbid, IconClock, IconPoint, IconMail, IconDoorExit } from "@wa-icons";
    interface Props {
        member: ChatRoomMember;
        room: ChatRoomModeration;
    }

    let { member, room }: Props = $props();

    let banInProgress = $state(false);
    let kickInProgress = $state(false);
    let unbanInProgress = $state(false);
    let inviteInProgress = $state(false);
    let disableModerationButton = $derived(banInProgress || kickInProgress || unbanInProgress || inviteInProgress);

    let { name, membership, id, permissionLevel } = $derived(member);

    function getTranslatedMembership(membership: ChatRoomMembership) {
        switch (membership) {
            case "join":
                return $LL.chat.manageRoomUsers.join();
            case "invite":
                return $LL.chat.manageRoomUsers.invite();
            case "ban":
                return $LL.chat.manageRoomUsers.ban();
            case "leave":
                return $LL.chat.manageRoomUsers.leave();
            default:
                return $LL.chat.manageRoomUsers.invite();
        }
    }

    const banUser = () => {
        banInProgress = true;
        room.ban(id)
            .catch((e) => {
                console.error("Failed to ban user:", e);
            })
            .finally(() => {
                banInProgress = false;
            });
    };

    const unbanUser = () => {
        unbanInProgress = true;

        room.unban(id)
            .catch((e) => {
                console.error("Failed to unban user:", e);
            })
            .finally(() => {
                unbanInProgress = false;
            });
    };

    const kickUser = () => {
        kickInProgress = true;
        room.kick(id)
            .catch((e) => {
                console.error("Failed to kick user:", e);
            })
            .finally(() => {
                kickInProgress = false;
            });
    };

    const inviteUser = () => {
        inviteInProgress = true;
        room.inviteUsers([id])
            .catch((e) => {
                console.error("Failed to invite user:", e);
            })
            .finally(() => {
                inviteInProgress = false;
            });
    };

    const getIconForMembership = (membership: ChatRoomMembership) => {
        switch (membership) {
            case "ban":
                return IconForbid;
            case "join":
                return IconCheck;
            case "invite":
                return IconMail;
            case "knock":
                return IconClock;
            case "leave":
                return IconDoorExit;
            default:
                console.error("Failed to get icon for membership :  " + membership);
                return IconPoint;
        }
    };

    function getTranslatedPermissionLevel(permission: ChatPermissionLevel) {
        switch (permission) {
            case ChatPermissionLevel.USER:
                return $LL.chat.manageRoomUsers.roles.USER();
            case ChatPermissionLevel.MODERATOR:
                return $LL.chat.manageRoomUsers.roles.MODERATOR();
            case ChatPermissionLevel.ADMIN:
                return $LL.chat.manageRoomUsers.roles.ADMIN();
        }
    }

    function onPermissionLevelChange(event: Event) {
        const target = event.target as HTMLSelectElement;

        if (!target) return;

        room.changePermissionLevelFor(member, target.value as ChatPermissionLevel).catch((e) => console.error(e));
    }

    let hasPermissionToInvite = $derived(room.hasPermissionTo("invite", member));
    let hasPermissionToKick = $derived(room.hasPermissionTo("kick", member));
    let hasPermissionToBan = $derived(room.hasPermissionTo("ban", member));

    let availableRoles = $derived(room.canModifyRoleOf($permissionLevel) ? room.getAllowedRolesToAssign() : []);

    const SvelteComponent = $derived(getIconForMembership($membership));
</script>

<tr data-testid={`${id}-participant`}>
    <td><p class="m-0 p-0 text-center text-ellipsis overflow-hidden max-w-[10rem]">{$name}</p></td>
    <td>
        <div class="flex gap-2 content-center justify-center">
            <p
                class="max-h-min m-0 ml-1 px-2 py-1 rounded-3xl min-w-[6rem] text-center content-center flex items-center justify-center border border-solid
                {$membership === 'join' ? 'bg-success-900/20 border-success-900/30' : ''}
                {$membership === 'invite' ? 'bg-warning-900/20 border-warning-900/30' : ''}
                {$membership === 'ban' || $membership === 'leave' ? 'bg-danger-900/20 border-danger-900/30' : ''}"
                data-testid={`${id}-membership`}
            >
                <SvelteComponent />
                {getTranslatedMembership($membership)}
            </p>
        </div></td
    >
    <td>
        <div class="flex items-center justify-center h-full w-full">
            <select
                value={$permissionLevel}
                onchange={onPermissionLevelChange}
                name="permissionLevel"
                id="permissionLevel"
                disabled={availableRoles.length === 0 || $membership !== "join"}
                data-testid={`${id}-permissionLevel`}
                class="border-light-purple border border-solid rounded-xl mb-0 w-full"
            >
                {#if availableRoles.length > 0}
                    {#each availableRoles as permissionLevelOption (permissionLevelOption)}
                        <option value={permissionLevelOption}
                            >{getTranslatedPermissionLevel(permissionLevelOption)}
                        </option>
                    {/each}
                {:else}
                    <option value={$permissionLevel}>{getTranslatedPermissionLevel($permissionLevel)}</option>
                {/if}
            </select>
        </div>
    </td>
    <td>
        <div class="flex gap-2 content-center justify-center">
            {#if $hasPermissionToInvite && $membership === "leave"}
                <button
                    class="max-h-min m-0 p-2 py-1 bg-success-900/20 hover:bg-success-900/50 rounded-sm"
                    disabled={$disableModerationButton}
                    onclick={inviteUser}
                    data-testid={`${id}-inviteButton`}
                >
                    {#if inviteInProgress}
                        <IconLoader class="animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.invite()}
                    {/if}
                </button>
            {/if}
            {#if $hasPermissionToKick && $membership !== "leave" && $membership !== "ban"}
                <button
                    class="max-h-min m-0 p-2 py-1 bg-warning-900/20 hover:bg-warning-900/50 rounded-sm"
                    disabled={$disableModerationButton}
                    data-testid={`${id}-kickButton`}
                    onclick={kickUser}
                >
                    {#if kickInProgress}
                        <IconLoader class="animate-spin" />
                    {:else}
                        {$LL.chat.manageRoomUsers.buttons.kick()}
                    {/if}
                </button>
            {/if}
            {#if $hasPermissionToBan}
                {#if $membership === "ban"}
                    <button
                        disabled={$disableModerationButton}
                        class="max-h-min m-0 p-2 py-1 bg-success-900/20 hover:bg-success-900/50 rounded-sm"
                        data-testid={`${id}-unbanButton`}
                        onclick={unbanUser}
                    >
                        {#if unbanInProgress}
                            <IconLoader class="animate-spin" />
                        {:else}
                            {$LL.chat.manageRoomUsers.buttons.unban()}
                        {/if}
                    </button>
                {:else}
                    <button
                        class="max-h-min m-0 p-2 py-1 bg-danger-900/20 hover:bg-danger-900/50 rounded-sm"
                        disabled={$disableModerationButton}
                        onclick={banUser}
                        data-testid={`${id}-banButton`}
                    >
                        {#if banInProgress}
                            <IconLoader class="animate-spin" />
                        {:else}
                            {$LL.chat.manageRoomUsers.buttons.ban()}
                        {/if}
                    </button>
                {/if}
            {/if}
        </div>
    </td>
</tr>
