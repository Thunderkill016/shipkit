# Architecture

## Goal

Let builders delegate product slices to AI while the foundation remains
predictable, testable, and replaceable at explicit boundaries. Wrap AI agent
autonomy in a deterministic governance engine with audit-grade evidence.

```text
IDEA.md / GitHub Issue
          ↓
apps/web product routes and server actions
          ↓
@cyclewarden/* ports and shared packages
          ↓
apps/web/src/lib/adapters/*
          ↓
Postgres / Supabase / Better Auth / S3 / Resend / Stripe
```

## Repository units

| Area | Responsibility |
|---|---|
| `apps/web` | Next.js App Router application, product UI, server actions, adapter selection |
| `packages/evolution-core` | Deterministic lifecycle engine: state machine, policy, evidence registry, research, CLI |
| `packages/auth` | AuthPort contract |
| `packages/config` | Environment schema and preset identifiers |
| `packages/db` | Drizzle schemas and SQL migrations |
| `packages/security` | Validation, headers, password schema, and rate limiting |
| `packages/storage` | StoragePort plus local and S3-compatible adapters |
| `packages/mail` | MailPort plus console and Resend adapters |
| `packages/payment` | PaymentPort and Stripe/noop behavior |
| `packages/i18n` | Vietnamese and English dictionaries |
| `packages/logger` | Logger abstraction |
| `scripts` | Setup, diagnostics, migration, verification, and project generation |
| `docs/ai` | Repository memory for agents: project model, plans, research, and improvements |
| `docs/evolution` | Evolution engine specs: architecture, research capability, data governance |

## Application surface

Current routes include:

- `/` — localized public landing;
- `/login` — email/password and env-gated OAuth entry;
- `/app` — authenticated or demo shell;
- `/app/evolution` — evolution cycle dashboard: inspect, track, and advance cycles;
- `/app/notes` — Postgres notes with memory fallback;
- `/app/profile` — profile and storage pattern;
- `/app/billing` — env-gated Stripe/noop pattern;
- `/api/health` — lightweight health response;
- `/api/auth/[...all]` — Better Auth endpoint.

## Dependency and vendor boundaries

- Product UI and server actions depend on ports or app-level facades.
- Vendor SDK calls belong under `apps/web/src/lib/adapters/**` or a narrowly
  named integration facade.
- Auth is selected through `getAuth()` and supports Supabase or Better Auth.
- Database writes must validate input and scope records to the current user.
- Deployed migrations are append-only.
- Demo fallbacks must be visible to users and must not hide configured-service
  failures.

## Critical journeys

### Generated product

```text
pnpm create -- name
→ copy foundation and AI system
→ seed IDEA.md and PROJECT_MODEL.md
→ rewrite project identity and verification state
→ run generated workflow checks
```

### Email signup

```text
/login
→ Zod validation + rate limit
→ AuthPort signup
→ session cookie through selected adapter
→ non-blocking MailPort welcome message
→ /app
```

### Notes

```text
/app/notes
→ authenticated/demo user identity
→ validated server action
→ user-scoped Postgres store or explicit demo fallback
→ rendered user-owned notes
```

## Verification

- Root scripts define install, typecheck, lint, tests, build, diagnostics, and
  AI-workflow checks.
- GitHub Actions runs Test & Build, demo E2E, portable-pg E2E, and the AI
  workflow/generator checks.
- Current claim status belongs in `docs/CAPABILITIES.json`.
- Current architecture coverage and blind spots belong in
  `docs/ai/PROJECT_MODEL.md`.

## Known risks

- Portable-pg E2E is currently failing repeatedly; see issue #3.
- Notes currently catch database errors broadly and can fall back to memory.
- OAuth, mail delivery, Stripe lifecycle, production deploy, and Supabase live
  behavior require environment-specific verification.
- Root `IDEA.md` still describes a demo product and needs a human product
  decision.
