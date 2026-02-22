<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { RemoteVideoTrack } from "livekit-client";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";


    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onLoadVideoElement: (event: Event) => void;
        remoteVideoTrack: RemoteVideoTrack;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onLoadVideoElement,
        remoteVideoTrack
    }: Props = $props();
    let videoElement: HTMLVideoElement = $state();
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    onMount(() => {
        remoteVideoTrack.attach(videoElement);

        if (noVideoOutputDetector) {
            noVideoOutputDetector.destroy();
        }

        noVideoOutputDetector = new NoVideoOutputDetector(
            videoElement,
            () => {
                dispatch("noVideo");
            },
            () => {
                dispatch("video");
            }
        );

        noVideoOutputDetector.expectVideoWithin5Seconds();
    });

    onDestroy(() => {
        remoteVideoTrack.detach(videoElement);

        noVideoOutputDetector?.destroy();
    });
</script>

<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    onloadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    muted={true}
></video>
