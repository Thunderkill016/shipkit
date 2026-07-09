# Preset: `portable-pg`

**Vendor-light path** — any Postgres URL; auth adapter `better-auth` lands in v0.2.

| Layer | Choice today (v0.1) |
|-------|---------------------|
| DB | Docker Postgres (`pnpm db:up`) or Neon/Railway URL |
| Auth | Still Supabase **or** wait for Better Auth adapter |
| Deploy | Docker host for app + managed PG |

## Setup DB

```bash
pnpm db:up
# DATABASE_URL=postgresql://shipkit:shipkit@localhost:5432/shipkit
```

Schema: `packages/db/sql/0001_init.sql` (auto-applied on first compose).

## Note

v0.1 prioritizes the **Supabase auth adapter** for a working login loop.  
`@shipkit/db` schema is already portable; wire Drizzle client + Better Auth in v0.2 without changing feature routes.
