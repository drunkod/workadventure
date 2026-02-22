<script lang="ts">
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import ListenerBox from "../../Video/ListenerBox.svelte";
    import { inExternalServiceStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import { isOnOneLine, playerMovedInTheLast10Seconds } from "../../../Stores/VideoLayoutStore";
    import PictureInPictureActionBar from "../../ActionBar/PictureInPictureActionBar.svelte";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";
    import { isListenerStore } from "../../../Stores/MediaStore";

    interface Props {
        inPictureInPicture: boolean;
    }

    let { inPictureInPicture }: Props = $props();

    let camContainer: HTMLDivElement | undefined = $state();
    let highlightScreen: HTMLDivElement | undefined = $state();
    let containerHeight = $state(0);
    let oneLineMaxHeight = $derived(containerHeight * 0.2);
</script>

{#if $proximityMeetingStore === true && !$inExternalServiceStore}
    <div
        class="presentation-layout flex pointer-events-none h-full w-full absolute mobile:mt-3"
        class:flex-col={!inPictureInPicture || $highlightedEmbedScreen == undefined}
        class:flex-row-reverse={inPictureInPicture && $highlightedEmbedScreen != undefined}
        style={inPictureInPicture && $highlightedEmbedScreen != undefined ? "height: calc(100vh - 80px);" : ""}
        bind:clientHeight={containerHeight}
    >
        {#if $streamableCollectionStore.size > 0}
            <div
                class="justify-end md:justify-center w-full relative"
                class:max-height-quarter={$isOnOneLine && !inPictureInPicture}
                class:h-full={!$isOnOneLine || inPictureInPicture}
                class:overflow-y-auto={inPictureInPicture}
                class:flex-1={inPictureInPicture && $highlightedEmbedScreen != undefined}
                bind:this={camContainer}
            >
                <CamerasContainer
                    {oneLineMaxHeight}
                    isOnOneLine={$isOnOneLine}
                    oneLineMode={inPictureInPicture ? "vertical" : "horizontal"}
                />
            </div>
        {/if}

        {#if $streamableCollectionStore.size > 0 && $highlightedEmbedScreen && !$playerMovedInTheLast10Seconds}
            <div
                id="highlighted-media"
                class="md:mb-0"
                class:flex-1={!inPictureInPicture || $highlightedEmbedScreen == undefined}
                class:flex-[4]={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:mb-8={!inPictureInPicture || $highlightedEmbedScreen == undefined}
                class:mb-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                bind:this={highlightScreen}
            >
                {#key $highlightedEmbedScreen.uniqueId}
                    <MediaBox videoBox={$highlightedEmbedScreen} />
                {/key}
            </div>
        {/if}

        {#if $activePictureInPictureStore}
            <div
                class="flex-none"
                class:fixed={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:bottom-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:left-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:right-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:w-full={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:transition-all={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:pointer-events-none={inPictureInPicture && $highlightedEmbedScreen != undefined}
                style="z-index: 20;"
            >
                <PictureInPictureActionBar />
            </div>
        {/if}

        {#if $streamableCollectionStore.size === 0 && $isListenerStore}
            <ListenerBox />
        {/if}
    </div>
{/if}

<style>
    .max-height-quarter {
        max-height: 25%;
    }
</style>
