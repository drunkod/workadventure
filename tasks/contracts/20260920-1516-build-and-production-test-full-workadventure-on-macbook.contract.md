# Task Contract: build-and-production-test-full-workadventure-on-macbook

> **Status**: Active
> **Plan**: plans/plan-20260920-1516-build-and-production-test-full-workadventure-on-macbook.md
> **Task Profile**: eval-only
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-20 15:18
> **Review File**: `tasks/reviews/20260920-1516-build-and-production-test-full-workadventure-on-macbook.review.md`
> **Notes File**: `tasks/notes/20260920-1516-build-and-production-test-full-workadventure-on-macbook.notes.md`

## Why
Rows 1–2 establish compiler and localisation correctness, but the fork still lacks release evidence from its documented production-like multi-service topology on the target MacBook. Frontend-only development mode is not sufficient acceptance.

## Goal
Build and run the exact integrated WorkAdventure tree with the repository production-like Docker Compose topology, prove required services/readiness, run the full production-like Playwright suite, and keep that built stack alive for targeted ru-RU + Jazz browser smoke before semantic acceptance.

## Scope
- In scope: local ignored `.env`, Colima/Docker host runtime, Docker images/containers/volumes/networks, complete repository production-like E2E suite, read-only browser/runtime inspection, task workflow artifacts.
- Out of scope: tracked product/source/config edits. If a product regression requires code changes, stop this eval row and open a separate repair task.
- Taste constraints: do not weaken/skip failing tests to obtain green; classify environment blockers explicitly.

## Stop Conditions
- Stop acceptance if any canonical machine check fails because of repository behavior.
- Stop and classify if the container runtime/registry/network cannot provide a usable production environment after bounded retry.
- Do not edit tracked product paths under this eval-only contract.
- Do not hide Jazz failure by switching back to Matrix or disabling Jazz.

## Falsifier
A reproducible product-caused failure in Compose build/start, required service readiness, full `test-prod-like`, ru-RU runtime loading, or Jazz normal path disproves release readiness.

## Root Cause Evidence
Not applicable unless verification uncovers a bug; any such bug gets a new bugfix contract.

## Workflow Inventory
- Source plan: `plans/plan-20260920-1516-build-and-production-test-full-workadventure-on-macbook.md`
- Sprint: `plans/sprints/20260917-1435-jazz-runtime-compatibility.sprint.md`
- Review: `tasks/reviews/20260920-1516-build-and-production-test-full-workadventure-on-macbook.review.md`
- Notes: `tasks/notes/20260920-1516-build-and-production-test-full-workadventure-on-macbook.notes.md`
- Checks: `.ai/harness/checks/latest.json`
- Runtime evidence: Docker/Playwright outputs plus ignored `.ai/harness/runs/` records.

## Change Assessment
```json
{"protocol":1,"oracles":[]}
```

## Acceptance Policy
```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths
```yaml
allowed_paths:
  - plans/plan-20260920-1516-build-and-production-test-full-workadventure-on-macbook.md
  - tasks/contracts/20260920-1516-build-and-production-test-full-workadventure-on-macbook.contract.md
  - tasks/reviews/20260920-1516-build-and-production-test-full-workadventure-on-macbook.review.md
  - tasks/notes/20260920-1516-build-and-production-test-full-workadventure-on-macbook.notes.md
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
    wall_time_minutes: 120
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent:
      mode: narrate_and_gatekeep
      purpose: execute deterministic production evaluation and browser smoke
    explorer:
      mode: read_only
      purpose: inspect failure evidence if needed
    worker:
      mode: read_only
      purpose: no implementation under eval-only row
    verifier:
      mode: read_only
      purpose: semantic release-readiness review
  runner:
    preferred:
      - codex
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)
```yaml
exit_criteria:
  artifacts_exist:
    - tasks/notes/20260920-1516-build-and-production-test-full-workadventure-on-macbook.notes.md
```

## Verification Plan
```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "docker-runtime",
      "kind": "command",
      "command": "docker version --format 'client={{.Client.Version}} server={{.Server.Version}}' && docker-compose version && colima status",
      "cwd": ".",
      "phase": "preflight",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the target MacBook has the actual Docker runtime used by this evaluation.",
      "inputs": { "env": [] }
    },
    {
      "id": "production-compose-config",
      "kind": "command",
      "command": "docker-compose -f docker-compose.yaml -f docker-compose.e2e.yml config --quiet",
      "cwd": ".",
      "phase": "preflight",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Validates the documented production-like Compose topology and local ignored env before building.",
      "inputs": { "env": [] }
    },
    {
      "id": "production-build-start",
      "kind": "command",
      "command": "COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.yaml -f docker-compose.e2e.yml up -d --build",
      "cwd": ".",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "Builds the repository tree into production-like images and starts the documented multi-service topology.",
      "inputs": { "env": [] }
    },
    {
      "id": "production-readiness",
      "kind": "command",
      "command": "running=\"$(docker-compose -f docker-compose.yaml -f docker-compose.e2e.yml ps --status running --services)\"; for s in play back map-storage maps redis reverse-proxy uploader synapse icon messages oidc-server-mock; do printf '%s\\n' \"$running\" | grep -qx \"$s\" || { echo \"required service not running: $s\" >&2; exit 1; }; done; curl --retry 20 --retry-delay 2 --retry-connrefused -fsS http://play.workadventure.localhost/ >/dev/null",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves required production-like services are running and the built play endpoint is reachable through the reverse proxy.",
      "inputs": { "env": [] }
    },
    {
      "id": "full-production-like-e2e",
      "kind": "command",
      "command": "npm run test-prod-like",
      "cwd": "tests",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "Runs the repository's complete documented production-like Playwright suite against built containers.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)
- Machine acceptance: all five Verification Plan checks must pass; failures are not waived.
- Browser acceptance: after machine checks, smoke the same running stack for built assets, ru-RU, Jazz normal/recovery path, and blocking console/network errors without tracked edits.
- Environment-only external failure may be classified BLOCKED, but must not be relabeled PASS.

## Rollback Point
- No product commit is expected.
- Stop/remove local stack with `docker-compose -f docker-compose.yaml -f docker-compose.e2e.yml down` if cleanup is desired; Colima runtime can remain installed/running for future work.
