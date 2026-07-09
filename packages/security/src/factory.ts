import { createMemoryRateLimiter, type RateLimitPort } from "./rate-limit";
import { createUpstashRateLimiter } from "./upstash";

/**
 * Prefer Upstash in production when configured; otherwise in-memory.
 */
export function createRateLimiter(
  limit: number,
  windowMs: number,
  prefix = "shipkit"
): RateLimitPort {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const upstash = createUpstashRateLimiter(limit, windowSeconds, prefix);
  if (upstash) return upstash;
  return createMemoryRateLimiter(limit, windowMs);
}
