# Đủ xài trong ~15 phút

## Demo (xem UI ngay)

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit
pnpm install
pnpm ready                 # tạo .env.local demo nếu chưa có
pnpm dev
```

Mở http://localhost:3000

---

## Auth + notes thật (khuyên dùng)

Cần **Docker** (Postgres local):

```bash
pnpm install
pnpm ready -- --preset=portable-pg
pnpm db:up && pnpm db:migrate
pnpm doctor
pnpm dev
```

1. http://localhost:3000/login → **Tạo tài khoản**  
2. `/app/notes` → thêm ghi chú (lưu Postgres, tách theo user)  
3. `/app/profile` → tên / avatar  
4. Sửa `IDEA.md` → nhờ AI làm tính năng tiếp  

---

## Supabase (không Docker)

```bash
pnpm ready -- --preset=supabase-full
# dán URL + anon key vào apps/web/.env.local
# SQL Editor: chạy 0001, 0002, 0004, 0005 trong packages/db/sql/
pnpm doctor && pnpm dev
```

Redirect: `http://localhost:3000/auth/callback`

---

## Lệnh thường dùng

| Lệnh | Việc |
|------|------|
| `pnpm ready` | Setup env + doctor + hướng dẫn |
| `pnpm doctor` | Checklist cấu hình |
| `pnpm dev` | Chạy app |
| `pnpm build` | Build production |
| `pnpm check:deploy` | Gate trước production |
| `pnpm create -- my-app` | Clone kit sang product mới |

Deploy: [DEPLOY.md](./DEPLOY.md) · TTFP: [TTFP.md](./TTFP.md)
