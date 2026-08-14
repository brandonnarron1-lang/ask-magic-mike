import { NextResponse } from "next/server";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import { requestPublicAppointment } from "../../../lib/publicAppointmentRequest";
import {
  assertDatabaseMutationAllowed,
  PREVIEW_READ_ONLY_MESSAGE,
} from "../../../../src/lib/preview-security";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  // Preserve the read-only Preview guarantee before the durable limiter writes
  // a rate_limit_buckets row. Production requests continue through throttling.
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) {
    return NextResponse.json({ error: PREVIEW_READ_ONLY_MESSAGE, code: mutation.error }, {
      status: mutation.statusCode,
    });
  }

  const rateLimit = await checkRateLimit(
    rateLimitKey(req.headers.get("x-forwarded-for")),
    LIMITS.appointmentRequest.limit,
    LIMITS.appointmentRequest.windowMs,
    "appointmentRequest",
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many appointment requests. Please try again shortly." }, {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
      },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = await requestPublicAppointment({
    leadId: clean(input.lead_id),
    sessionId: clean(input.session_id),
    requestSurface: clean(input.request_surface),
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
    return NextResponse.json({ error: publicError, code: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({
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
