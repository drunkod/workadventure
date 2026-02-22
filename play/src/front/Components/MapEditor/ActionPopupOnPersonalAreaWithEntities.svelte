<script lang="ts">
    import { closeModal } from "svelte-modals";
    import PopupGeneric from "../Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";

    interface Props {
        isOpen: boolean;
        onDeleteEntities: () => void;
        onKeepEntities: () => void;
        onCancel: () => void;
    }

    let {
        isOpen,
        onDeleteEntities,
        onKeepEntities,
        onCancel
    }: Props = $props();
</script>

<PopupGeneric {isOpen}>
    {#snippet title()}
        <h1 >{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div  class="whitespace-nowrap">
            {$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.description()}
        </div>
    {/snippet}
    {#snippet action()}
    
            <button
                onclick={() => {
                onDeleteEntities();
                closeModal();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.remove()}</button
            >
            <button
                onclick={() => {
                onKeepEntities();
                closeModal();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.keep()}</button
            >
            <button
                onclick={() => {
                onCancel();
                closeModal();
            }}>{$LL.mapEditor.areaEditor.actionPopupOnPersonalAreaWithEntities.buttons.cancel()}</button
            >
        
    {/snippet}
</PopupGeneric>
