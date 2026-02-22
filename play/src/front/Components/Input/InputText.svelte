<script lang="ts">
    interface Props {
        label: string;
        placeHolder?: string;
        value: string;
        onFocus?: any;
        onBlur?: any;
        onKeyPress: () => void;
        errorHelperText?: string | undefined;
        error?: boolean;
    }

    let {
        label,
        placeHolder = "",
        value = $bindable(),
        onFocus = () => {},
        onBlur = () => {},
        onKeyPress,
        errorHelperText = undefined,
        error = false
    }: Props = $props();
</script>

<div class="flex flex-col">
    <label for="input">
        {label}
    </label>
    <input
        id="input"
        type="text"
        placeholder={placeHolder}
        bind:value
        onfocus={onFocus}
        onblur={onBlur}
        onkeypress={onKeyPress}
        class:error={errorHelperText || error}
        class:!border-red-500={errorHelperText || error}
    />
    {#if errorHelperText}
        <span class="error">
            {errorHelperText}
        </span>
    {/if}
</div>
