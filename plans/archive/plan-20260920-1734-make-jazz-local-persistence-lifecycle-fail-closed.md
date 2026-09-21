> **Archived**: 2026-09-21 13:47
> **Related Plan**: plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260921-1347
> **Archive Projection V1**: `plans/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md` => `plans/archive/plan-20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/notes/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.notes.md` => `tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/contracts/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.contract.md` => `tasks/archive/contract-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Archive Projection V1**: `tasks/reviews/20260920-1734-make-jazz-local-persistence-lifecycle-fail-closed.review.md` => `tasks/archive/review-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`

# Plan: Make Jazz local persistence lifecycle fail closed

> **Status**: Archived
> **Created**: 20260920-1734
> **Slug**: make-jazz-local-persistence-lifecycle-fail-closed
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md#make Jazz local persistence lifecycle fail closed
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: focused Jazz runtime/connection/surface tests plus normal play typecheck
> **Rollback Surface**: revert the reviewed row-2 publication
> **Spec**: `docs/spec.md`
> **Research**: `docs/researches/20260920-local-first-jazz-audit.md`
> **Task Contract**: `tasks/archive/contract-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Task Review**: `tasks/archive/review-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`
> **Implementation Notes**: `tasks/archive/notes-20260921-1347-make-jazz-local-persistence-lifecycle-fail-closed.md`

## Agentic Routing
- Mechanical implementation only. Sprint lifecycle decisions are frozen.
- No web research, deployment work, provider redesign, or permission framework.
- GPT-5.6 Luna / low worker; read-only GPT-5.6 Luna / low verifier.

## Decisions

1. `JazzRuntime` owns one global browser-context lifecycle record containing effective policy identity, in-flight initialization, and ready state. Equivalent concurrent/same-policy initialization shares/returns the same operation; incompatible policy rejects without replacing the active context.
2. Failed global context initialization clears only its failed in-flight record so an equivalent retry can succeed. Successful context state is not silently replaced by a later incompatible request.
3. `resolveRoomId` never suppresses browser storage errors. Existing stored/explicit room IDs are returned unchanged; stale/unavailable IDs are never replaced with a new room.
4. New-room pointer creation requires a persistence confirmation (`$jazz.waitForSync`) before writing the pointer. Missing confirmation or localStorage read/write failure is an explicit error.
5. `JazzChatRoom.init(signal)` resolves only after the subscribed room is loaded and its first message projection is usable. It unsubscribes/rejects on abort; callbacks after abort are fenced.
6. `JazzChatConnection.init()` shares one in-flight attempt. The 5,000 ms readiness timer starts immediately before awaiting main-room `init`. Timeout/error aborts and destroys the failed room, leaves `ON_ERROR`, and clears only the failed connection attempt so an equivalent retry is possible. A late callback cannot set `ONLINE`.
7. Row-1 provider exclusivity remains: any Jazz failure returns the Jazz `ON_ERROR` connection; Matrix initialization remains zero.
8. Local First supported surface is main room text/image/edit/delete only. Jazz `createRoom`, `createFolder`, `createDirectRoom`, shared-room search/join, room leave/join, invitation and moderation mutations throw an explicit unsupported error rather than succeeding.
9. Minimal UI gating only: hide root room/folder creation under Jazz; hide direct-message creation under Jazz; hide room leave/manage-participant actions under Jazz; do not invoke shared-room discovery under Jazz. Do not introduce generic capabilities/permissions.
10. Deployment, Redis, Compose, network-isolation, and row-3+ concerns are excluded.

## Allowed implementation files
- `play/src/front/Chat/Connection/Jazz/JazzRuntime.ts`
- `play/src/front/Chat/Connection/Jazz/JazzChatConnection.ts`
- `play/src/front/Chat/Connection/Jazz/JazzChatRoom.ts`
- `play/src/front/Phaser/Game/GameManager.ts` only if needed to preserve provider exclusivity tests
- `play/src/front/Chat/Components/Room/CreateRoomOrFolderOption.svelte`
- `play/src/front/Chat/Components/UserList/User.svelte`
- `play/src/front/Chat/Components/Room/RoomMenu/RoomMenu.svelte`
- `play/src/front/Chat/Components/ChatHeader.svelte`
- focused row-2 tests under `play/tests/front/Chat/Connection/Jazz/` and `play/tests/front/Phaser/Game/`

## Focused validation
1. `cd play && npx vitest run tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts`
2. `cd play && npx vitest run tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts`
3. `cd play && npx vitest run tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts`
4. `cd play && npm run typecheck`
5. `git diff --check`

Required evidence: one shared init for equivalent concurrent requests; same config idempotent; incompatible config rejects; failed init retry works; local policy creates no peer; storage read/write errors reject; stale pointer is preserved and never replaced; 5s timeout aborts/fences late readiness; real Jazz failure remains `ON_ERROR` with zero Matrix init; unsupported operations reject.

## Promotion Gate
- **Merge/PR unit**: row-2 Jazz lifecycle + minimal unsupported-surface gating only.
- **Rollback surface**: revert row-2 publication; no migration.
- **Verification boundary**: contract checks plus diff check.
- **Review/acceptance boundary**: one read-only Luna-low semantic review on frozen evidence.
- **High-risk surface**: stale pointer replacement, late readiness after timeout, incompatible global context reuse, provider fallback.
- **Why not checklist row**: runtime lifecycle and persistence semantics cross multiple Jazz boundaries.

## Evidence Contract
- **State/progress path**: this plan, contract/review/notes, Sprint row 2.
- **Verification evidence**: `.ai/harness/checks/latest.json` plus immutable run snapshot.
- **Evaluator rubric**: exact frozen lifecycle rules, explicit storage errors, no replacement, no Matrix fallback, no unsupported fake success, no row-3 scope.
- **Stop condition**: contract fulfilled, semantic PASS, final `verify-sprint`, closeout.
- **Rollback surface**: revert row-2 publication.

## Task Breakdown
- [ ] Make runtime context initialization shared/idempotent/config-exclusive/retryable.
- [ ] Make storage pointer persistence fail closed and non-replacing.
- [ ] Add loaded-room readiness with abort fencing.
- [ ] Add 5s shared connection-init timeout/retry lifecycle.
- [ ] Make unsupported Jazz operations fail explicitly and gate their visible entry points.
- [ ] Pass deterministic and semantic acceptance.
