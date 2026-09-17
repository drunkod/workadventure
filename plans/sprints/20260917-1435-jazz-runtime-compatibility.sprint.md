# Sprint: Jazz runtime TypeScript compatibility

> **Status**: Approved
> **Slug**: jazz-runtime-compatibility
> **Created**: 2026-09-17 14:35
> **Updated**: 2026-09-17 14:35
> **Source PRD**: `plans/prds/20260917-1435-jazz-runtime-compatibility.prd.md`
> **Source Spec**: `docs/spec.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental

## PRD

Repair the current TypeScript/Jazz package-boundary blocker without changing chat behavior.

### Problem

- `play/tsconfig.json` uses legacy Node module resolution.
- `jazz-tools@0.20.10` exposes `./browser` and `./media` through package `exports`.
- Normal `npm run typecheck` fails on those two imports even though runtime imports succeed.

### Users

- WorkAdventure maintainers continuing the existing Matrix-to-Jazz frontend migration.
### Success Criteria

- `cd play && npm run typecheck` exits 0 using checked-in config.
- Node runtime import probe confirms `JazzBrowserContextManager`, `createImage`, and `loadImageBySize` exist.
- Product behavior and Matrix fallback are unchanged.

### Acceptance Scenarios

- Normal typecheck resolves Jazz package subpaths.
- Runtime package export probe remains green.
- No files outside the compiler config and task workflow artifacts change.

### Non-goals

- Jazz dependency upgrade or downgrade.
- Runtime refactor, UI changes, Matrix removal, or provider redesign.

## Architecture Notes

### Capabilities Touched

- TypeScript compile-time module resolution for the Vite/Svelte `play` package.

### Dependency Order

- Fix this compiler boundary before further Jazz runtime/UI work.

### Risks

- A wider module-resolution mode could expose unrelated type errors; normal typecheck is the fail-closed gate.
## Backlog

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 4daa2d4568af1a5dcde92ba33029691b6fcf70c69da59829539d3cbfdeacc3d0 | [ ] | repair Jazz subpath TypeScript resolution | contract | `cd play && npm run typecheck` exits 0; required Jazz browser/media exports remain runtime-importable; only `play/tsconfig.json` plus task artifacts change | (pending) |

## Execution Log

| When | Task | Plan | Result |
|------|------|------|--------|
