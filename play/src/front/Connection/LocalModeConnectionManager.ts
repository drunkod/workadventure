/**
 * Local Mode Connection Manager
 * 
 * Provides a connection layer for local-first operation without Pusher/Back.
 * When enabled, the frontend works entirely offline using Jazz Tools for state.
 * 
 * This replaces:
 * - ConnectionManager's room socket connections
 * - Pusher WebSocket gateway
 * - Back game logic server
 * 
 * Usage:
 *   import { localModeConnectionManager, isLocalModeEnabled } from './LocalModeConnectionManager';
 *   
 *   if (isLocalModeEnabled()) {
 *       const connection = await localModeConnectionManager.connectToRoom('/maps/starter/map.json');
 *       const mapData = await connection.loadMap();
 *   }
 */

import { LocalRoomConnection, createLocalRoomConnection } from './LocalRoomConnection';
import { initializeJazz, jazzInitialized } from '../Jazz/jazzStore';
import { get } from 'svelte/store';

/**
 * Check if local mode is enabled via environment or URL parameter
 */
export function isLocalModeEnabled(): boolean {
    // Check URL parameter first (useful for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('localMode') === 'true') {
        return true;
    }

    // Check environment variable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const envLocalMode = (window as any).env?.LOCAL_MODE_ENABLED;
    if (envLocalMode === 'true' || envLocalMode === true) {
        return true;
    }

    // Check Vite environment variable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viteLocalMode = (import.meta as any).env?.VITE_LOCAL_MODE_ENABLED;
    if (viteLocalMode === 'true' || viteLocalMode === true) {
        return true;
    }

    return false;
}

/**
 * Local Mode Connection Manager
 * Singleton instance for managing local-first connections
 */
class LocalModeConnectionManagerClass {
    private currentConnection: LocalRoomConnection | null = null;
    private initialized = false;

    /**
     * Initialize Jazz for local mode operation
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('[LocalMode] Initializing Jazz for local-first operation...');
        await initializeJazz();

        if (get(jazzInitialized)) {
            console.log('[LocalMode] ✅ Jazz initialized successfully');
        } else {
            console.log('[LocalMode] ⚠️ Jazz initialization completed with fallback mode');
        }

        this.initialized = true;
    }

    /**
     * Connect to a room/map in local mode
     * Replaces ConnectionManager.connectToRoomSocket()
     */
    async connectToRoom(mapUrl: string): Promise<LocalRoomConnection> {
        if (!this.initialized) {
            await this.initialize();
        }

        console.log('[LocalMode] Connecting to room:', mapUrl);

        // Close previous connection if exists
        if (this.currentConnection) {
            this.currentConnection.closeConnection();
        }

        // Create new local connection
        this.currentConnection = createLocalRoomConnection(mapUrl);

        return this.currentConnection;
    }

    /**
     * Get current connection
     */
    getCurrentConnection(): LocalRoomConnection | null {
        return this.currentConnection;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.currentConnection !== null;
    }

    /**
     * Disconnect from current room
     */
    disconnect(): void {
        if (this.currentConnection) {
            this.currentConnection.closeConnection();
            this.currentConnection = null;
        }
    }
}

// Singleton instance
export const localModeConnectionManager = new LocalModeConnectionManagerClass();
