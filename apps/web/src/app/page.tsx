import Link from "next/link";
import { JsonLd, makeWebsiteSchema } from "@/components/jsonld";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getI18n } from "@/lib/i18n";

export default async function LandingPage() {
  const { t, locale } = await getI18n();
  const websiteSchema = makeWebsiteSchema({
    name: "CycleWarden",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });

  const features = [
    { icon: "🔐", title: t("landing.features.authTitle"), body: t("landing.features.authBody") },
    { icon: "🗄️", title: t("landing.features.dbTitle"), body: t("landing.features.dbBody") },
    { icon: "📧", title: t("landing.features.mailTitle"), body: t("landing.features.mailBody") },
    { icon: "🛡️", title: t("landing.features.secTitle"), body: t("landing.features.secBody") },
    { icon: "🚀", title: t("landing.features.deployTitle"), body: t("landing.features.deployBody") },
    { icon: "🤖", title: t("landing.features.aiTitle"), body: t("landing.features.aiBody") },
  ];

  const steps = [
    { n: "01", title: t("landing.steps.s1t"), body: t("landing.steps.s1b") },
    { n: "02", title: t("landing.steps.s2t"), body: t("landing.steps.s2b") },
    { n: "03", title: t("landing.steps.s3t"), body: t("landing.steps.s3b") },
    { n: "04", title: t("landing.steps.s4t"), body: t("landing.steps.s4b") },
  ];

  const checks = [
    t("landing.checks.c1"),
    t("landing.checks.c2"),
    t("landing.checks.c3"),
    t("landing.checks.c4"),
    t("landing.checks.c5"),
    t("landing.checks.c6"),
  ];

  const faqs = [
    { q: t("landing.faq1q"), a: t("landing.faq1a") },
    { q: t("landing.faq2q"), a: t("landing.faq2a") },
    { q: t("landing.faq3q"), a: t("landing.faq3a") },
    { q: t("landing.faq4q"), a: t("landing.faq4a") },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-10">
      <JsonLd schema={websiteSchema} />

      <header className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold tracking-wide text-accent">✦ cyclewarden</span>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <LocaleSwitcher locale={locale} />
          <a
            href="https://github.com/Thunderkill016/cyclewarden"
            className="hover:text-foreground transition-colors"
          >
            {t("landing.viewOnGithub")}
          </a>
          <Link href="/login" className="hover:text-foreground transition-colors">
            {t("landing.login")}
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-accent px-3 py-1 font-medium text-background hover:opacity-90 transition-opacity"
          >
            {t("landing.openApp")}
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-12 py-16">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            {t("landing.tagline")}
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
            {t("landing.hero")}{" "}
            <span className="bg-gradient-to-r from-accent to-accent-dim bg-clip-text text-transparent">
              {t("landing.heroAccent")}
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted">{t("landing.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              {t("landing.cta")} →
            </Link>
            <a
              href="https://github.com/Thunderkill016/cyclewarden"
              className="rounded-xl border border-border px-6 py-2.5 text-sm text-foreground transition-colors hover:border-accent"
            >
              {t("landing.viewOnGithub")}
            </a>
          </div>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("landing.included")}
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li
                key={f.title}
                className="group rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="text-2xl">{f.icon}</span>
                <p className="mt-3 font-medium text-foreground transition-colors group-hover:text-accent">
                  {f.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("landing.stepsTitle")}
          </p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-card px-4 py-4">
                <p className="font-mono text-xs text-accent">{s.n}</p>
                <p className="mt-1 font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Pricing — ShipFast TTP / marketing shell */}
        <div id="pricing">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("landing.pricingTitle")}
          </p>
          <p className="mb-4 max-w-xl text-sm text-muted">{t("landing.pricingSub")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted">{t("landing.planFree")}</p>
              <p className="mt-2 text-3xl font-semibold">{t("landing.planFreePrice")}</p>
              <p className="mt-1 text-sm text-muted">{t("landing.planFreeDesc")}</p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl border border-border px-4 py-2 text-sm hover:border-accent"
              >
                {t("landing.planCta")}
              </Link>
            </div>
            <div className="rounded-xl border border-accent/50 bg-card p-6">
              <p className="text-sm text-accent">{t("landing.planPro")}</p>
              <p className="mt-2 text-3xl font-semibold">{t("landing.planProPrice")}</p>
              <p className="mt-1 text-sm text-muted">{t("landing.planProDesc")}</p>
              <Link
                href="/app/billing"
                className="mt-6 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-background"
              >
                {t("landing.planProCta")}
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div id="faq">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
            {t("landing.faqTitle")}
          </p>
          <ul className="space-y-3">
            {faqs.map((item) => (
              <li key={item.q} className="rounded-xl border border-border bg-card px-5 py-4">
                <p className="font-medium text-foreground">{item.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
              </li>
            ))}
          </ul>
        </div>

        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {checks.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="shrink-0 text-accent">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted">
        <span>MIT · {t("landing.footerMission")}</span>
        <span>{t("landing.footerHint")}</span>
      </footer>
    </div>
  );
}
