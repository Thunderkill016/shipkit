import { createSupabaseAuthPort } from "./adapters/supabase/auth";

/** App-facing auth — swap adapter here when Better Auth lands. */
export function getAuth() {
  return createSupabaseAuthPort();
}
