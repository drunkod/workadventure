<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    interface Props {
        label?: string | undefined;
        dataTestId?: string | undefined;
        options?: { value: string | undefined; label: string }[];
        id?: string | undefined;
        value: string | boolean | null | undefined;
        onChange?: (e: Event) => void;
        onClick?: any;
        disabled?: boolean;
        placeholder?: string;
        variant?: "light" | "";
        optional?: boolean;
        outerClass?: string | undefined;
        extraSelectClass?: string | undefined;
        info?: import('svelte').Snippet;
        children?: import('svelte').Snippet;
        helper?: import('svelte').Snippet;
        [key: string]: any
    }

    let {
        label = undefined,
        dataTestId = undefined,
        options = [],
        id = undefined,
        value = $bindable(),
        onChange = () => {},
        onClick = () => {},
        disabled = false,
        placeholder = "",
        variant = "",
        optional = false,
        outerClass = undefined,
        extraSelectClass = undefined,
        info,
        children,
        helper,
        ...rest
    } = $props<Props>();

    const fallbackId = `input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex flex-col {outerClass}">
    <div class="relative flex-grow">
        {#if label}
            <div class="input-label">
                <label for={id ?? fallbackId} class="grow font-light">{label}</label>
            </div>
        {/if}

        {#if info}
            <InfoButton>
                {@render info?.()}
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50">
                {$LL.form.optional()}
            </div>
        {/if}
        <select
            id={id ?? fallbackId}
            class="grow w-full input-select font-light pe-10 text-white {extraSelectClass}"
            class:input-select-light={variant === "light"}
            data-testid={dataTestId}
            {...rest}
            bind:value
            onchange={onChange}
            onclick={onClick}
            {placeholder}
            {disabled}
        >
            {#each options as { value: optionValue, label: optionLabel } (optionValue)}
                <option value={optionValue}>{optionLabel}</option>
            {/each}

            {@render children?.()}
        </select>
    </div>
</div>

{#if helper}
    {@render helper?.()}
{/if}
