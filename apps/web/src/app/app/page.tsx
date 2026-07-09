import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getAuth, getAuthAdapterName } from "@/lib/auth";

export default async function AppHomePage() {
  const user = await getAuth().getUser();
  const adapter = getAuthAdapterName();
  const configured = adapter !== "none";

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Your product lives here</p>
          <h1 className="text-xl font-semibold">App</h1>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Landing
        </Link>
      </header>

      <div className="mt-8 space-y-4">
        {!configured && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            <strong className="text-foreground">Demo mode</strong> — no auth adapter. Configure
            Supabase or Better Auth (<code className="text-foreground">pnpm doctor</code>).
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted">
            Auth adapter:{" "}
            <code className="text-foreground">{adapter}</code>
          </p>
          <p className="mt-3 text-sm text-muted">Session</p>
          <p className="mt-1 font-medium">
            {user?.email ?? (configured ? "Not signed in — use /login" : "demo@shipkit.local")}
          </p>
          {user?.id && <p className="mt-1 font-mono text-xs text-muted">{user.id}</p>}
        </div>

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
            <li>Add routes in <code className="text-foreground">src/app/app/</code></li>
            <li>Keep vendor SDKs inside <code className="text-foreground">lib/adapters/</code></li>
          </ol>
        </div>

        <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
          <p className="font-medium text-foreground">Feature slot</p>
          <p className="mt-2">
            Replace this card with your first domain feature (list, editor, dashboard widget…).
            That is the product — Shipkit is only the shell.
          </p>
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
