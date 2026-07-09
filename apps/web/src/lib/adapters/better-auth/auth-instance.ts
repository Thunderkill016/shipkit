import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "@/lib/db";

/**
 * Better Auth instance — portable self-hosted auth (research default 2026).
 * Requires DATABASE_URL + BETTER_AUTH_SECRET.
 * Optional OAuth: set GOOGLE_CLIENT_ID/SECRET or GITHUB_CLIENT_ID/SECRET.
 */
function buildAuth() {
  const db = createDb();
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  if (!db || !secret) {
    return null;
  }

  // Social providers — enabled only when env vars are present
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    socialProviders,
    trustedOrigins: [baseURL],
  });
}

export type BetterAuthInstance = NonNullable<ReturnType<typeof buildAuth>>;

let cached: BetterAuthInstance | null | undefined;

export function getBetterAuth(): BetterAuthInstance | null {
  if (cached !== undefined) return cached;
  cached = buildAuth();
  return cached;
}
