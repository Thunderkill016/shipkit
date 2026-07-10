# Shipkit — Hiện trạng & Kế hoạch phát triển

> Tài liệu này bám **code thật** (audit ~2026-07).  
> `ROADMAP.md` hiện đánh dấu nhiều mục “xong” ở mức **contract/docs**; bảng dưới phân biệt **shipped / partial / missing**.

---

## 1. Tóm tắt điều hành

| Hạng mục | Đánh giá |
|----------|----------|
| **Vị trí sản phẩm** | Product foundation kit cho vibe coding (không phải HTTP micro-framework) |
| **Độ chín** | **MVP solid (~v0.2–v0.3)** — foundation dùng được; chưa “best-in-class v1.0” thực sự |
| **Build** | Monorepo pnpm, `pnpm build` app Next |
| **Tests** | Unit packages + e2e demo + CI portable-pg service |
| **Rủi ro lớn** | Docs/ROADMAP over-claim; notes demo còn in-memory; payment/i18n chưa gắn product UI; multi-framework chỉ là guide |

**North star (giữ nguyên):**  
Time-to-first-product (TTFP) &lt; 60 phút + agent làm feature từ `IDEA.md` không phá stack.

---

## 2. Bản đồ codebase hiện tại

```text
shipkit/
├── apps/web/                 # Next.js 15 — UI adapter duy nhất
│   ├── e2e/                  # Playwright smoke
│   └── src/
│       ├── app/              # /, /login, /app, /app/notes, /app/profile, api/auth
│       ├── lib/adapters/     # better-auth, supabase
│       └── lib/*             # auth, db, mail, storage, seo, notes/profile stores
├── packages/
│   ├── auth                  # AuthPort interface
│   ├── config                # env schema + presets types
│   ├── db                    # Drizzle profiles + SQL migrations
│   ├── security              # headers, Zod, rate-limit (+ Upstash)
│   ├── storage               # StoragePort + local + S3
│   ├── mail                  # MailPort + console + Resend
│   ├── payment               # PaymentPort + noop only
│   ├── logger                # LoggerPort
│   └── i18n                  # dictionary vi/en (chưa wire UI)
├── presets/                  # supabase-full, portable-pg
├── .agents/skills/           # 4 skills vibe
├── scripts/                  # doctor, create-shipkit
└── docs/                     # TTFP, deploy, security, adapters, multi-fw, …
```

### Luồng request (đã có)

```text
Browser → middleware (auth guard) → pages/actions
                ↓
         getAuth() / getStorage() / getMailer()
                ↓
         adapters (env-selected) → Postgres / Supabase / S3 / Resend
```

---

## 3. Audit chi tiết theo layer

### 3.1 App surface (`apps/web`)

| Feature | Trạng thái | Ghi chú code |
|---------|------------|--------------|
| Landing `/` | ✅ | Vibe messaging, links |
| Login/signup email | ✅ | Server actions + Zod + rate limit |
| OAuth Google/GitHub buttons | ✅ partial | UI + Better Auth socialProviders; cần env; Supabase OAuth path riêng |
| Protected `/app` | ✅ | Demo mode nếu no auth |
| Notes example | ⚠️ demo | **In-memory only** (`notes-store.ts`) — không persist, không multi-instance |
| Profile | ✅ partial | DB nếu `DATABASE_URL` + memory fallback; upload qua StoragePort |
| SEO / JsonLd | ✅ | `lib/seo.ts`, `components/jsonld.tsx` |
| Error / loading / 404 | ✅ | Có |
| i18n trên UI | ❌ | Package có, pages hardcode EN |

### 3.2 Auth

| Path | Trạng thái |
|------|------------|
| `AUTH_ADAPTER` auto / supabase / better-auth | ✅ |
| Supabase SSR cookies + callback | ✅ |
| Better Auth + Drizzle + `/api/auth/[...all]` | ✅ |
| OAuth Better Auth (env-gated) | ✅ code |
| Middleware session BA | ⚠️ cookie name heuristic (không verify session server-side trong MW) |
| Auth e2e với DB thật | ⚠️ CI job portable-pg chạy smoke UI; chưa assert signup→session đầy đủ |

