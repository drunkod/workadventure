import { derived, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { localUserStoreAdapter } from "../Connection/LocalUserStoreAdapter";
import type { VideoBox } from "../Space/Space";

export const videoStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());
export const screenShareStreamStore = new ForwardableStore<Map<string, VideoBox>>(new Map<string, VideoBox>());

export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    return Array.from($videoStreamStore.values());
});

export const screenShareStreamElementsStore = derived(screenShareStreamStore, ($screenShareStreamStore) => {
    return Array.from($screenShareStreamStore.values());
});

export const volumeProximityDiscussionStore = writable(localUserStoreAdapter.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
export const askPictureInPictureActivatingStore = writable(false);
export const pictureInPictureSupportedStore = writable(true);
