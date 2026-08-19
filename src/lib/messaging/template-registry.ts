import { createHash } from "node:crypto";
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

export type MessageTemplateVersion = MessageTemplate & {
  status: "approved" | "retired";
  changeNote: string;
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
  version: "phase7-v1",
  approval: "APPROVAL_REQUIRED",
  stopConditions: stops,
});

export const MESSAGE_TEMPLATE_REGISTRY: MessageTemplate[] = [
  consumer({ id: "general.email.received", group: "general", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "We received your Ask Magic Mike request", body: "Thanks for reaching out. Mike or the approved Our Town Properties team will review what you shared and follow up through the contact path you provided. No appointment or response time is confirmed by this message." }),
  consumer({ id: "general.email.same_day", group: "general", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "A helpful next step for your real estate question", body: "Reply with the decision you are working through, the location involved, and any timing detail you want the team to review. Share only information you are comfortable providing." }),
  consumer({ id: "general.email.day2", group: "general", channel: "email", purpose: "requested_service_response", timing: "day_2", subject: "A quick follow-up on your real estate question", body: "If you would like, reply with the main decision you are working through and any location or timing details that would help the team respond accurately." }),
  consumer({ id: "general.email.day5", group: "general", channel: "email", purpose: "marketing_nurture", timing: "day_5", subject: "Still want help with your real estate question?", body: "If your plans have changed, no action is needed. If you still want help, reply with the best next question and the team can review it." }),
  consumer({ id: "general.email.close", group: "general", channel: "email", purpose: "requested_service_response", timing: "close_the_loop", subject: "Should we close this request for now?", body: "We have not assumed your plans are unchanged. If you still want help, reply and the team can reopen the conversation. Otherwise, no action is needed." }),
  consumer({ id: "general.sms.received", group: "general", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: We received your request. A local team member will review it. Reply STOP to opt out; HELP for help." }),

  consumer({ id: "home_value.email.received", group: "home_value", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your home-value review request was received", body: "We received your property details for a broker-reviewed home-value conversation. This is not an appraisal, automated valuation, or offer." }),
  consumer({ id: "home_value.email.next", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "What happens next with your home-value request", body: "A licensed real estate professional will review the information you submitted and may ask for property or timing details before discussing a market-based perspective. No automated value is being presented." }),
  consumer({ id: "home_value.email.details", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "Helpful details for your home-value review", body: "Reply with any major updates, condition notes, or timing considerations you want the team to consider. A human review is required before any property-specific guidance." }),
  consumer({ id: "home_value.email.consultation", group: "home_value", channel: "email", purpose: "appointment_coordination", timing: "day_1", subject: "Would a home-value conversation be useful?", body: "If you want to discuss the property and your goals, reply with a few times that generally work for you. An appointment is not scheduled until the team confirms it." }),
  consumer({ id: "home_value.email.day2", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "day_2", subject: "One follow-up on your property review", body: "If you still want a local review, reply with the best way to discuss your goals. No valuation or appointment is confirmed until the team responds." }),
  consumer({ id: "home_value.email.day5", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "day_5", subject: "Any property details we should add?", body: "If renovations, condition, occupancy, or timing have changed, reply with the details you want included in the human review. No response is required if your plans are paused." }),
  consumer({ id: "home_value.email.day10", group: "home_value", channel: "email", purpose: "requested_service_response", timing: "day_10", subject: "A practical note about home-value reviews", body: "Recent comparable sales, current competition, property condition, and timing can all affect a market conversation. Reply if you want the team to review those factors with you." }),
  consumer({ id: "home_value.email.nurture_transition", group: "home_value", channel: "email", purpose: "marketing_nurture", timing: "nurture_transition", subject: "Would you like occasional seller guidance?", body: "Ongoing market updates require separate marketing permission. Reply only if you want the approved options; this request does not enroll you automatically." }),
  consumer({ id: "home_value.sms.received", group: "home_value", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: Your home-value review request is recorded for human review. Not an appraisal or offer. STOP to opt out; HELP for help." }),

  consumer({ id: "seller.email.received", group: "seller", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "We received your selling-plan request", body: "Thanks for sharing your selling plans. The team will review your timing and property context before following up. No price, outcome, or closing date is promised." }),
  consumer({ id: "seller.email.timeline", group: "seller", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A quick question about your selling timeline", body: "What timing would make a move useful for you, and what is the biggest question you want answered first? Reply only with details you are comfortable sharing." }),
  consumer({ id: "seller.email.motivation", group: "seller", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "What matters most in your selling plan?", body: "If helpful, reply with the outcome you care about most—timing, preparation, convenience, price discussion, or another concern. The team will use that context for a human review." }),
  consumer({ id: "seller.email.consultation", group: "seller", channel: "email", purpose: "appointment_coordination", timing: "day_2", subject: "Would you like to discuss your selling options?", body: "Reply with a few times that generally work if a conversation would help. Nothing is scheduled until the team confirms it." }),
  consumer({ id: "seller.email.day3", group: "seller", channel: "email", purpose: "requested_service_response", timing: "day_3", subject: "Any selling-plan details we should clarify?", body: "Reply with any condition, preparation, occupancy, or timing details you want reviewed. No outcome, price, or closing date is guaranteed." }),
  consumer({ id: "seller.email.day7", group: "seller", channel: "email", purpose: "marketing_nurture", timing: "day_7", subject: "Should we keep your selling review open?", body: "If you still want to compare next steps, reply and the team can continue the conversation. Otherwise, no action is needed." }),
  consumer({ id: "seller.email.nurture_transition", group: "seller", channel: "email", purpose: "marketing_nurture", timing: "nurture_transition", subject: "Would occasional seller updates be useful?", body: "Ongoing seller information requires separate marketing permission. Reply only if you want to review the available preferences; no subscription has been created." }),
  consumer({ id: "seller.sms.timeline", group: "seller", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Ask Magic Mike / Our Town Properties: What timing and main selling question should the team review first? STOP to opt out; HELP for help." }),

  consumer({ id: "buyer.email.received", group: "buyer", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your property-match request was received", body: "We received your buying goals. A local team member will review your preferred area, timing, and priorities. This message does not confirm inventory or an appointment." }),
  consumer({ id: "buyer.email.financing", group: "buyer", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A useful next detail for your property search", body: "If you are comfortable sharing, reply with whether you are exploring financing, already preapproved, or planning another purchase path. This is not lending advice." }),
  consumer({ id: "buyer.email.priorities", group: "buyer", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "Which home-search priorities matter most?", body: "Reply with your preferred area, property type, timing, and the few features that matter most. Availability must be confirmed from approved listing sources." }),
  consumer({ id: "buyer.email.consultation", group: "buyer", channel: "email", purpose: "appointment_coordination", timing: "day_2", subject: "Would a buying-plan conversation help?", body: "If you want to discuss the search process, reply with a few times that generally work. No appointment is scheduled until the team confirms it." }),
  consumer({ id: "buyer.email.alert_invite", group: "buyer", channel: "email", purpose: "property_alert_subscription", timing: "day_3", subject: "Would you like property alerts?", body: "Property alerts require a separate subscription choice. Reply only if you want the team to send the approved frequency and preference options." }),
  consumer({ id: "buyer.email.day7", group: "buyer", channel: "email", purpose: "requested_service_response", timing: "day_7", subject: "Should we keep your property-match request open?", body: "If your search is still active, reply with any updated area, timing, or property priorities. No action is needed if your plans are paused." }),
  consumer({ id: "buyer.sms.received", group: "buyer", channel: "sms", purpose: "transactional_acknowledgment", timing: "immediate", body: "Ask Magic Mike / Our Town Properties: Your property-match request is recorded for review. No inventory or appointment is confirmed. STOP to opt out; HELP for help." }),

  consumer({ id: "seller_options.email.received", group: "seller_options", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your seller-options request was received", body: "The team will review the property and your goals before discussing possible paths, which may include a traditional listing or an as-is conversation. This is not a binding offer or valuation." }),
  consumer({ id: "seller_options.email.human_review", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "How the seller-options review works", body: "A licensed professional must review the property context and your goals before discussing any possible path. This request does not create an offer, valuation, appointment, or obligation." }),
  consumer({ id: "seller_options.email.condition", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "One property-condition question", body: "Reply with any condition or timing detail that would help a human review. You do not need to make repairs or accept any specific path to have a conversation." }),
  consumer({ id: "seller_options.email.timeline", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "What timing should the seller-options review consider?", body: "Reply with the timing you are considering and any flexibility you have. No closing date, offer, or outcome is promised." }),
  consumer({ id: "seller_options.email.paths", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_2", subject: "Listing and as-is paths require a human review", body: "Depending on the property and your goals, a traditional listing or an as-is discussion may be worth reviewing. The team will not assume either path is appropriate without a conversation." }),
  consumer({ id: "seller_options.email.day3", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_3", subject: "Any seller-options questions we should add?", body: "Reply with the practical concern you want addressed first, such as condition, timing, preparation, or next steps. This is not an offer or valuation." }),
  consumer({ id: "seller_options.email.day7", group: "seller_options", channel: "email", purpose: "requested_service_response", timing: "day_7", subject: "Should we keep this seller-options review open?", body: "Reply if you still want a human review of possible selling paths. Otherwise, no action is needed and no offer or appointment is assumed." }),
  consumer({ id: "seller_options.sms.review", group: "seller_options", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Ask Magic Mike / Our Town Properties: Your seller-options request needs human review. No offer or valuation is promised. STOP to opt out; HELP for help." }),

  consumer({ id: "rental.email.received", group: "rental", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your rental request was received", body: "We received your rental request. A team member will review area and timing details. This message does not confirm availability." }),
  consumer({ id: "rental.email.availability", group: "rental", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "Rental availability requires current verification", body: "A team member will review current approved sources before discussing any property. This message does not confirm that a specific rental is available." }),
  consumer({ id: "rental.email.timing", group: "rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "What move timing should we review?", body: "Reply with your preferred move window and any flexibility you want the team to consider. No property or move date is confirmed." }),
  consumer({ id: "rental.email.territory", group: "rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "Which area should the rental review cover?", body: "Reply with the city, ZIP code, or general area you want reviewed. The team will confirm service scope and availability from approved sources." }),
  consumer({ id: "rental.email.clarify", group: "rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "A quick rental-search clarification", body: "Reply with your preferred area, target move timing, and any must-have requirements. Availability must be confirmed from approved sources." }),
  consumer({ id: "rental.email.day3", group: "rental", channel: "email", purpose: "requested_service_response", timing: "day_3", subject: "Any rental-search details to update?", body: "Reply with any change to your preferred area, timing, or requirements. This message does not confirm property availability or service territory." }),
  consumer({ id: "rental.email.close", group: "rental", channel: "email", purpose: "requested_service_response", timing: "close_the_loop", subject: "Should we close this rental request for now?", body: "If you still want help, reply with your current area and move timing. Otherwise, no action is needed." }),
  consumer({ id: "rental.sms.clarify", group: "rental", channel: "sms", purpose: "requested_service_response", timing: "day_1", body: "Our Town Properties: What area and move timing should we review for your rental request? Availability is not confirmed. STOP to opt out; HELP for help." }),

  consumer({ id: "short_term_rental.email.received", group: "short_term_rental", channel: "email", purpose: "transactional_acknowledgment", timing: "immediate", subject: "Your short-term rental request was received", body: "We received your requested-service details for review. No property, dates, or availability are confirmed by this message." }),
  consumer({ id: "short_term_rental.email.clarify", group: "short_term_rental", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "A clarification for your short-term rental request", body: "Reply with the purpose of the request and the outcome you want reviewed. The team will confirm whether the request fits the approved service scope before discussing next steps." }),
  consumer({ id: "short_term_rental.email.details", group: "short_term_rental", channel: "email", purpose: "requested_service_response", timing: "day_1", subject: "Details for your short-term rental request", body: "Reply with the location, dates, and property or stay details you want reviewed. The team will confirm whether the request is within the approved service scope." }),
  consumer({ id: "short_term_rental.email.day3", group: "short_term_rental", channel: "email", purpose: "requested_service_response", timing: "day_3", subject: "Any short-term rental details to update?", body: "Reply with any change to the requested location, dates, or property details. No availability or service scope is confirmed by this message." }),
  consumer({ id: "short_term_rental.email.close", group: "short_term_rental", channel: "email", purpose: "requested_service_response", timing: "close_the_loop", subject: "Should we close this short-term rental request?", body: "If you still want the request reviewed, reply with the current details. Otherwise, no action is needed." }),

  consumer({ id: "property_alerts.email.confirm", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "immediate", subject: "Confirm your property-alert preferences", body: "Property alerts are not active until your preferences and approved frequency are confirmed. This consent does not enroll you in broader marketing." }),
  consumer({ id: "property_alerts.email.frequency", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "on_request", subject: "Choose how often you want property alerts", body: "Reply with the approved alert frequency you prefer. Your choice applies only to property alerts and does not create broader marketing permission." }),
  consumer({ id: "property_alerts.email.preferences", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "on_request", subject: "Clarify your property-alert preferences", body: "Reply with the area, price range, property type, and must-have features you want used. Inventory must be confirmed from approved sources." }),
  consumer({ id: "property_alerts.email.manage", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "on_request", subject: "Manage your property-alert preferences", body: "Reply to update the area, price range, property type, or frequency. You may unsubscribe from property alerts without changing other requested-service communication." }),
  consumer({ id: "property_alerts.email.unsubscribe", group: "property_alerts", channel: "email", purpose: "property_alert_subscription", timing: "on_opt_out", subject: "Your property-alert subscription has been stopped", body: "Property-alert email has been stopped for the selected destination. This does not change any separate requested-service conversation unless you ask us to do so." }),
  consumer({ id: "property_alerts.sms.confirm", group: "property_alerts", channel: "sms", purpose: "property_alert_subscription", timing: "immediate", body: "Our Town Properties: Property alerts require confirmed preferences and frequency. Reply STOP to end texts; HELP for help." }),

  consumer({ id: "out_of_area.email.review", group: "out_of_area", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "We are reviewing your service-area request", body: "The team is reviewing whether your location is within the currently approved service area. This message does not promise a referral or service availability." }),
  consumer({ id: "coastal_review.email.review", group: "coastal_review", channel: "email", purpose: "requested_service_response", timing: "same_day", subject: "Your location request needs human review", body: "A team member will review your location and request. This message does not claim that coastal service is currently available." }),
  { id: "out_of_area.internal.review", version: "phase7-v1", group: "out_of_area", channel: "email", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["duplicate_consolidation"], subject: "{{priority}} SERVICE-AREA REVIEW | {{source}} | {{lead_id}}", body: "Review the recorded location and approved service scope before routing or replying. Do not promise a referral or coverage." },
  { id: "coastal_review.internal.review", version: "phase7-v1", group: "coastal_review", channel: "email", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["duplicate_consolidation"], subject: "{{priority}} COASTAL REVIEW | {{source}} | {{lead_id}}", body: "Human review is required before any service-area statement, assignment, or consumer response." },

  consumer({ id: "general.email.appointment_invitation", group: "general", channel: "email", purpose: "appointment_coordination", timing: "manual", subject: "Review the available appointment options", body: "Use the secure scheduling path or reply with a few times that generally work. An appointment is not confirmed until the team accepts it." }),
  consumer({ id: "general.email.follow_up", group: "general", channel: "email", purpose: "requested_service_response", timing: "manual", subject: "Following up on your Ask Magic Mike request", body: "Reply with any change to your question, area, or timing that would help the team respond accurately. No action is needed if your plans are paused." }),
  consumer({ id: "general.email.opt_out_confirmation", group: "general", channel: "email", purpose: "requested_service_response", timing: "on_opt_out", subject: "Your email preference has been updated", body: "The applicable future email category has been stopped for this destination. Separate requested-service communication is handled according to the permission recorded for that request." }),

  { id: "internal.lead_alert", version: "phase7-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["duplicate_consolidation"], subject: "{{priority}} {{lead_label}} | {{source}} | {{intent}} | {{location}} | {{name}} | Score {{score}}", body: "Open the secure Lead Center for source, consent, score, assignment, delivery, and next-action facts." },
  { id: "internal.mike_view_alert", version: "phase7-v1", group: "general", channel: "email", purpose: "qa_test", timing: "manual", approval: "APPROVAL_REQUIRED", stopConditions: ["test_or_suppressed"], subject: "[TEST — BRANDON QA — MIKE VIEW] {{lead_label}} | {{source}} | {{intent}} | {{location}} | Score {{score}}", body: "INTERNAL QA — DO NOT CONTACT. This is a simulated Mike-view rendering for Brandon only. Open the secure Lead Center preview; no real assignment or delivery is implied." },
  { id: "internal.daily_digest", version: "phase7-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "daily", approval: "APPROVAL_REQUIRED", stopConditions: [], subject: "[TEST — BRANDON QA] Ask Magic Mike daily operations digest", body: "Test-only rollup of queue, delivery, consent blocks, and system health. Test and suppressed records remain excluded from production metrics." },
  { id: "internal.delivery_failure", version: "phase7-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "on_failure", approval: "INTERNAL_APPROVED", stopConditions: [], subject: "{{priority}} DELIVERY FAILURE | {{source}} | {{lead_id}}", body: "A provider reported an unsuccessful delivery. Review the protected Notification Center for the normalized provider event, attempt history, and safe next action." },
  { id: "internal.sla_breach", version: "phase7-v1", group: "general", channel: "email", purpose: "internal_alert", timing: "on_sla_breach", approval: "INTERNAL_APPROVED", stopConditions: ["contact_recorded", "appointment_set", "closed_won", "closed_lost"], subject: "{{priority}} SLA REVIEW | {{source}} | {{lead_id}}", body: "The lead requires an internal SLA review. Confirm the recorded contact state, assignment, and next action in the secure Lead Center." },
  { id: "internal.test_render", version: "phase7-v1", group: "general", channel: "email", purpose: "qa_test", timing: "manual", approval: "APPROVAL_REQUIRED", stopConditions: ["test_or_suppressed"], subject: "[TEST — BRANDON QA] Message rendering acceptance", body: "INTERNAL QA — DO NOT CONTACT. This rendering verifies the approved recipient boundary, template version, plain text, HTML, links, and audit metadata without contacting Mike or a consumer." },
  { id: "internal.push_hot", version: "phase7-v1", group: "general", channel: "push", purpose: "internal_alert", timing: "immediate", approval: "INTERNAL_APPROVED", stopConditions: ["test_or_suppressed"], body: "{{priority}} {{intent}} · {{location}} · Score {{score}} · Open secure Lead Center." },
  { id: "operator.call_opener", version: "phase7-v1", group: "general", channel: "call", purpose: "manual_one_to_one", timing: "manual", approval: "APPROVAL_REQUIRED", stopConditions: stops, body: "Hi, this is {{operator_name}} with Our Town Properties. You asked us to review {{request_summary}}. What would be most useful to clarify first?" },
];

export function templatesFor(group: LeadMessageGroup, channel?: MessageTemplate["channel"]) {
  return MESSAGE_TEMPLATE_REGISTRY.filter((template) => template.group === group && (!channel || template.channel === channel));
}

const VARIABLE = /{{([a-z0-9_]+)}}/gi;

export function templateVariables(template: MessageTemplate) {
  return [...new Set([template.subject || "", template.body].flatMap((value) => [...value.matchAll(VARIABLE)].map((match) => match[1])))]
    .sort();
}

export function renderMessageTemplate(templateId: string, variables: Record<string, string | number>) {
  const template = MESSAGE_TEMPLATE_REGISTRY.find((candidate) => candidate.id === templateId);
  if (!template) return { ok: false as const, error: "template_not_found" as const };
  const required = templateVariables(template);
  const unknown = Object.keys(variables).filter((name) => !required.includes(name)).sort();
  if (unknown.length) return { ok: false as const, error: "template_variables_unknown" as const, unknown };
  const missing = required.filter((name) => variables[name] == null || String(variables[name]).trim() === "");
  if (missing.length) return { ok: false as const, error: "template_variables_missing" as const, missing };
  const substitute = (value: string) => value.replace(VARIABLE, (_match, name: string) => String(variables[name] ?? ""));
  const subject = template.subject ? substitute(template.subject) : null;
  const body = substitute(template.body);
  return {
    ok: true as const,
    templateId: template.id,
    version: template.version,
    subject,
    body,
    contentHash: createHash("sha256").update(`${subject || ""}\n${body}`).digest("hex"),
    purpose: template.purpose,
    channel: template.channel,
  };
}

export function templateVersionHistory(templateId: string): MessageTemplateVersion[] {
  const template = MESSAGE_TEMPLATE_REGISTRY.find((candidate) => candidate.id === templateId);
  if (!template) return [];
  return [
    { ...template, version: "phase6-v1", status: "retired", changeNote: "Phase 6 controlled-preview baseline retained for rollback reference." },
    { ...template, status: "approved", changeNote: "Phase 7 permission-first copy, render contract, and release metadata." },
  ];
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export const BRANDED_EMAIL_TEMPLATE_VERSION = "phase9-commercial-email-v1";
export const BROKERAGE_POSTAL_ADDRESS = "3301 Nash St. NW Suite E, Wilson, NC 27896";
export const MARKETING_EMAIL_DISCLOSURE = "Marketing message from Ask Magic Mike / Our Town Properties, Inc.";
export const MARKETING_EMAIL_OPT_OUT = "Use the unsubscribe link below to stop marketing email.";

function approvedHttpsUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
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
  unsubscribeUrl?: string;
  qaAudience?: "brandon" | "mike_view";
  templateVersion?: string;
}) {
  const prefix = input.isTest
    ? input.qaAudience === "mike_view" ? "[TEST — BRANDON QA — MIKE VIEW] " : "[TEST — BRANDON QA] "
    : "";
  const subject = `${input.subject.startsWith("[TEST — BRANDON QA") ? "" : prefix}${input.subject}`.slice(0, 180);
  const ctaUrl = approvedHttpsUrl(input.ctaUrl);
  if (input.ctaUrl && !ctaUrl) throw new Error("unsafe_cta_url");
  const unsubscribeUrl = input.marketing ? approvedHttpsUrl(input.unsubscribeUrl) : null;
  if (input.marketing && !unsubscribeUrl) throw new Error("marketing_unsubscribe_url_required");
  const templateVersion = input.templateVersion || BRANDED_EMAIL_TEMPLATE_VERSION;
  const contentHash = createHash("sha256").update(JSON.stringify({
    subject,
    preheader: input.preheader,
    heading: input.heading,
    body: input.body,
    ctaLabel: input.ctaLabel || null,
    ctaUrl,
    isTest: input.isTest === true,
    marketing: input.marketing === true,
    unsubscribeUrl,
    brokeragePostalAddress: BROKERAGE_POSTAL_ADDRESS,
    marketingDisclosure: input.marketing === true ? MARKETING_EMAIL_DISCLOSURE : null,
    marketingOptOut: input.marketing === true ? MARKETING_EMAIL_OPT_OUT : null,
    templateVersion,
  })).digest("hex");
  const text = [
    input.isTest ? "INTERNAL QA — DO NOT CONTACT" : null,
    input.heading,
    "",
    input.body,
    input.ctaLabel && ctaUrl ? `\n${input.ctaLabel}: ${ctaUrl}` : null,
    "",
    "Ask Magic Mike · Our Town Properties, Inc. · Wilson, North Carolina",
    BROKERAGE_POSTAL_ADDRESS,
    input.marketing ? MARKETING_EMAIL_DISCLOSURE : null,
    input.marketing ? MARKETING_EMAIL_OPT_OUT : null,
    unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : null,
    `Template ${templateVersion} · Content ${contentHash.slice(0, 12)}`,
  ].filter(Boolean).join("\n");
  const button = input.ctaLabel && ctaUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" aria-label="${escapeHtml(input.ctaLabel)}" style="display:inline-block;background:#cda24a;color:#090909;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">${escapeHtml(input.ctaLabel)}</a></p>`
    : "";
  const identityFooter = `<p style="margin:0;color:#6b6254;font-size:12px;line-height:1.55">Ask Magic Mike · Our Town Properties, Inc. · Wilson, North Carolina<br>${escapeHtml(BROKERAGE_POSTAL_ADDRESS)}</p>`;
  const marketingFooter = input.marketing
    ? `<p style="margin:10px 0 0;color:#6b6254;font-size:12px">${escapeHtml(MARKETING_EMAIL_DISCLOSURE)}</p><p style="margin:10px 0 0;color:#6b6254;font-size:12px">${escapeHtml(MARKETING_EMAIL_OPT_OUT)} <a href="${escapeHtml(unsubscribeUrl || "")}" style="color:#6b6254;text-decoration:underline">Unsubscribe from marketing email</a>.</p>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#eee7d8;color:#17130d;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee7d8"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border:1px solid #d8c9ab;border-radius:14px;overflow:hidden;box-shadow:0 18px 48px rgba(30,20,5,.12)"><tr><td style="height:5px;background:#cda24a"></td></tr><tr><td style="background:#090909;padding:24px 28px;color:#fff"><p style="margin:0;color:#e4bf64;font-size:12px;font-weight:800;letter-spacing:.16em">ASK MAGIC MIKE</p><p style="margin:8px 0 0;font-size:14px;color:#f3ead8">Our Town Properties, Inc. · Human-reviewed real estate guidance</p></td></tr>${input.isTest ? `<tr><td style="padding:12px 28px;background:#681321;color:#fff;font-weight:800;letter-spacing:.04em">INTERNAL QA — DO NOT CONTACT</td></tr>` : ""}<tr><td style="padding:32px 28px"><p style="margin:0 0 12px;color:#8b1020;font-size:11px;font-weight:800;letter-spacing:.14em">REQUEST STATUS</p><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:29px;line-height:1.2;color:#17130d">${escapeHtml(input.heading)}</h1><p style="margin:0;font-size:16px;line-height:1.7;color:#3d3529">${escapeHtml(input.body)}</p>${button}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-top:1px solid #e7dcc6"><tr><td style="padding-top:18px">${identityFooter}${marketingFooter}<p style="margin:10px 0 0;color:#8a8175;font-size:11px">Template ${escapeHtml(templateVersion)} · Content ${contentHash.slice(0, 12)}</p></td></tr></table></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html, templateVersion, contentHash };
}
