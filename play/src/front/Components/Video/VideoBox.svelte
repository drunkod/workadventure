<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";
    import VideoBoxOptimizer from "./VideoBoxOptimizer.svelte";

    interface Props {
        videoBox: VideoBox;
        isOnOneLine: boolean;
        oneLineMode: "vertical" | "horizontal";
        videoWidth: number;
        videoHeight: number | undefined;
        intersectionObserver: IntersectionObserver | undefined;
    }

    let {
        videoBox,
        isOnOneLine,
        oneLineMode,
        videoWidth,
        videoHeight,
        intersectionObserver
    }: Props = $props();

    const streamable = videoBox.streamable;
</script>

{#if (($highlightedEmbedScreen !== videoBox || $playerMovedInTheLast10Seconds) && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <VideoBoxOptimizer {videoBox} {isOnOneLine} {oneLineMode} {videoWidth} {videoHeight} {intersectionObserver} />
{/if}
