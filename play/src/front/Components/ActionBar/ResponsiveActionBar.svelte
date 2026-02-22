<script lang="ts">
    import { run } from 'svelte/legacy';

    import debug from "debug";
    import { onMount } from "svelte";
    import { videoStreamElementsStore } from "../../Stores/PeerStore";

    import { highlightFullScreen } from "../../Stores/ActionsCamStore";

    const logger = debug("responsive-action-bar");

    let centerPlusRightDiv: HTMLDivElement = $state();
    let rightDivContent: HTMLDivElement = $state();
    interface Props {
        rightDiv: HTMLDivElement;
        actionBarWidth: number;
        left?: import('svelte').Snippet;
        center?: import('svelte').Snippet;
        right?: import('svelte').Snippet;
    }

    let {
        rightDiv = $bindable(),
        actionBarWidth = $bindable(),
        left,
        center,
        right
    }: Props = $props();
    let centerDivWidth: number = $state();
    let leftDivWidth: number = $state();
    let leftToCenterWidth: number = $state();


    // In "wide" mode, all buttons are displayed and there is space between left and center buttons
    // In "shrunk" mode, some buttons are hidden and there is no space between left and center buttons
    // We go in "shrunk" mode when the space between left and center buttons is 0px
    // We go back in "wide" mode when all buttons are visible
    let mode: "wide" | "shrunk" = $state("wide");

    function switchToShrunkMode() {
        // Additional delay: we make sure the right bar is not touching the center bar. Why?
        // Because when resized quickly (for instance when switching from landscape to portrait), the hiddenItemsWidth
        // can suddenly hit 0px before the flexbox had time to resize the right bar to the correct size.
        // By waiting a bit, we make sure the flexbox has time to resize and the "hiddenItemsWidth" value reflects
        // the actual width of the bar.

        setTimeout(() => {
            if (leftToCenterWidth === 0) {
                logger("Switching to shrunk mode");
                mode = "shrunk";
            }
        }, 1);
    }


    let fullMenuVisible: boolean = $state();


    onMount(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    fullMenuVisible = entry.isIntersecting;
                });
            },
            {
                root: rightDiv,
                threshold: 1.0,
            }
        );

        observer.observe(rightDivContent);

        return () => {
            observer.disconnect();
        };
    });
    run(() => {
        if (fullMenuVisible) {
            logger("Switching to wide mode");
            mode = "wide";
        }
    });
    run(() => {
        if (centerPlusRightDiv)
            centerPlusRightDiv.style.minWidth = `${
                mode === "wide"
                    ? Math.min(actionBarWidth * 0.5 + centerDivWidth * 0.5, actionBarWidth - leftDivWidth)
                    : actionBarWidth - leftDivWidth
            }px`;
    });
    run(() => {
        if (centerPlusRightDiv) centerPlusRightDiv.style.maxWidth = `${actionBarWidth - leftDivWidth}px`;
    });
    run(() => {
        if (leftToCenterWidth === 0) {
            switchToShrunkMode();
        }
    });
</script>

<div
    class="@container/actions w-full z-[301] transition-all pointer-events-none bp-menu {$videoStreamElementsStore.length >
        0 && $highlightFullScreen
        ? 'hidden'
        : ''}"
>
    <div class="gap-1 @md/actions:gap-2 @xl/actions:gap-4 p-1 @md/actions:p-2 @xl/actions:p-4 screen-blocker">
        <div class="w-full flex justify-between items-center" bind:offsetWidth={actionBarWidth}>
            <!-- Left bar -->
            <div class="flex-1 flex">
                <div class="flex-none" bind:offsetWidth={leftDivWidth}>
                    {@render left?.()}
                </div>
                {#if mode === "wide"}
                    <div class="w-0 flex-1 min-w-0 flex justify-end" bind:offsetWidth={leftToCenterWidth}></div>
                {/if}
            </div>
            <!-- Center + right bar -->
            <div
                class="flex justify-between items-center"
                class:flex-none={mode === "wide"}
                class:flex-1={mode === "shrunk"}
                bind:this={centerPlusRightDiv}
            >
                <!-- Center bar -->
                <div class="flex justify-end" bind:offsetWidth={centerDivWidth}>
                    {@render center?.()}
                </div>
                <!-- Right bar -->
                <div
                    class="flex flex-row justify-end overflow-hidden"
                    class:flex-none={mode === "wide"}
                    class:flex-1={mode === "shrunk"}
                    bind:this={rightDiv}
                >
                    <div class="flex flew-row flex-none h-full" bind:this={rightDivContent}>
                        {@render right?.()}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
