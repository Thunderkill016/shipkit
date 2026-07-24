import type { RateLimitPort, RateLimitResult } from "./rate-limit";

/**
 * Upstash Redis rate limiter — used when UPSTASH_REDIS_REST_URL + TOKEN are set.
 * Lazy-imports @upstash packages so local dev without them still works if not installed
 * (they are optional peer-ish deps of the kit).
 */
export function createUpstashRateLimiter(
  requestsPerWindow: number,
  windowSeconds: number,
  prefix = "cyclewarden"
): RateLimitPort | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  let limiter: {
    limit: (key: string) => Promise<{
      success: boolean;
      limit: number;
      remaining: number;
      reset: number;
    }>;
  } | null = null;

  async function getLimiter() {
    if (limiter) return limiter;
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url: url!, token: token! });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requestsPerWindow, `${windowSeconds} s`),
      prefix,
    });
    return limiter;
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const rl = await getLimiter();
      const res = await rl.limit(key);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        resetTime: res.reset,
      };
    },
  };
}
