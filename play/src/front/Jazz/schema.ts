/**
 * Jazz Schema for WorkAdventure
 * 
 * Defines CoValue schemas for local-first state management.
 * These replace localStorage-based state with reactive, persistent CoValues.
 */

import { co, z } from 'jazz-tools';

/**
 * User Preferences - persisted settings that survive page reloads
 * Mirrors fields from LocalUserStore that are user-configurable
 * 
 * Note: characterTextures is stored as JSON string since Jazz CoMaps
 * don't directly support array primitive fields with Zod.
 */
export const UserPreferences = co.map({
    // Identity
    name: z.optional(z.string()),
    // Stored as JSON string: '["texture1", "texture2"]'
    characterTexturesJson: z.optional(z.string()),
    companionTextureId: z.optional(z.string()),
    playerCharacterIndex: z.optional(z.number()),

    // Camera/Mic state
    requestedCameraState: z.boolean(),
    requestedMicrophoneState: z.boolean(),

    // Audio settings
    audioPlayerVolume: z.number(),
    audioPlayerMuted: z.boolean(),

    // Video quality (bandwidth in kbps)
    videoQuality: z.number(),
    screenShareQuality: z.number(),

    // UI preferences
    fullscreen: z.boolean(),
    blockAudio: z.boolean(),
    forceCowebsiteTrigger: z.boolean(),
    ignoreFollowRequests: z.boolean(),
    decreaseAudioPlayerVolumeWhileTalking: z.boolean(),
    disableAnimations: z.boolean(),

    // Notification and privacy
    notificationPermission: z.optional(z.string()),
    allowPictureInPicture: z.boolean(),
    chatSounds: z.boolean(),

    // Language preference
    locale: z.optional(z.string()),

    // Sidebar widths
    chatSideBarWidth: z.optional(z.number()),
    mapEditorSideBarWidth: z.optional(z.number()),

    // Sound preference: 'ding' or 'wobble'
    bubbleSound: z.optional(z.string()),

    // Background transformation settings
    backgroundMode: z.optional(z.string()), // 'none' | 'blur' | 'image' | 'video'
    backgroundBlurAmount: z.optional(z.number()),
    backgroundImage: z.optional(z.string()),
    backgroundVideo: z.optional(z.string()),

    // Proximity discussion volume (0-1)
    volumeProximityDiscussion: z.optional(z.number()),

    // Emoji favorites stored as JSON: '{"1":{"emoji":"👍","name":"thumbs up"},...}'
    emojiFavoriteJson: z.optional(z.string()),

    // Help shown flags
    helpCameraSettingsShown: z.boolean(),
});

export type UserPreferencesType = co.loaded<typeof UserPreferences>;

/**
 * Local Player State - replaces WebSocket position updates
 * Stores player position and movement state locally via Jazz
 */
export const LocalPlayerState = co.map({
    x: z.number(),
    y: z.number(),
    direction: z.string(),  // 'up' | 'down' | 'left' | 'right'
    moving: z.boolean(),
    wokaTextureId: z.optional(z.string()),
});

export type LocalPlayerStateType = co.loaded<typeof LocalPlayerState>;

/**
 * Local Room State - replaces Pusher room/map management
 * Stores current map URL and viewport state locally
 */
export const LocalRoomState = co.map({
    mapUrl: z.optional(z.string()),
    lastJoined: z.optional(z.string()),  // ISO timestamp
    viewportX: z.number(),
    viewportY: z.number(),
    viewportWidth: z.number(),
    viewportHeight: z.number(),
});

export type LocalRoomStateType = co.loaded<typeof LocalRoomState>;

/**
 * WorkAdventure Account Root - container for all user data
 * Now includes player state and room state for local-first operation
 */
export const WaAccountRoot = co.map({
    preferences: UserPreferences,
    playerState: LocalPlayerState,
    roomState: LocalRoomState,
});

/**
 * WorkAdventure Account - extends Jazz Account with app-specific data
 */
export const WaAccount = co
    .account({
        root: WaAccountRoot,
        profile: co.profile(),
    })
    .withMigration((account) => {
        // Initialize root with default preferences if not exists
        if (!account.$jazz.has('root')) {
            account.$jazz.set('root', {
                preferences: {
                    requestedCameraState: false,
                    requestedMicrophoneState: false,
                    audioPlayerVolume: 1,
                    audioPlayerMuted: false,
                    videoQuality: 250,
                    screenShareQuality: 1000,
                    fullscreen: false,
                    blockAudio: false,
                    forceCowebsiteTrigger: false,
                    ignoreFollowRequests: false,
                    decreaseAudioPlayerVolumeWhileTalking: true,
                    disableAnimations: false,
                    allowPictureInPicture: false,
                    chatSounds: true,
                    helpCameraSettingsShown: false,
                },
                playerState: {
                    x: 0,
                    y: 0,
                    direction: 'down',
                    moving: false,
                },
                roomState: {
                    viewportX: 0,
                    viewportY: 0,
                    viewportWidth: 800,
                    viewportHeight: 600,
                },
            });
        }
    });

export type WaAccountType = co.loaded<typeof WaAccount>;

