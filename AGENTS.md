# AGENTS.md — Shipkit

## What this is

Open **product foundation kit** (landing, auth, DB, security, deploy).  
Not an HTTP micro-framework. Not multi-framework parity on day one.

## Stack (v0)

- Monorepo: `apps/web` (Next.js) + `packages/*` (kernel)
- Auth: Supabase adapter behind `AuthPort`
- Security: `@shipkit/security` headers + rate limit + Zod
- Docs: `VISION.md`, `ARCHITECTURE.md`, `STANDARDS.md`, `DECISIONS.md`

## Commands

```bash
pnpm install
pnpm doctor
pnpm dev          # apps/web
pnpm build
pnpm db:up        # docker postgres
```

## Rules

1. **Vendor SDKs only in** `apps/web/src/lib/adapters/**`  
2. **Do not** import `@supabase/*` from pages/features directly — use `getAuth()` / ports  
3. **Do not** disable security headers or RLS examples without updating SECURITY notes  
4. Prefer small PRs; keep domain business out of kernel packages  
5. New deploy/auth providers = new adapter + preset doc + doctor hints  

## Boundaries

| Always | Ask first | Never |
|--------|-----------|-------|
| Keep ports stable | Add second UI framework | Commit secrets |
| Add tests for authz | Rewrite monorepo tool | Put Stripe in v0 without issue |
| Update AGENTS if commands change | Drop Supabase support | Claim L2 support without CI |

## Map

```
packages/config     env + presets types
packages/security   headers, rate limit, validation
packages/db         drizzle schema + SQL
packages/auth       AuthPort types
apps/web            Next adapter + UI
presets/            human setup guides
```
