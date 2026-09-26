> **Archived**: 2026-09-26 19:14
> **Related Plan**: plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260926-1914
> **Archive Projection V1**: `plans/plan-20260926-1643-fix-production-runtime-script-rendering.md` => `plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/notes/20260926-1643-fix-production-runtime-script-rendering.notes.md` => `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1643-fix-production-runtime-script-rendering.contract.md` => `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1643-fix-production-runtime-script-rendering.review.md` => `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`

# Implementation Notes: fix-production-runtime-script-rendering

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
> **Contract**: tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md
> **Review**: tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md
> **Last Updated**: 2026-09-26 17:30
> **Lifecycle**: notes

## Root Cause

Row-5 production evidence showed HTTP 200 from the built Local First origin followed by Chromium `SyntaxError: Unexpected identifier 'DEBUG_MODE'`. The runtime loader in `play/index.html` compared `runtimeScript` to the literal triple-Mustache script token inside executable JavaScript. Mustache therefore substituted the quote-bearing `window.env` source into that comparison string and made the loader invalid before the login UI could render.

## Design Decisions

- Keep the application/json runtime payload node and `new Function(runtimeScript)()` execution path unchanged.
- Preserve the direct/static-template no-op behavior instead of deleting the raw-template guard.
- Construct the raw placeholder sentinel from character codes so the Mustache renderer cannot see a contiguous token in executable source.
- Add `play/tests/pusher/FrontControllerRuntimeScript.test.ts` against the real template and real Mustache dependency.
## Verification Evidence

- Pre-fix guard: `tasks/evidence/20260926-1643-fix-production-runtime-script-rendering-pre-fix.log`.
- Genuine pre-fix result: one test fails with `SyntaxError: Unexpected identifier 'DEBUG_MODE'`; raw-template no-op test passes; `PRE_FIX_EXIT=1`.
- Post-fix focused Vitest: 2/2 tests pass.
- `git diff --check`: pass.
- `repo-harness run check-task-workflow --strict`: pass.
- `repo-harness run verify-contract --contract tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md --strict`: 17/17, Fulfilled.

## Deviations From Plan Or Spec

- None. The repair is limited to the planned sentinel expression and focused regression.

## Tradeoffs Considered

| Option | Decision | Reason |
|---|---|---|
| Escape or rewrite injected payload | Reject | Would change runtime configuration semantics. |
| Delete raw-template sentinel | Reject | Would make direct/static template execution unsafe. |
| Build sentinel without contiguous Mustache syntax | Use | Preserves both production rendering and raw-template behavior with a tiny patch. |

## Follow-up

After local transactional integration, row 5 must be restarted/rebased on the repaired target and its clean-revision production release gate rerun. This repair alone does not establish row-5 release acceptance.
