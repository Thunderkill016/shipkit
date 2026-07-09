import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "./rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows up to limit requests", async () => {
    const rl = new InMemoryRateLimiter(3, 60_000);
    expect((await rl.check("a")).success).toBe(true);
    expect((await rl.check("a")).success).toBe(true);
    expect((await rl.check("a")).success).toBe(true);
    expect((await rl.check("a")).success).toBe(false);
  });

  it("isolates keys", async () => {
    const rl = new InMemoryRateLimiter(1, 60_000);
    expect((await rl.check("x")).success).toBe(true);
    expect((await rl.check("y")).success).toBe(true);
    expect((await rl.check("x")).success).toBe(false);
  });
});
