> **Status**: Approved
> **Created**: 20260926-1435
> **Slug**: production-test-single-device-local-first-release-on-macbook
> **Planning Source**: repo-harness-sprint
> **Orchestration Kind**: sprint-task
> **Source Ref**: sprint:plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md#production-test single-device local-first release on MacBook
> **Artifact Level**: work-package
> **Promotion Reason**: worktree_boundary
> **Verification Boundary**: Local First static/release verifier + isolated Compose resolution + Jazz focused tests + clean-revision Apple Silicon production build + container/browser egress controls + dedicated Chromium release E2E + strict Repo Harness verification.
> **Rollback Surface**: revert the single row-5 release-gate commit; runtime verification uses unique temporary Compose projects and ignored `_ops/` evidence.
> **Task Contract**: tasks/contracts/20260926-1435-production-test-single-device-local-first-release-on-macbook.contract.md
> **Task Review**: tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md
> **Implementation Notes**: tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md

# Plan: production-test single-device Local First release on MacBook

## Goal

Add and execute one reproducible release gate for the accepted standalone `deploy/local-first/` stack on the target
Apple Silicon MacBook. The gate must build the exact committed source, prove public Internet egress is denied for
both application containers and the test browser, then exercise anonymous gameplay, `ru-RU`, and Jazz local
text/image/edit/delete plus reload persistence without a Jazz peer or Matrix/provider fallback.

## Decision Precedence

`plans/sprints/20260920-1628-local-first-single-device-luna-low.sprint.md` is the execution authority. Its standalone
`deploy/local-first/` topology and dedicated Local First release gate supersede the older upstream
`docker-compose.yaml` + `docker-compose.e2e.yml` release topology. This row must not reinstate the superseded
Matrix/OIDC-heavy full-upstream E2E topology.

## Frozen Decisions

1. This row is release-harness/deployment-test work only. Product source, upstream Dockerfiles, and upstream
   Compose files remain read-only unless the release gate exposes a reproducible product defect; such a defect is
   BLOCKED for this contract and requires a separate repair task.
2. The release isolation override is `deploy/local-first/release-isolation.yml`. It makes the application/default
   network `internal: true`; only `reverse-proxy` also joins a second `ingress` bridge.
3. The `ingress` bridge sets `com.docker.network.bridge.enable_ip_masquerade: "false"`. On the target Colima/Docker
   runtime this preserves the `127.0.0.1:80` published entrypoint while preventing reverse-proxy initiated public
   egress. No `NET_ADMIN`, custom proxy image, or runtime package installation is permitted.
4. Before product scenarios, the runner proves isolation with two controls:
   - an application-container `fetch("https://example.com")` must fail within a bounded timeout;
   - a browser `fetch("https://example.com")` must be intercepted, recorded, and fail.
5. Container destination inventory is independent of the blocking mechanism. The runner inserts temporary,
   source-CIDR-scoped `LOG` rules in Colima's `DOCKER-USER` chain for the release project's default and ingress
   subnets, records NEW forwarded attempts from those subnets, then removes the exact rules in cleanup.
6. Kernel-log inventory records source container IP/service, destination IP/port/protocol, and phase
   (`control` versus `product`). Any unaccounted public destination attempt is preserved in evidence; the logging
   rules never replace the structural network block.
7. Browser isolation uses Playwright `browserContext.route()` for HTTP(S) and
   `browserContext.routeWebSocket()` for WS(S), installed before product navigation. Only loopback,
   `localhost`, and `*.localhost` destinations are allowed to continue/connect. External destinations are
   recorded and aborted/closed before network access.
8. The release override deliberately supplies stale `JAZZ_SYNC_PEER` and `JAZZ_API_KEY` values while keeping
   `JAZZ_SYNC_MODE=local`. Any request/socket toward that stale peer, Jazz Cloud, Matrix, or another networked
   chat provider is an acceptance failure.
9. The browser test uses a fresh Chromium context and the stable origin
   `http://play.workadventure.localhost`. It creates an anonymous user through the normal name/character/media
   flow and reaches the starter map; no cached `.auth` storage state is reused.
10. `ru-RU` is exercised in the production bundle by a `ru-RU` browser locale and reload. Acceptance requires the
    document language and visible translated UI to remain Russian after reload.
11. Jazz release E2E opens the automatically available main room and proves:
    - text send/read;
    - image send/read from an in-memory PNG fixture;
    - edit of an owned text message;
    - delete of a second owned text message;
    - full page reload in the same browser profile preserves the edited text and image and does not resurrect the
      deleted message.
