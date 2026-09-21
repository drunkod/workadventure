# Task Contract: add-standalone-local-first-deployment-namespace

> **Status**: Active
> **Plan**: plans/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-21 13:52
> **Review File**: `tasks/reviews/20260921-1348-add-standalone-local-first-deployment-namespace.review.md`
> **Notes File**: `tasks/notes/20260921-1348-add-standalone-local-first-deployment-namespace.notes.md`

## Why
The Local First release needs a fork-owned production deployment that survives upstream WorkAdventure updates. Extending upstream Docker/Compose files would recreate the merge-conflict surface this Sprint is designed to avoid.

## Goal
Add a standalone `deploy/local-first/` Compose namespace that source-builds the accepted fork using existing upstream Dockerfiles read-only, exposes only one loopback HTTP entrypoint, enables Jazz local mode, excludes Matrix/OIDC/cloud dependencies, and builds successfully on this Apple Silicon Mac.
## Scope
- In scope: five new files under `deploy/local-first/`, exact eight-service topology, source-build references, localhost routing, named Redis/map-storage volumes, local-only env defaults, deterministic config verifier, runbook, Apple Silicon image build.
- Out of scope: starting/production-smoke testing the stack (row 5), Redis AOF/backup tooling (row 4), LAN sync, HTTPS/ACME, air-gapped image bundle, modifying any existing Dockerfile/Compose file.
- Taste constraints: standalone file, no YAML overlay/inheritance from upstream Compose; no copied Dockerfile; fixed `.localhost` origins; no host ports except 127.0.0.1:80.

## Stop Conditions
- Stop if any existing Dockerfile or existing `docker-compose*.yml/yaml` must change.
- Stop if an upstream build recipe fails because of recipe/platform incompatibility; return BLOCKED with exact build target/log rather than creating a new Dockerfile.
- Stop if the service set must grow beyond the frozen eight services.
- Stop rather than adding Matrix/OIDC/Jazz sync/cloud dependencies.

## Falsifier
The design is wrong if `docker-compose config` requires upstream Compose files, an internal service is host-published, or one of the five source images cannot build from the frozen upstream Dockerfile/context on Apple Silicon.
## Workflow Inventory
- Source plan: `plans/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md`
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`
- Review/notes/checks: canonical Repo Harness artifacts.

## Change Assessment
```json
{"protocol":1,"oracles":[{"id":"local-first-compose-verifier","kind":"deterministic_test","paths":["deploy/local-first/*"]}]}
```

## Acceptance Policy
```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths
```yaml
allowed_paths:
  - deploy/local-first/compose.yml
  - deploy/local-first/.env.example
  - deploy/local-first/README.md
  - deploy/local-first/verify.mjs
  - deploy/local-first/build-secrets/empty
  - plans/plan-20260921-1348-add-standalone-local-first-deployment-namespace.md
  - tasks/contracts/20260921-1348-add-standalone-local-first-deployment-namespace.contract.md
  - tasks/reviews/20260921-1348-add-standalone-local-first-deployment-namespace.review.md
  - tasks/notes/20260921-1348-add-standalone-local-first-deployment-namespace.notes.md
```
## Evidence Requirements
```yaml
evidence_requirements:
  benchmark: not_applicable
```

## Delegation Contract
```yaml
delegation:
  budget:
    tokens: null
    runner_invocations: 1
    wall_time_minutes: 60
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent: { mode: narrate_and_gatekeep, purpose: freeze topology and own acceptance }
    explorer: { mode: read_only, purpose: none required; CodeGraph/container mapping frozen }
    worker: { mode: edit_within_allowed_paths, purpose: mechanical standalone deployment implementation }
    verifier: { mode: read_only, purpose: exact topology/build-evidence review }
  runner:
    preferred: [codex]
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)
```yaml
exit_criteria:
  files_exist:
    - deploy/local-first/compose.yml
    - deploy/local-first/.env.example
    - deploy/local-first/README.md
    - deploy/local-first/verify.mjs
    - deploy/local-first/build-secrets/empty
  artifacts_exist:
    - tasks/notes/20260921-1348-add-standalone-local-first-deployment-namespace.notes.md
```
## Verification Plan
```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "local-first-compose-structure",
      "kind": "command",
      "command": "node deploy/local-first/verify.mjs",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the exact eight-service standalone topology, loopback-only host exposure, build contexts, Local First env, and durable volume mounts.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-compose-config",
      "kind": "command",
      "command": "docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the new standalone Compose file resolves independently of upstream Compose files.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-source-build",
      "kind": "command",
      "command": "docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml build play back map-storage maps uploader",
      "cwd": ".",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "Builds every fork source image using the unchanged upstream Dockerfile/context on the target Apple Silicon Docker runtime.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)
- Functional: standalone new namespace, exact service set, explicit Jazz local mode, no Matrix/OIDC/Jazz network peer defaults.
- Exposure: only Traefik publishes `127.0.0.1:80:80`; no Redis/gRPC/internal service host ports.
- Upstream safety: no existing Dockerfile/Compose edit and no copied Docker recipe.
- Build: all five source images build from the accepted fork on this Mac.

## Rollback Point
- Commit/checkpoint: reviewed row-3 task publication.
- Revert strategy: revert/remove `deploy/local-first/`; no data migration.
