import { NextResponse } from "next/server";
import {
  checkRateLimit,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
  rateLimitKey,
} from "../../../src/lib/security/rate-limit";
import {
  assertDatabaseMutationAllowed,
} from "../../../src/lib/preview-security";
import { analyticsEvents } from "../../lib/constants";
import { isAutomatedBrowserUserAgent } from "../../lib/browserAutomation";
import {
  normalizeWebVitalEventProperties,
  toWebVitalAnalyticsProperties,
} from "../../lib/experience/web-vitals";
import {
  coarseWebVitalUserAgent,
  isCanonicalProductionWebVitalRequest,
  webVitalMetricDigest,
} from "../../lib/experience/web-vitals-server";
import { isApprovedPublicOrigin } from "../../lib/publicOrigin";
import {
  coarseAnalyticsUserAgent,
  isApprovedPublicAnalyticsEvent,
  isCanonicalLedgerProtectedEvent,
  recordServerAnalyticsEvent,
  safePublicAnalyticsProperties,
  safeRegisteredPublicAnalyticsDimension,
} from "../../lib/serverAnalytics";

const approvedEventNames = new Set<string>(analyticsEvents);
const MAX_EVENT_BODY_BYTES = 4_096;
const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function eventResponse(
  correlationId: string,
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { ...body, correlation_id: correlationId },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        "X-AMM-Correlation-Id": correlationId,
        ...extraHeaders,
      },
    },
  );
}

function rateLimitRetryAfter(resetAt: number) {
  const maxSeconds = Math.ceil(LIMITS.analyticsEvent.windowMs / 1_000);
  const secondsUntilReset = Math.ceil((resetAt - Date.now()) / 1_000);
  return String(Math.max(
    1,
    Math.min(maxSeconds, Number.isFinite(secondsUntilReset) ? secondsUntilReset : maxSeconds),
  ));
}

function publicEventSessionId(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
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
  const origin = req.headers.get("origin");
  if (!origin || !isApprovedPublicOrigin(origin)) {
    return eventResponse(
      correlationId,
      { error: "This event origin is not approved.", code: "origin_not_approved" },
      403,
    );
  }
  if (isAutomatedBrowserUserAgent(req.headers.get("user-agent"))) {
    return eventResponse(
      correlationId,
      { ok: true, persisted: false, excluded: "automation" },
      202,
    );
  }
  // Read-only Preview must refuse before the limiter can write a durable
  // bucket or the analytics repository can persist an event. Controlled
  // Preview mutation remains available only through the existing endpoint-
  // attested PREVIEW_DATA_MODE / ALLOW_PREVIEW_DB_MUTATION gate.
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return eventResponse(
      correlationId,
      {
        ok: false,
        persisted: false,
        error: mutation.publicMessage,
        code: mutation.error,
      },
      mutation.statusCode,
    );
  }
  const limit = await checkRateLimit(
    rateLimitKey(req.headers.get("x-forwarded-for")),
    LIMITS.analyticsEvent.limit,
    LIMITS.analyticsEvent.windowMs,
    "analyticsEvent",
  );
  if (!limit.allowed) {
    return eventResponse(
      correlationId,
      { error: "Too many events. Please wait and try again.", code: "rate_limited" },
      429,
      { "Retry-After": rateLimitRetryAfter(limit.resetAt) },
    );
  }
  if (!limit.durable && !nonDurableRateLimitFallbackAllowed()) {
    return eventResponse(
      correlationId,
      {
        ok: false,
        persisted: false,
        error: "Event collection is temporarily unavailable.",
        code: "rate_limit_store_unavailable",
      },
      503,
    );
  }
  const parsed = await readBoundedJson(req);
  if (!parsed.ok) {
    const code = parsed.status === 413
      ? "payload_too_large"
      : parsed.status === 415
        ? "unsupported_media_type"
        : "invalid_json";
    return eventResponse(
      correlationId,
      {
        error: parsed.status === 413 ? "Event payload is too large." : "Invalid event payload.",
        code,
      },
      parsed.status,
    );
  }
  const body = parsed.value;
  if (typeof body.event_name !== "string" || !approvedEventNames.has(body.event_name)) {
    return eventResponse(
      correlationId,
      { error: "Invalid event.", code: "invalid_event" },
      400,
    );
  }
  if (!isApprovedPublicAnalyticsEvent(body.event_name)) {
    return eventResponse(
      correlationId,
      { error: "Invalid public event.", code: "event_not_public" },
      400,
    );
  }
  if (isCanonicalLedgerProtectedEvent(body.event_name)) {
    return eventResponse(
      correlationId,
      { error: "Invalid public event.", code: "event_not_public" },
      400,
    );
  }
  const properties = body.properties && typeof body.properties === "object" && !Array.isArray(body.properties) ? body.properties as Record<string, unknown> : {};
  const webVitalProperties = body.event_name === "web_vital_observed"
    ? normalizeWebVitalEventProperties(properties)
    : null;
  if (body.event_name === "web_vital_observed" && !webVitalProperties) {
    return eventResponse(
      correlationId,
      { error: "Invalid experience event.", code: "invalid_experience_event" },
      400,
    );
  }
  const webVitalUserAgent = webVitalProperties
    ? coarseWebVitalUserAgent(req.headers.get("user-agent"), webVitalProperties.device_category)
    : null;
  if (
    webVitalProperties &&
    (!isCanonicalProductionWebVitalRequest(req) || !webVitalUserAgent?.startsWith("browser/"))
  ) {
    return eventResponse(
      correlationId,
      { error: "Invalid experience event.", code: "invalid_experience_event" },
      400,
    );
  }
  const funnelSessionId = webVitalProperties ? null : publicEventSessionId(body.session_id);
  const persisted = await recordServerAnalyticsEvent({
    eventName: body.event_name,
    category: body.event_name === "web_vital_observed"
      ? "system"
      : body.event_name === "page_view" ? "session" : "intake",
    // Public forms send the UUID that will become the canonical session ID if
    // lead storage succeeds. Keep it as a protected funnel identity until that
    // session actually exists; pre-creating `sessions` would collide with the
    // atomic lead-capture contract.
    sessionId: null,
    ...(funnelSessionId ? { funnelSessionId } : {}),
    leadId: null,
    properties: safePublicAnalyticsProperties(
      body.event_name,
      webVitalProperties
        ? {
            ...toWebVitalAnalyticsProperties(webVitalProperties),
            metric_id: webVitalMetricDigest(webVitalProperties.metric_id),
          }
        : properties,
    ),
    attribution: body.event_name === "web_vital_observed"
      ? undefined
      : body.attribution && typeof body.attribution === "object"
      ? {
          source: safeRegisteredPublicAnalyticsDimension("utm_source", (body.attribution as Record<string, unknown>).source) ?? undefined,
          medium: safeRegisteredPublicAnalyticsDimension("utm_medium", (body.attribution as Record<string, unknown>).medium) ?? undefined,
          campaign: safeRegisteredPublicAnalyticsDimension("utm_campaign", (body.attribution as Record<string, unknown>).campaign) ?? undefined,
        }
      : undefined,
    userAgent: webVitalProperties
      ? webVitalUserAgent
      : coarseAnalyticsUserAgent(req.headers.get("user-agent"), properties.device_category),
  });
  if (!persisted) {
    return eventResponse(
      correlationId,
      {
        ok: false,
        persisted: false,
        error: "Event persistence is unavailable.",
        code: "event_persistence_unavailable",
      },
      503,
    );
  }
  return eventResponse(correlationId, { ok: true, persisted: true }, 202);
}
