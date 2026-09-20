# Sprint: Local-first single-device release — Luna-low fast cycle

> **Status**: Approved
> **Slug**: local-first-single-device-luna-low
> **Created**: 2026-09-20 16:28
> **Updated**: 2026-09-20 16:41
> **Source PRD**: `plans/prds/20260917-1435-jazz-runtime-compatibility.prd.md`
> **Source Spec**: `docs/spec.md`
> **Source Research**: `docs/researches/20260920-local-first-jazz-audit.md`; `docs/researches/20260920-local-first-container-architecture.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental
> **Execution Profile**: GPT-5.6 Luna / low mechanical worker + GPT-5.6 Luna / low read-only verifier

## PRD

Ship the first honest Local First release boundary for this fork: one browser profile uses Jazz as local durable chat storage with no Jazz network peer, while the normal WorkAdventure game remains served by a local source-built stack on the MacBook. The deployment is fork-owned and standalone under `deploy/local-first/`; existing upstream Dockerfiles are read-only build inputs and existing upstream Compose files are not modified by this Sprint.

This Sprint is intentionally smaller than the full Local First roadmap. TypeScript compatibility and `ru-RU` localisation are accepted prerequisites from the superseded Sprint. LAN/multi-device sync, private/direct-room authorization, broad durable-domain migration, browser-only offline gameplay, and air-gapped distribution belong to later Sprints after this single-device release gate is green.

### Decision Precedence

For this Sprint, this document is the execution authority for Local First topology and acceptance. Its standalone `deploy/local-first/` deployment and dedicated release gate **supersede** the source PRD's older `docker-compose.yaml` + `docker-compose.e2e.yml` release-topology requirement and the older container research document's Compose-overlay recommendation. Those sources remain historical/evidence context only where they do not conflict with this Sprint.

Every expanded row contract must cite and preserve this precedence. A worker must not reinstate the superseded overlay/full-upstream-E2E topology as the Local First release design.

### Problem

- Current Jazz startup silently synthesizes `wss://cloud.jazz.tools` when no peer is configured, so enabling Jazz is not local-only.
- Current `GameManager.getChatConnection()` can fall through from Jazz failure into Matrix initialization, so Jazz local mode is not provider-fail-closed.
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
- Jazz mode selection follows the frozen configuration table below; no blank/invalid/contradictory state silently selects a networked mode.
- When Jazz is selected, Jazz initialization/persistence failure leaves chat explicitly unavailable and never initializes Matrix or another chat provider; gameplay may continue.
- Local Jazz initialization fails clearly on incompatible context reuse, unavailable room pointers, timeout, or browser storage failure rather than pretending persistence succeeded.
- The supported Local First chat surface is the automatically selected main room with text/image/edit/delete only; unsupported room/folder/direct/invite/moderation operations are unavailable and cannot report success.
- A standalone `deploy/local-first/` production namespace builds this fork using existing upstream-owned Dockerfiles without modifying or replacing any existing Dockerfile or Compose file.
- The default Local First stack keeps local `play`, `back`, `map-storage`, `maps`, `redis`, `uploader`, `icon`, and routing as required by enabled features while Matrix/OIDC/hosted integrations are not core dependencies.
- Map storage and server-side persistent variables/uploads have the frozen local durability/restore policy below and tested volumes.
- A production-built single-device flow passes `ru-RU`, anonymous core gameplay, Jazz local text/image/edit/delete + reload persistence, server restart persistence, and the measurable runtime network-isolation gate below.

### Frozen Jazz Configuration Table

| Configuration | Required behavior |
|---|---|
| Jazz disabled | Do not create/validate a Jazz context or peer; existing non-Jazz provider behavior is unchanged. |
| Jazz enabled + mode absent/blank | Configuration error; Jazz chat enters unavailable/error state; no Matrix/provider fallback. |
| Jazz enabled + invalid mode | Configuration error; no provider fallback. |
| `local` + any peer/key value | Ignore stale peer/key values; pass exactly `sync: { when: "never" }`; create no Jazz network peer. |
| `peer` + missing/blank/non-`ws:`/`wss:` peer | Configuration error; no cloud synthesis and no provider fallback. |
| `peer` + valid `ws:`/`wss:` peer | Use exactly the configured peer; do not synthesize cloud configuration. |
| `cloud` + peer supplied | Configuration error; ambiguous precedence is forbidden. |
| `cloud` + key missing/blank | Configuration error. |
| `cloud` + non-empty key and no peer | Explicit compatibility mode; synthesize the Jazz Cloud URL from that key only. |

