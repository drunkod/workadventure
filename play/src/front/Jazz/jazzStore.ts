/**
 * Jazz Store Adapter for WorkAdventure
 * 
 * This module provides a Svelte store-compatible interface to Jazz CoValues.
 * Uses direct imports from jazz-tools dist to work with older moduleResolution.
 */

import { writable, get, type Writable } from 'svelte/store';
import { WaAccount, type UserPreferencesType } from './schema';
import { getJazzSyncConfig } from './jazz-config';

// Jazz context state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jazzContext: any = null;
let initPromise: Promise<void> | null = null;

// Reactive store for Jazz initialization state
export const jazzInitialized: Writable<boolean> = writable(false);

// Reactive store for current account
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jazzAccount: Writable<any> = writable(null);

/**
 * Initialize Jazz context (call once at app startup)
 */
export async function initializeJazz(): Promise<void> {
    console.log('[Jazz] initializeJazz() called');

    if (initPromise) {
        console.log('[Jazz] Already initialized or in progress, returning existing promise');
        return initPromise;
    }

    console.log('[Jazz] Starting initialization...');

    initPromise = (async () => {
        try {
            console.log('[Jazz] Step 1: Attempting dynamic import of jazz-tools/browser...');

            // Dynamic import to avoid TypeScript module resolution issues
            // @ts-ignore - TypeScript can't resolve jazz-tools/browser with moduleResolution: node
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const browserModule = await import('jazz-tools/browser') as any;

            console.log('[Jazz] Step 2: Module loaded. Available exports:', Object.keys(browserModule));

            // Handle both ESM default export and named export patterns
            const createJazzBrowserContext = browserModule.createJazzBrowserContext
                || browserModule.default?.createJazzBrowserContext;

            if (typeof createJazzBrowserContext !== 'function') {
                console.warn('[Jazz] createJazzBrowserContext not found in module. Available exports:', Object.keys(browserModule));
                throw new Error('createJazzBrowserContext is not available');
            }

            console.log('[Jazz] Step 3: createJazzBrowserContext function found');

            const syncConfig = getJazzSyncConfig();
            console.log('[Jazz] Step 4: Sync config:', syncConfig);

            // Create browser context with local storage
            const contextOptions: any = {
                AccountSchema: WaAccount,
            };

            // Jazz requires a sync config to be present, even if we want local-only behavior
            if (syncConfig?.peer) {
                contextOptions.sync = {
                    peer: syncConfig.peer,
                    when: syncConfig.when || 'always',
                };
                console.log('[Jazz] Step 5: Using sync with peer:', syncConfig.peer);
            } else {
                // Provide a dummy sync config to satisfy the library's requirement
                // Using a 'manual' sync strategy with a dummy peer prevents automatic connection attempts
                contextOptions.sync = {
                    peer: 'ws://localhost:0',
                    when: 'manual',
                };
                console.log('[Jazz] Step 5: Local-only mode (using dummy sync config)');
            }

            console.log('[Jazz] Step 6: Calling createJazzBrowserContext...');
            jazzContext = await createJazzBrowserContext(contextOptions);
            console.log('[Jazz] Step 7: Context created successfully');

            // Update stores
            if (jazzContext?.me) {
                jazzAccount.set(jazzContext.me);
                console.log('[Jazz] Step 8: Account set in store');
            }
            jazzInitialized.set(true);

            console.log('[Jazz] ✅ Initialized successfully!');
        } catch (error) {
            console.error('[Jazz] ❌ Failed to initialize:', error);
            console.warn('[Jazz] Using localStorage fallback');
            jazzInitialized.set(false);
        }
    })();

    return initPromise;
}

/**
 * Cleanup Jazz context
 */
export function cleanupJazz(): void {
    if (jazzContext?.done) {
        jazzContext.done();
    }
    jazzContext = null;
    jazzAccount.set(null);
    jazzInitialized.set(false);
}

