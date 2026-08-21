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

// Phone-install links contain a short-lived, copy-role-only setup capability.
// Keep this rule after the site-wide defaults so Next applies the stricter
// privacy policy to every install, manifest, claim, and setup response.
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

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
