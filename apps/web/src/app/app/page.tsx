import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { getProfile } from "@/lib/profile-store";
import { getI18n } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function AppHomePage() {
  const { t, locale } = await getI18n();
  const user = await getAuth().getUser();
  const adapter = getAuthAdapterName();
  const configured = adapter !== "none";

  const profile = user ? await getProfile(user.id, user.email) : null;
  const displayName = profile?.displayName ?? user?.email?.split("@")[0] ?? "Guest";
  const avatarUrl = profile?.avatarUrl ?? null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">{t("app.tagline")}</p>
          <h1 className="text-xl font-semibold">{t("app.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher locale={locale} />
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
          <Link href="/" className="text-sm text-muted transition-colors hover:text-foreground">
            {t("common.landing")}
          </Link>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        {!configured && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
            {t("app.demoMode")}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {t("app.adapter")}: <code className="text-foreground">{adapter}</code>
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                configured ? "bg-accent/10 text-accent" : "bg-border text-muted"
              }`}
            >
              {configured ? "active" : "demo"}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted">{t("app.session")}</p>
          <p className="mt-1 font-medium">
            {user?.email ?? (configured ? "—" : "demo@shipkit.local")}
          </p>
          {user?.id && (
            <p className="mt-1 break-all font-mono text-xs text-muted">{user.id}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
          <p className="font-medium text-foreground">From idea to executable slice</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Edit <code className="text-foreground">IDEA.md</code></li>
            <li>Define a workflow in <code className="text-foreground">product/slices.json</code></li>
            <li>Run <code className="text-foreground">pnpm slice:new</code> or extend with custom code</li>
          </ol>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/app/slices"
            className="group rounded-xl border border-accent/40 bg-accent/5 p-5 text-sm transition hover:border-accent"
          >
            <p className="font-medium text-foreground transition group-hover:text-accent">
              Product Slice Engine →
            </p>
            <p className="mt-2 text-muted">Config → validation → owner-scoped working product flow.</p>
          </Link>
          <Link
            href="/app/notes"
            className="group rounded-xl border border-border bg-card p-5 text-sm transition-colors hover:border-accent"
          >
            <p className="font-medium text-foreground transition-colors group-hover:text-accent">
              {t("app.notesCard")}
            </p>
            <p className="mt-2 text-muted">{t("app.notesDesc")}</p>
          </Link>
          <Link
            href="/app/profile"
            className="group rounded-xl border border-border bg-card p-5 text-sm transition-colors hover:border-accent"
          >
            <p className="font-medium text-foreground transition-colors group-hover:text-accent">
              {t("app.profileCard")}
            </p>
            <p className="mt-2 text-muted">{t("app.profileDesc")}</p>
          </Link>
          <Link
            href="/app/billing"
            className="group rounded-xl border border-border bg-card p-5 text-sm transition-colors hover:border-accent"
          >
            <p className="font-medium text-foreground transition-colors group-hover:text-accent">
              {t("app.billingCard")}
            </p>
            <p className="mt-2 text-muted">{t("app.billingDesc")}</p>
          </Link>
        </div>

        {user && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:border-accent"
            >
              {t("auth.signOut")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
