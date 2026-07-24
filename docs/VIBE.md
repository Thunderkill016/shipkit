# Vibe coding with engineering controls

CycleWarden keeps the speed of AI-assisted building while adding explicit scope,
verification, and review.

## Default loop

```text
1. Update IDEA.md or create a GitHub Issue
2. Ask the agent to explore without editing
3. Define acceptance criteria
4. Save a plan for non-trivial work
5. Implement one small slice
6. Run focused checks, then pnpm verify
7. Review the diff in a fresh session
8. Open a PR and merge only with evidence
```

The complete system is indexed in [`AI_WORKFLOW.md`](../AI_WORKFLOW.md).

## Good work to delegate

- product UI and copy;
- isolated features with clear acceptance criteria;
- tests for established behavior;
- bounded bug fixes;
- documentation;
- mechanical refactors protected by tests.

## Work requiring a risk gate

- auth or authorization;
- database migrations;
- billing, secrets, production, or external integrations;
- broad refactors;
- dependency or framework replacement.

For these tasks, require a written plan and manual review before merge.

## Prompt starters

### Explore

> Read `AGENTS.md`, `IDEA.md`, and the relevant code. Do not edit files.
> Explain current behavior with file evidence, uncertainties, and the smallest
> safe change.

### Implement

> Follow the accepted plan. Keep the diff within scope, add or update tests,
> run focused checks, then `pnpm verify`. Report evidence and remaining risk.

### Review

> Review the branch as an independent engineer. Do not edit. Find correctness,
> security, regression, architecture, and test-quality problems. Cite file and
> line, severity, and reproduction steps.

Reusable complete prompts live in [`prompts/`](../prompts/).
