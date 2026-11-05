import { conversationPreferenceLabel, type ConversationPreferences } from "./conversationPreferences";

export const RESPONSE_TEMPLATE = "request_response_v1";
export type RequestResponseDraft = {
  cutoff: string | null; receipts: boolean; push: boolean;
  from: string | null; reply_to: string | null;
  mike: string | null; brandon: string | null;
  receipt_requested?: boolean;
  bodies: { inquiry: ReturnType<typeof renderRequestResponse>; appointment: ReturnType<typeof renderRequestResponse>; internal: ReturnType<typeof renderRequestResponse> };
};
export function responseMailbox(v: unknown): string | null {
  return typeof v === "string" && v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v) ? v : null;
}
export function requestResponseDraft(env: Record<string, string | undefined> = process.env, preferences?: ConversationPreferences): RequestResponseDraft {
  const time = env.REQUEST_RECEIPTS_ACTIVATED_AT;
  const cutoff = time && /^\d{4}-\d{2}-\d{2}T/.test(time) && Number.isFinite(Date.parse(time)) ? new Date(time).toISOString() : null;
  const mike = responseMailbox(env.LEAD_NOTIFICATION_TO), second = responseMailbox(env.LEAD_NOTIFICATION_SECOND_OPERATOR_TO);
  const from = env.AGENT_NOTIFICATION_FROM_EMAIL || env.RESEND_FROM || env.FROM_EMAIL;
  return { cutoff, receipts: env.REQUEST_RECEIPTS_ENABLED === "true" && cutoff !== null,
    push: env.AGENT_PUSH_NOTIFICATIONS_ENABLED === "true", from: from && from.length < 320 && !/[\r\n]/.test(from) ? from : null,
    // Must be an explicitly verified monitored mailbox, not a guessed sender.
    reply_to: responseMailbox(env.REQUEST_RECEIPTS_REPLY_TO), mike,
    brandon: second && second.toLowerCase() !== mike?.toLowerCase() ? second : null,
    bodies: { inquiry: renderRequestResponse("inquiry", "customer", "LEAD_REFERENCE"),
      appointment: renderRequestResponse("appointment", "customer", "LEAD_REFERENCE"),
      internal: renderRequestResponse("appointment", "internal", "LEAD_REFERENCE", preferences) } };
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function renderRequestResponse(kind: "inquiry" | "appointment", audience: "customer" | "internal", leadId: string, preferences?: ConversationPreferences) {
  const appointment = kind === "appointment";
  const subject = `Ask Magic Mike | ${appointment ? "Conversation request received" : "Inquiry received"}`;
  const copy = appointment
    ? "Your conversation request is saved. Your preferences are a request, not confirmed availability. No appointment or calendar booking has been made."
    : "Your inquiry is saved for Our Town Properties, Inc. to review. This receipt is not a valuation, appraisal, offer, appointment or promise of a response time.";
  const detail = audience === "internal"
    ? `Review current ownership, contact readiness and the supplied request before responding.\n${preferences ? conversationPreferenceLabel(preferences) + "\n" : ""}https://www.askmagicmike.com/admin/leads/${encodeURIComponent(leadId)}#appointment-review`
    : "For a question about your request, reply to this email or call Mike at (252) 245-4337. No marketing or automated follow-up is included.";
  const text = `Ask Magic Mike · Our Town Properties, Inc.\n\n${copy}\n\n${detail}`;
  const html = `<div style="max-width:560px;margin:auto;padding:24px;background:#0b0b0b;color:#f4ead4;font:16px/1.6 Arial,sans-serif;overflow-wrap:anywhere"><p style="color:#cda24a">ASK MAGIC MIKE · OUR TOWN PROPERTIES, INC.</p><h1 style="font:28px/1.2 Georgia,serif">${escape(subject.split(" | ")[1])}</h1><p>${escape(copy)}</p><p style="white-space:pre-wrap">${escape(detail)}</p>${audience === "customer" ? '<p><a style="color:#e2c06f" href="tel:+12522454337">Call Mike · (252) 245-4337</a></p>' : ""}</div>`;
  return { subject, text, html };
}
