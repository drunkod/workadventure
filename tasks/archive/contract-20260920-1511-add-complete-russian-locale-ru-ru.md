> **Archived**: 2026-09-20 15:11
> **Related Plan**: plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260920-1511
> **Archive Projection V1**: `plans/plan-20260920-1357-add-complete-russian-locale-ru-ru.md` => `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/notes/20260920-1357-add-complete-russian-locale-ru-ru.notes.md` => `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/contracts/20260920-1357-add-complete-russian-locale-ru-ru.contract.md` => `tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Archive Projection V1**: `tasks/reviews/20260920-1357-add-complete-russian-locale-ru-ru.review.md` => `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`

# Task Contract: add-complete-russian-locale-ru-ru

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-20 13:59
> **Review File**: `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`
> **Notes File**: `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`

## Why
Russian is absent from `play/src/i18n`, so Russian-speaking users cannot select or auto-detect a first-class locale. The next production acceptance row must validate the built application in Russian, so locale parity is a dependency, not optional polish.

## Goal
Add a complete `ru-RU` typesafe-i18n locale with every base module/key translated, preserve placeholders/semantics, prove generic browser locale `ru` maps to `ru-RU`, and keep all Jazz/Matrix/runtime behavior unchanged.

## Scope
- In scope: new `play/src/i18n/ru-RU/**` locale files; focused edits to `play/tests/front/Utils/locales.test.ts`; task workflow artifacts.
- Out of scope: `en-US` source wording, other locales, generated i18n artifacts, runtime locale-selection implementation, Jazz/Matrix/provider code, UI layout/components.
- Taste constraints: idiomatic concise Russian UI wording; retain established brands/protocol names; preserve every interpolation placeholder exactly.

## Stop Conditions
- Stop if any required source key cannot be represented without changing runtime/base locale code.
- Stop if a required placeholder would need renaming/removal.
- Stop if verification requires a tracked product edit outside Allowed Paths.
- Stop if any Verification Plan command cannot run after restoring normal ignored dependencies/generated artifacts in the isolated worktree.

## Falsifier
The direction is wrong if a complete `ru-RU` overlay cannot make `npm run i18n:diff -- ru-RU` report zero missing files/keys while normal typesafe generation and typecheck stay green.

## Root Cause Evidence
Not applicable: this is a localisation feature slice, not a bugfix profile.

## Workflow Inventory
- Source plan: `plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md`
- Deferred-goal ledger: `tasks/todos.md`
- Review file: `tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md`
- Notes file: `tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope gate: edit only paths listed under `allowed_paths`.
- Completion gate: prepare exact verification evidence, record typed AcceptanceReceipt, then final verify-sprint.

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
  - play/src/i18n/ru-RU/
  - play/tests/front/Utils/locales.test.ts
  - plans/archive/plan-20260920-1357-add-complete-russian-locale-ru-ru.md
  - tasks/archive/contract-20260920-1511-add-complete-russian-locale-ru-ru.md
  - tasks/archive/review-20260920-1511-add-complete-russian-locale-ru-ru.md
  - tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md
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
    runner_invocations: 12
    wall_time_minutes: 90
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
      purpose: complete Russian translation implementation
    verifier:
      mode: read_only
      purpose: structural and semantic acceptance review
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
    - play/src/i18n/ru-RU/index.ts
    - play/src/i18n/ru-RU/chat.ts
    - play/src/i18n/ru-RU/menu.ts
  artifacts_exist:
    - tasks/archive/notes-20260920-1511-add-complete-russian-locale-ru-ru.md
```

## Verification Plan
```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "russian-locale-parity",
      "kind": "command",
      "command": "npm run i18n:diff -- ru-RU",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves ru-RU has no missing source locale modules or keys.",
      "inputs": { "env": [] }
    },
    {
      "id": "typesafe-i18n-generate",
      "kind": "command",
      "command": "npm run typesafe-i18n",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves typesafe-i18n accepts and discovers ru-RU.",
      "inputs": { "env": [] }
    },
    {
      "id": "play-typecheck",
      "kind": "command",
      "command": "npm run typecheck",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves locale modules and generated locale types compile in the normal play configuration.",
      "inputs": { "env": [] }
    },
    {
      "id": "russian-locale-detector-test",
      "kind": "command",
      "command": "npx vitest run tests/front/Utils/locales.test.ts",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves locale detector behavior including the new generic Russian mapping regression.",
      "inputs": { "env": [] }
    },
    {
      "id": "generated-russian-locale",
      "kind": "command",
      "command": "rg -q 'ru-RU' src/i18n/i18n-util.ts src/i18n/i18n-util.async.ts",
      "cwd": "play",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Confirms generated locale discovery and async loader contain ru-RU.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)
- Functional behavior: `ru-RU` is structurally complete and loadable.
- Edge cases: placeholders, proper nouns/brands, Russian grammar, generic `ru` browser locale.
- Regression risks: accidental English fallback despite structural merge; runtime changes are forbidden by scope.

## Rollback Point
- Commit / checkpoint: task branch implementation commit after verification.
- Revert strategy: revert the `ru-RU` locale/test commit and regenerate ignored i18n artifacts.
