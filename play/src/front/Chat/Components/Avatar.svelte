<script lang="ts">
    import { getColorByString } from "../../Utils/ColorGenerator";
    import type { PictureStore } from "../../Stores/PictureStore";

    interface Props {
        pictureStore: PictureStore | undefined;
        fallbackName?: string;
        color?: string | null;
        isChatAvatar?: boolean;
    }

    let {
        pictureStore,
        fallbackName = "A",
        color = null,
        isChatAvatar = false
    }: Props = $props();

    let forceFallback = $state(false);
</script>

{#if $pictureStore && !forceFallback}
    <img
        src={$pictureStore}
        alt="User avatar"
        class="rounded-sm h-full w-full object-contain bg-white"
        draggable="false"
        style:background-color={`${color ? color : `${getColorByString(fallbackName)}`}`}
        onerror={(event) => {
            console.warn(`Failed to load avatar image for ${fallbackName}`, event);
            forceFallback = true;
        }}
    />
{:else}
    <div
        class:chatAvatar={isChatAvatar}
        class="rounded-sm h-10 w-10 text-center uppercase text-white flex items-center justify-center font-bold aspect-square"
        draggable="false"
        style:background-color={`${color ? color : getColorByString(fallbackName)}`}
    >
        {fallbackName.charAt(0)}
    </div>
{/if}
