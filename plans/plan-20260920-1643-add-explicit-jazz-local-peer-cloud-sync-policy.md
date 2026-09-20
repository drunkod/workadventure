# Plan: Add explicit Jazz local/peer/cloud sync policy

> **Status**: Approved
> **Created**: 20260920-1643
> **Slug**: add-explicit-jazz-local-peer-cloud-sync-policy
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md#add explicit Jazz local/peer/cloud sync policy
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: focused Jazz policy + provider-fallback tests and normal `play` typecheck
> **Rollback Surface**: revert the reviewed task publication
> **Spec**: `docs/spec.md`
> **Research**: `docs/researches/20260920-local-first-jazz-audit.md`
> **Task Contract**: `tasks/contracts/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.contract.md`
> **Task Review**: `tasks/reviews/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.review.md`
> **Implementation Notes**: `tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md`

## Agentic Routing
- Selected route: mechanical implementation after frozen Sprint decisions.
- Routing reason: the sync truth table, validation placement, and provider fallback behavior are already decided.
- No `$think`, web research, deployment design, lifecycle timeout design, or UI permissions design is authorized in this row.

## Workflow Inventory
- Active plan: this file.
- Contract: `tasks/contracts/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.contract.md`.
- Review: `tasks/reviews/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.review.md`.
- Notes: `tasks/notes/20260920-1643-add-explicit-jazz-local-peer-cloud-sync-policy.notes.md`.
- Sprint: `plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md`.
- Execution isolation: one `codex/add-explicit-jazz-local-peer-cloud-sync-policy` worktree.
## Decisions

1. `JAZZ_SYNC_MODE` is transported from pusher to frontend as an optional raw string. Pusher startup must not fail because Jazz mode/peer/key is invalid.
2. Add a pure frontend policy resolver in `play/src/front/Chat/Connection/Jazz/JazzSyncPolicy.ts`.
3. Normalize mode, peer, and API key with `trim()`; blank values become absent before applying the Sprint truth table.
4. Resolver outputs a discriminated `JazzSyncPolicy`:
   - `{ mode: "local" }`
   - `{ mode: "peer", peer: string }`
   - `{ mode: "cloud", peer: string }`, where the cloud URL is synthesized only from an explicit non-empty API key.
5. `local` ignores stale peer/key values. `peer` ignores API key, requires syntactically valid `ws:`/`wss:` peer. `cloud` rejects a supplied peer and requires API key. Missing/invalid mode is an error when Jazz is enabled.
6. `JazzChatConnection` receives raw mode/peer/key, resolves policy during `init()`, and passes only the resolved policy to `JazzRuntime`.
7. `JazzRuntime` accepts only a resolved policy and maps it to Jazz context sync:
   - local -> exactly `{ when: "never" }`
   - peer/cloud -> `{ peer, when: "always" }`
   Remove the runtime default API-key/cloud fallback.
8. Minimal provider guard for row 1: if Jazz init fails (including policy/config validation), `GameManager` must not continue into Matrix. Keep the failed Jazz connection as the selected chat object with `ON_ERROR`; core gameplay continues.
9. When Jazz is disabled, Jazz mode/peer/key are unused and cannot block existing non-Jazz behavior.
10. Row 2 owns lifecycle concurrency, 5-second room readiness, storage errors, stale pointers, retries, and unsupported-feature gating. Do not implement them here.

