import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import {
  PHONE_SETUP_COOKIE,
  phoneSetupResponseOrigin,
  verifyPhoneSetupToken,
} from "../../../lib/phoneSetupSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(
    rateLimitKey(request.headers.get("x-forwarded-for")),
    LIMITS.phoneSetup.limit,
    LIMITS.phoneSetup.windowMs,
    "phoneSetup",
  );
  const origin = phoneSetupResponseOrigin(request);
  if (!limit.allowed) {
    return privateRedirect(new URL("/phone-alerts/setup?error=rate_limited", origin));
  }

  const claims = verifyPhoneSetupToken(request.nextUrl.searchParams.get("token"));
  if (!claims) {
    return privateRedirect(new URL("/phone-alerts/setup?error=expired", origin));
  }

  const response = privateRedirect(new URL("/phone-alerts/setup", origin));
  response.cookies.set(PHONE_SETUP_COOKIE, request.nextUrl.searchParams.get("token") || "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: Math.max(60, Math.floor((claims.exp - Date.now()) / 1000)),
  });
  return response;
}
