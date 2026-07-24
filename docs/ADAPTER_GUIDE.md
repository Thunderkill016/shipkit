# Adapter Contribution Guide

CycleWarden dùng mô hình **Ports & Adapters** (Hexagonal Architecture).
Mỗi Port là một interface TypeScript trong `packages/`.
Mỗi Adapter là một implementation cụ thể dùng vendor SDK.

---

## Cấu trúc

```text
packages/
  mail/src/     ← MailPort interface + built-in adapters
  storage/src/  ← StoragePort interface + built-in adapters
  auth/src/     ← AuthPort interface

apps/web/src/lib/adapters/
  supabase/     ← Supabase auth adapter
  better-auth/  ← Better Auth adapter
```

---

## Ví dụ 1 — MailPort adapter mới (Postmark)

```ts
// packages/mail/src/postmark.ts
import type { MailMessage, MailPort } from "./index";

export function createPostmarkMailer(
  apiToken: string,
  defaultFrom = "sender@example.com"
): MailPort {
  return {
    async send(message: MailMessage) {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": apiToken,
        },
        body: JSON.stringify({
          From: message.from ?? defaultFrom,
          To: Array.isArray(message.to) ? message.to.join(",") : message.to,
          Subject: message.subject,
          HtmlBody: message.html,
          TextBody: message.text,
          MessageStream: "outbound",
        }),
      });
      if (!res.ok) throw new Error(`Postmark: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { MessageID: string };
      return { id: data.MessageID };
    },
  };
}
```

Export từ `index.ts`:

```ts
export { createPostmarkMailer } from "./postmark";
```

Dùng trong app:

```ts
// apps/web/src/lib/mail.ts
import { createConsoleMailer, createPostmarkMailer } from "@cyclewarden/mail";

export function getMailer() {
  const token = process.env.POSTMARK_API_TOKEN;
  if (token) return createPostmarkMailer(token);
  return createConsoleMailer(); // dev fallback
}
```

---

## Ví dụ 2 — StoragePort: DigitalOcean Spaces

Spaces tương thích S3 — chỉ cần set `endpoint`:

```ts
import { createS3Storage } from "@cyclewarden/storage";

const storage = createS3Storage({
  bucket: process.env.DO_SPACES_BUCKET!,
  region: process.env.DO_SPACES_REGION!,  // e.g. "sgp1"
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  publicUrlTemplate: `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.digitaloceanspaces.com/{key}`,
});
```

---

## Ví dụ 3 — AuthPort adapter mới

Interface bắt buộc:

```ts
export interface AuthPort {
  getUser(): Promise<AuthUser | null>;
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signUpWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  getOAuthUrl?(provider: "google" | "github"): Promise<string | null>;
}
```

Các bước:
1. Tạo `apps/web/src/lib/adapters/<provider>/port.ts` implement `AuthPort`
2. Thêm case vào `auth-adapter.ts` + `auth.ts`
3. Viết unit test (mock fetch/SDK)

---

## Quy ước bắt buộc

| Quy tắc | Lý do |
|---------|-------|
| Vendor SDK chỉ trong `packages/<name>/src/` hoặc `adapters/` | Không rò SDK vào feature code |
| Export qua `index.ts` | Public API rõ ràng |
| Không dùng `process.env` trong adapter — truyền qua constructor | Dễ test, không phụ thuộc môi trường |
| Ít nhất 1 unit test với mock | Xác minh contract |
| Không commit secrets | Chỉ dùng `process.env` ở nơi khởi tạo |

---

## Checklist PR

- [ ] File adapter trong đúng vị trí
- [ ] Export từ `index.ts`
- [ ] Có ít nhất 1 unit test
- [ ] `pnpm test` pass
- [ ] `pnpm build` pass
- [ ] Ghi chú vào `llms.txt` nếu là port mới
