# Context engineering

Agent quality depends on relevant context, not maximum context.

## Repository as memory

Store durable knowledge in version-controlled files:

- `IDEA.md` for product intent;
- `ARCHITECTURE.md` for system boundaries;
- ADRs for decisions;
- plans for temporary implementation state;
- tests and scripts for executable expectations.

Chat is temporary working memory. It is not the system of record.

## Give the agent a map

`AGENTS.md` should stay short and point to deeper documents. Do not copy an
entire style guide into it. Prefer:

- exact commands;
- hard boundaries;
- links to canonical examples;
- common failure modes that cannot be inferred from code.

## Start a fresh session when

- moving to another task;
- one logical unit is finished;
- the agent repeatedly misunderstands the task;
- switching from implementation to independent review;
- the chat contains large amounts of obsolete logs or failed approaches.

Use `docs/ai/templates/SESSION_HANDOFF.md` when a task must continue later.

## Avoid stale context

- date plans and decisions;
- mark plans active, blocked, superseded, or completed;
- link to current source files instead of copying large code excerpts;
- delete or supersede obsolete rules;
- run `pnpm check:ai` to catch missing workflow files and unresolved template
  placeholders.
