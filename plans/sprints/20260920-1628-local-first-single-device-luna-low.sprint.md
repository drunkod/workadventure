# Sprint: Local-first single-device release — Luna-low fast cycle

> **Status**: Approved
> **Slug**: local-first-single-device-luna-low
> **Created**: 2026-09-20 16:28
> **Updated**: 2026-09-20 16:30
> **Source PRD**: `plans/prds/20260917-1435-jazz-runtime-compatibility.prd.md`
> **Source Spec**: `docs/spec.md`
> **Source Research**: `docs/researches/20260920-local-first-jazz-audit.md`; `docs/researches/20260920-local-first-container-architecture.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental
> **Execution Profile**: GPT-5.6 Luna / low mechanical worker + GPT-5.6 Luna / low read-only verifier

## PRD

Ship the first honest Local First release boundary for this fork: one browser profile uses Jazz as local durable chat storage with no Jazz network peer, while the normal WorkAdventure game remains served by a local source-built stack on the MacBook. The deployment is fork-owned and standalone under `deploy/local-first/`; existing upstream Dockerfiles are read-only build inputs and existing upstream Compose files are not modified by this Sprint.

This Sprint is intentionally smaller than the full Local First roadmap. TypeScript compatibility and `ru-RU` localisation are accepted prerequisites from the superseded Sprint. LAN/multi-device sync, private/direct-room authorization, broad durable-domain migration, browser-only offline gameplay, and air-gapped distribution belong to later Sprints after this single-device release gate is green.

### Problem

- Current Jazz startup silently synthesizes `wss://cloud.jazz.tools` when no peer is configured, so enabling Jazz is not local-only.
- Current Jazz context/pointer lifecycle can silently reuse incompatible state or swallow browser storage failures.
- Fork-specific production deployment must stop accumulating changes in upstream-owned Compose/Docker surfaces because this branch will continue importing upstream WorkAdventure.
- The release needs production evidence from the actual Local First stack, not the upstream Matrix/OIDC-heavy E2E topology.
- Local server durability and browser persistence expectations must be explicit enough that a successful run is not confused with backup/recovery guarantees.

### Users

- The maintainer developing and updating this WorkAdventure fork from upstream.
- A single MacBook user running the Local First application without required public Internet services.
- Russian-speaking users exercising the already accepted `ru-RU` locale in the production build.

### Success Criteria

- `JAZZ_SYNC_MODE=local` reaches Jazz 0.20.10 as `sync: { when: "never" }` and cannot open or synthesize a Jazz WebSocket peer.
- `peer` and `cloud` are explicit, validated modes; neither is silently selected from blank or contradictory configuration.
- Local Jazz initialization fails clearly on incompatible context reuse, unavailable room pointers, or browser storage failure rather than pretending persistence succeeded.
- A standalone `deploy/local-first/` production namespace builds this fork using existing upstream-owned Dockerfiles without modifying any existing Dockerfile or Compose file.
- The default Local First stack keeps local `play`, `back`, `map-storage`, `maps`, `redis`, `uploader`, `icon`, and routing as required by enabled features while Matrix/OIDC/hosted integrations are not core dependencies.
- Map storage and server-side persistent variables/uploads have an explicit local durability/restore policy and tested volumes.
- A production-built single-device flow passes `ru-RU`, anonymous core gameplay, Jazz local text/image/edit/delete + reload persistence, server restart persistence, and a no-required-Internet network audit.

### Acceptance Scenarios

- A fresh browser in local mode creates and uses a Jazz room, reloads, and reads the same locally stored messages without contacting `cloud.jazz.tools`.
- Stale peer/API-key configuration does not create a peer while mode is `local`.
- `peer` without a valid browser-reachable `ws:`/`wss:` URL fails clearly and never falls back to cloud; `cloud` remains explicit compatibility behavior.
- Local storage/IndexedDB denial, stale room pointers, and incompatible in-page Jazz configuration produce explicit failure evidence.
- A clean checkout resolves `deploy/local-first/compose.yml`, builds source images on Apple Silicon, starts only declared local services, and serves the application through a stable local origin.
- Internet access can be blocked while loopback/local services remain reachable; the supported core flow still works and the browser/container audit shows no required Jazz Cloud, Matrix, OIDC, public Jitsi/BBB, Google STUN, Sentry, or hosted-document dependency.
- Redis/map-storage data survives normal container restart and the documented local backup/restore smoke; browser-profile loss is not advertised as recoverable unless a later supported export/restore task proves it.

