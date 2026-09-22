# Implementation Notes: add-local-first-server-durability-and-restore-tooling

> **Status**: Active
> **Plan**: plans/plan-20260922-1259-add-local-first-server-durability-and-restore-tooling.md
> **Contract**: tasks/contracts/20260922-1259-add-local-first-server-durability-and-restore-tooling.contract.md
> **Review**: tasks/reviews/20260922-1259-add-local-first-server-durability-and-restore-tooling.review.md
> **Last Updated**: 2026-09-22 13:11
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

- None recorded.

## Open Questions

- None.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Runtime backup/restore evidence: ignored `_ops/local-first-durability/`
