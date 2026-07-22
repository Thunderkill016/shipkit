# AGENTS.md — Shipkit

You are building a product on Shipkit. Preserve the chosen stack and make the
smallest verifiable change that satisfies the current task.

## Start here

Read only the context needed for the task:

1. `IDEA.md` — product scope and MVP.
2. `AI_WORKFLOW.md` — task lifecycle and document map.
3. `ARCHITECTURE.md` — when changing boundaries, data flow, or packages.
4. The active plan in `docs/ai/plans/`, when one exists.
5. The nearest path-specific instruction under `.github/instructions/`.

Do not treat this file as an encyclopedia. Follow its links to the current
source of truth.

## Working agreement

For every non-trivial change:

1. Inspect the relevant code before editing.
2. State the current behavior and evidence.
3. Define acceptance criteria.
4. Save a plan in `docs/ai/plans/` when the task crosses a subsystem, changes
   data, touches security, or is expected to modify more than five files.
5. Implement one reviewable slice at a time.
6. Run the narrowest relevant checks while iterating.
7. Run `pnpm verify` before reporting completion.
8. Review the final diff for regressions and out-of-scope changes.
9. Report verification evidence and remaining risks.

Use a fresh agent session for independent review when practical.

## Stack and boundaries

| Area | Rule |
|---|---|
| App | Next.js App Router under `apps/web` |
| Product UI | Prefer `apps/web/src/app/app/**` for authenticated features |
| Auth | Use `getAuth()` and existing adapters |
| Vendor SDKs | Keep inside `apps/web/src/lib/adapters/**` |
| Validation | Validate writes with Zod |
| Database | Schema and SQL live under `packages/db` |
| Styling | Reuse Tailwind tokens from `apps/web/src/app/globals.css` |
| Skills | Reusable workflows live under `.agents/skills/**/SKILL.md` |

## Hard rules

- Do not replace the framework, auth architecture, or monorepo tooling unless
  the human explicitly requests it.
- Do not add a dependency without explaining why existing code cannot solve
  the task.
- Do not commit secrets, `.env.local`, service-role keys, or production data.
- Do not weaken security headers, authorization, row isolation, or validation.
- Do not edit an already-deployed migration; add a new migration.
- Do not remove code until usage has been checked and evidence is recorded.
- Do not change unrelated files just to make them “cleaner.”
- Never claim completion while required checks are failing.

## Commands

```bash
pnpm install
pnpm doctor
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:ai
pnpm verify
```

Use focused tests during implementation. `pnpm verify` is the final local gate.

## Risk gates

Pause and present a clear plan before actions involving:

- authentication or authorization;
- database migrations or destructive data changes;
- secrets, billing, external services, or production;
- broad refactors, dependency replacement, or public API changes.

## Completion report

Include:

- behavior changed;
- files changed;
- tests or checks run and their outcomes;
- assumptions;
- unresolved risks;
- what the project owner should review manually.

When teaching the owner, follow `docs/ai/LEARNING_MODE.md`.
