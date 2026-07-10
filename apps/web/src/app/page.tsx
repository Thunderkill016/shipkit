import Link from "next/link";
import { JsonLd, makeWebsiteSchema } from "@/components/jsonld";

const features = [
  {
    icon: "🔐",
    title: "Auth, plug-and-play",
    body: "Supabase hoặc Better Auth. Đổi sang nhau chỉ bằng một biến môi trường.",
  },
  {
    icon: "🗄️",
    title: "Database portable",
    body: "Drizzle ORM + Postgres. Chạy local, Neon, Railway, Supabase hoặc RDS — cùng một code.",
  },
  {
    icon: "📧",
    title: "Mail & Storage",
    body: "Resend / Console fallback. S3 / Local fallback. Sản xuất hay dev đều hoạt động.",
  },
  {
    icon: "🛡️",
    title: "Security mặc định",
    body: "CSP headers, Zod validation, rate-limiting, ASVS L1 baseline — đã cấu hình sẵn.",
  },
  {
    icon: "🚀",
    title: "Hai preset deploy",
    body: "Vercel (serverless) hoặc Docker compose (self-hosted). Kèm hướng dẫn từng bước.",
  },
  {
    icon: "🤖",
    title: "AI-first workflow",
    body: "AGENTS.md + IDEA.md + llms.txt. Agent đọc và biết chính xác phải làm gì.",
  },
];

const steps = [
  { n: "01", title: "Viết IDEA.md", body: "Ai, vấn đề gì, MVP là gì — một file agent thực sự tuân theo." },
  { n: "02", title: "pnpm dev", body: "Landing, auth, /app shell đã được cài sẵn." },
  { n: "03", title: "Vibe the product", body: "Implement tính năng dưới /app. Stack cố định; ý tưởng chạy nhanh." },
  { n: "04", title: "Ship a preset", body: "supabase-full hoặc portable-pg · Vercel hoặc Docker." },
];

export default function LandingPage() {
  const websiteSchema = makeWebsiteSchema({
    name: "Shipkit",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
      <JsonLd schema={websiteSchema} />

      {/* Header */}
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-accent">✦ shipkit</span>
        <nav className="flex gap-4 text-sm text-muted">
          <a
            href="https://github.com/Thunderkill016/shipkit"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Đăng nhập
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-accent px-3 py-1 font-medium text-background hover:opacity-90 transition-opacity"
          >
            Mở app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col justify-center gap-12 py-16">
        <div className="space-y-6">
          <p className="text-sm font-medium text-accent tracking-wider uppercase">
            Product kit cho vibe coding
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl leading-tight">
            Ý tưởng của bạn.{" "}
            <span className="bg-gradient-to-r from-accent to-accent-dim bg-clip-text text-transparent">
              Nền tảng đã ship.
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            Auth, security, database, và deploy recipes đều sẵn sàng. Bạn và AI agent chỉ cần
            tập trung vào sản phẩm — không phải chọn lại stack mỗi buổi làm việc.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Bắt đầu xây dựng →
            </Link>
            <a
              href="https://github.com/Thunderkill016/shipkit"
              className="rounded-xl border border-border px-6 py-2.5 text-sm text-foreground hover:border-accent transition-colors"
            >
              Xem trên GitHub
            </a>
          </div>
        </div>

        {/* Feature grid */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            Có sẵn trong kit
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border border-border bg-card px-5 py-4 hover:border-accent transition-colors group"
              >
                <span className="text-2xl">{f.icon}</span>
                <p className="mt-3 font-medium text-foreground group-hover:text-accent transition-colors">
                  {f.title}
                </p>
                <p className="mt-1 text-sm text-muted leading-relaxed">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* How-to steps */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            Quy trình 4 bước
          </p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-card px-4 py-4">
                <p className="text-xs font-mono text-accent">{s.n}</p>
                <p className="mt-1 font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Checklist */}
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {[
            "Ports & Adapters — không bị khoá vendor",
            "Research-backed defaults (12-factor, ASVS)",
            "IDEA.md + AGENTS.md workflow cho AI",
            "Monorepo: packages/auth, db, security, mail, storage",
            "Playwright E2E + Vitest unit tests",
            "Dockerfile multi-stage + docker-compose.prod.yml",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </main>

      {/* Footer */}
      <footer className="border-t border-border pt-6 text-xs text-muted flex items-center justify-between gap-4 flex-wrap">
        <span>MIT · Built so everyone can ship ideas faster</span>
        <span>
          Chỉnh sửa{" "}
          <code className="text-foreground">IDEA.md</code> rồi chạy{" "}
          <code className="text-foreground">pnpm dev</code>
        </span>
      </footer>
    </div>
  );
}
