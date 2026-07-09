"use server";

import { EmailPasswordSchema } from "@shipkit/security";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

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

  const auth = getAuth();
  const { error } = await auth.signInWithPassword(parsed.data.email, parsed.data.password);
  if (error) return { error };

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

  const auth = getAuth();
  const { error } = await auth.signUpWithPassword(parsed.data.email, parsed.data.password);
  if (error) return { error };

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signOutAction() {
  const auth = getAuth();
  await auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
