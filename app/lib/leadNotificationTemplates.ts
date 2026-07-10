import type {
  AssignmentNotificationAgent,
  AssignmentNotificationLead,
  LeadNotificationChannel,
} from "./leadNotificationTypes";

export const AGENT_ASSIGNMENT_EMAIL_TEMPLATE_VERSION = "agent_assignment_email_v1";
export const AGENT_ASSIGNMENT_SMS_TEMPLATE_VERSION = "agent_assignment_sms_v1";

function safeText(value: string | null | undefined, fallback = "Not provided") {
  const cleaned = typeof value === "string" ? value.trim() : "";
  return cleaned || fallback;
}

function timelineLabel(months: number | null | undefined) {
  if (months === 0) return "Immediate / 0-30 days";
  if (months === 3) return "30-90 days";
  if (months === 6) return "3-6 months";
  if (months === 12) return "6-12 months";
  if (months === 24) return "12+ months / not sure";
  return "Unknown";
}

function isQaLead(lead: AssignmentNotificationLead) {
  const haystack = [
    lead.first_name,
    lead.last_name,
    lead.address_raw,
    lead.question_raw,
    lead.source,
    lead.source_detail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes("qa") || haystack.includes("controlled production qa") || haystack.includes("test property");
}

function attributionSummary(lead: AssignmentNotificationLead) {
  return [lead.source, lead.source_detail].filter(Boolean).join(" / ") || "No source attribution summary";
}

function adminLeadUrl(leadId: string) {
  const base = process.env.ADMIN_BASE_URL || process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com/admin";
  return `${base.replace(/\/$/, "")}/leads?filter=all#lead-${leadId}`;
}

export function templateVersionFor(channel: LeadNotificationChannel) {
  return channel === "sms" ? AGENT_ASSIGNMENT_SMS_TEMPLATE_VERSION : AGENT_ASSIGNMENT_EMAIL_TEMPLATE_VERSION;
}

export function renderAgentAssignmentEmail(input: {
  lead: AssignmentNotificationLead;
  agent: AssignmentNotificationAgent;
  assignedAt: string;
}) {
  const { lead, agent, assignedAt } = input;
  const qaWarning = isQaLead(lead)
    ? "\nCONTROLLED QA WARNING: This lead appears to be marked as QA/test. Review before any contact."
    : "";
  const lines = [
    "Ask Magic Mike / Our Town Properties lead assignment",
    "",
    `Assigned agent: ${safeText(agent.name, "Assigned agent")}`,
    `Lead intent: ${safeText(lead.primary_intent || lead.lead_type, "Unknown")}`,
    `Property address: ${safeText(lead.address_raw)}`,
    `Source/funnel: ${safeText(lead.lead_type)} / ${attributionSummary(lead)}`,
    `Timeline: ${timelineLabel(lead.timeline_months)}`,
    `Lead status: ${safeText(lead.status, "new")}`,
    `Assignment timestamp: ${assignedAt}`,
    `AdminOps: ${adminLeadUrl(lead.id)}`,
    "",
    "Review the lead and source context in AdminOps before contacting the consumer.",
    qaWarning.trim(),
  ].filter((line) => line !== undefined);
  const text = lines.join("\n");
  const html = [
    "<h1>Ask Magic Mike lead assignment</h1>",
    `<p><strong>Assigned agent:</strong> ${safeText(agent.name, "Assigned agent")}</p>`,
    `<p><strong>Lead intent:</strong> ${safeText(lead.primary_intent || lead.lead_type, "Unknown")}</p>`,
    `<p><strong>Property address:</strong> ${safeText(lead.address_raw)}</p>`,
    `<p><strong>Source/funnel:</strong> ${safeText(lead.lead_type)} / ${attributionSummary(lead)}</p>`,
    `<p><strong>Timeline:</strong> ${timelineLabel(lead.timeline_months)}</p>`,
    `<p><strong>Lead status:</strong> ${safeText(lead.status, "new")}</p>`,
    `<p><strong>Assignment timestamp:</strong> ${assignedAt}</p>`,
    `<p><a href="${adminLeadUrl(lead.id)}">Open in AdminOps</a></p>`,
    "<p>Review the lead and source context in AdminOps before contacting the consumer.</p>",
    isQaLead(lead)
      ? "<p><strong>CONTROLLED QA WARNING:</strong> This lead appears to be marked as QA/test. Review before any contact.</p>"
      : "",
  ].join("");
  return {
    subject: `Ask Magic Mike lead assigned: ${safeText(lead.address_raw, safeText(lead.lead_type, "lead"))}`,
    text,
    html,
    qaWarningIncluded: isQaLead(lead),
  };
}

export function renderAgentAssignmentSms(input: {
  lead: AssignmentNotificationLead;
  agent: AssignmentNotificationAgent;
  assignedAt: string;
}) {
  const { lead, assignedAt } = input;
  const qaPrefix = isQaLead(lead) ? "QA TEST - " : "";
  return {
    text:
      `${qaPrefix}Ask Magic Mike lead assigned. ` +
      `${safeText(lead.primary_intent || lead.lead_type, "Lead")} / ${safeText(lead.address_raw)}. ` +
      `Source: ${safeText(lead.source, "unknown")}. Assigned: ${assignedAt}. Review AdminOps before contact.`,
    qaWarningIncluded: isQaLead(lead),
  };
}
