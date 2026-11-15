import { conversationPreferenceLabel, parseConversationPreferences } from "./conversationPreferences";
import type { AdminAppointmentRow } from "./adminAppointmentFollowupOps";

type TimingRecord = Pick<AdminAppointmentRow, "status" | "request_preferences" | "starts_at" | "ends_at" | "timezone">;

/** Presentation only, from an authorized saved record and server observation.
 * A named window has no exact end in v1. Never invent one or infer attendance. */
export function conversationRequestTiming(record: TimingRecord, observedAt: string) {
  const preference = record.request_preferences ? parseConversationPreferences(record.request_preferences) : null;
  const preferenceLabel = preference ? conversationPreferenceLabel(preference) : "Preferred time not recorded";
  const now = Date.parse(observedAt), start = Date.parse(record.starts_at || ""), end = Date.parse(record.ends_at || "");
  const intervalPassed = Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end) && end > start && now >= end;
  const requested = record.status === "requested" || record.status === "reschedule_requested";
  let dayPassed = false;
  if (requested && preference?.day && Number.isFinite(now)) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: preference.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
    const value = (type: string) => parts.find(part => part.type === type)?.value;
    dayPassed = preference.day < `${value("year")}-${value("month")}-${value("day")}`;
  }
  if (requested) return {
    state: intervalPassed || dayPassed ? "past_preference" : "requested",
    label: intervalPassed ? "Requested window has passed" : dayPassed ? "Preferred day has passed" : "Conversation requested — not confirmed",
    explanation: intervalPassed || dayPassed
      ? "This was a request, not a missed confirmed appointment. Review current permission and the requested next step; do not assume a response occurred."
      : "A preferred day or named window is not availability, contact permission or a confirmed appointment. No exact window end is inferred.",
    preferenceLabel,
  };
  if (record.status === "confirmed") return {
    state: "confirmed",
    label: intervalPassed ? "Confirmed appointment window has passed" : "Confirmed appointment recorded",
    explanation: "Use actual attendance or response evidence. Elapsed time alone does not establish a missed appointment, no-show or completed conversation.",
    preferenceLabel,
  };
  return { state: "recorded", label: `Appointment state: ${record.status.replaceAll("_", " ")}`,
    explanation: "This is the saved appointment state, not a new confirmation, permission or attendance finding.", preferenceLabel };
}
