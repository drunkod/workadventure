> **Archived**: 2026-09-22 12:57
> **Related Plan**: plans/archive/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260922-1257
> **Archive Projection V1**: `plans/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md` => `plans/archive/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md`
> **Archive Projection V1**: `tasks/notes/20260921-1348-add-standalone-local-first-deployment-namespace.notes.md` => `tasks/archive/notes-20260922-1257-add-standalone-local-first-deployment-namespace.md`
> **Archive Projection V1**: `tasks/contracts/20260921-1348-add-standalone-local-first-deployment-namespace.contract.md` => `tasks/archive/contract-20260922-1257-add-standalone-local-first-deployment-namespace.md`
> **Archive Projection V1**: `tasks/reviews/20260921-1348-add-standalone-local-first-deployment-namespace.review.md` => `tasks/archive/review-20260922-1257-add-standalone-local-first-deployment-namespace.md`

# Plan: Add standalone Local First deployment namespace

> **Status**: Archived
> **Created**: 20260921-1348
> **Slug**: add-standalone-local-first-deployment-namespace
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md#add standalone local-first deployment namespace
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: deterministic Compose structure/config checks plus Apple Silicon source-image build
> **Rollback Surface**: remove the new deploy/local-first namespace
> **Spec**: `docs/spec.md`
> **Research**: `docs/researches/20260920-local-first-container-architecture.md`
> **Task Contract**: `tasks/archive/contract-20260922-1257-add-standalone-local-first-deployment-namespace.md`
> **Task Review**: `tasks/archive/review-20260922-1257-add-standalone-local-first-deployment-namespace.md`
> **Implementation Notes**: `tasks/archive/notes-20260922-1257-add-standalone-local-first-deployment-namespace.md`

## Agentic Routing
- Mechanical deployment implementation only; Sprint topology decisions supersede the older overlay recommendation in research.
- GPT-5.6 Luna / low worker; no web/design/redesign.
- Existing Dockerfiles and every existing Compose file are read-only. Fork-owned compatibility Dockerfiles are allowed only at the four explicit `deploy/local-first/images/` paths frozen below.
## Frozen topology

Create only deployment-owned files under `deploy/local-first/`:
- `compose.yml`
- `.env.example`
- `README.md`
- `verify.mjs`
- `build-secrets/empty`
- `images/play.Dockerfile`
- `images/back.Dockerfile`
- `images/map-storage.Dockerfile`
- `images/uploader.Dockerfile`

Compose project name: `workadventure-local-first`.

Exact services: `reverse-proxy`, `play`, `back`, `map-storage`, `maps`, `redis`, `uploader`, `icon`. No Matrix/Synapse, OIDC, RedisInsight, messages watcher, Jazz sync server, Jitsi/BBB service, or E2E sentinel.

Only `reverse-proxy` publishes a host port: `127.0.0.1:80:80`. No Redis, gRPC, Node inspector, back, map-storage, uploader, maps, or icon host ports.

Stable browser origins use special-use localhost hosts:
- `http://play.workadventure.localhost`
- `http://maps.workadventure.localhost`
- `http://map-storage.workadventure.localhost`
- `http://uploader.workadventure.localhost`
- `http://icon.workadventure.localhost`
## Build decisions

Source-build these images:
- play: context `../..`, dockerfile `deploy/local-first/images/play.Dockerfile`, `FAST_BUILD=true`
- back: context `../..`, dockerfile `deploy/local-first/images/back.Dockerfile`
- map-storage: context `../..`, dockerfile `deploy/local-first/images/map-storage.Dockerfile`
- uploader: context `../..`, dockerfile `deploy/local-first/images/uploader.Dockerfile`
- maps: context `../../maps`, unchanged upstream `maps/Dockerfile`

The four fork-owned Dockerfiles are mechanically derived from `play/Dockerfile`, `back/Dockerfile`, `map-storage/Dockerfile`, and `uploader/Dockerfile`. Before every upstream `RUN apt-get update && apt-get install ...` line, inject an apt-source pin to:
- `http://snapshot.debian.org/archive/debian/20260418T120000Z bullseye main`
- `http://snapshot.debian.org/archive/debian/20260418T120000Z bullseye-updates main`
- `http://snapshot.debian.org/archive/debian-security/20260418T120000Z bullseye-security main`
with `[check-valid-until=no]`. In `play.Dockerfile` only, also insert `ENV GENERATE_SOURCEMAP=false` immediately before the existing Sentry-secret/Vite production build RUN. This is the sole additional divergence: the upstream play build hard-caps V8 at 6144 MB and reproducibly hit that limit; Local First has Sentry disabled, so production source maps are unnecessary. `verify.mjs` must mechanically derive the expected compatibility files from current upstream sources and compare bytes, so future upstream recipe drift fails verification.

Reuse images `traefik:v3.6.1`, `redis:6`, and `matthiasluedtke/iconserver:v3.21.0`.

