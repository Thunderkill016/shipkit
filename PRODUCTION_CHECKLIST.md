# Production checklist

## Universal

- [ ] Secrets only in env / host secret store  
- [ ] `NEXT_PUBLIC_*` has no private keys  
- [ ] Security headers enabled (`next.config` → `@shipkit/security`)  
- [ ] Zod (or equivalent) on all write actions  
- [ ] Rate limit on auth / sensitive writes  
- [ ] Error pages do not leak stacks  
- [ ] HTTPS + correct `NEXT_PUBLIC_APP_URL`  

## Supabase

- [ ] RLS enabled on all public tables  
- [ ] Policies use `(select auth.uid())`  
- [ ] Auth redirect URLs production allowlisted  
- [ ] Service role only on server  

## Deploy

### Vercel

- [ ] Project linked to GitHub  
- [ ] Env vars set for Production + Preview  
- [ ] Build: `pnpm --filter @shipkit/web build` (or root install + filter)

### Docker

- [ ] Postgres reachable from app  
- [ ] `DATABASE_URL` / Supabase env injected  
- [ ] Healthcheck on app process  

## Smoke

- [ ] Landing 200  
- [ ] Sign up / sign in / sign out  
- [ ] `/app` rejects anonymous when auth configured  
