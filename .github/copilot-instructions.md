# Shipkit repository instructions

- Read `AGENTS.md` and follow its linked source-of-truth documents.
- Read `docs/ai/PROJECT_MODEL.md` and `docs/CAPABILITIES.json` before broad or
  open-ended work; report stale sections, blind spots, and failing verification.
- Treat the GitHub Issue as the task specification.
- Inspect relevant code, tests, and runtime evidence before editing.
- Use existing patterns and keep changes within the requested scope.
- Save a plan under `docs/ai/plans/` for cross-subsystem, high-risk, or broad
  work.
- For open-ended “understand and improve” work, follow
  `docs/ai/AUTONOMOUS_IMPROVEMENT.md`, declare an autonomy level, and default to
  A2 research and planning.
- Refresh the evidence-backed project model and health report before proposing a
  broad cleanup. Report coverage, blind spots, and confidence.
- Rank improvement candidates, then select one bounded issue. Never combine the
  whole audit into one implementation PR.
- For uncertain ideas or current technical choices, follow
  `docs/ai/DISCOVERY_RESEARCH.md`: inspect internal evidence first, prefer
  current primary sources, record dates and citations, and search for
  contradiction.
- Discovery and audit modes do not authorize product-code edits.
- Keep vendor SDK calls inside `apps/web/src/lib/adapters/**`.
- Validate writes with Zod and preserve authorization and user isolation.
- Never commit secrets, weaken security controls, self-merge, deploy, or alter
  production data without explicit permission.
- Add or update meaningful tests for changed behavior.
- Update `docs/CAPABILITIES.json` when a change affects a capability, but do not
  treat an evidence path as proof that runtime behavior passes.
- Run focused checks while iterating and `pnpm verify` before completion.
- Report command outcomes, research evidence, assumptions, and remaining risk;
  never claim success while required checks fail.
- During review, prioritize correctness, security, regressions, architecture
  boundaries, scope, and whether tests would catch the failure.
