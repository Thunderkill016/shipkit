# Preset: `supabase-full`

**AtoEnglish-like path** — fastest if you already use Supabase.

| Layer | Choice |
|-------|--------|
| Auth | Supabase Auth (email + OAuth ready) |
| DB | Supabase Postgres + RLS SQL in `packages/db/sql/0002_supabase_rls.sql` |
| App | `apps/web` (Next.js) |
| Deploy | Vercel (primary) or Docker (Next standalone later) |

## Setup

1. Create Supabase project  
2. `cp .env.example apps/web/.env.local` — fill URL + anon key  
3. Run profiles table + RLS SQL in Supabase SQL editor  
4. Auth → URL config: `http://localhost:3000/auth/callback`  
5. `pnpm dev`  

## Production

- Enable email confirm as needed  
- Set production site URL + redirect allowlist  
- Never expose service role to the client  
- Keep using `securityHeaders` from `@shipkit/security`
