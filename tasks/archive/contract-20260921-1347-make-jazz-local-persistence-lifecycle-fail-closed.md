> **Archived**: 2026-09-21 13:47
> **Related Plan**: plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260921-1347
> **Archive Projection V1**: `plans/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md` => `plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/notes/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.notes.md` => `tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/contracts/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.contract.md` => `tasks/archive/contract-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/reviews/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.review.md` => `tasks/archive/review-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`

# Task Contract: make-jazz-local-persistence-lifecycle-fail-closed

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-20 17:38
> **Review File**: `tasks/archive/review-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Notes File**: `tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`

## Why
Row 1 removed implicit cloud/fallback selection, but Jazz still silently tolerates storage failure, cannot prove stale pointers load, has no compatible global-context identity, has no bounded main-room readiness, and several unsupported Local First actions still report success.

## Goal
Implement the frozen row-2 lifecycle so local Jazz fails closed: shared/idempotent compatible initialization, incompatible-config rejection, retryable failed attempts, explicit storage/pointer failure, 5-second abortable loaded-room readiness, provider exclusivity, and explicit unsupported-surface behavior.

## Scope
- In scope: Jazz runtime/context lifecycle, pointer persistence, room readiness/abort, connection init sharing/retry, explicit unsupported operations, minimal provider-specific UI gating, focused tests.
- Out of scope: deployment/Compose, Redis/server durability, production E2E/network isolation, LAN sync, generic permissions/capability architecture.
- Taste constraints: bounded state machines; no provider-framework redesign; no silent recovery that allocates replacement data.

## Stop Conditions
- Stop if a product edit outside Allowed Paths is required.
- Stop if Jazz 0.20.10 cannot expose a loaded-room signal or persistence confirmation needed for the frozen semantics; return BLOCKED with the exact API evidence.
- Stop rather than silently relaxing the 5,000 ms timeout, stale-pointer preservation, provider exclusivity, or unsupported-operation failure rules.

## Falsifier
The direction is wrong if a stale pointer/storage error can allocate replacement state, an incompatible policy can reuse/replace an active Jazz context, or a timed-out late callback can transition chat to ONLINE.

## Workflow Inventory
- Source plan: `plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md`
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`
- Deferred ledger: `tasks/todos.md`
- Review/notes/checks: canonical Repo Harness artifacts.

## Change Assessment
```json
{"protocol":1,"oracles":[{"id":"jazz-lifecycle-focused-tests","kind":"deterministic_test","paths":["*"]}]}
```

## Acceptance Policy
```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths
```yaml
allowed_paths:
  - play/src/front/Chat/Connection/Jazz/JazzRuntime.ts
  - play/src/front/Chat/Connection/Jazz/JazzChatConnection.ts
  - play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts
  - play/src/front/Phaser/Game/GameManager.ts
  - play/src/front/Chat/Components/Room/CreateRoomOrFolderOption.svelte
  - play/src/front/Chat/Components/UserList/User.svelte
  - play/src/front/Chat/Components/Room/RoomMenu/RoomMenu.svelte
  - play/src/front/Chat/Components/ChatHeader.svelte
  - play/tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts
  - play/tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts
  - play/tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts
  - play/tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts
  - plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md
  - tasks/archive/contract-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md
  - tasks/archive/review-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md
  - tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md
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
    wall_time_minutes: 30
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent: { mode: narrate_and_gatekeep, purpose: freeze authority and own acceptance }
    explorer: { mode: read_only, purpose: none required; CodeGraph mapping already frozen }
    worker: { mode: edit_within_allowed_paths, purpose: mechanical row-2 implementation }
    verifier: { mode: read_only, purpose: exact subject/evidence semantic review }
  runner:
    preferred: [codex]
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)
```yaml
exit_criteria:
  files_exist:
    - play/tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts
    - play/tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts
    - play/tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts
  artifacts_exist:
    - tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md
```

## Verification Plan
```json
{
  "protocol": 1,
  "checks": [
    {"id":"jazz-runtime-lifecycle","kind":"command","command":"npx vitest run tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts","cwd":"play","phase":"verification","cost":"normal","evidence_policy":"current_exact","necessity":"Proves shared/idempotent/config-exclusive/retryable context init and fail-closed storage/pointer semantics.","inputs":{"env":[]}},
    {"id":"jazz-connection-lifecycle","kind":"command","command":"npx vitest run tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts","cwd":"play","phase":"verification","cost":"normal","evidence_policy":"current_exact","necessity":"Proves shared connection init, 5s loaded-room readiness timeout, abort fencing, retry, and ON_ERROR behavior.","inputs":{"env":[]}},
    {"id":"jazz-supported-surface","kind":"command","command":"npx vitest run tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts","cwd":"play","phase":"verification","cost":"normal","evidence_policy":"current_exact","necessity":"Proves unsupported Jazz operations reject and provider-exclusive failures never initialize Matrix.","inputs":{"env":[]}},
    {"id":"play-typecheck","kind":"command","command":"npm run typecheck","cwd":"play","phase":"verification","cost":"normal","evidence_policy":"current_exact","necessity":"Checks changed Jazz/UI TypeScript contracts.","inputs":{"env":[]}}
  ]
}
```

## Acceptance Notes (Human Review)
- Functional: no implicit recovery/replacement; explicit error state; supported main room remains usable.
- Edge cases: concurrent init, incompatible config, failed first init then retry, storage denial, stale pointer, timeout then late callback.
- Regression risks: over-broad Jazz UI gating, leaked subscriptions after timeout, accidentally clearing compatible global context.

## Rollback Point
- Commit/checkpoint: reviewed row-2 task authority.
- Revert strategy: revert row-2 publication; no data migration.
