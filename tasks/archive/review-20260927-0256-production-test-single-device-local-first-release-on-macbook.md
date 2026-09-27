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

- Verdict: accepted via owner waiver
- Change type: code-change
- Intended files changed: Local First release isolation/verification/docs plus dedicated Playwright release spec
- Actual files changed: matched the archived contract Allowed Paths
- Commands passed: exact contract verification 15/15, declared verification 7/7, clean production release smoke
- Residual risks: release isolation evidence was scoped to the mechanisms documented at acceptance; later post-publication audit findings are tracked by a separate hardening task
- Reviewer action required: none for the archived row-5 acceptance
- Rollback: revert the row-5 publication commit if the accepted release gate must be withdrawn

## Mode Evidence

- Selected route: one Codex semantic review, correction of its raw P2 findings, then explicit owner waiver because the review budget was exhausted
- P1/P2/P3 evidence: raw semantic-review P2 findings were treated as authoritative even though the wrapper reported PASS
- Root cause or plan evidence: archived plan/notes and receipt-bound verification listed above

## Verification Evidence

- Waza `/check` run: not used as a separate authority
- Commands run: Repo Harness exact verification plus `bash deploy/local-first/release-smoke.sh`
- Manual checks: production browser/container evidence was exercised by the release smoke
- Supporting artifacts: receipt-bound `.ai/harness/checks/latest.json` at acceptance and ignored release-run evidence on the execution host
- Implementation notes reviewed: archived notes file listed above
- Run snapshot: acceptance receipt binds verification evidence SHA256 `sha256:f4615a533acb0d2befd8c684cd386512735ed26eef0daaaf44cbf4675ca6d6fc`

## Manual Check Evidence

- No additional standalone manual-check requirement remained outside the declared release smoke and verification plan at final acceptance.

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

- Historical semantic-review findings: exact service-network membership and generic HTTPS-failure egress proof were both corrected before final acceptance.
- Final acceptance used the contract's owner-waiver path after fresh exact verification and a clean production gate; that waiver is recorded above.
- Startup logs could still contain legacy MatrixProvider invalid-URL errors; row-5 acceptance was based on observed network requests/sockets rather than log text alone.
- A later read-only post-publication audit identified additional release-evidence hardening opportunities. Those do not reopen this accepted row; they are handled in the separate `harden-local-first-release-gate` task.

## Scorecard

The archived row-5 review did not use a numeric score as acceptance authority. The typed AcceptanceReceipt and its bound verification evidence are authoritative.

## Failing Items

- None remained open at final row-5 acceptance.
- Historical P2 findings from the consumed semantic review were corrected before the receipt was issued.
- Later post-publication audit findings are explicitly follow-up hardening work, not retroactive row-5 failures.

## Retest Steps

- Historical retest completed before acceptance: clean production release smoke, exact topology checks, numeric container egress control, anonymous gameplay, `ru-RU`, Jazz text/image/edit/delete/reload persistence, and provider-fallback checks.
- Further hardening is verified independently by the follow-up task rather than mutating this archived acceptance.

## Summary

- Row 5 was accepted via the recorded owner waiver after the consumed semantic-review P2 findings were corrected and fresh exact deterministic plus production evidence passed. The receipt above is the final acceptance state; earlier pending language in this review was historical pre-acceptance text.
