/**
 * Jazz Module Index
 * 
 * Re-exports all Jazz-related functionality for easy imports.
 * 
 * Usage:
 *   import { initializeJazz, jazzInitialized, setPlayerPosition } from '../Jazz';
 */

// Schema exports
export {
    UserPreferences,
    LocalPlayerState,
    LocalRoomState,
    WaAccountRoot,
    WaAccount,
    type UserPreferencesType,
    type LocalPlayerStateType,
    type LocalRoomStateType,
    type WaAccountType,
} from './schema';

// Config exports
export {
    JAZZ_API_KEY,
    JAZZ_SYNC_CONFIG,
    getJazzSyncConfig,
    isSyncEnabled,
} from './jazz-config';

// Store exports
export {
    jazzInitialized,
    jazzAccount,
    initializeJazz,
    cleanupJazz,
    getJazzAccount,
    getUserPreferencesStore,
    getPreference,
    setPreference,
    // Player state (replaces WebSocket position)
    getPlayerPosition,
    setPlayerPosition,
    getPlayerPositionStore,
    // Room state (replaces Pusher room management)
    getRoomState,
    setRoomMapUrl,
    setViewport,
} from './jazzStore';
