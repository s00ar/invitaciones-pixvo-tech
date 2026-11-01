import type { NextConfig } from "next";
import { maxUploadRequestBytes } from "./src/domain/media-policy";
const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg", "sharp"],
  poweredByHeader: false,
  experimental: { proxyClientMaxBodySize: maxUploadRequestBytes },
  outputFileTracingExcludes: {
    "/*": ["./research/**", "./.data/**", "./.test-data/**", "./*.zip"],
  },
  outputFileTracingIncludes: {
    "/*": ["./certs/supabase-root-2021.crt"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
