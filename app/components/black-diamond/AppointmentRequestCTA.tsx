"use client";

import { useState } from "react";
import { trackEvent } from "../../lib/analytics";
import type { Attribution } from "../../lib/leadPayload";

type RequestState = "idle" | "loading" | "success" | "already_requested" | "degraded" | "error";

type AppointmentRequestCTAProps = {
  leadId: string | null;
  sessionId: string | null;
  requestSurface: string;
  funnelName: string;
  attribution: Attribution;
  compact?: boolean;
};

const STATUS_COPY: Record<RequestState, { title: string; body: string }> = {
  idle: {
    title: "Request a conversation with Mike's team",
    body: "Ask for a follow-up window. The team will confirm the time and details before anything is scheduled.",
  },
  loading: {
    title: "Sending your appointment request",
    body: "Saving the request for AdminOps review.",
  },
  success: {
    title: "Your appointment request has been received.",
    body: "A team member will confirm the time and details. No calendar event has been created yet.",
  },
  already_requested: {
    title: "Your appointment request is already in.",
    body: "A team member will confirm the time and details. No duplicate request was created.",
  },
  degraded: {
    title: "Your request was received.",
    body: "The appointment request is saved, but the internal follow-up needs AdminOps review.",
  },
  error: {
    title: "We could not save the appointment request.",
    body: "Please try once more, or wait for the team to follow up from your lead request.",
  },
};

export function AppointmentRequestCTA({
  leadId,
  sessionId,
  requestSurface,
  funnelName,
  attribution,
  compact = false,
}: AppointmentRequestCTAProps) {
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function requestAppointment() {
    if (!leadId || !sessionId) {
      setState("error");
      setMessage("Submit the lead form first so we can attach the request to the right record.");
      return;
    }

    setState("loading");
    setMessage(null);
    trackEvent("appointment_click", attribution, {
      funnel_name: funnelName,
      step_name: "appointment_request",
      request_surface: requestSurface,
    });

    try {
      const response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          session_id: sessionId,
          request_surface: requestSurface,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        warning?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "appointment_request_failed");
      if (data.warning) {
        setState("degraded");
      } else if (data.status === "already_requested") {
        setState("already_requested");
      } else {
        setState("success");
      }
      setMessage(data.message || null);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : null);
    }
  }

  const copy = STATUS_COPY[state];
  const requested = state === "success" || state === "already_requested" || state === "degraded";
  return (
    <div
      className={`rounded-lg border border-[#cda24a33] bg-[radial-gradient(circle_at_top_right,rgba(34,198,210,.12),transparent_34%),rgba(0,0,0,.32)] ${
        compact ? "p-4" : "p-5"
      }`}
      aria-live="polite"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#22c6d2]">
        Appointment request
      </p>
      <h4 className="mt-3 font-serif text-2xl leading-tight text-[#f4ead4]">{copy.title}</h4>
      <p className="mt-2 text-sm leading-6 text-[#d9ceb8]">{message || copy.body}</p>
      <button
        type="button"
        onClick={requestAppointment}
        disabled={state === "loading" || requested}
        aria-busy={state === "loading"}
        className="amm-primary-button mt-4 w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {state === "loading"
          ? "Sending request"
          : requested
            ? "Request received"
            : "Request a conversation"}
      </button>
      <p className="mt-3 text-xs leading-5 text-[#8f8778]">
        This requests a confirmation call. It does not book or reserve an appointment time automatically.
      </p>
    </div>
  );
}
