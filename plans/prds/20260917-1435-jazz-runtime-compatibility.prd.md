# PRD: Jazz runtime TypeScript compatibility

> **Status**: Approved
> **Slug**: jazz-runtime-compatibility
> **Created**: 2026-09-17 14:35
> **Updated**: 2026-09-17 14:35
> **Source Spec**: `docs/spec.md`
> **Tier**: compact

## AI Quick-Read Card

- Problem: `play` typecheck cannot resolve supported `jazz-tools/browser` and `jazz-tools/media` package exports.
- Users: WorkAdventure developers continuing the existing Matrix-to-Jazz frontend migration.
- Platform: WorkAdventure `play` TypeScript/Vite/Svelte application.
- P0 surface: TypeScript module resolution only.
- Core metric: `cd play && npm run typecheck` exits 0.
- Hard constraint: do not change Jazz runtime behavior, Matrix fallback behavior, or remove Matrix code.
- Key risk: widening TypeScript resolution could reveal unrelated type errors.
- Unknowns: none after the command-line falsifier passed.
- Acceptance scenarios: normal typecheck passes; Jazz browser/media imports remain runtime-resolvable.
- Suggested next step: one contract task executed by Luna-low.
## Problem

The repository already contains Jazz configuration, runtime, room, connection, and GameManager integration. The active blocker is narrower: `play/tsconfig.json` uses legacy `moduleResolution: "node"`, which cannot resolve the conditional package exports exposed by `jazz-tools@0.20.10`.

A direct, non-mutating compiler probe with `npx tsc --noEmit --moduleResolution bundler` passed. A Node runtime import probe also confirmed the required exports are present:

- `jazz-tools/browser`: `JazzBrowserContextManager`;
- `jazz-tools/media`: `createImage`, `loadImageBySize`;
- `jazz-tools`: `co`, `z`, `Group`, `CoPlainText`.

### Product Direction

- Hard Constraints: change only TypeScript module resolution in this slice; preserve current Jazz and Matrix runtime semantics.
- Recommended Defaults: use TypeScript `bundler` resolution because `play` is Vite-bundled and the probe is green.
- Freedoms: formatting/comment wording only if needed.

### Feasibility Boundary

- Confirmed: the installed Jazz subpath exports exist at runtime.
- Confirmed: the current typecheck fails only on the two Jazz subpath resolutions.
- Confirmed: overriding module resolution to `bundler` makes the current typecheck pass.
## Users

### Primary Users

- WorkAdventure maintainer:
  - Need: continue the Jazz migration from a green TypeScript baseline.
  - Success signal: normal `play` typecheck resolves Jazz subpaths without overrides.

## Success Criteria

| Metric | Target | Measurement Method | Degradation Threshold |
|---|---:|---|---:|
| Play typecheck | 100% pass | `cd play && npm run typecheck` | any TS error |
| Jazz required runtime exports | 100% present | Node dynamic-import probe | any required export missing |

## Acceptance Scenarios

### Scenario 1 — normal compiler path
- Given: the existing `jazz-tools@0.20.10` dependency and Jazz runtime imports.
- When: `npm run typecheck` runs from `play`.
- Then: it exits 0 without per-command module-resolution overrides.
- Machine-checkable evidence: command exit status 0.

### Scenario 2 — runtime package contract
- Given: installed `jazz-tools@0.20.10`.
- When: Node imports the main, browser, and media entrypoints.
- Then: all required runtime exports are present.
- Machine-checkable evidence: explicit import-probe exit status 0.
### Scenario 3 — negative boundary
- Given: Matrix fallback and Jazz runtime code already exist.
- When: this slice is implemented.
- Then (must NOT): no Matrix/Jazz behavior, dependencies, runtime imports, or UI selection logic are redesigned.
- Machine-checkable evidence: changed source path is limited to `play/tsconfig.json` plus Repo Harness task artifacts.

## Non-goals

- Upgrade or downgrade `jazz-tools`.
- Rewrite `JazzRuntime`, `JazzChatConnection`, or `GameManager`.
- Remove Matrix code, configuration, or fallback.
- Add UI, rooms, media behavior, or a new provider abstraction.

## Module Behaviors (P0)

### TypeScript resolver

- Purpose: resolve package `exports` conditions used by Jazz subpaths in the Vite application.
- Hard Constraints: preserve ES2020 module output and current runtime behavior.
- Recommended Defaults: `moduleResolution: "bundler"`.
- Normal path: TypeScript resolves Jazz browser/media declarations and completes with no errors.
- Failure path: any new compiler error blocks acceptance.
- Dependencies: TypeScript 5.7.2, Vite 5.4, jazz-tools 0.20.10.
- Open decisions: None.

## Developer Handoff

- Build first: change the minimum compiler configuration required by the proven falsifier.
- Do not reinterpret: no runtime/provider refactor in this task.
- Verify with: normal play typecheck plus the Jazz export runtime probe.
