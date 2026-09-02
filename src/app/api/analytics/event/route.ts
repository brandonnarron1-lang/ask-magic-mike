import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/analytics.schema";
import { trackEvent } from "@/lib/analytics/ledger";
import {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  isCanonicalLedgerProtectedEvent,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "@/lib/analytics/privacy";
import {
  checkRateLimit,
  rateLimitKey,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
} from "@/lib/security/rate-limit";
import { requestContext } from "@/lib/observability/request";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { isAutomatedBrowserUserAgent } from "../../../../../app/lib/browserAutomation";
import { isApprovedPublicOrigin } from "../../../../../app/lib/publicOrigin";

const MAX_EVENT_BODY_BYTES = 4_096;
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

function rateLimitRetryAfter(resetAt: number) {
  const maxSeconds = Math.ceil(LIMITS.analyticsEvent.windowMs / 1_000);
  const secondsUntilReset = Math.ceil((resetAt - Date.now()) / 1_000);
  return String(Math.max(
    1,
    Math.min(maxSeconds, Number.isFinite(secondsUntilReset) ? secondsUntilReset : maxSeconds),
  ));
}

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
  const ctx = requestContext("analytics/event");
  const respond = (
    body: Record<string, unknown>,
    status: number,
    extraHeaders: Record<string, string> = {},
  ) => NextResponse.json(
    { ...body, correlation_id: ctx.requestId },
    {
      status,
      headers: {
        ...ctx.finish(status),
        ...PRIVATE_NO_STORE_HEADERS,
        "X-AMM-Correlation-Id": ctx.requestId,
        ...extraHeaders,
      },
    },
  );

  const origin = req.headers.get("origin");
  if (!origin || !isApprovedPublicOrigin(origin)) {
    return respond(
      { error: "This event origin is not approved.", code: "origin_not_approved" },
      403,
    );
  }
  if (isAutomatedBrowserUserAgent(req.headers.get("user-agent"))) {
    return respond(
      { ok: true, persisted: false, excluded: "automation" },
      202,
    );
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return respond(
      {
        ok: false,
        persisted: false,
        error: mutation.publicMessage,
        code: mutation.error,
      },
      mutation.statusCode,
    );
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await checkRateLimit(rateLimitKey(ip), LIMITS.analyticsEvent.limit, LIMITS.analyticsEvent.windowMs, "analyticsEvent");
  if (!rl.allowed) {
    ctx.log.warn("rate_limited", { request_id: ctx.requestId });
    return respond(
      { error: "Too many events. Please wait and try again.", code: "rate_limited" },
      429,
      { "Retry-After": rateLimitRetryAfter(rl.resetAt) },
    );
  }
  if (!rl.durable && !nonDurableRateLimitFallbackAllowed()) {
    return respond(
      {
        ok: false,
        persisted: false,
        error: "Event collection is temporarily unavailable.",
        code: "rate_limit_store_unavailable",
      },
      503,
    );
  }

  const body = await readBoundedJson(req);
  if (!body.ok) {
    const code = body.status === 413
      ? "payload_too_large"
      : body.status === 415
        ? "unsupported_media_type"
        : "invalid_json";
    return respond(
      { error: body.status === 413 ? "Payload too large" : "Invalid JSON", code },
      body.status,
    );
  }

  const parsed = TrackEventSchema.safeParse(body.value);
  if (!parsed.success) {
    return respond(
      { error: "Validation failed", code: "invalid_event_payload" },
      422,
    );
  }
  if (!isApprovedPublicAnalyticsEvent(parsed.data.eventName)) {
    return respond(
      { error: "Invalid public event.", code: "event_not_public" },
      422,
    );
  }
  if (isCanonicalLedgerProtectedEvent(parsed.data.eventName)) {
    return respond(
      { error: "Invalid public event.", code: "event_not_public" },
      422,
    );
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
    funnelSessionId: parsed.data.sessionId,
    properties,
    utmSource: safeRegisteredPublicAnalyticsDimension("utm_source", parsed.data.utmSource) ?? undefined,
    utmMedium: safeRegisteredPublicAnalyticsDimension("utm_medium", parsed.data.utmMedium) ?? undefined,
    utmCampaign: safeRegisteredPublicAnalyticsDimension("utm_campaign", parsed.data.utmCampaign) ?? undefined,
    userAgent,
  });

  if (!persisted) {
    return respond(
      {
        ok: false,
        persisted: false,
        error: "Event persistence is unavailable.",
        code: "analytics_persistence_unavailable",
      },
      503,
    );
  }
  return respond({ ok: true, persisted: true }, 202);
}
