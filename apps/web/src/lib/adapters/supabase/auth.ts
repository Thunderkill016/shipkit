import type { AuthPort, AuthUser } from "@shipkit/auth";
import { createSupabaseServerClient } from "./server";

/** Supabase implementation of AuthPort (server). */
export function createSupabaseAuthPort(): AuthPort {
  return {
    async getUser(): Promise<AuthUser | null> {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return null;
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return null;
      return {
        id: u.id,
        email: u.email ?? null,
        name: (u.user_metadata?.full_name as string | undefined) ?? null,
        avatarUrl: (u.user_metadata?.avatar_url as string | undefined) ?? null,
      };
    },

    async signInWithPassword(email, password) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { error: "Supabase is not configured" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },

    async signUpWithPassword(email, password) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return { error: "Supabase is not configured" };
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },

    async signOut() {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  };
}
