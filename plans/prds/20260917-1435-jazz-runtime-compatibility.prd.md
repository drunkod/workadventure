# PRD: Jazz compatibility, Russian localisation, and local-first production validation

> **Status**: Approved
> **Slug**: jazz-runtime-compatibility
> **Created**: 2026-09-17 14:35
> **Updated**: 2026-09-20 15:40
> **Source Spec**: `docs/spec.md`
> **Tier**: compact

## AI Quick-Read Card

- Problem: the Jazz migration needs a green TypeScript baseline, first-class Russian localisation, an explicit cloud-free local-first runtime mode, and proof that both the upstream-compatible and local-first production stacks work on the target MacBook.
- Users: WorkAdventure maintainers and Russian-speaking WorkAdventure users.
- Platform: WorkAdventure `play` TypeScript/Vite/Svelte application plus the repository Docker production-like stack.
- P0 surface: compiler compatibility, `ru-RU` locale parity, explicit local-only Jazz persistence, local-first container topology, optional LAN sync, and production build/runtime acceptance.
- Core metric: all three ordered Sprint slices close with exact verification evidence.
- Hard constraint: preserve existing cloud/Matrix compatibility paths while making local-first a fail-closed explicit mode with no hidden cloud dependency.
- Key risks: incomplete Russian coverage; environment-only Docker failures hiding product failures; production-only Jazz regressions.
- Unknowns: exact production resource/runtime constraints on this MacBook are resolved by the final production-like acceptance row.
- Acceptance scenarios: typecheck/export probe green; Russian diff has zero missing files/keys; upstream production-like baseline passes; local-only Jazz works from IndexedDB with no cloud peer; local-first Compose builds/runs; optional LAN sync uses a local peer; local-first browser/E2E acceptance passes.
- Suggested next step: execute the Russian locale row, then run production-like acceptance.

## Problem

The first blocker was TypeScript's legacy Node module resolution, which could not resolve supported `jazz-tools@0.20.10` browser/media exports. That slice is complete and accepted.

The next product gap is localisation: `play/src/i18n` has no `ru-RU` locale, so Russian-speaking users cannot select a first-class Russian UI and fall back to another language.

The final release gap is runtime evidence. The fork has been exercised in frontend-only development mode, but the complete repository production-like Docker build and E2E path must be built and tested on this MacBook before this Sprint can be considered done.

### Product Direction

- Hard Constraints: preserve Jazz/Matrix provider behavior; add Russian as a normal typesafe-i18n locale; use the repository's documented production-like Docker path for final acceptance.
- Recommended Defaults: full Russian parity with `en-US`; derived typesafe-i18n files remain generated; production acceptance uses `docker-compose.yaml` + `docker-compose.e2e.yml` and the repository production-like Playwright suite.
- Freedoms: natural Russian wording may improve literal English phrasing while preserving placeholders, meaning, and product terminology.

### Feasibility Boundary

- Confirmed: Jazz package resolution is green with checked-in `moduleResolution: "bundler"`.
- Confirmed: non-base locales are merged over `en-US`, and locale folders are discovered by typesafe-i18n generation.
- Confirmed: the repository documents `npm run i18n:diff -- <locale>` as the missing-key/file gate.
- Confirmed: the repository documents a production-like Docker Compose build plus `npm run test-prod-like`.
- [UNVERIFIED]: all production containers and browser tests fit this MacBook's current Docker resources; the final row resolves this empirically.

## Users

### Primary Users

- Russian-speaking WorkAdventure user:
  - Need: use the complete application and chat UI in Russian.
  - Success signal: selecting/detecting `ru-RU` yields Russian text without missing localisation modules/keys.
- WorkAdventure maintainer:
  - Need: know the Jazz fork is releasable beyond frontend-only development mode.
  - Success signal: production-like build, services, E2E tests, and targeted browser smoke checks pass on the MacBook.

## Success Criteria

| Metric | Target | Measurement Method | Degradation Threshold |
|---|---:|---|---:|
| Play typecheck | 100% pass | `cd play && npm run typecheck` | any TS error |
| Russian locale parity | 0 missing files / 0 missing keys | `cd play && npm run i18n:diff -- ru-RU` | any missing file/key |
| Russian locale generation | `ru-RU` generated and loadable | `npm run typesafe-i18n` + locale detection/load test | locale absent/unloadable |
| Production-like build/runtime | all required services build/start | documented Docker Compose production-like command + health/readiness checks | required service build/start failure |
| Production-like E2E | pass | `cd tests && npm run test-prod-like` | product-regression failure |

## Acceptance Scenarios

### Scenario 1 — compiler/package boundary
- Given: the accepted Jazz runtime compatibility slice.
- When: normal `play` typecheck and Jazz export probe run.
- Then: both remain green with no runtime/provider redesign.

### Scenario 2 — Russian localisation
- Given: `en-US` is the source locale.
- When: `ru-RU` is audited and loaded.
- Then: all source modules/keys have Russian translations, placeholders are preserved, and the locale is selectable/detectable.
- Machine-checkable evidence: zero-diff localisation audit plus type generation/typecheck and focused locale test.

### Scenario 3 — production-like acceptance
- Given: the completed resolver and Russian localisation rows.
- When: the repository production-like Docker stack is built and launched on the MacBook.
- Then: required services become healthy, the production-like Playwright suite passes, and targeted browser smoke covers Russian selection plus Jazz chat normal/error paths.
- Machine-checkable evidence: compose/build logs, service health, E2E results, and recorded browser acceptance evidence.

## Non-goals

- Upgrade or downgrade `jazz-tools` as part of localisation.
- Remove Matrix code or fallback semantics.
- Redesign chat UX while translating it.
- Treat frontend-only Vite mode as production acceptance.
- Provision external Coturn/LiveKit/Jitsi infrastructure beyond what the repository production-like E2E topology requires.

## Module Behaviors (P0)

### Russian locale
- Purpose: provide first-class Russian UI coverage with the same key/module surface as `en-US`.
- Hard Constraints: preserve interpolation placeholders and application semantics; no untranslated source keys through accidental fallback.
- Recommended Defaults: use `ru-RU`; mirror existing locale module structure; merge over `en-US` only as a safety mechanism, not as planned missing coverage.
- Dependencies: typesafe-i18n generation, locale detector/loader, `Intl.DisplayNames`.
- Open decisions: None.

### Production-like validation
- Purpose: prove the built multi-service application behaves correctly on the target MacBook.
- Hard Constraints: use documented production-like compose/E2E path; distinguish environment/resource blockers from product failures; test built assets rather than dev server assets.
- Recommended Defaults: clean rebuild, readiness checks, automated production-like tests, then targeted browser smoke for Russian + Jazz.
- Dependencies: Docker/Compose, project images, Playwright/browser dependencies.
- Open decisions: None.

## Developer Handoff

- Build first: complete `ru-RU` parity as an isolated contract task.
- Do not reinterpret: localisation must not redesign Jazz/Matrix behavior.
- Verify localisation with: `i18n:diff`, typesafe generation, typecheck, focused locale load/detection checks, semantic review.
- Then: execute production-like Docker build/run and test the full application on this MacBook, including Russian locale and Jazz chat smoke coverage.

## Local-first Architecture Addendum

See `docs/researches/20260920-local-first-container-architecture.md`. The decided direction is to reuse existing app Dockerfiles, add a local-first Compose overlay, make Jazz local-only mode explicit (`sync.when = "never"`), and isolate any new Dockerfile to a supported local Jazz LAN sync service if needed.
