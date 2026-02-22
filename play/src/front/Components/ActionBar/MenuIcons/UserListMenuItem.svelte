<script lang="ts">
    import { onMount } from "svelte";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import UsersIcon from "../../Icons/UsersIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    interface Props {
        state?: "normal" | "active" | "forbidden" | "disabled";
    }

    // Avoid naming collision with the `$state(...)` rune.
    let { state: buttonState = "normal" }: Props = $props();

    function toggleUserList() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }
        chatVisibilityStore.set(!$chatVisibilityStore);
        navChat.switchToUserList();
    }

    let chatAvailable = $state(false);

    onMount(() => {
        gameManager
            .getChatConnection()
            .then(() => {
                chatAvailable = true;
            })
            .catch((e: unknown) => {
                console.error("Could not get chat", e);
            });
    });
</script>

<ActionBarButton
    on:click={toggleUserList}
    classList="group/btn-users hidden @sm/actions:flex"
    tooltipTitle={$LL.actionbar.help.users.title()}
    desc={$LL.actionbar.help.users.desc()}
    state={chatAvailable ? buttonState : "disabled"}
    dataTestId="user-list-button"
    disabledHelp={false}
    media="./static/Videos/UserList.mp4"
    tooltipShortcuts={["u"]}
>
    <UsersIcon />
</ActionBarButton>
