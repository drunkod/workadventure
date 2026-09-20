# Local-first container architecture analysis

> Date: 2026-09-20
> Scope: WorkAdventure fork on `d/local_jazz_chat`
> Method: repo-wide CodeGraph index (2,043 files / 24,058 symbols / 70,472 edges), existing Docker/Compose variants, installed Jazz 0.20.10 sources, and current production-evaluation evidence.

## Executive decision

The local-first product does **not** require a replacement Dockerfile for the main WorkAdventure services. The existing production Dockerfiles for `play`, `back`, `map-storage`, `maps`, and `uploader` are already suitable build boundaries.

The correct next deployment artifact is a new **`docker-compose.local-first.yml` overlay/profile** that reuses those images while removing upstream cloud/auth assumptions and adding durable local volumes.

A new Dockerfile/package is justified only for an **optional local Jazz sync service** used for LAN/multi-device synchronization. Single-device local-first chat does not require a sync server: Jazz 0.20.10 explicitly supports `sync: { when: "never" }` while retaining IndexedDB storage.

## Repo-wide architecture findings

### Indexed codebase

CodeGraph reports:
- 2,043 indexed files
- 24,058 symbols
- 70,472 relationships
- main languages: TypeScript, Svelte, JavaScript, YAML

The relevant dependency path is:

```text
browser/front
  -> pusher endpoints in play
     -> Room.getMapDetail / anonymLogin / websocket
        -> back multiplayer room service
           -> map-storage for WAM edits/state
           -> optional Redis for persistent shared/player variables
  -> local/static maps service for starter map/assets
  -> JazzChatConnection
     -> JazzRuntime
        -> IndexedDB local storage
        -> optional WebSocket sync peer
```

### Services required for the current local-first game shell

| Service | Local-first status | Why |
|---|---|---|
| `reverse-proxy` | required | stable localhost routing for browser HTTP/WebSocket endpoints |
| `play` | required | built frontend plus pusher HTTP/WebSocket/Room API surface |
| `back` | required | multiplayer room/socket coordination; `ConnectionManager.connectToRoomSocket` depends on it |
| `map-storage` | required | WAM/map editor state and edit command persistence |
| `maps` | required for current starter flow | `.env` `START_ROOM_URL` points to locally served starter map |
| `icon` | keep | core local UI references icon service; cheap local dependency |
| `redis` | keep but local | back already has a void fallback, but local Redis preserves shared/player variables and supports uploader |
| `uploader` | keep local initially | can store through local Redis and preserves non-Jazz upload/admin paths; Jazz image messages themselves use `jazz-tools/media` directly |

### Services that should not be required by the local-first core profile

| Service/dependency | Local-first treatment | Evidence |
|---|---|---|
| Synapse/Matrix | disabled | existing `docker-compose.no-synapse.yaml` already proves Matrix can be removed by blanking Matrix config; Jazz implements `ChatConnectionInterface` |
| OIDC mock / external OIDC | disabled | anonymous login is a supported path; `ConnectionManager.anonymousLogin()` talks only to local pusher |
| RedisInsight | disabled | diagnostics only |
| `messages` dev watcher | disabled in production profile | production Dockerfiles generate protobuf artifacts during image builds |
| external Jitsi | blank/disabled | `.env.template` defaults to `meet.jit.si`, which violates offline/local-first core acceptance |
| external BBB | blank/disabled | template points at public test service |
| Google STUN | blank for core offline acceptance | template points at `stun.l.google.com`; LAN host candidates must be tested without it |
| Google/YouTube/other hosted integrations | false in core local-first profile | optional cloud integrations, not prerequisites for core map/chat flow |
| Jazz Cloud | forbidden in local-only mode | current `JazzRuntime.buildCloudPeer()` silently falls back to `wss://cloud.jazz.tools`; this must become explicit, never implicit in local-first mode |
| Sentry/analytics | blank/disabled | observability must not create a network requirement for local-first core use |

## Jazz local-first semantics

Installed `jazz-tools` is 0.20.10.

`SyncConfig` supports exactly these shapes:

