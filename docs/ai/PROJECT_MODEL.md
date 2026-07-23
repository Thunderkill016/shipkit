# Project model — Shipkit

Status: verified snapshot  
Last verified: 2026-07-22  
Coverage: product intent, repository units, generator, auth, notes, i18n, billing, health, CI, and AI workflow  
Autonomy level used: A3

This is a compact evidence-backed map. It does not claim production, analytics,
Supabase-live, OAuth-provider, Resend-delivery, Stripe-webhook, or deploy-runtime
coverage.

## Product

- Mission: reduce repeated foundation work so AI-assisted builders can reach a
  verified product slice quickly without replacing auth, security, data, or
  deploy architecture.
- Current target: builders launching small web products with AI coding agents.
- Core outcome: a stranger can start from the kit, configure a primary path, and
  complete a domain action quickly.
- Current product ambiguity: root `IDEA.md` describes a demo product rather than
  Shipkit itself; this remains a human product decision.
- Evidence: `README.md`, `IDEA.md`, `ROADMAP.md`, `ARCHITECTURE.md`.

## Repository structure

| Area | Purpose | Entry points | Boundary | Evidence | Confidence |
|---|---|---|---|---|---|
| `apps/web` | Next.js product adapter | routes under `src/app` | vendor integrations through app adapters/facades | `apps/web/package.json` | High |
| `packages/auth` | AuthPort | package exports | app chooses Supabase or Better Auth | `ARCHITECTURE.md` | Medium |
| `packages/db` | Drizzle schema and SQL | schemas/migrations | forward migrations | `packages/db` | High |
| `packages/security` | validation, headers, rate limits | package exports | security must not be weakened | `AGENTS.md` | High |
| `packages/storage`, `mail`, `payment` | external-service ports | package exports | env-gated adapters | app integration files | Medium |
| `scripts` | setup, diagnostics, generation, verification | root package scripts | dependency-free control tooling where practical | `package.json` | High |
| `docs/ai` | durable agent memory | workflow index, plans, research, improvements | active claims require evidence | `AI_WORKFLOW.md` | High |

## Runtime and deployment units

- Primary runtime: Next.js 15 application in `apps/web`.
- Supported auth selections: Supabase SSR and Better Auth.
- Portable data path: PostgreSQL through Drizzle.
- Demo path: no configured auth/database, with visible demo behavior.
- Deployment recipes: Vercel and Docker.
- External integrations represented in code: Supabase, Better Auth, Postgres,
  S3-compatible storage, Resend, Stripe, and optional observability.

## Critical journey traces

### Generate a product

```text
pnpm create -- name
→ copy repository foundation
→ seed IDEA.md and docs/ai/PROJECT_MODEL.md
→ rewrite package identity
→ validate generated workflow
```

- Evidence: `scripts/create-shipkit.mjs`, `scripts/test-create-shipkit.mjs`.
- Verification: AI workflow check run 7 passed.
- Risk found during workflow development: recursive self-copy when destination is
  inside the source; fixed and covered by the generator integration test.

### Email/password signup

```text
/login → localized LoginForm → signUpAction
→ Zod validation → rate limit → AuthPort signup
→ non-blocking MailPort welcome message → /app
```

- Evidence: `apps/web/src/app/login/page.tsx`,
  `apps/web/src/app/login/login-form.tsx`, `apps/web/src/app/actions/auth.ts`.
- Trust boundary: credentials cross a server action and selected auth adapter.
- Current signal: the portable-pg E2E failed on PR #1 and failed again when the failed job was rerun; issue #3 tracks diagnosis.
- Unknown: exact failing test/assertion because the CI run retained no accessible
  Playwright artifact.

### Notes

```text
/app/notes → user identity → validated action
→ notes store → Postgres when available, memory fallback otherwise
→ user-scoped list/write/delete
```

- Evidence: `apps/web/src/lib/notes-store.ts`,
  `apps/web/e2e/notes-isolation.spec.ts`.
