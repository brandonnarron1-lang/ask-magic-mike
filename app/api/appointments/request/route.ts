import { NextResponse } from "next/server";
import { requestPublicAppointment } from "../../../lib/publicAppointmentRequest";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
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