## File Changes
- `play/src/pusher/enums/EnvironmentVariableValidator.ts`: add optional raw `JAZZ_SYNC_MODE` transport field only; do not use a strict enum that can fail pusher startup.
- `play/src/pusher/enums/EnvironmentVariable.ts`: export/project `JAZZ_SYNC_MODE` into front environment.
- `play/src/common/FrontConfigurationInterface.ts`: add optional `JAZZ_SYNC_MODE: string | undefined`.
- `play/src/front/Enum/EnvironmentVariable.ts`: export frontend `JAZZ_SYNC_MODE`.
- `play/src/front/Chat/Connection/Jazz/JazzSyncPolicy.ts`: new pure resolver/types and Jazz context sync mapping.
- `play/src/front/Chat/Connection/Jazz/JazzChatConnection.ts`: accept `syncMode`; resolve policy in `init`; pass resolved policy to runtime.
- `play/src/front/Chat/Connection/Jazz/JazzRuntime.ts`: consume resolved policy; support `{ when: "never" }`; remove implicit cloud fallback.
- `play/src/front/Phaser/Game/GameManager.ts`: pass raw mode; on Jazz init failure return/retain Jazz `ON_ERROR` connection and never enter Matrix branch.
- `play/tests/setup/vitest.setup.ts`: add `JAZZ_SYNC_MODE: undefined` to test front env.
- `play/tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts`: truth-table tests.
- `play/tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts`: mocked regression proving invalid Jazz config leaves Jazz selected/error and Matrix client initialization count is zero.

## Falsifier

If semantic validation cannot be kept in the frontend without making pusher startup fail, or if the minimal GameManager guard cannot prevent Matrix fallback without changing unrelated provider architecture, return BLOCKED with the concrete failing path/test. Do not widen into row-2 lifecycle or a provider-framework redesign.

## Focused Validation

1. `cd play && npx vitest run tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts`
2. `cd play && npx vitest run tests/front/Phaser/Game/GameManagerJazzPolicy.test.ts`
3. `cd play && npm run typecheck`
4. `git diff --check`
Required assertions include:
- disabled Jazz never requires policy resolution;
- blank/invalid mode errors when enabled;
- local ignores stale peer/key and maps exactly to `{ when: "never" }`;
- peer accepts only syntactically valid ws/wss and maps exactly to configured peer/always;
- cloud rejects peer, requires explicit key, and produces encoded Jazz cloud URL/always;
- invalid Jazz config with Matrix URL/login conditions present performs zero Matrix wrapper/client initialization and returns the Jazz connection in `ON_ERROR`.

## Long-gate Evidence
- No long build/E2E is required for row 1.
- Repo Harness orchestrator runs the frozen Verification Plan and records exact subject evidence.

## Verifier
- GPT-5.6 Luna / low, read-only.
- Inspect exact diff, focused test evidence, typecheck evidence, and frozen Sprint truth table.
- Reject fallback reintroduction, hidden default cloud behavior, pusher-fatal validation, or row-2 scope creep.
- Missing/mismatched evidence => BLOCKED/REJECT, never substitute another model.

## Promotion Gate
- **Merge/PR unit**: row-1 policy propagation + focused tests only.
- **Rollback surface**: revert the row-1 publication; there is no data migration.
- **Verification boundary**: the three contract Verification Plan checks plus `git diff --check`.
- **Review/acceptance boundary**: one read-only Luna-low semantic review against frozen evidence, then typed AcceptanceReceipt and final `verify-sprint`.
- **High-risk surface**: provider fallback and accidental outbound Jazz peer creation.
- **Why not checklist row**: this changes runtime provider policy across pusher/frontend/Jazz boundaries and requires an isolated worktree.

## Evidence Contract
- **State/progress path**: this plan, its contract/review/notes, and Sprint row 1.
- **Verification evidence**: `.ai/harness/checks/latest.json` + immutable run snapshot.
- **Evaluator rubric**: exact Sprint truth table, no pusher-fatal semantic validation, no implicit cloud, no Matrix fallback, no row-2 scope creep.
- **Stop condition**: contract fulfilled, semantic PASS, final `verify-sprint`, closeout.
- **Rollback surface**: revert the row-1 publication; generated evidence may be regenerated.

## Task Breakdown
- [ ] Propagate optional raw `JAZZ_SYNC_MODE` pusher -> frontend.
- [ ] Add pure policy resolver and runtime sync mapping.
- [ ] Wire resolved policy through Jazz connection/runtime.
- [ ] Prevent Jazz init/config failure from falling through to Matrix.
- [ ] Add focused policy and provider-fallback tests.
- [ ] Pass frozen verification and semantic acceptance.