12. The browser test records console errors, page errors, HTTP(S) external attempts, WS(S) external attempts, and
    final assertions as JSON under the runner-provided ignored evidence directory.
13. Optional blocked outbound requests are findings only if the supported core flow still passes and they are not
    Jazz-peer/provider fallback. Any Jazz peer/cloud/Matrix fallback attempt, core-flow stall, or core-flow
    failure is blocking.
14. The long release gate starts from a clean committed row-5 worktree. It records the exact Git revision, resolved
    Compose configuration, image IDs, container/network identities, isolation controls, kernel destination
    inventory, browser evidence, container logs, and result under `_ops/local-first-release/<run-id>/`.
15. Image/dependency acquisition and source-image build happen before isolation. The isolated product phase uses
    `up -d --no-build` only. Air-gapped build/package distribution remains out of scope.
16. The already accepted row-4 durability/restore implementation is not redesigned here. Its static verifier stays
    in the focused gate; row 5 validates current built-server persistence only where the release runner can do so
    without widening the browser/network-isolation task.

## Concrete File Changes

| File | Action | Required change |
|---|---|---|
| `deploy/local-first/release-isolation.yml` | add | default internal network + non-masqueraded ingress attached only to reverse-proxy; stale local-mode Jazz peer/key |
| `deploy/local-first/release-verify.mjs` | add | fail closed on release override topology, isolation options, and stale-Jazz control configuration |
| `deploy/local-first/release-smoke.sh` | add | clean-revision build, isolated unique project, Colima logging/control probes, Playwright execution, evidence and cleanup |
| `tests/tests/local-first-release.spec.ts` | add | fresh-profile anonymous/ru-RU/Jazz CRUD+image+reload browser smoke with HTTP/WS egress interception |
| `deploy/local-first/README.md` | modify | document exact release gate, evidence, isolation method, limits, and rerun/cleanup commands |
| row-5 plan/contract/notes/review | workflow | Repo Harness authority/evidence only |

## Proven Interfaces / Environment

- CodeGraph confirmed the existing Playwright anonymous flow in `tests/tests/utils/auth.ts`, locale persistence,
  Jazz main-room implementation, Jazz text/image/edit/delete APIs, and stable chat `data-testid` selectors.
- The installed test dependency is Playwright `^1.57.0`; browser-context WebSocket routing is available from
  Playwright 1.48 onward and can be installed before any page creates a socket.
- Disposable target-Mac probes proved:
  - setting the whole default network `internal: true` blocks the published loopback entrypoint and is rejected;
  - internal default + second ingress bridge with masquerade disabled keeps loopback `/ping` reachable;
  - application-container and reverse-proxy public probes fail under that two-network topology;
  - a temporary Colima `DOCKER-USER` LOG rule records exact SRC/DST/port for a blocked container egress attempt.
- `_ops/` is already ignored by repository policy.

## Ordered Implementation

1. Add `release-isolation.yml` and `release-verify.mjs` with exact topology and stale-Jazz assertions.
2. Add the dedicated Playwright spec with fresh context, browser HTTP/WS interception, control probe, anonymous
   starter-map flow, Russian locale assertion, and Jazz text/image/edit/delete/reload assertions.
3. Add `release-smoke.sh` with unique project/run IDs, clean-source guard, pre-isolation build, Colima LOG-rule
   lifecycle, structural isolation assertions, control probes, Playwright execution, evidence capture, and
   fail-closed cleanup.
4. Document the release procedure and evidence boundary in `deploy/local-first/README.md`.
5. Run fast static/config/unit checks. Commit the exact row-5 implementation locally so the worktree is clean.
6. Run the expensive release smoke once from that exact commit. Do not edit the subject while it runs.
7. Freeze evidence; run the Sprint-configured GPT-5.6 Luna/low read-only semantic review through the contract's
   Codex acceptance source. Missing model availability or source mismatch is BLOCKED, not silently substituted.
8. Record the typed AcceptanceReceipt and run `verify-sprint`; close the task only on deterministic + semantic PASS.

## Focused Verification

- `node deploy/local-first/verify.mjs`
- `node deploy/local-first/release-verify.mjs`
- `/bin/bash -n deploy/local-first/release-smoke.sh`
- `docker-compose --env-file deploy/local-first/.env.example -f deploy/local-first/compose.yml -f deploy/local-first/release-isolation.yml config --quiet`
- `npm --prefix play test -- --run tests/front/Chat/Connection/Jazz/JazzSyncPolicy.test.ts tests/front/Chat/Connection/Jazz/JazzChatConnectionLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzRuntimeLifecycle.test.ts tests/front/Chat/Connection/Jazz/JazzUnsupportedSurface.test.ts`
- `npm --prefix tests run lint -- --no-warn-ignored`
- `git diff --check`

