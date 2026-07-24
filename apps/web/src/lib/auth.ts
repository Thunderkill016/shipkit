import type { AuthPort } from "@cyclewarden/auth";
import { createBetterAuthPort } from "./adapters/better-auth/port";
import { createSupabaseAuthPort } from "./adapters/supabase/auth";
import { resolveAuthAdapter } from "./auth-adapter";

const nonePort: AuthPort = {
  async getUser() {
    return null;
  },
  async signInWithPassword() {
    return { error: "No auth adapter configured. Run pnpm doctor and set env." };
  },
  async signUpWithPassword() {
    return { error: "No auth adapter configured. Run pnpm doctor and set env." };
  },
  async signOut() {},
};

/** App-facing auth — swap via AUTH_ADAPTER / env. */
export function getAuth(): AuthPort {
  const adapter = resolveAuthAdapter();
  if (adapter === "better-auth") return createBetterAuthPort();
  if (adapter === "supabase") return createSupabaseAuthPort();
  return nonePort;
}

export function getAuthAdapterName() {
  return resolveAuthAdapter();
}
