<script lang="ts">
    //import { fly } from "svelte/transition";
    import { onMount, onDestroy } from "svelte";
    import type { VideoBox } from "../../Space/Space";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import VideoMediaBox from "./VideoMediaBox.svelte";

    interface Props {
        videoBox: VideoBox;
        fullScreen?: boolean;
    }

    let { videoBox, fullScreen = false }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();

    onMount(() => {
        gameScene.reposition();
    });

    onDestroy(() => {
        gameScene.reposition();
    });
</script>

<!-- Bug with transition : transition:fly={{ y: 50, duration: 150 }} -->

<div class="video-media-box pointer-events-auto media-container justify-center relative h-full w-full">
    <!-- in:fly={{ y: 50, duration: 150 }} -->
    <VideoMediaBox {videoBox} {fullScreen} />
</div>
