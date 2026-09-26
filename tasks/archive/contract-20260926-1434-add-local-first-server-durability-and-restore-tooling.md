> **Archived**: 2026-09-26 14:34
> **Related Plan**: plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
> **Outcome**: Completed
> **Lifecycle**: contract
> **Parent Run ID**: run-20260926-1434
> **Archive Projection V1**: `plans/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md` => `plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/notes/20260922-1259-add-local-first-server-durability-and-restore-tooling.notes.md` => `tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/contracts/20260922-1259-add-local-first-server-durability-and-restore-tooling.contract.md` => `tasks/archive/contract-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/reviews/20260922-1259-add-local-first-server-durability-and-restore-tooling.review.md` => `tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`

# Task Contract: add-local-first-server-durability-and-restore-tooling

> **Status**: Fulfilled
> **Plan**: plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
> **Task Profile**: code-change
> **Owner**: test
> **Capability ID**: root
> **Last Updated**: 2026-09-22 13:11
> **Review File**: `tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
> **Notes File**: `tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`

## Why

Row 3 proves the Local First server stack can build and run, but named volumes alone do not define
safe persistence, backup, or restore behavior. Row 4 makes Redis durability explicit and provides a
fail-closed maintenance procedure that can be mechanically restored without risking active user data.

## Goal

Ship exact Redis AOF/everysec/noeviction policy plus bounded maintenance backup/restore scripts and
an isolated restore smoke proving representative map, persistent variable, and normal uploader data
survive a fresh-volume restore through application-facing reads.

## Scope

- In scope:
  - exact Redis durability command in the fork-owned Local First Compose file;
  - static verifier drift guard for Redis command + existing named volume mounts;
  - maintenance-window server backup and fresh-project restore scripts;
  - ignored `_ops/` manifest/checksum/runtime evidence;
  - isolated source→backup→restore smoke using already-built row-3 images;
  - README procedure, limitations, and browser-data exclusion.
- Out of scope:
  - application source, upstream Dockerfiles, upstream Compose;
  - browser IndexedDB/localStorage/Jazz identity backup;
  - online/distributed snapshots, incremental backups, S3, cloud backup;
  - temporary/expired uploader/audio data guarantees;
  - row-5 browser/ru-RU/Jazz/network-isolation E2E.
- Taste constraints: one narrowly-owned deployment workflow; fail closed on overwrite ambiguity;
  no silent restart, no silent partial restore, no new image dependency.

## Stop Conditions

- Stop if any application/upstream path outside Allowed Paths is needed.
- Stop if backup cannot establish Redis stopped with exit code 0 before volume copy.
- Stop if a restore target already has containers or Redis/map-storage volumes.
- Stop rather than touching the canonical project during the canonical smoke.
- Stop if an Exit Criteria command cannot run in this environment.

## Falsifier

The direction is wrong if the isolated smoke cannot read all three restored markers through the real
map-storage HTTP, back variable repository, and uploader HTTP interfaces after a fresh-volume restore.

## Workflow Inventory

- Source plan: `plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md`
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`
- Review file: `tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
- Notes file: `tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
- Checks file: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Runtime evidence: ignored `_ops/local-first-durability/`
- Scope gate: only Allowed Paths may become Git subject changes.

## Change Assessment

```json
{"protocol":1,"oracles":[{"id":"local-first-durability-verifier","kind":"deterministic_test","paths":["*"]},{"id":"local-first-durability-restore-smoke","kind":"runtime_readback","paths":["*"]}]}
```

## Acceptance Policy

```json
{"protocol":2,"reviewer":"Codex","source":"codex-review","user_waiver":"allowed"}
```

## Allowed Paths

```yaml
allowed_paths:
  - deploy/local-first/compose.yml
  - deploy/local-first/README.md
  - deploy/local-first/verify.mjs
  - deploy/local-first/backup.sh
  - deploy/local-first/restore.sh
  - deploy/local-first/durability-smoke.sh
  - plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
  - tasks/archive/contract-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
  - tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
  - tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
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
    wall_time_minutes: 45
  permission_scope:
    mode: inherit_allowed_paths
    writable_paths: []
    network: inherited
  roles:
    parent: { mode: narrate_and_gatekeep, purpose: freeze durability semantics and own acceptance }
    explorer: { mode: read_only, purpose: CodeGraph interface mapping already frozen }
    worker: { mode: edit_within_allowed_paths, purpose: mechanical durability and restore tooling }
    verifier: { mode: read_only, purpose: exact policy and restore-evidence review }
  runner:
    preferred: [codex]
    fallback: null
    brief_is_authoritative: true
```

## Exit Criteria (Machine Verifiable)

```yaml
exit_criteria:
  files_exist:
    - deploy/local-first/compose.yml
    - deploy/local-first/README.md
    - deploy/local-first/verify.mjs
    - deploy/local-first/backup.sh
    - deploy/local-first/restore.sh
    - deploy/local-first/durability-smoke.sh
  artifacts_exist:
    - tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
```

## Verification Plan

```json
{
  "protocol": 1,
  "checks": [
    {
      "id": "local-first-durability-verifier",
      "kind": "command",
      "command": "node deploy/local-first/verify.mjs",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Fails closed unless the accepted topology remains intact and Redis resolves to appendonly yes, appendfsync everysec, maxmemory-policy noeviction with named /data and /maps volumes.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-durability-compose-config",
      "kind": "command",
      "command": "docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Proves the modified fork-owned Compose file remains independently resolvable.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-durability-script-syntax",
      "kind": "command",
      "command": "bash -n deploy/local-first/backup.sh deploy/local-first/restore.sh deploy/local-first/durability-smoke.sh",
      "cwd": ".",
      "phase": "verification",
      "cost": "normal",
      "evidence_policy": "current_exact",
      "necessity": "Rejects malformed maintenance scripts before any runtime operation.",
      "inputs": { "env": [] }
    },
    {
      "id": "local-first-durability-restore-smoke",
      "kind": "command",
      "command": "bash deploy/local-first/durability-smoke.sh",
      "cwd": ".",
      "phase": "verification",
      "cost": "expensive",
      "evidence_policy": "current_exact",
      "necessity": "Creates isolated temporary source and restore Compose projects, proves clean-stop backup plus checksum-verified fresh-volume restore, and reads map, persistent variable, and normal uploader data through application-facing interfaces.",
      "inputs": { "env": [] }
    }
  ]
}
```

This is the sole executable verification authority. Runtime artifacts under ignored `_ops/` are
evidence, not Git subject changes.

## Acceptance Notes (Human Review)

- Functional behavior: verify clean maintenance shutdown, immutable evidence manifest, overwrite
  refusal, fresh-volume restore, and three restored application reads.
- Edge cases: any pre-existing destination resource, checksum mismatch, dirty Redis shutdown, missing
  source container/volume, or runtime timeout must fail non-zero.
- Regression risks: Compose Redis command drift, destructive restore, helper-image pull, hidden browser
  backup implication, or row-5 scope creep.

## Rollback Point

- Checkpoint: row-4 authority commit before the isolated worktree starts.
- Revert strategy: revert the single accepted row-4 implementation commit; no canonical user data is
  touched by verification.
