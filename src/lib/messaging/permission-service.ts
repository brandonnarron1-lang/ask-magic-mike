import { createHash } from "node:crypto";
import type { MessageChannel, MessagePurpose } from "./permission-engine";
import { decideCommunicationPermission, type CommunicationPermissionDecision } from "./permission-engine";

export type LeadPermissionFacts = {
  leadId: string;
  isTest: boolean;
  suppressed: boolean;
  consentEmail: boolean;
  consentSms: boolean;
  consentCall: boolean;
  consentText: string | null;
  consentVersion: string | null;
  source: string | null;
  formOrRoute: string | null;
  optedOutEmail: boolean;
  optedOutSms: boolean;
};

export type StoredPermission = {
  channel: MessageChannel;
  purpose: MessagePurpose;
  state: "allowed" | "denied" | "ambiguous" | "opted_out" | "held";
  consentVersion: string | null;
  source: string | null;
  evidenceAt: string | null;
};

export type PermissionEvaluationInput = {
  channel: MessageChannel;
  purpose: MessagePurpose;
  recipientIsApprovedQa?: boolean;
  humanApproved?: boolean;
  autoSendEnabled?: boolean;
  legalHold?: boolean;
  bicHold?: boolean;
};

function explicitState(permissions: StoredPermission[], channel: MessageChannel, purpose: MessagePurpose) {
  return permissions.find((row) => row.channel === channel && row.purpose === purpose);
}

export function evaluateLeadCommunicationPermission(
  lead: LeadPermissionFacts,
  permissions: StoredPermission[],
  input: PermissionEvaluationInput,
): CommunicationPermissionDecision {
  const explicit = explicitState(permissions, input.channel, input.purpose);
  const denied = explicit?.state === "denied";
  const ambiguous = explicit?.state === "ambiguous" || (!explicit && !["internal_alert", "qa_test"].includes(input.purpose));
  const optedOut = explicit?.state === "opted_out";
  const held = explicit?.state === "held";
  const allowed = explicit?.state === "allowed";

  return decideCommunicationPermission({
    channel: input.channel,
    purpose: input.purpose,
    isTest: lead.isTest,
    suppressed: lead.suppressed,
    legalHold: input.legalHold || held,
    bicHold: input.bicHold,
    consentAmbiguous: ambiguous,
    consentDenied: denied,
    requestedServiceEmail: input.channel === "email" && (allowed || lead.consentEmail),
    requestedServiceSms: input.channel === "sms" && (allowed || lead.consentSms),
    emailMarketing: input.channel === "email" && allowed,
    smsMarketing: input.channel === "sms" && allowed,
    propertyAlerts: allowed,
    phoneCall: input.channel === "phone" && (allowed || lead.consentCall),
    internalEmail: input.channel === "email",
    internalPush: input.channel === "push",
    optedOutEmail: input.channel === "email" && (lead.optedOutEmail || optedOut),
    optedOutSms: input.channel === "sms" && (lead.optedOutSms || optedOut),
    recipientIsApprovedQa: input.recipientIsApprovedQa,
    autoSendEnabled: input.autoSendEnabled,
    humanApproved: input.humanApproved,
    consentVersion: explicit?.consentVersion || lead.consentVersion,
    formOrRoute: lead.formOrRoute,
    decisionSource: explicit ? "stored_permission" : "lead_consent_fallback",
    evidence: {
      permission_state: explicit?.state || "not_recorded",
      permission_source: explicit?.source || lead.source || "unknown",
      permission_evidence_at: explicit?.evidenceAt || null,
      is_test: lead.isTest,
      communication_suppressed: lead.suppressed,
    },
  });
}

export function permissionDecisionIdempotencyKey(
  leadId: string,
  decision: CommunicationPermissionDecision,
  actor: string,
) {
  return createHash("sha256")
    .update(JSON.stringify({ leadId, actor, channel: decision.channel, purpose: decision.purpose, code: decision.code, evidence: decision.evidence }))
    .digest("hex");
}

