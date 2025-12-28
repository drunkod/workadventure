/**
 * Jazz Tools Configuration for WorkAdventure
 * 
 * This module configures Jazz for local-first state management.
 * With Jazz Cloud sync enabled, multiple players can see each other.
 */

// API key for Jazz Cloud (use email for dev, real key for production)
export const JAZZ_API_KEY = 'workadventure-local@localhost';

// Sync configuration - Enable Jazz Cloud for multi-player
export const JAZZ_SYNC_CONFIG = {
    // Jazz Cloud peer for multi-player sync
    peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`,
    when: 'always' as const,
};

// Get sync config for Jazz initialization
export function getJazzSyncConfig() {
    return {
        peer: JAZZ_SYNC_CONFIG.peer,
        when: JAZZ_SYNC_CONFIG.when,
    };
}

// Check if sync is enabled
export function isSyncEnabled(): boolean {
    return JAZZ_SYNC_CONFIG.peer !== null;
}

