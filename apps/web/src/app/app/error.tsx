"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for observability — replace with Sentry when ready
    console.error("[cyclewarden/app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10">
      <div className="w-full rounded-xl border border-border bg-card p-8 text-center space-y-4">
        <p className="text-3xl">⚠️</p>
        <h2 className="text-lg font-semibold text-foreground">Có lỗi xảy ra</h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          {error.message || "Lỗi không xác định. Vui lòng thử lại."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted">
            Mã lỗi: <span className="text-foreground">{error.digest}</span>
          </p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Thử lại
          </button>
          <Link
            href="/app"
            className="rounded-xl border border-border px-4 py-2 text-sm hover:border-accent transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
