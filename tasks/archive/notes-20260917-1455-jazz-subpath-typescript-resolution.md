> **Archived**: 2026-09-17 14:55
> **Related Plan**: plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260917-1455
> **Archive Projection V1**: `plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md` => `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md` => `tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md` => `tasks/archive/contract-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md` => `tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md`

# Implementation Notes: jazz-subpath-typescript-resolution

> **Status**: Active
> **Plan**: plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md
> **Contract**: tasks/archive/contract-20260917-1455-jazz-subpath-typescript-resolution.md
> **Review**: tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md
> **Last Updated**: 2026-09-17 14:39
> **Lifecycle**: notes

## Design Decisions

- ...

## Deviations From Plan Or Spec

- `repo-harness run verify-sprint --prepare-acceptance --contract tasks/archive/contract-20260917-1455-jazz-subpath-typescript-resolution.md` could not complete because Git was denied permission to create its temporary index and stage `.ai/context/capabilities.json`; the contract verification report was therefore unavailable. The direct Verification Plan commands and `git diff --check` passed.

## Tradeoffs Considered

| Option | Decision | Reason |
|--------|----------|--------|
| ... | ... | ... |

## Open Questions

- None.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`

## Promotion Filter

Promote a candidate to `tasks/lessons.md`, `docs/researches/`, or harness asset files only when all three hold: hard to reverse, surprising without local context, and a real trade-off existed. If any one is missing, keep it in this notes file instead.

## Promotion Candidates

- Promote to `tasks/lessons.md` only after a repeated correction or failure pattern.
- Promote to `docs/researches/` only when it is durable repo knowledge with evidence.
- Promote to harness asset files only after verification across more than one task or fixture.
