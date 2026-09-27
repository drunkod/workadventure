> **Archived**: 2026-09-27 10:07
> **Related Plan**: plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260927-1007
> **Archive Projection V1**: `plans/plan-20260927-0940-harden-local-first-release-gate.md` => `plans/archive/plan-20260927-0940-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/notes/20260927-0940-harden-local-first-release-gate.notes.md` => `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/contracts/20260927-0940-harden-local-first-release-gate.contract.md` => `tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/reviews/20260927-0940-harden-local-first-release-gate.review.md` => `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`

# Implementation Notes: harden-local-first-release-gate

> **Status**: Active
> **Plan**: plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
> **Contract**: tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md
> **Review**: tasks/archive/review-20260927-1007-harden-local-first-release-gate.md
> **Last Updated**: 2026-09-27 09:49
> **Lifecycle**: notes

## Design Decisions

- Keep the completed five-row Local First Sprint closed; this is a separate evidence-hardening task.
- Browser release evidence records every WebSocket attempt. Only the WorkAdventure room socket at the release origin path `/ws/room` is permitted.
- Browser service workers are blocked for the test context. The public HTTP control passes only if Playwright routing records the exact control URL and the fetch fails.
- The browser claim is intentionally limited to Playwright HTTP(S)/WS(S) interception; WebRTC/STUN and other browser network mechanisms are not certified by this gate.
- Colima is mandatory for the target MacBook release audit. Missing DOCKER-USER or kernel-log access returns a blocking failure instead of silently omitting destination evidence.
- A dedicated capture-control container joins the ingress bridge and attempts `1.1.1.1:443`; the gate requires that known forwarded attempt in the DOCKER-USER kernel log.
- The existing play-container numeric TCP control remains the proof that the actual application container cannot reach public Internet. This is separate from forwarded destination capture because the internal network may reject the attempt before forwarding.
- Final summary records all browser WS attempts, forwarded container attempts, and capture-backend scope.
- The stale `/private/tmp/workadventure-baseline` Git worktree registration was pruned administratively; no repository content was changed by that prune.

## Deviations From Plan Or Spec

- Full `npm --prefix tests run lint` is currently blocked in this fresh worktree by an unrelated missing generated Room API import in `tests/tests/room-api.spec.ts`. The contract therefore uses package-config-aware lint of the changed `tests/local-first-release.spec.ts` only.
- Fresh worktree dev tooling required ignored local `node_modules` links to the canonical install; no lockfile or dependency declaration changed.
- Exact candidate `8370cf043` passed the full production smoke and proved the Colima capture-control plus play-container `ENETUNREACH` block, but its browser evidence contained `wsAttempts: []`. That did not prove local WebSocket interception was active, so the candidate was strengthened before acceptance with a deliberate local WebSocket control that the Playwright WS route must record and close.

## Tradeoffs Considered

| Option | Decision | Reason |
|---|---|---|
| Host/browser-wide firewall | Deferred | Would widen privilege/environment scope beyond the reported audit gaps. |
| Playwright HTTP/WS interception | Keep, narrow claim | Deterministic for the traffic surfaces used by the release E2E. |
| Optional Colima logging | Reject | Could allow PASS with no destination inventory. |
| Required forwarded capture control | Use | Proves DOCKER-USER logging is active while documenting pre-forwarding blind spots. |

## Open Questions

- None before the clean production smoke. If the capture control cannot be observed on the target Colima VM, the task is BLOCKED rather than weakened.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Release evidence after exact-candidate smoke: `_ops/local-first-release/<run-id>/`

## Promotion Filter

No cross-task lesson is promoted yet; keep this evidence local unless the same release-audit pattern recurs.
