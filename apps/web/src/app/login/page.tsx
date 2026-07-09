"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signInAction,
  signUpAction,
  oauthSignInAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initial: AuthActionState = { error: null };

// Google SVG icon (inline, no dependency)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// GitHub SVG icon (inline, no dependency)
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [signInState, signIn, signInPending] = useActionState(signInAction, initial);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initial);
  const [oauthState, oauthSignIn, oauthPending] = useActionState(oauthSignInAction, initial);

  // Show OAuth buttons regardless — server action will show error if provider not configured
  // This keeps the UI consistent and lets users know OAuth is available.
  const configured =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-sm text-accent">
        ← shipkit
      </Link>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Email + password, or continue with a provider below.
      </p>

      {!configured && (
        <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Auth env not detected. Copy{" "}
          <code>.env.example</code> → <code>apps/web/.env.local</code> and restart{" "}
          <code>pnpm dev</code>. Demo UI still works for layout review.
        </div>
      )}

      {/* OAuth providers */}
      <div className="mt-6 flex flex-col gap-2">
        {oauthState.error && (
          <p className="text-sm text-red-400">{oauthState.error}</p>
        )}
        <form action={oauthSignIn} className="flex gap-2">
          <input type="hidden" name="provider" value="google" />
          <button
            type="submit"
            disabled={oauthPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
        <form action={oauthSignIn}>
          <input type="hidden" name="provider" value="github" />
          <button
            type="submit"
            disabled={oauthPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </form>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted">or email + password</span>
        </div>
      </div>

      <form action={signIn} className="flex flex-col gap-3">
        <label className="text-xs text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        {signInState.error && (
          <p className="text-sm text-red-400">{signInState.error}</p>
        )}
        <button
          type="submit"
          disabled={signInPending}
          className="mt-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {signInPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <form action={signUp} className="mt-6 border-t border-border pt-6">
        <p className="mb-3 text-xs text-muted">No account? Create one (same fields).</p>
        <div className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8)"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {signUpState.error && (
            <p className="text-sm text-red-400">{signUpState.error}</p>
          )}
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-xl border border-border py-2.5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            {signUpPending ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
