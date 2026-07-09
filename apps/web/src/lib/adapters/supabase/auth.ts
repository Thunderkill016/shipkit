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

    async getOAuthUrl(provider) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) return null;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
        },
      });
      if (error) return null;
      return data.url;
    },
  };
}