Peer validation proves URL syntax/scheme only. Browser reachability belongs to runtime/deployment verification, not the configuration parser.

### Frozen Jazz Lifecycle Rules

- Equivalent concurrent initialization requests share one initialization operation.
- Reinitialization with the same effective mode/configuration is idempotent.
- Reinitialization with incompatible effective configuration rejects without replacing the active context.
- Row 2 uses a **5,000 ms main-room readiness timeout**. Readiness is reached only after the selected main room is loaded and usable.
- Initialization failure or readiness timeout leaves Jazz chat in `ON_ERROR`/unavailable state, never `ONLINE`.
- Preserve stale/unavailable room pointers and fail clearly; do not silently allocate a replacement room that strands old data.
- A failed partial initialization must be retryable after teardown/reset of only the failed local attempt; it must not poison a later equivalent retry.
- A mutation is not described as durably saved merely because an in-memory object changed. Focused tests must establish the supported local durability condition before reload/restart assertions.
- When Jazz is selected in this Local First distribution, any Jazz failure is provider-exclusive: **zero Matrix-client initialization calls and zero alternate chat-provider selection**.

### Frozen Supported Chat Surface

- Supported: automatically selected main room; text send/read; image send/read; edit; delete; reload persistence.
- Unsupported in this release: additional room creation, folders, direct/private rooms, invitations, membership changes, kick/ban/moderation, shared room discovery.
- Local First mode must hide/disable the corresponding user actions where exposed and underlying unsupported operations must fail explicitly rather than return fake success.
- Implement only minimal mode-specific gating; do not design a general authorization/permissions system in this Sprint.

### Frozen Server Durability Policy

- Redis uses AOF with `appendonly yes`, `appendfsync everysec`, and `maxmemory-policy noeviction`; the documented abrupt-crash loss window is up to approximately one second for Redis-backed acknowledged writes.
- Map storage uses its local disk path on a named volume. Redis data uses a separate named volume.
- Backup is a **maintenance-window backup**, not an online distributed snapshot: stop/quiesce write-producing application services, force/confirm Redis persistence, then capture the Redis and map-storage volumes.
- Restore never overwrites the active user deployment by default. Restore smoke targets a separate Compose project with fresh destination volumes.
- Verify restored representative map content, one persistent shared/player variable, and one non-expired uploader object through application-facing interfaces, not only filesystem existence.
- Temporary/expired data is excluded from persistence assertions.
- Backup evidence records source revision, image identities, backup checksums, procedure, and smoke results under ignored `_ops/`.
- Docker/server backups explicitly **do not** back up browser IndexedDB, localStorage pointers, Jazz account state, or browser-profile identity.

### Frozen Runtime Network-Isolation Gate

- Image/dependency acquisition happens before isolation; air-gapped builds are out of scope.
- During row 5 runtime acceptance, deny public Internet egress for both the test browser and application containers while preserving loopback and required Docker/container-network traffic.
- A control probe must prove public egress is actually blocked before product scenarios run.
- Core scenarios must pass without relaxing isolation.
- Record every attempted external destination. Any Jazz peer creation/request in `local` mode fails acceptance.
- Other optional blocked outbound requests may be recorded as non-blocking findings only when they neither stall/fail the supported core flow nor trigger a networked fallback.
- Record the isolation method, external-destination inventory, browser/container logs, tested source revision, and image identities in release evidence.

### Acceptance Scenarios

- A fresh browser in local mode creates and uses the main Jazz room, reaches loaded readiness within 5 seconds, reloads, and reads the same locally durable messages without creating a Jazz peer.
- Stale peer/API-key configuration in `local` mode is ignored and produces zero Jazz network peers.
- `peer` without a valid `ws:`/`wss:` URL fails clearly and never falls back to cloud or Matrix; explicit `cloud` requires a key and rejects a simultaneous peer.
- Force Jazz initialization failure while stale Matrix configuration is present: gameplay may continue, but chat is unavailable, with zero Matrix-client initialization calls and zero Jazz peer creation.
- Local storage/IndexedDB denial, stale room pointers, incompatible second initialization, and readiness timeout produce explicit failure evidence and no silent replacement room.
- Unsupported room/folder/direct/invite/moderation actions are not usable in the Local First UI and do not return successful no-ops underneath.
- A clean checkout resolves `deploy/local-first/compose.yml`, builds source images on Apple Silicon, starts only declared local services, and serves the application through a stable local origin.
- Redis/map-storage data survives normal container restart and the separate-project maintenance-window backup/restore smoke; browser-profile loss is not advertised as recovered.
- With public Internet blocked after image acquisition, the supported core flow still works; the control probe proves isolation; Jazz local mode makes no peer request; every attempted external destination is inventoried and no blocked optional request breaks or stalls the core UI.

