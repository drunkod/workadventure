# Upstream UI Sync Rules

This fork intentionally diverges from `workadventure/workadventure` to preserve the local/offline runtime. Upstream updates are therefore **selective**, not full merges.

## Source and branch

- Working branch: `d/local_jazz_chat`
- Fork remote: `origin` (`drunkod/workadventure`)
- Source remote: `upstream` (`workadventure/workadventure`)
- Source branch: `upstream/master`
- Fetch only `master`. The upstream repository has refs that differ only by case, which cannot all be stored on the default macOS case-insensitive filesystem.

## Definition of "mainly UI-related"

An upstream change is a candidate when at least 70% of its changed files are UI files and it touches no protected runtime path.

UI files normally live under:
- `play/src/front/Components/`
- `play/src/front/Chat/Components/`
- `play/src/front/style/`
- `play/src/front/img/`
- `play/src/i18n/`

Tests may accompany an otherwise UI-only change without making it a runtime change.
## Protected paths

Do not import upstream changes from these paths as part of a UI sync unless they are separately reviewed and explicitly approved:

- `back/`, `play/src/pusher/`, `messages/`, `map-storage/`, `uploader/`, `synapse/`
- `play/src/front/Connection/`
- `play/src/front/Chat/Connection/Jazz/`
- `play/src/front/Phaser/Game/GameManager.ts`
- `play/vite.config.mts`
- `play/public/frontend-only-env.js`
- `.env*`, Docker/Compose files, deployment files
- `package.json`, lockfiles, Vite/Svelte/Phaser/toolchain upgrades

These paths contain the fork's local/offline behavior or can silently reintroduce network/backend requirements.

## Update method

1. Create a backup branch before each sync.
2. Fetch `upstream/master` only.
3. Run `python3 scripts/upstream-ui-report.py --fetch`.
4. Review each `CANDIDATE` commit and its patch.
5. Prefer a semantic port of the small upstream change onto the current fork over replacing the whole upstream file.
6. Never run `git merge upstream/master` or `git rebase upstream/master` for routine UI updates.
7. Never replace the entire `play/src/front/Components` tree from upstream.
8. If a UI patch depends on a protected path, skip it and record the dependency instead of pulling the dependency automatically.
9. After changes, run Codegraph sync and the frontend validation commands.
10. Commit the sync separately from local feature work, with upstream commit SHAs in the commit message.

## Validation gate

At minimum, run:

```bash
cd play
npm run svelte-check
npm run typecheck
```

Run focused tests for components changed by the sync when they exist. Then run:

```bash
codegraph sync /Users/test/Documents/work/workadventure
```

A sync is rejected if it breaks the frontend-only mock startup, enables a cloud service by default, changes backend/protocol contracts, or requires a toolchain upgrade merely to accept a UI change.

## Current compatibility boundary

At the 2026-09-11 review, upstream uses Svelte 5.55.9, Vite 8.1.4, Phaser 4.2.0 and Matrix SDK 41.8.0. This fork uses Svelte 5.0, Vite 5.4.21, Phaser 3.86.0 and Matrix SDK 32.3.0.
Because of that gap, the default strategy is **small upstream patch + local adaptation**, not cherry-picking long dependency chains.

## 2026-09-11 sync

Reviewed upstream through `6a3595710`.

Ported UI behavior from:
- `5e1075bed9` — keep active menu object identity under Svelte 5.
- `177993af2a` — format calendar dates using the browser locale.
- `378e4926ab` — remove stray `$` before translated Calendar/Todo text.
- `8ac1f6de62` — hide Picture-in-Picture when unsupported.
- `a9631a388e` — make Jitsi advanced options safe when width is unset.
- `ba0a85995d` — clear the chat user-provider filter when search closes.

Reviewed but not ported:
- `d584137a05` — internal cleanup with no visual behavior change.
- `cf2845222a` — fixes a newer recording-list layout that this fork does not yet contain.
- `1cc9945855`, `e529951be3` — Vietnamese/Thai locale additions; safe but optional content expansion rather than a UI fix.

When a skipped upstream feature becomes relevant, review its dependency chain from its original PR before importing it.
