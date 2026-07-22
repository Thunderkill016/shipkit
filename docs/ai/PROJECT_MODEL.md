# Project model — Shipkit

Status: verified snapshot  
Last verified: 2026-07-22  
Coverage: product intent, Product Slice Engine, generator, auth, notes, i18n, billing, health, CI, and AI workflow  
Autonomy level used: A3

This is a compact evidence-backed map. It does not claim production, analytics,
live third-party delivery, or a healthy Better Auth portable browser path.

## Product

- Mission: turn a product idea into a verified executable slice quickly while
  preserving auth, data isolation, security, and deploy boundaries.
- Differentiator: `product/slices.json` can produce the first class of working
  owner-scoped product workflows without a paid AI call or hand-built CRUD UI.
- Current target: builders launching small web products with AI coding agents.
- Core outcome: a builder can create or edit a slice contract, run Shipkit, and
  complete a domain action before writing specialized domain code.
- Product ambiguity remains in root `IDEA.md`, which still describes a demo
  product rather than Shipkit itself.

## Repository structure

| Area | Purpose | Entry points | Boundary | Confidence |
|---|---|---|---|---|
| `product` | executable product-slice contracts | `slices.json` | narrow supported field types | High |
| `apps/web` | Next.js runtime, generic slice UI, server actions | routes under `src/app` | vendor integrations through adapters/facades | High |
| `packages/db` | Drizzle schema and forward SQL migrations | schema + `sql/` | explicit relational promotion path | High |
| `packages/auth` | AuthPort | package exports | app selects Supabase or Better Auth | Medium |
| `packages/security` | validation, headers, rate limits | package exports | controls must not be weakened | High |
| `packages/storage`, `mail`, `payment` | external-service ports | package exports | env-gated adapters | Medium |
| `scripts` | setup, generation, diagnostics, slice CLI, verification | root scripts | dependency-light control tooling | High |
| `docs/ai` | durable project/research/improvement memory | indexes and plans | active claims require evidence | High |

## Runtime and deployment units

- Primary runtime: Next.js 15 application in `apps/web`.
- Product Slice Engine: config parser, derived Zod validation, generic routes,
  explicit demo store, and owner/slice-scoped Postgres store.
- Supported auth selections: Supabase SSR and Better Auth.
- Portable data path: PostgreSQL through Drizzle and SQL migrations.
- Demo path: no configured auth/database, with visibly labeled memory behavior.
- Deployment recipes: Vercel and Docker.

## Critical journey traces

### Create an executable product slice

```text
pnpm slice:new -- --id=ideas --title="Idea Inbox"
→ update product/slices.json
→ registry validation at import/build
→ generic /app/slices/[sliceId] UI
→ server-derived Zod record validation
→ explicit demo memory or product_records Postgres table
→ owner + slice scoped list/delete
```

- Evidence: `product/slices.json`, `apps/web/src/lib/product-slices.ts`,
  `apps/web/src/lib/product-records-store.ts`, slice routes/actions, migration,
  CLI, unit tests, and E2E.
- Verification: unit/CLI/build pass; demo browser create/list/delete passes;
  focused Postgres owner/slice isolation passes on PR #5.
- Remaining dependency: the full auth-dependent portable browser job is still
  failing under issue #3.
- Promotion rule: replace JSONB/generic routes with specialized schema and code
  when relations, transactions, complex queries, or authorization demand it.

### Generate a product

```text
pnpm create -- name
→ copy foundation, AI system, and Product Slice Engine
→ seed IDEA.md and PROJECT_MODEL.md
→ rewrite project/capability identity
→ reset inherited verification to not-run
→ validate generated workflow and slice CLI
```

- Evidence: `scripts/create-shipkit.mjs`, `scripts/test-create-shipkit.mjs`.
- Verification: generated-project integration check passes.

### Email/password signup

```text
/login → LoginForm → validation + rate limit → AuthPort signup
→ session cookie → non-blocking welcome mail → /app
```