### Non-goals

- Multi-browser or LAN Jazz synchronization.
- Direct/private messaging, shared room discovery, invitations, membership, moderation, or Jazz account recovery across profiles.
- Replacing WorkAdventure real-time simulation/signaling with Jazz.
- Browser-only static/PWA gameplay with no local WorkAdventure services.
- A production Jazz sync server or packaging package test code as a server.
- Air-gapped image bundles or fresh-machine installation without a container runtime.
- Modifying existing upstream `Dockerfile` or `docker-compose*.yml` / `docker-compose*.yaml` files for Local First deployment.

## Architecture Notes

### Frozen Decisions

- The first release is a **hybrid local-hosted application**: Jazz owns single-browser chat persistence; WorkAdventure local services continue to own login, room sockets, simulation, map editing, maps, and server-side variable persistence.
- `local` means no Jazz network peer, not “the whole game runs without local HTTP/WebSocket services.”
- Deployment ownership is `deploy/local-first/`. It is self-contained rather than an overlay on the upstream development/E2E Compose stack.
- Existing `play/Dockerfile`, `back/Dockerfile`, `map-storage/Dockerfile`, `maps/Dockerfile`, and `uploader/Dockerfile` are upstream-owned read-only build recipes. If a Local First-specific image recipe becomes necessary, add a new file under `deploy/local-first/images/`; never patch the upstream recipe in this Sprint.
- `maps` keeps its `maps/` build context; the other inspected production build recipes use the repository root context.
- No Jazz LAN sync service is part of this Sprint. The installed `cojson-transport-ws@0.20.10` server artifact under test sources is forbidden as production infrastructure.
- Redis/map-storage container volumes do not include browser IndexedDB/account state. Browser-profile recovery remains a separately stated boundary.

### Luna-low Execution Policy

- Every row is `contract` mode and must expand into one decision-complete work-package before code changes.
- Mechanical worker: `gpt-5.6-luna`, reasoning `low`, low verbosity, web search disabled, workspace-write only to contract `allowed_paths`.
- Semantic verifier: `gpt-5.6-luna`, reasoning `low`, read-only, consumes frozen deterministic evidence rather than rerunning long gates.
- The worker instruction is: **design is already decided; do not redesign, browse, or widen scope; implement exactly the contract; return BLOCKED when a required decision is absent.**
- Execute one row at a time. Do not run overlapping writers against the same worktree or Local First runtime.
- Focused checks run inside the contract. Long production builds/E2E belong to the deterministic orchestrator/evidence step, not a Luna process waiting on logs.
- One semantic review per row after machine checks. No silent escalation to a deeper/expensive model.

### Capabilities Touched

- `play` frontend/pusher environment configuration and Jazz chat adapter.
- Browser IndexedDB/localStorage persistence and Jazz runtime lifecycle.
- Fork-owned deployment under `deploy/local-first/`.
- Docker/Compose source builds, map-storage/Redis local persistence, and production E2E/network evidence.
- Existing `ru-RU` runtime as a production acceptance surface only; localisation content is not reopened.

### Dependency Order

- Row 1 freezes and implements the explicit runtime policy that every later Local First deployment depends on.
- Row 2 makes local persistence/lifecycle failure modes deterministic before production packaging.
- Row 3 packages only those accepted semantics in a standalone deployment namespace.
- Row 4 makes local server durability and restore behavior explicit before release testing.
- Row 5 is the release boundary and runs only after rows 1–4 are accepted.

### Risks

