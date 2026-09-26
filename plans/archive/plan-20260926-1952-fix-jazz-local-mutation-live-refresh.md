> **Archived**: 2026-09-27 01:10
> **Related Plan**: plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260927-0110
> **Archive Projection V1**: `plans/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md` => `plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/notes/20260926-1952-fix-jazz-local-mutation-live-refresh.notes.md` => `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1952-fix-jazz-local-mutation-live-refresh.contract.md` => `tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1952-fix-jazz-local-mutation-live-refresh.review.md` => `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`

# Plan: fix Jazz local mutation live refresh

> **Status**: Archived
> **Created**: 20260926-1952
> **Slug**: fix-jazz-local-mutation-live-refresh
> **Artifact Level**: work-package
> **Promotion Reason**: verification_boundary
> **Verification Boundary**: focused JazzRuntime mutation notification + real JazzChatRoom post-init consumer regressions plus existing Jazz lifecycle/sync tests, then the blocked row-5 production release gate after integration.
> **Rollback Surface**: revert the JazzRuntime local notification, JazzChatRoom subscription-lifetime correction, and their focused regressions.
> **Spec**: `docs/spec.md`
> **Research**: row-5 blocker evidence under `_ops/local-first-release/20260926T143706Z-67642/`
> **Task Contract**: `tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Task Review**: `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Implementation Notes**: `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`

## Goal

Make successful local Jazz room mutations refresh the initialized real `JazzChatRoom` projection immediately, without requiring a full page reload, while preserving existing IndexedDB persistence, remote subscription behavior, initialization/abort semantics, and local-only sync policy.

## Agentic Routing

- Selected route: narrow product bugfix in a dedicated contract worktree.
- Routing reason: row 5 is forbidden to edit product source and deterministically proved that a persisted local Jazz mutation is not reflected in the live room UI until reload.
- Due diligence:
  - P1 map: CodeGraph traced `JazzChatRoom.sendMessage` → `JazzRuntime.sendText` → `room.$jazz.push()` and the room UI projection back through `subscribeRoom` → `syncMessages`.
  - P2 trace: clean production run accepts send and clears input but shows no message; same-stack diagnostic records `IMMEDIATE_COUNT=0` and `AFTER_RELOAD_COUNT=1` with stable Jazz account/room pointer.
  - P3 decision rationale: explicitly notify the already-registered room projection after successful local mutations rather than adding optimistic UI state or changing persistence semantics.
## Workflow Inventory

