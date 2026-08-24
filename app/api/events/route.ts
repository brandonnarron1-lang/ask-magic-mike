import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "../../../src/lib/security/rate-limit";
import { analyticsEvents } from "../../lib/constants";
import { isAutomatedBrowserUserAgent } from "../../lib/browserAutomation";
import { isApprovedPublicOrigin } from "../../lib/publicOrigin";
import {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  recordServerAnalyticsEvent,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "../../lib/serverAnalytics";

const approvedEventNames = new Set<string>(analyticsEvents);
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
    const value: unknown = JSON.parse(bodyText);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true as const, value: value as Record<string, unknown> }
      : { ok: false as const, status: 400 as const };
  } catch {
    return { ok: false as const, status: 400 as const };
  }
}

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ error: "This event origin is not approved.", correlation_id: correlationId }, { status: 403 });
  }
  if (isAutomatedBrowserUserAgent(req.headers.get("user-agent"))) {
    return NextResponse.json(
      { ok: true, persisted: false, excluded: "automation", correlation_id: correlationId },
      { status: 202 },
    );
  }
  const limit = await checkRateLimit(rateLimitKey(req.headers.get("x-forwarded-for")), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs, "analyticsEvent");
  if (!limit.allowed) return NextResponse.json({ error: "Too many events.", correlation_id: correlationId }, { status: 429 });
  const parsed = await readBoundedJson(req);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: parsed.status === 413 ? "Event payload is too large." : "Invalid event payload.",
        correlation_id: correlationId,
      },
      { status: parsed.status },
    );
  }
  const body = parsed.value;
  if (typeof body.event_name !== "string" || !approvedEventNames.has(body.event_name)) {
    return NextResponse.json({ error: "Invalid event.", correlation_id: correlationId }, { status: 400 });
  }
  if (!isApprovedPublicAnalyticsEvent(body.event_name)) {
    return NextResponse.json({ error: "Invalid public event.", correlation_id: correlationId }, { status: 400 });
  }
  const properties = body.properties && typeof body.properties === "object" && !Array.isArray(body.properties) ? body.properties as Record<string, unknown> : {};
  const persisted = await recordServerAnalyticsEvent({
    eventName: body.event_name,
    category: body.event_name === "page_view" ? "session" : "intake",
    sessionId: typeof body.session_id === "string" ? body.session_id : null,
    leadId: null,
    properties: safePublicAnalyticsProperties(body.event_name, properties),
    attribution: body.attribution && typeof body.attribution === "object"
      ? {
          source: safeRegisteredPublicAnalyticsDimension("utm_source", (body.attribution as Record<string, unknown>).source) ?? undefined,
          medium: safeRegisteredPublicAnalyticsDimension("utm_medium", (body.attribution as Record<string, unknown>).medium) ?? undefined,
          campaign: safeRegisteredPublicAnalyticsDimension("utm_campaign", (body.attribution as Record<string, unknown>).campaign) ?? undefined,
        }
      : undefined,
    userAgent: coarseAnalyticsUserAgent(req.headers.get("user-agent"), properties.device_category),
  });
  if (!persisted) {
    return NextResponse.json(
      { ok: false, persisted: false, error: "Event persistence is unavailable.", correlation_id: correlationId },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, persisted: true, correlation_id: correlationId }, { status: 202 });
}
