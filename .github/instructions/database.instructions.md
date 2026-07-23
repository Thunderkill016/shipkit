---
applyTo: "packages/db/**,**/migrations/**,**/*.sql"
---

# Database instructions

- Never rewrite an already-deployed migration; add a forward migration.
- Document ownership, authorization, and user isolation for every new table.
- Include rollback or forward-fix strategy and backfill impact.
- Use parameterized queries and validate external input.
- Keep schema changes separate from unrelated refactors.
