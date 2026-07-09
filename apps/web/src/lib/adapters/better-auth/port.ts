import type { AuthPort, AuthUser } from "@shipkit/auth";
import { headers } from "next/headers";
import { getBetterAuth } from "./auth-instance";

export function createBetterAuthPort(): AuthPort {
  return {
    async getUser(): Promise<AuthUser | null> {
      const auth = getBetterAuth();
      if (!auth) return null;
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) return null;
      return {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
        avatarUrl: session.user.image ?? null,
      };
    },

    async signInWithPassword(email, password) {
      const auth = getBetterAuth();
      if (!auth) return { error: "Better Auth is not configured (DATABASE_URL + BETTER_AUTH_SECRET)" };
      try {
        await auth.api.signInEmail({
          body: { email, password },
          headers: await headers(),
        });
        return { error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign in failed";
        return { error: msg };
      }
    },

    async signUpWithPassword(email, password) {
      const auth = getBetterAuth();
      if (!auth) return { error: "Better Auth is not configured (DATABASE_URL + BETTER_AUTH_SECRET)" };
      try {
        await auth.api.signUpEmail({
          body: { email, password, name: email.split("@")[0] ?? "User" },
          headers: await headers(),
        });
        return { error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign up failed";
        return { error: msg };
      }
    },

    async signOut() {
      const auth = getBetterAuth();
      if (!auth) return;
      try {
        await auth.api.signOut({ headers: await headers() });
      } catch {
        // ignore
      }
    },

    async getOAuthUrl(provider) {
      const auth = getBetterAuth();
      if (!auth) return null;
      try {
        const res = await auth.api.signInSocial({
          body: {
            provider,
            callbackURL: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app`,
          },
          headers: await headers(),
        });
        return (res as { url?: string }).url ?? null;
      } catch {
        return null;
      }
    },
  };
}