### Non-goals

- Multi-browser or LAN Jazz synchronization.
- Direct/private messaging, shared room discovery, invitations, membership, moderation, or Jazz account recovery across profiles beyond disabling unsupported Local First controls.
- Replacing WorkAdventure real-time simulation/signaling with Jazz.
- Browser-only static/PWA gameplay with no local WorkAdventure services.
- A production Jazz sync server or packaging package test code as a server.
- Air-gapped image bundles or fresh-machine installation without a container runtime.
- Creating, copying, replacing, or modifying any Dockerfile in this Sprint.
- Modifying existing upstream `docker-compose*.yml` / `docker-compose*.yaml` files for Local First deployment.

## Architecture Notes

### Frozen Decisions

- The first release is a **hybrid local-hosted application**: Jazz owns single-browser chat persistence; WorkAdventure local services continue to own login, room sockets, simulation, map editing, maps, and server-side variable persistence.
- `local` means no Jazz network peer, not “the whole game runs without local HTTP/WebSocket services.”
- Jazz selection is provider-exclusive. In Local First mode a Jazz error never falls through to Matrix; chat fails closed while the game may continue.
- Deployment ownership is `deploy/local-first/`. It is self-contained rather than an overlay on the upstream development/E2E Compose stack.
- Existing `play/Dockerfile`, `back/Dockerfile`, `map-storage/Dockerfile`, `maps/Dockerfile`, and `uploader/Dockerfile` are upstream-owned read-only build recipes. **No new or modified Dockerfile is authorized in this Sprint.** If an approved recipe cannot build the fork, return `BLOCKED` with failing command, source revision, logs, and affected recipe; a new recipe requires a separately approved contract amendment.
- `maps` keeps its `maps/` build context; the other inspected production build recipes use the repository root context.
- No Jazz LAN sync service is part of this Sprint. The installed `cojson-transport-ws@0.20.10` server artifact under test sources is forbidden as production infrastructure.
- Redis/map-storage container volumes do not include browser IndexedDB/account state. Browser-profile recovery remains a separately stated boundary.

### Luna-low Execution Policy

- Every row is `contract` mode and must expand into one decision-complete work-package before code changes.
- Mechanical worker: `gpt-5.6-luna`, reasoning `low`, low verbosity, web search disabled, workspace-write only to contract `allowed_paths`.
- Semantic verifier: `gpt-5.6-luna`, reasoning `low`, read-only, consumes frozen deterministic evidence rather than rerunning long gates.
- The worker instruction is: **design is already decided; do not redesign, browse, or widen scope; implement exactly the contract; return BLOCKED when a required decision is absent.**
- The configured executor must expose the declared worker/verifier model. Model unavailability is `BLOCKED`; silent model substitution or reasoning-effort escalation is forbidden.
- Execute one row at a time. Do not run overlapping writers against the same worktree or Local First runtime.
- Focused checks run inside the contract. Long production builds/E2E belong to the deterministic orchestrator/evidence step, not a Luna process waiting on logs.
- One semantic review per row after machine checks. No silent escalation to a deeper/expensive model.

### Required Contract Expansion Shape

Each row expansion must contain all of these before implementation:

- **Decisions** — no unresolved product/architecture behavior; reference the frozen sections above.
- **Write scope** — exact allowed paths/directories and explicit exclusions.
- **Implementation** — ordered bounded steps; no optional redesign branch.
- **Focused validation** — exact commands and machine assertions.
- **Long-gate evidence** — orchestrator command, source/diff identity, timeout, blocker classification, artifact locations.
- **Verifier** — read-only source/test/evidence inspection; does not repeat long builds; missing/mismatched evidence returns `BLOCKED`.

### Capabilities Touched

- `play` frontend/pusher environment configuration and Jazz chat adapter/provider selection.
- Browser IndexedDB/localStorage persistence and Jazz runtime lifecycle.
- Minimal Local First UI gating for unsupported chat operations.
- Fork-owned deployment under `deploy/local-first/`.
- Docker/Compose source builds, map-storage/Redis local persistence, backup/restore, and production E2E/network evidence.
- Existing `ru-RU` runtime as a production acceptance surface only; localisation content is not reopened.

### Dependency Order

- Row 1 implements the complete sync-policy truth table that every later Local First path depends on.
- Row 2 makes provider selection, local lifecycle, supported-surface gating, and persistence failure modes deterministic before packaging.
- Row 3 packages only those accepted semantics in the standalone deployment namespace using upstream Dockerfiles read-only.
- Row 4 implements the frozen maintenance-window durability/restore procedure before release testing.
- Row 5 is the release boundary and runs only after rows 1–4 are accepted.

