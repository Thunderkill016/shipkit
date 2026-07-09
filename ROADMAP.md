# Roadmap

## v0.1 — Foundation ✅

- Monorepo kernel + Next adapter  
- Landing / login / app shell  
- Supabase auth adapter  
- Security headers + Zod + rate limit  
- IDEA.md + AGENTS.md + vibe docs  
- Docker Postgres + doctor  

## v0.2 — Portable auth + quality

- [x] Research notes + agent skills (SKILL.md)  
- [x] Better Auth + Drizzle portable adapter  
- [x] AUTH_ADAPTER auto/supabase/better-auth  
- [x] create-shipkit CLI (`pnpm create -- name`)  
- [x] Unit tests (security) + CI runs tests  
- [x] Error / not-found pages  
- [ ] Playwright e2e smoke  
- [ ] CI matrix both presets with real services  

## v0.3 — Product completeness

- [ ] StoragePort (S3-compatible)  
- [ ] MailPort (Resend/SMTP)  
- [ ] Profile settings UI  
- [ ] SEO helpers (OG, JSON-LD)  
- [ ] Rate limit Upstash adapter  

## v1.0 — Best-in-class OSS kit

- [ ] Measured TTFP guide (< 60 min cold start)  
- [ ] Two auth paths L2 + two deploy L2  
- [ ] Adapter contribution guide  
- [ ] Optional second app adapter  

## Principles for prioritization

1. **Vibe speed** > feature count  
2. **Security baseline** never regresses  
3. **One polished path** before five half paths  
4. Research → note → implement → test → ship  
