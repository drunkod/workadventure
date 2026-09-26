> **Archived**: 2026-09-26 14:34
> **Related Plan**: plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260926-1434
> **Archive Projection V1**: `plans/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md` => `plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/notes/20260922-1259-add-local-first-server-durability-and-restore-tooling.notes.md` => `tasks/archive/notes-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/contracts/20260922-1259-add-local-first-server-durability-and-restore-tooling.contract.md` => `tasks/archive/contract-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
> **Archive Projection V1**: `tasks/reviews/20260922-1259-add-local-first-server-durability-and-restore-tooling.review.md` => `tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`

# Implementation Notes: add-local-first-server-durability-and-restore-tooling

> **Status**: Active
> **Plan**: plans/archive/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
> **Contract**: tasks/archive/contract-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
> **Review**: tasks/archive/review-20260926-1434-add-local-first-server-durability-and-restore-tooling.md
> **Last Updated**: 2026-09-22 18:55
> **Lifecycle**: notes

## Design Decisions

- Redis policy is frozen to AOF + `everysec` + `noeviction`; `everysec` is not documented as a
  hard one-second loss bound.
- Backup is a fail-closed maintenance snapshot: all source containers stop, Redis stops last and must
  exit cleanly before copy, and the source is not silently restarted.
- Restore is checksum-first and fresh-project-only; pre-existing destination containers/volumes abort.
- Existing local Redis/map-storage images provide `tar`; no new helper image/network pull is allowed.
- Canonical runtime smoke uses unique temporary Compose projects and deletes only those projects.
- Restored map data is read over map-storage HTTP, variable data through back's real
  `getVariablesRepository()`, and normal uploader data through uploader HTTP.
- Browser IndexedDB/localStorage/Jazz identity remain outside Docker backup.

## CodeGraph / Probe Evidence

- CodeGraph: `RedisVariablesRepository` persists shared variables via Redis `HSET/HGETALL`.
- CodeGraph: uploader `RedisStorageProvider.upload()` stores normal uploads without TTL in Redis DB 1.
- CodeGraph: map-storage `DiskFileSystem` serves `/maps` content through its HTTP stack.
- Disposable source projects proved map HTTP readback, variable repository save/load, and uploader
  POST/GET. An anonymous map-storage HTTP write returned 401, confirming row 4 must not weaken auth.

## Deviations From Plan Or Spec

- The durability smoke now seeds and reads a shared variable through the production back
  `getVariablesRepository()` API, and uploads/reads a normal object through uploader HTTP before
  backup and after fresh restore. It uses the existing back `tsx` runtime and curl multipart
  requests; no helper image or application change was added.
- Focused checks after this implementation passed: `bash -n` for all durability scripts, the static
  verifier, Compose config resolution, and `git diff --check`.
- The earlier canonical `repo-harness run verify-sprint --prepare-acceptance --contract
  tasks/archive/contract-20260926-1434-add-local-first-server-durability-and-restore-tooling.md`
  reached contract checks but failed staging `.ai/context/capabilities.json` with `Operation not
  permitted`; no canonical runtime acceptance is claimed here.
- Bounded review corrections applied: Compose invocations now use quoted arrays without `eval`, all
  helper runs use `--pull=never`, backup requires all eight source containers and records image refs
  and immutable IDs plus source/project, volumes, policy, UTC time, procedure, and checksums. Restore
  reads the manifest source project, verifies checksums before creation, refuses source-name reuse,
  preserves successful stopped containers, and cleans only failed fresh resources. Smoke cleanup uses
  the env-file arguments, has a watchdog and route readiness gates, and reports map/variable/uploader
  readback together.
- Direct runtime evidence: `bash deploy/local-first/durability-smoke.sh` completed successfully in
  50.90s with exit 0, using source project `local-first-durability-source-10138` and restore project
  `local-first-durability-restore-10138`. Results were `map=PASS`, `variable=PASS`, and
  `uploader=PASS`; both archives passed `SHA256SUMS` verification. The manifest captured source
  revision `3a12c49dcd5c61f1d576937fe2b9c99273bae782`, eight image references and immutable IDs,
  volume IDs, the Redis policy, UTC timestamp, and maintenance procedure. Temporary source/restore
  containers and volumes were removed after the smoke.
- Runtime defects repaired before this pass: `tsx -e` required an async IIFE under CJS, and an
  explicit `process.exit(0)` was then required because the Redis client kept an open handle.
- This is direct smoke evidence only; canonical Repo Harness acceptance has not yet been claimed.
- The first canonical 13/13 execution required manual termination of an orphaned watchdog sleep to
  publish completion; it remains historical recovery context and was superseded by the clean run
  below.
- Final canonical `verify-contract` completed 13/13 PASS with status `Fulfilled` in 67.07s after the
  reaped Node watchdog fix, with no manual process intervention and no temporary durability Docker
  resources remaining. This records verification evidence only; semantic acceptance and an
  `AcceptanceReceipt` have not yet been claimed.
- The first frozen `Codex` / `codex-review` semantic review of subject
  `sha256:37f7174321ca88e054a70e07b403768a1395ca63894786eb1ec71991bec54030` returned one P1 and
  three P2 findings: restore used `.env.example` instead of the source installation env; backup
  output reservation was racy; restore destination checks were racy; and the smoke could probe
  back/Redis before readiness.
- Review repairs stay inside the frozen deployment scope: backup/restore now accept `--env-file`,
  backup records the normalized source env-file path without its contents, backup output creation
  is an atomic `mkdir`, restore holds a host-global atomic project claim while inspecting/creating
  fresh resources, signal failure cleans partial restore state, and smoke waits for Redis `PONG`
  plus back `/ping` before variable probes on source and restored projects.
- The next read-only Codex review wrapper returned an empty parsed finding list, but its raw transcript
  contained a P1: the unprivileged `redis:6` helper could fail to create archives inside a host-owned
  backup directory on Linux. Acceptance was therefore not recorded. The backup now streams tar to
  stdout and lets the host shell create both archive files, eliminating helper-container write access
  to the backup directory.
- The second frozen review targeted revised subject
  `sha256:6b17a4f29486c12259e2f9faf604adbfeabdc345a46345027a9de16a6735058a`. Its raw transcript
  reported one P1 and two P2 findings even though the cross-review wrapper failed to project them
  into its structured `findings` array and incorrectly printed a PASS recommendation. No acceptance
  was recorded from that inconsistent wrapper result.
- Those raw findings were repaired fail-closed: smoke project names now include UTC time + PID and
  are rejected before the cleanup trap if any matching containers or volumes already exist; smoke
  teardown returns non-zero if either project cannot be fully removed; restore verifies partial
  cleanup and retains its host-global project claim when cleanup cannot be proven complete.
- The third frozen review targeted subject
  `sha256:8b8b70fc0cebef3a97f46243bf653209241088d5584aaa82c2bc07afbad8ede9` and rejected it with
  three P1s plus one P2: Bash-4 associative arrays are incompatible with stock macOS Bash 3.2;
  GNU `sha256sum` is not stock macOS tooling; checksum verification did not require both expected
  archives; and blanket `down -v` cleanup could race with external Docker/Compose creation.
- Those findings are repaired without widening scope: backup now uses Bash-3.2-compatible indexed
  arrays; backup/restore select `sha256sum` or macOS `shasum -a 256`; restore requires the checksum
  manifest to contain exactly the Redis and map-storage archives; and restore injects a unique
  ownership label into all destination services, volumes, and the default network, verifies that
  ownership after `create`, and cleans only resources carrying that token. `/bin/bash 3.2.57 -n`,
  normal `bash -n`, static verification, Compose config, diff check, and strict workflow all pass.
- The next corrected review passed with one P2 advisory: the README restart sequence would run the
  source and restored Compose projects simultaneously even though both Traefik services publish
  `127.0.0.1:80`. The runbook now keeps the source stopped while the restored project is validated,
  then stops the restored project before explicitly restarting the source.
- The following review also passed with one P2 advisory: a failed backup left the invocation-owned
  reserved output directory behind, preventing an exact-path retry. Backup now traps failure/signals
  after its atomic `mkdir` and removes only that newly-created partial output; successful backups
  disarm the trap. The source deployment still remains stopped on backup failure.
- The next review passed with two P2 advisories in the runbook: start/stop/backup commands mixed an
  implicit Compose project with explicit `workadventure-local-first`, and the backup description
  implied uploader data was outside the Redis snapshot. README now uses the same explicit source
  project name throughout. It also states the exact boundary: the complete Redis volume captures
  uploader keys present at snapshot time, normal non-expiring upload restore is asserted, while
  temporary/TTL uploader or audio data may expire and is deliberately not guaranteed.

## Open Questions

- None.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Runtime backup/restore evidence: ignored `_ops/local-first-durability/`
