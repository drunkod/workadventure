<script lang="ts">
    import { floatingUiComponents } from "../../Utils/svelte-floatingui-show";
    const rest: Record<string, unknown> = {};
</script>

{#each [...$floatingUiComponents.entries()] as [key, value] (`${key}`)}
    {@const valueProps = value.props ?? {}}
    {@const action = value.action}
    {@const arrowAction = value.arrowAction}
    <div class="absolute z-[3000]" use:action>
        {#if arrowAction}
            <div use:arrowAction></div>
        {/if}
        <value.componentType {...rest} {...valueProps} />
    </div>
{/each}
