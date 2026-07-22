# Roadmap

> Last verified: 2026-07-22  
> Machine-readable status: [`docs/CAPABILITIES.json`](./docs/CAPABILITIES.json)  
> Current model: [`docs/ai/PROJECT_MODEL.md`](./docs/ai/PROJECT_MODEL.md)  
> Ranked backlog: [`docs/ai/improvements/INDEX.md`](./docs/ai/improvements/INDEX.md)

The roadmap describes direction. It must not be used as proof that a capability
works; use the registry and current checks for that.

## Shipped foundation

- pnpm monorepo with a Next.js App Router application;
- public landing, login, protected/demo app shell, profile, notes, and billing
  example surfaces;
- Supabase and Better Auth selection through AuthPort;
- Postgres schema/migrations and portable-pg setup;
- security, storage, mail, payment, i18n, and logger packages;
- Vercel/Docker recipes, setup wizard, doctor, health endpoint, and generator;
- unit/build checks, demo E2E, portable-pg E2E definitions, and AI workflow
  validation;
- repository-first AI delivery, research, independent review, and autonomous
  improvement system.

“Shipped” means code and repository evidence exist. Environment-specific
verification is recorded separately in `docs/CAPABILITIES.json`.

## Current reliability gate

The portable-pg auth/isolation job failed on the initial PR #1 run and failed
again on rerun. Issue #3 is the highest-priority repair. Until it passes, the
portable path is implemented but not reliably verified.

## Near term

1. Diagnose and repair the repeated portable-pg E2E failure.
2. Stop hiding configured-database failures behind the notes memory fallback.
3. Keep capability status and evidence machine-verifiable.
4. Align CI and `pnpm verify`.
5. Replace the demo root `IDEA.md` with Shipkit’s actual product definition.
6. Measure time-to-first-product and remove the largest measured delay.

## Before v1.0

- required CI checks reliably pass;
- capability claims match code and current verification;
- generated-project workflow remains covered end to end;
- at least one primary setup path has measured TTFP evidence;
- one generated project demonstrates a real domain slice without foundation
  rewrites;
- production/integration claims clearly distinguish code presence from live
  verification.

## Later, only with evidence

- standalone published `create-shipkit`;
- admin or showcase applications;
- a second app adapter;
- team/multi-tenant features;
- deeper billing and operational integrations.

## Principles

1. Outcome and trust over feature count.
2. One polished path before several partial paths.
3. Security and user isolation cannot regress.
4. Research before uncertain product or technical bets.
5. Active docs may not claim more than code and verification.
