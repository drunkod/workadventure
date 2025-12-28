/**
 * Local Room Connection
 * 
 * Mock implementation of RoomConnection for local-first operation.
 * Allows the frontend to work without Pusher (The Gateway) and Back (Game Logic).
 * 
 * Features:
 * - Loads maps directly via fetch (no Pusher proxy)
 * - Stores player position in Jazz CoValues (no WebSocket)
 * - Provides fake user ID for single-player mode
 * 
 * Usage:
 *   const connection = new LocalRoomConnection('/maps/starter/map.json');
 *   const mapData = await connection.loadMap();
 *   connection.sharePosition(100, 200, 'down', true);
 */

import { setPlayerPosition, setViewport, setRoomMapUrl, getPlayerPosition, getRoomState } from '../Jazz/jazzStore';

export interface LocalMapData {
    // Minimal map structure needed for local operation
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: unknown[];
    tilesets: unknown[];
    properties?: Record<string, unknown>[];
}

export interface LocalViewport {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/**
 * Local Room Connection - works without Pusher/Back
 */
export class LocalRoomConnection {
    private readonly mapUrl: string;
    private readonly userId = 1;  // Fixed local user ID for single-player
    private readonly userUuid = 'local-user-' + Date.now();

    constructor(mapUrl: string) {
        this.mapUrl = mapUrl;
        setRoomMapUrl(mapUrl);
    }

    /**
     * Load map JSON directly (replaces Pusher proxy)
     */
    async loadMap(): Promise<LocalMapData> {
        console.log('[LocalRoomConnection] Loading map:', this.mapUrl);
        const response = await fetch(this.mapUrl);
        if (!response.ok) {
            throw new Error(`Failed to load map: ${response.status} ${response.statusText}`);
        }
        const mapData = await response.json();
        console.log('[LocalRoomConnection] Map loaded successfully');
        return mapData;
    }

    /**
     * Share player position (stores in Jazz instead of WebSocket)
     * Replaces RoomConnection.sharePosition()
     */
    sharePosition(x: number, y: number, direction: string, moving: boolean): void {
        setPlayerPosition(x, y, direction, moving);
    }

    /**
     * Set viewport (stores in Jazz instead of WebSocket)
     * Replaces RoomConnection.setViewport()
     */
    setViewport(viewport: LocalViewport): void {
        setViewport(
            viewport.left,
            viewport.top,
            viewport.right - viewport.left,
            viewport.bottom - viewport.top
        );
    }

    /**
     * Get user ID (fixed for local mode)
     */
    getUserId(): number {
        return this.userId;
    }

    /**
     * Get user UUID (generated at connection time)
     */
    getUserUuid(): string {
        return this.userUuid;
    }

    /**
     * Get current position from Jazz state
     */
    getPosition(): { x: number; y: number } | null {
        return getPlayerPosition();
    }

    /**
     * Get room state from Jazz
     */
    getRoomState() {
        return getRoomState();
    }

    /**
     * Check if connection is "active" (always true for local mode)
     */
    isConnected(): boolean {
        return true;
    }

    /**
     * Close connection (no-op for local mode)
     */
    closeConnection(): void {
        console.log('[LocalRoomConnection] Connection closed (local mode)');
    }
}

/**
 * Create a local room connection for offline operation
 */
export function createLocalRoomConnection(mapUrl: string): LocalRoomConnection {
    return new LocalRoomConnection(mapUrl);
}
