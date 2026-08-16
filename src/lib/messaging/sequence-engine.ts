import type { LeadMessageGroup, MessageTemplate } from "./template-registry";
import { MESSAGE_TEMPLATE_REGISTRY, SEQUENCE_STOP_CONDITIONS } from "./template-registry";

export type SequenceDefinition = {
  id: string;
  group: LeadMessageGroup;
  version: string;
  steps: Array<{ templateId: string; delayMinutes: number; requiresHumanApproval: true }>;
  stopConditions: readonly string[];
};

const byId = new Map(MESSAGE_TEMPLATE_REGISTRY.map((template) => [template.id, template]));

export const MESSAGE_SEQUENCES: SequenceDefinition[] = [
  { id: "general_requested_service_v1", group: "general", version: "1", steps: [
    { templateId: "general.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "general.email.same_day", delayMinutes: 240, requiresHumanApproval: true },
    { templateId: "general.email.day2", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "general.email.day5", delayMinutes: 7200, requiresHumanApproval: true },
    { templateId: "general.email.close", delayMinutes: 14400, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "home_value_review_v1", group: "home_value", version: "1", steps: [
    { templateId: "home_value.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "home_value.email.next", delayMinutes: 60, requiresHumanApproval: true },
    { templateId: "home_value.email.details", delayMinutes: 240, requiresHumanApproval: true },
    { templateId: "home_value.email.consultation", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "home_value.email.day2", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "home_value.email.day5", delayMinutes: 7200, requiresHumanApproval: true },
    { templateId: "home_value.email.day10", delayMinutes: 14400, requiresHumanApproval: true },
    { templateId: "home_value.email.nurture_transition", delayMinutes: 21600, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "seller_review_v1", group: "seller", version: "1", steps: [
    { templateId: "seller.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "seller.email.timeline", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "seller.email.motivation", delayMinutes: 1560, requiresHumanApproval: true },
    { templateId: "seller.email.consultation", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "seller.email.day3", delayMinutes: 4320, requiresHumanApproval: true },
    { templateId: "seller.email.day7", delayMinutes: 10080, requiresHumanApproval: true },
    { templateId: "seller.email.nurture_transition", delayMinutes: 20160, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "buyer_match_v1", group: "buyer", version: "1", steps: [
    { templateId: "buyer.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "buyer.email.financing", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "buyer.email.priorities", delayMinutes: 1560, requiresHumanApproval: true },
    { templateId: "buyer.email.consultation", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "buyer.email.alert_invite", delayMinutes: 4320, requiresHumanApproval: true },
    { templateId: "buyer.email.day7", delayMinutes: 10080, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "seller_options_human_review_v1", group: "seller_options", version: "1", steps: [
    { templateId: "seller_options.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "seller_options.email.human_review", delayMinutes: 60, requiresHumanApproval: true },
    { templateId: "seller_options.email.condition", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "seller_options.email.timeline", delayMinutes: 1560, requiresHumanApproval: true },
    { templateId: "seller_options.email.paths", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "seller_options.email.day3", delayMinutes: 4320, requiresHumanApproval: true },
    { templateId: "seller_options.email.day7", delayMinutes: 10080, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "rental_request_v1", group: "rental", version: "1", steps: [
    { templateId: "rental.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "rental.email.availability", delayMinutes: 60, requiresHumanApproval: true },
    { templateId: "rental.email.timing", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "rental.email.territory", delayMinutes: 1560, requiresHumanApproval: true },
    { templateId: "rental.email.clarify", delayMinutes: 2880, requiresHumanApproval: true },
    { templateId: "rental.email.day3", delayMinutes: 4320, requiresHumanApproval: true },
    { templateId: "rental.email.close", delayMinutes: 10080, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "short_term_rental_request_v1", group: "short_term_rental", version: "1", steps: [
    { templateId: "short_term_rental.email.received", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "short_term_rental.email.clarify", delayMinutes: 60, requiresHumanApproval: true },
    { templateId: "short_term_rental.email.details", delayMinutes: 1440, requiresHumanApproval: true },
    { templateId: "short_term_rental.email.day3", delayMinutes: 4320, requiresHumanApproval: true },
    { templateId: "short_term_rental.email.close", delayMinutes: 10080, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
  { id: "property_alert_confirmation_v1", group: "property_alerts", version: "1", steps: [
    { templateId: "property_alerts.email.confirm", delayMinutes: 0, requiresHumanApproval: true },
    { templateId: "property_alerts.email.preferences", delayMinutes: 60, requiresHumanApproval: true },
    { templateId: "property_alerts.email.frequency", delayMinutes: 120, requiresHumanApproval: true },
    { templateId: "property_alerts.email.manage", delayMinutes: 10080, requiresHumanApproval: true },
  ], stopConditions: SEQUENCE_STOP_CONDITIONS },
];

export function validateSequenceDefinitions() {
  const errors: string[] = [];
  for (const sequence of MESSAGE_SEQUENCES) {
    for (const step of sequence.steps) {
      if (!byId.has(step.templateId)) errors.push(`${sequence.id}:missing:${step.templateId}`);
    }
  }
  return errors;
}

export function materializeSequence(sequenceId: string, startAt: Date) {
  const sequence = MESSAGE_SEQUENCES.find((candidate) => candidate.id === sequenceId);
  if (!sequence) return [];
  return sequence.steps.map((step, index) => ({
    sequenceId: sequence.id,
    sequenceVersion: sequence.version,
    stepIndex: index,
    scheduledAt: new Date(startAt.getTime() + step.delayMinutes * 60_000).toISOString(),
    template: byId.get(step.templateId) as MessageTemplate,
    status: "approval_required" as const,
  }));
}
