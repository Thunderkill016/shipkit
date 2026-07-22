# Implementation plan — Product Slice Engine

Status: active  
Issue: #4  
Autonomy: A3  
Branch: `agent/product-slice-engine`

## Outcome

A generated Shipkit project can add a useful owner-scoped product workflow by editing a compact JSON contract or running a free CLI, rather than hand-building the first CRUD slice.

## Acceptance criteria

- definition and record validation share one source;
- demo storage is explicit and database failures surface;
- Postgres rows are scoped by owner and slice;
- generic pages create, list, and delete records;
- one CLI adds a second valid slice;
- unit and E2E tests cover behavior;
- capability and project memory record honest verification.

## Steps

1. Add config schema, generic record schema, table, migration, and isolated store.
2. Add server actions and generic UI routes.
3. Add CLI and integration test.
4. Add demo and portable-pg E2E coverage.
5. Run full verification and independent diff review.
6. Update capability registry, project model, roadmap, research, and issue.

## Risk controls

- JSONB is a reversible MVP mechanism, not a permanent answer for complex domains.
- Only three field types are supported initially.
- No configured database fallback to memory.
- No auth, billing, production, or deployment changes.
- PR remains stacked and draft.
