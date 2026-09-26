> **Archived**: 2026-09-26 19:14
> **Related Plan**: plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260926-1914
> **Archive Projection V1**: `plans/plan-20260926-1643-fix-production-runtime-script-rendering.md` => `plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/notes/20260926-1643-fix-production-runtime-script-rendering.notes.md` => `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1643-fix-production-runtime-script-rendering.contract.md` => `tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1643-fix-production-runtime-script-rendering.review.md` => `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`

# Task Contract: fix-production-runtime-script-rendering

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
> **Task Profile**: bugfix
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-26 17:24
> **Review File**: `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`
> **Notes File**: `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`

## Why

Row 5's clean production release run reached the built Local First origin with HTTP 200 but Chromium could not render the anonymous login UI because Mustache substituted the quote-bearing runtime script into an executable JavaScript string literal in `play/index.html`. Row 5 correctly stopped because product source is outside its release-harness contract.

## Goal

Make the production runtime-script loader substitution-safe without changing runtime payload semantics: rendered production HTML must parse and execute the injected `window.env` script, while an unrendered/static template must continue to treat the raw runtime-script placeholder as a no-op.

## Scope

- In scope: `play/index.html`; one focused Vitest regression under `play/tests/pusher/`; this repair's workflow/evidence files.
- Out of scope: `FrontController.getScript()` payload semantics, Local First release harness files, deployment topology, Jazz behavior, other product cleanup.
- Taste constraints: minimal sentinel-only repair; no new runtime dependency; no widening of bootstrap behavior.

## Stop Conditions

- Stop if the repair requires changing runtime environment values or `FrontController.getScript()`.
- Stop if the focused regression cannot fail on the unfixed template and pass on the fix.
- Stop rather than modifying row-5 release-harness files or unrelated product code.
## Falsifier

The chosen sentinel repair is wrong if a quote-bearing production payload still makes any executable inline script fail to compile, if the payload no longer executes, or if the raw unrendered `{{{ script }}}` value reaches `new Function`.

## Root Cause Evidence

- root_cause: `play/index.html` runtime loader compares `runtimeScript` to the literal Mustache token inside executable JavaScript; production Mustache substitution replaces that token with quote-bearing `window.env` source and produces invalid JavaScript.
- repro: row-5 release run `_ops/local-first-release/20260926T113642Z-1801/` loads `http://play.workadventure.localhost/` and Chromium reports `SyntaxError: Unexpected identifier 'DEBUG_MODE'` before `loginSceneNameInput` appears.
- regression_guard: play/tests/pusher/FrontControllerRuntimeScript.test.ts
- pre_fix_failure_artifact: tasks/evidence/20260926-1643-fix-production-runtime-script-rendering-pre-fix.log

## Workflow Inventory

- Source plan: `plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md`
- Blocked parent: row 5 `production-test single-device local-first release on MacBook`
- Review file: `tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md`
- Notes file: `tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope gate: only Allowed Paths may become tracked subject changes.
- Completion gate: deterministic verification, independent semantic acceptance, typed AcceptanceReceipt, then transactional local integration.

## Change Assessment

```json
{"protocol":1,"oracles":[{"id":"runtime-script-template-regression","kind":"deterministic_test","paths":["play/index.html","play/tests/pusher/FrontControllerRuntimeScript.test.ts"]}]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```
## Allowed Paths

```yaml
allowed_paths:
  - play/index.html
  - play/tests/pusher/FrontControllerRuntimeScript.test.ts
  - plans/archive/plan-20260926-1643-fix-production-runtime-script-rendering.md
  - tasks/archive/contract-20260926-1914-fix-production-runtime-script-rendering.md
  - tasks/archive/review-20260926-1914-fix-production-runtime-script-rendering.md
  - tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md
  - tasks/evidence/20260926-1643-fix-production-runtime-script-rendering-pre-fix.log
  - tasks/todos.md
```

## Evidence Requirements

```yaml
evidence_requirements:
  benchmark: not_applicable
```

## Delegation Contract

```yaml
delegation:
  budget:
    tokens: null
    runner_invocations: 1
    wall_time_minutes: 30
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent:
      mode: narrate_and_gatekeep
      purpose: preserve row-5 boundary and own integration
    explorer:
      mode: read_only
      purpose: CodeGraph root-cause confirmation
    worker:
      mode: edit_within_allowed_paths
      purpose: mechanical sentinel repair and regression
    verifier:
      mode: read_only
      purpose: exact final-diff semantic review
  runner:
    preferred:
      - codex
    fallback: null
    brief_is_authoritative: true
```
## Exit Criteria (Machine Verifiable)

```yaml
exit_criteria:
  files_exist:
    - play/index.html
    - play/tests/pusher/FrontControllerRuntimeScript.test.ts
  artifacts_exist:
    - tasks/evidence/20260926-1643-fix-production-runtime-script-rendering-pre-fix.log
    - tasks/archive/notes-20260926-1914-fix-production-runtime-script-rendering.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "runtime-script-template-regression",
      "kind": "package_test",
      "path": "play/tests/pusher/FrontControllerRuntimeScript.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Reproduces the production Mustache quote-substitution parse failure, proves the injected payload executes, and preserves the raw-template no-op sentinel.",
      "inputs": { "env": [] }
    },
    {
      "id": "runtime-script-focused-vitest",
      "kind": "command",
      "command": "npm --prefix play test -- --run tests/pusher/FrontControllerRuntimeScript.test.ts",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Runs the focused regression in the repository's Play Vitest configuration.",
      "inputs": { "env": [] }
    },
    {
      "id": "diff-check",
      "kind": "command",
      "command": "git diff --check",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Rejects malformed patch whitespace before acceptance.",
      "inputs": { "env": [] }
    }
  ]
}
```
This is the sole executable verification authority for the repair. The blocked row-5 production release gate is rerun only after this repair is integrated into the target branch.

## Acceptance Notes (Human Review)

- Functional behavior: quote-bearing production runtime config renders as valid HTML/JavaScript and executes.
- Edge cases: raw/unrendered template placeholder is recognized without being embedded contiguously in Mustache-rendered executable source.
- Regression risks: bootstrap loader silently skips valid config or executes raw template syntax.

## Rollback Point

- Checkpoint: target `d/local_jazz_chat` at repair worktree base.
- Revert strategy: revert the single repair publication commit; no data or deployment migration is involved.
