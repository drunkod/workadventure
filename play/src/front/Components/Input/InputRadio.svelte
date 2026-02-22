<script lang="ts">
    interface Props {
        id?: string | undefined;
        label: string;
        onChange?: any;
        disabled?: boolean;
        value: unknown;
        variant?: "contrast" | "";
        group: unknown;
        children?: import('svelte').Snippet;
    }

    let {
        id = undefined,
        label,
        onChange = () => {},
        disabled = false,
        value,
        variant = "",
        group = $bindable(),
        children
    }: Props = $props();

    const fallbackId = `input-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="flex items-center gap-2 p-2">
    <label class="inline-flex cursor-pointer relative">
        <input id={id ?? fallbackId} class="sr-only peer" type="radio" bind:group {value} onchange={onChange} {disabled} />

        <div class="input-radio input-radio-light" class:input-radio-contrast={variant === "contrast"}></div>
    </label>

    <label for={id ?? fallbackId} class="  input-label input-label-inline input-label-light text-white"
        >{label} {@render children?.()}
    </label>
</div>
