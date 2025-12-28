/**
 * Tests for LocalUserStoreAdapter
 * 
 * Tests the Jazz-backed LocalUserStore adapter with localStorage fallback.
 * These tests verify that:
 * 1. When Jazz is not initialized, localStorage is used as fallback
 * 2. When Jazz is initialized, values are read from Jazz first
 * 3. Values are written to both Jazz and localStorage
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { writable, get } from 'svelte/store';

// Mock the Jazz module before importing the adapter
vi.mock('../../Jazz', () => {
    const jazzInitialized = writable(false);
    const jazzAccount = writable<unknown>(null);

    return {
        jazzInitialized,
        jazzAccount,
    };
});

// Mock environment variables
vi.mock('../../Enum/EnvironmentVariable', () => ({
    PEER_VIDEO_RECOMMENDED_BANDWIDTH: 250,
    PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH: 1000,
}));

// Import after mocking
import { localUserStoreAdapter } from '../LocalUserStoreAdapter';
import { jazzInitialized, jazzAccount } from '../../Jazz';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
})();

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('LocalUserStoreAdapter', () => {
    beforeEach(() => {
        // Reset localStorage mock
        localStorageMock.clear();
        vi.clearAllMocks();

        // Reset Jazz state
        (jazzInitialized as ReturnType<typeof writable>).set(false);
        (jazzAccount as ReturnType<typeof writable>).set(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Camera State', () => {
        it('should return true when localStorage and Jazz are empty', () => {
            const result = localUserStoreAdapter.getRequestedCameraState();
            expect(result).toBe(true);
        });

        it('should read from localStorage when Jazz is not initialized', () => {
            localStorage.setItem('requestedCameraStateKey', 'true');

            const result = localUserStoreAdapter.getRequestedCameraState();
            expect(result).toBe(true);
        });

        it('should write to localStorage when setting camera state', () => {
            localUserStoreAdapter.setRequestedCameraState(true);

            expect(localStorage.setItem).toHaveBeenCalledWith('requestedCameraStateKey', 'true');
        });

        it('should read false from localStorage when value is "false"', () => {
            localStorage.setItem('requestedCameraStateKey', 'false');

            const result = localUserStoreAdapter.getRequestedCameraState();
            expect(result).toBe(false);
        });
    });

    describe('Microphone State', () => {
        it('should return true when localStorage and Jazz are empty', () => {
            const result = localUserStoreAdapter.getRequestedMicrophoneState();
            expect(result).toBe(true);
        });

        it('should read from localStorage when Jazz is not initialized', () => {
            localStorage.setItem('requestedMicrophoneStateKey', 'true');

            const result = localUserStoreAdapter.getRequestedMicrophoneState();
            expect(result).toBe(true);
        });

        it('should write to localStorage when setting microphone state', () => {
            localUserStoreAdapter.setRequestedMicrophoneState(true);

            expect(localStorage.setItem).toHaveBeenCalledWith('requestedMicrophoneStateKey', 'true');
        });
    });

    describe('Audio Settings', () => {
        it('should return default volume of 1 when not set', () => {
            const result = localUserStoreAdapter.getAudioPlayerVolume();
            expect(result).toBe(1);
        });

        it('should read volume from localStorage', () => {
            localStorage.setItem('audioVolume', '0.5');

            const result = localUserStoreAdapter.getAudioPlayerVolume();
            expect(result).toBe(0.5);
        });

        it('should write volume to localStorage', () => {
            localUserStoreAdapter.setAudioPlayerVolume(0.75);

            expect(localStorage.setItem).toHaveBeenCalledWith('audioVolume', '0.75');
        });

        it('should return false for muted state by default', () => {
            const result = localUserStoreAdapter.getAudioPlayerMuted();
            expect(result).toBe(false);
        });

        it('should read muted state from localStorage', () => {
            localStorage.setItem('audioMute', 'true');

            const result = localUserStoreAdapter.getAudioPlayerMuted();
            expect(result).toBe(true);
        });
    });

    describe('UI Preferences', () => {
        it('should return false for fullscreen by default', () => {
            const result = localUserStoreAdapter.getFullscreen();
            expect(result).toBe(false);
        });

        it('should write fullscreen to localStorage', () => {
            localUserStoreAdapter.setFullscreen(true);

            expect(localStorage.setItem).toHaveBeenCalledWith('fullscreen', 'true');
        });

        it('should return false for blockAudio by default', () => {
            const result = localUserStoreAdapter.getBlockAudio();
            expect(result).toBe(false);
        });

        it('should return false for forceCowebsiteTrigger by default', () => {
            const result = localUserStoreAdapter.getForceCowebsiteTrigger();
            expect(result).toBe(false);
        });

        it('should return false for ignoreFollowRequests by default', () => {
            const result = localUserStoreAdapter.getIgnoreFollowRequests();
            expect(result).toBe(false);
        });

        it('should return false for decreaseAudioPlayerVolumeWhileTalking by default (localStorage not set)', () => {
            const result = localUserStoreAdapter.getDecreaseAudioPlayerVolumeWhileTalking();
            expect(result).toBe(false);
        });

        it('should return false for disableAnimations by default', () => {
            const result = localUserStoreAdapter.getDisableAnimations();
            expect(result).toBe(false);
        });
    });

    describe('Privacy Preferences', () => {
        it('should return true for allowPictureInPicture by default', () => {
            const result = localUserStoreAdapter.getAllowPictureInPicture();
            expect(result).toBe(true);
        });

        it('should return true for chatSounds by default', () => {
            const result = localUserStoreAdapter.getChatSounds();
            expect(result).toBe(true);
        });

        it('should read chatSounds from localStorage', () => {
            localStorage.setItem('chatSounds', 'false');

            const result = localUserStoreAdapter.getChatSounds();
            expect(result).toBe(false);
        });
    });

    describe('Video Quality', () => {
        it('should return default video bandwidth when not set', () => {
            const result = localUserStoreAdapter.getVideoBandwidth();
            // Default is PEER_VIDEO_RECOMMENDED_BANDWIDTH which is mocked to 250
            expect(result).toBe(250);
        });

        it('should read video bandwidth from localStorage', () => {
            localStorage.setItem('videoBandwidth', '500');

            const result = localUserStoreAdapter.getVideoBandwidth();
            expect(result).toBe(500);
        });

        it('should handle "unlimited" video bandwidth', () => {
            localStorage.setItem('videoBandwidth', 'unlimited');

            const result = localUserStoreAdapter.getVideoBandwidth();
            expect(result).toBe('unlimited');
        });

        it('should write video bandwidth to localStorage', () => {
            localUserStoreAdapter.setVideoBandwidth(750);

            expect(localStorage.setItem).toHaveBeenCalledWith('videoBandwidth', '750');
        });
    });

    describe('Screen Share Quality', () => {
        it('should return default screen share bandwidth when not set', () => {
            const result = localUserStoreAdapter.getScreenShareBandwidth();
            // Default is PEER_SCREEN_SHARE_RECOMMENDED_BANDWIDTH which is mocked to 1000
            expect(result).toBe(1000);
        });

        it('should read screen share bandwidth from localStorage', () => {
            localStorage.setItem('screenShareBandwidth', '2000');

            const result = localUserStoreAdapter.getScreenShareBandwidth();
            expect(result).toBe(2000);
        });

        it('should handle "unlimited" screen share bandwidth', () => {
            localStorage.setItem('screenShareBandwidth', 'unlimited');

            const result = localUserStoreAdapter.getScreenShareBandwidth();
            expect(result).toBe('unlimited');
        });
    });

    describe('Sound Preferences', () => {
        it('should return "ding" as default bubble sound', () => {
            const result = localUserStoreAdapter.getBubbleSound();
            expect(result).toBe('ding');
        });

        it('should read bubble sound from localStorage', () => {
            localStorage.setItem('bubbleSound', 'wobble');

            const result = localUserStoreAdapter.getBubbleSound();
            expect(result).toBe('wobble');
        });

        it('should write bubble sound to localStorage', () => {
            localUserStoreAdapter.setBubbleSound('wobble');

            expect(localStorage.setItem).toHaveBeenCalledWith('bubbleSound', 'wobble');
        });
    });

    describe('Volume Proximity Discussion', () => {
        it('should return 1 as default volume', () => {
            const result = localUserStoreAdapter.getVolumeProximityDiscussion();
            expect(result).toBe(1);
        });

        it('should read from localStorage', () => {
            localStorage.setItem('volumeProximityDiscussion', '0.7');

            const result = localUserStoreAdapter.getVolumeProximityDiscussion();
            expect(result).toBe(0.7);
        });

        it('should write to localStorage', () => {
            localUserStoreAdapter.setVolumeProximityDiscussion(0.5);

            expect(localStorage.setItem).toHaveBeenCalledWith('volumeProximityDiscussion', '0.5');
        });
    });

    describe('Background Preferences', () => {
        it('should return "none" as default background mode', () => {
            const result = localUserStoreAdapter.getBackgroundMode();
            expect(result).toBe('none');
        });

        it('should read background mode from localStorage', () => {
            localStorage.setItem('backgroundMode', 'blur');

            const result = localUserStoreAdapter.getBackgroundMode();
            expect(result).toBe('blur');
        });

        it('should write background mode to localStorage', () => {
            localUserStoreAdapter.setBackgroundMode('image');

            expect(localStorage.setItem).toHaveBeenCalledWith('backgroundMode', 'image');
        });

        it('should return 15 as default blur amount', () => {
            const result = localUserStoreAdapter.getBackgroundBlurAmount();
            expect(result).toBe(15);
        });

        it('should read blur amount from localStorage', () => {
            localStorage.setItem('backgroundBlurAmount', '20');

            const result = localUserStoreAdapter.getBackgroundBlurAmount();
            expect(result).toBe(20);
        });

        it('should return undefined for background image by default', () => {
            const result = localUserStoreAdapter.getBackgroundImage();
            expect(result).toBeUndefined();
        });

        it('should read background image from localStorage', () => {
            localStorage.setItem('backgroundImage', 'https://example.com/image.jpg');

            const result = localUserStoreAdapter.getBackgroundImage();
            expect(result).toBe('https://example.com/image.jpg');
        });

        it('should return undefined for background video by default', () => {
            const result = localUserStoreAdapter.getBackgroundVideo();
            expect(result).toBeUndefined();
        });
    });

    describe('Emoji Favorites', () => {
        it('should return undefined when no favorites are set', () => {
            const result = localUserStoreAdapter.getEmojiFavorite();
            expect(result).toBeUndefined();
        });

        it('should read emoji favorites from localStorage as Map', () => {
            const favorites = { '1': { emoji: '👍', name: 'thumbs up' }, '2': { emoji: '❤️', name: 'heart' } };
            localStorage.setItem('emojiFavorite', JSON.stringify(favorites));

            const result = localUserStoreAdapter.getEmojiFavorite();
            expect(result).toBeInstanceOf(Map);
            expect(result?.get(1)).toEqual({ emoji: '👍', name: 'thumbs up' });
            expect(result?.get(2)).toEqual({ emoji: '❤️', name: 'heart' });
        });

        it('should write emoji favorites to localStorage as JSON', () => {
            const map = new Map<number, { emoji: string; name: string }>();
            map.set(1, { emoji: '👍', name: 'thumbs up' });
            map.set(2, { emoji: '❤️', name: 'heart' });

            localUserStoreAdapter.setEmojiFavorite(map);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'emojiFavorite',
                JSON.stringify({ '1': { emoji: '👍', name: 'thumbs up' }, '2': { emoji: '❤️', name: 'heart' } })
            );
        });
    });

    describe('Help State', () => {
        it('should return false for helpCameraSettingsShown by default', () => {
            const result = localUserStoreAdapter.getHelpCameraSettingsShown();
            expect(result).toBe(false);
        });

        it('should read helpCameraSettingsShown from localStorage', () => {
            localStorage.setItem('helpCameraSettingsShown', '1');

            const result = localUserStoreAdapter.getHelpCameraSettingsShown();
            expect(result).toBe(true);
        });

        it('should set helpCameraSettingsShown to 1', () => {
            localUserStoreAdapter.setHelpCameraSettingsShown();

            expect(localStorage.setItem).toHaveBeenCalledWith('helpCameraSettingsShown', '1');
        });
    });

    describe('Character Textures', () => {
        it('should return null when no textures are set', () => {
            const result = localUserStoreAdapter.getCharacterTextures();
            expect(result).toBeNull();
        });

        it('should read character textures from localStorage', () => {
            const textures = ['texture1', 'texture2', 'texture3'];
            localStorage.setItem('characterTextures', JSON.stringify(textures));

            const result = localUserStoreAdapter.getCharacterTextures();
            expect(result).toEqual(textures);
        });

        it('should write character textures to localStorage', () => {
            const textures = ['texture1', 'texture2'];
            localUserStoreAdapter.setCharacterTextures(textures);

            expect(localStorage.setItem).toHaveBeenCalledWith('characterTextures', JSON.stringify(textures));
        });

        it('should return null for invalid texture data', () => {
            localStorage.setItem('characterTextures', JSON.stringify({ invalid: 'data' }));

            const result = localUserStoreAdapter.getCharacterTextures();
            expect(result).toBeNull();
        });
    });

    describe('Companion', () => {
        it('should return null when no companion is set', () => {
            const result = localUserStoreAdapter.getCompanionTextureId();
            expect(result).toBeNull();
        });

        it('should read companion texture id from localStorage', () => {
            localStorage.setItem('companion', JSON.stringify('cat_companion'));

            const result = localUserStoreAdapter.getCompanionTextureId();
            expect(result).toBe('cat_companion');
        });

        it('should write companion texture id to localStorage', () => {
            localUserStoreAdapter.setCompanionTextureId('dog_companion');

            expect(localStorage.setItem).toHaveBeenCalledWith('companion', JSON.stringify('dog_companion'));
        });

        it('should return false for wasCompanionSet when not set', () => {
            const result = localUserStoreAdapter.wasCompanionSet();
            expect(result).toBe(false);
        });

        it('should return true for wasCompanionSet when companion is set', () => {
            localStorage.setItem('companion', JSON.stringify('cat_companion'));

            const result = localUserStoreAdapter.wasCompanionSet();
            expect(result).toBe(true);
        });

        it('should return null for empty string companion', () => {
            localStorage.setItem('companion', JSON.stringify(''));

            const result = localUserStoreAdapter.getCompanionTextureId();
            expect(result).toBeNull();
        });
    });
});

describe('LocalUserStoreAdapter with Jazz initialized', () => {
    const mockJazzPreferences = {
        requestedCameraState: true,
        requestedMicrophoneState: false,
        audioPlayerVolume: 0.8,
        bubbleSound: 'wobble',
        backgroundMode: 'blur',
        volumeProximityDiscussion: 0.6,
        $jazz: {
            set: vi.fn(),
        },
    };

    const mockAccountWithPrefs = {
        root: {
            preferences: mockJazzPreferences,
        },
    };

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();

        // Initialize Jazz with mock account
        (jazzInitialized as ReturnType<typeof writable>).set(true);
        (jazzAccount as ReturnType<typeof writable>).set(mockAccountWithPrefs);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should read camera state from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getRequestedCameraState();
        expect(result).toBe(true);
    });

    it('should read microphone state from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getRequestedMicrophoneState();
        expect(result).toBe(false);
    });

    it('should read audio volume from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getAudioPlayerVolume();
        expect(result).toBe(0.8);
    });

    it('should read bubble sound from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getBubbleSound();
        expect(result).toBe('wobble');
    });

    it('should read background mode from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getBackgroundMode();
        expect(result).toBe('blur');
    });

    it('should read volumeProximityDiscussion from Jazz when initialized', () => {
        const result = localUserStoreAdapter.getVolumeProximityDiscussion();
        expect(result).toBe(0.6);
    });

    it('should write to both Jazz and localStorage when setting values', () => {
        localUserStoreAdapter.setRequestedCameraState(false);

        // Should call Jazz $jazz.set
        expect(mockJazzPreferences.$jazz.set).toHaveBeenCalledWith('requestedCameraState', false);

        // Should also write to localStorage as backup
        expect(localStorage.setItem).toHaveBeenCalledWith('requestedCameraStateKey', 'false');
    });

    it('should write bubble sound to both Jazz and localStorage', () => {
        localUserStoreAdapter.setBubbleSound('ding');

        expect(mockJazzPreferences.$jazz.set).toHaveBeenCalledWith('bubbleSound', 'ding');
        expect(localStorage.setItem).toHaveBeenCalledWith('bubbleSound', 'ding');
    });
});
