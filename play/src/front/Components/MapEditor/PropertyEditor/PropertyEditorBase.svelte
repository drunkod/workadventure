<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconInfoCircle } from "@wa-icons";
    interface Props {
        header?: import('svelte').Snippet;
        content?: import('svelte').Snippet;
    }

    let { header, content }: Props = $props();
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    onDestroy(() => {
        inputFormFocusStore.set(false);
    });
</script>

<div class="property-settings-container">
    <div class="header relative font-bold flex items-center flex-col gap-2 px-3">
        <div class="flex items-center justify-between w-full">
            {#if header}{@render header()}{:else}_MISSING_{/if}
            <ButtonClose
                on:click={() => {
                    dispatch("close");
                }}
                bgColor="bg-white/20"
                hoverColor="bg-white/30"
                size="sm"
            />
        </div>
        <span class="w-full bg-white/10 h-[1px] my-3"></span>
    </div>
    <div class="content">
        {#if content}{@render content()}{:else}
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.properties.noProperties()}
            </p>
        {/if}
    </div>
</div>
