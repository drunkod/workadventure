> **Archived**: 2026-09-27 02:56
> **Related Plan**: plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
> **Outcome**: Completed
> **Lifecycle**: review
> **Parent Run ID**: run-20260927-0256
> **Archive Projection V1**: `plans/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md` => `plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md` => `tasks/archive/notes-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1435-production-test-single-device-local-first-release-on-macbook.contract.md` => `tasks/archive/contract-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md` => `tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`

# Task Review: production-test-single-device-local-first-release-on-macbook

> **Status**: Accepted
> **Plan**: plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
> **Contract**: tasks/archive/contract-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
> **Notes File**: tasks/archive/notes-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
> **Checks File**: .ai/harness/checks/latest.json
> **Last Updated**: 2026-09-27 01:31
> **Recommendation**: pass
> **Review Rubric Version**: 2
> **Reviewed Subject SHA256**: sha256:18066fa6dfae6fbd9f8aef266d3cc88649d44eb6f16a26fa292411e3758210e7
> **Reviewed Subject Scope**: normalized-final-content
> **Reviewed Target Revision**: 6bd81afc2b988a9f1b3d6f5b9e5e847ef4e91f01

## Human Review Card

- Verdict: pending
- Change type: code-change | docs-only | ledger-closeout | migration | eval-only | delegated-run | frontend
- Intended files changed:
- Actual files changed:
- Commands passed:
- Residual risks:
- Reviewer action required: inspect diff and card
- Rollback:

## Mode Evidence

- Selected route:
- P1/P2/P3 evidence:
- Root cause or plan evidence:

## Verification Evidence

- Waza `/check` run:
- Commands run:
- Manual checks:
- Supporting artifacts:
- Implementation notes reviewed:
- Run snapshot:

## Manual Check Evidence

Copy each non-built-in contract `manual_checks` requirement exactly. Check it only after
the observation is complete and replace the placeholder with concrete command output,
screenshot/artifact path, or reviewer observation.

- [ ] Exact manual_checks requirement
  - Evidence: concrete observation, command output, screenshot path, or reviewer note

## Acceptance Receipt Projection

> **Disposition**: user_waiver
> **Reviewer**: User
> **Source**: user-waiver
> **Actor**: test
> **Reviewed Subject SHA256**: sha256:18066fa6dfae6fbd9f8aef266d3cc88649d44eb6f16a26fa292411e3758210e7
> **Reviewed Subject Scope**: normalized-final-content
> **Reviewed Target Revision**: 6bd81afc2b988a9f1b3d6f5b9e5e847ef4e91f01
> **Verification Evidence SHA256**: sha256:f4615a533acb0d2befd8c684cd386512735ed26eef0daaaf44cbf4675ca6d6fc
> **Issued At**: 2026-09-26T20:57:43.846Z

- Summary: Owner accepts exact row-5 candidate aeca7300485d9d05a3ea186803fb3c57a85c2e8d after raw Codex review P2 findings were corrected, the external review budget was exhausted, and fresh deterministic plus production release evidence passed. This acceptance authorizes local integration only and does not authorize push.
- Findings: none

## Behavior Diff Notes

- The runtime-script and Jazz live-refresh repairs are integrated locally; row 5 is rebased onto canonical `6bd81afc2`.
- The browser harness treats post-reload anonymous onboarding as valid Russian UI state, then re-enters the starter map in the same browser context before Jazz persistence checks.
- The image upload harness follows the real `MessageFileInput` behavior: selecting `uploadChatCustomAsset` sends immediately without an extra send-button click.
- The release verifier now requires exact network membership: non-proxy services only `default`; reverse-proxy exactly `default` + `ingress`.
- The container egress control uses a numeric TCP probe and accepts only explicit reachability-blocking errors/timeouts; DNS/TLS/runtime errors cannot satisfy the control.
- No product source is changed by row 5.

## Residual Risks / Follow-ups

- The one Codex semantic-review attempt is consumed. Its raw transcript reported two P2 findings; the wrapper's empty-findings/PASS summary is not authoritative.
- P2: static verification allowed an application service to join an arbitrary extra external network. Corrected by exact service-network-set validation.
- P2: any HTTPS fetch failure could satisfy the container egress control. Corrected by a numeric TCP reachability probe with explicit expected blocking reasons.
- No second semantic review will be attempted; final acceptance must use the contract's owner-waiver path after fresh exact verification and a clean production gate.
- Startup logs may still contain legacy MatrixProvider invalid-URL errors; acceptance remains based on observed network requests/sockets, not log text alone.

## Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| Functionality | 0/10 | |
| Product depth | 0/10 | |
| Design quality | 0/10 | |
| Code quality | 0/10 | |

## Failing Items

- External semantic review of exact subject `sha256:2f17d4d8b39e89047bae9339e7133740e5c2a4afb79632d96b5774c3220b43ab` found two P2 isolation-evidence weaknesses. Both are corrected in the current uncommitted candidate.
- Acceptance remains pending until the corrected candidate passes the full clean production gate and fresh revision-bound verification; the review will not be retried.

## Retest Steps

- Commit the two isolation hardenings and workflow notes, then run `bash deploy/local-first/release-smoke.sh` from that exact clean revision.
- Confirm the resolved topology contains only `default` for application services and exactly `default` + `ingress` for reverse-proxy.
- Confirm `container-control.json` records `container_public_egress_blocked=true` with an expected blocking reason from the numeric TCP probe.
- Re-check anonymous gameplay, `ru-RU`, Jazz text/image/edit/delete/reload persistence, browser public-egress blocking, and zero Jazz/Matrix/provider fallback attempts.
- Run fresh `verify-sprint --prepare-acceptance`; if green, request an explicit row-5 owner waiver for that exact corrected subject.

## Summary

- Production behavior on `58e2f5ddb` passed the full release gate, but the exact semantic review found two P2 weaknesses in how isolation was statically/procedurally proven. Both are being corrected within row-5 scope. The external review is exhausted, so acceptance remains pending fresh exact verification plus explicit owner waiver.
