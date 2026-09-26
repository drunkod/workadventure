> **Archived**: 2026-09-27 01:10
> **Related Plan**: plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260927-0110
> **Archive Projection V1**: `plans/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md` => `plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/notes/20260926-1952-fix-jazz-local-mutation-live-refresh.notes.md` => `tasks/archive/notes-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1952-fix-jazz-local-mutation-live-refresh.contract.md` => `tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1952-fix-jazz-local-mutation-live-refresh.review.md` => `tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md`

# Implementation Notes: fix-jazz-local-mutation-live-refresh

> **Status**: Active
> **Plan**: plans/archive/plan-20260926-1952-fix-jazz-local-mutation-live-refresh.md
> **Contract**: tasks/archive/contract-20260927-0110-fix-jazz-local-mutation-live-refresh.md
> **Review**: tasks/archive/review-20260927-0110-fix-jazz-local-mutation-live-refresh.md
> **Last Updated**: 2026-09-27 00:55
> **Lifecycle**: notes

## Design Decisions

- Preserve Jazz as the single source of truth. No optimistic UI-side message store is added.
- Retain each active room projection callback in `RoomSubscriptionState` beside the loaded room and unsubscribe handle.
- After a successful local text/image/edit/remove mutation, notify only the currently registered subscription when it still points at the same loaded room.
- Missing edit/remove targets remain no-ops and therefore emit no projection refresh.
- Subscription setup publishes its state before calling `roomSchema.subscribe`, so an implementation that synchronously emits the initial loaded room can populate the runtime state correctly.
- Persistence operations (`push`, `set`, `remove`) remain unchanged and happen before projection notification.
- A read-only audit of `9ff1e1522` found a second functional gate: `JazzChatRoom.init()` used its initialization `settled` flag to suppress every later subscription callback.
- The approved scope amendment separates initialization-promise settlement from subscription lifetime: post-init loaded-room callbacks continue through `syncMessages()`, while initialization abort/reject remains one-shot.
- `destroy()` marks the room destroyed and increments `syncVersion` before clearing messages, so stale async image projections are discarded instead of repopulating a destroyed room.
- Post-initialization projection errors are caught and logged; they no longer affect the already-resolved initialization promise.

## Deviations From Plan Or Spec

- None in product scope.
- The existing focused Jazz suite initially failed to import generated `play/src/i18n/i18n-svelte` in the fresh repair worktree. Running `npm --prefix play run typesafe-i18n` regenerated ignored test prerequisites; the exact suite then passed 27/27. No generated files are tracked by this repair.

## Tradeoffs Considered

| Option | Decision | Reason |
|--------|----------|--------|
| Optimistically mutate `JazzChatRoom.messages` | Reject | Creates a second source of truth and duplicates projection logic. |
| Reload/re-subscribe after each mutation | Reject | Hides the same-document notification defect and is disruptive. |
| Notify the active runtime subscription after a successful local mutation | Choose | Central, bounded, preserves Jazz persistence and remote subscription behavior. |

## Open Questions

- The single external semantic-review attempt was consumed on commit `484ad3a12`. Its raw transcript reported one P2 finding: replacement subscription setup could overwrite and then lose the previous active subscription if `roomSchema.subscribe` threw.
- The P2 is fixed by restoring the previous state on replacement failure, unsubscribing the previous subscription only after a successful replacement, and making each disposer remove only its own state. A focused regression covers this failure path.
- Per review-budget policy, the external review is not retried. Final acceptance therefore requires the contract's explicit owner-waiver path after fresh revision-bound verification.
- The read-only owner audit after `9ff1e1522` found the downstream P1 consumer suppression. The contract was explicitly amended before product edits to allow `JazzChatRoom.ts`, a real-consumer regression, and separate pre-fix evidence.
- Row 5 must be rebased onto the integrated repair and its clean production release gate rerun before release acceptance.

## Evidence Links

- Pre-fix regression: `tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-pre-fix.log`
- Initial focused post-fix regression: 2/2 PASS at 2026-09-26 20:18.
- Semantic review of `484ad3a12`: raw transcript reported one P2 replacement-subscription failure-state finding; wrapper's empty-findings/PASS summary was not treated as authoritative.
- Post-P2 focused regression: 3/3 PASS at 2026-09-27 00:40.
- Post-P2 existing Jazz focused suite: 27/27 PASS at 2026-09-27 00:40.
- Consumer pre-fix regression: `tasks/evidence/20260926-1952-fix-jazz-local-mutation-live-refresh-consumer-pre-fix.log` records 2/2 failures against `9ff1e1522`; first post-init text mutation leaves `room.messages` at length 0.
- Post-consumer-fix focused suite: runtime 3/3 + real-room 3/3 = 6/6 PASS at 2026-09-27 00:54, covering text/image/edit/delete, post-destroy callback suppression, and in-flight image invalidation.
- Post-consumer-fix existing Jazz focused suite: 27/27 PASS at 2026-09-27 00:54.
- Repo Harness current-exact execution records under `.ai/harness/runs/`:
  - `verification-vx-4d7fd2967bcf44df8b17.json` — package regression PASS.
  - `verification-vx-2a8d019935e542e29350.json` — focused regression command PASS.
  - `verification-vx-1b7647534a9f48e58d93.json` — existing Jazz suite PASS.
  - `verification-vx-6c32653c88d944848841.json` — diff check PASS.
- Blocked parent release run: row-5 `_ops/local-first-release/20260926T143706Z-67642/`.

## Promotion Filter

Promote a candidate to `tasks/lessons.md`, `docs/researches/`, or harness asset files only when all three hold: hard to reverse, surprising without local context, and a real trade-off existed. If any one is missing, keep it in this notes file instead.

## Promotion Candidates

- Keep the same-document Jazz notification behavior in this task unless a second task shows the same reactive-gap pattern.
