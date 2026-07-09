export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export interface RateLimitPort {
  check(key: string): Promise<RateLimitResult>;
}

interface Record_ {
  count: number;
  resetTime: number;
}

/** In-memory limiter — local dev and fallback when Redis is absent. */
export class InMemoryRateLimiter implements RateLimitPort {
  private cache = new Map<string, Record_>();
  private lastSweep = Date.now();
  private static readonly SWEEP_MS = 60_000;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    if (now - this.lastSweep > InMemoryRateLimiter.SWEEP_MS) {
      this.lastSweep = now;
      for (const [k, v] of this.cache) {
        if (now > v.resetTime) this.cache.delete(k);
      }
    }

    const record = this.cache.get(key);
    if (!record || now > record.resetTime) {
      const resetTime = now + this.windowMs;
      this.cache.set(key, { count: 1, resetTime });
      return { success: true, limit: this.limit, remaining: this.limit - 1, resetTime };
    }

    record.count += 1;
    if (record.count > this.limit) {
      return { success: false, limit: this.limit, remaining: 0, resetTime: record.resetTime };
    }
    return {
      success: true,
      limit: this.limit,
      remaining: Math.max(0, this.limit - record.count),
      resetTime: record.resetTime,
    };
  }
}

export function createMemoryRateLimiter(limit: number, windowMs: number): RateLimitPort {
  return new InMemoryRateLimiter(limit, windowMs);
}
