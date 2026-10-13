import type { LeadPayload } from "./leadPayload";

export const LAUNCH_LEAD_ALERT_TEMPLATE_VERSION = "lead_alert_email_v6";
export const LAUNCH_ALERT_BATCH_LIMIT = 4;
export const LAUNCH_ALERT_RUNTIME_MS = 20_000;
export const LAUNCH_ALERT_PROVIDER_TIMEOUT_MS = 5_000;
// Stop before provider-key retention expires, never reset this boundary.
export const LAUNCH_ALERT_RETRY_WINDOW_MS = 24 * 60 * 60 * 1_000 - 60_000;

export type LaunchAlertDraft = {
  version: 1;
  launch_cutoff: string | null;
  from: string | null;
  recipients: Array<{ operator: "mike" | "brandon"; recipient: string | null }>;
  subject: string;
  text_prefix: string;
  html_prefix: string;
  submitted: Record<string, unknown>;
  is_test: boolean;
  qa_initial_authorized: boolean;
};

/** Server-only material. Never add this to LeadNotificationRecord or a DTO. */
export type FrozenLaunchAlert = {
  version: 1;
  template_version: typeof LAUNCH_LEAD_ALERT_TEMPLATE_VERSION;
  launch_cutoff: string | null;
  operator: "mike" | "brandon";
  recipient: string | null;
  from: string | null;
  subject: string;
  text: string;
  html: string;
  inquiry_id: string;
  session_id: string;
  submitted: Record<string, unknown>;
  is_test: boolean;
  qa_initial_authorized: boolean;
};

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hasHeaderControl = (value: string) => Array.from(value).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
function mailbox(value: unknown): string | null {
  return typeof value === "string" && value.length <= 254 && !hasHeaderControl(value) && !/[\u0020,;<>]/.test(value.trim()) &&
    /^[^@]+@[^@]+\.[^@]+$/.test(value.trim()) ? value.trim() : null;
}
/** Trusted configuration only: one mailbox, optional display name, no header
 * controls. Preserve the exact approved envelope rather than a new address. */
export function configuredLaunchFrom(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 320 || hasHeaderControl(value)) return null;
  if (mailbox(value)) return value;
  const match = value.trim().match(/^([^<>]+)<([^<>]+)>$/);
  return match && match[1].trim() && mailbox(match[2]) === match[2] ? value : null;
}
export function launchAlertCutoff(env: Readonly<Record<string, string | undefined>> = process.env): string | null {
  const value = env.LEAD_ALERT_V6_CUTOFF;
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}
export function launchAlertGenerationEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.LEAD_ALERT_V6_ENABLED === "true";
}
export function isLaunchIntake(payload: Pick<LeadPayload, "funnel_type" | "lead_type">) {
  return ["home_value", "seller", "buyer"].includes(payload.funnel_type) ||
    (payload.funnel_type === "widget" && (!payload.lead_type || payload.lead_type === "home_value"));
}
export function launchAlertWorkerEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.LEAD_ALERT_V6_WORKER_ENABLED === "true" && launchAlertCutoff(env) !== null;
}

/** Complete normalized submitted context, excluding server receipt time and
 * transport identities. Legacy fingerprints/functions are left unchanged. */
export function inquiryRequestContext(payload: LeadPayload): Record<string, unknown> {
  const context = { ...payload } as Record<string, unknown>;
  for (const key of ["created_at", "consent_timestamp", "idempotency_key", "widget_session_id", "status", "assigned_agent_id"]) delete context[key];
  return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
}
function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function provided(value?: string) { return value?.trim() || "Not provided"; }
function receivedTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_launch_received_time");
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}
function sourceLabel(payload: LeadPayload) {
  const surfaces: Record<LeadPayload["lead_source_surface"], string> = {
    homepage: "Ask Magic Mike homepage", home_value_page: "Home Value form", seller_page: "Seller form",
    buyer_page: "Buyer form", renter_page: "Renter form", open_house: "Open House form", ask_page: "Ask Magic Mike question",
    widget: "Website widget", ourtownproperties: "Our Town Properties website",
  };
  const channels: Record<string, string> = { ourtownproperties: "Our Town Properties website", facebook: "Facebook link", instagram: "Instagram link", qr: "QR link", widget: "Widget link" };
  const channel = payload.attribution?.source && channels[payload.attribution.source];
  return `${channel ? `${channel} · ` : ""}${surfaces[payload.lead_source_surface]} (reported)`;
}

