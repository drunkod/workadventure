<script lang="ts">
    import { onDestroy } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import InfoButton from "./InfoButton.svelte";

    
    interface Props {
        id?: string | undefined;
        dataTestId?: string | undefined;
        label?: string | undefined;
        placeholder?: string;
        onChange?: any;
        onBlur?: any;
        disabled?: boolean;
        type?: "text" | "url" | "number" | "color";
        value: string | number | null | undefined;
        onClick?: any;
        variant?: "light" | "";
        size?: "xs" | "sm" | "lg" | "";
        appendSide?: "left" | "right";
        status?: "error" | "success" | "";
        errorHelperText?: string | null;
        // min, max, step are used only if type == "number"
        min?: number;
        max?: number;
        step?: number;
        onKeyPress?: any;
        onKeyDown?: (event: KeyboardEvent) => void;
        optional?: boolean;
        isValid?: boolean;
        rounded?: boolean;
        onerror?: any;
        onInput?: any;
        onFocusin?: any;
        onFocusout?: any;
        extraInputClasses?: string | undefined;
        maxlength?: number | undefined; // for text input only
        info?: import('svelte').Snippet;
        inputAppend?: import('svelte').Snippet;
        helper?: import('svelte').Snippet;
        [key: string]: any
    }

    let {
        id = undefined,
        dataTestId = undefined,
        label = undefined,
        placeholder = "",
        onChange = () => {},
        onBlur = () => {},
        disabled = false,
        type = "text",
        value = $bindable(),
        onClick = () => {},
        variant = "",
        size = "",
        appendSide = "right",
        status = "",
        errorHelperText = null,
        min = 0,
        max = 50,
        step = 0,
        onKeyPress = () => {},
        onKeyDown = () => {},
        optional = false,
        isValid = $bindable(true),
        rounded = false,
        onerror = () => {},
        onInput = () => {},
        onFocusin = (event: FocusEvent) => {},
        onFocusout = (event: FocusEvent) => {},
        extraInputClasses = undefined,
        maxlength = 524288,
        info,
        inputAppend,
        helper,
        ...rest
    } = $props<Props>();

    export function focusInput() {
        inputElement.focus();
    }
    let inputElement: HTMLInputElement = $state();
    let isComposing = false;

    function onCompositionStart() {
        isComposing = true;
    }

    function onCompositionEnd() {
        // Defer to next tick: some browsers fire keydown(Enter) after compositionend when the user
        // confirms IME conversion. If we set isComposing = false here immediately, that Enter would
        // be treated as "send" instead of "confirm"; deferring keeps the confirming Enter ignored.
        setTimeout(() => {
            isComposing = false;
        }, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter" && (event.isComposing || isComposing)) {
            return;
        }
        onKeyDown(event);
    }

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;

    function validateInput(event: Event) {
        const inputElement = event.target as HTMLInputElement;
        isValid = inputElement.checkValidity();
        if (onInput) {
            onInput();
        }
    }

    // On Firefox, blur is not called when the element is removed from the DOM while focused.
    // Let's blur it manually in this case.
    onDestroy(() => {
        if (inputElement && document.activeElement === inputElement) {
            inputElement.blur();
            inputFormFocusStore.set(false);
        }
    });
</script>

<div class="flex flex-col w-full">
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

    <div class="relative flex flex-col grow">
        {#if type === "text"}
            <input
                id={uniqueId}
                type="text"
                class="grow input-text input-icon {extraInputClasses}"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                class:rounded-full={rounded}
                {...rest}
                bind:value
                {placeholder}
                onkeypress={onKeyPress}
                onkeydown={handleKeyDown}
                oncompositionstart={onCompositionStart}
                oncompositionend={onCompositionEnd}
                onchange={onChange}
                onclick={onClick}
                oninput={validateInput}
                onfocusin={onFocusin}
                onfocusout={onFocusout}
                {onerror}
                onblur={onBlur}
                {disabled}
                bind:this={inputElement}
                {maxlength}
            />

            {#if errorHelperText}
                <p class="text-red-500 text-sm mt-1">{errorHelperText}</p>
            {/if}
        {:else if type === "url"}
            <input
                id={uniqueId}
                type="url"
                class="grow input-text input-icon"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                data-testid={dataTestId}
                bind:value
                {placeholder}
                onchange={onChange}
                onclick={onClick}
                oninput={validateInput}
                onblur={onBlur}
                min="{min}.toString()"
                {max}
                {step}
                {disabled}
            />
        {:else if type === "number"}
            <input
                id={uniqueId}
                type="number"
                class="grow input-text input-icon"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                data-testid={dataTestId}
                bind:value
                {placeholder}
                onchange={onChange}
                onclick={onClick}
                oninput={validateInput}
                onblur={onBlur}
                {min}
                {max}
                {step}
                {disabled}
            />
        {:else if type === "color"}
            <input
                id={uniqueId}
                type="color"
                class="grow input-text input-icon border-0 bg-transparent hover:bg-transparent active:bg-transparent mx-auto w-full p-0 border-none"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                data-testid={dataTestId}
                bind:value
                {placeholder}
                onchange={onChange}
                onclick={onClick}
                oninput={validateInput}
                onblur={onBlur}
                {min}
                {max}
                {step}
                {disabled}
            />{/if}
        {#if inputAppend}
            <div
                class="absolute inset-y-0 flex items-center pb-2"
                class:left-3={appendSide === "left"}
                class:right-3={appendSide === "right"}
            >
                {@render inputAppend?.()}
            </div>
        {/if}
    </div>

    {#if helper}
        <div class="flex items-center px-3 space-x-1.5 opacity-50">
            <div class="text-sm text-white grow">
                {@render helper?.()}
            </div>
        </div>
    {/if}
</div>
