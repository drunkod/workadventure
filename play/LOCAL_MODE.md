# WorkAdventure Local Mode Tutorial

Run the frontend without Pusher (The Gateway) and Back (Game Logic) using Jazz Tools for local-first state management.

## Quick Start

```bash
cd play
npm run dev-front
# Open: http://localhost:8080/local.html
```

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│           Frontend (Vite) - Port 8080            │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │              Jazz Tools                   │  │
│   │  • LocalPlayerState (x, y, direction)    │  │
│   │  • LocalRoomState (mapUrl, viewport)     │  │
│   │  • UserPreferences (settings)            │  │
│   └──────────────────────────────────────────┘  │
│                      ↕                           │
│              Jazz Cloud Sync                     │
│         wss://cloud.jazz.tools                   │
│                      ↕                           │
│         Other Browsers (Multi-player)            │
└─────────────────────────────────────────────────┘
```

### Traditional Mode (Requires Backend)
- Frontend → Pusher (port 3000/3001) → Back (port 8081/50051)
- WebSocket for real-time player updates
- Pusher injects `window.env` configuration

### Local Mode (No Backend Required)
- Frontend runs standalone on port 8080
- Jazz Tools replaces WebSocket for state sync
- `local.html` injects its own `window.env`
- `LocalRoom.ts` provides Room interface without network

---

## Running Local Mode

### Option 1: Use local.html (Recommended)

```bash
cd play
npm run dev-front
```

Open in browser:
```
http://localhost:8080/local.html
```

### Option 2: URL Parameter

Add `?localMode=true` to any page:
```
http://localhost:8080/?localMode=true
```

### Option 3: Jazz Test Page

For testing Jazz state directly:
```
http://localhost:8080/jazz-test.html
```

---

## What Happens in Local Mode

1. **`local.html`** injects `window.env` with `LOCAL_MODE_ENABLED: true`
2. **`GameManager.init()`** detects local mode and bypasses `connectionManager`
3. **`LocalRoom`** provides Room properties without network requests
4. **Login Scene** appears if no player name saved
5. **Character Selection** appears if no woka textures saved
6. **Game loads** with map from `MockMapService` (default starter map)
7. **Player state** persisted to IndexedDB via Jazz

---

## Key Files

| File | Purpose |
|------|---------|
| `local.html` | Entry point with `window.env` injection |
| `src/front/Connection/LocalRoom.ts` | Room without network |
| `src/front/Phaser/Game/GameManager.ts` | Local mode bypass in `init()` |
| `src/front/Jazz/schema.ts` | State schemas (player, room, prefs) |
| `src/front/Jazz/jazzStore.ts` | Svelte stores backed by Jazz |
| `src/front/Services/MockMapService.ts` | Direct map loading |
| `src/front/Services/MockWebSocketService.ts` | Player sync simulation |

---

## Jazz State

### Player State (replaces WebSocket position)
```typescript
LocalPlayerState = {
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    moving: boolean
}
```

### Room State (replaces Pusher room management)
```typescript
LocalRoomState = {
    mapUrl: string,
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number
}
```

---

## Multi-Player via Jazz Cloud

Jazz Cloud sync is enabled by default:
```typescript
// jazz-config.ts
peer: `wss://cloud.jazz.tools/?key=${JAZZ_API_KEY}`
```

Open `local.html` in two browsers - player state syncs automatically!

---

## Troubleshooting

### Page loads slowly or "Connecting..." stuck
- You're probably using `index.html` instead of `local.html`
- `index.html` requires Pusher to inject config

### No player character visible
- Clear localStorage and reload
- Check browser console for errors

### Jazz initialization failed
- Jazz falls back to localStorage mode
- Check console for `[Jazz]` messages

---

## Development Tips

### Check Local Mode Status
Open browser console:
```javascript
window.env.LOCAL_MODE_ENABLED  // should be true
```

### View Jazz State
```javascript
// In console on jazz-test.html
import('/src/front/Jazz/jazzStore.ts').then(m => {
    console.log('Position:', m.getPlayerPosition());
    console.log('Room:', m.getRoomState());
});
```

### Clear All State
```javascript
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('jazz');
location.reload();
```

---

## Verification Results

When running correctly, you should see in console:

```
[GameManager] 🎷 Local mode enabled - bypassing Pusher/Back
[Jazz] ✅ Initialized successfully!
[LocalRoom] Creating local room for: /maps/starter/map.json
```

| Metric | Expected |
|--------|----------|
| **Load Time** | 2-3 seconds |
| **Jazz Status** | ✅ Initialized |
| **Local Mode** | ✅ Bypassed Pusher/Back |
| **Map** | ✅ Loaded (default starter) |
| **Game Canvas** | ✅ Rendered |

---

## Files Reference

### Schema & Store
| File | Purpose |
|------|---------|
| `src/front/Jazz/schema.ts` | `LocalPlayerState`, `LocalRoomState`, `UserPreferences` |
| `src/front/Jazz/jazzStore.ts` | Svelte stores with player/room state functions |
| `src/front/Jazz/jazz-config.ts` | Jazz Cloud sync configuration |

### Connection Layer
| File | Purpose |
|------|---------|
| `src/front/Connection/LocalRoom.ts` | Room interface without network |
| `src/front/Connection/LocalRoomConnection.ts` | Mock connection using Jazz |
| `src/front/Connection/LocalModeConnectionManager.ts` | Local mode manager |
| `src/front/Phaser/Game/GameManager.ts` | Local mode bypass in `init()` |

### Mock Services
| File | Purpose |
|------|---------|
| `src/front/Services/MockMapService.ts` | Direct map loading with default starter |
| `src/front/Services/MockWebSocketService.ts` | Player sync simulation via Jazz |

