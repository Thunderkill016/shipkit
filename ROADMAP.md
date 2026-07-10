# Roadmap

> **Nguồn sự thật:**  
> - Code audit: [`docs/DEVELOPMENT_PLAN.md`](./docs/DEVELOPMENT_PLAN.md)  
> - **Mốc thị trường (bắt buộc):** [`docs/COMPETITIVE_BENCHMARK.md`](./docs/COMPETITIVE_BENCHMARK.md)  
>
> Ưu tiên theo **gap vs Open SaaS / MakerKit / ShipFast**, không chỉ theo cảm tính.

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
- [x] E2E signup→session assert (portable-pg) — `e2e/auth-portable.spec.ts`  
- [x] Middleware Better Auth: `getSessionCookie` (edge-safe official)  

## v0.3 — Product completeness (partial)

- [x] StoragePort + local/S3 adapters (profile upload uses storage)  
- [x] MailPort + console/Resend + **welcome mail on signup**  
- [x] Profile page + store (DB + memory fallback)  
- [x] SEO helpers + JsonLd  
- [x] Notes persist Postgres + user isolation (memory fallback)  
- [x] Payment: Stripe adapter + `/app/billing` (env-gated)  
- [x] Wire i18n vi/en (landing, login, app + switcher)  
- [x] Landing pricing + FAQ (ShipFast shell)  
- [x] E2E notes isolation + i18n smoke  
- [x] `pnpm db:migrate`

## v0.4 — Đủ xài (usable) ✅

Mức **dùng được mỗi ngày** cho vibe product — không claim “best-in-class vs MakerKit”.

- [x] `pnpm ready` one-path  
- [x] `docs/QUICKSTART.md`  
- [x] Demo / portable / supabase presets rõ  
- [x] Auth + notes + profile + billing (optional Stripe)  
- [x] `/api/health`  
- [x] Doctor không fail oan ở demo  

## v1.0 — Best-in-class OSS kit (chưa đạt)

Chỉ claim v1.0 khi đủ DoD trong `docs/DEVELOPMENT_PLAN.md` + benchmark score ≥ 4.2.

- [ ] Admin tối thiểu / showcase  
- [ ] App adapter #2 (optional)  
- [ ] npm create-shipkit publish  

## P2 — ShipFast TTP + ops (done this sprint)

- [x] Doctor v3 checklist + score  
- [x] `pnpm setup -- --preset=...` env wizard  
- [x] `pnpm check:deploy` production gates  
- [x] `vercel.json` + deploy button docs  
- [x] Optional Sentry (DSN + instrumentation + logger)  
- [x] E2E harden (127.0.0.1, retries, demo vs auth split)  

## Later

- [ ] App adapter #2 (Nuxt **hoặc** TanStack) — sau kernel ổn  
- [ ] npm `create-shipkit` publish  

## Principles

1. Vibe speed &gt; feature count  
2. Security baseline never regresses  
3. One polished path before five half paths  
4. Research → implement → test → ship  
5. **Docs must not claim more than code**  
