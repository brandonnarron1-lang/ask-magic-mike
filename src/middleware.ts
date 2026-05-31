import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const secret = process.env.ADMIN_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret || secret === "changeme-local") {
    if (isProd) {
      // Hard fail in production — misconfigured deployment is safer than open admin
      return new NextResponse("Admin not configured", { status: 503 });
    }
    // Dev fallback: accept "changeme-local" as password
  }

  const effectiveSecret = secret ?? "changeme-local";
  const auth   = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme?.toLowerCase() === "basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [, pass] = decoded.split(":");
    if (pass === effectiveSecret) return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Ask Magic Mike Admin"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
