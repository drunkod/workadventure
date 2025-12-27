# Tutorial: Running WorkAdventure Locally with Mock Data

This guide explains how to run the WorkAdventure frontend and a minimal local backend (mock data) without relying on Docker or external services.

## Prerequisites
- Node.js (v20+)
- npm

## Architecture Overview
In this setup, we run three services concurrently on your host machine:
1.  **Vite (Frontend)**: Runs on port `8080`. Serves the application code.
2.  **Pusher (API Gateway)**: Runs on port `3000` (HTTP) and `3001` (WS). Handles authentication and injects environment variables.
3.  **Back (Game Server)**: Runs on port `8081` (HTTP) and `50051` (gRPC). Manages room logic.

## Step 1: Configuration (.env)

Ensure your `.env` (in root) and `play/.env` files are configured to support local execution.

### Key Variables
```bash
# Frontend & Pusher URLs (Note: Pusher is on 3000, Vite on 8080)
PUSHER_URL=/
FRONT_URL=http://127.0.0.1:8080
VITE_URL=http://127.0.0.1:8080
UPLOADER_URL=http://localhost:8080
ICON_URL=http://localhost:8080

# Pusher Configuration
PUSHER_HTTP_PORT=3000
PUSHER_WS_PORT=3001
SECRET_KEY=localDevSecret123

# Connection to Back Server (gRPC)
API_URL=localhost:50051

# Start Room (Must point to Vite port 8080)
START_ROOM_URL=/_/global/127.0.0.1:8080/maps/starter/map.json

# CRITICAL: Disable Admin API to use Local Mocks
# Ensure ADMIN_API_URL is NOT set.
# ADMIN_API_URL=http://localhost:8081  <-- REMOVE or COMMENT OUT this line
```

## Step 2: Running the Server

We have updated the `play/package.json` scripts to launch everything for you.

1.  Open your terminal.
2.  Navigate to the `play` directory:
    ```bash
    cd play
    ```
3.  Run the development command:
    ```bash
    npm run dev
    ```

    **What this does:**
    - Starts **Pusher** (Wait for `WorkAdventure Pusher web-socket server started on port 3001!`).
    - Starts **Back** (Wait for `WorkAdventure HTTP/2 API starting on port 50051!`).
    - Starts **Vite** (Wait for `Local: http://localhost:8080/`).

## Step 3: Accessing the Game

1.  Open your browser.
2.  Navigate to **[http://127.0.0.1:3000](http://127.0.0.1:3000)**.
    > **Note:** Do NOT access port 8080 directly. You must go through Pusher (port 3000) for environment injection to work.

The game should load the starter map immediately.

## Troubleshooting

### Blank Page?
-   Check if **Vite** is actually running on port `8080`.
-   If you see `Port 8080 is in use, trying another one...` in the logs, stop the server, identify the blocking process (`lsof -i :8080`), kill it, and restart.

### Stuck on "Connecting..."?
-   This usually means the **Back** server connection failed.
-   Check `npm run dev` logs for `[dev-back]` errors.
-   Ensure `PUSHER_WS_PORT=3001` is set in `.env`.
-   Verify `API_URL=localhost:50051`.

### Map Error (404 room access error)?
-   This happens if Pusher tries to contact a non-existent Admin API.
-   **Fix:** verify that `ADMIN_API_URL` is **Removed** from your `.env` files.
