> **Archived**: 2026-09-27 10:07
> **Related Plan**: plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260927-1007
> **Archive Projection V1**: `plans/plan-20260927-0940-harden-local-first-release-gate.md` => `plans/archive/plan-20260927-0940-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/notes/20260927-0940-harden-local-first-release-gate.notes.md` => `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/contracts/20260927-0940-harden-local-first-release-gate.contract.md` => `tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/reviews/20260927-0940-harden-local-first-release-gate.review.md` => `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`

# Plan: Harden local-first release gate

> **Status**: Archived
> **Created**: 20260927-0940
> **Slug**: harden-local-first-release-gate
> **Artifact Level**: work-package
> **Promotion Reason**: Published row-5 audit found bounded false-negative paths in release isolation evidence.
> **Verification Boundary**: Release-harness tests, static validation, and one clean exact production smoke after code changes.
> **Rollback Surface**: Revert this follow-up publication commit only.
> **Spec**: `docs/spec.md`
> **Research**: Published row-5 audit in current conversation; closed Sprint remains authoritative historical release record.
> **Task Contract**: `tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md`
> **Task Review**: `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`
> **Implementation Notes**: `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`

## Agentic Routing
- Selected route: contract worktree, deterministic verification, one semantic acceptance step.
- Routing reason: code/test hardening with release evidence and documentation cleanup.
- Due diligence:
  - P1 map: release E2E isolation, container capture/probe, README claims, archived row-5 review.
  - P2 trace: local WebSockets bypass inventory; Colima capture is optional; browser fetch failure is not tied to interception.
  - P3 decision rationale: harden evidence only; do not reopen product architecture or the completed Sprint.

## Workflow Inventory
- Active plan: `plans/archive/plan-20260927-0940-harden-local-first-release-gate.md`
- Sprint contract: `tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md`
- Sprint review: `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`
- Implementation notes: `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`
- Deferred-goal ledger: `tasks/todos.md`
- Current checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope authority: contract `allowed_paths`
- Concurrency: no active plan/worktree; completed Sprint stays Done.

## Approach
### Strategy
1. Record every browser WebSocket attempt, local and external; fail provider-pattern matches regardless of destination locality.
2. Restrict allowed local WebSocket destinations to the WorkAdventure local origin/path(s) exercised by the release flow.
3. Make the browser isolation control prove the Playwright route saw and aborted the exact control URL; block service workers in the context.
4. Require Colima capture support for this release gate; fail BLOCKED when unavailable or when the injected numeric container control attempt is absent from captured DOCKER-USER evidence.
5. Keep the numeric TCP egress control and classify only expected network-blocking outcomes as success.
6. Narrow README wording to HTTP(S)/WS(S) browser interception plus Colima forwarded-TCP destination auditing; explicitly exclude WebRTC/STUN and general air-gap certification.
7. Update archived row-5 review with a historical/final-state note instead of stale pending language.
8. Prune the stale `/private/tmp/workadventure-baseline` worktree registration.

### Trade-offs
| Option | Pros | Cons | Decision |
|---|---|---|---|
| Full host firewall for browser | Broadest isolation | Larger privileged/environment-specific scope | Defer |
| Playwright interception with explicit scope | Deterministic and bounded | Not WebRTC/STUN-wide | Use, document honestly |
| Optional container audit | Portable | Can PASS without inventory | Reject for this MacBook gate |
| Required Colima audit | Honest destination evidence | Colima-specific | Use for this gate |

## Detailed Design
### File Changes
| File | Action | Description |
|---|---|---|
| `tests/tests/local-first-release.spec.ts` | modify | All WS inventory, explicit control interception, service-worker block, provider checks over all attempts |
| `deploy/local-first/release-smoke.sh` | modify | Require Colima/capture, assert control attempt is observed in capture, emit capture status |
| `deploy/local-first/README.md` | modify | Narrow isolation/audit claims and state exclusions |
| `tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md` | modify | Mark stale pending sections historical and add final accepted state |
| task workflow artifacts | create/update | Contract, notes, review, archive closeout |

### Data Flow
Browser requests → Playwright route inventory → explicit control-intercept assertion → product flow → all WS/provider assertion.
Container numeric TCP control → DOCKER-USER log rule → dmesg capture → parsed destination TSV → required observation assertion → summary.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Allowed WS matcher too narrow | medium | gate false positive | derive from actual WorkAdventure socket URL and focused run |
| Kernel log capture unavailable | medium | gate BLOCKED | fail early with explicit diagnostic |
| Documentation overclaims again | low | audit confusion | state exact protocol/path limits |
| Expensive smoke drift | high | verification reuse rejected | commit clean candidate, use explicit force reason if required |

## Promotion Gate
- **Merge/PR unit**: one follow-up publication commit after workflow archive.
- **Rollback surface**: release gate/docs only; no product source.
- **Verification boundary**: lint/static checks + exact clean production release smoke.
- **Review/acceptance boundary**: new task only; prior Sprint acceptance remains closed.
- **High-risk surface**: release evidence correctness.
- **Why not checklist row**: code changes alter release acceptance instrumentation.

## Evidence Contract
- **State/progress path**: task contract/notes/review and ignored `_ops/local-first-release/<run>`.
- **Verification evidence**: exact revision, browser evidence, container control/capture, Repo Harness checks.
- **Evaluator rubric**: no local/external Jazz/Matrix provider WS attempt; control interception proven; container capture required and control destination observed; documented claims match instrumentation.
- **Stop condition**: any product source change becomes necessary, or required Colima capture cannot be established on the target MacBook.
- **Rollback surface**: revert follow-up commit.

## Task Breakdown
- [ ] Create contract worktree with exact allowed paths.
- [ ] Harden browser HTTP/WS evidence and control assertion.
- [ ] Harden required container destination capture.
- [ ] Correct README and archived review wording.
- [ ] Prune stale worktree registration.
- [ ] Run focused checks and clean exact production smoke.
- [ ] Verify, accept, transactionally integrate, and publish normal fast-forward.
