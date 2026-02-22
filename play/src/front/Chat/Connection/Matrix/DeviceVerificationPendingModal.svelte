<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import ChatLoader from "../../Components/ChatLoader.svelte";
    import type { VerificationEmojiDialogProps } from "./MatrixSecurity";
    import { matrixSecurity } from "./MatrixSecurity";

    interface Props {
        isOpen: boolean;
        startVerificationPromise: Promise<VerificationEmojiDialogProps>;
        isInitiatedByMe?: boolean;
    }

    let { isOpen, startVerificationPromise, isInitiatedByMe = false }: Props = $props();

    startVerificationPromise
        .then((verificationEmojiProps) => {
            closeModal();
            matrixSecurity.openVerificationEmojiDialog(verificationEmojiProps);
        })
        .catch((error) => {
            console.error(error);
        });
</script>

<Popup {isOpen} withAction={false}>
    {#snippet title()}
        <h1 >
            {isInitiatedByMe
                ? $LL.chat.verificationEmojiDialog.titleVerifyThisDevice()
                : $LL.chat.verificationEmojiDialog.titleVerifyOtherDevice()}
        </h1>
    {/snippet}
    {#snippet content()}
        <div ><ChatLoader label={$LL.chat.verificationEmojiDialog.waitForOtherDevice()} /></div>
    {/snippet}
</Popup>