/** Pure draft; SQL appends only actual saved IDs and capture-result context
 * before freezing the exact body inside the capture transaction. */
export function prepareLaunchAlertDraft(input: {
  payload: LeadPayload; sessionId: string; receivedAt: string; sourceLabel: string;
}, env: Readonly<Record<string, string | undefined>> = process.env): LaunchAlertDraft {
  const { payload } = input;
  const buyer = payload.funnel_type === "buyer" || payload.lead_type === "buyer" || payload.lead_type === "listing_inquiry";
  const label = buyer ? "Buyer / Property Interest" : "Seller / Home Value";
  const qa = payload.is_test === true;
  const preheader = qa ? "INTERNAL QA — DO NOT CONTACT. Synthetic request." : "New inquiry for the approved operators.";
  const interest = payload.buyer_interest;
  const propertyRows: Array<[string, string]> = interest?.kind === "search"
    ? [["Desired area", interest.desired_area], ...(interest.budget_range ? [["Budget range", interest.budget_range] as [string, string]] : [])]
    : interest?.kind === "specific"
      ? interest.properties.flatMap((property, index): Array<[string, string]> => [
          ...(property.address_text ? [[`Property ${index + 1}`, property.address_text] as [string, string]] : []),
          ...(property.unit ? [["Unit", property.unit] as [string, string]] : []),
          ...(property.listing_url ? [[`Property ${index + 1} listing URL`, property.listing_url] as [string, string]] : []),
          ...(property.reference ? [["Reference", property.reference] as [string, string]] : []),
        ])
      : [[buyer ? "Submitted legacy interest" : "Seller property", provided(payload.address_entry?.acceptedText || payload.property_address || payload.address || (buyer ? payload.target_geography : undefined))]];
  const permissions = [payload.consent_email ? "email" : null, payload.consent_call ? "call" : null, payload.consent_sms ? "SMS" : null].filter(Boolean).join(", ") || "none recorded";
  const rows: Array<[string, string]> = [
    ["Received", receivedTime(input.receivedAt)], ["Name", provided(payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" "))],
    ["Phone", provided(payload.phone)], ["Email", provided(payload.email)], ...propertyRows,
    ["Timeline", provided(payload.timeline)], ["Question / context", provided(payload.question || payload.notes)],
    ["Source", sourceLabel(payload)], ["Recorded contact permission", permissions],
    ["Record status", payload.is_test ? "INTERNAL QA / DO NOT CONTACT" : "Ordinary submitted inquiry"],
  ];
  const mike = mailbox(env.LEAD_NOTIFICATION_TO);
  const second = mailbox(env.LEAD_NOTIFICATION_SECOND_OPERATOR_TO);
  const brandon = second && second.toLowerCase() !== mike?.toLowerCase() ? second : null;
  const allowlisted = (env.LEAD_ALERT_V6_QA_SESSION_IDS || "").split(",").map(value => value.trim()).filter(uuid).slice(0, 3);
  return {
    version: 1, launch_cutoff: launchAlertCutoff(env),
    from: configuredLaunchFrom(env.AGENT_NOTIFICATION_FROM_EMAIL || env.RESEND_FROM || env.FROM_EMAIL),
    recipients: [{ operator: "mike", recipient: mike }, { operator: "brandon", recipient: brandon }],
    // No submitted fact, name, location, URL or private recipient in a subject/preheader.
    subject: `${qa ? "[TEST] INTERNAL QA — DO NOT CONTACT | " : ""}Ask Magic Mike | New ${label} inquiry`,
    text_prefix: `${label}\nNew submitted inquiry; earlier inquiries remain unchanged.\n\n${rows.map(([key, value]) => `${key}: ${value}`).join("\n")}\n\n`,
    html_prefix: `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:560px;margin:auto;padding:20px;box-sizing:border-box;background:#090909;color:#f4ead4;overflow-wrap:anywhere"><span style="display:none">${preheader}</span><p style="font-size:11px;letter-spacing:.08em;color:#cda24a">OUR TOWN PROPERTIES · ASK MAGIC MIKE</p><h1 style="font-size:22px;color:#f4ead4">${qa ? "[TEST] " : ""}${label}</h1>${qa ? "<p><strong>INTERNAL QA — DO NOT CONTACT</strong></p>" : ""}<p>New submitted inquiry; earlier inquiries remain unchanged.</p><table role="presentation" style="width:100%;table-layout:fixed">${rows.map(([key, value]) => `<tr><th style="width:35%;color:#cda24a;text-align:left;vertical-align:top;padding:8px">${escape(key)}</th><td style="color:#f4ead4;padding:8px;white-space:pre-wrap;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join("")}</table>`,
    submitted: inquiryRequestContext(payload), is_test: payload.is_test === true,
    qa_initial_authorized: payload.is_test === true && allowlisted.includes(input.sessionId),
  };
}