### 3.3 Data

| Hạng mục | Trạng thái |
|----------|------------|
| `profiles` schema + SQL | ✅ |
| Supabase RLS sample | ✅ SQL file |
| Profile read/write Drizzle | ✅ với fallback memory |
| Domain entity mẫu (notes) trên Postgres | ❌ still memory |
| Migration tooling (drizzle-kit workflow docs + script) | ⚠️ SQL thủ công, chưa first-class CLI migrate |

### 3.4 Ports & adapters

| Port | Interface | Adapter thật | Wire vào app |
|------|-----------|--------------|--------------|
| Auth | ✅ | Supabase, Better Auth | ✅ `getAuth()` |
| Security / rate limit | ✅ | Memory + Upstash | ✅ auth actions |
| Storage | ✅ | Local + S3 | ✅ profile upload |
| Mail | ✅ | Console + Resend | ⚠️ `getMailer()` có nhưng **chưa dùng** trong auth/welcome flow |
| Payment | ✅ | **Noop only** | ❌ không UI billing |
| Logger | ✅ | package | ⚠️ chưa chuẩn hóa khắp app |
| i18n | ✅ | dict en/vi | ❌ chưa dùng trong pages |

### 3.5 DX / vibe / docs

| Hạng mục | Trạng thái |
|----------|------------|
| README song ngữ (trái ngành) | ✅ |
| IDEA.md + AGENTS.md + skills | ✅ |
| doctor / create CLI | ✅ |
| TTFP guide | ✅ |
| ADAPTER_GUIDE / DEPLOY / SECURITY | ✅ |
| MULTI_FRAMEWORK | 📄 docs only — **không có** `apps/nuxt` |
| ROADMAP accuracy | ⚠️ over-complete vs code |

### 3.6 Quality gates

| Gate | Trạng thái |
|------|------------|
| Unit tests (security, storage, mail, logger, i18n, profile) | ✅ ~17 tests |
| E2E demo mode | ✅ Playwright smoke |
| E2E portable-pg service in CI | ✅ job có Postgres service |
| E2E supabase-full real keys | ❌ secrets optional, chưa full matrix |
| Typecheck/build CI | ✅ |
| Coverage thresholds | ❌ |

---

## 4. Gap phân tích (ưu tiên theo impact vibe)

### P0 — Foundation đúng sự thật (trust)

1. **Chỉnh ROADMAP** cho khớp code (tránh “v1.0 done” giả).  
2. **Notes → Postgres** (hoặc đổi label rõ “demo memory only” + skill path).  
3. **Middleware Better Auth**: verify session (gọi API) thay vì chỉ check cookie name.  
4. **E2E auth happy path** portable-pg: sign-up → cookie → `/app` sees email.

### P1 — Vibe speed (user/agent ship idea)

5. **Wire i18n** tối thiểu landing + login (vi/en) — demo “đa ngôn ngữ” thật.  
6. **Dùng MailPort** sau sign-up (console/Resend) — agent thấy pattern end-to-end.  
7. **Stripe PaymentPort adapter** (optional env) + `/app/billing` stub.  
8. **`pnpm db:migrate`** script áp SQL / drizzle-kit documented.  
9. **IDEA templates** (SaaS / portfolio / internal tool) trong `templates/ideas/`.

### P2 — Production depth

10. Observability: Sentry wiring thật theo `docs/SENTRY.md` (optional env).  
11. CSRF / honeypot / captcha hook cho auth public.  
12. RBAC nhẹ (`role` trên profile) nếu IDEA cần.  
13. Webhook handler Stripe.  
14. Key rotation runbook đã có — thêm doctor checks cho secret length/expiry hints.

### P3 — Multi-platform / scale OSS

15. **App adapter #2** (chọn **một**: Nuxt *hoặc* TanStack) — chỉ khi kernel ổn P0–P1.  
16. Publish npm packages optional (`create-shipkit` standalone).  
17. Template gallery / showcase apps.  
18. Graphite/PR stack contribution guide.

---

## 5. Kế hoạch theo phase (đề xuất chỉnh lại)