- Evidence: login UI and `apps/web/src/app/actions/auth.ts`.
- Current signal: portable browser E2E remains failing; issue #3 owns diagnosis.

### Notes

```text
/app/notes → user identity → validated action
→ Postgres when available, broad memory fallback otherwise
→ user-scoped list/write/delete
```

- Reliability risk: configured database errors can still be silently hidden by
  the notes fallback. The Product Slice Engine intentionally does not copy this
  behavior.

### Localization and billing

- Landing, login, and app shell use VI/EN dictionaries and locale switching.
- Billing is env-gated through the payment facade; live Stripe lifecycle remains
  unverified.
- Product Slice pages are currently English-only.

## Data and trust boundaries

| Data | Storage/use | Readers/writers | Guard | Risk |
|---|---|---|---|---|
| credentials/session | auth provider and cookies | auth actions/middleware | validation, rate limit, provider | High |
| Product Slice definitions | versioned JSON | build/runtime parser and CLI | strict registry schema | Medium |
| Product Slice records | JSONB Postgres or explicit demo memory | current owner and selected slice | server validation + owner/slice filters | High |
| profiles/notes | Postgres or demo memory | owner-scoped flows | user ID filters | High |
| service credentials | environment | server adapters | env policy | High |
| billing state | Stripe/noop facade | authenticated user | env gate | High |

## Build, test, release, rollback

| Capability | Command/workflow | Current result | Gap |
|---|---|---|---|
| Unit and contract checks | `pnpm test` | Pass on PR #5 | no coverage threshold |
| Slice CLI | `pnpm test:slices` | Pass | only starter contract shape covered |
| Build | `pnpm build` | Pass | none observed |
| Demo slice E2E | `E2E / demo mode` | Pass | memory is process-local by design |
| Slice Postgres isolation | `Product Slice / portable-pg` | Pass | not a browser/session test |
| Full portable browser E2E | `E2E / portable-pg` | Failing | issue #3; failure artifacts still weak |
| Generated project | AI workflow Action | Pass | no published package path yet |
| Deploy | docs + `check:deploy` | configuration check only | production not inspected |

## Architecture decisions and constraints

- Product Slice Engine is a validation accelerator, not an arbitrary no-code
  platform.
- Supported field types remain intentionally narrow: text, textarea, select.
- Configured database failures must surface; only absent database config enables
  memory mode.
- Generic records remain scoped by both owner ID and slice ID.
- Deployed migrations remain append-only.
- Security, auth, billing, production, destructive data, merge, and deploy need
  explicit gates.
- Agents deliver one bounded issue in a draft PR and update durable memory.

## Known hotspots

| Area | Signal | Impact | Confidence |
|---|---|---|---|
| Portable auth E2E | repeated failure | blocks full authenticated journey confidence | High |
| Notes DB fallback | broad catches use memory | can hide persistence failure | High |
| Product Slice JSONB | flexible generic payload | relational/query complexity can outgrow it | High |
| Product Slice i18n | pages use English copy | inconsistent VI/EN experience | High |
| TTFP | no measured first-slice benchmark | breakthrough speed claim is not quantified | High |
| Product definition | root `IDEA.md` remains demo-oriented | discovery can target the wrong product | High |

## Blind spots

- No production usage, analytics, support, interview, conversion, or cost data.
- No live Supabase, OAuth, Resend, S3, Stripe, or deploy verification.
- No measurement yet for config/CLI-to-working-slice time.
- No evidence yet for relationships, update flows, filters, files, or background
  work in the generic engine.
- Full authenticated browser isolation remains blocked by issue #3.

## Freshness log

| Section | Last checked | Next refresh trigger |
|---|---|---|
| Product Slice Engine | 2026-07-22 | every contract/runtime or verification change |
| Product/repository map | 2026-07-22 | product definition or package boundary changes |
| Auth/notes journeys | 2026-07-22 | issue #3 or data-store changes |
| Capability status | 2026-07-22 | every capability-affecting PR |
| CI baseline | 2026-07-22 | latest PR head/check result |