- Active plan: `plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md`
- Task contract: `tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
- Task review: `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
- Implementation notes: `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
- Blocked parent: row 5 `production-test single-device local-first release on MacBook`
- Current checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope authority: repair contract `allowed_paths`.
- Concurrency rule: row 5 remains bound in its own worktree; this repair uses a separate contract worktree.
- Execution isolation: start through Repo Harness from canonical `d/local_jazz_chat`.

## Approach

### Strategy

Extend the internal `roomSubscriptions` state to retain the projection callback together with the current loaded room and unsubscribe handle. Add a private helper that invokes that callback only when the subscription is still active and the room is loaded. Call it after each successful local room mutation: text push, image push, text edit, and remove.

Separately correct `JazzChatRoom.init()` so the initialization promise settles once, but the room subscription remains live for later loaded-room callbacks. Post-initialization callbacks must continue through `syncMessages()`; abort/destroy must still prevent stale callbacks from repopulating the room. The Jazz subscription remains authoritative for remote/reactive updates, and `syncVersion` continues fencing stale asynchronous projections.

### Trade-offs

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Optimistically mutate `JazzChatRoom.messages` | Immediate UX | Duplicates Jazz→chat projection logic and risks divergence/duplicates | Reject |
| Reload/re-subscribe after every mutation | Uses existing path | Expensive, disruptive, and hides local notification defect | Reject |
| Explicitly notify active room subscription after local mutation | Central, applies to text/image/edit/delete, preserves persistence | May be followed by a duplicate Jazz callback | Choose; existing sync-version fence handles duplicate projections |
## Detailed Design

### File Changes

| File | Action | Description |
|---|---|---|
| `play/src/front/Chat/Connection/Jazz/JazzRuntime.ts` | Modify | retain room callback and notify it after successful local mutations |
| `play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts` | Modify | separate initialization settlement from ongoing subscription consumption |
| `play/tests/front/Chat/Connection/Jazz/JazzRuntimeLocalMutation.test.ts` | Add | prove text/image/edit/remove notify subscribed projection immediately and no-op when item is absent |
| `play/tests/front/Chat/Connection/Jazz/JazzChatRoomLocalMutation.test.ts` | Add | prove the real initialized room consumes later callbacks for text/image/edit/delete and ignores callbacks after destroy |
| Workflow artifacts | Update | root-cause, both pre-fix failures, deterministic verification, acceptance state |

### Data Flow

UI send/edit/delete → `JazzRuntime` local mutation → Jazz object/IndexedDB mutation → explicit active subscription callback → `JazzChatRoom.syncMessages` → live `SearchableArrayStore`. Normal Jazz subscription callbacks continue unchanged.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate projection callback | medium | low | existing `syncVersion` fences stale async projections; projection rebuild is idempotent |
| Notify after destroyed subscription | low | medium | helper looks up current subscription state and no-ops when absent |
| Notify failed/no-op edit/remove | low | low | notify only after a matching item is actually mutated/removed |
| Local fix weakens persistence | low | high | no change to create/push/set/remove persistence operations; focused test asserts mutation precedes notification |
| Image path diverges | low | medium | same helper invoked after image creation/push; regression covers image mutation |
## Promotion Gate

- **Merge/PR unit**: one JazzRuntime live-projection repair plus one focused local-mutation regression.
- **Rollback surface**: revert the single repair publication; no schema/data/deployment migration.
- **Verification boundary**: genuine pre-fix regression, focused local-mutation test, existing Jazz lifecycle/sync/unsupported-surface tests, strict workflow verification.
- **Review/acceptance boundary**: independent read-only semantic review of the exact final subject and root-cause evidence, then typed AcceptanceReceipt.
- **High-risk surface**: room subscription lifecycle and mutation ordering.
- **Why not checklist row**: text/image/edit/delete share one subscription-notification invariant; splitting would leave supported local mutations inconsistent.

## Evidence Contract

- **State/progress path**: this plan, repair contract/review/notes, and row-5 blocker references.
- **Verification evidence**: focused test fails on the unfixed runtime because local mutations do not notify the subscribed projection, then passes after the repair; existing Jazz tests remain green.
- **Evaluator rubric**: local mutations persist exactly as before; active projection callback runs after successful mutation; missing edit/remove targets do not emit false refresh; destroyed subscriptions are not called.
- **Stop condition**: repair contract Fulfilled, deterministic checks PASS, semantic PASS or explicit allowed owner waiver, typed AcceptanceReceipt, transactional local integration.
- **Rollback surface**: JazzRuntime implementation, focused regression, repair workflow artifacts only.

## Stop Conditions

- Stop if fixing live refresh requires changing Jazz schema, persistence format, sync mode/provider policy, or row-5 harness files.
- Stop if the focused regression cannot reproduce the missing local notification before the fix.
- Stop rather than adding a second UI-side message store or optimistic projection path.
## Task Breakdown

- [x] Scaffold a bugfix contract with exact JazzRuntime/test Allowed Paths and root-cause evidence.
- [x] Add the local-mutation notification regression and capture genuine pre-fix failure.
- [x] Retain active subscription callbacks and notify after text/image/edit/remove mutations.
- [x] Pass the runtime-focused and existing Jazz tests for the first repair iteration.
- [x] Record the read-only P1 finding that `JazzChatRoom.init()` suppresses every callback after initialization and explicitly amend the contract scope.
- [x] Add a real-room consumer regression and capture its failure against the current repair.
- [x] Separate initialization settlement from ongoing subscription lifetime in `JazzChatRoom`.
- [x] Pass runtime + consumer + existing Jazz tests; fresh strict Repo Harness verification remains to be materialized for the committed final subject.
- [ ] Obtain explicit owner-waiver acceptance for the final corrected subject; do not retry the exhausted external review.
- [ ] Integrate transactionally, rebase row 5, and rerun the clean production release gate.

## Handoff

- Parent blocker run: `_ops/local-first-release/20260926T143706Z-67642/` in the row-5 worktree.
- Diagnostic result: send input clears, message is absent immediately, but the same persisted message appears after reload/re-entry with the same Jazz account and room pointer.
- Resume after repair: return to row 5; this repair does not itself satisfy production release acceptance.
