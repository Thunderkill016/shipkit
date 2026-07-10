"use server";

import { EmailPasswordSchema } from "@shipkit/security";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { getLogger } from "@shipkit/logger";

const logger = getLogger("auth/actions");

export type AuthActionState = { error: string | null };

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = EmailPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rl = await authRateLimit.check(`signin:${parsed.data.email}`);
  if (!rl.success) {
    logger.warn("Rate limit exceeded", { action: "signIn", email: parsed.data.email, remaining: rl.remaining });
    return { error: "Too many sign-in attempts. Try again later." };
  }

  const auth = getAuth();
  const { error } = await auth.signInWithPassword(parsed.data.email, parsed.data.password);
  if (error) {
    logger.info("Sign in failed", { email: parsed.data.email, reason: error });
    return { error };
  }

  logger.info("User signed in", { email: parsed.data.email });
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = EmailPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rl = await authRateLimit.check(`signup:${parsed.data.email}`);
  if (!rl.success) {
    logger.warn("Rate limit exceeded", { action: "signUp", email: parsed.data.email, remaining: rl.remaining });
    return { error: "Too many sign-up attempts. Try again later." };
  }

  const auth = getAuth();
  const { error } = await auth.signUpWithPassword(parsed.data.email, parsed.data.password);
  if (error) {
    logger.info("Sign up failed", { email: parsed.data.email, reason: error });
    return { error };
  }

  logger.info("User signed up", { email: parsed.data.email });
  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signOutAction() {
  const auth = getAuth();
  await auth.signOut();
  logger.info("User signed out");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function oauthSignInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const provider = formData.get("provider");
  if (provider !== "google" && provider !== "github") {
    return { error: "Invalid OAuth provider" };
  }

  const auth = getAuth();
  if (!auth.getOAuthUrl) {
    return { error: "OAuth is not supported by the current auth adapter" };
  }

  const url = await auth.getOAuthUrl(provider);
  if (!url) {
    return { error: `OAuth provider "${provider}" is not configured. Add ${provider.toUpperCase()}_CLIENT_ID/SECRET to .env.local` };
  }

  redirect(url);
}
