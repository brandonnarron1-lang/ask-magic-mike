import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../src/lib/security/rate-limit";
import { isApprovedPublicOrigin } from "../../lib/publicOrigin";
import { recordServerAnalyticsEvent, safeAnalyticsProperties } from "../../lib/serverAnalytics";

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ error: "This event origin is not approved.", correlation_id: correlationId }, { status: 403 });
  }
  const limit = await checkRateLimit(rateLimitKey(req.headers.get("x-forwarded-for")), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs, "analyticsEvent");
  if (!limit.allowed) return NextResponse.json({ error: "Too many events.", correlation_id: correlationId }, { status: 429 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.event_name !== "string" || !/^[a-z][a-z0-9_]{1,80}$/.test(body.event_name)) {
    return NextResponse.json({ error: "Invalid event.", correlation_id: correlationId }, { status: 400 });
  }
  const properties = body.properties && typeof body.properties === "object" && !Array.isArray(body.properties) ? body.properties as Record<string, unknown> : {};
  const persisted = await recordServerAnalyticsEvent({
    eventName: body.event_name,
    category: typeof body.event_category === "string" ? body.event_category : "system",
    sessionId: typeof body.session_id === "string" ? body.session_id : null,
    leadId: typeof body.lead_id === "string" ? body.lead_id : null,
    properties: safeAnalyticsProperties(properties),
    attribution: body.attribution && typeof body.attribution === "object" ? body.attribution as { source?: string; medium?: string; campaign?: string } : undefined,
    userAgent: req.headers.get("user-agent"),
  });
  return NextResponse.json({ ok: true, persisted, correlation_id: correlationId }, { status: 202 });
}
