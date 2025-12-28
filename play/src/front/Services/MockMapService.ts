/**
 * Mock Map Service
 * 
 * Provides map loading without Pusher proxy.
 * Loads maps directly via fetch or returns default starter map.
 * 
 * Usage:
 *   const map = await mockMapService.loadMap('/maps/starter/map.json');
 *   // or get default starter map
 *   const map = mockMapService.getStarterMap();
 */

export interface TiledMap {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: TiledLayer[];
    tilesets: TiledTileset[];
    properties?: TiledProperty[];
}

export interface TiledLayer {
    name: string;
    type: string;
    data?: number[];
    objects?: TiledObject[];
    visible: boolean;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export interface TiledTileset {
    name: string;
    firstgid: number;
    tilewidth: number;
    tileheight: number;
    image?: string;
    source?: string;
}

export interface TiledObject {
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: TiledProperty[];
}

export interface TiledProperty {
    name: string;
    type: string;
    value: unknown;
}

/**
 * Default starter map for local development
 */
const DEFAULT_STARTER_MAP: TiledMap = {
    width: 20,
    height: 15,
    tilewidth: 32,
    tileheight: 32,
    layers: [
        {
            name: 'floorLayer',
            type: 'tilelayer',
            visible: true,
            x: 0,
            y: 0,
            width: 20,
            height: 15,
            data: Array(20 * 15).fill(1), // Simple floor tiles
        },
        {
            name: 'start',
            type: 'objectgroup',
            visible: true,
            x: 0,
            y: 0,
            objects: [
                {
                    id: 1,
                    name: 'start',
                    type: 'start',
                    x: 160, // Center-ish
                    y: 240,
                    width: 32,
                    height: 32,
                    properties: [],
                },
            ],
        },
    ],
    tilesets: [
        {
            name: 'default',
            firstgid: 1,
            tilewidth: 32,
            tileheight: 32,
        },
    ],
    properties: [
        { name: 'mapName', type: 'string', value: 'Starter Map (Local Mode)' },
    ],
};

class MockMapService {
    private cachedMaps: Map<string, TiledMap> = new Map();

    /**
     * Load map from URL or return cached version
     */
    async loadMap(mapUrl: string): Promise<TiledMap> {
        console.log('[MockMapService] Loading map:', mapUrl);

        // Check cache first
        if (this.cachedMaps.has(mapUrl)) {
            console.log('[MockMapService] Returning cached map');
            return this.cachedMaps.get(mapUrl)!;
        }

        try {
            // Try to fetch the map
            const response = await fetch(mapUrl);
            if (response.ok) {
                const mapData = await response.json() as TiledMap;
                this.cachedMaps.set(mapUrl, mapData);
                console.log('[MockMapService] Map loaded successfully');
                return mapData;
            }
        } catch (error) {
            console.warn('[MockMapService] Failed to fetch map, using default:', error);
        }

        // Return default starter map if fetch fails
        console.log('[MockMapService] Using default starter map');
        return DEFAULT_STARTER_MAP;
    }

    /**
     * Get the default starter map (no network required)
     */
    getStarterMap(): TiledMap {
        return DEFAULT_STARTER_MAP;
    }

    /**
     * Get spawn position from map
     */
    getSpawnPosition(map: TiledMap): { x: number; y: number } {
        // Look for start layer with start object
        for (const layer of map.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                const startObj = layer.objects.find(obj =>
                    obj.type === 'start' || obj.name === 'start'
                );
                if (startObj) {
                    return { x: startObj.x, y: startObj.y };
                }
            }
        }

        // Default spawn at center of map
        return {
            x: (map.width * map.tilewidth) / 2,
            y: (map.height * map.tileheight) / 2,
        };
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cachedMaps.clear();
    }
}

export const mockMapService = new MockMapService();
