# TODO: Review Checklist for Frontend-Only Mock Mode (Step by Step)

Source guide:
- `play/guide to implementing a complete frontend-only mock mode.md`

Goal:
- Verify, step by step, that `play` can run in full local mock mode without pusher/back, and that implementation quality is good enough for daily frontend work.

Date:
- February 17, 2026

---

## 1) Baseline code audit

- [ ] Confirm mock dev entrypoint exists in `play/package.json`.
- [ ] Confirm mock mode is gated by env flag (`FRONTEND_ONLY=true`).
- [ ] Confirm Vite mock middleware is wired in `play/vite.config.mts`.
- [ ] Confirm browser runtime env fallback exists in `play/public/frontend-only-env.js`.
- [ ] Confirm index loads runtime env script in `play/index.html`.

Quick checks:

```bash
cd play
rg -n "dev-front-mock|FRONTEND_ONLY|frontendOnlyMockPlugin|frontend-only-env.js" package.json vite.config.mts index.html public/frontend-only-env.js
```

---

## 2) HTTP mock contract parity review

- [ ] `GET /map` returns valid bootstrap payload with `mapUrl`.
- [ ] `POST /anonymLogin` returns JWT-shaped `authToken` + `userUuid`.
- [ ] `GET /me` returns `status: "ok"` and texture validity flags.
- [ ] `GET /woka/list` returns expected object shape for woka picker.
- [ ] `GET /companion/list` returns array of companion collections.
- [ ] `POST /save-name` returns `204`.
- [ ] `POST /save-textures` returns `204`.
- [ ] `POST /save-companion-texture` returns `204`.
- [ ] `POST /register` returns deterministic mock payload.
- [ ] `GET /ping` returns `pong`.

Quick checks:

```bash
curl -s http://127.0.0.1:8080/map | head
curl -s -X POST http://127.0.0.1:8080/anonymLogin -H 'content-type: application/json' -d '{}'
curl -s 'http://127.0.0.1:8080/me?token=review-token' | head
curl -s http://127.0.0.1:8080/woka/list | head
curl -s 'http://127.0.0.1:8080/companion/list?roomUrl=http%3A%2F%2F127.0.0.1%3A8080%2F_%2Fglobal%2Fmock-maps%2Fstarter%2Fmap.json%3Falone%3Dtrue' | head
curl -i -X POST http://127.0.0.1:8080/save-name -H 'content-type: application/json' -d '{"name":"Alice","roomUrl":"room"}'
curl -i -X POST http://127.0.0.1:8080/save-textures -H 'content-type: application/json' -d '{"textures":["color_22"],"roomUrl":"room"}'
curl -i -X POST http://127.0.0.1:8080/save-companion-texture -H 'content-type: application/json' -d '{"texture":"dog1","roomUrl":"room"}'
curl -s -X POST http://127.0.0.1:8080/register -H 'content-type: application/json' -d '{"organizationMemberToken":"review-token"}' | head
curl -s http://127.0.0.1:8080/ping
```

---

## 3) Static map and asset serving review

- [ ] `/mock-maps/*` resolves files from repo `maps/`.
- [ ] Map JSON is reachable at `/mock-maps/starter/map.json`.
- [ ] Map script is reachable at `/mock-maps/starter/script.js`.
- [ ] Content type for JS assets is correct.
- [ ] Path traversal protection is in place (no `../` escape).

Quick checks:

```bash
curl -I http://127.0.0.1:8080/mock-maps/starter/map.json
curl -I http://127.0.0.1:8080/mock-maps/starter/script.js
curl -i http://127.0.0.1:8080/mock-maps/../package.json
```

---

## 4) Frontend boot and disconnected mode review

- [ ] Room boots with `alone=true`.
- [ ] Boot page includes `#app`.
- [ ] Boot page includes frontend entry script (`/src/svelte.ts` in dev).
- [ ] No hard dependency on backend service startup.
- [ ] Local avatar can spawn and move in starter map.

Manual URL:

```text
http://127.0.0.1:8080/_/global/mock-maps/starter/map.json?alone=true
```

---

## 5) Configurable mock behavior review (UI testing)

- [ ] Error injection toggles are supported for `/map` and `/me`.
- [ ] Response variants are supported (`MOCK_AUTH_MANDATORY`, `MOCK_ENABLE_CHAT`, etc.).
- [ ] Latency toggles are supported (`MOCK_DELAY_MS`, endpoint overrides).
- [ ] Invalid status values fall back safely to default.
- [ ] Companion texture alias toggle is supported.

Quick checks:

```bash
cd play
npm run test -- tests/front/MockMode/frontendOnlyMockPlugin.test.ts
```

---

## 6) Automated verification review

- [ ] Smoke script exists: `play/tests/mock-mode/smoke-dev-front-mock.sh`.
- [ ] Smoke script passes locally.
- [ ] NPM command exists: `npm run test:front-mock-smoke`.
- [ ] CI includes smoke step in `.github/workflows/frontend-mock-smoke.yml`.

Quick checks:

```bash
cd play
npm run test:front-mock-smoke
```

---

## 7) Definition of done (full local mock mode)

- [ ] Frontend starts with `npm run dev-front-mock` and does not require pusher/back.
- [ ] Room loads from local mock map URL.
- [ ] `alone=true` mode is functional for disconnected single-user flow.
- [ ] Woka and companion data load from mock endpoints.
- [ ] Save-name/save-texture/save-companion calls do not fail in UI.
- [ ] Core mock endpoints return stable contracts and expected status codes.
- [ ] `/mock-maps/*` asset serving is reliable for map JSON and scripts.
- [ ] Automated smoke test passes locally.
- [ ] CI smoke step is present and green.
- [ ] No fatal runtime crash from missing backend dependencies in normal mock workflow.

---

## 8) Sign-off

- Reviewer:
- Branch:
- Commit:
- Result: PASS / FAIL
- Notes:
