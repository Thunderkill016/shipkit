/**
 * Next.js instrumentation — optional Sentry when SENTRY_DSN is set.
 * Install peer: pnpm --filter @shipkit/web add @sentry/node
 * Docs: docs/SENTRY.md
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.SENTRY_DSN) return;

  try {
    const name = "@sentry/node";
    // Dynamic string avoids hard dependency at build time
    const Sentry = (await import(/* webpackIgnore: true */ name)) as {
      init: (opts: Record<string, unknown>) => void;
    };
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      environment: process.env.NODE_ENV,
    });
  } catch {
    console.warn(
      "[shipkit] SENTRY_DSN set but @sentry/node is not installed. Run: pnpm --filter @shipkit/web add @sentry/node"
    );
  }
}
