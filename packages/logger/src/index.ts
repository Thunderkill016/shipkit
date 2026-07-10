/**
 * @shipkit/logger — structured logging port.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerPort {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, error?: unknown): void;
}

/** Structured console logger — colour-coded in dev, JSON in prod. */
export function createConsoleLogger(namespace: string): LoggerPort {
  const isDev = process.env.NODE_ENV !== "production";

  function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const entry = {
      level,
      ns: namespace,
      msg: message,
      ...(context && Object.keys(context).length > 0 ? { ctx: context } : {}),
      ...(error
        ? {
            err:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
          }
        : {}),
      ts: new Date().toISOString(),
    };

    if (isDev) {
      const prefix = `[${namespace}]`;
      if (level === "error") console.error(prefix, message, context ?? "", error ?? "");
      else if (level === "warn") console.warn(prefix, message, context ?? "");
      else console.log(prefix, message, context ?? "");
    } else {
      console.log(JSON.stringify(entry));
    }

    // Optional Sentry (P2 observability) — fire and forget
    if (level === "error" && process.env.SENTRY_DSN) {
      void import("./sentry").then((m) => m.captureSentryError(message, context, error));
    }
  }

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, ctx, err) => log("error", msg, ctx, err),
  };
}

const loggerCache = new Map<string, LoggerPort>();

export function getLogger(namespace: string): LoggerPort {
  const cached = loggerCache.get(namespace);
  if (cached) return cached;
  const logger = createConsoleLogger(namespace);
  loggerCache.set(namespace, logger);
  return logger;
}

export { captureSentryError } from "./sentry";
