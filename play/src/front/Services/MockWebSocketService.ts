/**
 * Mock WebSocket Service
 * 
 * Simulates WebSocket functionality using Jazz for state sync.
 * Replaces Pusher WebSocket (port 3001) for local-first operation.
 * 
 * Features:
 * - Player movement events via Jazz sync
 * - Room join/leave events
 * - Simple message passing between clients
 * 
 * Usage:
 *   mockWebSocketService.connect('room-123');
 *   mockWebSocketService.onPlayerMoved((player) => console.log(player));
 *   mockWebSocketService.sendPosition(100, 200, 'down', true);
 */

import { writable, get, type Writable } from 'svelte/store';
import { setPlayerPosition, getPlayerPosition } from '../Jazz/jazzStore';

export interface MockPlayer {
    id: string;
    name: string;
    x: number;
    y: number;
    direction: string;
    moving: boolean;
}

export interface MockRoomEvent {
    type: 'playerJoined' | 'playerLeft' | 'playerMoved' | 'message';
    playerId: string;
    data?: unknown;
}

type PlayerMovedCallback = (player: MockPlayer) => void;
type RoomEventCallback = (event: MockRoomEvent) => void;

class MockWebSocketService {
    private connected = false;
    private roomId: string | null = null;
    private localPlayerId = 'local-' + Date.now().toString(36);
    private localPlayerName = 'Player';

    // Stores for reactive updates
    public readonly playersStore: Writable<Map<string, MockPlayer>> = writable(new Map());
    public readonly eventsStore: Writable<MockRoomEvent[]> = writable([]);

    // Callbacks
    private playerMovedCallbacks: PlayerMovedCallback[] = [];
    private roomEventCallbacks: RoomEventCallback[] = [];

    /**
     * Connect to a room (mock - just sets state)
     */
    connect(roomId: string, playerName?: string): void {
        console.log('[MockWebSocket] Connecting to room:', roomId);
        this.roomId = roomId;
        this.connected = true;

        if (playerName) {
            this.localPlayerName = playerName;
        }

        // Add local player to players store
        const players = get(this.playersStore);
        const pos = getPlayerPosition();
        players.set(this.localPlayerId, {
            id: this.localPlayerId,
            name: this.localPlayerName,
            x: pos?.x ?? 0,
            y: pos?.y ?? 0,
            direction: pos?.direction ?? 'down',
            moving: pos?.moving ?? false,
        });
        this.playersStore.set(players);

        // Emit join event
        this.emitEvent({
            type: 'playerJoined',
            playerId: this.localPlayerId,
            data: { name: this.localPlayerName },
        });

        console.log('[MockWebSocket] ✅ Connected');
    }

    /**
     * Disconnect from room
     */
    disconnect(): void {
        if (!this.connected) return;

        console.log('[MockWebSocket] Disconnecting');

        // Emit leave event
        this.emitEvent({
            type: 'playerLeft',
            playerId: this.localPlayerId,
        });

        // Remove local player
        const players = get(this.playersStore);
        players.delete(this.localPlayerId);
        this.playersStore.set(players);

        this.connected = false;
        this.roomId = null;
    }

    /**
     * Send position update (stores in Jazz + notifies listeners)
     */
    sendPosition(x: number, y: number, direction: string, moving: boolean): void {
        if (!this.connected) return;

        // Store in Jazz for persistence and sync
        setPlayerPosition(x, y, direction, moving);

        // Update local player in store
        const players = get(this.playersStore);
        const player: MockPlayer = {
            id: this.localPlayerId,
            name: this.localPlayerName,
            x,
            y,
            direction,
            moving,
        };
        players.set(this.localPlayerId, player);
        this.playersStore.set(players);

        // Notify callbacks
        this.playerMovedCallbacks.forEach(cb => cb(player));

        // Emit event
        this.emitEvent({
            type: 'playerMoved',
            playerId: this.localPlayerId,
            data: { x, y, direction, moving },
        });
    }

    /**
     * Register callback for player movement
     */
    onPlayerMoved(callback: PlayerMovedCallback): () => void {
        this.playerMovedCallbacks.push(callback);
        return () => {
            const index = this.playerMovedCallbacks.indexOf(callback);
            if (index > -1) {
                this.playerMovedCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Register callback for room events
     */
    onRoomEvent(callback: RoomEventCallback): () => void {
        this.roomEventCallbacks.push(callback);
        return () => {
            const index = this.roomEventCallbacks.indexOf(callback);
            if (index > -1) {
                this.roomEventCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Send a message to the room
     */
    sendMessage(message: string): void {
        if (!this.connected) return;

        this.emitEvent({
            type: 'message',
            playerId: this.localPlayerId,
            data: { message, name: this.localPlayerName },
        });
    }

    /**
     * Emit event to callbacks and store
     */
    private emitEvent(event: MockRoomEvent): void {
        // Add to events store
        const events = get(this.eventsStore);
        events.push(event);
        // Keep last 100 events
        if (events.length > 100) {
            events.shift();
        }
        this.eventsStore.set(events);

        // Notify callbacks
        this.roomEventCallbacks.forEach(cb => cb(event));
    }

    /**
     * Get current connection state
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get current room ID
     */
    getRoomId(): string | null {
        return this.roomId;
    }

    /**
     * Get local player ID
     */
    getLocalPlayerId(): string {
        return this.localPlayerId;
    }

    /**
     * Set local player name
     */
    setPlayerName(name: string): void {
        this.localPlayerName = name;

        if (this.connected) {
            const players = get(this.playersStore);
            const player = players.get(this.localPlayerId);
            if (player) {
                player.name = name;
                this.playersStore.set(players);
            }
        }
    }
}

export const mockWebSocketService = new MockWebSocketService();
