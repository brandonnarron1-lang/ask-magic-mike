import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    domains: [],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "askmagicmike.com",
        "www.askmagicmike.com",
      ],
    },
  },
  async headers() {
    return [
      {
        // Security headers applied to every route
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // SAMEORIGIN blocks cross-origin embedding globally; /embed/* routes override
          // via CSP frame-ancestors, which modern browsers prefer over X-Frame-Options.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Allow ourtownproperties.com to embed /embed/* in an iframe.
        // Modern browsers use frame-ancestors (takes precedence over X-Frame-Options).
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://ourtownproperties.com https://*.ourtownproperties.com https://www.ourtownproperties.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
