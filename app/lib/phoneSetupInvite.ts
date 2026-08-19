import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import {
  isExactSameOrigin,
  mintPhoneSetupToken,
  phoneSetupResponseOrigin,
} from "./phoneSetupSession";

const requestSchema = z.object({ ttl_minutes: z.number().int().min(5).max(30).optional() }).strict();

export async function createPhoneSetupInviteResponse(request: NextRequest) {
  if (!isExactSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const limit = await checkRateLimit(
    rateLimitKey(request.headers.get("x-forwarded-for")),
    LIMITS.phoneSetup.limit,
    LIMITS.phoneSetup.windowMs,
    "phoneSetup",
  );
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) },
    });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  try {
    const { token, claims } = mintPhoneSetupToken(
      Date.now(),
      (parsed.data.ttl_minutes || 20) * 60 * 1000,
    );
    const url = new URL(
      `/phone-alerts/install/${encodeURIComponent(token)}`,
      phoneSetupResponseOrigin(request),
    );
    return NextResponse.json({ ok: true, url: url.toString(), expires_at: new Date(claims.exp).toISOString() }, {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "phone_setup_unavailable" }, { status: 503 });
  }
}
