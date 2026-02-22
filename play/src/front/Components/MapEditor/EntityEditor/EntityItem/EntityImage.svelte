<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconLoader, IconPhotoOff } from "@wa-icons";

    interface Props {
        classNames?: string | undefined;
        imageSource: string;
        imageAlt: string;
    }

    let { classNames = undefined, imageSource, imageAlt }: Props = $props();
    let imageElementRef: HTMLImageElement = $state();
    let imageRetry = $state(false);
    let imageError = $state(false);
    let MAX_RETRY = 10;
    let retry = 0;

    function retryImageLoading() {
        imageRetry = true;
        if (retry <= MAX_RETRY) {
            setTimeout(() => {
                imageElementRef.src = imageSource;
                retry += 1;
            }, 500);
        } else {
            imageRetry = false;
            imageError = true;
        }
    }

    const dispatch = createEventDispatcher<{
        onImageLoad: HTMLImageElement;
    }>();
</script>

{#if imageRetry}
    <div class="flex items-center justify-center flex-1" data-testid="entityImageLoader">
        <IconLoader class="animate-spin" />
    </div>
{/if}

{#if imageError}
    <div class="flex items-center justify-center flex-1" data-testid="entityImageError">
        <IconPhotoOff />
    </div>
{/if}

<img
    loading="lazy"
    draggable="false"
    class={`${classNames} ${imageRetry || imageError ? "invisible flex-[0_1_0]" : "visible"}`}
    style="image-rendering: pixelated"
    src={imageSource}
    alt={imageAlt}
    onload={() => {
        dispatch("onImageLoad", imageElementRef);
        imageError = false;
        imageRetry = false;
    }}
    bind:this={imageElementRef}
    onerror={() => retryImageLoading()}
/>
