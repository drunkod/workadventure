/**
 * Jazz Store Adapter for WorkAdventure
 * 
 * This module provides a Svelte store-compatible interface to Jazz CoValues.
 * Uses dynamic imports for browser context to work with Svelte 4 and older moduleResolution.
 */

import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import { WaAccount, type UserPreferencesType } from './schema';
import { getJazzSyncConfig } from './jazz-config';

// Jazz context manager singleton (typed as any due to dynamic import)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let contextManager: any = null;
let contextPromise: Promise<void> | null = null;

// Reactive store for Jazz initialization state
export const jazzInitialized: Writable<boolean> = writable(false);

// Reactive store for current account (typed as any for flexibility)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jazzAccount: Writable<any> = writable(null);

/**
 * Initialize Jazz context (call once at app startup)
 */
export async function initializeJazz(): Promise<void> {
    if (contextPromise) return contextPromise;

    contextPromise = (async () => {
        try {
            // Dynamic import to avoid TypeScript module resolution issues
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const browserModule = await import('jazz-tools/browser') as any;
            const { JazzBrowserContextManager } = browserModule;

            contextManager = new JazzBrowserContextManager();

            const syncConfig = getJazzSyncConfig();

            await contextManager.createContext({
                AccountSchema: WaAccount,
                sync: syncConfig ? {
                    peer: syncConfig.peer,
                    when: syncConfig.when,
                } : undefined,
            });

            // Get account and update store
            const me = contextManager.getCurrentAccount?.();
            if (me) {
                jazzAccount.set(me);
            }

            jazzInitialized.set(true);
            console.log('[Jazz] Initialized successfully');
        } catch (error) {
            console.error('[Jazz] Initialization failed:', error);
            throw error;
        }
    })();

    return contextPromise;
}

/**
 * Get current Jazz account (synchronous, may be null before init)
 */
export function getJazzAccount(): typeof WaAccount | null {
    return get(jazzAccount);
}

/**
 * Get user preferences CoValue
 * Returns a derived store that updates when preferences change
 */
export function createUserPreferencesStore(): Readable<UserPreferencesType | null> {
    return derived(jazzAccount, ($account) => {
        if (!$account) return null;
        const root = $account.root;
        if (!root) return null;
        return root.preferences as UserPreferencesType;
    });
}

// Singleton preferences store
let _userPreferencesStore: Readable<UserPreferencesType | null> | null = null;

export function getUserPreferencesStore(): Readable<UserPreferencesType | null> {
    if (!_userPreferencesStore) {
        _userPreferencesStore = createUserPreferencesStore();
    }
    return _userPreferencesStore;
}

/**
 * Helper to get a preference value (with fallback)
 */
export function getPreference<K extends keyof UserPreferencesType>(
    key: K,
    fallback: UserPreferencesType[K]
): UserPreferencesType[K] {
    const prefs = get(getUserPreferencesStore());
    if (!prefs) return fallback;
    return prefs[key] ?? fallback;
}

/**
 * Helper to set a preference value
 */
export function setPreference<K extends keyof UserPreferencesType>(
    key: K,
    value: UserPreferencesType[K]
): void {
    const prefs = get(getUserPreferencesStore());
    if (!prefs) {
        console.warn('[Jazz] Cannot set preference - not initialized');
        return;
    }
    // @ts-expect-error - Jazz $jazz API access
    prefs.$jazz.set(key, value);
}

/**
 * Cleanup Jazz context (call on app unmount if needed)
 */
export function cleanupJazz(): void {
    if (contextManager) {
        // Jazz handles cleanup internally
        contextManager = null;
        contextPromise = null;
        jazzInitialized.set(false);
        jazzAccount.set(null);
    }
}
