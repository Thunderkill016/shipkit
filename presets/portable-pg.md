# Preset: `portable-pg`

Own your database URL — Docker, Neon, Railway, RDS, etc.

| Layer | Choice today |
|-------|----------------|
| DB | Any Postgres (`DATABASE_URL`) |
| Auth | Supabase adapter still works if configured; **Better Auth** path is next |
| Deploy | Docker for DB + app host of choice |

## Local DB

```bash
pnpm db:up
# DATABASE_URL=postgresql://shipkit:shipkit@localhost:5432/shipkit
```

Init SQL: `packages/db/sql/0001_init.sql` (applied on first compose).

## Vibe tip

Use this preset when you care about **portability** or company policy blocks a BaaS.  
Keep product code on ports so switching auth later is an adapter change.
