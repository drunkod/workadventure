# Plan: Sprint task: add local-first server durability and restore tooling

> **Status**: Executing
> **Created**: 20260922-1259
> **Slug**: add-local-first-server-durability-and-restore-tooling
> **Planning Source**: repo-harness-sprint
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md#add local-first server durability and restore tooling
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: static Local First verifier + Compose resolution + shell syntax + isolated durability restore smoke + strict Repo Harness contract verification.
> **Rollback Surface**: revert only the row-4 deployment durability commit; user data is never modified by verification because smoke uses unique temporary Compose projects and fresh volumes.
> **Task Contract**: tasks/contracts/20260922-1259-add-local-first-server-durability-and-restore-tooling.contract.md
> **Task Review**: tasks/reviews/20260922-1259-add-local-first-server-durability-and-restore-tooling.review.md
> **Implementation Notes**: tasks/notes/20260922-1259-add-local-first-server-durability-and-restore-tooling.notes.md

## Goal

Add fail-closed server-side durability and maintenance backup/restore tooling to the accepted
single-device Local First deployment without changing application source, upstream Dockerfiles,
or upstream Compose assets.

## Frozen Decisions

1. Redis remains a named-volume service but must run with exactly:
   - `appendonly yes`
   - `appendfsync everysec`
   - `maxmemory-policy noeviction`
2. `everysec` is an ordinary-operation persistence policy, not a hard one-second loss guarantee
   across kernel, VM, storage, or OS failure.
3. The server backup boundary is exactly Redis `/data` plus map-storage `/maps`.
   Browser IndexedDB, browser localStorage pointers, Jazz account state, and Jazz profile identity
   are explicitly outside this backup.
4. Backup is a maintenance-window operation. It stops the complete eight-service source project,
   with all seven non-Redis services stopped first and Redis stopped last through Compose's graceful
   stop. Backup aborts unless Redis is stopped, not running, and has exit code 0 before volume copy.
5. Backup never restarts the source project automatically. A failure leaves it stopped for operator
   inspection; the README gives the explicit restart command.
6. Archives are created with the already-local `redis:6` and
   `workadventure-local-first-map-storage` images as `tar` helpers. No new helper image is pulled.
7. Every backup records under ignored `_ops/`: source revision, source project, all eight container
   image references and immutable image IDs, source volume identities, archive SHA-256 checksums,
   Redis policy, timestamp, and the maintenance procedure.
8. Restore verifies checksums before creating resources, requires an explicit destination Compose
   project different from the source project, refuses any pre-existing destination containers or
   destination Redis/map-storage volumes, and restores only into fresh project-scoped volumes.
9. Restore failure removes only the fresh partial destination project/volumes. Successful restore
   leaves the destination created/stopped; starting it is explicit.
10. The canonical smoke never touches the user's canonical project. It uses unique temporary source
    and restore project names, seeds representative state, executes backup/restore, starts the
    restored project, verifies state through application-facing reads, writes evidence under
    ignored `_ops/`, then deletes both temporary projects and volumes.
11. Representative restore assertions are:
    - map: seed a small marker `.tmj` into the source map-storage volume, then verify the restored
      marker through the map-storage HTTP static-file interface;
    - variable: save and load one persistent shared variable using the real back
      `getVariablesRepository()` API inside the production back container, then load it again
      after restore through that same repository API;
    - upload: POST a normal non-expiring object to uploader `/upload-file`, then GET the same object
      by returned ID after restore.
    Temporary audio/upload TTL data is deliberately not asserted.
12. The smoke may seed the map directly into the temporary source volume because the acceptance
    requirement is restore readback through the application interface; map-storage HTTP writes are
    independently authenticated and are not weakened or reconfigured by this row.
13. No row-5 browser, Jazz reload, ru-RU, or Internet-isolation E2E belongs in this row.

## Concrete File Changes

| File | Action | Required change |
|---|---|---|
| `deploy/local-first/compose.yml` | modify | add the exact Redis AOF/everysec/noeviction command only |
| `deploy/local-first/verify.mjs` | modify | fail closed unless the resolved Redis command and both named volume mounts match the frozen policy |
| `deploy/local-first/backup.sh` | add | maintenance-window backup with clean Redis shutdown, image/revision/checksum manifest, no auto-restart |
| `deploy/local-first/restore.sh` | add | checksum-first restore into a separate fresh Compose project; refuse overwrite |
| `deploy/local-first/durability-smoke.sh` | add | isolated temporary source→backup→fresh restore runtime proof |
| `deploy/local-first/README.md` | modify | operational backup/restore runbook, everysec caveat, browser-data exclusion |
| row-4 plan/contract/notes/review | workflow | Repo Harness authority/evidence only |

## Ordered Implementation

1. Add the exact Redis command to Compose and extend `verify.mjs` to assert it.
2. Implement `backup.sh --project NAME --output DIR` with defaults:
   canonical project `workadventure-local-first`; timestamped output below
   `_ops/local-first-backups/`.
3. Implement `restore.sh --backup DIR --project NAME`; destination project is mandatory.
4. Implement `durability-smoke.sh` with a global bounded timeout and cleanup trap installed before
   starting containers. It must use `--no-build`; row 3 already accepted the five source images.
5. Document operator commands and explicit persistence boundaries in README.
6. Run fast syntax/config/static checks, then the isolated durability smoke once.
7. Freeze exact evidence, run Luna-low read-only semantic review, record typed AcceptanceReceipt,
   and close the row only on PASS.

