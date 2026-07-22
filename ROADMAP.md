# Roadmap

> Last verified: 2026-07-22  
> Machine-readable status: [`docs/CAPABILITIES.json`](./docs/CAPABILITIES.json)  
> Current model: [`docs/ai/PROJECT_MODEL.md`](./docs/ai/PROJECT_MODEL.md)  
> Product Slice guide: [`docs/PRODUCT_SLICE_ENGINE.md`](./docs/PRODUCT_SLICE_ENGINE.md)

The roadmap describes direction. Current behavior and verification belong in the
capability registry and CI.

## Product direction

Shipkit is moving beyond a boilerplate. Its differentiator is the Product Slice
Engine: a narrow declarative contract becomes a server-validated, owner-scoped
workflow that runs in demo mode or Postgres without a paid AI dependency.

This is a mechanism for reaching evidence faster, not a promise to replace
specialized domain code forever.

## Shipped foundation

- Next.js application with landing, auth, app shell, profile, notes, and billing;
- Supabase and Better Auth selection through AuthPort;
- Postgres schema/migrations and portable-pg setup;
- security, storage, mail, payment, i18n, and logger packages;
- Vercel/Docker recipes, setup, doctor, health, and project generator;
- repository-first AI delivery, research, review, and improvement system;
- Product Slice contracts, shared validation, generic create/list/delete UI,
  explicit demo storage, owner/slice-scoped Postgres storage, CLI, and tests.

## Current reliability gate

The feature-specific Product Slice demo and Postgres checks pass. The broader
Better Auth portable browser job still fails repeatedly and remains issue #3.
Shipkit must not describe the complete authenticated portable journey as stable
until that issue passes twice from clean CI environments.

## Next product experiments

1. Measure time from `pnpm slice:new` to a completed browser action in a generated
   project; publish the result rather than repeating an unmeasured speed claim.
2. Use the included Feedback Inbox to collect evidence about the next required
   field or workflow behavior.
3. Add update/status transitions and filters only if the feedback slice proves
   they reduce real implementation time.
4. Define a documented promotion path from generic JSONB records to specialized
   relational schema and routes.
5. Localize the Product Slice runtime after the English workflow is stable.

## Reliability and trust

6. Diagnose and repair the repeated portable auth E2E failure.
7. Stop hiding configured-database failures behind the notes memory fallback.
8. Align CI and `pnpm verify` without weakening checks.
9. Retain Playwright traces, screenshots, and useful server logs on failure.

## Before v1.0

- required CI checks reliably pass;
- a generated project creates a second Product Slice without editing TypeScript;
- first-slice time is measured for demo and one authenticated database path;
- capability claims match current code and verification;
- the JSONB-to-specialized-code promotion path is documented and exercised once;
- production claims distinguish code presence from live verification.

## Later, only with evidence

- more field types, relationships, files, automations, and background work;
- a visual editor or natural-language contract generator;
- standalone published `create-shipkit`;
- team/multi-tenant features;
- a second app adapter and deeper billing/operations.

## Principles

1. Outcome and trust over feature count.
2. One polished mechanism before many field types.
3. Security and user isolation cannot regress.
4. Research and measurement before broadening the abstraction.
5. Generic code must have an explicit escape hatch to specialized code.
