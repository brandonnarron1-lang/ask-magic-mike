import { describe, expect, it } from "vitest";
import { evaluateLeadCommunicationPermission, type LeadPermissionFacts, type StoredPermission } from "@/lib/messaging/permission-service";

const lead: LeadPermissionFacts = {
  leadId: "11111111-1111-4111-8111-111111111111",
  isTest: false,
  suppressed: false,
  consentEmail: true,
  consentSms: false,
  consentCall: true,
  consentText: "Please contact me about this request.",
  consentVersion: "form3-v1",
  source: "OurTownProperties.com / Home Value",
  formOrRoute: "gravity_form_3",
  optedOutEmail: false,
  optedOutSms: false,
};

const permission = (overrides: Partial<StoredPermission> = {}): StoredPermission => ({
  channel: "email",
  purpose: "transactional_acknowledgment",
  state: "allowed",
  consentVersion: "form3-v1",
  source: "gravity_form_3",
  evidenceAt: "2026-08-16T12:00:00.000Z",
  ...overrides,
});

describe("Phase 7 communication permission service", () => {
  it("fails closed when purpose-specific permission is absent", () => {
    const result = evaluateLeadCommunicationPermission(lead, [], {
      channel: "email",
      purpose: "transactional_acknowledgment",
      autoSendEnabled: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("ambiguous_consent");
  });

  it("requires human approval even with a stored allowed permission", () => {
    const result = evaluateLeadCommunicationPermission(lead, [permission()], {
      channel: "email",
      purpose: "transactional_acknowledgment",
      autoSendEnabled: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("auto_send_disabled");
    expect(result.requiresHumanApproval).toBe(true);
  });

  it("enforces the QA test-and-suppressed invariant", () => {
    const notTest = evaluateLeadCommunicationPermission(lead, [], {
      channel: "email", purpose: "qa_test", recipientIsApprovedQa: true,
    });
    expect(notTest.code).toBe("qa_record_not_test");
    const notSuppressed = evaluateLeadCommunicationPermission({ ...lead, isTest: true }, [], {
      channel: "email", purpose: "qa_test", recipientIsApprovedQa: true,
    });
    expect(notSuppressed.code).toBe("qa_record_not_suppressed");
    const allowed = evaluateLeadCommunicationPermission({ ...lead, isTest: true, suppressed: true }, [], {
      channel: "email", purpose: "qa_test", recipientIsApprovedQa: true,
    });
    expect(allowed.allowed).toBe(true);
  });

  it("honors an explicit channel opt-out", () => {
    const result = evaluateLeadCommunicationPermission(lead, [permission({ state: "opted_out" })], {
      channel: "email", purpose: "transactional_acknowledgment", humanApproved: true, autoSendEnabled: true,
    });
    expect(result.code).toBe("channel_opt_out");
  });
});

