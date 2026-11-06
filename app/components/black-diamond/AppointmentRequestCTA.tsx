"use client";

import { useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import type { Attribution, LeadSourceSurface } from "../../lib/leadPayload";
import { EMPTY_CONVERSATION_PREFERENCES, type ConversationPreferences } from "../../lib/conversationPreferences";

type RequestState = "idle" | "loading" | "success" | "already_requested" | "degraded" | "error";

type AppointmentRequestCTAProps = {
  leadId: string | null;
  sessionId: string | null;
  requestSurface: LeadSourceSurface;
  funnelName: string;
  attribution: Attribution;
  compact?: boolean;
};

const STATUS_COPY: Record<RequestState, { title: string; body: string }> = {
  idle: {
    title: "Request a conversation with Mike's team",
    body: "Optional: share how and when you would prefer to talk. Your inquiry is already saved; these preferences do not reserve a time.",
  },
  loading: {
    title: "Sending your appointment request",
    body: "Saving your preferences for the team to review.",
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
    body: "The request is saved. The team needs to review its internal follow-up.",
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
  const preferencesRef = useRef<HTMLFieldSetElement>(null);
  const frozenPreferences = useRef<ConversationPreferences | null>(null);
  const [retryLocked, setRetryLocked] = useState(false);

  async function requestAppointment() {
    if (!leadId || !sessionId) {
      setState("error");
      setMessage("Submit the lead form first so we can attach the request to the right record.");
      return;
    }

    setState("loading");
    setMessage(null);
    if (!frozenPreferences.current) {
      const field = (name: string) => preferencesRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value || "";
      frozenPreferences.current = { ...EMPTY_CONVERSATION_PREFERENCES,
        channel: (field("conversation_channel") || "no_preference") as ConversationPreferences["channel"],
        day: field("conversation_day") || null,
        window: (field("conversation_window") || "no_preference") as ConversationPreferences["window"] };
      setRetryLocked(true);
    }
    trackEvent("appointment_click", attribution, {
      funnel_name: funnelName,
      step_name: "appointment_request",
      request_surface: requestSurface,
    }, { sessionId });
    trackEvent("appointment_cta_clicked", attribution, {
      funnel_name: funnelName,
      request_surface: requestSurface,
    }, { sessionId });

    try {
      const response = await fetch("/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          session_id: sessionId,
          request_surface: requestSurface,
          preferences: frozenPreferences.current,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        warning?: string;
        error?: string;
      };
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) { frozenPreferences.current = null; setRetryLocked(false); }
        throw new Error(data.error || "appointment_request_failed");
      }
      if (data.status === "requested") {
        trackEvent("appointment_requested", attribution, {
          funnel_name: funnelName,
          request_surface: requestSurface,
        }, { sessionId });
      }
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
        Your next step · optional
      </p>
      <h4 className="mt-3 font-serif text-2xl leading-tight text-[#f4ead4]">{copy.title}</h4>
      <p className="mt-2 text-sm leading-6 text-[#d9ceb8]">{message || copy.body}</p>
      {!requested ? <fieldset ref={preferencesRef} disabled={state === "loading" || retryLocked} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="sr-only">Optional conversation preferences</legend>
        <label className="min-w-0 text-sm text-[#e4dac8]">Preferred contact method
          <select name="conversation_channel" defaultValue="no_preference" className="mt-1 min-h-11 w-full rounded-md border border-[#cda24a55] bg-[#111] p-3 text-base">
            <option value="no_preference">No preference</option><option value="email">Email I supplied</option><option value="phone">Phone I supplied</option>
          </select>
        </label>
        <label className="min-w-0 text-sm text-[#e4dac8]">Preferred day (optional)
          <input type="date" name="conversation_day" className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-[#cda24a55] bg-[#111] p-3 text-base [color-scheme:dark]" />
        </label>
        <label className="min-w-0 text-sm text-[#e4dac8] sm:col-span-2">Preferred Eastern-time window
          <select name="conversation_window" defaultValue="no_preference" className="mt-1 min-h-11 w-full rounded-md border border-[#cda24a55] bg-[#111] p-3 text-base">
            <option value="no_preference">No preference</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
          </select>
        </label>
      </fieldset> : null}
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
            : state === "error" && retryLocked ? "Retry identical conversation request" : "Request a conversation"}
      </button>
      <p className="mt-3 text-xs leading-5 text-[#8f8778]">
        Eastern time (America/New_York). A preference is not new contact permission. The team reviews the contact method you permitted; no calendar booking or confirmation is automatic.
      </p>
    </div>
  );
}
