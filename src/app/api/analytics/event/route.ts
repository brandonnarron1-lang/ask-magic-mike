import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/analytics.schema";
import { trackEvent } from "@/lib/analytics/ledger";
import {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  safePublicAnalyticsDimension,
  safePublicAnalyticsProperties,
} from "@/lib/analytics/privacy";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/security/rate-limit";
import { requestContext } from "@/lib/observability/request";
import { isApprovedPublicOrigin } from "../../../../../app/lib/publicOrigin";

const MAX_EVENT_BODY_BYTES = 4_096;

async function readBoundedJson(req: Request) {
  const contentType = req.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return { ok: false as const, status: 415 as const };
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EVENT_BODY_BYTES) {
    return { ok: false as const, status: 413 as const };
  }
  if (!req.body) return { ok: false as const, status: 400 as const };

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let bodyText = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    byteLength += chunk.value.byteLength;
    if (byteLength > MAX_EVENT_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false as const, status: 413 as const };
    }
    bodyText += decoder.decode(chunk.value, { stream: true });
  }
  bodyText += decoder.decode();
  try {
    return { ok: true as const, value: JSON.parse(bodyText) as unknown };
  } catch {
    return { ok: false as const, status: 400 as const };
  }
}

export async function POST(req: NextRequest) {
  const ctx = requestContext("analytics/event", req.headers.get("x-request-id"));
  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ error: "origin_not_approved" }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await checkRateLimit(rateLimitKey(ip), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs, "analyticsEvent");
  if (!rl.allowed) {
    ctx.log.warn("rate_limited", { request_id: ctx.requestId });
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429, headers: { ...ctx.responseHeaders(), "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await readBoundedJson(req);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.status === 413 ? "Payload too large" : "Invalid JSON" },
      { status: body.status },
    );
  }

  const parsed = TrackEventSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  if (!isApprovedPublicAnalyticsEvent(parsed.data.eventName)) {
    return NextResponse.json({ error: "event_not_public" }, { status: 422 });
  }

  const properties = safePublicAnalyticsProperties(
    parsed.data.eventName,
    parsed.data.properties,
  );
  const userAgent = coarseAnalyticsUserAgent(
    req.headers.get("user-agent"),
    properties.device_category,
  ) ?? undefined;

  const persisted = await trackEvent({
    eventName: parsed.data.eventName,
    sessionId: parsed.data.sessionId,
    properties,
    utmSource: safePublicAnalyticsDimension(parsed.data.utmSource) ?? undefined,
    utmMedium: safePublicAnalyticsDimension(parsed.data.utmMedium) ?? undefined,
    utmCampaign: safePublicAnalyticsDimension(parsed.data.utmCampaign) ?? undefined,
    userAgent,
  });

  if (!persisted) {
    return NextResponse.json(
      { ok: false, persisted: false, error: "analytics_persistence_unavailable" },
      { status: 503, headers: ctx.finish(503) },
    );
  }
  return NextResponse.json(
    { ok: true, persisted: true },
    { status: 202, headers: ctx.finish(202) },
  );
}
