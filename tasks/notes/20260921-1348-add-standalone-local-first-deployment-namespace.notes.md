# Implementation Notes: add-standalone-local-first-deployment-namespace

> **Status**: Fulfilled
> **Plan**: plans/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md
> **Contract**: tasks/contracts/20260921-1348-add-standalone-local-first-deployment-namespace.contract.md
> **Review**: tasks/reviews/20260921-1348-add-standalone-local-first-deployment-namespace.review.md
> **Last Updated**: 2026-09-22 12:42
> **Lifecycle**: notes

## Design Decisions

- Implemented the frozen standalone eight-service topology only under `deploy/local-first/`.
- Existing upstream Dockerfiles and existing Compose files remain untouched.
- Only Traefik publishes `127.0.0.1:80:80`; internal Redis/gRPC/application services publish no host ports.
- Jazz defaults to `JAZZ_SYNC_MODE=local` with blank peer/key/global-room and Matrix/OIDC/cloud integrations disabled.
- `play`, `back`, `map-storage`, and `uploader` now use approved fork-owned compatibility Dockerfiles mechanically derived from the upstream recipes; `maps` still uses the upstream recipe directly.

## Deviations From Plan Or Spec

- The bounded Luna-low worker was invoked but its code-mode transport stalled before writing any file. It exited with zero changes. The already-frozen five-file mechanical patch was then applied directly without changing the contract design or scope.
- Repeated live Debian bullseye-security 404 failures triggered the approved compatibility amendment. The new recipes pin apt to Debian Snapshot `20260418T120000Z` while leaving upstream Dockerfiles untouched.
- After the Snapshot pin unblocked apt, the play Vite production build reproducibly exhausted its upstream hard-coded 6144 MB V8 heap after transforming 4,157 modules. A second approved amendment adds only `ENV GENERATE_SOURCEMAP=false` before that existing build in the fork-owned play recipe; Sentry is disabled in this Local First profile.

## Resolved Build Blockers

- Original blocker authority revision: `cbb24b8e46f4e10063934bbd2c48cdc879d59848`.
- Canonical command: `repo-harness run verify-contract --contract tasks/contracts/20260921-1348-add-standalone-local-first-deployment-namespace.contract.md --strict`.
- Failed verification ID: `local-first-source-build`.
- Captured log: `.ai/harness/runs/verification-vx-5398f6ee717d472b9420.log`.
- Affected unchanged recipe: `map-storage/Dockerfile`, `RUN apt-get update && apt-get install -y git curl` at lines 20 and 41.
- Failure: Debian bullseye-security metadata resolves packages whose `.deb` URLs return HTTP 404, including perl, openssl, ca-certificates, curl and git packages for arm64.
- Exact targeted retry: `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml build map-storage`.
- The targeted retry repeated the same HTTP 404 package-fetch failures. No source file or Dockerfile was changed.
- A direct ARM64 test of the pinned Snapshot repositories successfully downloaded the required `git`/`curl` dependency set. Row 3 was released, amended, and rebound on the new task revision before implementation continued.

## Green Evidence

- `git diff --check` passes.
- `node deploy/local-first/verify.mjs` passes.
- `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet` passes.
- Required deployment files exist and Repo Harness exit/artifact gates pass.
- Final canonical full source-image build passes for play, back, map-storage, maps, and uploader on Apple Silicon.
- Runtime-oracle authority commit: `f148f2295`; canonical Change Assessment selector correction: `06cd67c46`; final fulfilled authority HEAD: `fd8d8934a`.
- `bash deploy/local-first/readback.sh` passes in 44.54 seconds: play/map-storage/uploader `/ping`, maps `/starter/map.json`, Redis `PONG`, all eight services running, play/back/map-storage healthy, cleanup successful, and both named volumes retained.
- Amended canonical contract verification passes 17/17 with zero failures, including `local-first-runtime-readback`.
- Repo Harness Change Assessment path selectors are literal-only (or `*`); both row-3 executable oracles now use canonical full-subject coverage so all deployment/security-selected paths bind to both required oracle kinds.

## Tradeoffs Considered

| Option | Decision | Reason |
|---|---|---|
| Modify `map-storage/Dockerfile` to change apt sources | Rejected | Explicitly forbidden by the row-3 contract and Sprint. |
| Add fork-owned compatibility Dockerfiles | Approved after repeated blocker | Matches the user requirement to create new Dockerfiles rather than modify upstream; verifier enforces upstream + snapshot injection only. |
| Retry the exact unchanged recipe once | Performed | Distinguishes a one-off mirror race from a repeatable external build blocker without widening scope. |

## Open Questions

- None. The approved amendment pins a reproducible Snapshot source and keeps upstream recipes immutable.

## Evidence Links

- Original live-mirror failure: `.ai/harness/runs/verification-vx-5398f6ee717d472b9420.log`.
- Snapshot recipe + no-sourcemap full build: current exact verification evidence in `.ai/harness/checks/latest.json` and `.ai/harness/runs/`.
