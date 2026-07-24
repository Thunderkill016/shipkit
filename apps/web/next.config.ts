import type { NextConfig } from "next";
import { securityHeaders } from "@cyclewarden/security";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: [
    "@cyclewarden/config",
    "@cyclewarden/security",
    "@cyclewarden/db",
    "@cyclewarden/auth",
    "@cyclewarden/storage",
    "@cyclewarden/mail",
    "@cyclewarden/logger",
    "@cyclewarden/i18n",
    "@cyclewarden/payment",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(isDev),
      },
    ];
  },
};

export default nextConfig;
