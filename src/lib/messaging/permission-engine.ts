export const MESSAGE_PURPOSES = [
  "internal_alert",
  "requested_service_response",
  "transactional_acknowledgment",
  "appointment_coordination",
  "property_alert_subscription",
  "marketing_nurture",
  "manual_one_to_one",
  "qa_test",
] as const;

export type MessagePurpose = (typeof MESSAGE_PURPOSES)[number];
export type MessageChannel = "email" | "sms" | "push" | "phone";

export type CommunicationPermissionInput = {
  channel: MessageChannel;
  purpose: MessagePurpose;
  isTest?: boolean;
  suppressed?: boolean;
  legalHold?: boolean;
  bicHold?: boolean;
  consentAmbiguous?: boolean;
  consentDenied?: boolean;
  requestedServiceEmail?: boolean;
  requestedServiceSms?: boolean;
  emailMarketing?: boolean;
  smsMarketing?: boolean;
  propertyAlerts?: boolean;
  phoneCall?: boolean;
  internalEmail?: boolean;
  internalPush?: boolean;
  optedOutEmail?: boolean;
  optedOutSms?: boolean;
  invalidContact?: boolean;
  recipientIsApprovedQa?: boolean;
  autoSendEnabled?: boolean;
  humanApproved?: boolean;
  evidence?: Record<string, unknown>;
  consentVersion?: string | null;
  formOrRoute?: string | null;
  decisionSource?: string;
};

export type CommunicationPermissionDecision = {
  allowed: boolean;
  code:
    | "allowed"
    | "test_record_consumer_block"
    | "qa_record_not_test"
    | "qa_record_not_suppressed"
    | "qa_recipient_not_approved"
    | "suppressed"
    | "legal_hold"
    | "bic_hold"
    | "ambiguous_consent"
    | "consent_denied"
    | "channel_opt_out"
    | "invalid_contact"
    | "missing_permission"
    | "auto_send_disabled"
    | "human_approval_required";
  explanation: string;
  requiresHumanApproval: boolean;
  channel: MessageChannel;
  purpose: MessagePurpose;
  evidence: Record<string, unknown>;
  consentVersion: string | null;
  formOrRoute: string | null;
  decisionSource: string;
  decidedAt: string;
};

const INTERNAL_PURPOSES = new Set<MessagePurpose>(["internal_alert", "qa_test"]);

export function decideCommunicationPermission(
  input: CommunicationPermissionInput,
): CommunicationPermissionDecision {
  const decidedAt = new Date().toISOString();
  const detail = {
    channel: input.channel,
    purpose: input.purpose,
    evidence: input.evidence || {},
    consentVersion: input.consentVersion || null,
    formOrRoute: input.formOrRoute || null,
    decisionSource: input.decisionSource || "permission_engine",
    decidedAt,
  };
  const blocked = (code: CommunicationPermissionDecision["code"], explanation: string) => ({
    allowed: false,
    code,
    explanation,
    requiresHumanApproval: false,
    ...detail,
  });

  if (input.invalidContact) return blocked("invalid_contact", "The destination is missing or invalid.");
  if (input.legalHold) return blocked("legal_hold", "A legal hold blocks this communication.");
  if (input.bicHold) return blocked("bic_hold", "A broker-in-charge review hold blocks this communication.");

  const internal = INTERNAL_PURPOSES.has(input.purpose);
  if (!internal && input.isTest) {
    return blocked("test_record_consumer_block", "Test records never receive consumer communication.");
  }
  if (!internal && input.suppressed) {
    return blocked("suppressed", "Suppressed records never receive consumer communication.");
  }
  if (input.purpose === "qa_test") {
    if (input.isTest !== true) {
      return blocked("qa_record_not_test", "QA delivery requires an explicitly test-marked record.");
    }
    if (input.suppressed !== true) {
      return blocked("qa_record_not_suppressed", "QA delivery requires a suppressed test record.");
    }
    if (!input.recipientIsApprovedQa) {
      return blocked("qa_recipient_not_approved", "QA delivery is restricted to the approved test recipient.");
    }
  }

  if (!internal && input.consentAmbiguous) {
    return blocked("ambiguous_consent", "Consent is ambiguous; automated communication fails closed.");
  }
  if (!internal && input.consentDenied) {
    return blocked("consent_denied", "The person denied permission for this communication purpose.");
  }
  if (input.channel === "email" && input.optedOutEmail) {
    return blocked("channel_opt_out", "Email opt-out is active.");
  }
  if (input.channel === "sms" && input.optedOutSms) {
    return blocked("channel_opt_out", "SMS opt-out is active.");
  }

  let purposeAllowed = false;
  if (input.purpose === "internal_alert") {
    purposeAllowed = input.channel === "email" ? input.internalEmail === true : input.channel === "push" && input.internalPush === true;
  } else if (input.purpose === "qa_test") {
    purposeAllowed = input.channel === "email" && input.recipientIsApprovedQa === true;
  } else if (input.purpose === "requested_service_response" || input.purpose === "transactional_acknowledgment") {
    purposeAllowed = input.channel === "email" ? input.requestedServiceEmail === true : input.channel === "sms" && input.requestedServiceSms === true;
  } else if (input.purpose === "appointment_coordination") {
    purposeAllowed = input.channel === "email"
      ? input.requestedServiceEmail === true
      : input.channel === "sms"
        ? input.requestedServiceSms === true
        : input.channel === "phone" && input.phoneCall === true;
  } else if (input.purpose === "property_alert_subscription") {
    purposeAllowed = input.propertyAlerts === true && (input.channel === "email" || (input.channel === "sms" && input.requestedServiceSms === true));
  } else if (input.purpose === "marketing_nurture") {
    purposeAllowed = input.channel === "email" ? input.emailMarketing === true : input.channel === "sms" && input.smsMarketing === true;
  } else if (input.purpose === "manual_one_to_one") {
    purposeAllowed = input.channel === "email"
      ? input.requestedServiceEmail === true
      : input.channel === "sms"
        ? input.requestedServiceSms === true
        : input.channel === "phone" && input.phoneCall === true;
  }

  if (!purposeAllowed) {
    return blocked("missing_permission", `No approved ${input.channel} permission exists for ${input.purpose.replaceAll("_", " ")}.`);
  }

  if (!internal && input.autoSendEnabled !== true && input.humanApproved !== true) {
    return {
      allowed: false,
      code: "auto_send_disabled",
      explanation: "Consumer auto-send is disabled; a human-approved preview is required.",
      requiresHumanApproval: true,
      ...detail,
    };
  }
  if (!internal && input.humanApproved !== true) {
    return {
      allowed: false,
      code: "human_approval_required",
      explanation: "This release requires human approval before consumer delivery.",
      requiresHumanApproval: true,
      ...detail,
    };
  }

  return {
    allowed: true,
    code: "allowed",
    explanation: "The requested purpose, channel, consent, suppression, and release gates are satisfied.",
    requiresHumanApproval: false,
    ...detail,
  };
}
