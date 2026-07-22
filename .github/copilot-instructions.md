# Shipkit repository instructions

- Read `AGENTS.md` and follow its linked source-of-truth documents.
- Treat the GitHub Issue as the task specification.
- Inspect relevant code and tests before editing.
- Use existing patterns and keep changes within the requested scope.
- Save a plan under `docs/ai/plans/` for cross-subsystem, high-risk, or broad
  work.
- Keep vendor SDK calls inside `apps/web/src/lib/adapters/**`.
- Validate writes with Zod and preserve authorization and user isolation.
- Never commit secrets or weaken security controls.
- Add or update meaningful tests for changed behavior.
- Run focused checks while iterating and `pnpm verify` before completion.
- Report command outcomes and remaining risk; never claim success while
  required checks fail.
- During review, prioritize correctness, security, regressions, architecture
  boundaries, and whether tests would catch the failure.
