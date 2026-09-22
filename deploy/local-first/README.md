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
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml up -d
```

Open `http://play.workadventure.localhost` in the Mac browser.

For a long-lived installation, copy `.env.example` to an ignored local file and replace the three local secrets, then pass that file with `--env-file`.

## Inspect and stop

```sh
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml ps
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml logs --tail=200
docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml down
```

`down` keeps the Redis and map-storage named volumes. `down -v` deletes them and is destructive.

## Release boundary

This row proves packaging, source-image build, and a bounded service-health runtime readback only. Server durability/backup tooling is added in Sprint row 4. Full browser/product runtime, `ru-RU`, Jazz reload persistence, restart persistence, browser/container Internet isolation, and network-destination auditing are validated in Sprint row 5.
