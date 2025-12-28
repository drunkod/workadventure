/**
 * Tests for Jazz Store
 * 
 * Tests the jazzStore module which provides:
 * 1. Svelte store integration for Jazz
 * 2. Initialization and cleanup functions
 * 3. Preference getters and setters
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock jazz-tools/browser to avoid browser-specific issues in tests
vi.mock('jazz-tools/browser', () => ({
    createBrowserContext: vi.fn().mockResolvedValue({
        me: {
            root: {
                preferences: {
                    requestedCameraState: false,
                    requestedMicrophoneState: false,
                },
            },
        },
        done: vi.fn(),
    }),
}));

// Mock jazz-config
vi.mock('../jazz-config', () => ({
    getJazzSyncConfig: vi.fn(() => null), // Local-only mode
}));

// Mock the schema
vi.mock('../schema', () => ({
    WaAccount: {},
    UserPreferences: {},
}));

describe('Jazz Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Stores', () => {
        it('should export jazzInitialized store', async () => {
            const { jazzInitialized } = await import('../jazzStore');
            expect(jazzInitialized).toBeDefined();
            expect(typeof jazzInitialized.subscribe).toBe('function');
        });

        it('should export jazzAccount store', async () => {
            const { jazzAccount } = await import('../jazzStore');
            expect(jazzAccount).toBeDefined();
            expect(typeof jazzAccount.subscribe).toBe('function');
        });

        it('should start with jazzInitialized as false', async () => {
            // Need to reset module state for this test
            vi.resetModules();
            const { jazzInitialized } = await import('../jazzStore');
            expect(get(jazzInitialized)).toBe(false);
        });

        it('should start with jazzAccount as null', async () => {
            vi.resetModules();
            const { jazzAccount } = await import('../jazzStore');
            expect(get(jazzAccount)).toBe(null);
        });
    });

    describe('initializeJazz', () => {
        it('should be a function', async () => {
            const { initializeJazz } = await import('../jazzStore');
            expect(typeof initializeJazz).toBe('function');
        });

        it('should return a promise', async () => {
            const { initializeJazz } = await import('../jazzStore');
            const result = initializeJazz();
            expect(result).toBeInstanceOf(Promise);
        });
    });

    describe('cleanupJazz', () => {
        it('should be a function', async () => {
            const { cleanupJazz } = await import('../jazzStore');
            expect(typeof cleanupJazz).toBe('function');
        });
    });

    describe('getJazzAccount', () => {
        it('should be a function', async () => {
            const { getJazzAccount } = await import('../jazzStore');
            expect(typeof getJazzAccount).toBe('function');
        });

        it('should return null when not initialized', async () => {
            vi.resetModules();
            const { getJazzAccount } = await import('../jazzStore');
            expect(getJazzAccount()).toBe(null);
        });
    });

    describe('getUserPreferencesStore', () => {
        it('should be a function', async () => {
            const { getUserPreferencesStore } = await import('../jazzStore');
            expect(typeof getUserPreferencesStore).toBe('function');
        });

        it('should return a subscribable store', async () => {
            const { getUserPreferencesStore } = await import('../jazzStore');
            const store = getUserPreferencesStore();
            expect(typeof store.subscribe).toBe('function');
        });
    });

    describe('getPreference', () => {
        it('should be a function', async () => {
            const { getPreference } = await import('../jazzStore');
            expect(typeof getPreference).toBe('function');
        });
    });

    describe('setPreference', () => {
        it('should be a function', async () => {
            const { setPreference } = await import('../jazzStore');
            expect(typeof setPreference).toBe('function');
        });
    });
});
