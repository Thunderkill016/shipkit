/**
 * Resolves which auth backend to use.
 * - AUTH_ADAPTER=supabase | better-auth | auto (default)
 * - auto: better-auth if DATABASE_URL+secret; else supabase if URL+key; else demo
 */
export type AuthAdapterName = "supabase" | "better-auth" | "none";

export function resolveAuthAdapter(): AuthAdapterName {
  const forced = process.env.AUTH_ADAPTER?.toLowerCase();
  if (forced === "supabase" || forced === "better-auth") {
    return forced;
  }

  const hasBetter =
    Boolean(process.env.DATABASE_URL) && Boolean(process.env.BETTER_AUTH_SECRET);
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasBetter) return "better-auth";
  if (hasSupabase) return "supabase";
  return "none";
}
