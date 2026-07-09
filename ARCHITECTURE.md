# Shipkit — Architecture

## Mental model

```text
apps/web          → Next.js adapter (UI + routing glue)
packages/*        → Kernel (framework-agnostic where possible)
presets/*         → Opinionated combos for users
deploy recipes    → Docker, Vercel (docs + config files)
```

## Ports (contracts)

| Port | Responsibility |
|------|----------------|
| `AuthPort` | session, sign-in/up, sign-out, getUser |
| `DatabasePort` | typed queries; user-scoped by default |
| `StoragePort` | upload/download (later) |
| `MailPort` | transactional email (later) |
| `RateLimitPort` | check(key) → allow/deny |

App code depends on ports. Adapters implement ports.

## Packages

| Package | Role |
|---------|------|
| `@shipkit/config` | Env schema, `kit.config` types, presets |
| `@shipkit/security` | Headers policy, in-memory rate limit, base Zod schemas |
| `@shipkit/db` | Drizzle schema (`profiles`), client factory for Postgres URL |
| `@shipkit/auth` | Port types + adapter IDs (`supabase` \| `better-auth` planned) |

## Adapters (v0)

| Kind | v0 ship |
|------|---------|
| Auth | `supabase` (wired in `apps/web`) |
| DB | Postgres via Supabase **or** `DATABASE_URL` (Docker) |
| Deploy | `docker-compose.yml` + Vercel project docs |
| Rate limit | memory always; Upstash when env set |

## Dependency rule

```text
apps/web  →  packages/*
packages/*  ↛  next, react, vue   (except thin type-only where unavoidable)
features in apps  ↛  @supabase/* outside lib/adapters/*
```

## Presets

See `presets/`. CLI (later) only copies env + docs for a preset; architecture stays the same.
