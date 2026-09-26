# Task Contract: production-test-single-device-local-first-release-on-macbook

> **Status**: Active
> **Plan**: plans/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-26 14:50
> **Review File**: `tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md`
> **Notes File**: `tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md`

## Why

Rows 1–4 established Jazz local semantics, supported chat surface, standalone production topology, and server-side
durability. The release still needs reproducible evidence from the actual production-built Local First stack on the
target MacBook while public Internet egress is measurably denied for both application containers and the test browser.

## Goal

Ship one bounded Local First release harness that builds the exact committed source, starts the standalone stack with
proved container/browser public-egress isolation, inventories attempted external destinations, and passes anonymous
gameplay, `ru-RU`, and Jazz local text/image/edit/delete plus reload persistence with no Jazz peer or provider fallback.

## Scope

- In scope:
  - fork-owned `deploy/local-first/` release isolation override, verifier, runner, and README;
  - one dedicated Chromium Playwright Local First release spec;
  - target-Mac Colima/Docker control probes and temporary kernel LOG-rule evidence;
  - ignored `_ops/local-first-release/` runtime artifacts;
  - focused existing Jazz lifecycle/sync/unsupported-surface tests.
- Out of scope:
  - product source changes;
  - existing upstream Dockerfiles or upstream `docker-compose*.yml` / `docker-compose*.yaml`;
  - upstream Matrix/OIDC full E2E;
  - LAN/multi-device Jazz sync, private rooms, account recovery, air-gapped builds;
  - redesign of row-4 backup/restore.
- Decision precedence: the active Local First Sprint supersedes older overlay/full-upstream-E2E release topology.
- Taste constraints: deterministic, single-device, unique temporary project, fail-closed cleanup, no silent network
  relaxation, no cached browser auth/profile.

## Stop Conditions

- Stop if product or upstream deployment source must change; open a separate repair task instead.
- Stop if loopback ingress cannot coexist with denied container public egress.
- Stop if browser/container attempted external destinations cannot be recorded.
- Stop if a Jazz peer/cloud/Matrix/provider fallback request is observed.
- Stop if the long gate is not running from a clean exact committed worktree.
- Stop rather than touching the canonical Local First Docker project or user volumes.

## Falsifier

The release is not accepted if a clean exact revision cannot build/start on the target MacBook under the frozen
two-network isolation, if either public-egress control unexpectedly succeeds, if external attempts are not inventoried,
or if anonymous gameplay, `ru-RU`, or Jazz text/image/edit/delete/reload persistence fails.

## Workflow Inventory

- Source plan: `plans/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md`
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`
- Review file: `tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md`
- Notes file: `tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Runtime evidence: ignored `_ops/local-first-release/`
- Scope gate: only Allowed Paths may become Git subject changes.

## Change Assessment

```json
{"protocol":1,"oracles":[{"id":"local-first-release-static","kind":"deterministic_test","paths":["*"]},{"id":"local-first-release-jazz-focused","kind":"deterministic_test","paths":["play/src/front/Chat/Connection/Jazz/**","play/tests/front/Chat/Connection/Jazz/**"]},{"id":"local-first-release-smoke","kind":"runtime_readback","paths":["*"]}]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths

```yaml
allowed_paths:
  - deploy/local-first/release-isolation.yml
  - deploy/local-first/release-verify.mjs
  - deploy/local-first/release-smoke.sh
  - deploy/local-first/README.md
  - tests/tests/local-first-release.spec.ts
  - plans/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
  - tasks/contracts/20260926-1435-production-test-single-device-local-first-release-on-macbook.contract.md
  - tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md
  - tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md
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
    parent: { mode: narrate_and_gatekeep, purpose: own release topology, long gates, and acceptance }
    explorer: { mode: read_only, purpose: CodeGraph discovery already frozen into this contract }
    worker: { mode: edit_within_allowed_paths, purpose: mechanical release harness and browser spec implementation }
    verifier: { mode: read_only, purpose: final-diff and frozen release-evidence review only }
  runner:
    preferred: [codex]
    fallback: null
    brief_is_authoritative: true
