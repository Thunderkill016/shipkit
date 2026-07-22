# Opportunity brief — Product Slice Engine

Status: delivered in stacked draft  
Issue: #4  
PR: #5

## Desired outcome

Reduce the gap between a product idea and the first safe domain action without
requiring a paid AI API or a new hand-built CRUD implementation.

## Opportunity map

```text
Faster evidence from product ideas
├── one compact executable contract
├── shared rendering and server validation
├── explicit demo behavior
├── owner/slice-scoped Postgres storage
├── free CLI for a second workflow
└── promotion path to specialized code
```

## Concepts considered

| Concept | Strength | Failure mode |
|---|---|---|
| More boilerplate features | familiar | converges with existing kits and increases surface area |
| Paid AI app generator | flexible | cost, nondeterminism, and dependency on provider access |
| Arbitrary no-code schema platform | broad | abstraction and migration complexity before evidence |
| Declarative narrow slice engine | executable and reversible | limited field/workflow vocabulary |
| Better agent prompts only | cheap | still requires custom implementation every time |

## Selected mechanism

A narrow JSON contract that drives generic UI, Zod validation, and owner-scoped
storage, plus a CLI and an explicit escape hatch to custom schema/routes.

## Red-team review

- JSONB can become a dumping ground; document promotion triggers.
- Generic UI can become mediocre; keep field vocabulary narrow until evidence.
- File existence is not proof; require browser and Postgres checks.
- A full authenticated journey depends on the unresolved Better Auth E2E path.
- The speed claim remains a hypothesis until first-slice time is measured.

## Decision

Keep the engine because the first vertical slice works in demo mode and focused
Postgres verification. Do not broaden it before measuring time saved and
collecting feedback from a generated project.
