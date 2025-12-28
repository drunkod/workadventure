# How WorkAdventure Works (Local Dev)

This document explains how the WorkAdventure application runs locally when you execute `npm run dev`.

## System Overview

The application is composed of three main services running simultaneously via `concurrently`:

1.  **Frontend (Vite)**
    *   **Port**: `8080` (http://localhost:8080)
    *   **Role**: Serves the visual game client (HTML/JS/Phaser) to your browser.
    *   **Process**: `npm:dev-front`

2.  **Pusher (The Gateway)**
    *   **Ports**:
        *   `3000`: HTTP API (Entry point for map info)
        *   `3001`: WebSocket Server (Real-time player movement)
    *   **Role**: Acts as the bridge between the Frontend and the Backend. It handles WebSocket connections from players and "pushes" updates.
    *   **Process**: `npm:dev-pusher`

3.  **Back (Game Logic)**
    *   **Ports**:
        *   `8081`: HTTP API
        *   `50051`: gRPC (Internal communication)
    *   **Role**: Handles the authoritative game state, zone validation, and persistence. The *Pusher* talks to the *Back* to authorize connections.
    *   **Process**: `npm:dev-back`

---

## Startup Sequence (Step-by-Step)

When you run `npm run dev` in the `play` directory:

1.  **Orchestrator Starts**: `concurrently` kicks off all sub-processes (front, back, pusher, watchers).
2.  **Services Initialize**:
    *   **Pusher** starts and listens on `:3000` and `:3001`. It typically warns about "Admin API not configured" in local mode—this is normal. It creates a local mock environment.
    *   **Back** starts on `:8081` and `:50051`.
    *   **Vite (Front)** builds the client and serves it on `:8080`.
3.  **Browser Access**:
    *   You open `http://127.0.0.1:3000` (Pusher).
    *   **Why 3000 and not 8080?**
        *   The Pusher service (3000) injects environment variables (`window.env`) and then proxies the request to the Frontend (8080).
        *   If you went straight to 8080, the game would lack configuration data.

## The "Map Load" Flow

1.  **Browser** hits `http://127.0.0.1:3000/`.
2.  **Pusher** serves `index.html` (proxied from Vite) + injects `window.env`.
3.  **Frontend** loads and requests the Map URL (e.g., `maps/starter/map.json`).
4.  **Frontend** connects to WebSocket `ws://127.0.0.1:3001`.
5.  **Pusher (WS)** receives connection -> asks **Back (gRPC 50051)** "Is this user allowed/valid?".
6.  **Back** approves -> **Pusher** establishes connection.
7.  **Game Starts**: You see your character.

## Troubleshooting Tips

*   **"Connecting..." Stuck**: Usually means WebSocket (3001) is blocked or misconfigured.
*   **404 on Map**: The map file path is wrong or the backend is trying to fetch it from an external "Admin" API instead of locally.
*   **Port Conflicts**: If 8080 or 3000 are taken, the app won't start correctly. Check logs for `EADDRINUSE`.
