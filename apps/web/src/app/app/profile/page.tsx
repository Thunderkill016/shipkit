import Link from "next/link";
import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { getProfile } from "@/lib/profile-store";
import { ProfileEditor } from "./profile-editor";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const user = await getAuth().getUser();
  const adapter = getAuthAdapterName();

  const profile = user
    ? await getProfile(user.id, user.email)
    : { id: "", email: null, displayName: null, avatarUrl: null };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Account</p>
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">
          ← App
        </Link>
      </header>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="text-muted">Adapter</p>
          <p className="mt-1 font-mono text-foreground">{adapter}</p>
          <p className="mt-4 text-muted">Email</p>
          <p className="mt-1 font-medium">{user?.email ?? "— (demo / signed out)"}</p>
          <p className="mt-4 text-muted">User id</p>
          <p className="mt-1 break-all font-mono text-xs text-muted">{user?.id ?? "—"}</p>
        </div>

        {user && <ProfileEditor profile={profile} />}

        {user && (
          <form action={signOutAction} className="pt-2">
            <button
              type="submit"
              className="rounded-xl border border-border px-4 py-2 text-sm hover:border-accent"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
