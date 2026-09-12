# Frontend-only local runbook

Last verified: 2026-09-12 on macOS with Helium.

This fork can run the `play` frontend without Pusher, Back, Matrix, Synapse, Map Storage, Uploader, or another WorkAdventure server. The Vite development server supplies the small HTTP API surface and starter-map assets needed by the browser.

## Recommended setup

The repository flake pins Node 22 and is the preferred development environment. There is no `.nvmrc` in this branch.

From a fresh clone:

```bash
cd /path/to/workadventure
nix develop
npm ci
play-dev-front-mock
```

Then open:

```text
http://localhost:8080/
```

`frontend-only-env.js` automatically adds `alone=true`, so it is no longer necessary to add that query parameter manually. The explicit room URL also remains valid:

```text
http://localhost:8080/_/global/mock-maps/starter/map.json?alone=true
```
## What `dev-front-mock` does

`play/package.json` runs `prepare-front-mock` before Vite. That preparation step regenerates the ignored build artifacts a clean checkout needs:

```text
messages protobuf TypeScript
play typesafe-i18n output
play/public/iframe_api.js
```

It then starts Vite with `FRONTEND_ONLY=true`. The Vite mock plugin supplies `/map`, `/anonymLogin`, `/me`, `/woka/list`, `/companion/list`, `/register`, save endpoints, `/ping`, `/local-script`, and `/mock-maps/*`.

If you are not using Nix, use Node 22 and run:

```bash
npm ci
cd play
npm run dev-front-mock
```

Use port 8080 for this mode. The current development/HMR configuration assumes that port; do not run a second frontend-only copy on another port unless the HMR configuration is changed as well.

## Strict-local chat UI

Chat can be enabled for UI testing without enabling Matrix or Jazz:

```bash
cd play
MOCK_ENABLE_CHAT=true \
MOCK_ENABLE_CHAT_ONLINE_LIST=true \
MOCK_ENABLE_CHAT_DISCONNECTED_LIST=true \
MOCK_ENABLE_CHAT_UPLOAD=false \
MOCK_ENABLE_MATRIX_CHAT=false \
npm run dev-front-mock
```
Open the browser with the matching client flag:

```text
http://localhost:8080/?mockEnableChat=true
```

In this configuration `VoidChatConnection` is used. The Chat sidebar and local user-list UI are available, but the connection status is `OFFLINE`, so search is intentionally hidden.

Do **not** enable `mockEnableJazzChat=true` for an air-gapped test unless you also provide and verify an explicit local Jazz sync peer. The current Jazz runtime still has a cloud-peer fallback when Jazz is enabled without a configured peer.

## Automated checks

The mock middleware unit test is the quickest focused check:

```bash
cd play
npx vitest run tests/front/MockMode/frontendOnlyMockPlugin.test.ts
```

The smoke test starts and owns its own frontend-only server on port 8080, so stop any manually running dev server first:

```bash
cd play
npm run test:front-mock-smoke
```

With Nix you can also use `play-front-mock-smoke` from `nix develop`.

`npm run svelte-check` is not a green branch-wide gate yet. This branch still contains inherited Svelte 5 migration/type debt. On 2026-09-12 the modified tree had fewer checker errors than the pristine `origin/d/local_jazz_chat` baseline, with no modified file worse than baseline.
## Helium / WebMCP UI verification

The current Helium setup can be debugged through Chrome DevTools Protocol on port 9222:

```bash
/Applications/Helium.app/Contents/MacOS/Helium \
  --remote-debugging-port=9222 --restart
```

Confirm the endpoint is available:

```bash
curl http://127.0.0.1:9222/json/version
```

The verified Helium build exposes `ModelContext`, confirming its WebMCP-enabled browser path. During a strict-local run, the expected network profile is:

```text
HTTP/API: localhost:8080 only
WebSocket: ws://localhost:8080/... (Vite HMR only)
External WorkAdventure/Matrix/Jazz traffic: none
```

The 2026-09-12 browser pass verified onboarding, Woka selection, starter-world rendering, Profile, Settings, submenu switching, all visible RangeSliders, Apps, Calendar, Todo, and strict-local Chat close/reopen with zero HTTP errors, failed requests, page exceptions, or console errors.

Remote-peer features such as Picture-in-Picture cannot be naturally exercised in a single-user offline room. Their availability guards should be covered structurally/tests rather than by inserting fake peers into the live scene.
## Troubleshooting

If the page is blank after a clean checkout, first verify that the generated artifacts exist. `npm run dev-front-mock` now prepares them automatically, but the preparation step can also be run directly:

```bash
cd play
npm run prepare-front-mock
```

The generated protobuf, i18n, and iframe API outputs are intentionally git-ignored.

If port 8080 is already in use:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

Stop the old frontend mock process instead of starting a second copy on another port.

An `olm` optimize-dependency warning can appear during Vite startup in this branch; it did not prevent the verified frontend-only UI from loading.

The frontend-only environment resets the main local onboarding identity keys on reload, so seeing the name/Woka screens again is expected during repeated browser verification.

For implementation history and outstanding architectural notes, see:

- `play/guide to implementing a complete frontend-only mock mode.md`
- `play/TODO.frontend-only-mock.md`
- `UPSTREAM_UI_SYNC.md` for selective upstream UI-update rules
