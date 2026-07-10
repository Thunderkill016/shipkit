# ✦ Shipkit

**The open product kit for vibe coding.**  
**Bộ khung sản phẩm mở — giúp bạn (và AI) biến ý tưởng thành website chạy được.**

Go from **idea → landing + auth + app + database + security + deploy** without rebuilding the foundation every time.

Từ **ý tưởng → trang giới thiệu + đăng nhập + app + dữ liệu + bảo mật + đưa lên mạng** — không phải dựng lại nền móng mỗi lần.

[![License: MIT](https://img.shields.io/badge/License-MIT-7dd3c0.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

## ⚡ Đủ xài ngay (copy-paste)

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit && pnpm install

# A) Chỉ xem UI
pnpm ready && pnpm dev

# B) Auth + notes thật (cần Docker)
pnpm ready -- --preset=portable-pg
pnpm db:up && pnpm db:migrate && pnpm dev
# → http://localhost:3000/login → đăng ký → /app/notes
```

Chi tiết ngắn: **[docs/QUICKSTART.md](./docs/QUICKSTART.md)** · Deploy: **[docs/DEPLOY.md](./docs/DEPLOY.md)**

| Language | Jump |
|----------|------|
| **Tiếng Việt (hướng dẫn chi tiết, cho người trái ngành)** | [↓ Xuống phần tiếng Việt](#-hướng-dẫn-tiếng-việt--dành-cho-người-trái-ngành) |
| English (technical overview) | [↓ English](#-english--overview) |

---

# 🇻🇳 Hướng dẫn tiếng Việt — dành cho người trái ngành

Phần này viết **bằng lời thường**, ít thuật ngữ.  
Bạn **không cần** là lập trình viên. Bạn chỉ cần: máy tính, internet, kiên nhẫn 30–60 phút lần đầu, và (nên có) một công cụ AI như Cursor / ChatGPT / Claude / Grok để nhờ viết code theo ý.

---

## Shipkit là gì? (giải thích 1 phút)

Tưởng tượng bạn muốn làm một **sản phẩm web** (app học, app quản lý khách, portfolio, SaaS nhỏ…):

| Việc ai cũng phải làm | Shipkit đã làm sẵn |
|------------------------|--------------------|
| Trang giới thiệu sản phẩm | Có (`/`) |
| Đăng ký / đăng nhập | Có (`/login`) |
| Khu vực sau khi đăng nhập | Có (`/app`) |
| Lưu dữ liệu người dùng | Có đường gắn database |
| Bảo mật cơ bản | Có (headers, kiểm tra form…) |
| Cách đưa lên mạng | Có hướng dẫn Vercel / Docker |

**Việc của bạn:** mô tả **ý tưởng** (file `IDEA.md`) rồi nhờ AI (hoặc dev) làm **tính năng riêng** — không phải dựng nhà từ móng mỗi lần.

Shipkit **miễn phí**, mã nguồn mở (MIT), code **nằm trên máy bạn / GitHub của bạn** — không bị nhốt trong một app chat đóng.

---

## Bạn cần cài gì trước? (một lần duy nhất)

### 1) Node.js (máy “chạy web”)

1. Vào: https://nodejs.org  
2. Tải bản **LTS** (khuyên dùng).  
3. Cài như phần mềm bình thường (Next → Next → Finish).  
4. Mở **Terminal** (Mac) hoặc **PowerShell / Windows Terminal** (Windows).  
5. Gõ rồi Enter:

```bash
node -v
```

Thấy kiểu `v20...` hoặc `v22...` là OK.

### 2) pnpm (công cụ cài thư viện cho project)

Trong Terminal:

```bash
npm install -g pnpm
pnpm -v
```

Thấy số version là OK.

### 3) Git (tải code về)

- Windows: https://git-scm.com  
- Mac: thường đã có, hoặc cài Xcode Command Line Tools khi hệ thống hỏi.

Kiểm tra:

```bash
git --version
```

### 4) (Khuyến nghị) Editor + AI

- **Cursor** (https://cursor.com) — vừa sửa file vừa chat AI trong project: hợp vibe coding nhất.  
- Hoặc VS Code + ChatGPT/Claude dán code.  
- Hoặc Grok / Claude web: copy file, nhờ sửa, dán lại (chậm hơn một chút).

### 5) Tài khoản miễn phí (khi muốn đăng nhập “thật”)

**Cách dễ nhất cho người mới:** [Supabase](https://supabase.com) (free tier)

- Đăng ký bằng GitHub/Google  
- Tạo 1 **Project** mới  
- Vào **Project Settings → API** lấy 2 dòng:  
  - **Project URL**  
  - **anon public** key  

(Ghi ra notepad — lát nữa dán vào file cấu hình.)

---

## Cách A — Xem giao diện ngay (không cần đăng nhập thật)

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit
pnpm install
pnpm ready          # tạo .env.local demo nếu chưa có
pnpm dev
```

Mở **http://localhost:3000**

| Đường dẫn | Ý nghĩa |
|-----------|---------|
| `/` | Trang giới thiệu (VI \| EN) |
| `/login` | Form đăng nhập |
| `/app` | Khu vực app (demo nếu chưa gắn auth) |

Dừng server: `Ctrl + C`.

> Không rành Terminal? GitHub → **Code → Download ZIP**, giải nén, `cd` vào thư mục đó.

---

## Cách B — Có đăng ký / đăng nhập thật (khuyên dùng)

### Nhanh nhất (Docker + Better Auth)

```bash
pnpm install
pnpm ready -- --preset=portable-pg
pnpm db:up && pnpm db:migrate
pnpm doctor
pnpm dev
```

→ `/login` tạo tài khoản → `/app/notes`.

### Hoặc Supabase

```bash
pnpm ready -- --preset=supabase-full
```

Mở `apps/web/.env.local`, dán URL + anon key (thay chỗ `YOUR_PROJECT` / `your-anon-key`).

**Lưu file.** Không share `.env.local` / không commit lên GitHub public.

### SQL + redirect (Supabase)

1. SQL Editor: chạy lần lượt `0001_init.sql`, `0002_supabase_rls.sql`, `0004_notes.sql`, `0005_notes_rls.sql`  
2. Auth → URL: Site `http://localhost:3000`, Redirect `http://localhost:3000/auth/callback`  
3. `pnpm doctor && pnpm dev` → `/login` → vào `/app` 🎉  

Chi tiết preset: [`presets/supabase-full.md`](./presets/supabase-full.md) · [`presets/portable-pg.md`](./presets/portable-pg.md)

---

## Viết ý tưởng của bạn (bước quan trọng nhất)

Mở file **`IDEA.md`** ở thư mục gốc. Đây là “bản tóm tắt sản phẩm” — **AI sẽ đọc file này** để làm đúng ý bạn.

Viết bằng tiếng Việt cũng được, ví dụ:

```markdown
## Working title
App ghi chú khách hàng cho thợ nail

## One sentence
Giúp chủ tiệm nail lưu SĐT, lịch hẹn, ghi chú khách.

## Who is it for?
Chủ tiệm nail nhỏ, dùng điện thoại nhiều.

## Problem
Hay quên lịch, note rải trong Zalo.

## Solution (MVP)
1. Đăng ký / đăng nhập
2. Danh sách khách
3. Thêm / sửa khách
4. Xem trên điện thoại

## MVP checklist
- [ ] Đổi chữ trang chủ thành thương hiệu tiệm
- [ ] Màn hình danh sách khách
- [ ] Form thêm khách
```

Càng rõ **ai dùng / đau gì / 3–5 việc MVP**, AI càng làm đúng.

---

## Nhờ AI làm tính năng (vibe coding — cách dùng thực tế)

1. Mở project trong **Cursor** (hoặc editor có AI).  
2. Đảm bảo `IDEA.md` đã viết.  
3. Chat với AI, dán đúng kiểu:

> Đọc `IDEA.md` và `AGENTS.md`.  
> Làm mục MVP tiếp theo trong checklist.  
> Code nằm dưới `apps/web/src/app/app/`.  
> Không đổi framework, không commit file `.env`.  
> Xong thì đánh dấu checklist trong `IDEA.md`.

4. AI sửa file → bạn **lưu** → trình duyệt (localhost) **tải lại** → bấm thử.  
5. Không ổn: chat tiếp *“lỗi khi bấm nút X, màn hình hiện Y, sửa giúp”* (chụp màn hình càng tốt).

### Việc nên nhờ AI

- Đổi chữ / màu / layout trang chủ  
- Thêm trang trong `/app` (danh sách, form, báo cáo đơn giản)  
- Thêm bảng dữ liệu (kèm “chỉ user đó mới xem được data của mình”)  

### Việc **không** nên để AI tự ý

- Xóa bảo mật / tắt đăng nhập  
- Đưa secret key lên GitHub public  
- Đổi sang framework khác giữa chừng (Vue, WordPress…) nếu bạn chưa sẵn sàng  

Quy tắc AI nằm trong [`AGENTS.md`](./AGENTS.md).  
Kỹ năng sẵn: thư mục [`.agents/skills/`](./.agents/skills/).

---

## Tạo project mới từ Shipkit (sản phẩm thứ 2, 3…)

```bash
cd shipkit
pnpm create -- ten-san-pham-cua-ban
cd ten-san-pham-cua-ban
pnpm install
# sửa IDEA.md
cp .env.example apps/web/.env.local
pnpm doctor
pnpm dev
```

---

## Đưa website lên mạng (tổng quan dễ hiểu)

### Cách phổ biến: Vercel (miễn phí cho hobby)

1. Đẩy code lên **GitHub** (repo private cũng được).  
2. Vào https://vercel.com → đăng nhập GitHub → **Import** repo.  
3. Cấu hình build (monorepo):  
   - Install: `pnpm install`  
   - Build: `pnpm build`  
   - (Nếu cần) Root / filter theo docs Vercel monorepo  
4. Vào **Environment Variables** dán cùng các key như file `.env.local` (Supabase URL, anon key, `NEXT_PUBLIC_APP_URL` = domain Vercel).  
5. Deploy → nhận link `https://....vercel.app`.  
6. Vào Supabase cập nhật **Site URL / Redirect** thành domain production.

Checklist trước khi public: [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md)

### Docker

Dành cho VPS / máy chủ — xem `docker-compose.yml` và preset portable. Người mới nên đi Vercel trước.

---

## Lỗi thường gặp (đừng hoảng)

| Hiện tượng | Thường do | Cách xử |
|------------|-----------|---------|
| `pnpm: command not found` | Chưa cài pnpm | `npm install -g pnpm` |
| `node: command not found` | Chưa cài Node | Cài Node LTS, mở lại Terminal |
| Trang trắng / lỗi compile | Thiếu `pnpm install` hoặc sai thư mục | `cd` đúng folder `shipkit`, chạy lại `pnpm install` |
| Đăng nhập báo lỗi cấu hình | Chưa có `.env.local` hoặc key sai | `pnpm doctor`, kiểm tra Supabase URL/key |
| Đăng nhập xong không vào `/app` | Redirect URL Supabase chưa khớp | Thêm `http://localhost:3000/auth/callback` |
| Đổi `.env` mà không ăn | Chưa restart server | `Ctrl+C` rồi `pnpm dev` lại |
| AI sửa lung tung | Chưa chỉ `IDEA.md` + `AGENTS.md` | Nhắc lại 2 file đó mỗi lần chat lớn |

Lệnh tự kiểm tra:

```bash
pnpm doctor
```

---

## Giải thích vài từ (từ điển siêu ngắn)

| Từ | Nghĩa thường |
|----|----------------|
| **Repo / GitHub** | Nơi cất code trên mạng |
| **Terminal** | Cửa sổ gõ lệnh cho máy |
| **Localhost** | Website chạy trên máy bạn |
| **Env / `.env.local`** | File chứa khóa API, không public |
| **Deploy** | Đưa web lên internet |
| **Database** | “Excel thông minh” lưu user/data |
| **Auth** | Đăng ký / đăng nhập |
| **Adapter** | “Phích cắm” — đổi Supabase/DB mà UI vẫn dùng chung |
| **Vibe coding** | Nói ý tưởng cho AI, AI gõ code, bạn kiểm tra kết quả |

---

## Cấu trúc thư mục (chỉ cần nhớ vài chỗ)

```text
IDEA.md              ← Ý tưởng sản phẩm (BẠN sửa)
AGENTS.md            ← Luật cho AI (đọc, ít sửa)
apps/web             ← Giao diện website (AI hay sửa ở đây)
  src/app/page.tsx   ← Trang chủ
  src/app/login      ← Đăng nhập
  src/app/app        ← Phần sau login (tính năng của bạn)
presets/             ← Hướng dẫn Supabase / Postgres
docs/VIBE.md         ← Cách vibe (EN)
```

---

## Lộ trình học 1 buổi (gợi ý)

| Thời gian | Việc |
|-----------|------|
| 0–15' | Cài Node, pnpm, Git, Cursor |
| 15–30' | Clone, `pnpm install`, `pnpm dev`, xem trang chủ |
| 30–45' | Tạo Supabase, `.env.local`, đăng ký user thử |
| 45–90' | Viết `IDEA.md`, nhờ AI làm 1 tính năng nhỏ trong `/app` |
| Sau đó | Deploy Vercel khi demo ổn |

---

## Cần giúp thêm?

- Issues: https://github.com/Thunderkill016/shipkit/issues  
- English technical docs bên dưới và trong các file `.md` khác  

**Bạn không phải “biết code” để bắt đầu — bạn cần biết ý tưởng của mình và cách nhờ AI đúng chỗ.**

---

# 🇬🇧 English — overview

## Quick start

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit && pnpm install
pnpm ready -- --preset=portable-pg   # or: demo | supabase-full
pnpm db:up && pnpm db:migrate        # portable-pg only
pnpm dev
```

Full: [docs/QUICKSTART.md](./docs/QUICKSTART.md). Open http://localhost:3000 · edit **`IDEA.md`**.

---

## Why Shipkit?

| Pain | Shipkit |
|------|---------|
| Agents reinvent auth every chat | Fixed stack + `AuthPort` |
| Demo apps die at deploy | Docker + Vercel recipes |
| Insecure vibe prototypes | Headers, validation, rate-limit primitives |
| Locked to one closed AI builder | **Your repo**, MIT, portable presets |
| “Which framework?” thrash | Research-backed defaults (see `STANDARDS.md`) |

Grounded in: **Twelve-Factor**, **Ports & Adapters**, **OWASP ASVS L1**, **[AGENTS.md](https://agents.md/)**.

---

## Vibe workflow

1. Edit [`IDEA.md`](./IDEA.md) — who, problem, MVP checklist  
2. `pnpm dev`  
3. Prompt: *“Read IDEA.md + AGENTS.md. Implement the next MVP item under /app.”*  
4. Ship with preset `supabase-full` or `portable-pg`  

Full guide: [`docs/VIBE.md`](./docs/VIBE.md) · Vietnamese detailed guide: [above](#-hướng-dẫn-tiếng-việt--dành-cho-người-trái-ngành)

---

## What’s included

- Landing · Auth · Protected `/app` shell  
- Security headers · Zod · rate-limit port  
- Postgres path · Supabase or Better Auth  
- **Mail:** `createConsoleMailer` (dev) · `createResendMailer` (prod)  
- **Storage:** `createLocalStorage` (VPS/dev) · `createS3Storage` (S3/R2/MinIO)  
- **SEO:** OG/Twitter metadata · `<JsonLd>` + schema helpers  
- Agent DX: `AGENTS.md`, `IDEA.md`, `llms.txt`, `.agents/skills/`  
- `pnpm create -- my-product` scaffold  

### Layout

```text
IDEA.md                 ← your product brief
AGENTS.md               ← rules for AI agents
apps/web                ← Next.js UI
  src/components/       ← shared components (JsonLd, …)
  src/lib/adapters/     ← vendor SDKs (supabase/, better-auth/)
packages/*              ← kernel (config, security, db, auth, mail, storage)
presets/                ← supabase-full · portable-pg
.agents/skills/         ← agent playbooks
docs/                   ← VIBE · ADAPTER_GUIDE · TTFP · research notes
```

---

## Auth adapters

| Adapter | Env | Preset |
|---------|-----|--------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_*` | [`supabase-full`](./presets/supabase-full.md) |
| **Better Auth** | `DATABASE_URL` + `BETTER_AUTH_SECRET` | [`portable-pg`](./presets/portable-pg.md) |

Auto-detect if `AUTH_ADAPTER` unset. App code uses `getAuth()` only.

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [VISION.md](./VISION.md) | Product vision |
| [STANDARDS.md](./STANDARDS.md) | Quality bar |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Packages & ports |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Before go-live |
| [docs/VIBE.md](./docs/VIBE.md) | Vibe coding workflow |
| [docs/ADAPTER_GUIDE.md](./docs/ADAPTER_GUIDE.md) | Write your own adapter |
| [docs/TTFP.md](./docs/TTFP.md) | Time-to-first-product guide |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Production deployment guide (L2) |
| [docs/MULTI_FRAMEWORK.md](./docs/MULTI_FRAMEWORK.md) | Multi-framework integration guide |
| [docs/RESEARCH_NOTES.md](./docs/RESEARCH_NOTES.md) | Research → decisions |
| [llms.txt](./llms.txt) | Agent doc index |

---

## Roadmap (short)

- [x] v0.1 — Kernel + Next + Supabase + vibe docs  
- [x] v0.2 — Better Auth + skills + create CLI + tests  
- [x] v0.3 — Resend/S3 real adapters + JSON-LD helpers  
- [x] v1.0 — Adapter guide + TTFP guide + OAuth L2 + Multi-FW  

---

## License

MIT © [Thunderkill016](https://github.com/Thunderkill016)

**Stop configuring. Start shipping ideas.**  
**Bớt cấu hình. Bắt đầu biến ý tưởng thành sản phẩm.**