## Proven Interfaces From CodeGraph / Disposable Probe

- `map-storage/src/Upload/DiskFileSystem.ts` backs `/maps`; unprotected static GET is served by
  map-storage's application HTTP stack. A disposable probe confirmed a marker at
  `/maps/durability/map.tmj` is readable via
  `Host: map-storage.workadventure.localhost /durability/map.tmj`.
- `back/src/Services/Repository/RedisVariablesRepository.ts` persists shared variables with Redis
  `HSET/HGETALL`; a production-container `getVariablesRepository()` save/load probe passed.
- `uploader/src/Service/RedisStorageProvider.ts` stores normal uploads in Redis DB 1 without TTL;
  normal `POST /upload-file` then `GET /upload-file/:id` passed.
- `map-storage/src/Upload/UploadController.ts` write routes use Passport authentication. With the
  current frozen Local First auth profile an anonymous write probe correctly returned 401, so this
  row must not weaken authentication merely to seed smoke data.

## Verification

Fast:
- `bash -n deploy/local-first/backup.sh deploy/local-first/restore.sh deploy/local-first/durability-smoke.sh`
- `node deploy/local-first/verify.mjs`
- `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml config --quiet`
- `git diff --check`

Runtime:
- `bash deploy/local-first/durability-smoke.sh`

Canonical:
- `repo-harness run verify-contract --contract tasks/contracts/20260922-1259-add-local-first-server-durability-and-restore-tooling.contract.md --strict --force-expensive-rerun --reason "row4 durability/backup/restore runtime verification"`

## Long-gate Evidence

- Canonical runtime gate: `bash deploy/local-first/durability-smoke.sh`.
- Repo Harness authority: the contract's `local-first-durability-restore-smoke` check, marked
  `expensive` and `current_exact`.
- Maximum worker budget is 45 minutes, but the expensive runtime gate is orchestrator-owned rather
  than delegated to Luna.
- Evidence identity must bind the final committed authority HEAD plus the normalized final subject;
  if tracked subject content changes after verification, regenerate the affected evidence.
- Runtime artifacts belong under ignored `_ops/local-first-durability/`; canonical Repo Harness
  execution evidence belongs under `.ai/harness/checks/latest.json` and `.ai/harness/runs/`.

## Verifier

- Run exactly the frozen Acceptance Policy: reviewer `Codex`, source `codex-review`.
- Configure that read-only review to use GPT-5.6 Luna with low reasoning effort, matching the Sprint
  execution policy; model/source substitution is BLOCKED.
- The reviewer inspects the final diff, contract, implementation notes, and frozen deterministic
  evidence. It does not rerun the expensive durability smoke.
- A semantic PASS is required before recording a typed AcceptanceReceipt. No user waiver is used
  unless explicitly authorized.

## Promotion Gate

- **Merge/PR unit**: row-4 Local First durability policy, backup/restore tooling, isolated smoke, and
  its runbook as one bounded deployment change.
- **Rollback surface**: revert the single accepted row-4 implementation commit; canonical user data
  is never touched by verification.
- **Verification boundary**: static verifier + Compose resolution + shell syntax + isolated
  source→backup→fresh-restore smoke + strict Repo Harness contract verification.
- **Review/acceptance boundary**: independent read-only semantic review of the final subject and
  exact frozen evidence, followed by typed AcceptanceReceipt.
- **High-risk surface**: destructive restore, dirty Redis backup, accidental canonical-volume use,
  helper-image pulls, or claims that Docker backup covers browser Jazz data.
- **Why not checklist row**: backup and restore are one atomic operational capability whose
  safety properties cannot be accepted piecemeal.

## Evidence Contract

- **State/progress path**: this plan, its contract/review/notes, and Sprint row 4.
- **Verification evidence**: current-exact static/config/syntax/runtime-smoke snapshots from the
  contract, with runtime details under ignored `_ops/local-first-durability/`.
- **Evaluator rubric**: exact Redis policy; clean Redis stop before copy; checksums before restore;
  fresh destination-only restore; no new helper image; restored map/variable/upload read through
  application-facing interfaces; explicit browser-data exclusion.
- **Stop condition**: contract Fulfilled, required semantic PASS, typed AcceptanceReceipt, final
  `verify-sprint`, and Repo Harness closeout.
- **Rollback surface**: revert row-4 publication; no migration of canonical user data is performed.

## Task Breakdown

- [ ] Add exact Redis AOF/everysec/noeviction command and verifier guard.
- [ ] Add fail-closed maintenance `backup.sh` with clean Redis shutdown and manifest/checksums.
- [ ] Add checksum-first fresh-project-only `restore.sh`.
- [ ] Add isolated `durability-smoke.sh` proving map/variable/upload restore through application interfaces.
- [ ] Document operator procedure and backup boundaries.
- [ ] Pass deterministic verification, read-only semantic acceptance, receipt, and closeout.

## Stop Conditions

- BLOCKED if satisfying the row requires application-source edits, upstream Docker/Compose edits,
  a new helper image/network pull, destructive access to canonical user volumes, or browser E2E.
- BLOCKED if Redis cannot be proven cleanly stopped before backup.
- BLOCKED if restore cannot guarantee fresh destination volumes before extraction.
- Do not start row 5 until row 4 has deterministic verification, Luna-low read-only PASS,
  AcceptanceReceipt, and Repo Harness closeout.
