<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        dataTestId?: string | undefined;
        id?: string | undefined;
        bgColor?: string;
        hoverColor?: string;
        textColor?: string;
        size?: "xs" | "sm" | "md" | "lg";
        extraButtonClasses?: string;
    }

    let {
        dataTestId = undefined,
        id = undefined,
        bgColor = "bg-white/20",
        hoverColor = "bg-white/30",
        textColor = "text-white",
        size = "lg",
        extraButtonClasses = ""
    }: Props = $props();

    let sizeClasses =
        $derived(size === "xs"
            ? "h-6 w-6 text-sm"
            : size === "sm"
            ? "h-8 w-8 text-base"
            : size === "md"
            ? "h-10 w-10 text-lg"
            : "h-12 w-12 text-2xl");

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function handleClick(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        dispatch("click");
    }
</script>

<button
    type="button"
    {id}
    class="{sizeClasses} p-0 flex items-center justify-center rounded backdrop-blur close-window transition-all aspect-square text-2xl {textColor} {bgColor} hover:{hoverColor} close-btn {extraButtonClasses}"
    data-testid={dataTestId}
    onclick={handleClick}
>
    <IconX />
</button>
