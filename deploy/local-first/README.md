# Local First production deployment

This namespace is the fork-owned single-device production deployment. It is standalone: it does not include or extend the repository root Compose files. Existing upstream Dockerfiles remain read-only; the four bullseye Node images use fork-owned compatibility copies under `images/` that are mechanically checked against upstream and differ only by a pinned Debian Snapshot apt-source block.

## Scope

- Browser entrypoint: `http://play.workadventure.localhost`.
- Only Traefik publishes a host port, bound to `127.0.0.1:80`.
- Core services: reverse proxy, play, back, map-storage, maps, Redis, uploader, and icon server.
- Jazz chat runs in `JAZZ_SYNC_MODE=local`; no Jazz peer or cloud key is configured.
- Matrix/Synapse, OIDC, Jitsi, BBB, public STUN/TURN, Sentry, and hosted document integrations are not part of the core profile.
- Redis and map-storage use named Docker volumes. Browser Jazz IndexedDB/localStorage is outside Docker and is not included in Docker backup/restore.

## Verify configuration

From the repository root:

```sh
node deploy/local-first/verify.mjs
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet
```

## Build production images

```sh
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml build play back map-storage maps uploader
```

The build uses `images/play.Dockerfile`, `images/back.Dockerfile`, `images/map-storage.Dockerfile`, and `images/uploader.Dockerfile` for the four bullseye Node images, while `maps/Dockerfile` remains referenced directly. The compatibility files are deterministic transforms of the corresponding upstream recipes: immediately before each upstream apt install they replace live bullseye repositories with Debian Snapshot `20260418T120000Z` (main, bullseye-updates, and bullseye-security, with Valid-Until checks disabled). The play compatibility recipe additionally sets `GENERATE_SOURCEMAP=false` immediately before the existing production Vite build because the upstream build script hard-caps V8 at 6144 MB and reproducibly exhausted that heap while Sentry is disabled here. `verify.mjs` byte-checks these exact transforms so an upstream recipe change fails verification until the compatibility copies are refreshed. `build-secrets/empty` supplies the empty BuildKit Sentry secret mounts required by the play build when Sentry is disabled.

## Runtime readback

After the source images are built, run the bounded deployment oracle:

```sh
bash deploy/local-first/readback.sh
```

It starts the eight-service stack with `--no-build`, probes play, map-storage, uploader, and the starter map through Traefik, requires Redis `PONG`, verifies every service is running and any image healthcheck is healthy, then always tears containers down without `-v`. The Redis and map-storage named volumes are verified to remain after cleanup.

## Start

For the local single-device profile you may run directly with the example values:

```sh
docker-compose -p workadventure-local-first --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml up -d
```

Open `http://play.workadventure.localhost` in the Mac browser.

For a long-lived installation, copy `.env.example` to an ignored local file and replace the three local secrets, then pass that file with `--env-file`.

## Inspect and stop

```sh
docker-compose -p workadventure-local-first --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml ps
docker-compose -p workadventure-local-first --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml logs --tail=200
docker-compose -p workadventure-local-first --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml down
```

`down` keeps the Redis and map-storage named volumes. `down -v` deletes them and is destructive.

## Durability backup and restore

Back up during a maintenance window. This copies the complete Redis `/data` volume plus map-storage
`/maps`; it does not back up browser IndexedDB/localStorage or Jazz identity. Redis therefore captures
uploader keys that still exist at snapshot time. The restore guarantee covers normal non-expiring
uploader objects; temporary/TTL uploader or audio data may already have expired and is deliberately
not asserted. Redis uses AOF with `appendfsync everysec` and `noeviction`; `everysec` is not a hard
one-second loss guarantee across an OS, VM, kernel, or storage failure.

```sh
# Use the same project name and env file that start the long-lived source installation.
PROJECT=workadventure-local-first
ENV_FILE=/absolute/path/to/local-first.env

bash deploy/local-first/backup.sh --project "$PROJECT" --env-file "$ENV_FILE" --output _ops/local-first-backups/$(date -u +%Y%m%dT%H%M%SZ)
# The source remains stopped. Restore into a separate stopped project:
bash deploy/local-first/restore.sh --backup _ops/local-first-backups/REPLACE --project workadventure-local-first-restored --env-file "$ENV_FILE"
# Start only the restored project while validating it; both projects bind 127.0.0.1:80.
docker-compose -p workadventure-local-first-restored --env-file "$ENV_FILE" -f deploy/local-first/compose.yml up -d --no-build
# After validation, stop the restored project before restarting the exact source project:
docker-compose -p workadventure-local-first-restored --env-file "$ENV_FILE" -f deploy/local-first/compose.yml down
docker-compose -p "$PROJECT" --env-file "$ENV_FILE" -f deploy/local-first/compose.yml up -d
```

Backup atomically reserves a new output directory and records checksums, image/source metadata,
volume identities, policy, and the source env-file path (never its contents) under ignored `_ops/`.
Restore verifies checksums before creating anything, uses the recorded env-file path unless
`--env-file` overrides it, acquires an atomic host-global per-project restore claim, refuses an
existing destination container or Redis/map-storage volume, and removes only a partial destination
on failure. It leaves a successful destination stopped until explicitly started. A stale restore
claim in the host temporary directory fails closed and must be inspected before an operator removes it.

## Release boundary

This row proves packaging, source-image build, bounded service health, and server durability/backup/restore tooling. Full browser/product runtime, `ru-RU`, Jazz reload persistence, restart persistence, browser/container Internet isolation, and network-destination auditing are validated in Sprint row 5.

## Single-device release gate

Run the production release gate only from a clean committed worktree:

```sh
bash deploy/local-first/release-smoke.sh
```

The gate builds the committed Local First images before isolation, then starts a unique temporary Compose project with `release-isolation.yml`. The application/default network is internal and Traefik alone also joins an ingress bridge with Docker IP masquerading disabled, preserving `127.0.0.1:80` while denying public container egress.

The Chromium test uses a fresh `ru-RU` context and installs HTTP(S) and WS(S) interception before product navigation. Only loopback, `localhost`, and `*.localhost` are allowed. External browser destinations are recorded and aborted. Any Jazz peer/cloud/Matrix/provider fallback is a hard failure. The browser performs the normal anonymous first-run flow, verifies Russian locale persistence, then checks Jazz main-room text, image, edit, delete, and reload persistence.

On Colima, temporary source-subnet-scoped `DOCKER-USER` LOG rules inventory new forwarded container destinations. Rules are logging-only and removed by exact match during cleanup. Runtime evidence is written under ignored `_ops/local-first-release/<run-id>/`, including exact Git revision, resolved Compose config, image/container/network identities, controls, browser evidence, container logs, destination inventory, and final summary. The runner removes only its unique project and volumes and never targets the canonical `workadventure-local-first` project.

Image and dependency acquisition happen before isolation. This is a production-runtime egress gate, not an air-gapped build test.
