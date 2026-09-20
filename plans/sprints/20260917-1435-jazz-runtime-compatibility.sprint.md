# Sprint: Jazz compatibility, Russian localisation, and production validation

> **Status**: Approved
> **Slug**: jazz-runtime-compatibility
> **Created**: 2026-09-17 14:35
> **Updated**: 2026-09-20 13:53
> **Source PRD**: `plans/prds/20260917-1435-jazz-runtime-compatibility.prd.md`
> **Source Spec**: `docs/spec.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental

## PRD

Complete the Jazz release canary in dependency order: compiler compatibility, first-class Russian localisation, then production-like full-stack acceptance on the target MacBook.

### Problem

- The Jazz package-boundary blocker is fixed and accepted.
- `play/src/i18n` has no `ru-RU` locale, so Russian users have no first-class localisation.
- The fork still needs a clean production-like Docker build/runtime/E2E pass on this MacBook.

### Users

- WorkAdventure maintainers continuing the existing Matrix-to-Jazz frontend migration.
- Russian-speaking users who need the complete application and chat UI in Russian.
### Success Criteria

- Accepted Jazz resolver checks remain green.
- `ru-RU` has zero missing localisation files/keys versus `en-US`, generates cleanly, and is selectable/loadable.
- The documented production-like Docker stack builds/starts on the MacBook and the production-like E2E suite plus targeted Russian/Jazz smoke checks pass.
- Product behavior and Matrix fallback are unchanged except for the added Russian presentation layer.

### Acceptance Scenarios

- Normal typecheck resolves Jazz package subpaths.
- Russian localisation covers every base module/key and preserves placeholders.
- Browser locale detection/selection can load `ru-RU`.
- Production-built application is exercised through automated E2E and targeted browser smoke for Russian + Jazz chat.

### Non-goals

- Jazz dependency upgrade or downgrade.
- Runtime/provider redesign, Matrix removal, or UX redesign unrelated to localisation.
- Treating frontend-only development mode as production acceptance.

## Architecture Notes

### Capabilities Touched

- TypeScript compile-time module resolution for the Vite/Svelte `play` package.
- Typesafe-i18n locale modules, generation, detection, and loading.
- Docker Compose production-like topology and Playwright acceptance.

### Dependency Order

- Row 1: accepted compiler boundary fix.
- Row 2: complete Russian localisation before final runtime acceptance.
- Row 3: clean production-like build/run/test of the resulting tree.

### Risks

- A wider module-resolution mode could expose unrelated type errors; normal typecheck is the fail-closed gate.
- Translation can be structurally complete but linguistically poor; semantic read-only review is required in addition to zero-diff checks.
- Docker resource/network issues can mimic product regressions; final evidence must classify environment blockers separately.
## Backlog

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 4daa2d4568af1a5dcde92ba33029691b6fcf70c69da59829539d3cbfdeacc3d0 | [x] | repair Jazz subpath TypeScript resolution | contract | `cd play && npm run typecheck` exits 0; required Jazz browser/media exports remain runtime-importable; only `play/tsconfig.json` plus task artifacts change | `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md` |
| 2 | 9485c1770980ab8f42d0e1da4e7e7f691f3b0e708a574c0a24127b7c06dee6f6 | [ ] | add complete Russian locale (`ru-RU`) | contract | `cd play && npm run i18n:diff -- ru-RU` reports 0 missing files/keys; `npm run typesafe-i18n && npm run typecheck` pass; `ru-RU` is detected/loadable; semantic review finds no unintended English fallback in translated product strings | (pending) |
| 3 | ce90b98647a611814b239216e9ce0210f628ae8b68031a8bb43c666d623e049a | [ ] | build and production-test full WorkAdventure on MacBook | contract | documented production-like Docker Compose build starts required services; `tests` production-like Playwright suite passes or any environment blocker is explicitly classified; browser smoke verifies built app, `ru-RU`, and Jazz chat normal/error paths with no blocking console/network errors | (pending) |

## Execution Log

| When | Task | Plan | Result |
|------|------|------|--------|
| 2026-09-17 14:55 | repair Jazz subpath TypeScript resolution | `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md` | done |