```ts
{ peer: `ws://${string}` | `wss://${string}`, when?: "always" | "signedUp" }
{ peer?: `ws://${string}` | `wss://${string}`, when: "never" }
```

`createBrowserContext` always creates IndexedDB storage before checking sync mode. With `when: "never"`, it creates no WebSocket peer and still returns the local storage-backed context.

Therefore the product needs an explicit runtime policy, proposed as:

```text
JAZZ_SYNC_MODE=local   -> sync: { when: "never" }          (no network, IndexedDB)
JAZZ_SYNC_MODE=peer    -> explicit JAZZ_SYNC_PEER required (LAN/self-host)
JAZZ_SYNC_MODE=cloud   -> current cloud/API-key behavior   (compatibility mode)
```

The exact variable name is implementation-level, but the three semantics and fail-closed rules are fixed:
- local mode must never synthesize a cloud URL;
- peer mode must fail clearly when no peer is configured;
- cloud mode remains opt-in and backwards-compatible.

## Local Jazz LAN sync server boundary

The repository does **not** contain a production sync-server package/image for Jazz 0.20.10. `cojson-transport-ws` contains a WebSocket sync server only under its test sources. Test-only code is not an acceptable production deployment dependency.

A dedicated compatibility/proof task must therefore identify and pin a supported server implementation for the exact Jazz/cojson protocol version. If no supported image/package exists, implement the smallest supported server package in-repo and give it its own Dockerfile, healthcheck, and persistent storage. Do not promote `src/tests/syncServer.ts` into production.

## Local-first Compose design

Create `docker-compose.local-first.yml` as an overlay on the existing source-building production-like stack (`docker-compose.yaml` + `docker-compose.e2e.yml`) rather than duplicating all service definitions.

The overlay should:
- set Jazz on and Matrix/OIDC/cloud integrations off;
- choose Jazz local mode by default;
- disable `synapse`, `oidc-server-mock`, `redisinsight`, development `messages`, and E2E sentinel services from the default local-first profile;
- retain `play`, `back`, `map-storage`, `maps`, `redis`, `uploader`, `icon`, `reverse-proxy`;
- add named durable volumes for Redis and map-storage;
- avoid Jitsi/BBB/Google STUN/cloud integration defaults in the core profile;
- expose a documented one-command build/start path on Apple Silicon;
- optionally compose in a local Jazz sync service for LAN/multi-device mode.

Existing `docker-compose.minio.yaml` and `docker-compose.livekit.yaml` remain optional feature overlays rather than mandatory core local-first services.

## Production test strategy

Keep the current upstream production-like row as a compatibility baseline. It verifies the fork still builds in the repository's documented topology.

After local-first implementation, add a dedicated local-first test path because the existing full E2E suite contains tests for Matrix/OIDC and other services intentionally absent from the local-first profile.

Local-first acceptance must prove:
1. production images build from this source tree on the MacBook;
2. only the declared local services are required;
3. `ru-RU` loads in the production build;
4. Jazz local mode sends/reads messages and survives page reload with no `cloud.jazz.tools` request;
5. local persisted data survives container restart where applicable (maps/shared variables); browser IndexedDB survives app reload/restart;
6. optional LAN peer mode synchronizes two isolated browser contexts through the local sync service and survives sync-service restart if persistent server storage is supported;
7. core browser/network audit shows no blocking dependency on Jazz Cloud, Jitsi, BBB, Google STUN, OIDC, Matrix, or hosted document integrations;
8. console/network logs contain no blocking product errors.

## New Sprint decomposition

1. **Explicit local-only Jazz mode** — make cloud sync opt-in, prove IndexedDB-only operation.
2. **Local-first Compose profile** — reuse current app Dockerfiles; remove cloud/auth/Matrix assumptions; add local persistence and runbook.
3. **Supported local Jazz LAN sync service** — prove protocol-compatible server, then package/integrate it; a new Dockerfile is allowed here only.
4. **Local-first production E2E** — build/run on this MacBook and test offline/local-only + optional LAN sync, Russian locale, persistence, console/network behavior.

## Non-goals for this Sprint

- Rewriting WorkAdventure into a pure static/PWA app with no pusher/back server.
- Removing existing cloud/Matrix code paths from the repository; local-first is an explicit deployment/runtime mode.
- Making optional hosted integrations work offline.
- Replacing existing production Dockerfiles without evidence that they block local-first packaging.
