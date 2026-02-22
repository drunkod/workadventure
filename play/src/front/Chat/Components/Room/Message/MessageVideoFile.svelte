<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatMessageContent } from "../../../Connection/ChatConnection";

    interface Props {
        content: Readable<ChatMessageContent>;
    }

    let { content }: Props = $props();
</script>

{#if $content.url !== undefined}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls class="w-full block rounded">
        <source src={$content.url} />
    </video>
{/if}
