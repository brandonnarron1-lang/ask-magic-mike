import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const widgetFrameAncestors = {
  key: "Content-Security-Policy",
  value:
    "frame-ancestors 'self' https://ourtownproperties.com https://www.ourtownproperties.com https://*.ourtownproperties.com",
};

const privateLeadCenterHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const privatePhoneAlertHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-cache, no-store, max-age=0, must-revalidate",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/value",
        destination: "/home-value",
        permanent: true,
      },
      {
        source: "/we-buy-houses",
        destination: "/sell",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/embed/:path*",
        headers: [widgetFrameAncestors],
      },
      {
        // source: "/widget" remains an explicit compatibility surface.
        source: "/widget",
        headers: [widgetFrameAncestors],
      },
      {
        source: "/widget/:path*",
        headers: [widgetFrameAncestors],
      },
      {
        source: "/phone-alerts/:path*",
        headers: privatePhoneAlertHeaders,
      },
      {
        source: "/admin/:path*",
        headers: privateLeadCenterHeaders,
      },
      {
        source: "/lead-center-login",
        headers: privateLeadCenterHeaders,
      },
      {
        source: "/lead-center-password-help",
        headers: privateLeadCenterHeaders,
      },
      {
        source: "/lead-center-set-password",
        headers: privateLeadCenterHeaders,
      },
    ];
  },
};

export default nextConfig;
