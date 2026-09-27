> **Archived**: 2026-09-27 10:07
> **Related Plan**: plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260927-1007
> **Archive Projection V1**: `plans/plan-20260927-0940-harden-local-first-release-gate.md` => `plans/archive/plan-20260927-0940-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/notes/20260927-0940-harden-local-first-release-gate.notes.md` => `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/contracts/20260927-0940-harden-local-first-release-gate.contract.md` => `tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md`
> **Archive Projection V1**: `tasks/reviews/20260927-0940-harden-local-first-release-gate.review.md` => `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`

# Task Contract: harden-local-first-release-gate

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-27 09:42
> **Review File**: `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`
> **Notes File**: `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`

## Why

The published single-device release is accepted, but a read-only post-publication audit found three bounded false-negative paths in the release gate: local WebSocket provider traffic is not inventoried, container destination capture may be absent while the run passes, and the browser control treats generic fetch failure as isolation proof. Leaving these gaps would overstate what the release gate certifies.

## Goal

Harden the Local First release evidence so that:
- every browser WebSocket attempt is inventoried, including local destinations;
- any Jazz/Matrix/provider-pattern WebSocket fails regardless of locality;
- the browser control proves the Playwright isolation route intercepted and aborted the exact public control URL;
- service workers are blocked for the release browser context;
- the MacBook release gate requires a working Colima DOCKER-USER capture backend and proves the numeric container control attempt appears in captured destination evidence;
- README wording exactly matches the protocols/pathways actually enforced and explicitly excludes WebRTC/STUN/general air-gap certification;
- the archived row-5 review clearly distinguishes historical pending text from the final accepted state;
- the stale prunable baseline worktree registration is removed.

## Scope

- In scope:
  - `tests/tests/local-first-release.spec.ts`
  - `deploy/local-first/release-smoke.sh`
  - `deploy/local-first/README.md`
  - archived row-5 review wording only
  - task plan/contract/notes/review and archive closeout
  - pruning the already-prunable `/private/tmp/workadventure-baseline` registration as an untracked Git administrative action
- Out of scope:
  - product source under `play/src`, `back/src`, or other runtime implementation
  - changing Jazz sync policy or provider architecture
  - reopening the completed five-row Sprint
  - claiming browser-wide/WebRTC/STUN isolation
  - introducing host firewall/network-extension enforcement
- Taste constraints: minimal hardening; preserve existing single-device release topology and accepted product behavior.

## Stop Conditions

- Stop if product source must change to satisfy the gate.
- Stop if Colima/DOCKER-USER capture cannot be established on the target MacBook; report BLOCKED rather than silently weakening the gate.
- Stop if an Exit Criteria command cannot be run in this environment.
- Stop if Goal, Scope, or Exit Criteria become contradictory.

## Falsifier

The direction is wrong if a focused release run can still pass while (a) a local provider WebSocket is attempted, (b) the public browser control is not seen by Playwright routing, or (c) the container control attempt is absent from the recorded destination capture. Cheapest proof: inspect instrumentation logic before the full smoke, then require those assertions in the smoke.

## Workflow Inventory

- Source plan: `plans/archive/plan-20260927-0940-harden-local-first-release-gate.md`
- Deferred-goal ledger: `tasks/todos.md`
- Review file: `tasks/archive/review-20260927-1007-harden-local-first-release-gate.md`
- Notes file: `tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Scope gate: edit only Allowed Paths; update this contract before widening scope.
- Completion gate: verify-sprint --prepare-acceptance, typed AcceptanceReceipt, verify-sprint, transactional worktree finish.

## Change Assessment

```json
{"protocol":1,"oracles":[{"id":"release-tests-lint","kind":"deterministic_test","paths":["tests/tests/local-first-release.spec.ts"]},{"id":"release-script-syntax","kind":"deterministic_test","paths":["deploy/local-first/release-smoke.sh"]},{"id":"release-smoke","kind":"runtime_readback","paths":["*"]}]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths

```yaml
allowed_paths:
  - plans/archive/plan-20260927-0940-harden-local-first-release-gate.md
  - tasks/archive/contract-20260927-1007-harden-local-first-release-gate.md
  - tasks/archive/review-20260927-1007-harden-local-first-release-gate.md
  - tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md
  - tasks/todos.md
  - deploy/local-first/release-smoke.sh
  - deploy/local-first/README.md
  - tests/tests/local-first-release.spec.ts
  - tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
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
    runner_invocations: null
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
      purpose: implementation
    verifier:
      mode: read_only
      purpose: exit_criteria_review
  runner:
    preferred:
      - subagent
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)

```yaml
exit_criteria:
  files_exist:
    - deploy/local-first/release-smoke.sh
    - deploy/local-first/README.md
    - tests/tests/local-first-release.spec.ts
    - tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
  artifacts_exist:
    - tasks/archive/notes-20260927-1007-harden-local-first-release-gate.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "release-script-syntax",
      "kind": "command",
      "command": "/bin/bash -n deploy/local-first/release-smoke.sh",
      "cwd": ".",
      "phase": "preflight",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Rejects shell syntax regressions in the changed runner.",
      "inputs": { "env": [] }
    },
    {
      "id": "release-tests-lint",
      "kind": "command",
      "command": "(cd tests && ../node_modules/.bin/eslint tests/local-first-release.spec.ts --no-warn-ignored)",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Validates the changed Playwright TypeScript.",
      "inputs": { "env": [] }
    },
    {
      "id": "release-spec-list",
      "kind": "command",
      "command": "(cd tests && ../node_modules/.bin/playwright test tests/local-first-release.spec.ts --project=chromium --list)",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Parses and discovers the exact release spec without starting the stack.",
      "inputs": { "env": [] }
    },
    {
      "id": "release-smoke",
      "kind": "command",
      "command": "bash deploy/local-first/release-smoke.sh",
      "cwd": ".",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "Proves the hardened controls and product flow together on the target MacBook.",
      "inputs": { "env": [] }
    }
  ]
}
```

## Acceptance Notes (Human Review)

- Functional behavior: release/product behavior is unchanged; evidence and documentation are hardened.
- Edge cases: local provider WS, missing Colima capture, unobserved browser control, unobserved container control.
- Regression risks: overly narrow allowed local WS matcher or unavailable kernel log access should fail clearly rather than weaken proof.

## Rollback Point

- Base: `d6950b711457182972b6d6d3d337974da0de1595`
- Revert strategy: revert only the hardening publication commit; completed Sprint history remains intact.
