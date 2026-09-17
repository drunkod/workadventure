> **Archived**: 2026-09-17 14:55
> **Related Plan**: plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260917-1455
> **Archive Projection V1**: `plans/plan-20260917-1438-jazz-subpath-typescript-resolution.md` => `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/notes/20260917-1438-jazz-subpath-typescript-resolution.notes.md` => `tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/contracts/20260917-1438-jazz-subpath-typescript-resolution.contract.md` => `tasks/archive/contract-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Archive Projection V1**: `tasks/reviews/20260917-1438-jazz-subpath-typescript-resolution.review.md` => `tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md`

# Task Contract: jazz-subpath-typescript-resolution

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md
> **Task Profile**: code-change
> <!-- legal values: code-change | docs-only | ledger-closeout | migration | eval-only | delegated-run | bugfix (omit for legacy passthrough); see docs/reference-configs/sprint-contracts.md -->
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-17 14:39
> **Review File**: `tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Notes File**: `tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md`
> **Exemplar**: `docs/reference-configs/contract-brief-example.md`

## Why

The existing Jazz migration cannot return to a green `play` TypeScript baseline while TypeScript uses legacy Node module resolution. The installed Jazz runtime is present and runtime-importable, so widening the runtime implementation would add risk without addressing the proven compiler boundary.

## Goal

Change the checked-in `play` TypeScript module resolution to `bundler` so `cd play && npm run typecheck` resolves the supported `jazz-tools/browser` and `jazz-tools/media` exports and exits 0, without changing runtime behavior.

## Scope

- In scope: change `play/tsconfig.json` `compilerOptions.moduleResolution` from `node` to `bundler`; preserve all other compiler options.
- Out of scope: Jazz runtime code, dependencies, GameManager, Matrix fallback, UI, schema, media behavior, documentation redesign.
- Taste constraints: one minimal configuration change; do not refactor adjacent files.

## Stop Conditions

- Stop and hand back to the parent if the change would require editing a path outside Allowed Paths.
- Stop if an Exit Criteria command cannot be run in this environment.
- Stop if Goal, Scope, or Exit Criteria are internally contradictory.

## Falsifier

If checked-in `moduleResolution: "bundler"` causes any normal `play` typecheck error, the direction is wrong for this task. The cheapest proof is `cd play && npm run typecheck`.

## Root Cause Evidence

Required when Task Profile is `bugfix`; leave as-is otherwise.

- root_cause: one sentence naming file:line/condition (testable, not "a state issue").
- repro: the command or UI path that reproduces the symptom.
- regression_guard: path to a test that fails on the unfixed code and passes after the fix (must also appear as a `package_test` check in Verification Plan).
- pre_fix_failure_artifact: path to a captured run of regression_guard on the UNFIXED code. Capture with `bun test <regression_guard> > <artifact> 2>&1; echo "PRE_FIX_EXIT=$?" >> <artifact>` (no pipes — pipes swallow the exit status). The gate requires a non-zero `PRE_FIX_EXIT=` line plus the regression_guard path string in the artifact (see the Root Cause Evidence Gate section in docs/reference-configs/sprint-contracts.md).

## Workflow Inventory

- Source plan: `plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md`
- Deferred-goal ledger: `tasks/todos.md`
- Review file: `tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md`
- Notes file: `tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope gate: edit only paths listed under `allowed_paths`; update this contract before widening scope.
- Completion gate: run `verify-sprint --prepare-acceptance`, record one typed AcceptanceReceipt under the frozen policy below, then run `verify-sprint`; review Markdown is projection only.

## Change Assessment

```json
{"protocol":1,"oracles":[]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths

```yaml
allowed_paths:
  - play/tsconfig.json
  - plans/archive/plan-20260917-1438-jazz-subpath-typescript-resolution.md
  - tasks/archive/contract-20260917-1455-jazz-subpath-typescript-resolution.md
  - tasks/archive/review-20260917-1455-jazz-subpath-typescript-resolution.md
  - tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md
```

## Evidence Requirements

```yaml
evidence_requirements:
  # Set benchmark to required when this contract consumes the harness profile benchmark matrix.
  benchmark: not_applicable
```

## Delegation Contract

```yaml
delegation:
  budget:
    tokens: null
    runner_invocations: 1
    wall_time_minutes: 20
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent:
      mode: narrate_and_gatekeep
      purpose: approval_checkpoint_owner
    explorer:
      mode: read_only
      purpose: codebase_research
    worker:
      mode: edit_within_allowed_paths
      purpose: implementation
    verifier:
      mode: read_only
      purpose: exit_criteria_review
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
    - play/tsconfig.json
  artifacts_exist:
    - tasks/archive/notes-20260917-1455-jazz-subpath-typescript-resolution.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "play-typecheck",
      "kind": "command",
      "command": "npm run typecheck",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the checked-in compiler configuration resolves Jazz subpath declarations without new TypeScript errors.",
      "inputs": { "env": [] }
    },
    {
      "id": "jazz-runtime-exports",
      "kind": "command",
      "command": "node -e \"Promise.all([import('jazz-tools'),import('jazz-tools/browser'),import('jazz-tools/media')]).then(([a,b,c])=>{for(const [name,value] of Object.entries({co:a.co,z:a.z,Group:a.Group,CoPlainText:a.CoPlainText,JazzBrowserContextManager:b.JazzBrowserContextManager,createImage:c.createImage,loadImageBySize:c.loadImageBySize})){if(!value) throw new Error('missing '+name)}})\"",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Confirms the runtime entrypoints and exports that motivated the resolver change remain present.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)

- Functional behavior:
- Edge cases:
- Regression risks:

## Rollback Point

- Commit / checkpoint: task branch checkpoint created after verification.
- Revert strategy: revert the `play/tsconfig.json` change or the reviewed task commit; no data migration cleanup is required.
