# Task Contract: add-explicit-jazz-local-peer-cloud-sync-policy

> **Status**: Active
> **Plan**: plans/plan-20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-20 16:52
> **Review File**: `tasks/reviews/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.review.md`
> **Notes File**: `tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md`

## Why
The current Jazz path implicitly creates a Jazz Cloud peer when no peer is configured and can fall through to Matrix after Jazz initialization failure. That violates the first Local First release boundary and makes later standalone deployment acceptance meaningless.

## Goal
Implement the Sprint's complete row-1 Jazz sync policy end-to-end without making pusher/core gameplay startup depend on valid Jazz config: explicit local/peer/cloud semantics, zero implicit cloud fallback, and zero Matrix/alternate-provider fallback on Jazz configuration/init failure.

## Scope
- In scope: optional `JAZZ_SYNC_MODE` propagation, pure policy resolution/normalization, Jazz context sync mapping, raw-policy plumbing, minimal GameManager provider guard, focused tests, normal play typecheck.
- Out of scope: room readiness timeout, concurrent runtime lifecycle, storage/pointer failure handling, unsupported feature gating, deployment/Compose files, LAN sync, identity/permissions.
- Taste constraints: minimal typed helper; no generic provider framework; no pusher-fatal semantic validation; no web/research/design work by worker.

## Stop Conditions
- Stop if implementation needs a product/source path outside Allowed Paths.
- Stop if preventing Matrix fallback requires redesigning general provider architecture instead of the narrow Jazz branch guard.
- Stop if the focused GameManager regression cannot be made deterministic without changing unrelated runtime code; return exact blocker/evidence.
- Stop rather than implementing row-2 lifecycle/storage/UI behavior.
## Falsifier
The direction is wrong if invalid Jazz mode/peer/key cannot surface as Jazz `ON_ERROR` while pusher/gameplay remain operational and Matrix initialization stays at zero without broad provider redesign.

## Root Cause Evidence
Not applicable; this is a planned feature/policy slice rather than `bugfix` profile.

## Workflow Inventory
- Source plan: `plans/plan-20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.md`
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`
- Deferred ledger: `tasks/todos.md`
- Review: `tasks/reviews/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.review.md`
- Notes: `tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md`
- Checks: `.ai/harness/checks/latest.json`
- Runs: `.ai/harness/runs/`

## Change Assessment
```json
{"protocol":1,"oracles":[{"id":"jazz-policy-focused-tests","kind":"deterministic_test","paths":["*"]}]}
```

## Acceptance Policy
```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths
```yaml
allowed_paths:
  - play/src/pusher/enums/EnvironmentVariableValidator.ts
  - play/src/pusher/enums/EnvironmentVariable.ts
  - play/src/common/FrontConfigurationInterface.ts
  - play/src/front/Enum/EnvironmentVariable.ts
  - play/src/front/Chat/Connection/Jazz/JazzSyncPolicy.ts
  - play/src/front/Chat/Connection/Jazz/JazzChatConnection.ts
  - play/src/front/Chat/Connection/Jazz/JazzRuntime.ts
  - play/src/front/Phaser/Game/GameManager.ts
  - play/tests/setup/vitest.setup.ts
  - play/tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts
  - play/tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts
  - plans/plan-20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.md
  - tasks/contracts/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.contract.md
  - tasks/reviews/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.review.md
  - tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md
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
    wall_time_minutes: 25
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent:
      mode: narrate_and_gatekeep
      purpose: freeze authority and own acceptance
    explorer:
      mode: read_only
      purpose: none required; CodeGraph mapping already frozen
    worker:
      mode: edit_within_allowed_paths
      purpose: mechanical implementation of frozen row-1 policy
    verifier:
      mode: read_only
      purpose: exact subject/evidence semantic review
  runner:
    preferred:
      - codex
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)
```yaml
exit_criteria:
  files_exist:
    - play/src/front/Chat/Connection/Jazz/JazzSyncPolicy.ts
    - play/tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts
    - play/tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts
  artifacts_exist:
    - tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md
```

## Verification Plan
```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "jazz-sync-policy",
      "kind": "command",
      "command": "npx vitest run tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the complete frozen local/peer/cloud truth table, normalization, and exact Jazz context sync mapping.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-no-matrix-fallback",
      "kind": "command",
      "command": "npx vitest run tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves invalid Jazz configuration keeps Jazz selected/error and performs zero Matrix initialization while core startup remains outside the validation gate.",
      "inputs": { "env": [] }
    },
    {
      "id": "play-typecheck",
      "kind": "command",
      "command": "npm run typecheck",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Checks pusher/front configuration propagation and Jazz runtime type contracts.",
      "inputs": { "env": [] }
    }
  ]
}
```
## Acceptance Notes (Human Review)
- Functional behavior: exact Sprint truth table; no pusher-fatal semantic validation; no implicit cloud; no Matrix fallback after Jazz config/init error.
- Edge cases: whitespace-only values, invalid URL/scheme, stale peer/key in local, peer+cloud ambiguity, missing cloud key.
- Regression risks: accidentally disabling legacy Matrix when Jazz is disabled; hidden cloud default; returning normal OFFLINE instead of Jazz ON_ERROR.

## Rollback Point
- Commit/checkpoint: reviewed task publication.
- Revert strategy: revert row-1 publication; no data migration.
