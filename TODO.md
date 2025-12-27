# TODO: Run Frontend with Mockup Data Only

A step-by-step guide to run WorkAdventure frontend with mockup data for fast development start.

---

## Phase 1: Environment Setup

### Step 1: Install Dependencies
```bash
# From root directory
npm install

# Navigate to play directory and install
cd play
npm install
```

### Step 2: Configure Environment Variables
```bash
# Copy environment template
cp .env.template .env
```

### Step 3: Edit `.env` file - Minimal Mock Configuration
```env
# Server Information
DEBUG_MODE=true
SERVER_NAME=MockServer

# Disable external services
DISABLE_ANONYMOUS=false
DISABLE_NOTIFICATIONS=true
ENABLE_CHAT=false
ENABLE_CHAT_UPLOAD=false

# Use local Jitsi (public test server)
JITSI_URL=meet.jit.si
JITSI_PRIVATE_MODE=false

# JWT secret (any value for local dev)
SECRET_KEY=localDevSecret123

# Feature flags - disable heavy features
ENABLE_MAP_EDITOR=true
ENABLE_REPORT_ISSUES_MENU=false

# Integration tools - enable YouTube for testing
YOUTUBE_ENABLED=true
KLAXOON_ENABLED=false
GOOGLE_DRIVE_ENABLED=false
GOOGLE_DOCS_ENABLED=false
GOOGLE_SHEETS_ENABLED=false
GOOGLE_SLIDES_ENABLED=false
ERASER_ENABLED=false
EXCALIDRAW_ENABLED=false
CARDS_ENABLED=false
TLDRAW_ENABLED=false

# Use local maps
START_ROOM_URL=/_/global/localhost:8080/maps/starter/map.json
```

---

## Phase 2: Generate Required Files

### Step 4: Generate Protocol Buffer Files
```bash
# From messages directory
cd messages
npm install
npm run proto-all
cd ..
```

### Step 5: Generate i18n Typings
```bash
# From play directory
cd play
npm run typesafe-i18n
```

### Step 6: Build Iframe API (Optional but recommended)
```bash
# From play directory
npm run build-iframe-api
```

---

## Phase 3: Start Frontend Development Server

### Step 7: Start Frontend Only (Simplest Option)
```bash
# From play directory
npm run dev-front
```
This starts Vite dev server on `http://localhost:8080`

### Step 8: Alternative - Start with All Dev Tools
```bash
# From play directory - runs frontend + typesafe-i18n watch + iframe-api watch
npm run dev
```

---

## Phase 4: Access Application

### Step 9: Access Frontend
Open browser: `http://localhost:8080`

### Step 10: Use Local Test Map
The frontend will load using the starter map from:
- `maps/starter/map.json` (local Tiled map)
- Contains: floor, walls, collisions, Jitsi rooms, live zones

---

## Troubleshooting

### Issue: Map not loading
**Solution:** Serve maps directory statically:
```bash
# In separate terminal from maps directory
npx serve maps -p 3000
```
Then update `START_ROOM_URL=/_/global/localhost:3000/starter/map.json`

### Issue: WebSocket connection errors
**Expected:** Without pusher server, real-time features won't work.
**For full functionality:** Run pusher server too:
```bash
# From play directory in separate terminal
npm run dev-pusher
```

### Issue: Authentication errors
**Solution:** Ensure `DISABLE_ANONYMOUS=false` in `.env`

---

## Quick Start Commands Summary

```bash
# 1. Setup (one-time)
npm install
cd play && npm install
npm run typesafe-i18n
cd ..
cp .env.template .env

# 2. Run (each session)
cd play
npm run dev-front

# 3. Open browser
# http://localhost:8080
```

---

## Available Test Maps

Located in `maps/` directory:
- `starter/map.json` - Default starter office
- `tests/E2E/empty.json` - Empty test map
- `tests/E2E/livezone.json` - Live zone test
- `Tuto/tutoV3.json` - Tutorial map

---

## Notes

- **Frontend-only mode** works for UI development and map rendering
- **WebSocket features** require running `npm run dev-pusher`
- **Full multiplayer** requires complete Docker stack
- **Maps** can be edited with [Tiled Map Editor](https://www.mapeditor.org/)
