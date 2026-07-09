"use client";

import { useActionState, useRef } from "react";
import { updateProfileAction, uploadAvatarAction, type ProfileActionState } from "@/app/actions/profile";
import type { UserProfile } from "@/lib/profile-store";

const initial: ProfileActionState = { error: null };

export function ProfileEditor({ profile }: { profile: UserProfile }) {
  const [updateState, updateAction, updatePending] = useActionState(updateProfileAction, initial);
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadAvatarAction, initial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Avatar</h2>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-background overflow-hidden border border-border">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              profile.displayName ? profile.displayName[0]?.toUpperCase() : "U"
            )}
          </div>
          <div className="flex-1">
            <form action={uploadAction} className="flex flex-col gap-2">
              <input
                type="file"
                name="avatar"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    e.target.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="button"
                disabled={uploadPending}
                onClick={() => fileInputRef.current?.click()}
                className="w-fit rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:border-accent disabled:opacity-60"
              >
                {uploadPending ? "Uploading..." : "Upload new image"}
              </button>
              <p className="text-xs text-muted">JPEG, PNG, WEBP, or GIF. Max 2MB.</p>
              {uploadState.error && <p className="text-xs text-red-400">{uploadState.error}</p>}
            </form>
          </div>
        </div>
      </div>

      {/* Profile info section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Profile details</h2>
        <form action={updateAction} className="mt-4 space-y-4">
          <label className="block text-xs text-muted">
            Display name
            <input
              name="displayName"
              type="text"
              required
              defaultValue={profile.displayName ?? ""}
              placeholder="Your name"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          {updateState.error && <p className="text-xs text-red-400">{updateState.error}</p>}
          {updateState.ok && <p className="text-xs text-green-400">Profile updated successfully!</p>}

          <button
            type="submit"
            disabled={updatePending}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-background disabled:opacity-60"
          >
            {updatePending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
