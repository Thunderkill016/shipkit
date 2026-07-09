import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-accent">✦ shipkit</span>
        <nav className="flex gap-4 text-sm text-muted">
          <Link href="/login" className="hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-accent px-3 py-1 font-medium text-background hover:opacity-90"
          >
            Open app
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 py-20">
        <p className="text-sm font-medium text-accent">Product foundation kit</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Ship full products.
          <br />
          <span className="text-muted">Not just another router.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Landing → auth → app shell → database → security → deploy. Portable Postgres and
          adapters; Next.js is the first app adapter — not a permanent lock-in.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-background"
          >
            Get started
          </Link>
          <a
            href="https://github.com/Thunderkill016/shipkit"
            className="rounded-xl border border-border px-5 py-2.5 text-sm text-foreground hover:border-accent"
          >
            GitHub
          </a>
        </div>

        <ul className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-2">
          {[
            "Security headers + rate-limit primitives",
            "AuthPort + Supabase adapter (v0)",
            "Docker Postgres + Vercel recipes",
            "AGENTS.md for vibe / AI coding",
            "Presets: supabase-full · portable-pg",
            "Kernel packages ready for adapter #2",
          ].map((item) => (
            <li
              key={item}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              {item}
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-border pt-6 text-xs text-muted">
        MIT · Patterns extracted from production (AtoEnglish) · Not a multi-framework clone of
        MakerKit on day one — by design.
      </footer>
    </div>
  );
}
