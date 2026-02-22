# TODO Plan: Migrate WorkAdventure Chat to Jazz Tools (Svelte)

## Warning (Read First)
> WARNING 1: `research how migrate to another chat system.md` is a helpful map, but not a complete source of truth.
>
> WARNING 2: Do not follow its "remove Matrix code early" guidance yet. It misses current dependencies across `ConnectionManager`, `AuthenticateController`, `LocalAdmin`, map editor, docs, env validation, and tests.
>
> WARNING 3: Use repository grep + compile/tests after each phase before any deletion.

## Summary
- Migration scope: direct frontend replacement of Matrix chat with Jazz.
- First-wave parity target: core text + image chat.
- Backend strategy for phase 1: keep Matrix backend/admin/provisioning flows operational.
- Rollout strategy: keep runtime fallback path to Matrix until parity + soak are complete.

## Inputs Reviewed
- `copy-chat-svelte/*`
- `Architecture Overview WorkAdventure's chat system.md`
- `jazz-docs-llms-full.txt`
- `research how migrate to another chat system.md` (advisory only)

## Research Findings (Actionable)
1. From `Architecture Overview WorkAdventure's chat system.md`.
- WorkAdventure chat has two distinct paths: proximity chat and persistent provider chat.
- Proximity chat is wired to Space/Room realtime flows and is out of scope for Jazz migration.
- Persistent provider replacement must preserve `ChatConnectionInterface` compatibility and existing chat stores (`selectedRoomStore`, visibility/unread flows).

2. From `copy-chat-svelte/*` and `jazz-docs-llms-full.txt`.
- Baseline Svelte wiring uses `JazzSvelteProvider` plus browser context sync config (`sync.peer`, `when`).
- Message storage pattern is CoValue schema-driven (`co.map`, `co.list`) and room subscription-driven.
- Image parity path should follow Jazz media APIs (`createImage`, image loading helpers) and map to WA `ChatMessageContent`.

3. From `research how migrate to another chat system.md` (warning-aligned usage).
- Use it only as a file map and checklist seed.
- Do not use it as authority for sequencing deletions.
- Specifically reject early removal of Matrix/Synapse/backend hooks in phase 1.

4. Current workspace blocker discovered during devtools validation.
- Installed `jazz-tools` package does not currently expose required browser/media runtime exports used by the migration path.
- Observed runtime fallback error in mock frontend with Jazz flag enabled:
- Missing exports: `JazzBrowserContextManager`, `createImage`, `loadImageBySize`.
- Migration sequencing implication: resolve Jazz package/API compatibility before declaring first-wave Jazz parity complete.

## Jazz Init Pattern (from `jazz-docs-llms-full.txt`)
- Provider-first initialization for Svelte apps:
- Wrap app/chat subtree with `JazzSvelteProvider` from `jazz-tools/svelte`.
- Provide `sync` config using cloud peer: ``wss://cloud.jazz.tools/?key=${apiKey}``.
- Use `sync.when` (default/target: `"always"` for phase 1).
- Set `defaultProfileName` for account/profile fallback UX.
- Keep init env-driven:
- `PUBLIC_JAZZ_API_KEY` (docs pattern) or project-specific equivalents (`JAZZ_API_KEY`, `JAZZ_SYNC_PEER`).

## Public API / Interface / Type Changes
1. Add Jazz chat runtime config to frontend contract:
- `play/src/common/FrontConfigurationInterface.ts`
- `JAZZ_CHAT_ENABLED?: boolean`
- `JAZZ_SYNC_PEER?: string`
- `JAZZ_API_KEY?: string`
2. Add env exports/validation:
- `play/src/front/Enum/EnvironmentVariable.ts`
- `play/src/pusher/enums/EnvironmentVariable.ts`
- `play/src/pusher/enums/EnvironmentVariableValidator.ts`
- `.env.template`
- `docker-compose.yaml`
- `contrib/docker/docker-compose.prod.yaml`
3. Add new frontend connection implementation:
- `play/src/front/Chat/Connection/Jazz/*`
- Must implement `ChatConnectionInterface` from `play/src/front/Chat/Connection/ChatConnection.ts`

