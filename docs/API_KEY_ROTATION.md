# API Key Rotation Guide

Hướng dẫn này mô tả cách xoay vòng (rotate) secrets an toàn khi chúng bị lộ hoặc cần thay thế định kỳ.

---

## Khi nào cần rotate?

- Nghi ngờ secret bị lộ (commit nhầm vào git, log ra console, v.v.)
- Thành viên có quyền truy cập rời team
- Chính sách bảo mật yêu cầu rotate định kỳ (ví dụ: 90 ngày)
- Trước khi go-live production

---

## 1. BETTER_AUTH_SECRET

**Dùng để ký session tokens.** Khi rotate, tất cả session hiện tại sẽ bị invalidate (người dùng phải đăng nhập lại).

```bash
# Tạo secret mới (32+ ký tự)
openssl rand -hex 32

# Cập nhật trong môi trường production
# Vercel: Settings → Environment Variables → BETTER_AUTH_SECRET
# Docker: cập nhật file .env và docker compose up -d --force-recreate
```

**Không cần downtime** — cập nhật env và restart.

---

## 2. DATABASE_URL

**Rotate khi:** password DB bị lộ, hoặc bạn muốn thu hồi quyền của một user DB cụ thể.

```bash
# Tạo user DB mới
CREATE USER shipkit_v2 WITH PASSWORD 'new-secure-password';
GRANT ALL PRIVILEGES ON DATABASE shipkit TO shipkit_v2;

# Cập nhật DATABASE_URL trong env
DATABASE_URL=postgresql://shipkit_v2:new-secure-password@host:5432/shipkit

# Restart app (zero-downtime với rolling deploy)

# Sau khi xác nhận app hoạt động, thu hồi quyền user cũ
REVOKE ALL PRIVILEGES ON DATABASE shipkit FROM shipkit_old;
DROP USER shipkit_old;
```

---

## 3. OAuth Client Secrets (Google / GitHub)

### Google
1. Vào [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services → Credentials**
3. Chọn OAuth client → **Edit** → **Add new secret**
4. Copy secret mới, cập nhật `GOOGLE_CLIENT_SECRET`
5. Xoá secret cũ (sau khi đã deploy thành công)

### GitHub
1. Vào [github.com/settings/developers](https://github.com/settings/developers) (hoặc Organization settings)
2. Chọn app → **Reset client secret**
3. Copy secret mới, cập nhật `GITHUB_CLIENT_SECRET` **ngay lập tức** (GitHub chỉ hiện 1 lần)

---

## 4. RESEND_API_KEY

1. Vào [resend.com/api-keys](https://resend.com/api-keys)
2. Tạo API key mới
3. Cập nhật `RESEND_API_KEY` trong hosting platform
4. Xoá key cũ trên Resend dashboard

---

## 5. S3 / Object Storage Credentials

### AWS IAM
```bash
# Tạo access key mới trên AWS IAM
# Cập nhật S3_ACCESS_KEY_ID và S3_SECRET_ACCESS_KEY

# Sau khi confirm app hoạt động, deactivate key cũ
aws iam update-access-key --access-key-id OLD_KEY --status Inactive

# Xoá key cũ sau vài ngày
aws iam delete-access-key --access-key-id OLD_KEY
```

### Cloudflare R2
1. **R2 → Manage R2 API tokens**
2. Tạo token mới với cùng permissions
3. Cập nhật `S3_ACCESS_KEY_ID` và `S3_SECRET_ACCESS_KEY`
4. Xoá token cũ

---

## 6. Upstash Redis

1. Vào [upstash.com](https://console.upstash.com) → Database → **Reset Token**
2. Cập nhật `UPSTASH_REDIS_REST_TOKEN` trong hosting platform
3. Không cần restart — token mới có hiệu lực ngay

---

## Checklist sau khi rotate

```bash
pnpm doctor  # Kiểm tra tất cả env vars còn hợp lệ
```

- [ ] Secret mới đã được set trong hosting platform (Vercel / Docker env)
- [ ] App đã restart và hoạt động bình thường
- [ ] Secret cũ đã bị thu hồi / xoá
- [ ] Kiểm tra logs không có lỗi auth
- [ ] (Nếu rotate BETTER_AUTH_SECRET) Thông báo cho team: users cần đăng nhập lại

---

## Phòng ngừa lộ secrets

```bash
# Kiểm tra git history xem có commit secret không
git log --all --full-history -- .env*
git grep -i "secret\|password\|api.key" $(git log --all --oneline | awk '{print $1}')

# Nếu phát hiện, phải xử lý git history (BFG Repo-Cleaner hoặc git filter-repo)
# Và NGAY LẬP TỨC rotate tất cả secrets bị lộ
```

> [!CAUTION]
> Nếu secret đã bị lộ ra internet (GitHub, pastebin, logs), hãy coi nó như **đã bị compromise** và rotate ngay — không quan trọng secret đó cũ hay mới.