### Risks

- A local deployment can still make hidden outbound requests through maps/assets/integrations even when Jazz Cloud is disabled; row 5 records all attempted external destinations under enforced runtime isolation.
- Browser origin changes can strand origin-scoped IndexedDB/localStorage; the deployment must keep a stable origin.
- Redis AOF `everysec` still has a bounded recent-write loss window; release documentation must not claim zero-loss crash durability.
- `ONLINE` chat status can overclaim readiness; row 2 binds readiness to main-room load within the frozen timeout.
- Production image builds must not accidentally depend on generated workstation artifacts; row 3/5 run from a clean source context.
- Upstream WorkAdventure updates can change build contexts or service contracts; the deployment stays isolated and the final gate verifies referenced upstream recipes instead of copying them.

## Backlog

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 9a7bcb4332f28a96f8c87d954be2cdeabc936567c5e1e99b2685568ac197765d | [ ] | add explicit Jazz local/peer/cloud sync policy | contract | implement the frozen configuration table end-to-end pusher → front config → `GameManager` → Jazz adapter/runtime; local passes exactly `sync: { when: "never" }` and ignores stale peer/key without creating a peer; peer requires `ws:`/`wss:`; cloud rejects peer and requires key; blank/invalid Jazz mode errors; focused tests plus normal `play` typecheck pass | (pending) |
| 2 | badb3c676d5ac5c8b856cd547ef6c9b9b9b7055301f35a7235a3eeb9813b24d3 | [ ] | make Jazz local persistence lifecycle fail closed | contract | implement frozen lifecycle/provider-exclusive rules: equivalent concurrent init shares work; same-config retry is idempotent; incompatible config rejects; 5s main-room readiness timeout; stale pointer/storage failure remains error without replacement; Jazz failure cannot initialize Matrix; unsupported room/folder/direct/invite/moderation actions are unavailable; focused persistence/reload/error tests pass with zero Jazz peers in local mode | (pending) |
| 3 | 00bd83d0e90e810f15bcaa68cc419c9442ac0d03580173a018d713e903b04f88 | [ ] | add standalone local-first deployment namespace | contract | new deployment files live under `deploy/local-first/`; `compose.yml` source-builds this fork by referencing existing upstream-owned Dockerfiles read-only, keeps correct `maps/` context, enables Jazz local mode, disables Matrix/OIDC/hosted core dependencies, uses a stable local origin and named Redis/map-storage volumes, and passes Compose config/build on Apple Silicon; **no new/modified Dockerfile and no existing Docker/Compose changes**; recipe incompatibility returns `BLOCKED` with evidence | (pending) |
| 4 | 67c56e57d56919c843ee8639bfa01a057c6a75cb983d735c81cec22a4c6dad84 | [ ] | add local-first server durability and restore tooling | contract | implement frozen Redis AOF/noeviction policy plus named volumes and maintenance-window backup/restore scripts; restore refuses active-volume overwrite and targets a separate Compose project with fresh volumes; verify representative map, persistent variable, and non-expired upload through application interfaces; record revision/images/checksums/results under ignored `_ops/`; docs state browser Jazz data is outside Docker backup | (pending) |
| 5 | 6e07dbde63a1c95acff6276edfeb266fdda8bd1e23222386f83d5c58ddbf9ed7 | [ ] | production-test single-device local-first release on MacBook | contract | from a clean source tree build/start the Local First images, prove the public-egress block control, then run dedicated E2E/browser smoke for anonymous core flow, `ru-RU`, Jazz main-room text/image/edit/delete + reload, supported persistence, and stable local origin; both browser and containers remain public-Internet isolated; inventory every attempted external destination; any Jazz peer request or networked provider fallback fails; optional blocked requests must not stall/break core behavior | (pending) |

## Deferred Follow-up Sprints

After row 5 passes, create separate Sprints for:

1. **Shared Jazz domain foundation** — stable room registry, account binding, real membership/permissions, capability-aware UI, and no public-writer DMs.
2. **Qualified LAN sync** — supported Jazz/cojson server, browser-reachable trusted `wss://`, two isolated profiles, partition/reconnect/server-restart tests.
3. **Durable-domain migration** — one bounded WorkAdventure domain at a time behind existing repository interfaces, with import/rollback and one write authority.
4. **Air-gapped packaging** — architecture-specific image bundle, seeded assets, checksums, fresh install and restore without Internet.

## Execution Log

| When | Task | Plan | Result |
|------|------|------|--------|
