import { setLocaleAction } from "@/app/actions/locale";
import type { Locale } from "@shipkit/i18n";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  return (
    <form action={setLocaleAction} className="inline-flex items-center gap-1 text-xs">
      <button
        type="submit"
        name="locale"
        value="vi"
        className={
          locale === "vi"
            ? "rounded px-1.5 py-0.5 font-semibold text-accent"
            : "rounded px-1.5 py-0.5 text-muted hover:text-foreground"
        }
      >
        VI
      </button>
      <span className="text-border">|</span>
      <button
        type="submit"
        name="locale"
        value="en"
        className={
          locale === "en"
            ? "rounded px-1.5 py-0.5 font-semibold text-accent"
            : "rounded px-1.5 py-0.5 text-muted hover:text-foreground"
        }
      >
        EN
      </button>
    </form>
  );
}
