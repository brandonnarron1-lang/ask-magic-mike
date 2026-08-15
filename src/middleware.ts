import { NextRequest, NextResponse } from "next/server";
import { decodeBasicPassword, edgeSecretsMatch } from "@/lib/admin/edge-secret";
import {
  getLeadCenterRbacState,
  hasLeadCenterSessionCookie,
} from "@/lib/admin/rbac-policy";

const LEAD_CENTER_HOST = "hub.ourtownproperties.com";
const CANONICAL_LEAD_CENTER_URL = "https://www.askmagicmike.com/admin";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.hostname.toLowerCase() === LEAD_CENTER_HOST) {
    // The brokerage subdomain is an address shortcut, not a second app or data
    // boundary. Drop the incoming path/query to avoid leaking identifiers or
    // creating duplicate indexed admin URLs.
    return NextResponse.redirect(CANONICAL_LEAD_CENTER_URL, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const rbac = getLeadCenterRbacState();
  if (rbac.enabled) {
    if (!rbac.configured) {
      return new NextResponse("Lead Center identity service is not configured", {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN" },
      });
    }
    if (!hasLeadCenterSessionCookie(req.headers.get("cookie") || "")) {
      const login = new URL("/lead-center-login", req.url);
      login.searchParams.set("returnTo", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
    // This is an optimistic cookie-presence gate only. Every active page,
    // action, and route performs a full server-side session/role check.
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    return response;
  }

  const secret = process.env.ADMIN_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret === "changeme-local") {
    if (isProd) {
      // Hard fail in production — misconfigured deployment is safer than open admin
      return new NextResponse("Admin not configured", {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      });
    }
    // Dev fallback: accept "changeme-local" as password
  }

  const effectiveSecret = secret ?? "changeme-local";
  const password = decodeBasicPassword(
    req.headers.get("authorization") ?? "",
  );
  if (await edgeSecretsMatch(effectiveSecret, password)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    return response;
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Ask Magic Mike Admin"',
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    {
      source: "/:path*",
      has: [{ type: "host", value: LEAD_CENTER_HOST }],
    },
  ],
};
