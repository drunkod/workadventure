<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconChevronDown } from "@wa-icons";

    interface Props {
        enabled?: boolean;
    }

    let { enabled = false }: Props = $props();

    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<button
    class="user-menu-btn p-0 h-5 w-5 flex items-center justify-center mr-1 rounded-sm hover:bg-white/20 right-0 top-0 bottom-0 m-auto transition-all pointer-events-auto {enabled
        ? 'bg-white/20 hover:bg-white/30'
        : ''}"
    onclick={() => dispatch("click")}
>
    <IconChevronDown stroke={2.5} font-size="20" class="aspect-ratio transition-all {enabled ? 'rotate-180' : ''}" />
</button>
