<script lang="ts">
    import { preventDefault, stopPropagation } from 'svelte/legacy';

    import type { ComponentType } from "svelte";
    import { createEventDispatcher } from "svelte";

    interface Props {
        IconComponent: ComponentType;
        title: string;
        dataTestId?: string | undefined;
        bg?: string;
        disabled?: boolean;
    }

    let {
        IconComponent,
        title,
        dataTestId = undefined,
        bg = "hover:bg-white/10",
        disabled = false
    }: Props = $props();
    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<button
    class="flex gap-2 items-center {bg} m-0 p-2 w-full text-sm rounded"
    data-testid={dataTestId}
    onclick={stopPropagation(preventDefault(() => dispatch("click")))}
    {disabled}
>
    <IconComponent />
    <span>{title}</span>
</button>
