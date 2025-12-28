/**
 * LocalUserStore Adapter for Jazz Tools
 * 
 * This adapter provides a Jazz-backed implementation of LocalUserStore.
 * It maintains the same API surface as the original LocalUserStore,
 * allowing gradual migration with localStorage fallback.
 */

import { get } from 'svelte/store';
import { jazzAccount, jazzInitialized } from '../Jazz';
import { PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH, PEER_VIDEO_RECOMMENDED_BANDWIDTH } from '../Enum/EnvironmentVariable';

// Storage keys (matching LocalUserStore)
const requestedCameraStateKey = 'requestedCameraStateKey';
const requestedMicrophoneStateKey = 'requestedMicrophoneStateKey';
const audioPlayerVolumeKey = 'audioVolume';
const audioPlayerMuteKey = 'audioMute';
const fullscreenKey = 'fullscreen';
const blockAudioKey = 'blockAudio';
const forceCowebsiteTriggerKey = 'forceCowebsiteTrigger';
const ignoreFollowRequestsKey = 'ignoreFollowRequests';
const decreaseAudioPlayerVolumeWhileTalkingKey = 'decreaseAudioPlayerVolumeWhileTalking';
const allowPictureInPictureKey = 'allowPictureInPicture';
const chatSoundsKey = 'chatSounds';
const helpCameraSettingsShownKey = 'helpCameraSettingsShown';
const disableAnimationsKey = 'disableAnimations';
const bubbleSoundKey = 'bubbleSound';
const volumeProximityDiscussionKey = 'volumeProximityDiscussion';

// Type for Jazz preferences with $jazz API
interface JazzPrefs {
    requestedCameraState: boolean;
    requestedMicrophoneState: boolean;
    audioPlayerVolume: number;
    audioPlayerMuted: boolean;
    fullscreen: boolean;
    blockAudio: boolean;
    forceCowebsiteTrigger: boolean;
    ignoreFollowRequests: boolean;
    decreaseAudioPlayerVolumeWhileTalking: boolean;
    disableAnimations: boolean;
    allowPictureInPicture: boolean;
    chatSounds: boolean;
    helpCameraSettingsShown: boolean;
    videoQuality?: number;
    screenShareQuality?: number;
    bubbleSound?: string;
    backgroundMode?: string;
    backgroundBlurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
    volumeProximityDiscussion?: number;
    emojiFavoriteJson?: string;
    characterTexturesJson?: string;
    companionTextureId?: string;
    $jazz: {
        set: (key: string, value: unknown) => void;
    };
}

/**
 * Get Jazz preferences CoMap if available
 */
function getJazzPreferences(): JazzPrefs | null {
    if (!get(jazzInitialized)) return null;
    const account = get(jazzAccount);
    if (!account) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root = (account as any).root;
    if (!root) return null;
    return root.preferences ?? null;
}

/**
 * LocalUserStore Adapter - Jazz-backed with localStorage fallback
 * 
 * Methods follow the pattern:
 * - GET: Try Jazz first, fall back to localStorage
 * - SET: Write to both Jazz and localStorage (localStorage as backup)
 */
class LocalUserStoreAdapter {
    // ========== Camera/Microphone State ==========

