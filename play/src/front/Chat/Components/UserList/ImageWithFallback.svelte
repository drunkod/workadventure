<script lang="ts">
    import { run } from 'svelte/legacy';

    let {
        src,
        alt,
        fallback,
        classes
    } = $props();

    let currentSrc = $state();

    function handleError() {
        if (currentSrc !== fallback) {
            currentSrc = fallback;
        }
    }

    run(() => {
        currentSrc = src ?? fallback;
    });
</script>

<img class={classes} src={currentSrc} {alt} onerror={handleError} draggable="false" />
