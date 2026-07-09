/**
 * AuthPort — framework-agnostic auth contract.
 * Next adapter implements this with Supabase (v0) or Better Auth (v0.2).
 */
export interface AuthUser {
  id: string;
  email: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface AuthPort {
  getUser(): Promise<AuthUser | null>;
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signUpWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  /** OAuth start URL or redirect side-effect — adapter-specific */
  getOAuthUrl?(provider: "google" | "github"): Promise<string | null>;
}

export type AuthAdapterId = "supabase" | "better-auth";