    getRequestedCameraState(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.requestedCameraState ?? true;
        }
        return JSON.parse(localStorage.getItem(requestedCameraStateKey) || 'true');
    }

    setRequestedCameraState(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('requestedCameraState', value);
        }
        localStorage.setItem(requestedCameraStateKey, JSON.stringify(value));
    }

    getRequestedMicrophoneState(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.requestedMicrophoneState ?? true;
        }
        return JSON.parse(localStorage.getItem(requestedMicrophoneStateKey) || 'true');
    }

    setRequestedMicrophoneState(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('requestedMicrophoneState', value);
        }
        localStorage.setItem(requestedMicrophoneStateKey, JSON.stringify(value));
    }

    // ========== Audio Settings ==========

    getAudioPlayerVolume(): number {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.audioPlayerVolume ?? 1;
        }
        return parseFloat(localStorage.getItem(audioPlayerVolumeKey) || '1');
    }

    setAudioPlayerVolume(value: number): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('audioPlayerVolume', value);
        }
        localStorage.setItem(audioPlayerVolumeKey, '' + value);
    }

    getAudioPlayerMuted(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.audioPlayerMuted ?? false;
        }
        return localStorage.getItem(audioPlayerMuteKey) === 'true';
    }

    setAudioPlayerMuted(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('audioPlayerMuted', value);
        }
        localStorage.setItem(audioPlayerMuteKey, value.toString());
    }

    // ========== UI Preferences ==========

    getFullscreen(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.fullscreen ?? false;
        }
        return localStorage.getItem(fullscreenKey) === 'true';
    }

    setFullscreen(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('fullscreen', value);
        }
        localStorage.setItem(fullscreenKey, value.toString());
    }

    getBlockAudio(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.blockAudio ?? false;
        }
        return localStorage.getItem(blockAudioKey) === 'true';
    }

    setBlockAudio(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('blockAudio', value);
        }
        localStorage.setItem(blockAudioKey, value.toString());
    }

    getForceCowebsiteTrigger(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.forceCowebsiteTrigger ?? false;
        }
        return localStorage.getItem(forceCowebsiteTriggerKey) === 'true';
    }

    setForceCowebsiteTrigger(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('forceCowebsiteTrigger', value);
        }
        localStorage.setItem(forceCowebsiteTriggerKey, value.toString());
    }

    getIgnoreFollowRequests(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.ignoreFollowRequests ?? false;
        }
        return localStorage.getItem(ignoreFollowRequestsKey) === 'true';
    }

    setIgnoreFollowRequests(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('ignoreFollowRequests', value);
        }
        localStorage.setItem(ignoreFollowRequestsKey, value.toString());
    }

    getDecreaseAudioPlayerVolumeWhileTalking(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.decreaseAudioPlayerVolumeWhileTalking ?? true;
        }
        return localStorage.getItem(decreaseAudioPlayerVolumeWhileTalkingKey) === 'true';
    }

    setDecreaseAudioPlayerVolumeWhileTalking(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('decreaseAudioPlayerVolumeWhileTalking', value);
        }
        localStorage.setItem(decreaseAudioPlayerVolumeWhileTalkingKey, value.toString());
    }

    getDisableAnimations(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.disableAnimations ?? false;
        }
        return localStorage.getItem(disableAnimationsKey) === 'true';
    }

    setDisableAnimations(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('disableAnimations', value);
        }
        localStorage.setItem(disableAnimationsKey, value.toString());
    }

    // ========== Notification & Privacy ==========

    getAllowPictureInPicture(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.allowPictureInPicture ?? true;
        }
        return localStorage.getItem(allowPictureInPictureKey) !== 'false';
    }

    setAllowPictureInPicture(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('allowPictureInPicture', value);
        }
        localStorage.setItem(allowPictureInPictureKey, value.toString());
    }

    getChatSounds(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.chatSounds ?? true;
        }
        return localStorage.getItem(chatSoundsKey) !== 'false';
    }

    setChatSounds(value: boolean): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('chatSounds', value);
        }
        localStorage.setItem(chatSoundsKey, value.toString());
    }

    // ========== Help Flags ==========

    getHelpCameraSettingsShown(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.helpCameraSettingsShown ?? false;
        }
        return localStorage.getItem(helpCameraSettingsShownKey) === '1';
    }

    setHelpCameraSettingsShown(): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('helpCameraSettingsShown', true);
        }
        localStorage.setItem(helpCameraSettingsShownKey, '1');
    }

    // ========== Video Quality ==========

    getVideoBandwidth(): number | 'unlimited' {
        const prefs = getJazzPreferences();
        if (prefs && prefs.videoQuality !== undefined) {
            const val = prefs.videoQuality;
            return val === -1 ? 'unlimited' : val;
        }
        const value = localStorage.getItem('videoBandwidth');
        if (!value) return PEER_VIDEO_RECOMMENDED_BANDWIDTH;
        if (value === 'unlimited') return value;
        return parseInt(value);
    }

    setVideoBandwidth(value: number | 'unlimited'): void {
        const prefs = getJazzPreferences();
        const numValue = value === 'unlimited' ? -1 : value;
        if (prefs) {
            prefs.$jazz.set('videoQuality', numValue);
        }
        localStorage.setItem('videoBandwidth', value.toString());
    }

    getScreenShareBandwidth(): number | 'unlimited' {
        const prefs = getJazzPreferences();
        if (prefs && prefs.screenShareQuality !== undefined) {
            const val = prefs.screenShareQuality;
            return val === -1 ? 'unlimited' : val;
        }
        const value = localStorage.getItem('screenShareBandwidth');
        if (!value) return PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH;
        if (value === 'unlimited') return value;
        return parseInt(value);
    }

    setScreenShareBandwidth(value: number | 'unlimited'): void {
        const prefs = getJazzPreferences();
        const numValue = value === 'unlimited' ? -1 : value;
        if (prefs) {
            prefs.$jazz.set('screenShareQuality', numValue);
        }
        localStorage.setItem('screenShareBandwidth', value.toString());
    }

    // ========== Sound Preferences ==========

    getBubbleSound(): 'ding' | 'wobble' {
        const prefs = getJazzPreferences();
        if (prefs && prefs.bubbleSound) {
            return prefs.bubbleSound as 'ding' | 'wobble';
        }
        const value = localStorage.getItem(bubbleSoundKey);
        if (value === 'wobble') return 'wobble';
        return 'ding';
    }

    setBubbleSound(value: 'ding' | 'wobble'): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('bubbleSound', value);
        }
        localStorage.setItem(bubbleSoundKey, value);
    }

    getVolumeProximityDiscussion(): number {
        const prefs = getJazzPreferences();
        if (prefs && prefs.volumeProximityDiscussion !== undefined) {
            return prefs.volumeProximityDiscussion;
        }
        return parseFloat(localStorage.getItem(volumeProximityDiscussionKey) || '1');
    }

    setVolumeProximityDiscussion(value: number): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('volumeProximityDiscussion', value);
        }
        localStorage.setItem(volumeProximityDiscussionKey, `${value}`);
    }

    // ========== Background Preferences ==========

    getBackgroundMode(): string {
        const prefs = getJazzPreferences();
        if (prefs && prefs.backgroundMode) {
            return prefs.backgroundMode;
        }
        return localStorage.getItem('backgroundMode') || 'none';
    }

    setBackgroundMode(value: string): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('backgroundMode', value);
        }
        localStorage.setItem('backgroundMode', value);
    }

    getBackgroundBlurAmount(): number {
        const prefs = getJazzPreferences();
        if (prefs && prefs.backgroundBlurAmount !== undefined) {
            return prefs.backgroundBlurAmount;
        }
        const value = localStorage.getItem('backgroundBlurAmount');
        return value ? parseFloat(value) : 15;
    }

    setBackgroundBlurAmount(value: number): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('backgroundBlurAmount', value);
        }
        localStorage.setItem('backgroundBlurAmount', value.toString());
    }

    getBackgroundImage(): string | undefined {
        const prefs = getJazzPreferences();
        if (prefs && prefs.backgroundImage) {
            return prefs.backgroundImage;
        }
        return localStorage.getItem('backgroundImage') ?? undefined;
    }

    setBackgroundImage(value: string): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('backgroundImage', value);
        }
        localStorage.setItem('backgroundImage', value);
    }

    getBackgroundVideo(): string | undefined {
        const prefs = getJazzPreferences();
        if (prefs && prefs.backgroundVideo) {
            return prefs.backgroundVideo;
        }
        return localStorage.getItem('backgroundVideo') ?? undefined;
    }

    setBackgroundVideo(value: string): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('backgroundVideo', value);
        }
        localStorage.setItem('backgroundVideo', value);
    }

    // ========== Emoji Favorites ==========

    getEmojiFavorite(): Map<number, { emoji: string; name: string }> | undefined {
        const prefs = getJazzPreferences();
        if (prefs && prefs.emojiFavoriteJson) {
            try {
                const obj = JSON.parse(prefs.emojiFavoriteJson);
                const map = new Map<number, { emoji: string; name: string }>();
                for (const [key, value] of Object.entries(obj)) {
                    map.set(parseInt(key), value as { emoji: string; name: string });
                }
                return map;
            } catch {
                // Fall through to localStorage
            }
        }
        const stored = localStorage.getItem('emojiFavorite');
        if (stored) {
            try {
                const obj = JSON.parse(stored);
                const map = new Map<number, { emoji: string; name: string }>();
                for (const [key, value] of Object.entries(obj)) {
                    map.set(parseInt(key), value as { emoji: string; name: string });
                }
                return map;
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    setEmojiFavorite(map: Map<number, { emoji: string; name: string }>): void {
        const obj: Record<string, { emoji: string; name: string }> = {};
        map.forEach((value, key) => {
            obj[key.toString()] = value;
        });
        const json = JSON.stringify(obj);

        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('emojiFavoriteJson', json);
        }
        localStorage.setItem('emojiFavorite', json);
    }

    // ========== Character/Woka Selection ==========

    setCharacterTextures(textureIds: string[]): void {
        const json = JSON.stringify(textureIds);
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('characterTexturesJson', json);
        }
        localStorage.setItem('characterTextures', json);
    }

    getCharacterTextures(): string[] | null {
        const prefs = getJazzPreferences();
        if (prefs && prefs.characterTexturesJson) {
            try {
                const value = JSON.parse(prefs.characterTexturesJson);
                return this.areCharacterTexturesValid(value) ? value : null;
            } catch {
                // Fall through to localStorage
            }
        }
        const stored = localStorage.getItem('characterTextures');
        if (stored) {
            try {
                const value = JSON.parse(stored);
                return this.areCharacterTexturesValid(value) ? value : null;
            } catch {
                return null;
            }
        }
        return null;
    }

    // Helper to validate character textures array
    private areCharacterTexturesValid(value: unknown): value is string[] {
        return Array.isArray(value) && value.every(item => typeof item === 'string');
    }

    // ========== Companion Selection ==========

    setCompanionTextureId(textureId: string | null): void {
        const prefs = getJazzPreferences();
        if (prefs) {
            prefs.$jazz.set('companionTextureId', textureId ?? undefined);
        }
        localStorage.setItem('companion', JSON.stringify(textureId));
    }

    getCompanionTextureId(): string | null {
        const prefs = getJazzPreferences();
        if (prefs && prefs.companionTextureId !== undefined) {
            return prefs.companionTextureId || null;
        }
        const stored = localStorage.getItem('companion');
        if (stored) {
            try {
                const companion = JSON.parse(stored);
                if (typeof companion !== 'string' || companion === '') {
                    return null;
                }
                return companion;
            } catch {
                return null;
            }
        }
        return null;
    }

    wasCompanionSet(): boolean {
        const prefs = getJazzPreferences();
        if (prefs) {
            return prefs.companionTextureId !== undefined;
        }
        return localStorage.getItem('companion') !== null;
    }
}

export const localUserStoreAdapter = new LocalUserStoreAdapter();