## Baseline Inventory Checkpoint
- Inventory commands used:
```bash
rg -l "\bMatrix\b|matrix-js-sdk|MATRIX_|isMatrixChatEnabledStore" play/src/front play/src/pusher docs play/tests .env.template docker-compose.yaml contrib/docker/.env.prod.template contrib/docker/docker-compose.prod.yaml | sort
rg -l "ConnectionManager|AuthenticateController|LocalAdmin|MatrixRoomAreaController" play/src docs play/tests | sort
```
- Do not delete before phase completion:
- `play/src/front/Chat/Connection/Matrix/*`
- `play/src/front/Chat/Services/MatrixRateLimiter.ts`
- `play/src/front/Chat/Connection/ChatConnection.ts`
- `play/src/front/Stores/ChatStore.ts`
- `play/src/front/Phaser/Game/GameManager.ts`
- `play/src/front/Connection/ConnectionManager.ts`
- `play/src/front/Components/MapEditor/AreaEditor/AreaPropertiesEditor.svelte`
- `play/src/pusher/services/MatrixProvider.ts`
- `play/src/pusher/controllers/AuthenticateController.ts`
- `play/src/pusher/controllers/MatrixRoomAreaController.ts`
- `play/src/pusher/services/LocalAdmin.ts`
- `play/src/pusher/enums/EnvironmentVariable.ts`
- `play/src/pusher/enums/EnvironmentVariableValidator.ts`
- `play/tests/setup/vitest.setup.ts`
- `play/tests/front/MockMode/frontendOnlyMockPlugin.test.ts`
- `docs/user/chat.md`
- `docs/user/phone-chat.md`
- `docs/others/contributing/matrix-dev.md`
- `docs/others/self-hosting/matrix.md`
- `docs/others/self-hosting/env-variables.md`
- `docs/map-building/inline-editor/area-editor/matrix-chat-zone.md`
- `.env.template`
- `docker-compose.yaml`
- `contrib/docker/.env.prod.template`
- `contrib/docker/docker-compose.prod.yaml`

## Step-by-Step TODO (Decision Complete)
1. [ ] Baseline inventory checkpoint.
- Capture all Matrix touchpoints with `rg` (frontend, pusher, docs, env, tests).
- Keep/update the "Do not delete before phase completion" list in this file.

2. [ ] Introduce Jazz config plumbing.
- Add `JAZZ_CHAT_ENABLED`, `JAZZ_SYNC_PEER`, `JAZZ_API_KEY` through env + front config pipeline.
- Keep all Matrix env vars unchanged for coexistence safety.

3. [ ] Add Jazz dependencies to play app.
- Ensure `jazz-tools` and required peers are available in `play/package.json`.
- Validate package API compatibility before UI wiring:
- Confirm required Jazz browser/svelte/media entry points used by the implementation are actually exported by the installed version.
- If mismatch exists, stop migration deletion work and resolve dependency strategy first (upgrade/pin/refactor imports).
- Do not remove `matrix-js-sdk` yet.

4. [x] Create Jazz schema + mapping layer (based on `copy-chat-svelte/src/lib/schema.ts`).
- New `play/src/front/Chat/Connection/Jazz/schema.ts`.
- Define `JazzMessage` map: text + optional image/file metadata.
- Define `JazzChatRoom` list/feed for ordered messages.
- Add conversion helpers to WA `ChatMessageContent` shape.
- Status note: implemented (`schema.ts`, mapping helper), runtime still blocked by Jazz package export compatibility gate.

5. [ ] Implement `JazzChatConnection` adapter.
- New `play/src/front/Chat/Connection/Jazz/JazzChatConnection.ts`.
- Satisfy `ChatConnectionInterface` with first-wave methods:
- `rooms`, `directRooms`, `getRoomByID`, `sendMessage`, `sendFiles`, unread counter basics, `destroy`, `clearListener`.
- Provide explicit first-wave stubs for deferred features (moderation/folders/encryption UX) with safe defaults and no throw in normal UI flow.

