import { describe, expect, it } from "vitest";
import { decideCommunicationPermission } from "@/lib/messaging/permission-engine";

describe("communication permission engine", () => {
  it("allows an internal alert only on an approved internal channel", () => {
    expect(decideCommunicationPermission({ channel: "email", purpose: "internal_alert", internalEmail: true }).allowed).toBe(true);
    expect(decideCommunicationPermission({ channel: "sms", purpose: "internal_alert" }).allowed).toBe(false);
  });

  it("restricts QA email to the approved test recipient", () => {
    expect(decideCommunicationPermission({ channel: "email", purpose: "qa_test", isTest: true, suppressed: true, recipientIsApprovedQa: true }).allowed).toBe(true);
    expect(decideCommunicationPermission({ channel: "email", purpose: "qa_test", isTest: true, suppressed: true, recipientIsApprovedQa: false }).code).toBe("qa_recipient_not_approved");
    expect(decideCommunicationPermission({ channel: "email", purpose: "qa_test", isTest: true, suppressed: false, recipientIsApprovedQa: true }).code).toBe("qa_record_not_suppressed");
  });

  it("never permits consumer messaging for test or suppressed records", () => {
    const base = { channel: "email" as const, purpose: "requested_service_response" as const, requestedServiceEmail: true, humanApproved: true, autoSendEnabled: true };
    expect(decideCommunicationPermission({ ...base, isTest: true }).code).toBe("test_record_consumer_block");
    expect(decideCommunicationPermission({ ...base, suppressed: true }).code).toBe("suppressed");
  });

  it("keeps requested service and marketing permissions separate", () => {
    const requested = decideCommunicationPermission({ channel: "email", purpose: "requested_service_response", requestedServiceEmail: true, humanApproved: true, autoSendEnabled: true });
    const marketing = decideCommunicationPermission({ channel: "email", purpose: "marketing_nurture", requestedServiceEmail: true, humanApproved: true, autoSendEnabled: true });
    expect(requested.allowed).toBe(true);
    expect(marketing.code).toBe("missing_permission");
  });

  it("fails closed on ambiguous consent, opt-out, legal hold, and BIC hold", () => {
    const base = { channel: "sms" as const, purpose: "requested_service_response" as const, requestedServiceSms: true, humanApproved: true, autoSendEnabled: true };
    expect(decideCommunicationPermission({ ...base, consentAmbiguous: true }).code).toBe("ambiguous_consent");
    expect(decideCommunicationPermission({ ...base, optedOutSms: true }).code).toBe("channel_opt_out");
    expect(decideCommunicationPermission({ ...base, legalHold: true }).code).toBe("legal_hold");
    expect(decideCommunicationPermission({ ...base, bicHold: true }).code).toBe("bic_hold");
  });

  it("requires release approval even when requested-service permission exists", () => {
    const decision = decideCommunicationPermission({ channel: "email", purpose: "requested_service_response", requestedServiceEmail: true });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.code).toBe("auto_send_disabled");
  });
});
