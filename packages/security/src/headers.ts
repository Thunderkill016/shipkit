/**
 * Production security headers — pattern from AtoEnglish next.config.
 * Framework adapters apply these in Next headers() / middleware / nginx.
 */
export function buildContentSecurityPolicy(options: {
  isDev: boolean;
  extraScriptSrc?: string[];
  extraConnectSrc?: string[];
  extraImgSrc?: string[];
}): string {
  const scriptSrc = [
    "'self'",
    ...(options.isDev ? ["'unsafe-eval'"] : []),
    "'unsafe-inline'",
    ...(options.extraScriptSrc ?? []),
  ].join(" ");

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    ...(options.extraConnectSrc ?? []),
  ].join(" ");

  const imgSrc = ["'self'", "blob:", "data:", "https://*.supabase.co", ...(options.extraImgSrc ?? [])].join(
    " "
  );

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src ${imgSrc}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export type SecurityHeader = { key: string; value: string };

export function securityHeaders(isDev: boolean): SecurityHeader[] {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({ isDev }),
    },
  ];
}
