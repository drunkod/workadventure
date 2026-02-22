<!-- https://lihautan.com/notes/svelte-lazy-load/ -->
<script lang="ts">
    import { run } from 'svelte/legacy';

    import type { ComponentType } from "svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        onload: void;
        loaded: void;
        error: void;
    }>();

    interface Props {
        when?: boolean;
        component: () => Promise<{ default: ComponentType }>;
        [key: string]: any
    }

    let { when = false, component, ...rest }: Props = $props();

    let loading: Promise<{ default: ComponentType }> | null = $state(null);


    function load() {
        loading = component();
        dispatch("onload");
        loading
            .then(() => {
                dispatch("loaded");
            })
            .catch(() => {
                dispatch("error");
            });
    }
    run(() => {
        if (when) {
            load();
        }
    });
</script>

{#if when}
    {#await loading then result}
        {@const Component = result?.default}
        {#if Component}
            <Component {...rest} />
        {/if}
    {/await}
{/if}
