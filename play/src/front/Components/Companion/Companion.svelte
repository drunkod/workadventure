<script lang="ts">
    import { onDestroy } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { PictureStore } from "../../Stores/PictureStore";

    interface Props {
        userId: number;
        placeholderSrc: string;
        width?: string;
        height?: string;
    }

    let {
        userId,
        placeholderSrc,
        width = "62px",
        height = "62px"
    }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();
    let companionWokaPictureStore: PictureStore | undefined;
    if (userId === -1) {
        companionWokaPictureStore = gameScene.CurrentPlayer.companion?.pictureStore;
    } else {
        companionWokaPictureStore = gameScene.MapPlayersByKey.getNestedStore(
            userId,
            (item) => item.companion?.pictureStore
        );
    }

    let src = $state(placeholderSrc);

    if (companionWokaPictureStore) {
        const unsubscribe = companionWokaPictureStore.subscribe((source) => {
            src = source ?? placeholderSrc;
        });

        onDestroy(unsubscribe);
    }
</script>

<img {src} alt="" draggable="false" style="--theme-width: {width}; --theme-height: {height}" />

<style>
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        height: var(--theme-height);
        margin: 0;
        padding: 0;
        position: static;
        left: 0;
        bottom: 0;
        right: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>
