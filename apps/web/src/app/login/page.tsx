import Link from "next/link";
import { getI18n } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { t, locale } = await getI18n();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-accent">
          ← shipkit
        </Link>
        <LocaleSwitcher locale={locale} />
      </div>
      <LoginForm
        labels={{
          title: t("auth.signIn"),
          subtitle: t("auth.subtitle"),
          envHint: t("auth.envHint"),
          email: t("auth.email"),
          password: t("auth.password"),
          signIn: t("auth.signIn"),
          signingIn: t("auth.signingIn"),
          noAccount: t("auth.noAccount"),
          signUp: t("auth.signUp"),
          creating: t("auth.creating"),
          continueGoogle: t("auth.continueGoogle"),
          continueGithub: t("auth.continueGithub"),
        }}
      />
    </div>
  );
}
