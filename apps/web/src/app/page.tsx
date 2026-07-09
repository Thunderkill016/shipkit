import Link from "next/link";
import { JsonLd, makeWebsiteSchema } from "@/components/jsonld";

const steps = [
  { n: "01", title: "Write IDEA.md", body: "Who, problem, MVP checklist — one file agents actually follow." },
  { n: "02", title: "pnpm dev", body: "Landing, auth, and /app shell are already wired." },
  { n: "03", title: "Vibe the product", body: "Implement features under /app. Stack stays fixed; ideas move fast." },
  { n: "04", title: "Ship a preset", body: "supabase-full or portable-pg · Vercel or Docker." },
];

export default function LandingPage() {
  const websiteSchema = makeWebsiteSchema({
    name: "Shipkit",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <JsonLd schema={websiteSchema} />
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-accent">✦ shipkit</span>
        <nav className="flex gap-4 text-sm text-muted">
          <a href="https://github.com/Thunderkill016/shipkit" className="hover:text-foreground">
            GitHub
          </a>
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

      <main className="flex flex-1 flex-col justify-center gap-8 py-16">
        <p className="text-sm font-medium text-accent">Product kit for vibe coding</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Your idea.
          <br />
          <span className="text-muted">Foundation already shipped.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          Auth, security, database path, and deploy recipes are ready. You and your agent focus on
          the product — not re-picking a stack every session.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-background"
          >
            Start building
          </Link>
          <Link
            href="/app"
            className="rounded-xl border border-border px-5 py-2.5 text-sm text-foreground hover:border-accent"
          >
            App shell
          </Link>
        </div>

        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-card px-4 py-4">
              <p className="text-xs font-mono text-accent">{s.n}</p>
              <p className="mt-1 font-medium text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {[
            "Research-backed defaults (12-factor, ASVS, agents.md)",
            "Ports so you are not locked to one vendor forever",
            "Security headers + validation primitives",
            "IDEA.md + AGENTS.md workflow for AI agents",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-border pt-6 text-xs text-muted">
        MIT · Built so everyone can ship ideas faster · Edit <code className="text-foreground">IDEA.md</code>{" "}
        and go
      </footer>
    </div>
  );
}
