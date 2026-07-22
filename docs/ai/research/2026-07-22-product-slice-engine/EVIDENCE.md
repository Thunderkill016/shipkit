# Evidence ledger — Product Slice Engine

Date: 2026-07-22

| ID | Observation | Source | Relation | Confidence |
|---|---|---|---|---|
| E1 | MakerKit positions auth, billing, teams, admin, testing, i18n, agent rules, and MCP as core differentiation | https://makerkit.dev/saas-starter-kit, accessed 2026-07-22 | Infrastructure and agent context are converging | High |
| E2 | supastarter positions a production SaaS foundation plus AGENTS.md / Codex / Cursor support | https://supastarter.dev/codex-boilerplate, accessed 2026-07-22 | Agent-friendly boilerplates are no longer unique | High |
| E3 | Open SaaS ships agent skills, rules, and LLM-friendly docs | https://docs.opensaas.sh/guides/vibe-coding/, accessed 2026-07-22 | Open-source competitors also cover AI context | High |
| E4 | Current Shipkit asks the builder or agent to edit IDEA.md and manually implement the next route | `apps/web/src/app/app/page.tsx`, inspected 2026-07-22 | The idea-to-domain-workflow gap remains internal | High |
| E5 | Current notes implementation proves owner-scoped CRUD is useful but duplicates code per domain | notes page, actions, store, schema, and tests | A declarative reusable mechanism is feasible | High |
| E6 | Current notes store silently falls back to memory on any database error | `apps/web/src/lib/notes-store.ts` | New engine must surface configured-service failures | High |

## Contradiction search

- A generic CRUD engine can become a low-code dead end; therefore v1 is intentionally narrow and documented as a fast validation layer.
- JSONB reduces migration cost but weakens relational guarantees; specialized code should replace it when product evidence demands richer behavior.
- A config file is not a product breakthrough by itself; the claim requires working runtime behavior, owner isolation, CLI speed, and tests.

## Decision

Build one narrow, measurable Product Slice Engine vertical slice. Reject broad no-code, arbitrary schema generation, or paid LLM generation in this cycle.
