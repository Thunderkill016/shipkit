# Operating model

AI is a fast collaborator, not the product owner and not the final authority.

## Responsibilities

### Human owner

- chooses the product outcome and trade-offs;
- approves scope, architecture, destructive changes, and production actions;
- reviews user-visible behavior and the final diff;
- decides which review findings to accept.

### Investigator agent

- maps the current behavior without editing;
- gathers file-level evidence;
- identifies uncertainty, dependencies, and risk.

### Implementer agent

- follows an accepted issue or plan;
- keeps the change bounded;
- writes tests and produces verification evidence.

### Reviewer agent

- starts with fresh context when practical;
- does not defend the implementation;
- looks for bugs, regressions, security issues, architecture drift, and weak
  tests;
- ranks findings by impact.

### Automation

- lint, types, tests, builds, and repository checks are the neutral judge;
- repeated human corrections should become automation where possible.

## Autonomy by risk

| Risk | Examples | Agent behavior |
|---|---|---|
| Low | docs, copy, local test, tiny UI fix | proceed within scope |
| Medium | multi-file feature, new domain logic | save a plan and verify |
| High | auth, migration, billing, production, secrets | stop before mutation and obtain human approval |

The goal is not constant permission prompts. It is freedom for reversible,
low-impact work and deliberate control at consequential boundaries.
