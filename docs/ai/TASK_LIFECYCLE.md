# Task lifecycle

## 1. Frame the task

A useful issue states:

- the problem or desired user outcome;
- current and expected behavior;
- acceptance criteria;
- relevant constraints;
- verification expectations;
- explicitly excluded work.

Treat the issue as the primary prompt.

## 2. Explore before editing

The agent should locate relevant routes, components, data access, tests, and
existing patterns. Conclusions must reference concrete files. Unknowns should
remain unknown instead of being filled with plausible guesses.

## 3. Decide whether a saved plan is required

Create `docs/ai/plans/YYYY-MM-DD-short-name.md` when the task:

- changes more than one subsystem;
- touches data, security, auth, billing, or production;
- changes a public API;
- is expected to touch more than five files;
- contains architectural choices;
- has meaningful rollback risk.

Use `docs/ai/templates/IMPLEMENTATION_PLAN.md`.

## 4. Implement a vertical slice

A slice should produce one coherent, testable behavior. Avoid mixing feature
work, cleanup, dependency upgrades, and unrelated formatting.

During implementation:

- run the closest test after each meaningful change;
- prefer an existing canonical pattern;
- keep public interfaces stable unless the task requires otherwise;
- record assumptions in the plan or PR.

## 5. Verify

Run focused checks while iterating. Before completion, run:

```bash
pnpm verify
```

See `docs/ai/VERIFICATION.md`.

## 6. Review independently

Use a fresh session or reviewer agent. Review the diff, not the implementer's
summary. Findings need severity, evidence, impact, and a reproduction or
failure scenario.

## 7. Fix accepted findings

Fix only findings accepted by the owner or clearly required by the issue.
Rerun relevant checks and the final gate.

## 8. Merge and learn

After merge:

- update the plan status;
- record architecture decisions that must persist;
- turn repeated mistakes into a rule, test, lint check, or script;
- remove stale instructions rather than accumulating contradictory rules.
