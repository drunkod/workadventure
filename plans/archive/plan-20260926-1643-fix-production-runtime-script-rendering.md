> **Archived**: 2026-09-26 19:14
> **Related Plan**: plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260926-1914
> **Archive Projection V1**: `plans/plan-20260926-1643-fix-production-runtime-script-rendering.md` => `plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/notes/20260926-1643-fix-production-runtime-script-rendering.notes.md` => `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1643-fix-production-runtime-script-rendering.contract.md` => `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1643-fix-production-runtime-script-rendering.review.md` => `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`

# Plan: Fix production runtime script rendering

> **Status**: Archived
> **Created**: 20260926-1643
> **Slug**: fix-production-runtime-script-rendering
> **Artifact Level**: work-package
> **Promotion Reason**: Row 5 release verification proved a deterministic production HTML parse failure outside the release-harness contract.
> **Verification Boundary**: Render the production index template with a quote-bearing runtime payload, prove executable inline scripts parse, then rerun focused play tests and the row-5 runtime entrypoint smoke after integration.
> **Rollback Surface**: Revert the index-template guard plus its focused regression test.
> **Spec**: `docs/spec.md`
> **Research**: Row-5 evidence under `_ops/local-first-release/20260926T113642Z-1801/`
> **Task Contract**: `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
> **Task Review**: `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`
> **Implementation Notes**: `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`

## Agentic Routing

- Selected route: narrow bugfix contract in a dedicated worktree.
- Routing reason: row 5 explicitly stops when product source must change; the repair must be independently verified and accepted before row 5 is retried.
- Due diligence:
  - P1 map: CodeGraph traced production HTML rendering through `play/src/pusher/controllers/FrontController.ts` and `play/index.html`.
  - P2 trace: row-5 Playwright trace captured `SyntaxError: Unexpected identifier 'DEBUG_MODE'` before login UI.
  - P3 decision rationale: keep `FrontController.getScript()` unchanged; repair only the unrendered-template sentinel check that Mustache currently substitutes inside a quoted JavaScript literal.

## Workflow Inventory

- Active plan: `plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md`
- Sprint contract: `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
- Sprint review: `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`
- Implementation notes: `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
- Deferred-goal ledger: `tasks/todos.md`
- Current checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope authority: repair contract `allowed_paths`.
- Concurrency rule: row 5 remains bound in its own worktree; this repair uses a separate contract worktree.
- Execution isolation: project through `plan-to-todo` and start the generated contract worktree.

## Approach

### Strategy

Replace the literal full Mustache token inside the executable JavaScript comparison with an equivalent runtime sentinel assembled from string fragments, so Mustache cannot substitute the production runtime payload into the quoted comparison. Keep the actual `{{{ script }}}` payload node unchanged. Add a regression test that renders `play/index.html` with the same quote-bearing runtime-script shape used by production and asserts every executable inline script compiles.

### Trade-offs

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Escape the injected runtime payload before comparison | Could make generated JS parse | Duplicates/changes payload semantics and risks config corruption | Reject |
| Remove the unrendered-template guard | Minimal production fix | Breaks direct/static template behavior by evaluating raw Mustache syntax | Reject |
| Build the sentinel from non-contiguous string fragments | Tiny, preserves both production injection and static-template guard | Requires focused regression coverage | Choose |

## Detailed Design

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `play/index.html` | Modify | Make the unrendered `{{{ script }}}` sentinel non-substitutable inside executable JS while preserving runtime execution. |
| `play/tests/pusher/FrontControllerRuntimeScript.test.ts` | Add | Render the template with quote-bearing runtime config and assert executable inline scripts compile; also assert the unrendered template guard remains safe. |
| Workflow artifacts | Update | Record root cause, pre-fix failure, verification, review, and closeout evidence. |

### Data Flow

`FrontController.getScript()` → Mustache `script` value → application/json runtime node → small executable loader → `new Function(runtimeScript)()`. The repair changes only the loader's sentinel expression; injected runtime data is byte-for-byte unchanged.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Production runtime config stops executing | Low | High | Regression test executes/parses rendered loader and verifies payload remains present. |
| Static/unrendered index evaluates raw Mustache token | Low | Medium | Test the unrendered template path and preserve explicit sentinel. |
| Fix masks another row-5 blocker | Medium | Medium | After integration, rerun row 5 from a clean exact revision; do not claim row 5 pass from this repair alone. |

## Task Contracts

- Contract file: `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
- Review file: `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`
- Implementation notes file: `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
- Verification command: `repo-harness run verify-contract --contract tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md --strict`

## Promotion Gate

- **Merge/PR unit**: one index-template runtime-script sentinel repair plus one focused regression test and workflow evidence.
- **Rollback surface**: revert the single repair publication; no data/schema/deployment migration.
- **Verification boundary**: pre-fix regression reproduces the invalid rendered JS; post-fix focused test, Play lint/type-compatible checks, and exact rendered-template parse all pass.
- **Review/acceptance boundary**: independent read-only semantic review of the exact final subject and root-cause evidence, followed by typed AcceptanceReceipt.
- **High-risk surface**: production bootstrap configuration, Mustache interpolation, direct/static index behavior.
- **Why not checklist row**: the source repair and regression guard are one atomic defect correction; splitting them would permit an unguarded production-bootstrap change.

## Evidence Contract

- **State/progress path**: this plan, repair contract/review/notes, and row-5 blocker notes as parent context.
- **Verification evidence**: captured pre-fix focused-test failure plus current-exact focused test and workflow checks.
- **Evaluator rubric**: rendered production HTML contains the intended runtime payload; executable inline scripts parse; unrendered template path does not execute raw Mustache syntax; no unrelated product behavior changes.
- **Stop condition**: repair contract Fulfilled, deterministic checks PASS, independent semantic PASS, typed AcceptanceReceipt, and transactional local integration.
- **Rollback surface**: `play/index.html`, its focused regression test, and repair workflow artifacts only.

## Stop Conditions

- Stop if the repair requires changing runtime environment semantics or `FrontController.getScript()` payload content rather than the template sentinel.
- Stop if the focused test cannot reproduce the pre-fix parse failure.
- Stop rather than folding row-5 release-harness changes into this repair.

## Task Breakdown

- [ ] Scaffold the bugfix contract/worktree with exact root-cause and allowed paths.
- [ ] Add a focused regression test and capture its pre-fix failure artifact.
- [ ] Make the minimal `play/index.html` sentinel repair.
- [ ] Pass focused test, lint/workflow checks, and independent semantic review.
- [ ] Integrate the repair locally through Repo Harness.
- [ ] Rebase/restart row 5 on the repaired target and rerun its clean-revision release gate.
