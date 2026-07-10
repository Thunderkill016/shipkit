import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { getProfile } from "@/lib/profile-store";

export default async function AppHomePage() {
  const user = await getAuth().getUser();
  const adapter = getAuthAdapterName();
  const configured = adapter !== "none";

  const profile = user ? await getProfile(user.id, user.email) : null;
  const displayName = profile?.displayName ?? user?.email?.split("@")[0] ?? "Guest";
  const avatarUrl = profile?.avatarUrl ?? null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Your product lives here</p>
          <h1 className="text-xl font-semibold">App</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-semibold">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-accent">{displayName[0]?.toUpperCase()}</span>
                )}
              </div>
              <span className="hidden sm:block">{displayName}</span>
            </div>
          )}
          <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
            Landing
          </Link>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        {!configured && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            <strong className="text-foreground">Demo mode</strong> — no auth adapter. Configure
            Supabase or Better Auth (<code className="text-foreground">pnpm doctor</code>).
          </div>
        )}

        {/* Session card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Auth adapter:{" "}
              <code className="text-foreground">{adapter}</code>
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                configured
                  ? "bg-accent/10 text-accent"
                  : "bg-border text-muted"
              }`}
            >
              {configured ? "active" : "demo"}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">Session</p>
          <p className="mt-1 font-medium">
            {user?.email ?? (configured ? "Not signed in — use /login" : "demo@shipkit.local")}
          </p>
          {user?.id && (
            <p className="mt-1 break-all font-mono text-xs text-muted">{user.id}</p>
          )}
        </div>

        {/* Vibe next slice */}
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
          <p className="font-medium text-foreground">Vibe the next slice</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Edit repo root <code className="text-foreground">IDEA.md</code> (MVP checklist)
            </li>
            <li>
              Tell your agent:{" "}
              <em className="text-foreground">
                Read IDEA.md + AGENTS.md. Implement the next MVP item under /app.
              </em>
            </li>
            <li>
              Add routes in <code className="text-foreground">src/app/app/</code>
            </li>
            <li>
              Keep vendor SDKs inside <code className="text-foreground">lib/adapters/</code>
            </li>
          </ol>
        </div>

        {/* Navigation cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/app/notes"
            className="rounded-xl border border-border bg-card p-5 text-sm hover:border-accent transition-colors group"
          >
            <p className="font-medium text-foreground group-hover:text-accent transition-colors">
              Notes example →
            </p>
            <p className="mt-2 text-muted">CRUD pattern với Zod + server actions (in-memory).</p>
          </Link>
          <Link
            href="/app/profile"
            className="rounded-xl border border-border bg-card p-5 text-sm hover:border-accent transition-colors group"
          >
            <p className="font-medium text-foreground group-hover:text-accent transition-colors">
              Profile →
            </p>
            <p className="mt-2 text-muted">Chỉnh sửa tên và tải lên avatar. Lưu vào DB hoặc bộ nhớ.</p>
          </Link>
        </div>

        {/* Sign out */}
        {user && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-border px-4 py-2 text-sm hover:border-accent transition-colors"
            >
              Đăng xuất
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
