/**
 * @shipkit/logger — structured logging port.
 *
 * Goals:
 * - Zero dependency by default (console fallback).
 * - Swap in Pino, Winston, or Sentry without touching application code.
 * - Structured fields: level, message, context, error.
 *
 * Usage:
 *   import { getLogger } from "@shipkit/logger";
 *   const logger = getLogger("auth");
 *   logger.info("User signed in", { userId });
 *   logger.error("Sign in failed", { email }, error);
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

/** Structured console logger — colour-coded in dev, JSON-friendly in prod. */
export function createConsoleLogger(namespace: string): LoggerPort {
  const isDev = process.env.NODE_ENV !== "production";

  function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const entry = {
      level,
      ns: namespace,
      msg: message,
      ...(context && Object.keys(context).length > 0 ? { ctx: context } : {}),
      ...(error ? { err: error instanceof Error ? { message: error.message, stack: error.stack } : error } : {}),
      ts: new Date().toISOString(),
    };

    if (isDev) {
      const prefix = `[${namespace}]`;
      if (level === "error") console.error(prefix, message, context ?? "", error ?? "");
      else if (level === "warn") console.warn(prefix, message, context ?? "");
      else console.log(prefix, message, context ?? "");
    } else {
      // Production: structured JSON for log aggregators (Datadog, Logtail, etc.)
      console.log(JSON.stringify(entry));
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

/**
 * Returns a cached logger for a given namespace.
 * In future: swap `createConsoleLogger` with a Pino adapter here.
 */
export function getLogger(namespace: string): LoggerPort {
  const cached = loggerCache.get(namespace);
  if (cached) return cached;
  const logger = createConsoleLogger(namespace);
  loggerCache.set(namespace, logger);
  return logger;
}
