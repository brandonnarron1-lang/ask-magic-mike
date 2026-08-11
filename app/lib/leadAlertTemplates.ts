import type { LeadPayload } from "./leadPayload";
import type { LeadRoutingDecision } from "./leadRouting";
import type { LeadScore } from "./leadScoring";
import {
  selectLeadAlertVisualTemplate,
  shouldRenderLeadAlertVisual,
  visualAssetUrl,
} from "./leadAlertVisualTemplates";

export const LEAD_ALERT_TEMPLATE_VERSION = "lead_alert_email_v2";
export const LEAD_ALERT_SMS_TEMPLATE_VERSION = "lead_alert_sms_v2";
export const CONSUMER_ACK_TEMPLATE_VERSION = "consumer_ack_email_v1";

function safe(value: unknown, fallback = "Not provided") {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.replace(/[\r\n]+/g, " ").slice(0, 500) : fallback;
}

export function renderLeadAlertSms(input: Parameters<typeof renderLeadAlert>[0]) {
  const rendered = renderLeadAlert(input);
  const tag = priority(input.score.score, input.payload.is_test === true);
  const label = leadLabel(input.payload);
  const source = safe(input.routing.sourceLabel, "Unknown source");
  const intent = safe(input.routing.intentLabel, "Unknown intent");
  const location = safe(input.payload.city || input.payload.target_geography, "Eastern NC");
  const leadCenterBase = (process.env.ADMIN_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
  const leadCenterUrl = `${leadCenterBase}/admin/leads/${encodeURIComponent(input.leadId)}`;
  return {
    text: `${tag} ${label} | ${source} | ${intent} | ${location} | Score ${input.score.score}. Open secure Lead Center: ${leadCenterUrl}`.slice(0, 480),
    visualTemplate: rendered.visualTemplate,
  };
}

function html(value: unknown, fallback = "Not provided") {
  return safe(value, fallback)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function email(value?: string) {
  return typeof value === "string" && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value.trim() : null;
}

function priority(score: number, isTest: boolean) {
  if (isTest) return "[TEST]";
  if (score >= 80) return "[HOT]";
  if (score >= 60) return "[ACTIVE]";
  return "[NEW]";
}

function leadLabel(payload: LeadPayload) {
  if (payload.lead_type === "seller" || payload.funnel_type === "seller") return "SELLER LEAD";
  if (payload.lead_type === "buyer" || payload.funnel_type === "buyer") return "BUYER LEAD";
  if (payload.lead_type === "renter" || payload.funnel_type === "renter") return "RENTER LEAD";
  if (payload.lead_type === "open_house") return "OPEN HOUSE LEAD";
  if (payload.lead_type === "listing_inquiry") return "LISTING INQUIRY";
  if (payload.lead_type === "home_value" || payload.funnel_type === "home_value" || payload.funnel_type === "widget") return "HOME VALUE LEAD";
  return "GENERAL QUESTION LEAD";
}

function leadName(payload: LeadPayload) {
  return safe(payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" "), payload.is_test ? "INTERNAL QA" : "Unknown name");
}

export function renderLeadAlert(input: {
  leadId: string;
  sessionId: string;
  correlationId: string;
  payload: LeadPayload;
  score: LeadScore;
  routing: LeadRoutingDecision;
  submittedAt: string;
  duplicateOfLeadId?: string | null;
}) {
  const { payload, score, routing } = input;
  const isTest = payload.is_test === true;
  const tag = priority(score.score, isTest);
  const label = leadLabel(payload);
  const source = safe(routing.sourceLabel, "Unknown source");
  const intent = safe(routing.intentLabel, "Unknown intent");
  const location = safe(payload.city || payload.target_geography || payload.property_address || payload.address, "Wilson / Eastern NC");
  const name = leadName(payload);
  const subjectPrefix = safe(process.env.LEAD_SUBJECT_PREFIX, "");
  const subject = `${subjectPrefix ? `${subjectPrefix} ` : ""}${tag} ${label} | ${source} | ${intent} | ${location} | ${name} | Score ${score.score}`.slice(0, 240);
  const leadCenterBase = (process.env.ADMIN_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.askmagicmike.com").replace(/\/$/, "");
  const leadCenterUrl = `${leadCenterBase}/admin/leads/${encodeURIComponent(input.leadId)}`;
  const safeEmail = email(payload.email);
  const safePhone = payload.phone && /^[+()\d\s.-]{7,40}$/.test(payload.phone) ? payload.phone : null;
  const factorText = score.factors.map((factor) => `${factor.label} (+${factor.points})`).join("; ") || "No qualifying factors recorded.";
  const consentText = [payload.consent_email ? "email" : null, payload.consent_call ? "call" : null, payload.consent_sms ? "sms" : null].filter(Boolean).join(", ") || "none recorded";
  const duplicateText = input.duplicateOfLeadId ? `Duplicate of ${input.duplicateOfLeadId}` : "No prior master lead linked";
  const visual = selectLeadAlertVisualTemplate(payload, score);

  const lines = [
    `${tag} ${label}`,
    `SLA priority: ${score.grade.toUpperCase()} | owner: ${routing.owner} | ${isTest ? "QA TEST — DO NOT CONTACT" : "LIVE PROSPECT"}`,
    "",
    `Lead: ${name}`,
    `Phone: ${safePhone || "Not provided"}`,
    `Email: ${safeEmail || "Not provided"}`,
    `Property / target area: ${location}`,
    `Listing/property context: ${safe(payload.listing_id || payload.property_id || payload.agent_id)}`,
    `Timeline: ${safe(payload.timeline)}`,
    `Financing / preapproval: ${safe(payload.financing)} / ${payload.preapproval ? "Yes" : "Not provided"}`,
    `Condition: ${safe(payload.condition)}`,
    `Motivation / question: ${safe(payload.notes || payload.question)}`,
    "",
    `Score: ${score.score}/100 (${score.grade.toUpperCase()})` ,
    `Score explanation: ${factorText}`,
    `Source: ${source}`,
    `Source URL: ${safe(payload.page_url || payload.attribution.parent_url || payload.attribution.landing_page)}`,
    `Placement: ${safe(payload.attribution.placement_id || payload.attribution.placement)}`,
    `First touch: ${JSON.stringify(payload.attribution.first_touch || {})}`,
    `Last touch: ${JSON.stringify(payload.attribution.last_touch || {})}`,
    `UTMs: ${JSON.stringify({ source: payload.attribution.source, medium: payload.attribution.medium, campaign: payload.attribution.campaign, content: payload.attribution.content, term: payload.attribution.term })}`,
    `Click IDs: ${JSON.stringify({ gclid: payload.attribution.gclid, gbraid: payload.attribution.gbraid, wbraid: payload.attribution.wbraid, fbclid: payload.attribution.fbclid, msclkid: payload.attribution.msclkid })}`,
    `Submitted: ${input.submittedAt}`,
    `Consent: ${consentText}; version ${safe(payload.consent_language_version, "not recorded")}`,
    `Duplicate/master status: ${duplicateText}`,
    `Assignment: ${routing.owner}; ${routing.routingReason}`,
    "",
    `Lead Center: ${leadCenterUrl}`,
    `Lead ID: ${input.leadId}`,
    `Correlation ID: ${input.correlationId}`,
    "Next action: review the source and contact context in Lead Center; do not contact a QA test lead.",
    "Not a survey.",
  ];
  const text = lines.join("\n");
  const rows = [
    ["Lead", name], ["Phone", safePhone || "Not provided"], ["Email", safeEmail || "Not provided"],
    ["Property / target area", location], ["Listing/property context", payload.listing_id || payload.property_id || payload.agent_id || "Not provided"], ["Timeline", safe(payload.timeline)], ["Motivation / question", safe(payload.notes || payload.question)],
    ["Score", `${score.score}/100 (${score.grade.toUpperCase()})`], ["Score explanation", factorText], ["Source", source],
    ["Source URL", payload.page_url || payload.attribution.parent_url || payload.attribution.landing_page || "Not provided"],
    ["Placement", payload.attribution.placement_id || payload.attribution.placement || "Not provided"], ["Consent", `${consentText}; ${payload.consent_language_version || "not recorded"}`],
    ["Duplicate/master", duplicateText], ["Assignment", `${routing.owner}; ${routing.routingReason}`], ["Submitted", input.submittedAt],
  ];
  const visualHeader = shouldRenderLeadAlertVisual()
    ? `<img src="${html(visualAssetUrl(visual.backgroundAssetPath))}" width="560" alt="" role="presentation" style="display:block;width:100%;max-width:560px;height:110px;object-fit:cover;object-position:center;opacity:.92"/>`
    : "";
  const htmlBody = `<div style="margin:0;padding:0;background:#090909;font-family:Arial,sans-serif;color:#f8fafc;line-height:1.5"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#101010;border:1px solid ${html(visual.accent)}"><tr><td>${visualHeader}<div style="padding:24px"><p style="margin:0 0 6px;color:${html(visual.accent)};font-weight:700;letter-spacing:.08em;font-size:12px">${html(visual.eyebrow)}</p><h1 style="margin:0 0 8px;color:#fff;font-size:25px">${html(tag)} ${html(label)}</h1><p style="margin:0 0 20px"><strong>${html(isTest ? "QA TEST — DO NOT CONTACT" : "LIVE PROSPECT")}</strong></p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #4b3b14">${rows.map(([key, value]) => `<tr><td style="padding:8px 14px 8px 0;color:#d4a72c;font-weight:700;vertical-align:top;width:38%">${html(key)}</td><td style="padding:8px 0;color:#f8fafc">${html(value)}</td></tr>`).join("")}</table><p style="margin:20px 0"><a href="${html(leadCenterUrl)}" style="display:inline-block;background:${html(visual.accent)};color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">Open secure Lead Center</a></p><p style="color:#cbd5e1;font-size:12px">Lead ID: ${html(input.leadId)}<br/>Correlation ID: ${html(input.correlationId)}</p><p style="color:#cbd5e1">Next action: review the source and contact context in Lead Center; do not contact a QA test lead.</p><p style="color:#94a3b8;font-size:12px">Not a survey.</p></div></td></tr></table></div>`;
  return { subject, text, html: htmlBody, leadName: name, safeEmail, safePhone, visualTemplate: visual };
}

export function renderConsumerAcknowledgment(input: { payload: LeadPayload }) {
  const greeting = input.payload.name ? `Hi ${safe(input.payload.name)},` : "Hello,";
  const subject = "We received your Ask Magic Mike request";
  const text = [
    greeting,
    "",
    "Ask Magic Mike and Our Town Properties received your request. Mike or the approved team will review it and follow up through the contact path you provided.",
    "",
    "This message does not provide a valuation, offer, appointment, availability, or response-time promise. Reply to this email or use the contact information on ourtownproperties.com if you need to add context.",
    "",
    "Not a survey.",
  ].join("\n");
  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><p>${html(greeting)}</p><p>Ask Magic Mike and Our Town Properties received your request. Mike or the approved team will review it and follow up through the contact path you provided.</p><p>This message does not provide a valuation, offer, appointment, availability, or response-time promise.</p><p>Reply to this email or use the contact information on ourtownproperties.com if you need to add context.</p><p>Not a survey.</p></div>`,
  };
}
