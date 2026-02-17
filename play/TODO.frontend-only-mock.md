# TODO: Migrate `play` to Full Local Mock Mode (No Backend/Pusher)

Last verified: February 17, 2026

## Research summary (DeepWiki vs this branch)

DeepWiki page:
- https://deepwiki.com/workadventure/workadventure/3.1-play-service
- Indexed commit shown there: `6fe3ba` (upstream snapshot)
- Additional review thread:
  - https://deepwiki.com/search/please-help-review-todo-fronte_c85449f9-3ddf-49e6-90fb-3116b67b93f8

From DeepWiki (upstream architecture):
- Play frontend normally depends on Play pusher for HTTP + websocket flows.
- Standard dev path is frontend + pusher together.

From this branch (current local code):
- `dev-front-mock` exists in `play/package.json`.
- Vite has `FRONTEND_ONLY=true` middleware in `play/vite.config.mts`.
- Current mock endpoints already implemented:
  - `GET /map`
  - `POST /anonymLogin`
  - `GET /me`
  - `GET /woka/list`
  - `GET /mock-maps/*` (served from repo `maps/`)

Conclusion:
- The old review that says “mock mode does not exist” is outdated for this branch.
- We do have a local mock mode, but it is not yet full API parity.

---

## Phase 0: Baseline run

- [x] Start frontend-only mock mode:

```bash
cd play
npm run dev-front-mock
```

- [x] Open disconnected room (required to avoid room websocket dependency):

```text
http://localhost:8080/_/global/mock-maps/starter/map.json?alone=true
```

- [x] Verify current mocked routes:

```bash
curl -s http://localhost:8080/map | head
curl -s -X POST http://localhost:8080/anonymLogin -H 'content-type: application/json' -d '{}'
curl -s http://localhost:8080/me | head
curl -s http://localhost:8080/woka/list | head
curl -I http://localhost:8080/mock-maps/starter/map.json
```

Verified on February 17, 2026.

---

## Phase 1: Stabilize existing mock mode

- [ ] Keep JWT-safe auth behavior in mock responses (`/anonymLogin`, `/me`).
- [ ] Keep map/script URL resolution absolute-safe for relative map script URLs.
- [ ] Keep map-bound click guard to avoid noisy out-of-grid pathfinding errors.
- [ ] Keep root `favicon.ico` available to remove unnecessary 404 noise.

Status now: implemented in this branch.

---

## Phase 2: Fill missing HTTP parity (remaining work)

Goal: let more frontend flows run without pusher/back.

- [x] Add `GET /companion/list` mock in `frontendOnlyMockPlugin`.
  - Expected shape: array of companion collections.
  - Reason: companion picker can request this endpoint.

- [x] Add no-op persistence endpoints in mock mode:
  - `POST /save-name` -> `204`
  - `POST /save-textures` -> `204`
  - `POST /save-companion-texture` -> `204`
  - Reason: avoid failing profile/customization save calls if those features are enabled.

- [x] Add explicit `POST /register` mock behavior.
  - Option A: minimal fake response.
  - Option B: return `501` with clear message in dev logs.
  - Reason: make behavior deterministic if legacy register path is triggered.

- [x] Optionally add `GET /ping` mock.
  - Reason: health checks/dev scripts consistency.

Verified on February 17, 2026.

---

## Phase 3: Make mock mode configurable for UI testing

- [ ] Add env toggles for mock error injection:
  - Example: fail `/map` or `/me` to test error scenes.
- [ ] Add env toggles for response variants:
  - `MOCK_AUTH_MANDATORY`, `MOCK_ENABLE_CHAT`, `MOCK_IS_CHARACTER_TEXTURES_VALID`, etc.
- [ ] Add mock latency toggle to test loading/retry UX.

---

## Phase 4: Add automated verification

- [ ] Add a small test script (or vitest integration) asserting:
  - Mock endpoints return expected status + schema.
  - `/mock-maps/*` resolves assets from `maps/`.
  - Frontend boot works with `alone=true`.

- [ ] Add a CI smoke check for `dev-front-mock` startup and endpoint contract.

---

## Definition of done (full local mock mode)

- [ ] Frontend boots with `npm run dev-front-mock` and no pusher/back process.
- [ ] Room loads and avatar can move with `alone=true`.
- [ ] Woka and companion selection screens load without backend.
- [ ] Save-name/save-texture flows do not error in UI.
- [ ] No fatal runtime errors from missing backend endpoints.

---

## Notes

- Browser warnings like AudioContext autoplay are expected until user gesture.
- `alone=true` is still required for disconnected single-user mode behavior.
- If behavior looks stale, clear local storage for `localhost:8080`.
