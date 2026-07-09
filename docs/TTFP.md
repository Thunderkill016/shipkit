# Time-to-First-Product (TTFP) Guide

**Mục tiêu:** Từ lúc `git clone` đến lúc có landing page + đăng ký/đăng nhập thật hoạt động — **dưới 60 phút**.

---

## Đường A — Supabase (khuyến nghị người mới)

| Bước | Việc cần làm | Ước tính |
|------|-------------|---------|
| 1 | Cài Node ≥ 20 + pnpm + Git (lần đầu, bỏ qua nếu có sẵn) | 10 phút |
| 2 | `git clone` + `pnpm install` | 3 phút |
| 3 | Tạo tài khoản Supabase, tạo project mới | 5 phút |
| 4 | Copy URL + anon key vào `apps/web/.env.local` | 2 phút |
| 5 | Chạy SQL init: `packages/db/sql/0001_init.sql` + `0002_supabase_rls.sql` | 3 phút |
| 6 | Cấu hình Supabase Redirect URL: thêm `http://localhost:3000/auth/callback` | 1 phút |
| 7 | `pnpm doctor && pnpm dev` — kiểm tra Ready | 2 phút |
| 8 | Mở `/login` → đăng ký → vào `/app` | 2 phút |
| **Tổng** | | **~28 phút** |

### Checklist nhanh

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit && pnpm install
cp .env.example apps/web/.env.local
# Điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm doctor
pnpm dev
```

---

## Đường B — Portable Postgres (tự host, Docker)

| Bước | Việc cần làm | Ước tính |
|------|-------------|---------|
| 1 | Cài Node + pnpm + Git + Docker Desktop | 15 phút (lần đầu) |
| 2 | `git clone` + `pnpm install` | 3 phút |
| 3 | `pnpm db:up` — khởi Docker Postgres | 2 phút |
| 4 | Tạo `apps/web/.env.local` với `DATABASE_URL` + `BETTER_AUTH_SECRET` | 2 phút |
| 5 | `pnpm doctor` — xác nhận Ready | 1 phút |
| 6 | `pnpm dev` → `/login` → đăng ký → `/app` | 2 phút |
| **Tổng** | | **~25 phút** (bỏ qua bước 1 nếu Docker có sẵn) |

### Checklist nhanh

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit && pnpm install
pnpm db:up
cp .env.example apps/web/.env.local
# Điền DATABASE_URL=postgresql://shipkit:shipkit@localhost:5432/shipkit
# Điền BETTER_AUTH_SECRET=<32+ ký tự ngẫu nhiên>
# Điền BETTER_AUTH_URL=http://localhost:3000
# Điền AUTH_ADAPTER=better-auth
pnpm doctor
pnpm dev
```

---

## Sau khi chạy được

Bước tiếp theo (không tính vào TTFP):

1. Chỉnh `IDEA.md` — mô tả sản phẩm của bạn
2. Nhờ AI implement tính năng đầu tiên:
   > "Đọc `IDEA.md` + `AGENTS.md`. Làm mục MVP tiếp theo trong checklist."
3. Deploy lên Vercel: xem `presets/supabase-full.md` hoặc `presets/portable-pg.md`

---

## Lỗi phổ biến và cách tránh

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `doctor` báo "No auth backend" | Chưa điền env | Điền đúng theo đường A hoặc B |
| Login redirect không về `/app` | Thiếu Redirect URL trong Supabase | Thêm `http://localhost:3000/auth/callback` |
| `pnpm: command not found` | Chưa cài pnpm | `npm install -g pnpm` |
| Build lỗi TypeScript | Thiếu `pnpm install` | Chạy lại `pnpm install` |
| Docker không lên | Docker Desktop chưa chạy | Mở Docker Desktop trước |

---

## Đo TTFP của bạn

Ghi lại thời gian và chia sẻ kết quả:

```
Start: git clone ...
End: /app loaded với user đã đăng nhập
TTFP: ___ phút
Đường: Supabase / Docker
OS: Mac / Windows / Linux
```

Mở Issue trên GitHub nếu bạn gặp bước nào mất hơn 5 phút không có lý do rõ ràng.