### Phase A — “Honest MVP” (1–2 tuần)

**Mục tiêu:** Người lạ tin docs; cold start ổn định.

| # | Việc | Done when |
|---|------|-----------|
| A1 | Sửa ROADMAP + ARCHITECTURE (BA OAuth, mail/storage real) | Docs = code |
| A2 | E2E: sign-up Better Auth trên CI Postgres | Test green |
| A3 | Harden BA middleware session | Không bypass bằng cookie giả |
| A4 | Notes dual-mode: memory demo **hoặc** table `notes` + user_id | Persist khi có DB |
| A5 | `pnpm doctor` check thêm GOOGLE/GITHUB optional, RESEND, S3 | Clear hints |

### Phase B — “Vibe complete” (2–4 tuần)

**Mục tiêu:** Agent implement IDEA end-to-end với pattern đầy đủ.

| # | Việc | Done when |
|---|------|-----------|
| B1 | i18n trên landing/login/app shell | Toggle vi/en |
| B2 | Welcome email via getMailer() | Console log hoặc Resend |
| B3 | Stripe adapter + billing stub page | Env-gated |
| B4 | IDEA templates + skill update | 3 templates |
| B5 | TTFP video/script đo lại | &lt; 60m documented evidence |

### Phase C — “Production kit” (1–2 tháng)

| # | Việc |
|---|------|
| C1 | Sentry + structured logger default |
| C2 | Full RLS + isolation e2e |
| C3 | Deploy one-click (Vercel button + compose.prod verified) |
| C4 | Security audit pass (checklist automated subset) |

### Phase D — “Multi-framework” (chỉ sau C)

| # | Việc |
|---|------|
| D1 | Chọn Nuxt **hoặc** TanStack Start |
| D2 | `apps/<fw>` minimal: home + login bridge via AuthPort |
| D3 | CI build app #2 |

**Không** làm 3 framework song song (bài học supastarter).

---

## 6. Nguyên tắc ưu tiên (giữ)

1. **Vibe speed** &gt; feature count  
2. **Security baseline** không regress  
3. **Một path bóng** trước năm path dở  
4. Research → note → implement → test → ship  
5. **Docs không được claim hơn code** (mới — bắt buộc)

---

## 7. Definition of Done — v1.0 “thật”

Shipkit chỉ được gọi **v1.0** khi:

- [ ] TTFP Supabase + portable đo được &lt; 60 phút (có checklist verify)  
- [ ] Hai auth path e2e green trên CI (demo + portable-pg signup)  
- [ ] Domain example **persist** (notes hoặc tương đương) với user isolation  
- [ ] Mail + Storage được dùng trong ít nhất 1 user flow  
- [ ] Payment: Stripe adapter env-gated **hoặc** docs rõ “noop until configure” không claim billing done  
- [ ] ROADMAP/README khớp audit  
- [ ] Multi-framework: **docs OK**; code adapter #2 optional, không bắt buộc v1.0  

---

## 8. Gợi ý sprint tiếp theo (immediate)

**Sprint 1 (khuyến nghị):**

1. A1 Docs honesty (ROADMAP fix)  
2. A2–A3 Auth e2e + middleware  
3. A4 Notes → DB when `DATABASE_URL`  

**Sprint 2:**

4. B1 i18n wire  
5. B2 Mail on signup  
6. B3 Stripe stub  

---

## 9. Phụ lục — Lệnh kiểm tra nhanh

```bash
pnpm install
pnpm test
pnpm build
pnpm doctor
pnpm test:e2e          # cần Playwright browsers
pnpm db:up             # portable path
```

---

## 10. Kết luận

Shipkit **đã có xương sống đúng hướng**: monorepo ports, dual auth, security, vibe DX, docs song ngữ, CI.

Để thành “framework tốt nhất cho vibe coding”, không cần thêm feature ồ ạt — cần:

1. **Khép vòng** demo → production pattern (notes DB, mail used, billing real-or-honest)  
2. **Chất lượng auth e2e**  
3. **Docs trung thực**  
4. **Multi-framework sau**, không trước  

Tài liệu này là baseline cho các session dev tiếp theo.