## Long-gate Evidence

- Canonical expensive gate: `bash deploy/local-first/release-smoke.sh`.
- The gate requires a clean committed worktree and records `git rev-parse HEAD`; tracked content changes after the
  run invalidate the evidence.
- The runner owns the long build/runtime process; Luna does not wait on build/browser logs.
- Runtime artifacts live under ignored `_ops/local-first-release/<run-id>/`; Repo Harness execution evidence lives
  under `.ai/harness/checks/latest.json` and `.ai/harness/runs/`.
- Required release artifacts: source revision, image IDs, resolved Compose config, network inspect, control-probe
  results, Colima kernel egress log + normalized inventory, browser JSON, Playwright result/trace on failure,
  container logs, and final PASS/FAIL summary.
- Product-caused deterministic failure is FAIL/BLOCKED for this release row and requires a separate repair task.
  Registry/build-host/browser-binary/Colima capability failure is recorded as an environment BLOCKED result; it
  is never relabeled PASS.

## Verifier

- Acceptance Policy remains the repository-supported typed source `reviewer=Codex`, `source=codex-review`.
- The semantic review runtime must use GPT-5.6 Luna with low reasoning effort as required by the Sprint. Silent
  model/source substitution is forbidden.
- Reviewer is read-only and consumes the exact final diff plus frozen deterministic/runtime evidence; it does not
  rerun the production build or browser gate.
- Semantic PASS with zero blocking findings is required before the AcceptanceReceipt is recorded.

## Promotion Gate

- **Merge/PR unit**: the Local First release isolation override, reproducible release runner, dedicated browser
  smoke, static verifier, and runbook as one release-gate change.
- **Rollback surface**: revert the single row-5 release-gate publication; no canonical user data is migrated.
- **Verification boundary**: focused static/config/Jazz tests followed by one clean-revision Apple Silicon build
  and isolated browser/container release smoke.
- **Review/acceptance boundary**: independent read-only Luna-low semantic review of the final subject and frozen
  evidence, followed by the typed AcceptanceReceipt.
- **High-risk surface**: false-positive isolation, unlogged egress, accidentally mocked local WebSockets,
  stale-profile persistence, networked Jazz/Matrix fallback, cleanup that touches canonical resources.
- **Why not checklist row**: isolation controls, destination inventory, production build, and browser persistence
  are mutually dependent release evidence and cannot be accepted independently.

## Evidence Contract

- **State/progress path**: this plan, its contract/review/notes, and Sprint row 5.
- **Verification evidence**: current-exact focused checks plus one clean-revision release run under
  `_ops/local-first-release/<run-id>/`.
- **Evaluator rubric**: loopback origin reachable; container and browser public egress controls fail closed;
  every observed external destination inventoried; no Jazz peer/cloud/Matrix fallback; anonymous starter-map flow
  works; Russian UI survives reload; Jazz text/image/edit/delete and reload persistence pass.
- **Stop condition**: contract Fulfilled, deterministic evidence PASS, required Luna-low semantic PASS, typed
  AcceptanceReceipt, final `verify-sprint`, and Repo Harness closeout.
- **Rollback surface**: remove/revert only row-5 release-gate files; temporary Docker/iptables state is cleanup-bound.

## Task Breakdown

- [ ] Add deterministic release isolation override and verifier.
- [ ] Add dedicated Local First Chromium release E2E with browser network inventory.
- [ ] Add clean-revision release runner with Colima container-egress inventory and fail-closed cleanup.
- [ ] Document release gate and evidence boundary.
- [ ] Pass focused checks, commit exact subject, and run expensive release gate.
- [ ] Pass read-only Luna-low semantic review, AcceptanceReceipt, `verify-sprint`, and closeout.

## Stop Conditions

- BLOCKED if row 5 requires product-source or upstream Docker/Compose changes.
- BLOCKED if loopback cannot remain reachable while container public egress is denied.
- BLOCKED if container or browser egress cannot be both denied and inventoried.
- BLOCKED if the expensive gate cannot run from a clean exact committed source revision.
- BLOCKED, not downgraded, for any Jazz peer/cloud/Matrix fallback attempt or supported-core product failure.