- A local deployment can still make hidden outbound requests through maps/assets/integrations even when Jazz Cloud is disabled; row 5 requires browser and container network evidence.
- Browser origin changes can strand origin-scoped IndexedDB/localStorage; the deployment must keep a stable origin.
- Redis named volumes alone do not guarantee acknowledged-write durability; row 4 must specify/test persistence mode and restore behavior.
- `ONLINE` chat status can overclaim connectivity if it is set before local data is usable; row 2 must bind readiness to local context/room availability.
- Production image builds must not accidentally depend on generated workstation artifacts; row 3/5 run from a clean source context.
- Upstream WorkAdventure updates can change build contexts or service contracts; the deployment stays isolated and the final gate verifies the referenced upstream recipes instead of copying them.

## Backlog

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 9a7bcb4332f28a96f8c87d954be2cdeabc936567c5e1e99b2685568ac197765d | [ ] | add explicit Jazz local/peer/cloud sync policy | contract | `JAZZ_SYNC_MODE` is validated and propagated pusher → front config → `GameManager` → Jazz adapter/runtime; local produces exactly `sync: { when: "never" }` and never calls/synthesizes a peer even with stale peer/key values; peer requires valid `ws:`/`wss:` and never falls back; cloud is explicit compatibility mode; focused tests plus normal `play` typecheck pass | (pending) |
| 2 | badb3c676d5ac5c8b856cd547ef6c9b9b9b7055301f35a7235a3eeb9813b24d3 | [ ] | make Jazz local persistence lifecycle fail closed | contract | incompatible second initialization cannot silently reuse the global Jazz context; room-pointer storage failures and stale/unavailable local IDs surface deterministic errors; local connection becomes usable only when its stored/main room is loaded; focused tests cover fresh create, text/image/edit/delete, reload, denied storage, stale pointer, and zero Jazz network peers in local mode | (pending) |
| 3 | 00bd83d0e90e810f15bcaa68cc419c9442ac0d03580173a018d713e903b04f88 | [ ] | add standalone local-first deployment namespace | contract | new deployment files live under `deploy/local-first/`; `compose.yml` source-builds this fork by referencing existing upstream-owned Dockerfiles read-only (or adds a new recipe only under `deploy/local-first/images/` if strictly required), keeps correct `maps/` context, enables Jazz local mode, disables Matrix/OIDC/hosted core dependencies, adds stable local routing + named Redis/map-storage volumes, and passes Compose config/build on Apple Silicon; no existing Docker/Compose file changes | (pending) |
| 4 | 67c56e57d56919c843ee8639bfa01a057c6a75cb983d735c81cec22a4c6dad84 | [ ] | add local-first server durability and restore tooling | contract | the Local First Redis service has an explicit persistence/eviction policy; map-storage and Redis use durable named volumes; fork-owned backup/restore scripts write only ignored `_ops/` artifacts; a deterministic smoke proves representative map/shared-variable/upload data survives container restart and volume backup/restore; docs clearly state that Docker backup does not back up browser Jazz state | (pending) |
| 5 | 6e07dbde63a1c95acff6276edfeb266fdda8bd1e23222386f83d5c58ddbf9ed7 | [ ] | production-test single-device local-first release on MacBook | contract | from a clean source tree the Local First production images build/start and dedicated E2E/browser smoke proves anonymous core flow, `ru-RU`, Jazz local text/image/edit/delete + reload, expected server persistence, and stable local origin; with public Internet blocked but loopback/local services retained there is no required request to Jazz Cloud, Matrix/OIDC, public Jitsi/BBB, Google STUN, Sentry, or hosted integrations; console/network logs have no blocking product errors | (pending) |

## Deferred Follow-up Sprints

After row 5 passes, create separate Sprints for:

1. **Shared Jazz domain foundation** — stable room registry, account binding, real membership/permissions, capability-aware UI, and no public-writer DMs.
2. **Qualified LAN sync** — supported Jazz/cojson server, browser-reachable trusted `wss://`, two isolated profiles, partition/reconnect/restart tests.
3. **Durable-domain migration** — one bounded WorkAdventure domain at a time behind existing repository interfaces, with import/rollback and one write authority.
4. **Air-gapped packaging** — architecture-specific image bundle, seeded assets, checksums, fresh install and restore without Internet.

## Execution Log

| When | Task | Plan | Result |
|------|------|------|--------|
