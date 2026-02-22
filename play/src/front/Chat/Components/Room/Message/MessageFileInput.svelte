<script lang="ts">
    import { run } from 'svelte/legacy';

    import { get } from "svelte/store";
    import { createEventDispatcher, onMount } from "svelte";
    import type { ChatRoom } from "../../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
    import { ProximityChatRoom } from "../../../Connection/Proximity/ProximityChatRoom";
    import { chatInputFocusStore } from "../../../../Stores/ChatStore";
    import { IconLoader, IconPaperclip, IconX } from "@wa-icons";

    const dispatch = createEventDispatcher<{
        fileUploaded: void;
    }>();

    let files: FileList | undefined = $state(undefined);
    interface Props {
        room: ChatRoom;
    }

    let { room }: Props = $props();
    let isProximityChatRoom = $derived(room instanceof ProximityChatRoom);


    function unselectChatMessageToReplyIfSelected() {
        if (get(selectedChatMessageToReply) !== null) {
            selectedChatMessageToReply.set(null);
        }
        dispatch("fileUploaded");
    }

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

    onMount(() => {
        // Unselect chat message to reply if the input is focused
        const input = document.getElementById("labelUpload");
        input?.click();
    });
    run(() => {
        if (files) {
            room.sendFiles(files)
                .then(() => {
                    // Infinite loop is not possible because the first thing we do in the reactive statement is test for "files" not undefined.
                    // eslint-disable-next-line svelte/infinite-reactive-loop
                    files = undefined;
                    unselectChatMessageToReplyIfSelected();
                })
                .catch((error) => console.error(error));
        }
    });
</script>

<div class="relative">
    <input
        id="upload"
        class="hidden"
        disabled={isProximityChatRoom}
        type="file"
        multiple
        bind:files
        data-testid="uploadChatCustomAsset"
        onfocusin={focusChatInput}
        onfocusout={unfocusChatInput}
    />
    <label
        id="labelUpload"
        for="upload"
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-none"
    >
        {#if files !== undefined}
            <IconLoader class="animate-spin" font-size={18} />
        {:else}
            <IconPaperclip
                class="hover:!cursor-pointer {isProximityChatRoom ? 'opacity-30 !cursor-none' : ''}"
                font-size={18}
            />
        {/if}
    </label>
    <button
        class="absolute top-0 right-0 m-1 hover:bg-white/10 cursor-pointer"
        onclick={() => unselectChatMessageToReplyIfSelected()}
    >
        <IconX class=" text-white/50 hover:text-white transition-all" font-size={16} />
    </button>
</div>
