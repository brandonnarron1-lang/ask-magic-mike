import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/analytics.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/security/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = checkRateLimit(rateLimitKey(ip), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TrackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;

  trackEventNoWait({
    ...parsed.data,
    ipAddress: ip ?? undefined,
    userAgent,
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
