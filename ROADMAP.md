# Roadmap

> **Nguồn sự thật chi tiết:** [`docs/DEVELOPMENT_PLAN.md`](./docs/DEVELOPMENT_PLAN.md) (audit code).  
> Dưới đây là trạng thái **trung thực** — không đánh dấu xong nếu chỉ có interface/docs.

## v0.1 — Foundation ✅

- Monorepo kernel + Next adapter  
- Landing / login / app shell  
- Supabase auth adapter  
- Security headers + Zod + rate limit  
- IDEA.md + AGENTS.md + vibe docs  
- Docker Postgres + doctor  

## v0.2 — Portable auth + quality ✅ (gần hoàn)

- [x] Better Auth + Drizzle + AUTH_ADAPTER switch  
- [x] Agent skills + create CLI  
- [x] Unit tests + Playwright demo e2e  
- [x] Auth rate limit + Upstash factory  
- [x] CI: test/build + e2e demo + portable-pg service job  
- [ ] E2E signup→session assert (portable-pg) — **còn**  
- [ ] Middleware Better Auth verify session (không chỉ cookie name) — **còn**  

## v0.3 — Product completeness (partial)

- [x] StoragePort + local/S3 adapters (profile upload uses storage)  
- [x] MailPort + console/Resend (**chưa** gọi trong signup flow)  
- [x] Profile page + store (DB + memory fallback)  
- [x] SEO helpers + JsonLd  
- [ ] Notes example persist on Postgres (hiện **in-memory**)  
- [ ] Wire i18n vào UI  
- [ ] Payment: Stripe adapter (hiện **noop only**)  

## v1.0 — Best-in-class OSS kit (chưa đạt)

Chỉ claim v1.0 khi đủ DoD trong `docs/DEVELOPMENT_PLAN.md` §7.

- [ ] TTFP đo được &lt; 60 phút (evidence)  
- [ ] Hai auth path e2e solid  
- [ ] Domain example có isolation + persist  
- [ ] Mail dùng trong 1 user flow  
- [ ] Billing honest (Stripe env-gated **hoặc** không claim)  
- [ ] Docs = code  

## Later

- [ ] App adapter #2 (Nuxt **hoặc** TanStack) — sau kernel ổn  
- [ ] Sentry default wiring  
- [ ] npm `create-shipkit` publish  

## Principles

1. Vibe speed &gt; feature count  
2. Security baseline never regresses  
3. One polished path before five half paths  
4. Research → implement → test → ship  
5. **Docs must not claim more than code**  
