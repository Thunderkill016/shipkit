"use client";

import { useActionState } from "react";
import {
  signInAction,
  signUpAction,
  oauthSignInAction,
  type AuthActionState,
} from "@/app/actions/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export type LoginLabels = {
  title: string;
  subtitle: string;
  envHint: string;
  email: string;
  password: string;
  signIn: string;
  signingIn: string;
  noAccount: string;
  signUp: string;
  creating: string;
  continueGoogle: string;
  continueGithub: string;
};

const initial: AuthActionState = { error: null };

export function LoginForm({ labels }: { labels: LoginLabels }) {
  const [signInState, signIn, signInPending] = useActionState(signInAction, initial);
  const [signUpState, signUp, signUpPending] = useActionState(signUpAction, initial);
  const [oauthState, oauthSignIn, oauthPending] = useActionState(oauthSignInAction, initial);

  const mode =
    process.env.NEXT_PUBLIC_CYCLEWARDEN_MODE ??
    process.env.NEXT_PUBLIC_SHIPKIT_MODE ??
    "";
  const configured =
    mode === "better-auth" ||
    mode === "supabase" ||
    (typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT"));

  return (
    <>
      <h1 className="text-2xl font-semibold">{labels.title}</h1>
      <p className="mt-2 text-sm text-muted">{labels.subtitle}</p>

      {!configured && (
        <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          {labels.envHint}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {oauthState.error && <p className="text-sm text-red-400">{oauthState.error}</p>}
        <form action={oauthSignIn}>
          <input type="hidden" name="provider" value="google" />
          <button
            type="submit"
            disabled={oauthPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            <GoogleIcon />
            {labels.continueGoogle}
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
            {labels.continueGithub}
          </button>
        </form>
      </div>

      <form action={signIn} className="mt-8 flex flex-col gap-3">
        <label className="text-xs text-muted">
          {labels.email}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="text-xs text-muted">
          {labels.password}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>
        {signInState.error && <p className="text-sm text-red-400">{signInState.error}</p>}
        <button
          type="submit"
          disabled={signInPending}
          className="mt-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {signInPending ? labels.signingIn : labels.signIn}
        </button>
      </form>

      <form action={signUp} className="mt-6 border-t border-border pt-6">
        <p className="mb-3 text-xs text-muted">{labels.noAccount}</p>
        <div className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder={labels.email}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={labels.password}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {signUpState.error && <p className="text-sm text-red-400">{signUpState.error}</p>}
          <button
            type="submit"
            disabled={signUpPending}
            className="rounded-xl border border-border py-2.5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            {signUpPending ? labels.creating : labels.signUp}
          </button>
        </div>
      </form>
    </>
  );
}
