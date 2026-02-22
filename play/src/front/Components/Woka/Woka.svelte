<script lang="ts">
    import { preventDefault } from 'svelte/legacy';

    interface Props {
        src: string;
        customWidth?: string | undefined;
        grayscale?: boolean;
    }

    let { src, customWidth = undefined, grayscale = false }: Props = $props();

    function noDrag() {
        return false;
    }
</script>

<img
    {src}
    alt=""
    class="noselect"
    class:grayscale
    style="    {customWidth ? `--theme-width: ${customWidth};` : ''}"
    draggable="false"
    ondragstart={preventDefault(noDrag)}
/>

<style lang="scss">
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        margin: 0;
        padding: 0;
        position: static;
        inset-inline-start: 0;
        bottom: 0;
        inset-inline-end: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>