/**
 * Get current Jazz account (synchronous)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getJazzAccount(): any {
    return get(jazzAccount);
}

/**
 * Create a reactive store for user preferences
 */
export function getUserPreferencesStore() {
    return {
        subscribe: (callback: (prefs: UserPreferencesType | null) => void) => {
            return jazzAccount.subscribe(account => {
                if (account?.root?.preferences) {
                    callback(account.root.preferences);
                } else {
                    callback(null);
                }
            });
        }
    };
}

/**
 * Get a single preference value (synchronous)
 */
export function getPreference<K extends keyof UserPreferencesType>(
    key: K
): UserPreferencesType[K] | undefined {
    const account = get(jazzAccount);
    return account?.root?.preferences?.[key];
}

/**
 * Set a single preference value
 */
export function setPreference<K extends keyof UserPreferencesType>(
    key: K,
    value: UserPreferencesType[K]
): void {
    const account = get(jazzAccount);
    if (account?.root?.preferences) {
        account.root.preferences[key] = value;
    }
}

// ========== Player State Functions (replaces WebSocket position updates) ==========

/**
 * Get current player position (synchronous)
 */
export function getPlayerPosition(): { x: number; y: number; direction: string; moving: boolean } | null {
    const account = get(jazzAccount);
    const state = account?.root?.playerState;
    if (!state) return null;
    return {
        x: state.x ?? 0,
        y: state.y ?? 0,
        direction: state.direction ?? 'down',
        moving: state.moving ?? false,
    };
}

/**
 * Set player position (replaces RoomConnection.sharePosition)
 */
export function setPlayerPosition(x: number, y: number, direction: string, moving: boolean): void {
    const account = get(jazzAccount);
    if (account?.root?.playerState?.$jazz) {
        account.root.playerState.$jazz.set('x', x);
        account.root.playerState.$jazz.set('y', y);
        account.root.playerState.$jazz.set('direction', direction);
        account.root.playerState.$jazz.set('moving', moving);
    }
}

/**
 * Create a reactive store for player position
 */
export function getPlayerPositionStore() {
    return {
        subscribe: (callback: (pos: { x: number; y: number } | null) => void) => {
            return jazzAccount.subscribe(account => {
                const state = account?.root?.playerState;
                if (state) {
                    callback({ x: state.x ?? 0, y: state.y ?? 0 });
                } else {
                    callback(null);
                }
            });
        }
    };
}

// ========== Room State Functions (replaces Pusher room management) ==========

/**
 * Get current room/map state (synchronous)
 */
export function getRoomState(): { mapUrl: string | null; viewport: { x: number; y: number; width: number; height: number } } {
    const account = get(jazzAccount);
    const state = account?.root?.roomState;
    return {
        mapUrl: state?.mapUrl ?? null,
        viewport: {
            x: state?.viewportX ?? 0,
            y: state?.viewportY ?? 0,
            width: state?.viewportWidth ?? 800,
            height: state?.viewportHeight ?? 600,
        },
    };
}

/**
 * Set current map URL (replaces ConnectionManager room handling)
 */
export function setRoomMapUrl(mapUrl: string): void {
    const account = get(jazzAccount);
    if (account?.root?.roomState?.$jazz) {
        account.root.roomState.$jazz.set('mapUrl', mapUrl);
        account.root.roomState.$jazz.set('lastJoined', new Date().toISOString());
    }
}

/**
 * Set viewport (replaces RoomConnection.setViewport)
 */
export function setViewport(x: number, y: number, width: number, height: number): void {
    const account = get(jazzAccount);
    if (account?.root?.roomState?.$jazz) {
        account.root.roomState.$jazz.set('viewportX', x);
        account.root.roomState.$jazz.set('viewportY', y);
        account.root.roomState.$jazz.set('viewportWidth', width);
        account.root.roomState.$jazz.set('viewportHeight', height);
    }
}

