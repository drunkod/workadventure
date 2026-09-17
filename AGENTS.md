# Repo Agent Context

This is the root routing contract for Claude Code and Codex. Load this before task-local artifacts.

## Workflow Contract

- Use first principles, one source of truth, and no steady-state compatibility paths.
- Treat `docs/spec.md` as product truth; `tasks/current.md` is derived state and `tasks/todos.md` is the deferred-goal ledger.
- Keep current execution in the active plan's `## Task Breakdown`; use contracts, reviews, notes, workstreams, and handoff artifacts for durable progress.
- Read `.ai/context/capabilities.json` and `.ai/context/context-map.json` before adding scoped agent context.
- Write human-facing documents (`docs/`, `plans/prds/`, design briefs) in the language set by `.ai/harness/policy.json#documentation.language`; keep section headers, field keys, and technical terms in English. Agent-facing artifacts stay English.
- Keep `_ref/` ignored external reference material and `_ops/` ignored local operations state.
