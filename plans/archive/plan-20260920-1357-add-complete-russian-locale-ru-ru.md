> **Archived**: 2026-09-20 15:11
> **Related Plan**: plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
> **Outcome**: Completed
> **Lifecycle**: plan
> **Parent Run ID**: run-20260920-1511
> **Archive Projection V1**: `plans/plan-20260920-1357-add-complete-russian-locale-ru-ru.md` => `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/notes/20260920-1357-add-complete-russian-locale-ru-ru.notes.md` => `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/contracts/20260920-1357-add-complete-russian-locale-ru-ru.contract.md` => `tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/reviews/20260920-1357-add-complete-russian-locale-ru-ru.review.md` => `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`

# Plan: Add complete Russian locale (`ru-RU`)

> **Status**: Archived
> **Created**: 20260920-1357
> **Slug**: add-complete-russian-locale-ru-ru
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260917-1435-jazz-runtime-compatibility.sprint.md#add complete Russian locale (`ru-RU`)
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: zero i18n diff, typesafe generation, play typecheck, focused locale detector test, semantic translation review
> **Rollback Surface**: revert the reviewed `ru-RU` locale/test task commit
> **Spec**: `docs/spec.md`
> **Research**: `docs/others/contributing/how-to-translate.md`
> **Task Contract**: `tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Task Review**: `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Implementation Notes**: `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`

## Agentic Routing
- Selected route: mechanical implementation after frozen planner decision.
- Routing reason: locale architecture and acceptance commands are already established; the worker must translate, not redesign.
- Source ref: Sprint row 2.

## Workflow Inventory
- Active plan: `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`
- Contract: `tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md`
- Review: `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`
- Notes: `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`
- Scope authority: contract `allowed_paths`.
- Execution isolation: one contract worktree on `codex/add-complete-russian-locale-ru-ru`.

## Approach

### Strategy
Create a first-class `ru-RU` locale using the same overlay pattern as existing non-base locales. Translate every source module/key present in `en-US` so the diff tool reports no fallback gaps. Add one focused detector test proving generic browser locale `ru` maps to `ru-RU` after generated locale discovery.

### File Changes
- Add `play/src/i18n/ru-RU/index.ts` mirroring the complete module import/merge structure used by mature locales.
- Add one `ru-RU/<module>.ts` for every `play/src/i18n/en-US/<module>.ts` except `index.ts`.
- Update only `play/tests/front/Utils/locales.test.ts` for focused Russian detection coverage.
- Do not commit generated `play/src/i18n/i18n-*.ts` files; they are derived/ignored.

### Translation Rules
- Use idiomatic Russian appropriate for application UI; avoid word-for-word English syntax when unnatural.
- Preserve interpolation placeholders exactly, including names and braces such as `{userName}`, `{roomId}`, `{number}`, `{folderName}`.
- Preserve URLs, identifiers, keyboard tokens, product/brand names, and protocol names where translation would be incorrect: WorkAdventure/WA, Discord, YouTube, Google Docs/Slides/Sheets/Drive, Excalidraw, Tldraw, Klaxoon, Jitsi, SSO, Matrix, Jazz, LiveKit, OIDC, URL, ID.
- Translate ordinary role/status/action words and explanatory text.
- Preserve object keys and module exports exactly; translate string values only.
- `randomNames.template` may use Russian-natural ordering but must preserve both `{adjective}` and `{name}` placeholders.
- No provider/runtime/UI behavior changes.

### Falsifier
If the completed locale cannot achieve zero missing files/keys with `npm run i18n:diff -- ru-RU` without changing base locale/runtime logic, stop BLOCKED rather than widening scope.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Structural omission hidden by base fallback | Medium | High | Require zero `i18n:diff` missing files/keys |
| Placeholder damaged in translation | Medium | High | Diff/type generation plus semantic review |
| Russian wording is literal/awkward | Medium | Medium | Read-only semantic review over the complete locale diff |
| Worker edits runtime code | Low | High | Allowed-path gate excludes runtime code |

## Verification
Run in this order from the task worktree:
1. `cd play && npm run i18n:diff -- ru-RU`
2. `cd play && npm run typesafe-i18n`
3. `cd play && npm run typecheck`
4. `cd play && npx vitest run tests/front/Utils/locales.test.ts`
5. `cd play && rg -q 'ru-RU' src/i18n/i18n-util.ts src/i18n/i18n-util.async.ts`
6. `git diff --check`
7. semantic read-only review of Russian wording, placeholder preservation, and unintended English carry-over.

## Promotion Gate

- **Merge/PR unit**: complete `ru-RU` locale plus one focused detector test.
- **Rollback surface**: revert the reviewed task commit; generated i18n files can be regenerated.
- **Verification boundary**: zero i18n diff, typesafe generation, normal play typecheck, focused locale detector test, generated locale presence, and semantic read-only review.
- **Review/acceptance boundary**: `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md` must project a typed semantic PASS bound to the frozen verification subject.
- **High-risk surface**: translation correctness only; runtime/provider behavior is explicitly out of scope.
- **Why not checklist row**: this creates a complete user-visible locale surface across many files and needs an isolated verification/review boundary.

## Evidence Contract

- **State/progress path**: `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`, its task contract/review/notes, and the Sprint row 2 status.
- **Verification evidence**: Repo Harness run snapshot for the five executable checks plus `git diff --check`.
- **Evaluator rubric**: zero missing files/keys, generated locale present/loadable, typecheck/test green, semantic reviewer PASS for Russian wording/placeholder preservation.
- **Stop condition**: all task breakdown items complete, contract fulfilled, typed AcceptanceReceipt recorded, and final sprint verification passes.
- **Rollback surface**: revert the reviewed task commit; remove/regenerate ignored generated i18n artifacts as needed.

## Task Breakdown
- [ ] Add complete `ru-RU` locale module set matching `en-US`.
- [ ] Add focused generic `ru` → `ru-RU` locale detector coverage.
- [ ] Run the frozen verification plan.
- [ ] Pass read-only semantic translation review and Repo Harness acceptance.
