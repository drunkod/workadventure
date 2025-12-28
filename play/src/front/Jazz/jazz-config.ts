/**
 * Jazz Tools Configuration for WorkAdventure
 * 
 * This module configures Jazz for local-first state management.
 * By default, sync is disabled (local-only mode).
 */

// API key for Jazz Cloud (can be a placeholder when not syncing)
export const JAZZ_API_KEY = 'workadventure-local@localhost';

// Sync configuration - set to null for local-only mode
export const JAZZ_SYNC_CONFIG = {
    // To enable cloud sync, change to: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`
    peer: null as string | null,
    when: 'always' as const,
};

// Enable this to use Jazz Cloud sync
export function getJazzSyncConfig() {
    if (JAZZ_SYNC_CONFIG.peer) {
        return {
            peer: JAZZ_SYNC_CONFIG.peer,
            when: JAZZ_SYNC_CONFIG.when,
        };
    }
    // Local-only mode - no sync
    return undefined;
}
