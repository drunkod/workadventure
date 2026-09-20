# Sprint: Jazz compatibility, Russian localisation, and local-first production validation

> **Status**: Approved
> **Slug**: jazz-runtime-compatibility
> **Created**: 2026-09-17 14:35
> **Updated**: 2026-09-20 15:40
> **Source PRD**: `plans/prds/20260917-1435-jazz-runtime-compatibility.prd.md`
> **Source Spec**: `docs/spec.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental

## PRD

Complete the Jazz/local-first release canary in dependency order: compiler compatibility, Russian localisation, upstream production compatibility, explicit cloud-free Jazz persistence, local-first container topology, LAN sync, then local-first production acceptance on the target MacBook.

### Problem

- The Jazz package-boundary blocker is fixed and accepted.
- `play/src/i18n` has no `ru-RU` locale, so Russian users have no first-class localisation.
- The fork still needs a clean production-like Docker build/runtime/E2E pass on this MacBook.
- The current Jazz fallback silently uses Jazz Cloud when no peer/key is configured, which violates local-first expectations.
- The upstream Compose stack includes Matrix/OIDC and several hosted integrations that are not local-first core dependencies.

### Users

- WorkAdventure maintainers continuing the existing Matrix-to-Jazz frontend migration.
- Russian-speaking users who need the complete application and chat UI in Russian.
### Success Criteria

- Accepted Jazz resolver checks remain green.
- `ru-RU` has zero missing localisation files/keys versus `en-US`, generates cleanly, and is selectable/loadable.
- The documented production-like Docker stack builds/starts on the MacBook and the production-like E2E suite provides an upstream compatibility baseline.
- Explicit Jazz local mode uses IndexedDB with `sync.when = "never"` and never contacts Jazz Cloud.
- A local-first Compose profile runs the core product without Matrix/OIDC/hosted integration dependencies and persists local state.
- Optional LAN/multi-device Jazz sync uses a supported local sync service, never the package test server.
- The local-first production stack passes dedicated E2E/browser acceptance including `ru-RU`, Jazz, persistence, and no-cloud network audit.
- Product behavior and Matrix fallback are unchanged except for the added Russian presentation layer.

### Acceptance Scenarios

- Normal typecheck resolves Jazz package subpaths.
- Russian localisation covers every base module/key and preserves placeholders.
- Browser locale detection/selection can load `ru-RU`.
- Production-built application is exercised through automated E2E and targeted browser smoke for Russian + Jazz chat.
- Local-only Jazz survives reload with no network peer; LAN mode syncs through the local service.
- Local-first startup/core interaction does not depend on Synapse, OIDC, Jazz Cloud, public Jitsi/BBB, Google STUN, or hosted document integrations.

### Non-goals

- Jazz dependency upgrade or downgrade.
- Removing existing cloud/Matrix compatibility code paths globally; local-first is an explicit runtime/deployment mode.
- Replacing existing app Dockerfiles without evidence they block local-first packaging.
- UX redesign unrelated to local-first behavior or localisation.
- Treating frontend-only development mode as production acceptance.

## Architecture Notes

### Capabilities Touched

- TypeScript compile-time module resolution for the Vite/Svelte `play` package.
- Typesafe-i18n locale modules, generation, detection, and loading.
- Docker Compose production-like topology and Playwright acceptance.
- Jazz 0.20.10 browser storage/sync policy (`when: never` vs explicit peer/cloud).
- Local-first Compose service graph, persistent volumes, and cloud-dependency neutralization.
- Optional local Jazz sync service and LAN browser synchronization.

### Dependency Order

- Row 1: accepted compiler boundary fix.
- Row 2: complete Russian localisation before final runtime acceptance.
- Row 3: clean upstream-compatible production-like build/run/test baseline.
- Row 4: make Jazz local-only persistence explicit and cloud-free.
- Row 5: add the local-first production Compose profile using existing app Dockerfiles.
- Row 6: prove/package a supported local Jazz LAN sync service.
- Row 7: production-test the local-first stack offline/on-LAN on this MacBook.

### Risks

- A wider module-resolution mode could expose unrelated type errors; normal typecheck is the fail-closed gate.
- Translation can be structurally complete but linguistically poor; semantic read-only review is required in addition to zero-diff checks.
- Docker resource/network issues can mimic product regressions; final evidence must classify environment blockers separately.
- A local-first profile can look local while silently contacting Jazz Cloud/Jitsi/STUN/integrations; network audit is mandatory.
- The installed Jazz packages expose only a test sync server in-repo; production LAN sync must use a supported implementation, not test code.
## Backlog

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 4daa2d4568af1a5dcde92ba33029691b6fcf70c69da59829539d3cbfdeacc3d0 | [x] | repair Jazz subpath TypeScript resolution | contract | `cd play && npm run typecheck` exits 0; required Jazz browser/media exports remain runtime-importable; only `play/tsconfig.json` plus task artifacts change | `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md` |
| 2 | 9485c1770980ab8f42d0e1da4e7e7f691f3b0e708a574c0a24127b7c06dee6f6 | [x] | add complete Russian locale (`ru-RU`) | contract | `cd play && npm run i18n:diff -- ru-RU` reports 0 missing files/keys; `npm run typesafe-i18n && npm run typecheck` pass; `ru-RU` is detected/loadable; semantic review finds no unintended English fallback in translated product strings | `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md` |
| 3 | ce90b98647a611814b239216e9ce0210f628ae8b68031a8bb43c666d623e049a | [ ] | build and production-test full WorkAdventure on MacBook | contract | documented production-like Docker Compose build starts required services; `tests` production-like Playwright suite passes or any environment blocker is explicitly classified; browser smoke verifies built app, `ru-RU`, and Jazz chat normal/error paths with no blocking console/network errors | (pending) |
| 4 | ebec8cf0c3b6f81fe5e9601c2cf4e719ca7eb140702df64aece459aeeefc59f1 | [ ] | make Jazz local-only persistence explicit and cloud-free | contract | an explicit local sync mode reaches `JazzRuntime` and uses Jazz 0.20.10 `sync: { when: "never" }` with IndexedDB; local mode never synthesizes/contacts `cloud.jazz.tools`; explicit peer and legacy cloud modes remain covered; reload/restart-focused tests prove local message persistence | (pending) |
| 5 | 0e90ec38df17852dbaa64f6ab8228da51ef2f0ad950da027b86ee1583d9515d9 | [ ] | add local-first production Compose profile | contract | new `docker-compose.local-first.yml` reuses existing production app Dockerfiles; default profile runs `reverse-proxy`, `play`, `back`, `map-storage`, `maps`, `redis`, `uploader`, and `icon` with durable local volumes; Synapse/OIDC/RedisInsight/dev watcher and hosted integrations are not required; config/build is green on Apple Silicon and a documented one-command local-first start path exists | (pending) |
| 6 | eb9cb0cf4ca1bca7d5479aaf748b7110ba0f0d87ed982d37ca5562cc79450b3f | [ ] | prove and package supported local Jazz LAN sync service | contract | a protocol-compatible Jazz/cojson 0.20.10 sync server is identified/pinned and is not copied from package test sources; two isolated clients sync through a local `ws://`/`wss://` endpoint with no Jazz Cloud traffic; if an in-repo service is required it has its own minimal Dockerfile, healthcheck, persistence/restart proof, and Compose integration | (pending) |
| 7 | 7e29b5cdda3d8d1c0d7755711229f7d5f59ba3138bc59a65af703bf8fedb8dfa | [ ] | production-test local-first WorkAdventure offline and on LAN | contract | local-first production images build/start on this MacBook; dedicated local-first E2E/browser smoke proves `ru-RU`, anonymous core game flow, Jazz local reload persistence, optional two-client LAN sync, map/shared-state persistence across restart, and no blocking dependency on Matrix/OIDC/Jazz Cloud/public Jitsi/BBB/Google STUN/hosted integrations; console/network audit has no blocking product errors | (pending) |

## Execution Log

| When | Task | Plan | Result |
|------|------|------|--------|
| 2026-09-17 14:55 | repair Jazz subpath TypeScript resolution | `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md` | done |
| 2026-09-20 15:11 | add complete Russian locale (`ru-RU`) | `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md` | done |
