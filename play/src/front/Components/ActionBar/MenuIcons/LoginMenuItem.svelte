<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { IconUserCircle } from "@wa-icons";

    interface Props {
        first?: boolean | undefined;
        last?: boolean | undefined;
        classList?: string | undefined;
    }

    let { first = undefined, last = undefined, classList = undefined }: Props = $props();

    function goToLogin() {
        analyticsClient.login();
        window.location.href = "/login";
    }
</script>

<ActionBarButton
    label={$LL.actionbar.login()}
    state="active"
    hideIconInActionBar={true}
    on:click={goToLogin}
    {first}
    {last}
    {classList}
>
    <IconUserCircle />
</ActionBarButton>
