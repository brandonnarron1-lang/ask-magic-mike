import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  const secret = process.env.ADMIN_SECRET ?? "changeme-local";
  const auth   = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme?.toLowerCase() === "basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [, pass] = decoded.split(":");
    if (pass === secret) return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Ask Magic Mike Admin"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
