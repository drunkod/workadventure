# Sprint: Shared Jazz domain foundation

> **Status**: Approved
> **Slug**: shared-jazz-domain-foundation
> **Created**: 2026-09-27 10:30
> **Updated**: 2026-09-27 10:33
> **Source PRD**: none; scoped directly from the accepted Local First baseline and the next-sprint product direction
> **Source Spec**: `docs/spec.md`
> **Backlog Schema**: 2
> **Goal Mode**: incremental

Program-level sprint container. This Sprint establishes the durable Shared Jazz
domain model that later LAN synchronization can consume. It does not introduce a
LAN transport, multi-device replication, or private-message UI.

## PRD

### Problem

- The current Jazz chat identity is not stable in all anonymous cases: `JazzChatConnection.createCurrentUser()` can fall back to a fresh random `jazz-user-<uuid>`.
- The current world-to-room mapping is a browser-local `localStorage` pointer named from `startRoom.key`, not a persistent account/world room directory.
- `JazzRuntime.resolveRoomId()` creates a new public writer room whenever that pointer is absent, so missing metadata can silently fork history.
- Room ownership is currently created with a public group and `everyone` writer access, which is not a sufficient future shared-domain permission model.
- Existing local history must survive migration to stable identity and directory semantics.

### Users

- Anonymous WorkAdventure users who use Local First Jazz chat on one device today.
- Future authenticated or multi-device users whose Jazz identity must resolve consistently.
- Administrators/operators who need deterministic recovery rather than silent replacement rooms.

### Success Criteria

- A WorkAdventure account identity maps deterministically to one persisted Jazz account identity; anonymous users receive a durable device-local identity rather than a per-connection random fallback.
- A canonical world key maps deterministically to one room-directory entry for that account.
- The room directory stores room reference, schema/version metadata, world identity, access state, and migration provenance durably.
- Reloading the same account and world resolves the same authorized room.
- Existing legacy browser-local room pointers migrate into the directory without losing history.
- Missing, inaccessible, or denied rooms surface an explicit unavailable/denied state and never create a replacement implicitly.
- Private account/directory data and shared room data have an explicit boundary.

### Acceptance Scenarios

- Given an anonymous user with no prior Shared Jazz identity, first initialization creates and persists one durable device-local account identity; reload reuses it.
- Given the same persisted account and canonical world, repeated initialization resolves exactly the same room reference after reload.
- Given a legacy `wa:jazz:main:<normalized-room-key>` pointer that resolves, migration imports that exact room into the new directory and preserves its message history.
- Given a legacy pointer that is syntactically present but inaccessible/unloadable, initialization reports the room unavailable and does not create or overwrite any room reference.
- Given a directory entry whose room access is denied, initialization reports access denied and does not create a substitute.
- Given no directory entry and no legacy pointer, explicit first-room provisioning may create a room exactly once, persist it, then all subsequent resolution is directory-based.
- Given account-private directory metadata, no other account is granted access merely because it can name the world key or room ID.

### Non-goals

- LAN peer discovery, LAN Jazz sync servers, WebRTC or local-network transport.
- Cross-device synchronization.
- Private/direct-message UI or user discovery UI.
- Matrix migration or Matrix/Jazz interoperability.
- General account authentication redesign.
- Changing the already accepted single-device release boundary.

## Architecture Notes

### Capabilities Touched

- Jazz account identity derivation and persistence.
- Canonical world identity derivation from WorkAdventure room/map metadata.
- Persistent Jazz room directory.
- Legacy local room-pointer migration.
- Room access/load failure semantics.
- Jazz room ownership/permission metadata sufficient for later shared synchronization.
- Focused unit/integration tests for stable resolution, migration, and fail-closed behavior.

### Dependency Order

1. Define identity keys and canonical world key.
2. Define persistent room-directory schema and storage ownership.
3. Implement legacy pointer migration.
4. Route main-room resolution through the directory.
5. Enforce explicit unavailable/denied/no-entry states; provision only through an explicit first-room path.
6. Encode private/shared permission boundary and tests.
7. Only after this Sprint may LAN synchronization consume the stable domain model.

### Risks

- Choosing `Room.key` alone as world identity may collide or drift; the contract must pin a canonical derivation from stable room/map identity.
- Re-keying anonymous identity can orphan local history if migration is not atomic/fail-closed.
- Jazz room access APIs may distinguish missing vs denied imperfectly; the contract must define observable error mapping without silent creation.
- Existing public `everyone=writer` ownership must not leak into the future account-private directory.
- Directory schema needs versioning so later LAN sync can evolve without another pointer migration.

## Backlog

Ordered execution queue; keep rows in dependency order. Mode `contract` runs
the full plan -> contract -> worktree flow; inline rows stay in the sprint backlog
or active plan Task Breakdown.

| # | ID | Status | Task | Mode | Acceptance | Plan |
|---|----|--------|------|------|------------|------|
| 1 | 9d65fd9600e915fe68db7821b503d1e3dee7882d2b49266b272bb83b50a1801e | [ ] | define-stable-jazz-identity-and-persistent-room-directory | contract | Same persisted account + canonical world resolves the same authorized Jazz room after reload; a valid legacy local pointer migrates without history loss; missing/inaccessible/denied rooms fail closed without silently creating replacements; focused tests prove private directory vs shared room boundaries. | (pending) |

## Execution Log

Keep this section last; `repo-harness run sprint-backlog complete-task` appends rows here.

| When | Task | Plan | Result |
|------|------|------|--------|
