<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    interface Props {
        id?: string | undefined;
        label: string;
        placeHolder?: string;
        onChange?: any;
        disabled?: boolean;
        value: string | null | undefined;
        onFocus?: any;
        onBlur?: any;
        onKeyPress: () => void;
        onClick?: any;
        optional?: boolean;
        variant?: "light" | "";
        size?: "xs" | "sm" | "lg" | "";
        height?: string;
        info?: import('svelte').Snippet;
    }

    let {
        id = undefined,
        label,
        placeHolder = "",
        onChange = () => {},
        disabled = false,
        value = $bindable(),
        onFocus = () => {},
        onBlur = () => {},
        onKeyPress,
        onClick = () => {},
        optional = false,
        variant = "",
        size = "",
        height = "h-[85px]",
        info
    }: Props = $props();

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;

    function autoResize(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
</script>

<div class="flex flex-col">
    <div class="input-label" class:hidden={!label && !info && !optional}>
        {#if label}
            <label for={uniqueId} class="relative grow">{label}</label>
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
    </div>

    <div class="relative flex flex-auto">
        <textarea
            id={uniqueId}
            class="grow input-text input-icon {height} font-sans"
            class:input-text-light={variant === "light"}
            class:input-text-xs={size === "xs"}
            class:input-text-sm={size === "sm"}
            class:input-text-lg={size === "lg"}
            bind:value
            placeholder={placeHolder}
            onkeypress={onKeyPress}
            onfocus={onFocus}
            onblur={onBlur}
            onchange={onChange}
            onclick={onClick}
            oninput={autoResize}
            {disabled}
></textarea>
    </div>
</div>
