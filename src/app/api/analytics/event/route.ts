import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/analytics.schema";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/security/rate-limit";
import { requestContext } from "@/lib/observability/request";

export async function POST(req: NextRequest) {
  const ctx = requestContext("analytics/event", req.headers.get("x-request-id"));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await checkRateLimit(rateLimitKey(ip), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs, "analyticsEvent");
  if (!rl.allowed) {
    ctx.log.warn("rate_limited", { request_id: ctx.requestId });
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { ...ctx.responseHeaders(), "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
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

  return NextResponse.json({ ok: true }, { headers: ctx.finish(200) });
}
