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
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // Dynamic import to avoid TypeScript module resolution issues
            // Import from the actual dist path that exists
            // @ts-ignore - TypeScript can't resolve jazz-tools/browser with moduleResolution: node
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const browserModule = await import('jazz-tools/browser') as any;
            const { createBrowserContext } = browserModule;

            const syncConfig = getJazzSyncConfig();

            // Create browser context with local storage
            jazzContext = await createBrowserContext({
                AccountSchema: WaAccount,
                sync: syncConfig ? {
                    peer: syncConfig.peer,
                    when: syncConfig.when,
                } : undefined,
            });

            // Update stores
            if (jazzContext?.me) {
                jazzAccount.set(jazzContext.me);
            }
            jazzInitialized.set(true);

            console.log('[Jazz] Initialized successfully');
        } catch (error) {
            console.warn('[Jazz] Failed to initialize, using localStorage fallback:', error);
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
