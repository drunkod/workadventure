# Plan: Jazz subpath TypeScript resolution

> **Status**: Executing
> **Created**: 20260917-1438
> **Slug**: jazz-subpath-typescript-resolution
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260917-1435-jazz-runtime-compatibility.sprint.md#repair Jazz subpath TypeScript resolution
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: play typecheck plus Jazz runtime export probe
> **Rollback Surface**: revert play/tsconfig.json or the reviewed task commit
> **Spec**: `docs/spec.md`
> **Research**: See `docs/researches/`
> **Task Contract**: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md`
> **Task Review**: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md`
> **Implementation Notes**: `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md`

## Agentic Routing
- Selected route: planning
- Routing reason: Captured from repo-harness-plan planning output.
- Source ref: sprint:plans/sprints/20260917-1435-jazz-runtime-compatibility.sprint.md#repair Jazz subpath TypeScript resolution
- Due diligence:
  - P1 map: See captured planning output below.
  - P2 trace: See captured planning output below.
  - P3 decision rationale: See captured planning output below.

## Workflow Inventory
Complete this inventory before implementation. If any line is unknown, keep the plan in Draft and fill it before projection.

- Active plan: `plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md`
- Sprint contract: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md`
- Sprint review: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md`
- Implementation notes: `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md`
- Deferred-goal ledger: `tasks/todos.md`
- Current checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope authority: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md` `allowed_paths`
- Concurrency rule: `.ai/harness/active-plan` selects the active plan for this worktree when present; `.ai/harness/active-worktree` records the owning worktree. If another worktree already owns active work, open or switch to the matching worktree instead of serializing unrelated plans.
- Execution isolation: approved contract-level work projects through `repo-harness run plan-to-todo --plan plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md` and may start `repo-harness run contract-worktree start --plan plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md`.

## Approach
### Strategy
Use the captured planning output below as the execution source of truth.

### Trade-offs
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Captured plan | Preserves the approved Codex Plan or Waza think decision | Requires the captured text to be concrete enough to execute | Use |

## Detailed Design
### File Changes
| File | Action | Description |
|------|--------|-------------|
| See captured planning output | Follow | Implement only the approved scope named below |

### Code Snippets
See captured planning output.

### Data Flow
See captured planning output.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Captured plan lacks enough detail | Medium | Execution may need clarification | Stop before implementation if the captured output contradicts repo rules or lacks concrete file targets |

## Task Contracts
- Contract file: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md`
- Review file: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md`
- Implementation notes file: `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md`
- Template: `.claude/templates/contract.template.md`
- Verification command: `repo-harness run verify-contract --contract tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md --strict`
- Active plan rule: this captured plan is written to `.ai/harness/active-plan` and the owning worktree is written to `.ai/harness/active-worktree` unless --no-active is used. Do not infer active execution from the latest non-archived plan.

## Handoff

- Checks file: `.ai/harness/checks/latest.json`
- Session handoff: `.ai/harness/handoff/current.md`

## Promotion Gate

- **Merge/PR unit**: Captured plan `plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md` is the proposed mergeable execution unit; revise before execute if this is only a checklist step.
- **Rollback surface**: revert play/tsconfig.json or the reviewed task commit
- **Verification boundary**: play typecheck plus Jazz runtime export probe
- **Review/acceptance boundary**: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md` must record pass against the captured acceptance criteria.
- **High-risk surface**: Risks named in captured planning output; keep the plan Draft if risk ownership is not concrete.
- **Why not checklist row**: worktree_boundary

## Evidence Contract

- **State/progress path**: `plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md` task breakdown, `tasks/todos.md` deferred-goal ledger, `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md`, `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md`, and `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md`
- **Verification evidence**: `.ai/harness/checks/latest.json`, `.ai/harness/runs/`, and the commands named in the captured planning output
- **Evaluator rubric**: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md` must record a passing Waza /check style recommendation
- **Stop condition**: all task breakdown items are complete, sprint verification passes, and the review recommends pass
- **Rollback surface**: revert play/tsconfig.json or the reviewed task commit

## Captured Planning Output

## Goal

Restore the normal `play` TypeScript baseline by making TypeScript honor the conditional package exports already published by `jazz-tools@0.20.10`.

## Evidence already established

- `cd play && npm run typecheck` fails only at `JazzRuntime.ts` imports of `jazz-tools/browser` and `jazz-tools/media`.
- Node dynamic imports of `jazz-tools`, `jazz-tools/browser`, and `jazz-tools/media` succeed.
- Required exports are present: `JazzBrowserContextManager`, `createImage`, `loadImageBySize`, `co`, `z`, `Group`, `CoPlainText`.
- `cd play && npx tsc --noEmit --moduleResolution bundler` exits 0.
- `play` is built with Vite 5 and TypeScript 5.7, so Bundler resolution matches the actual application toolchain.

## Implementation

1. Change only `play/tsconfig.json` product configuration.
2. Replace `compilerOptions.moduleResolution: "node"` with `"bundler"`.
3. Do not change `module`, runtime imports, Jazz dependencies, Jazz runtime code, GameManager, Matrix fallback, or UI.
4. Preserve formatting and all unrelated compiler options.

## Falsifier

If the checked-in `moduleResolution: "bundler"` causes any normal `play` typecheck error, stop BLOCKED instead of widening the task.
## Verification

Run exactly:

```bash
cd play && npm run typecheck
```

Then run a read-only runtime export probe that imports the three Jazz entrypoints and exits non-zero if any required export is absent.

Finally run `git diff --check` and verify the only product path changed is `play/tsconfig.json`.

## Rollback

Revert the single `play/tsconfig.json` change or the resulting reviewed task commit. No data migration or runtime cleanup is required.

## Annotations
<!-- [NOTE]: prefixed inline. Claude processes all and revises. -->

## Task Breakdown
- [ ] Execute captured plan: Jazz subpath TypeScript resolution
