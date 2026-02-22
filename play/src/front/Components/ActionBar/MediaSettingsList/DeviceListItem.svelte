<script lang="ts">
    import { preventDefault, stopPropagation } from 'svelte/legacy';

    import type { ComponentType, SvelteComponent } from "svelte";
    import { StringUtils } from "../../../Utils/StringUtils";
    import { IconCheck } from "@wa-icons";

    interface Props {
        label: string;
        isSelected: boolean;
        icon: ComponentType<SvelteComponent>;
        onClick: () => void;
    }

    let {
        label,
        isSelected,
        icon,
        onClick
    }: Props = $props();
</script>

<button
    class="group flex items-center relative z-10 p-1 overflow-hidden rounded {isSelected
        ? 'bg-secondary'
        : 'hover:bg-white/10'}"
    onclick={stopPropagation(preventDefault(onClick))}
>
    {#if isSelected}
        {@const SvelteComponent_1 = icon}
        <div class="h-full aspect-square flex items-center justify-center rounded-md me-2">
            <SvelteComponent_1 font-size="20" fillColor="fill-white" />
        </div>
    {/if}

    <div
        class="grow text-left text-sm text-ellipsis overflow-hidden whitespace-nowrap {isSelected
            ? 'opacity-100'
            : 'opacity-80 group-hover:opacity-100'}"
        title={StringUtils.normalizeDeviceName(label)}
    >
        {StringUtils.normalizeDeviceName(label)}
    </div>

    {#if isSelected}
        <IconCheck font-size="20" />
    {/if}
</button>
