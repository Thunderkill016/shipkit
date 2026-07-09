"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuth } from "@/lib/auth";
import { updateProfile } from "@/lib/profile-store";
import { getStorage } from "@/lib/storage";

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Display name required").max(60),
});

export type ProfileActionState = { error: string | null; ok?: boolean };

/**
 * Server action to update display name.
 */
export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getAuth().getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = ProfileSchema.safeParse({
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }

  await updateProfile(user.id, {
    displayName: parsed.data.displayName,
  });

  revalidatePath("/app/profile");
  return { error: null, ok: true };
}

/**
 * Server action to handle avatar file upload.
 */
export async function uploadAvatarAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getAuth().getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) {
    return { error: "No file selected" };
  }

  // Validate file size and type
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE) {
    return { error: "File size exceeds 2MB limit" };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only images (JPEG, PNG, GIF, WebP) are allowed" };
  }

  try {
    const storage = getStorage();
    const arrayBuffer = await file.arrayBuffer();
    const extension = file.name.split(".").pop() ?? "png";
    const key = `avatars/${user.id}-${Date.now()}.${extension}`;

    const uploaded = await storage.put(key, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      public: true,
    });

    await updateProfile(user.id, {
      avatarUrl: uploaded.url,
    });

    revalidatePath("/app/profile");
    return { error: null, ok: true };
  } catch (e) {
    console.error("Avatar upload failed:", e);
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}
