<script lang="ts">
    import { writable } from "svelte/store";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import type { VideoBox } from "../../../Space/Space";
    import AudioStream from "./AudioStream.svelte";

    interface Props {
        videoBox: VideoBox;
    }

    let { videoBox }: Props = $props();
    let streamable = $derived(videoBox.streamable);

    let muteAudioStore = $derived($streamable?.muteAudio);
    let muteAudio = $derived($muteAudioStore ?? false);

    let hasAudio = $derived($streamable?.hasAudio ?? writable(false));
</script>

{#if $streamable && ($streamable?.media.type === "webrtc" || $streamable?.media.type === "livekit") && !muteAudio && $hasAudio}
    {#await userActivationManager.waitForUserActivation()}
        <!-- waiting for user activation -->
    {:then value}
        {#if $streamable.media.streamStore}
            <AudioStream
                streamStore={$streamable.media.streamStore}
                volume={$streamable.volume}
                outputDeviceId={$speakerSelectedStore}
                isBlocked={$streamable.media.isBlocked}
                on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
            />
        {/if}
    {/await}
{/if}
