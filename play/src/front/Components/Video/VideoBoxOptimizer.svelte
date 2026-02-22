<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount } from "svelte";
    import MediaBox from "../Video/MediaBox.svelte";
    import type { VideoBox } from "../../Space/Space";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";
    import type { TokenRemovalHandle } from "../../Utils/TokenBucket";
    import { videoBoxVisibilityTokenBucket } from "./VideoBoxVisibilityTokenBucket";

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

    let isVisible = $state(false);
    let videoBoxElement: HTMLDivElement | undefined = $state();

    let orderStore = $derived(videoBox.displayOrder);

    let isFirst = $derived($orderStore === 0);

    let isLast = $derived($orderStore === $oneLineStreamableCollectionStore.length - 1);

    onMount(() => {
        if (!videoBoxElement) {
            return;
        }

        let tokenRemovalHandle: TokenRemovalHandle | undefined = undefined;

        // Attach the visibility callback to the element
        const observableElement = videoBoxElement as ObservableElement;
        observableElement.visibilityCallback = (visibility: boolean) => {
            // When the visibility changes, we don't set isVisible directly to true when visibility is true.
            // Instead, we request a token from the token bucket to control how many video boxes can be visible at the same time.
            // This is a security to avoid browser crashes. In our experience (Chrome + Ubuntu), requesting too many video elements at the same time
            // can lead to browser crash (if you scroll fast over a lot of video boxes).
            if (visibility === true) {
                tokenRemovalHandle = videoBoxVisibilityTokenBucket.removeToken(() => {
                    isVisible = true;
                    tokenRemovalHandle = undefined;
                });
            } else {
                if (tokenRemovalHandle) {
                    // If we are waiting for visibility to become true, but this is not done yet, cancel it.
                    tokenRemovalHandle.cancel();
                    tokenRemovalHandle = undefined;
                } else {
                    isVisible = false;
                }
            }
        };

        return () => {
            if (videoBoxElement) {
                intersectionObserver?.unobserve(videoBoxElement);
            }
        };
    });

    let oldIntersectionObserver: IntersectionObserver | undefined = $state(undefined);

    run(() => {
        if (videoBoxElement && oldIntersectionObserver !== intersectionObserver) {
            oldIntersectionObserver?.unobserve(videoBoxElement);
            oldIntersectionObserver = intersectionObserver;
            intersectionObserver?.observe(videoBoxElement);
            if (!intersectionObserver) {
                isVisible = true;
            }
        }
    });
</script>

<div
    bind:this={videoBoxElement}
    style={`order: ${$orderStore}; width: ${videoWidth}px; max-width: ${videoWidth}px;${
        videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
    }`}
    class={` overflow-hidden
    ${
        isOnOneLine
            ? oneLineMode === "horizontal"
                ? `pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box ${isFirst ? "ml-auto" : ""} ${
                      isLast ? "mr-auto" : ""
                  }`
                : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
            : "pointer-events-auto shrink-0 camera-box"
    }`}
    class:aspect-video={videoHeight === undefined}
>
    {#if isVisible}
        <MediaBox {videoBox} />
    {/if}
</div>
