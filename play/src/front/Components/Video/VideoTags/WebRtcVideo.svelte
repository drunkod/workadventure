<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { WebRtcStreamable } from "../../../Stores/StreamableCollectionStore";
    import InnerWebRtcVideo from "./InnerWebRtcVideo.svelte";


    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onLoadVideoElement: (event: Event) => void;
        loop?: boolean;
        media: WebRtcStreamable;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onLoadVideoElement,
        loop = false,
        media
    }: Props = $props();

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    let streamStore = media.streamStore;
    let setDimensions = media.setDimensions;
</script>

{#if $streamStore}
    {#key $streamStore}
        <InnerWebRtcVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onLoadVideoElement}
            {loop}
            stream={$streamStore}
            {setDimensions}
            on:video={() => dispatch("video")}
            on:noVideo={() => dispatch("noVideo")}
        />
    {/key}
{/if}
