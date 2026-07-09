import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getAuth } from "@/lib/auth";

export default async function AppHomePage() {
  const user = await getAuth().getUser();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Protected shell</p>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Landing
        </Link>
      </header>

      <div className="mt-8 space-y-4">
        {!configured && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            Running in <strong className="text-foreground">demo mode</strong> (no Supabase
            env). Middleware allows this route so you can design the shell. Wire env for real
            auth guards.
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="mt-1 font-medium">
            {user?.email ?? (configured ? "Not signed in" : "demo@shipkit.local")}
          </p>
          {user?.id && (
            <p className="mt-1 font-mono text-xs text-muted">{user.id}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
          <p className="font-medium text-foreground">Next steps for your product</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>Add domain tables + RLS (or app-level authz for portable-pg)</li>
            <li>Extend landing sections / design tokens</li>
            <li>Deploy: Vercel or Docker (see presets/)</li>
            <li>Keep vendor SDKs inside <code className="text-foreground">lib/adapters/*</code></li>
          </ol>
        </div>

        {user && (
          <form action={signOutAction}>
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
