import { createRateLimiter } from "@cyclewarden/security";

/** Auth endpoints: 20 attempts / 15 min per key (email or ip-ish). */
export const authRateLimit = createRateLimiter(20, 15 * 60 * 1000, "auth");
