import type { Metadata } from "next";

const siteName = "CycleWarden";
const defaultDescription =
  "Open product kit for vibe coding — idea to landing, auth, app, security, and deploy.";

export function absoluteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/** Shared SEO / Open Graph helpers for product pages. */
export function createMetadata(opts: {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const title = opts.title ? `${opts.title} · ${siteName}` : siteName;
  const description = opts.description ?? defaultDescription;
  const url = absoluteUrl(opts.path ?? "/");

  return {
    title: opts.title ? { absolute: title } : siteName,
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: url },
  };
}
