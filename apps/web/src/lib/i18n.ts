import { cookies, headers } from "next/headers";
import {
  createDictionary,
  detectLocale,
  type Locale,
  DEFAULT_LOCALE,
} from "@cyclewarden/i18n";
import en from "@cyclewarden/i18n/locales/en.json";
import vi from "@cyclewarden/i18n/locales/vi.json";

export const LOCALE_COOKIE = "cyclewarden_locale";

const dictionaries = { en, vi } as const;

export type Translator = (key: string, fallback?: string) => string;

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (fromCookie === "vi" || fromCookie === "en") return fromCookie;

  const h = await headers();
  return detectLocale(h.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getI18n(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getLocale();
  const t = createDictionary(locale, dictionaries);
  return { locale, t };
}
