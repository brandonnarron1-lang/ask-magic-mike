import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://ourtownproperties.com https://www.ourtownproperties.com https://*.ourtownproperties.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
