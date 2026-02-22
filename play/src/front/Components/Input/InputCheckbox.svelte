<script lang="ts">
    interface Props {
        id?: string | undefined;
        dataTestId?: string | undefined;
        label?: string | undefined;
        onChange?: any;
        disabled?: boolean;
        value?: boolean;
        variant?: "white" | "";
        children?: import('svelte').Snippet;
        [key: string]: any
    }

    let {
        id = undefined,
        dataTestId = undefined,
        label = undefined,
        onChange = () => {},
        disabled = false,
        value = $bindable(false),
        variant = "white",
        children,
        ...rest
    } = $props<Props>();

    const fallbackId = `input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex items-center gap-2 p-2" data-testid={dataTestId}>
    <label class="inline-flex cursor-pointer relative">
        <input
            id={id ?? fallbackId}
            class="sr-only peer"
            type="checkbox"
            bind:checked={value}
            onchange={onChange}
            {...rest}
            {disabled}
        />

        <div class="input-checkbox" class:input-checkbox-white={variant === "white"}></div>
    </label>

    {#if label}
        <label for={id ?? fallbackId} class="input-label input-label-inline input-label-light text-white"
            >{label} {@render children?.()}
        </label>
    {/if}
</div>
