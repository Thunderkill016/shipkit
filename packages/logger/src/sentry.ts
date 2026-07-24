import type { LogContext } from "./index";

/**
 * Optional Sentry bridge — only when SENTRY_DSN is set and @sentry/node is installed.
 */
export async function captureSentryError(
  message: string,
  ctx?: LogContext,
  err?: unknown
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const name = "@sentry/node";
    const Sentry = (await import(/* webpackIgnore: true */ name)) as {
      __cyclewardenInit?: boolean;
      init: (opts: Record<string, unknown>) => void;
      captureException: (e: unknown, o?: Record<string, unknown>) => void;
      captureMessage: (m: string, o?: Record<string, unknown>) => void;
    };
    if (!Sentry.__cyclewardenInit) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        environment: process.env.NODE_ENV,
      });
      Sentry.__cyclewardenInit = true;
    }
    if (err instanceof Error) {
      Sentry.captureException(err, { extra: { message, ...ctx } });
    } else {
      Sentry.captureMessage(message, { level: "error", extra: ctx });
    }
  } catch {
    // package not installed — ignore
  }
}
