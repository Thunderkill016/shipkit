# Sentry Integration Guide

Hướng dẫn này mô tả cách tích hợp **Sentry** để theo dõi lỗi và hiệu năng (observability) trong production.

---

## 1. Cài đặt Sentry cho Next.js

Chạy lệnh sau tại thư mục gốc:

```bash
npx @sentry/wizard@latest -i nextjs
```

Sentry wizard sẽ tự động:
1. Cài đặt các gói `@sentry/nextjs`.
2. Tạo các tệp cấu hình: `sentry.client.config.ts`, `sentry.server.config.ts`, và `sentry.edge.config.ts`.
3. Thêm plugin của Sentry vào `next.config.ts`.

---

## 2. Liên kết với `@shipkit/logger`

Để tất cả các log cấp độ `error` tự động được gửi lên Sentry, cập nhật `packages/logger/src/index.ts` để import Sentry và capture exception:

```typescript
import * as Sentry from "@sentry/nextjs";
import type { LoggerPort, LogContext } from "./index";

export function createSentryLogger(namespace: string): LoggerPort {
  return {
    debug(msg, ctx) {
      console.log(`[${namespace}] [DEBUG]`, msg, ctx);
    },
    info(msg, ctx) {
      console.log(`[${namespace}] [INFO]`, msg, ctx);
    },
    warn(msg, ctx) {
      console.warn(`[${namespace}] [WARN]`, msg, ctx);
      Sentry.captureMessage(msg, {
        level: "warning",
        tags: { namespace },
        extra: ctx,
      });
    },
    error(msg, ctx, err) {
      console.error(`[${namespace}] [ERROR]`, msg, ctx, err);
      if (err) {
        Sentry.captureException(err, {
          tags: { namespace },
          extra: { message: msg, ...ctx },
        });
      } else {
        Sentry.captureMessage(msg, {
          level: "error",
          tags: { namespace },
          extra: ctx,
        });
      }
    },
  };
}
```

---

## 3. Cấu hình Biến môi trường

Khi chạy trên production (Vercel / Docker), đảm bảo đã thiết lập:

```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

Sentry SDK sẽ tự động bỏ qua việc gửi báo cáo lỗi nếu chạy ở môi trường development mà không có `SENTRY_DSN`.
