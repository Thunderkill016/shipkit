# Production Deployment Guide (L2)

CycleWarden hỗ trợ hai phương thức triển khai chuẩn công nghiệp (Level 2 Deploy Paths): **Vercel** và **Docker**.

## Pre-flight (local)

```bash
pnpm doctor              # checklist score
pnpm check:deploy        # production env gates (not localhost)
pnpm build               # must be green
```

## One-click style (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FThunderkill016%2Fcyclewarden&env=NEXT_PUBLIC_APP_URL,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=See%20docs%2FDEPLOY.md%20and%20.env.example&project-name=cyclewarden&repository-name=cyclewarden)

Repo includes root **`vercel.json`**:

- `installCommand`: `pnpm install`
- `buildCommand`: `pnpm --filter @cyclewarden/web build`

After clone on Vercel, set env vars (see below), then Deploy.

---

## 🚀 Target 1: Vercel (Serverless / Cloud-Native)

Vercel là lựa chọn tối ưu nhất cho các dự án Next.js nhờ hỗ trợ SSR tốt, CDN toàn cầu và tự động build từ Git.

### Hướng 1A: Supabase Full Preset
Phù hợp nhất cho các sản phẩm sử dụng backend managed của Supabase.

1. **Chuẩn bị Database & Auth:**
   - Tạo Project mới trên [Supabase](https://supabase.com).
   - Truy cập **SQL Editor** trong Supabase Dashboard, copy nội dung các file `packages/db/sql/0001_init.sql` và `0002_supabase_rls.sql` rồi nhấn **Run** để khởi tạo bảng và cấu hình bảo mật RLS.
   - Nhận thông tin API URL và Anon Key trong mục **Project Settings → API**.

2. **Cấu hình trên Vercel:**
   - Liên kết Github Repository của bạn với Vercel.
   - Khi Import project, cấu hình **Root Directory** là `.` (hoặc chỉ định thư mục dự án của bạn).
   - Thiết lập các biến môi trường (Environment Variables) trong Vercel settings:
     ```bash
     NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
     NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     AUTH_ADAPTER=supabase
     ```
   - Nhấn **Deploy**.

3. **Cập nhật Redirect URLs:**
   - Truy cập **Supabase → Authentication → URL Configuration**.
   - Thiết lập **Site URL** thành tên miền Vercel của bạn (ví dụ `https://your-production-domain.vercel.app`).
   - Trong phần **Redirect URLs**, thêm địa chỉ callback: `https://your-production-domain.vercel.app/auth/callback`.

---

### Hướng 1B: Better Auth + Cloud Postgres (Neon / Railway / RDS)
Phù hợp cho các sản phẩm muốn tự chủ database hoặc sử dụng Serverless Postgres của Neon.

1. **Chuẩn bị Database:**
   - Khởi tạo Postgres database trên [Neon](https://neon.tech), Railway hoặc bất cứ nhà cung cấp nào để lấy chuỗi kết nối `DATABASE_URL`.

2. **Cấu hình trên Vercel:**
   - Thêm các biến môi trường sau trong Vercel dashboard:
     ```bash
     NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
     DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require
     BETTER_AUTH_SECRET=long-random-string-at-least-32-chars-for-security
     BETTER_AUTH_URL=https://your-production-domain.vercel.app
     AUTH_ADAPTER=better-auth
     ```
     *(Nếu dùng OAuth, thêm các biến `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)*.
   - Nhấn **Deploy**.

---

## 🐳 Target 2: Docker (Self-Hosted / VPS / Coolify)

Nếu bạn muốn deploy lên VPS (DigitalOcean, Linode, AWS EC2) để tiết kiệm chi phí hoặc tự quản lý toàn bộ hệ thống.

### Bước 1: Chuẩn bị máy chủ
Đảm bảo máy chủ đã cài đặt **Docker** và **Docker Compose**.

### Bước 2: Chuẩn bị cấu hình
Mở file `docker-compose.prod.yml` ở thư mục gốc và cập nhật các biến môi trường:

- Thay đổi `NEXT_PUBLIC_APP_URL` và `BETTER_AUTH_URL` thành tên miền thật của bạn.
- Đổi `BETTER_AUTH_SECRET` thành chuỗi ký tự bảo mật ngẫu nhiên (sử dụng lệnh `openssl rand -hex 32` để tạo).
- Nhập thông tin cấu hình OAuth, Resend hoặc S3 nếu có.

### Bước 3: Chạy ứng dụng
Khởi chạy dịch vụ ở chế độ chạy nền (detached mode):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Lệnh này sẽ tự động:
1. Tải về Postgres container và khởi tạo database lưu trữ bền vững qua Docker volumes.
2. Build Next.js ở chế độ **standalone** tối ưu hóa dung lượng container qua Multi-stage Dockerfile.
3. Chạy ứng dụng trên cổng `3000`.

### Bước 4: Cấu hình SSL / Reverse Proxy (Khuyên dùng)
Để ứng dụng bảo mật với giao thức HTTPS, bạn nên sử dụng **Caddy** hoặc **Nginx** làm Reverse Proxy phía trước container.

#### Ví dụ cấu hình Caddyfile:
```text
your-production-domain.com {
    reverse_proxy localhost:3000
}
```
Caddy sẽ tự động cấp phát và gia hạn chứng chỉ SSL Let's Encrypt miễn phí cho tên miền của bạn.