- Authorization: every query/mutation includes user ID.
- Reliability risk: all database errors are caught and silently fall back to
  memory, including errors other than an intentionally absent demo database.

### Localization

```text
request locale → getI18n → translated strings → LocaleSwitcher
```

- Evidence: landing, login, and app-shell pages.
- Verification: demo-mode E2E passed in PR #1 CI run 22.

### Billing

```text
/app/billing → current user → PaymentPort
→ Stripe adapter when configured, noop/free state otherwise
```

- Evidence: `apps/web/src/app/app/billing/page.tsx`, payment facade/package.
- Blind spot: webhook lifecycle and live Stripe environment are not verified.

## Data and trust boundaries

| Data or secret | Source | Storage/use | Readers/writers | Guard | Risk |
|---|---|---|---|---|---|
| email/password | login forms | auth provider/database | server actions + auth adapter | Zod + rate limit | High |
| session cookie | auth adapter | browser/server | middleware/server components | provider behavior | High |
| profiles/notes | authenticated user | Postgres or explicit demo memory | owner-scoped app flows | user ID filters | High |
| service credentials | environment | adapter initialization | server only | `.env` policy | High |
| billing state | Stripe/noop adapter | external/local response | authenticated user | env gate | High |

## Build, test, release, rollback

| Capability | Command/workflow | Current result | Gap |
|---|---|---|---|
| Install | `pnpm install --frozen-lockfile` | Pass in CI run 22 | none observed |
| Unit tests | `pnpm test` | Pass in CI run 22 | no repository coverage threshold |
| Build | `pnpm build` | Pass in CI run 22 | none observed |
| Demo E2E | CI `E2E / demo mode` | Pass | limited to demo journey |
| Portable E2E | CI `E2E / portable-pg` | Failed on initial run and failed-job rerun | Failure detail/artifact not retained; issue #3 |
| AI workflow | `pnpm check:ai` / dedicated Action | Pass before this dogfood change | capability truth not yet checked mechanically |
| Deploy | docs + `check:deploy` | configuration check only | no production deployment inspected |
| Rollback | Git/PR + deployment-specific procedures | not exercised | environment-specific |

## Architecture decisions and constraints

- Product code should remain in `apps/web`; foundation ports live in packages.
- Vendor-specific calls remain behind adapters/facades.
- Security, auth, data, billing, production, and destructive actions require
  explicit gates.
- Agents must implement one bounded issue and open a draft PR rather than merge.
- Repository knowledge should be structured, linked, and mechanically checked.

## Known hotspots

| Area | Signal | Impact | Evidence | Confidence |
|---|---|---|---|---|
| Documentation truth | roadmap and development plan disagree about completed capabilities | agents can plan obsolete work | active docs vs current code | High |
| Notes DB fallback | broad catches fall through to memory | configured persistence failures can be hidden | `notes-store.ts` | High |
| Portable E2E reliability | initial run and failed-job rerun failed | merge signal and auth confidence are weakened | GitHub Actions run 22 / issue #3 | High |
| Product definition | root `IDEA.md` still defines a demo shell | research may optimize the wrong product | `IDEA.md` | High |
| Completion gate | main CI runs test/build but not root `pnpm verify` | local and remote gates can drift | workflow/package scripts | High |
| TTFP claim | no recent measured artifact | north-star claim is not proven | docs only | Medium |

## Blind spots

- No production, analytics, support, customer interview, or cost data.
- No live Supabase, OAuth, Resend, S3, Stripe, or deployment verification.
- Not every package implementation was read symbol by symbol.
- Exact portable-pg E2E failure is unknown until issue #3 retains artifacts.
- Dependency advisories and licenses were not audited in this cycle.

## Freshness log

| Section | Last checked | Next refresh trigger |
|---|---|---|
| Product/repository map | 2026-07-22 | product definition or package boundary changes |
| Auth/notes journeys | 2026-07-22 | issue #3 or data-store changes |
| Capability status | 2026-07-22 | every capability-affecting PR |
| CI baseline | 2026-07-22 | latest PR head/check result |
