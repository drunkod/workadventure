<script lang="ts">
    interface Props {
        headerMenu?: import('svelte').Snippet;
        chatContent?: import('svelte').Snippet;
    }

    let { headerMenu, chatContent }: Props = $props();
</script>

<div class="!flex !flex-col !gap-2 !flex-1 !relative !w-auto !h-full">
    <div class="flex flex-col gap-2">
        {@render headerMenu?.()}
    </div>
    <div class="flex flex-col gap-2 flex-1 min-h-0">
        {@render chatContent?.()}
    </div>
</div>
