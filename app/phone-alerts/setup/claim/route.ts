import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import {
  PHONE_SETUP_COOKIE,
  PHONE_SETUP_MAX_TTL_MS,
  isProductionPhoneSetupRuntime,
  mintPhoneSetupSessionToken,
  phoneSetupResponseOrigin,
  verifyPhoneSetupInviteToken,
  verifyPhoneSetupSessionToken,
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

  const token = request.nextUrl.searchParams.get("token");
  const claims = verifyPhoneSetupInviteToken(token);
  if (!claims) {
    return privateRedirect(new URL("/phone-alerts/setup?error=expired", origin));
  }

  const existingSession = verifyPhoneSetupSessionToken(request.cookies.get(PHONE_SETUP_COOKIE)?.value);
  if (existingSession?.inviteNonce === claims.nonce) {
    return privateRedirect(new URL("/phone-alerts/setup", origin));
  }

  const oneTimeClaim = await checkRateLimit(
    `phone-setup-claim:${claims.nonce}`,
    1,
    PHONE_SETUP_MAX_TTL_MS,
    "phoneSetup",
  );
  const productionNeedsDurability = isProductionPhoneSetupRuntime();
  if (productionNeedsDurability && !oneTimeClaim.durable) {
    return privateRedirect(new URL("/phone-alerts/setup?error=claim_unavailable", origin));
  }
  if (!oneTimeClaim.allowed) {
    return privateRedirect(new URL("/phone-alerts/setup?error=already_claimed", origin));
  }

  let session;
  try {
    session = mintPhoneSetupSessionToken(claims);
  } catch {
    return privateRedirect(new URL("/phone-alerts/setup?error=expired", origin));
  }

  const response = privateRedirect(new URL("/phone-alerts/setup", origin));
  response.cookies.set(PHONE_SETUP_COOKIE, session.token, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: Math.max(60, Math.floor((session.claims.exp - Date.now()) / 1000)),
  });
  return response;
}
