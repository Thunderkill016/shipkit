import type { NextConfig } from "next";
import { securityHeaders } from "@shipkit/security";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: [
    "@shipkit/config",
    "@shipkit/security",
    "@shipkit/db",
    "@shipkit/auth",
    "@shipkit/storage",
    "@shipkit/mail",
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