The play recipe requires six BuildKit Sentry secret mounts even when Sentry is disabled. Define six Compose build secrets targeting `SENTRY_RELEASE`, `SENTRY_URL`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_ENVIRONMENT`, all sourced from tracked `build-secrets/empty`. The upstream Dockerfile remains unchanged; its fork-owned compatibility copy preserves the same mounts.

Named volumes: `redis-data:/data` and `map-storage-data:/maps`.
## Runtime decisions

Traefik: Docker provider, exposed-by-default false, one HTTP entrypoint on container port 80, Docker socket read-only, no dashboard/ACME/TLS/public bind.

Play routes host `play.workadventure.localhost` to port 3000 and `/ws/` to port 3001. Maps/map-storage/uploader/icon each route by their dedicated localhost host.

Play local-first env:
- anonymous allowed; chat/upload enabled;
- `JAZZ_CHAT_ENABLED=true`, `JAZZ_SYNC_MODE=local`, peer/key/global-room blank;
- all Matrix variables blank;
- `PUSHER_URL`/FRONT/ALLOWED_CORS use play localhost;
- internal API is `back:50051`; map-storage internal URL is `http://map-storage:3000`;
- public map-storage/uploader/icon URLs use the localhost hosts above;
- starter room is `/_/global/maps.workadventure.localhost/starter/map.json`;
- OpenID, Jitsi, BBB, STUN/TURN, Sentry and hosted integrations are absent/blank/false.

Back uses local Redis, local map-storage, `STORE_VARIABLES_FOR_LOCAL_MAPS=true`, chat/upload enabled, and no hosted meeting/observability dependencies.

Map-storage uses disk `/maps`, no S3, bearer/basic/digest auth disabled for the loopback-only profile, local play URL, local API token/secret, empty external entity/resource URLs.

Uploader stores through Redis (`redis:6379`, DB 1), has no AWS config, and uses local play/uploader URLs.
## Deterministic verifier

`deploy/local-first/verify.mjs` must execute `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --format json` and fail unless:
- service set is exactly the eight frozen services;
- only reverse-proxy publishes a port and HostIp is `127.0.0.1`;
- build contexts/dockerfiles match the amended frozen build decisions; back/map-storage/uploader byte-match the mechanical Snapshot transform, while play byte-matches Snapshot transform plus the single `GENERATE_SOURCEMAP=false` insertion before its existing production Vite build;
- no service name contains synapse/matrix/oidc/redisinsight/messages/everything_started;
- play resolved env contains Jazz enabled + local mode and blank Matrix/Jazz peer/key;
- named Redis and map-storage volumes are mounted;
- internal Redis/gRPC services have no published host ports.

## Runtime readback oracle

`deploy/local-first/readback.sh` is a bounded deployment oracle required by strict Change Assessment. It must:
- start the already-built eight-service Compose stack with the example env;
- install an EXIT trap before startup that runs `docker-compose ... down --remove-orphans` without `-v`;
- wait up to 120 seconds for `play`, `map-storage`, `uploader`, and the starter map route through Traefik;
- require `docker-compose exec -T redis redis-cli ping` to return `PONG`;
- require all eight declared services to be running, while preserving existing healthcheck semantics;
- print concise PASS evidence and always tear containers down while preserving named volumes.

This is not row-5 browser E2E: it does not exercise Jazz UI, `ru-RU`, browser IndexedDB, Internet isolation, or external-destination auditing.

## Focused validation
1. `node deploy/local-first/verify.mjs`
2. `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet`
3. `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml build play back map-storage maps uploader`
4. `bash deploy/local-first/readback.sh`
5. `git diff --check`

The build is the row's long deterministic gate. Existing upstream Dockerfiles remain immutable. The approved snapshot-pinned compatibility Dockerfiles are the only row-3 recipe divergence.
## Promotion Gate
- **Merge/PR unit**: new standalone `deploy/local-first/` namespace only.
- **Rollback surface**: delete/revert that namespace.
- **Verification boundary**: deterministic config verifier + Compose config + source image build + bounded local runtime readback.
- **Review/acceptance boundary**: read-only Luna-low inspection of frozen build/config evidence.
- **High-risk surface**: accidental host/LAN exposure, hidden cloud/auth services, wrong build context.
- **Why not checklist row**: establishes the release deployment boundary used by rows 4–5.

## Evidence Contract
- **State/progress path**: this plan, contract/review/notes, Sprint row 3.
- **Verification evidence**: current-exact Compose verifier/config/build/runtime-readback snapshots.
- **Evaluator rubric**: new files only; exact service/topology/build decisions; loopback-only host exposure; no networked Jazz/Matrix/OIDC defaults.
- **Stop condition**: contract fulfilled, semantic PASS, final verify-sprint, closeout.
- **Rollback surface**: revert row-3 publication.

## Task Breakdown
- [ ] Create standalone Compose and local env example.
- [ ] Add mechanically-derived snapshot-pinned compatibility Dockerfiles and build-secret placeholders while keeping upstream recipes untouched.
- [ ] Add deterministic Compose verifier, bounded runtime readback, and runbook.
- [ ] Pass Apple Silicon source-image build.
- [ ] Pass semantic acceptance.
