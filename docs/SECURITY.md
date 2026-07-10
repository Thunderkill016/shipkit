# Security Guide

Tài liệu này ghi lại các quyết định bảo mật, baseline đang được thực thi trong Shipkit, và hướng dẫn cho nhóm phát triển.

---

## 1. HTTP Security Headers

Được quản lý trong [`packages/security/src/headers.ts`](../packages/security/src/headers.ts) và tự động áp dụng thông qua `next.config.ts`.

| Header | Giá trị mặc định | Mục đích |
|--------|-----------------|---------|
| `Content-Security-Policy` | Strict default-src 'self' | Ngăn XSS và inline script injection |
| `X-Frame-Options` | `DENY` | Ngăn clickjacking |
| `X-Content-Type-Options` | `nosniff` | Ngăn MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Giới hạn Referer header |
| `Permissions-Policy` | Tắt camera, microphone, geolocation | Giảm attack surface |

**Không bao giờ bỏ header CSP trong production.** Nếu cần CDN asset, thêm domain cụ thể vào allowlist.

---

## 2. CSRF Protection

**Next.js App Router Server Actions đã có CSRF built-in:**
- Server Actions chỉ chấp nhận `POST` requests với `Content-Type: application/x-www-form-urlencoded` hoặc `multipart/form-data`.
- Next.js tự động xác minh `Origin` header so với `Host` — từ chối cross-origin requests.

**Bạn không cần thêm CSRF token thủ công** cho Server Actions.

> [!WARNING]
> Nếu bạn thêm REST API routes (`/api/...`) nhận mutation từ clients bên ngoài, bạn **phải** tự implement CSRF protection cho những routes đó.

---

## 3. Input Validation

Tất cả dữ liệu đầu vào từ client phải được validate bằng Zod trước khi sử dụng:

```ts
// Đúng — validate trước khi dùng
const parsed = SomeSchema.safeParse(formData);
if (!parsed.success) return { error: parsed.error.issues[0]?.message };

// Sai — không bao giờ tin dữ liệu raw từ client
const name = formData.get("name") as string; // ❌
```

Package `@shipkit/security` cung cấp `validate()` helper có thể dùng ngoài Server Actions.

---

## 4. Authentication

### Rate Limiting
`authRateLimit` (20 requests / 15 phút) được áp dụng trên tất cả auth endpoints.  
Fallback về in-memory nếu Upstash chưa cấu hình — đủ tốt cho MVP, nhưng **không scale qua nhiều instance**.

Khi scale lên, set `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.

### Mật khẩu
- Better Auth sử dụng `bcrypt` với work factor đủ mạnh.
- Không bao giờ log mật khẩu hoặc session token.
- Session expiry: mặc định 30 ngày (cấu hình trong `auth-instance.ts`).

### OAuth
- Client secrets chỉ được đặt trong server-side env vars.
- Không bao giờ expose `GOOGLE_CLIENT_SECRET` hay `GITHUB_CLIENT_SECRET` ra client.

---

## 5. Database

### RLS (Row Level Security) — Supabase
Được cấu hình trong `packages/db/sql/0002_supabase_rls.sql`.  
Mỗi user chỉ đọc/ghi được row của chính mình trong `profiles`.

### Portable Postgres
Không có RLS mặc định. Enforce quyền truy cập ở application layer:
```ts
// Luôn filter theo userId từ session, không tin dữ liệu từ URL
const profile = await db.select().from(profiles).where(eq(profiles.id, user.id));
```

### Secrets
- `DATABASE_URL` chứa credentials — **không commit vào git**.
- Dùng `.env.local` (đã có trong `.gitignore`).

---

## 6. Environment Variables & Secrets Lifecycle

Xem [`docs/API_KEY_ROTATION.md`](./API_KEY_ROTATION.md) để biết cách xoay vòng secrets an toàn.

### Phân loại biến môi trường
| Prefix | Scope | Ví dụ |
|--------|-------|-------|
| `NEXT_PUBLIC_*` | Client + Server | `NEXT_PUBLIC_SUPABASE_URL` |
| Không có prefix | Server only | `BETTER_AUTH_SECRET`, `DATABASE_URL` |

> [!CAUTION]
> Không bao giờ đặt secrets (DB passwords, API keys) vào biến `NEXT_PUBLIC_*`. Chúng sẽ được bundle vào client JavaScript.

---

## 7. File Upload

Được xử lý trong `uploadAvatarAction`:
- Giới hạn kích thước: **2MB**.
- Chỉ cho phép: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- File được đổi tên theo pattern `avatars/{userId}-{timestamp}.{ext}` — ngăn path traversal.

Khi dùng LocalStorage, files được lưu trong `public/uploads/` — **không phù hợp cho production public-facing app**. Dùng S3 hoặc R2 trong production.

---

## 8. Checklist trước khi go-live

Xem [`PRODUCTION_CHECKLIST.md`](../PRODUCTION_CHECKLIST.md) để có danh sách đầy đủ.

Các điểm bảo mật quan trọng nhất:
- [ ] Tất cả secrets đã được set trong hosting platform (không phải `.env.local`)
- [ ] CSP headers được kiểm tra trên production URL
- [ ] Rate limiting dùng Upstash (không phải in-memory)
- [ ] OAuth redirect URLs đã whitelist domain production
- [ ] RLS đã enable trên Supabase project
- [ ] Không có `console.log(password)` hay `console.log(token)` trong code