6. [x] Implement room/message classes.
- New files analogous to Matrix implementation:
- `JazzChatRoom.ts`
- `JazzChatMessage.ts`
- Optional `JazzChatRoomMember.ts` minimal scaffolding.
- Keep interface compatibility with current Svelte chat components.
- Status note: implemented `JazzChatRoom.ts`, `JazzChatMessage.ts`, and minimal `JazzChatRoomMember.ts`, wired through `JazzChatConnection.ts`.

7. [ ] Mount Jazz provider in UI tree.
- In `play/src/front/Components/GameOverlay.svelte`, wrap chat subtree (`ChatSidebar`) with `JazzSvelteProvider`.
- Configure `sync.peer` from env (`JAZZ_SYNC_PEER` + key).
- Set `defaultProfileName` from current WA username fallback logic.

8. [ ] Switch connection selection logic in `GameManager`.
- Update `play/src/front/Phaser/Game/GameManager.ts`.
- Prefer `JazzChatConnection` when `JAZZ_CHAT_ENABLED=true`.
- Keep Matrix path as emergency fallback during migration window.
- Keep `isMatrixChatEnabledStore` behavior compatible or alias to a generic chat-enabled signal.

9. [ ] Bridge existing auth/session state carefully.
- Keep current `ConnectionManager` and backend Matrix auth fields untouched in first wave.
- Ensure Jazz session/account does not break login/logout.
- On logout, call Jazz cleanup + existing cleanup.

10. [ ] Implement first-wave feature parity (core text + image).
- Text send/receive.
- Room timeline rendering.
- Unread count updates.
- Image upload via `createImage` pattern from Jazz docs and `copy-chat-svelte`.
- Enforce existing upload limits and UI validation messages.

11. [ ] Keep backend Matrix workflows operational (explicit non-goals this wave).
- Do not remove `play/src/pusher/services/MatrixProvider.ts`.
- Do not remove matrix callback logic in `play/src/pusher/controllers/AuthenticateController.ts`.
- Do not remove LocalAdmin Matrix capability flags.
- Mark backend decommission as phase-2 only.

12. [ ] Update docs and naming.
- Track user-facing wording still saying "Matrix".
- Track later docs updates after backend strategy is finalized:
- `docs/user/chat.md`
- map editor Matrix room docs
- self-hosting docs

13. [ ] Phase-2 cleanup checklist (deferred, gated).
- Remove Matrix frontend implementation files only after parity + rollback window.
- Remove Matrix env vars, docker synapse service, backend provider, docs, and `matrix-js-sdk` only after explicit acceptance criteria pass.

## Test Cases and Scenarios
1. Unit tests.
- `JazzChatConnection` interface conformance: all required methods return valid values.
- Message mapping correctness: Jazz schema -> `ChatMessageContent`.

2. Component/integration tests.
- Existing chat UI components render with Jazz-backed rooms/messages without component changes.
- Unread counters update on inbound messages.
- Image upload under limit succeeds.
- Oversized file fails with user-visible error.

3. End-to-end.
- Login, open chat, send text between two clients, real-time receive.
- Upload image and display in both clients.
- Reload page and verify persistence/reload behavior for Jazz room id.
- Logout/login does not crash chat sidebar.
- Feature flag fallback to Matrix still works.

4. Regression checks.
- Proximity chat remains unaffected.
- Map editor and area-based Matrix room tooling remain operational while backend Matrix is retained.

## Assumptions and Defaults Locked
- Migration scope: direct replacement (frontend path).
- Initial parity: core text + image only.
- Backend strategy: keep backend Matrix flows temporarily.
- Deletion policy: no Matrix deletions in phase 1.
- Rollout policy: keep runtime rollback path until parity + soak period complete.