```

The configured worker/verifier runtime must expose GPT-5.6 Luna with low reasoning effort to satisfy the Sprint.
Unavailable model configuration is BLOCKED; no silent substitution or reasoning escalation is permitted.

## Exit Criteria (Machine Verifiable)

```yaml
exit_criteria:
  files_exist:
    - deploy/local-first/release-isolation.yml
    - deploy/local-first/release-verify.mjs
    - deploy/local-first/release-smoke.sh
    - tests/tests/local-first-release.spec.ts
    - deploy/local-first/README.md
  artifacts_exist:
    - tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "local-first-base-verifier",
      "kind": "command",
      "command": "node deploy/local-first/verify.mjs",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Protects the already-accepted standalone Local First topology and row-4 durability policy.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-static",
      "kind": "command",
      "command": "node deploy/local-first/release-verify.mjs",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Fails closed unless the release override has an internal app network, non-masqueraded ingress, reverse-proxy-only ingress attachment, and local-mode stale Jazz peer/key controls.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-script-syntax",
      "kind": "command",
      "command": "/bin/bash -n deploy/local-first/release-smoke.sh",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the target MacBook stock Bash 3.2 can parse the release orchestrator.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-compose-config",
      "kind": "command",
      "command": "docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml -f deploy/local-first/release-isolation.yml config --quiet",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the standalone production stack resolves with the frozen release-isolation override.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-jazz-focused",
      "kind": "command",
      "command": "npm --prefix play test -- --run tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Revalidates local sync, fail-closed lifecycle, provider exclusivity, and unsupported-surface behavior immediately before release runtime acceptance.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-tests-lint",
      "kind": "command",
      "command": "npm --prefix tests run lint -- --no-warn-ignored",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Statically validates the dedicated Playwright release spec with the repository test lint rules.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-release-smoke",
      "kind": "command",
      "command": "bash deploy/local-first/release-smoke.sh",
      "cwd": ".",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "From a clean exact commit, builds Local First source images, proves browser/container public egress denial and destination inventory, then runs anonymous ru-RU Jazz text/image/edit/delete plus reload persistence on the isolated production stack.",
      "inputs": { "env": [] }
    }
  ]
}
```

This is the sole executable verification authority. The expensive gate must be orchestrator-owned and may not be
replaced by a Luna process waiting on build/browser logs.

## Long-gate Evidence Contract

- `release-smoke.sh` must refuse a dirty tracked/untracked worktree before building.
- Build happens before isolation; isolated startup is `--no-build`.
- Project/run names are unique and never equal `workadventure-local-first`.
- Evidence directory is `_ops/local-first-release/<UTC-run-id>/`.
- Required evidence: source revision/status, image IDs, resolved Compose config, Docker network/container inspect,
  isolation control results, raw + normalized Colima egress log, browser evidence JSON, Playwright output/artifacts,
  container logs, and final machine-readable summary.
- Temporary Colima iptables LOG rules are source-subnet scoped, logging-only, exact-match removed on normal exit and
  signals, and proactively cleaned if a same-run rule is found before insertion.
- Browser route handlers are installed before product navigation; allowed destinations are loopback/localhost only.
- Any stale configured Jazz peer/Jazz Cloud/Matrix/provider fallback request is blocking.
- Optional blocked outbound attempts are non-blocking only if inventoried and core scenarios finish successfully.
- Any tracked change after the successful long gate invalidates the evidence and requires rerun.

## Acceptance Notes (Human Review)

- Functional behavior: stable local origin, anonymous starter map, Russian UI after reload, Jazz main-room
  text/image/edit/delete/reload persistence.
- Isolation behavior: loopback works, app network is internal, ingress masquerade is false, container control fails,
  browser control fails, product-phase destination inventory is complete.
- Provider behavior: stale local-mode peer/key ignored; no Jazz peer/cloud request and no Matrix/alternate fallback.
- Safety: unique temporary project/volumes, no canonical user data, precise iptables cleanup, no isolation relaxation.
- Regression risks: browser interception accidentally mocks local WebSockets, container egress logging misses a
  subnet, release runner builds after isolation, cached auth/profile hides first-run behavior, or evidence is not
  revision-bound.

## Rollback Point

- Checkpoint: row-5 authority commit before its isolated worktree starts.
- Revert strategy: revert the single accepted row-5 release-harness commit; no canonical Local First user data or
  active deployment is modified by the release smoke.
