import type { MessageChannel, MessagePurpose } from "./permission-engine";

export type LeadMessageGroup =
  | "general"
  | "home_value"
  | "seller"
  | "buyer"
  | "seller_options"
  | "rental"
  | "short_term_rental"
  | "property_alerts"
  | "out_of_area"
  | "coastal_review";

export type MessageTemplate = {
  id: string;
  version: string;
  group: LeadMessageGroup;
  channel: MessageChannel | "call";
  purpose: MessagePurpose;
  timing: string;
  approval: "APPROVAL_REQUIRED" | "INTERNAL_APPROVED";
  stopConditions: string[];
  subject?: string;
  body: string;
};

export const SEQUENCE_STOP_CONDITIONS = [
  "consumer_reply",
  "contact_recorded",
  "appointment_set",
  "signed_client",
  "closed_won",
  "closed_lost",
  "invalid_contact",
  "opt_out",
  "legal_hold",
  "bic_hold",
  "manual_pause",
  "duplicate_consolidation",
  "test_or_suppressed",
] as const;

const stops = [...SEQUENCE_STOP_CONDITIONS];
const consumer = (input: Omit<MessageTemplate, "version" | "approval" | "stopConditions">): MessageTemplate => ({
  ...input,
  version: "phase6-v1",
  approval: "APPROVAL_REQUIRED",
  stopConditions: stops,
});

