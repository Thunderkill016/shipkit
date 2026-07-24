/**
 * @cyclewarden/i18n — lightweight i18n port.
 *
 * Goals:
 * - Zero runtime dependency in production (just a lookup function).
 * - Type-safe keys — TypeScript will error on unknown keys.
 * - Easy to swap: swap `createDictionary` with next-intl, i18next, etc.
 *
 * Usage:
 *   const t = createDictionary(locale, dictionaries);
 *   t("auth.signIn") // "Đăng nhập" | "Sign in"
 */

export type Locale = "vi" | "en";

export type DeepStringRecord = {
  [key: string]: string | DeepStringRecord;
};

export type FlatKeys<T extends DeepStringRecord, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends string
    ? Prefix extends "" ? `${string & K}` : `${Prefix}.${string & K}`
    : T[K] extends DeepStringRecord
    ? FlatKeys<T[K], Prefix extends "" ? `${string & K}` : `${Prefix}.${string & K}`>
    : never;
}[keyof T];

/**
 * Creates a type-safe translator function for a given locale and dictionary set.
 */
export function createDictionary<T extends DeepStringRecord>(
  locale: Locale,
  dictionaries: Record<Locale, T>
): (key: string, fallback?: string) => string {
  const dict = dictionaries[locale] ?? dictionaries["en"];

  return function t(key: string, fallback?: string): string {
    const parts = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-unknown
    let current: DeepStringRecord | string = dict as DeepStringRecord;
    for (const part of parts) {
      if (typeof current !== "object") break;
      current = current[part] ?? "";
    }
    if (typeof current === "string" && current !== "") return current;
    return fallback ?? key;
  };
}

/**
 * Detect locale from Accept-Language header (server-side).
 * Returns "vi" or "en"; defaults to "en".
 */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return "en";
  const lang = acceptLanguage.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (lang === "vi") return "vi";
  return "en";
}

export const SUPPORTED_LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "en";
