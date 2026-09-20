# Plan: Production-test full WorkAdventure on MacBook

> **Status**: Approved
> **Created**: 20260920-1516
> **Slug**: build-and-production-test-full-workadventure-on-macbook
> **Planning Source**: repo-harness-plan
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260917-1435-jazz-runtime-compatibility.sprint.md#build and production-test full WorkAdventure on MacBook
> **Artifact Level**: work-package
> **Promotion Reason**: production_verification_boundary
> **Verification Boundary**: production-like Docker Compose build/start, required-service readiness, full `test-prod-like`, built-app HTTP check, then browser smoke for ru-RU + Jazz
> **Rollback Surface**: no product mutation; stop/remove the local Compose stack and archive the eval task
> **Spec**: `docs/spec.md`
> **Research**: `README.md`, `docs/others/self-hosting/install.md`, `tests/README.md`
> **Task Contract**: `tasks/contracts/20260920-1516-build-and-production-test-full-workadventure-on-macbook.contract.md`
> **Task Review**: `tasks/reviews/20260920-1516-build-and-production-test-full-workadventure-on-macbook.review.md`
> **Implementation Notes**: `tasks/notes/20260920-1516-build-and-production-test-full-workadventure-on-macbook.notes.md`

## Agentic Routing
- Selected route: deterministic production evaluation; no implementation worker unless a concrete product regression is discovered.
- Routing reason: the integrated tree is already accepted through rows 1–2; this row validates release behavior rather than designing code.

## Environment Established
- Mac: 8 logical CPUs, 16 GiB RAM, sufficient free disk.
- Container runtime installed locally for this test: Colima 0.10.3 with Docker, 6 CPUs / 10 GiB RAM / 60 GiB disk, VZ + Rosetta/QEMU fallback.
- Docker client/server: 29.8.1 / 29.5.2.
- Docker Compose: standalone Homebrew `docker-compose` 5.5.1.
- `.env` is ignored and copied from `.env.template`; `ENABLE_CHAT=true`, `JAZZ_CHAT_ENABLED=true`, Jazz peer/key/global-room remain blank so the application's existing fallback peer logic is exercised without secrets.
- Production-like topology: `docker-compose.yaml` + `docker-compose.e2e.yml`, exactly as documented in `tests/README.md`.

## Strategy
1. Validate Compose config against the ignored local `.env`.
2. Build and start the documented production-like stack with BuildKit.
3. Prove required services are running and the built `play` endpoint is reachable.
4. Run the complete `tests` `npm run test-prod-like` suite (all configured Playwright projects, one worker as repository-configured).
5. Freeze Repo Harness verification evidence.
6. Against the still-running built stack, perform browser smoke without changing repository files:
   - load the production app URL;
   - select/store `ru-RU` and verify visible Russian UI plus `document.documentElement.lang === "ru-RU"`;
   - verify production front config enables Jazz;
   - exercise a normal Jazz chat path (open chat, observe room, send/read a disposable test message if available);
   - exercise/reconcile an error/recovery path without destructive external side effects;
   - inspect console/network for blocking errors.
7. Run Luna-low read-only semantic review over machine evidence plus browser-smoke evidence. PASS closes the Sprint; a product failure becomes a separate bounded repair task rather than being hidden in this eval row.

## Classification Rules
- Product regression: built app/service starts but application behavior, tests, ru-RU, or Jazz fails because of repository code/configuration. This blocks acceptance and should produce a new repair contract.
- Environment blocker: Docker/VM host resource failure, registry/network outage, browser binary unavailable, or external Jazz-cloud outage not caused by the repository. Record exact evidence; do not modify product code to mask it.
- Expected warnings (for example unset `GITHUB_SHA` cache tags or obsolete Compose `version`) do not block unless they cause build/runtime failure.

## Falsifier
If the documented production-like Compose topology cannot build/start from the integrated tree, or the production-like test suite exposes a reproducible repository regression, this Sprint is not releasable; stop acceptance and classify the first concrete failure.

## Verification
Canonical machine checks are the Task Contract Verification Plan. They must run on the exact integrated tree from an isolated contract worktree with the same ignored `.env` values.

## Browser Smoke Evidence
Browser smoke is deliberately after machine verification so it exercises the same containers. It must not edit tracked files. The reviewer receives exact observations, console/network findings, and any screenshots/log paths produced under ignored runtime state.

## Promotion Gate
- **Merge/PR unit**: evaluation/workflow closeout only; no product-source publication is expected from this row.
- **Rollback surface**: Docker/Colima runtime state and task workflow artifacts only.
- **Verification boundary**: documented production-like Compose build/start, required-service readiness, full `test-prod-like`, followed by browser smoke on the same running containers.
- **Review/acceptance boundary**: typed Codex AcceptanceReceipt after machine evidence and browser smoke both support release readiness.
- **High-risk surface**: production runtime correctness; do not convert an environment/product failure into a source change inside this eval task.
- **Why not checklist row**: this is the final release-evidence boundary for the Sprint and may expose a separate repair task.

## Evidence Contract
- **State/progress path**: this plan, its contract/review/notes, and Sprint row 3.
- **Verification evidence**: `.ai/harness/checks/latest.json`, immutable verification run snapshots, Docker/Compose output, and Playwright production-like results.
- **Browser evidence**: read-only observations from the same running built stack for ru-RU, Jazz, console, and network behavior; no tracked mutation.
- **Evaluator rubric**: all canonical machine checks pass; browser smoke shows built app + Russian + Jazz without blocking product errors; Luna-low reviewer returns PASS.
- **Stop condition**: typed external PASS receipt and final `verify-sprint`, or BLOCKED with a concrete classified failure.
- **Rollback surface**: stop/remove the local Compose stack; no product rollback should be necessary for a pure eval.

## Task Breakdown
- [ ] Build/start documented production-like Docker Compose stack.
- [ ] Verify required services and built app readiness.
- [ ] Run complete `npm run test-prod-like` suite.
- [ ] Smoke-test ru-RU and Jazz in the built application, including console/network inspection.
- [ ] Pass Luna-low read-only review and record the typed AcceptanceReceipt.
- [ ] Close row 3 and mark the Sprint done.