export const MESSAGE_TEMPLATE_REGISTRY: MessageTemplate[] = [
  consumer({ id: "general.email.received", group: "general", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "We received your Ask Magic Mike request", body: "Thanks for reaching out. Mike or the approved Our Town Properties team will review what you shared and follow up through the contact path you provided. No appointment or response time is confirmed by this message." }),
  consumer({ id: "general.email.day2", group: "general", channel: "email", purpose: "requested_service_response", timing: "day_2", subject: "A quick follow-up on your real estate question", body: "If you would like, reply with the main decision you are working through and any location or timing details that would help the team respond accurately." }),
  consumer({ id: "general.email.day5", group: "general", channel: "email", purpose: "marketing_nurture", timing: "day_5", subject: "Still want help with your real estate question?", body: "If your plans have changed, no action is needed. If you still want help, reply with the best next question and the team can review it." }),
  consumer({ id: "general.sms.received", group: "general", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: We received your request. A local team member will review it. Reply STOP to opt out; HELP for help." }),

  consumer({ id: "home_value.email.received", group: "home_value", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your home-value review request was received", body: "We received your property details for a broker-reviewed home-value conversation. This is not an appraisal, automated valuation, or offer." }),
  consumer({ id: "home_value.email.details", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "Helpful details for your home-value review", body: "Reply with any major updates, condition notes, or timing considerations you want the team to consider. A human review is required before any property-specific guidance." }),
  consumer({ id: "home_value.email.day2", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "day_2", subject: "One follow-up on your property review", body: "If you still want a local review, reply with the best way to discuss your goals. No valuation or appointment is confirmed until the team responds." }),
  consumer({ id: "home_value.sms.received", group: "home_value", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: Your home-value review request is recorded for human review. Not an appraisal or offer. STOP to opt out; HELP for help." }),

  consumer({ id: "seller.email.received", group: "seller", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "We received your selling-plan request", body: "Thanks for sharing your selling plans. The team will review your timing and property context before following up. No price, outcome, or closing date is promised." }),
  consumer({ id: "seller.email.timeline", group: "seller", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A quick question about your selling timeline", body: "What timing would make a move useful for you, and what is the biggest question you want answered first? Reply only with details you are comfortable sharing." }),
  consumer({ id: "seller.email.day7", group: "seller", channel: "email", purpose: "marketing_nurture", timing: "day_7", subject: "Should we keep your selling review open?", body: "If you still want to compare next steps, reply and the team can continue the conversation. Otherwise, no action is needed." }),
  consumer({ id: "seller.sms.timeline", group: "seller", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Ask Magic Mike / Our Town Properties: What timing and main selling question should the team review first? STOP to opt out; HELP for help." }),

  consumer({ id: "buyer.email.received", group: "buyer", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your property-match request was received", body: "We received your buying goals. A local team member will review your preferred area, timing, and priorities. This message does not confirm inventory or an appointment." }),
  consumer({ id: "buyer.email.financing", group: "buyer", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A useful next detail for your property search", body: "If you are comfortable sharing, reply with whether you are exploring financing, already preapproved, or planning another purchase path. This is not lending advice." }),
  consumer({ id: "buyer.email.alert_invite", group: "buyer", channel: "email", purpose: "property_alert_subscription", timing: "day_3", subject: "Would you like property alerts?", body: "Property alerts require a separate subscription choice. Reply only if you want the team to send the approved frequency and preference options." }),
  consumer({ id: "buyer.sms.received", group: "buyer", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: Your property-match request is recorded for review. No inventory or appointment is confirmed. STOP to opt out; HELP for help." }),

  consumer({ id: "seller_options.email.received", group: "seller_options", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your seller-options request was received", body: "The team will review the property and your goals before discussing possible paths, which may include a traditional listing or an as-is conversation. This is not a binding offer or valuation." }),
  consumer({ id: "seller_options.email.condition", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "One property-condition question", body: "Reply with any condition or timing detail that would help a human review. You do not need to make repairs or accept any specific path to have a conversation." }),
  consumer({ id: "seller_options.sms.review", group: "seller_options", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Ask Magic Mike / Our Town Properties: Your seller-options request needs human review. No offer or valuation is promised. STOP to opt out; HELP for help." }),

  consumer({ id: "rental.email.received", group: "rental", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your rental request was received", body: "We received your rental request. A team member will review area and timing details. This message does not confirm availability." }),
  consumer({ id: "rental.email.clarify", group: "rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A quick rental-search clarification", body: "Reply with your preferred area, target move timing, and any must-have requirements. Availability must be confirmed from approved sources." }),
  consumer({ id: "rental.sms.clarify", group: "rental", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Our Town Properties: What area and move timing should we review for your rental request? Availability is not confirmed. STOP to opt out; HELP for help." }),

  consumer({ id: "short_term_rental.email.received", group: "short_term_rental", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your short-term rental request was received", body: "We received your requested-service details for review. No property, dates, or availability are confirmed by this message." }),
  consumer({ id: "short_term_rental.email.details", group: "short_term_rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "Details for your short-term rental request", body: "Reply with the location, dates, and property or stay details you want reviewed. The team will confirm whether the request is within the approved service scope." }),

  consumer({ id: "property_alerts.email.confirm", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "immediate", subject: "Confirm your property-alert preferences", body: "Property alerts are not active until your preferences and approved frequency are confirmed. This consent does not enroll you in broader marketing." }),
  consumer({ id: "property_alerts.email.manage", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "on_request", subject: "Manage your property-alert preferences", body: "Reply to update the area, price range, property type, or frequency. You may unsubscribe from property alerts without changing other requested-service communication." }),
  consumer({ id: "property_alerts.sms.confirm", group: "property_alerts", channel: "sms", purpose: "property_alert_subscription", timing: "immediate", body: "Our Town Properties: Property alerts require confirmed preferences and frequency. Reply STOP to end texts; HELP for help." }),

  consumer({ id: "out_of_area.email.review", group: "out_of_area", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "We are reviewing your service-area request", body: "The team is reviewing whether your location is within the currently approved service area. This message does not promise a referral or service availability." }),
  consumer({ id: "coastal_review.email.review", group: "coastal_review", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "Your location request needs human review", body: "A team member will review your location and request. This message does not claim that coastal service is currently available." }),

  { id: "internal.lead_alert", version: "phase6-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["duplicate_consolidation"], subject: "{{priority}} {{lead_label}} | {{source}} | {{intent}} | {{location}} | {{name}} | Score {{score}}", body: "Open the secure Lead Center for source, consent, score, assignment, delivery, and next-action facts." },
  { id: "internal.daily_digest", version: "phase6-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "daily", approval: "APPROVAL_REQUIRED", stopConditions: [], subject: "[TEST — BRANDON QA] Ask Magic Mike daily operations digest", body: "Test-only rollup of queue, delivery, consent blocks, and system health. Test and suppressed records remain excluded from production metrics." },
  { id: "internal.push_hot", version: "phase6-v1", group: "general", channel: "push", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["test_or_suppressed"], body: "{{priority}} {{intent}} · {{location}} · Score {{score}} · Open secure Lead Center." },
  { id: "operator.call_opener", version: "phase6-v1", group: "general", channel: "call", purpose: "manual_one_to_one", timing: "manual", approval: "APPROVAL_REQUIRED", stopConditions: stops, body: "Hi, this is {{operator_name}} with Our Town Properties. You asked us to review {{request_summary}}. What would be most useful to clarify first?" },
];

export function templatesFor(group: LeadMessageGroup, channel?: MessageTemplate["channel"]) {
  return MESSAGE_TEMPLATE_REGISTRY.filter((template) => template.group === group && (!channel || template.channel === channel));
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderBrandedEmail(input: {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isTest?: boolean;
  marketing?: boolean;
}) {
  const prefix = input.isTest ? "[TEST — BRANDON QA] " : "";
  const subject = `${prefix}${input.subject}`.slice(0, 180);
  const text = [
    input.isTest ? "INTERNAL QA — DO NOT CONTACT" : null,
    input.heading,
    "",
    input.body,
    input.ctaLabel && input.ctaUrl ? `\n${input.ctaLabel}: ${input.ctaUrl}` : null,
    "",
    "Ask Magic Mike · Our Town Properties, Inc. · Wilson, North Carolina",
    input.marketing ? "Use the approved unsubscribe link or reply UNSUBSCRIBE to stop marketing email." : null,
  ].filter(Boolean).join("\n");
  const button = input.ctaLabel && input.ctaUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#cda24a;color:#090909;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">${escapeHtml(input.ctaLabel)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4efe4;color:#17130d;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border:1px solid #ded2ba;border-radius:12px;overflow:hidden"><tr><td style="background:#090909;padding:22px 28px;color:#fff"><p style="margin:0;color:#d9b45b;font-size:12px;font-weight:700;letter-spacing:.14em">ASK MAGIC MIKE</p><p style="margin:8px 0 0;font-size:14px">Our Town Properties, Inc.</p></td></tr>${input.isTest ? `<tr><td style="padding:12px 28px;background:#681321;color:#fff;font-weight:700">INTERNAL QA — DO NOT CONTACT</td></tr>` : ""}<tr><td style="padding:30px 28px"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(input.heading)}</h1><p style="margin:0;font-size:16px;line-height:1.65">${escapeHtml(input.body)}</p>${button}<p style="margin:28px 0 0;color:#6b6254;font-size:12px;line-height:1.5">Ask Magic Mike · Our Town Properties, Inc. · Wilson, North Carolina</p>${input.marketing ? `<p style="margin:10px 0 0;color:#6b6254;font-size:12px">Use the approved unsubscribe link or reply UNSUBSCRIBE to stop marketing email.</p>` : ""}</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
