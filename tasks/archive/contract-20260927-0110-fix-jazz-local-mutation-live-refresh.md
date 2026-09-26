> **Archived**: 2026-09-27 01:10
> **Related Plan**: plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260927-0110
> **Archive Projection V1**: `plans/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md` => `plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/notes/20260926-1952-fix-jazz-local-mutation-live-refresh.notes.md` => `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1952-fix-jazz-local-mutation-live-refresh.contract.md` => `tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1952-fix-jazz-local-mutation-live-refresh.review.md` => `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`

# Task Contract: fix-jazz-local-mutation-live-refresh

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
> **Task Profile**: bugfix
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-27 00:39
> **Review File**: `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Notes File**: `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`

## Why

Row 5 proves Local First Jazz mutations persist to browser Jazz storage but do not refresh the currently open room projection until a page reload. A send action clears the input and the same message appears after reload with the same Jazz account and room pointer, so release acceptance is blocked by a same-document projection gap rather than persistence loss.

## Goal

After each successful local Jazz text, image, edit, or remove mutation, refresh the initialized `JazzChatRoom` projection immediately without changing Jazz storage format, sync policy, provider routing, or remote subscription semantics.

## Scope

- In scope: `JazzRuntime` subscription state/local mutation notification; `JazzChatRoom` subscription-lifetime consumption after initialization; focused runtime and real-room Vitest regressions; this repair's workflow/evidence artifacts.
- Out of scope: Jazz schema/persistence format, Jazz sync policy/provider configuration, chat UI components outside `JazzChatRoom`, row-5 release harness, Matrix behavior.
- Taste constraints: keep Jazz as the single source of truth; separate initialization-promise settlement from ongoing subscription lifetime; no optimistic second message store and no reload-based workaround.

## Stop Conditions

- Stop if the repair requires changing Jazz schema, persistent room/message data, provider policy, chat UI outside `JazzChatRoom`, or row-5 files.
- Stop if focused regressions cannot reproduce both the missing runtime notification and the initialized-room consumer suppression before their respective fixes.
- Stop if successful local mutation ordering cannot remain mutation first, projection notification second.
- Stop if initialization failure/abort semantics cannot remain distinct from post-initialization projection updates.
## Falsifier

The direction is wrong if local mutation notification requires a second UI-side source of truth, fires for failed/no-op edits or removals, calls destroyed subscriptions, remains suppressed after `JazzChatRoom.init()` settles, repopulates a destroyed room, or changes persisted Jazz data/provider behavior.

## Root Cause Evidence

- root_cause: two independent gates block same-document refresh: JazzRuntime originally mutated Jazz storage without invoking the active room callback, and JazzChatRoom.init() sets a `settled` flag after the first loaded-room projection then returns early on every later subscription callback, suppressing runtime/remote updates after initialization.
- repro: row-5 clean production run `_ops/local-first-release/20260926T143706Z-67642/` accepts a text send and clears the input but no live message appears; same-stack diagnostic records IMMEDIATE_COUNT=0 and AFTER_RELOAD_COUNT=1 with stable Jazz account and room pointer. Read-only audit of repair `9ff1e1522` then identified the downstream `settled` guard in JazzChatRoom.init().
- regression_guard: play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts
- pre_fix_failure_artifact: tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-pre-fix.log
- consumer_regression_guard: play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts
- consumer_pre_fix_failure_artifact: tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-consumer-pre-fix.log

## Workflow Inventory

- Source plan: `plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md`
- Blocked parent: row 5 `production-test single-device local-first release on MacBook`
- Review file: `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
- Notes file: `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope gate: only Allowed Paths may become tracked repair changes.
- Completion gate: deterministic verification, semantic acceptance, typed AcceptanceReceipt, then transactional local integration.

## Change Assessment

```json
{"protocol":1,"oracles":[{"id":"jazz-local-mutation-notification","kind":"deterministic_test","paths":["play/src/front/Chat/Connection/Jazz/JazzRuntime.ts","play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts"]},{"id":"jazz-chat-room-live-projection","kind":"deterministic_test","paths":["play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts","play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts"]}]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```
## Allowed Paths

```yaml
allowed_paths:
  - play/src/front/Chat/Connection/Jazz/JazzRuntime.ts
  - play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts
  - play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts
  - play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts
  - plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
  - tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md
  - tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md
  - tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md
  - tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-pre-fix.log
  - tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-consumer-pre-fix.log
  - tasks/todos.md
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
    parent:
      mode: narrate_and_gatekeep
      purpose: preserve row-5 boundary and own integration
    explorer:
      mode: read_only
      purpose: CodeGraph root-cause confirmation
    worker:
      mode: edit_within_allowed_paths
      purpose: local mutation notification repair
    verifier:
      mode: read_only
      purpose: exact final-subject semantic review
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
    - play/src/front/Chat/Connection/Jazz/JazzRuntime.ts
    - play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts
    - play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts
    - play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts
  artifacts_exist:
    - tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-pre-fix.log
    - tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-consumer-pre-fix.log
    - tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "jazz-local-mutation-notification",
      "kind": "package_test",
      "path": "play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves successful local text/image/edit/remove mutations notify the active subscribed room projection immediately and no-op mutations do not.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-local-mutation-focused",
      "kind": "command",
      "command": "npm --prefix play test -- --run tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Runs the runtime notification regression in the repository Play Vitest environment.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-chat-room-live-projection",
      "kind": "package_test",
      "path": "play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the real JazzChatRoom continues consuming loaded-room callbacks after init resolves, reflects text/image/edit/delete without reload, and ignores callbacks after destroy.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-chat-room-focused",
      "kind": "command",
      "command": "npm --prefix play test -- --run tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Runs the initialized-room consumer regression in the repository Play Vitest environment.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-existing-focused",
      "kind": "command",
      "command": "npm --prefix play test -- --run tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Protects local sync policy, connection lifecycle, persistence confirmation, and unsupported-surface behavior.",
      "inputs": { "env": [] }
    },
    {
      "id": "diff-check",
      "kind": "command",
      "command": "git diff --check",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Rejects malformed patch whitespace.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)

- Functional behavior: the initialized real JazzChatRoom projection updates immediately after successful local text/image/edit/remove mutations.
- Edge cases: missing edit/remove targets do not notify; initialization still resolves exactly once; post-init callbacks continue syncing; destroyed rooms/subscriptions cannot be repopulated.
- Regression risks: duplicate later Jazz callbacks; subscription lifecycle leaks; notification before mutation; post-init projection errors; async image projection racing destroy.

## Rollback Point

- Checkpoint: target `d/local_jazz_chat` at repair worktree base `71a333ddd`.
- Revert strategy: revert the single repair publication commit; no data migration is involved.
