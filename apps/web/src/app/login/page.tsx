"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type AuthActionState } from "@/app/actions/auth";

const initial: AuthActionState = { error: null };

export default function LoginPage() {
  const [signInState, signIn, signInPending] = useActionState(signInAction, initial);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initial);
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
        Email + password via Supabase Auth adapter. Configure{" "}
        <code className="text-foreground">.env.local</code> first.
      </p>

      {!configured && (
        <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Supabase env not detected in the browser bundle. Copy{" "}
          <code>.env.example</code> → <code>apps/web/.env.local</code> and restart{" "}
          <code>pnpm dev</code>. Demo UI still works for layout review.
        </div>
      )}

      <form action={signIn} className="mt-8 flex flex-col gap-3">
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
        <input type="hidden" name="email" id="signup-email-mirror" />
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
