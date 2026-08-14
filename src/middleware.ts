import { NextRequest, NextResponse } from "next/server";
import { decodeBasicPassword, edgeSecretsMatch } from "@/lib/admin/edge-secret";

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

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

export const config = { matcher: ["/admin/:path*"] };
