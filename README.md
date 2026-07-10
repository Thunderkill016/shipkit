# ✦ Shipkit

**Bộ khung sản phẩm mở cho vibe coding** · **Open product kit for vibe coding**

Từ **ý tưởng → landing + đăng nhập + app + database + bảo mật + deploy** — không dựng lại nền mỗi lần.  
MIT · Node ≥ 20 · Next.js · portable Postgres / Supabase

[![License: MIT](https://img.shields.io/badge/License-MIT-7dd3c0.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](./package.json)

---

## ⚡ Chạy ngay

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit && pnpm install

# A) Xem UI (không cần Docker)
pnpm ready && pnpm dev

# B) Auth + notes thật (cần Docker) — khuyến nghị
pnpm ready -- --preset=portable-pg
pnpm db:up && pnpm db:migrate
pnpm dev
```

Mở **http://localhost:3000**

| URL | Việc |
|-----|------|
| `/` | Landing (VI \| EN) |
| `/login` | Đăng ký / đăng nhập |
| `/app` | Shell sau login |
| `/app/notes` | Notes (lưu DB, tách theo user) |
| `/app/profile` | Hồ sơ + avatar |
| `/app/billing` | Stripe (nếu có env) |
| `/api/health` | Health check |

**Hướng dẫn ngắn:** [docs/QUICKSTART.md](./docs/QUICKSTART.md) · **Deploy:** [docs/DEPLOY.md](./docs/DEPLOY.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FThunderkill016%2Fshipkit&project-name=shipkit&repository-name=shipkit)

---

## Shipkit là gì?

| Việc ai cũng phải làm | Shipkit |
|------------------------|---------|
| Landing / SEO | ✅ |
| Auth (email, OAuth tùy chọn) | ✅ Supabase **hoặc** Better Auth |
| App sau login | ✅ `/app/*` |
| Database | ✅ Postgres (Docker / Neon / Supabase…) |
| Bảo mật cơ bản | ✅ CSP, Zod, rate-limit |
| Mail / file | ✅ Resend hoặc console · S3 hoặc local |
| Billing | ✅ Stripe khi set env (không bắt buộc) |
| AI / vibe | ✅ `IDEA.md` + `AGENTS.md` + skills |
| Deploy | ✅ Vercel + Docker |

**Việc của bạn:** sửa `IDEA.md` → nhờ AI làm tính năng trong `/app` → deploy.

Không phải HTTP micro-framework. Không phải app chat đóng (Lovable). Code **thuộc về bạn**.

---

## 🇻🇳 Hướng dẫn nhanh (kể cả người trái ngành)

### Cài một lần

1. **Node.js LTS** — https://nodejs.org → `node -v`  
2. **pnpm** — `npm install -g pnpm`  
3. **Git** — https://git-scm.com  
4. **Docker** (nếu chọn path B) — https://docker.com  
5. **Cursor** (khuyên) — https://cursor.com để vibe với AI  

### Path A — Chỉ xem giao diện

```bash
pnpm install
pnpm ready          # tạo apps/web/.env.local demo
pnpm dev
```

### Path B — Đăng nhập + ghi chú thật (Docker)

```bash
pnpm install
pnpm ready -- --preset=portable-pg
pnpm db:up && pnpm db:migrate
pnpm doctor
pnpm dev
```

1. Vào `/login` → tạo tài khoản  
2. `/app/notes` → thêm ghi chú  
3. Sửa **`IDEA.md`** → chat AI:

> Đọc `IDEA.md` và `AGENTS.md`. Làm mục MVP tiếp theo trong `/app`. Không đổi framework.

### Path C — Supabase (không Docker)

```bash
pnpm ready -- --preset=supabase-full
# Dán URL + anon key vào apps/web/.env.local
# SQL Editor: 0001_init, 0002_supabase_rls, 0004_notes, 0005_notes_rls
# Auth redirect: http://localhost:3000/auth/callback
pnpm doctor && pnpm dev
```

### Lệnh hay dùng

| Lệnh | Việc |
|------|------|
| `pnpm ready` | Setup env + doctor + hướng dẫn path |
| `pnpm setup -- --preset=…` | Sinh `.env.local` (`demo` / `portable-pg` / `supabase-full`) |
| `pnpm doctor` | Checklist cấu hình (điểm /100) |
| `pnpm dev` | Chạy local |
| `pnpm build` | Build production |
| `pnpm check:deploy` | Gate trước production |
| `pnpm create -- my-app` | Clone kit sang project mới |
| `pnpm db:up` / `db:migrate` | Postgres local |

### Lỗi thường gặp

| Hiện tượng | Cách xử |
|------------|---------|
| `pnpm: not found` | `npm install -g pnpm` |
| Đăng nhập fail | `pnpm doctor` — thiếu env / secret ngắn |
| Portable không vào `/app` | `pnpm db:up && pnpm db:migrate` rồi restart `pnpm dev` |
| Đổi `.env` không ăn | `Ctrl+C` → `pnpm dev` lại |
| AI sửa lung tung | Nhắc: đọc `IDEA.md` + `AGENTS.md` |

Chi tiết dài (từ điển, Vercel từng bước): phần dưới + [docs/QUICKSTART.md](./docs/QUICKSTART.md).

---

## 🇬🇧 English overview

### Presets

| Preset | When | Command |
|--------|------|---------|
| `demo` | UI only | `pnpm ready` |
| `portable-pg` | Own Postgres + Better Auth | `pnpm ready -- --preset=portable-pg` |
| `supabase-full` | Managed Supabase | `pnpm ready -- --preset=supabase-full` |

### What's included

- **App:** Landing (i18n VI/EN), login/OAuth UI, `/app`, notes, profile, billing  
- **Auth:** Supabase SSR **or** Better Auth + Drizzle (`AUTH_ADAPTER`)  
- **Security:** Headers (CSP/HSTS…), Zod, rate-limit (memory / Upstash)  
- **Data:** `profiles` + `notes` (user isolation)  
- **Mail / storage:** Console·Resend · Local·S3  
- **Payment:** Stripe adapter when `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID`  
- **DX:** `IDEA.md`, `AGENTS.md`, `.agents/skills/*`, `llms.txt`, doctor/setup/ready  
- **Quality:** Vitest + Playwright (demo + portable-pg CI)  
- **Deploy:** `vercel.json`, `docker-compose.prod.yml`, `/api/health`  

### Vibe workflow

1. Edit [`IDEA.md`](./IDEA.md)  
2. `pnpm dev`  
3. Agent: *“Read IDEA.md + AGENTS.md. Implement next MVP under /app.”*  
4. Deploy — [docs/DEPLOY.md](./docs/DEPLOY.md)  

### Layout

```text
IDEA.md                 ← your product (start here)
AGENTS.md               ← rules for AI agents
apps/web                ← Next.js UI
  src/app/app/          ← product features
  src/lib/adapters/     ← supabase / better-auth only
packages/               ← auth, db, security, mail, storage, payment, i18n, logger
presets/                ← supabase-full · portable-pg
scripts/                ← ready, setup, doctor, db-migrate, check-deploy
docs/                   ← QUICKSTART, DEPLOY, VIBE, benchmark, …
.agents/skills/         ← ship-feature, add-entity, security-pass, vibe-setup
```

### Env (essentials)

```bash
# portable-pg
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://shipkit:shipkit@localhost:5432/shipkit
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=http://localhost:3000
AUTH_ADAPTER=better-auth

# optional: RESEND_API_KEY, STRIPE_*, S3_*, SENTRY_DSN, GOOGLE_*/GITHUB_* OAuth
```

Full list: [`.env.example`](./.env.example)

### Docs map

| Doc | Purpose |
|-----|---------|
| [docs/QUICKSTART.md](./docs/QUICKSTART.md) | 15-minute usable path |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Vercel + Docker |
| [docs/VIBE.md](./docs/VIBE.md) | Vibe coding loop |
| [docs/TTFP.md](./docs/TTFP.md) | Time-to-first-product |
| [docs/COMPETITIVE_BENCHMARK.md](./docs/COMPETITIVE_BENCHMARK.md) | vs Open SaaS / MakerKit / ShipFast |
| [docs/DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) | Code audit + plan |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Ports & packages |
| [ROADMAP.md](./ROADMAP.md) | Status (honest) |
| [docs/SENTRY.md](./docs/SENTRY.md) | Optional Sentry |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security notes |

### Status (honest)

**v0.4 — usable** for daily vibe products: auth, notes, profile, optional Stripe, deploy recipes, agent DX.

Not aiming to replace MakerKit multi-tenant B2B or supastarter multi-framework on day one. See [COMPETITIVE_BENCHMARK.md](./docs/COMPETITIVE_BENCHMARK.md).

---

## Deploy (tóm tắt)

1. `pnpm build` green  
2. `pnpm check:deploy` (URL production, không localhost)  
3. **Vercel:** import repo, env từ `.env.example`, root `vercel.json`  
4. **Docker:** `docker compose -f docker-compose.prod.yml up -d --build`  

Chi tiết: [docs/DEPLOY.md](./docs/DEPLOY.md)

---

## License

MIT © [Thunderkill016](https://github.com/Thunderkill016)

**Bớt cấu hình. Bắt đầu ship ý tưởng.**  
**Stop configuring. Start shipping ideas.**
