> **Archived**: 2026-09-27 02:56
> **Related Plan**: plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
> **Outcome**: Completed
> **Lifecycle**: notes
> **Parent Run ID**: run-20260927-0256
> **Archive Projection V1**: `plans/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md` => `plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/notes/20260926-1435-production-test-single-device-local-first-release-on-macbook.notes.md` => `tasks/archive/notes-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/contracts/20260926-1435-production-test-single-device-local-first-release-on-macbook.contract.md` => `tasks/archive/contract-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`
> **Archive Projection V1**: `tasks/reviews/20260926-1435-production-test-single-device-local-first-release-on-macbook.review.md` => `tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md`

# Implementation Notes: production-test-single-device-local-first-release-on-macbook

> **Status**: Active
> **Plan**: plans/archive/plan-20260926-1435-production-test-single-device-local-first-release-on-macbook.md
> **Contract**: tasks/archive/contract-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
> **Review**: tasks/archive/review-20260927-0256-production-test-single-device-local-first-release-on-macbook.md
> **Last Updated**: 2026-09-27 01:31
> **Lifecycle**: notes

## Design Decisions

- Release override keeps the application network internal and adds a non-masqueraded ingress bridge only to Traefik.
- Browser release E2E uses a fresh ru-RU context, pre-navigation HTTP/WebSocket blocking/inventory, anonymous first-run flow, and Jazz main-room text/image/edit/delete/reload assertions.
- Release runner builds before isolation, uses a unique Compose project, adds source-subnet-scoped Colima DOCKER-USER LOG rules, proves a bounded container egress control, and writes ignored _ops evidence.
- Fresh-worktree test prerequisites are generated locally (typesafe-i18n and Room API ts-proto); no generated files are part of the tracked row-5 subject.

## Deviations From Plan Or Spec

- The original clean-revision blocker was repaired separately and integrated locally as `71a333dddd24459eefe714f8889fca6069dc777b`; row 5 was rebased onto that target before rerun.
- Post-repair run `_ops/local-first-release/20260926T141527Z-5713/` used source revision `b972259433b7d225aff4c83afe4b18b380cfa781`.
- Production image build, isolated stack startup, and the bounded container public-egress control all passed; the browser now reaches and completes the anonymous starter-map flow.
- The post-repair run failed only because the release spec assumed a full-page reload would remain in the starter map. The actual supported behavior returned to the Russian anonymous login screen (`Введите имя` / `Продолжить`), while the contract requires Russian UI after reload and Jazz persistence in the same browser profile—not anonymous-onboarding persistence.
- The Playwright harness was corrected within row-5 Allowed Paths to assert the visible Russian reload UI, then re-enter the starter map in the same browser context before continuing Jazz persistence checks.
- No product-source change is required for this harness correction.
- The accepted Jazz live-refresh repair was later integrated locally as publication commit `6bd81afc2b988a9f1b3d6f5b9e5e847ef4e91f01`; row 5 was rebased onto it before the next clean production run.
- Clean run `_ops/local-first-release/20260926T201302Z-64676/` at row-5 revision `4a8c1f3e6c5aeccc111291ae8172b96d7e293a15` passed static verification, production image build, isolated Compose startup, and container public-egress denial. The browser progressed through live Jazz text send/edit/delete, proving the prior live-refresh blocker was cleared.
- That run then failed at the image step because the release spec selected the real chat file input but incorrectly waited for/clicked `sendMessageButton`. CodeGraph confirms `MessageFileInput` immediately invokes `room.sendFiles(files)` when its bound file input changes; the attachment state does not require a second send-button click.
- The row-5 harness now targets `uploadChatCustomAsset` explicitly and waits for the image projection directly. This remains inside row-5 Allowed Paths and requires no product-source change.
- The exact row-5 semantic review of `58e2f5ddb` was consumed against base `6bd81afc2`. Its raw transcript reported two P2 findings even though the wrapper incorrectly returned an empty findings list/PASS; the raw transcript is treated as authoritative.
- P2 #1: `release-verify.mjs` rejected only `ingress` membership for application services, so an additional external network could have escaped the static topology guard. The verifier now requires every non-proxy service to join exactly `default`, while `reverse-proxy` must join exactly `default` + `ingress`.
- P2 #2: the container control treated any HTTPS fetch failure as proof of blocked egress. The control now uses a numeric TCP probe to `1.1.1.1:443`, accepts only timeout/`ENETUNREACH`/`EHOSTUNREACH`/`ETIMEDOUT` as expected blocking, treats a connection as egress failure, and rejects unrelated probe errors.
- The semantic-review budget is exhausted; after these corrections, final acceptance requires fresh deterministic/release evidence plus the contract's explicit owner-waiver path.

## Tradeoffs Considered

| Option | Decision | Reason |
|--------|----------|--------|
| Structural Docker isolation vs proxy/package-based blocking | Structural two-network isolation | Keeps runtime independent of NET_ADMIN/custom helper images and preserves loopback ingress. |

## Open Questions

- The previous product and harness blockers are corrected. The next clean exact committed release run must re-prove all frozen browser and container isolation criteria after the two semantic-review P2 hardenings.
- The external semantic review is consumed and will not be retried; final row-5 acceptance requires the allowed explicit owner-waiver path after fresh exact verification.
- Server startup still logs failed legacy MatrixProvider initialization against an invalid URL; acceptance remains based on the frozen rule that no network request/socket to Matrix or another provider may be observed.

## Evidence Links

- Checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Original product-blocked run: `_ops/local-first-release/20260926T113642Z-1801/`
- Post-repair harness-correction run: `_ops/local-first-release/20260926T141527Z-5713/`
- Post-repair container egress control: `_ops/local-first-release/20260926T141527Z-5713/container-control.json`
- Post-repair Playwright failure: `_ops/local-first-release/20260926T141527Z-5713/playwright-output.txt`
- Post-repair production logs: `_ops/local-first-release/20260926T141527Z-5713/container-logs.txt`
- Jazz live-refresh blocker run: `_ops/local-first-release/20260926T143706Z-67642/`
- Jazz blocker Playwright output: `_ops/local-first-release/20260926T143706Z-67642/playwright-output.txt`
- Latest Playwright trace: `tests/test-results/local-first-release-single-device-local-first-release-chromium/trace.zip`

## Promotion Filter

Promote a candidate to `tasks/lessons.md`, `docs/researches/`, or harness asset files only when all three hold: hard to reverse, surprising without local context, and a real trade-off existed. If any one is missing, keep it in this notes file instead.

## Promotion Candidates

- Promote to `tasks/lessons.md` only after a repeated correction or failure pattern.
- Promote to `docs/researches/` only when it is durable repo knowledge with evidence.
- Promote to harness asset files only after verification across more than one task or fixture.
