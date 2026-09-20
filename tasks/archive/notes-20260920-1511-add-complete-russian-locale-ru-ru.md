> **Archived**: 2026-09-20 15:11
> **Related Plan**: plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260920-1511
> **Archive Projection V1**: `plans/plan-20260920-1357-add-complete-russian-locale-ru-ru.md` => `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/notes/20260920-1357-add-complete-russian-locale-ru-ru.notes.md` => `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/contracts/20260920-1357-add-complete-russian-locale-ru-ru.contract.md` => `tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/reviews/20260920-1357-add-complete-russian-locale-ru-ru.review.md` => `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`

# Implementation Notes: add-complete-russian-locale-ru-ru

> **Status**: Active
> **Plan**: plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
> **Contract**: tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md
> **Review**: tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md
> **Last Updated**: 2026-09-20 13:59
> **Lifecycle**: notes

## Design Decisions

- First whole-locale Luna-low pass created the full 29-file ru-RU structure and detector coverage; all structural verification checks passed, but semantic review correctly rejected it because all translated modules still contained the English source values.

## Deviations From Plan Or Spec

- Execution batching only: keep the same frozen scope/acceptance, but split translation across disjoint locale-file batches because the one-pass locale exceeded the useful context budget for Luna-low. No product scope is widened.

## Tradeoffs Considered

| Option | Decision | Reason |
|--------|----------|--------|
| One whole-locale Luna invocation vs smaller disjoint batches | Use smaller Luna-low batches | Keeps the cheap mechanical model while giving each translation slice enough context to produce actual Russian instead of structural English copies. |

## Open Questions

- None.

- A single-file Luna-low pass on mapEditor.ts translated only the opening section before failing closed. The remaining translation is split by object sections; scope and acceptance remain unchanged.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`

## Promotion Filter

Promote a candidate to `tasks/lessons.md`, `docs/researches/`, or harness asset files only when all three hold: hard to reverse, surprising without local context, and a real trade-off existed. If any one is missing, keep it in this notes file instead.

## Promotion Candidates

- Promote to `tasks/lessons.md` only after a repeated correction or failure pattern.
- Promote to `docs/researches/` only when it is durable repo knowledge with evidence.
- Promote to harness asset files only after verification across more than one task or fixture.
