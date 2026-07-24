import { createRateLimiter } from "@cyclewarden/security";

/** Auth endpoints: 20 attempts / 15 min per key (email or ip-ish). */
export const authRateLimit = createRateLimiter(20, 15 * 60 * 1000, "auth");

/** Resource-intensive Evolution workspace actions: 12 attempts / 10 min per operator. */
export const evolutionActionRateLimit = createRateLimiter(
  12,
  10 * 60 * 1000,
  "evolution-actions"
);