/** Explicit immutable v6 reader. It cannot reconstruct a body from live rows,
 * substitute current recipients, or fall back to another template version. */
export function readFrozenLaunchAlert(value: unknown): FrozenLaunchAlert | null {
  if (!record(value) || value.version !== 1 || value.template_version !== LAUNCH_LEAD_ALERT_TEMPLATE_VERSION ||
    !["mike", "brandon"].includes(String(value.operator)) || !uuid(value.inquiry_id) || !uuid(value.session_id) ||
    !record(value.submitted) || typeof value.is_test !== "boolean" || typeof value.qa_initial_authorized !== "boolean" ||
    (value.recipient !== null && mailbox(value.recipient) !== value.recipient) ||
    (value.from !== null && configuredLaunchFrom(value.from) !== value.from) ||
    (value.launch_cutoff !== null && (typeof value.launch_cutoff !== "string" || launchAlertCutoff({ LEAD_ALERT_V6_CUTOFF: value.launch_cutoff }) !== value.launch_cutoff)) ||
    typeof value.subject !== "string" || value.subject.length > 240 || /[\r\n]/.test(value.subject) ||
    typeof value.text !== "string" || value.text.length > 40_000 || typeof value.html !== "string" || value.html.length > 120_000) return null;
  return value as FrozenLaunchAlert;
}

export function launchEnvelopeKey(inquiryId: string, operator: "mike" | "brandon") {
  return `lead_alert:${inquiryId}:${LAUNCH_LEAD_ALERT_TEMPLATE_VERSION}:${operator}`;
}

export function launchAttemptOutcome(input: {
  result: import("./leadNotificationTypes").NotificationResult;
  attempt: number; maxAttempts: number; firstAttemptAt: string; now: number;
}) {
  const acceptedAt = new Date(input.now).toISOString();
  if (input.result.ok) {
    return input.result.providerMessageId
      ? { status: "sent", providerMessageId: input.result.providerMessageId, acceptedAt }
      : { status: "processing", acceptedAt, errorCode: "provider_acceptance_receipt_missing" };
  }
  if (input.result.ambiguous || ["resend_network_error", "resend_http_408", "resend_http_409"].includes(input.result.errorCode) || /^resend_http_5\d\d$/.test(input.result.errorCode)) {
    return { status: "processing", errorCode: "provider_acceptance_ambiguous" };
  }
  if (input.result.retryable && ["resend_http_429", "resend_http_425"].includes(input.result.errorCode) && input.attempt < Math.min(3, input.maxAttempts)) {
    const delay = Math.max(input.attempt === 1 ? 60_000 : 300_000, input.result.retryAfterMs || 0);
    const next = input.now + delay;
    if (Number.isFinite(next) && next < Date.parse(input.firstAttemptAt) + LAUNCH_ALERT_RETRY_WINDOW_MS) {
      return { status: "retry_scheduled", errorCode: input.result.errorCode, nextAttemptAt: new Date(next).toISOString() };
    }
    return { status: "permanently_failed", errorCode: "provider_retry_window_expired" };
  }
  return { status: "permanently_failed", errorCode: input.result.errorCode };
}
