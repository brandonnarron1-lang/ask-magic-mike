import { NextResponse } from "next/server";
import {
  checkRateLimit,
  LIMITS,
  nonDurableRateLimitFallbackAllowed,
  rateLimitKey,
} from "@/lib/security/rate-limit";
import { requestPublicAppointment } from "../../../lib/publicAppointmentRequest";
import {
  clean,
  isLeadSourceSurface,
  type LeadSourceSurface,
} from "../../../lib/leadPayload";
import { isApprovedPublicOrigin } from "../../../lib/publicOrigin";
import { recordServerAnalyticsEvent } from "../../../lib/serverAnalytics";
import {
  assertDatabaseMutationAllowed,
  PREVIEW_READ_ONLY_MESSAGE,
} from "../../../../src/lib/preview-security";

const MAX_APPOINTMENT_BODY_BYTES = 2_048;
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

function appointmentResponse(
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
        ...RESPONSE_HEADERS,
        "X-AMM-Correlation-Id": correlationId,
        ...extraHeaders,
      },
    },
  );
}

function publicAppointmentSurface(value: unknown): LeadSourceSurface | null {
  const candidate = clean(value);
  return isLeadSourceSurface(candidate) ? candidate : null;
}

async function readBoundedJson(req: Request) {
  if (!req.body) return { ok: false as const, status: 400 as const, error: "invalid_json" };

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let bodyText = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteLength += chunk.value.byteLength;
      if (byteLength > MAX_APPOINTMENT_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false as const, status: 413 as const, error: "payload_too_large" };
      }
      bodyText += decoder.decode(chunk.value, { stream: true });
    }
    bodyText += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    const value: unknown = JSON.parse(bodyText);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true as const, value: value as Record<string, unknown> }
      : { ok: false as const, status: 400 as const, error: "invalid_json" };
  } catch {
    return { ok: false as const, status: 400 as const, error: "invalid_json" };
  }
}

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  if (!isApprovedPublicOrigin(req.headers.get("origin"))) {
    return appointmentResponse(
      correlationId,
      { error: "This appointment origin is not approved.", code: "origin_not_approved" },
      403,
    );
  }

  const contentType = req.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return appointmentResponse(
      correlationId,
      { error: "Appointment requests require JSON.", code: "unsupported_media_type" },
      415,
    );
  }
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_APPOINTMENT_BODY_BYTES) {
    return appointmentResponse(
      correlationId,
      { error: "Appointment request is too large.", code: "payload_too_large" },
      413,
    );
  }

  // Preserve the read-only Preview guarantee before the durable limiter writes
  // a rate_limit_buckets row. Production requests continue through throttling.
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return appointmentResponse(
      correlationId,
      { error: PREVIEW_READ_ONLY_MESSAGE, code: mutation.error },
      mutation.statusCode,
    );
  }

  const rateLimit = await checkRateLimit(
    rateLimitKey(req.headers.get("x-forwarded-for")),
    LIMITS.appointmentRequest.limit,
    LIMITS.appointmentRequest.windowMs,
    "appointmentRequest",
  );
  if (!rateLimit.allowed) {
    return appointmentResponse(
      correlationId,
      { error: "Too many appointment requests. Please try again shortly.", code: "rate_limited" },
      429,
      {
        "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
      },
    );
  }
  if (!rateLimit.durable && !nonDurableRateLimitFallbackAllowed()) {
    return appointmentResponse(
      correlationId,
      {
        error: "Appointment requests are temporarily unavailable.",
        code: "rate_limit_store_unavailable",
      },
      503,
    );
  }

  const parsed = await readBoundedJson(req);
  if (!parsed.ok) {
    return appointmentResponse(
      correlationId,
      {
        error: parsed.status === 413 ? "Appointment request is too large." : "Invalid JSON.",
        code: parsed.error,
      },
      parsed.status,
    );
  }

  const input = parsed.value;
  const requestSurface = publicAppointmentSurface(input.request_surface);
  if (!requestSurface) {
    return appointmentResponse(
      correlationId,
      { error: "Invalid appointment request.", code: "invalid_request_surface" },
      400,
    );
  }
  const result = await requestPublicAppointment({
    leadId: clean(input.lead_id),
    sessionId: clean(input.session_id),
    requestSurface,
  });

  if (!result.ok) {
    const publicError =
      result.error === "appointment_request_not_found"
        ? "We could not verify that appointment request. Please submit the lead form again."
        : result.error === "preview_data_disabled"
          ? PREVIEW_READ_ONLY_MESSAGE
          : result.error === "appointment_request_store_not_configured"
            ? "Appointment requests are temporarily unavailable."
            : "We could not save the appointment request. Please try again.";
    return appointmentResponse(
      correlationId,
      { error: publicError, code: result.error },
      result.statusCode,
    );
  }

  if (result.status === "requested") {
    try {
      const analyticsRecorded = await recordServerAnalyticsEvent({
        eventName: "appointment_requested",
        category: "intake",
        sessionId: clean(input.session_id),
        leadId: clean(input.lead_id),
        properties: { request_surface: requestSurface },
        userAgent: req.headers.get("user-agent"),
      });
      if (!analyticsRecorded) {
        console.error("[appointments] canonical outcome event write failed", {
          correlationId,
          error: "analytics_persistence_unavailable",
        });
      }
    } catch {
      console.error("[appointments] canonical outcome event write failed", {
        correlationId,
        error: "analytics_persistence_failed",
      });
    }
  }

  return appointmentResponse(correlationId, {
    status: result.status,
    appointment_status: result.appointment_status,
    followup_status: result.followup_status,
    warning: result.warning,
    message:
      result.status === "already_requested"
        ? "Your appointment request is already in. A team member will confirm the time and details."
        : "Your appointment request has been received. A team member will confirm the time and details.",
  });
}
