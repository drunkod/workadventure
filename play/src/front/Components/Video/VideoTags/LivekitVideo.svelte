<svelte:options immutable={true} />

<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { RemoteVideoTrack } from "livekit-client";
    import { createEventDispatcher } from "svelte";
    import InnerLivekitVideo from "./InnerLivekitVideo.svelte";

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();


    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onLoadVideoElement: (event: Event) => void;
        remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onLoadVideoElement,
        remoteVideoTrack
    }: Props = $props();
</script>

{#if $remoteVideoTrack}
    {#key $remoteVideoTrack}
        <InnerLivekitVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onLoadVideoElement}
            remoteVideoTrack={$remoteVideoTrack}
            on:video={() => dispatch("video")}
            on:noVideo={() => dispatch("noVideo")}
        />
    {/key}
{/if}
