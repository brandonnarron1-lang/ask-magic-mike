import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../app/lib/leadConsent";
import { loadLeadPermissionContext } from "../../src/lib/messaging/neon-communication-repository";
import { evaluateLeadCommunicationPermission } from "../../src/lib/messaging/permission-service";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
const id = "11111111-1111-4111-8111-111111111111";
const principal = { userId: "synthetic-operator", role: "administrator" as const, agentId: null, name: "Synthetic operator", email: "operator@example.test" };
const at = "2026-10-30T17:00:00.000Z";
const row = { id, is_test: false, communication_suppressed: false, consent_email: true, consent_call: true, consent_sms: false, consent_timestamp: at, consent_language_version: LEAD_CONSENT_LANGUAGE_VERSION, consent_language_text: LEAD_CONSENT_LANGUAGE_TEXT, source: "synthetic", page_url: "/home-value", email_suppressed: false, sms_suppressed: false, email: "request@example.test", phone: "+12025550199", status: "assigned", conversion_stage: "assigned" };
beforeEach(() => { vi.stubEnv("DATABASE_URL", "postgresql://synthetic@127.0.0.1/synthetic"); query.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("retained canonical request evidence in the current permission reader", () => {
  it("does not discard the inquiry's immutable versioned email consent when no purpose row was manufactured", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.leads")) return [row];
      if (sql.includes("FROM public.communication_permissions")) return [];
      if (sql.includes("FROM public.consents")) return [{ id: "synthetic-consent", lead_id: id, consent_type: "email", granted: true, language_version: LEAD_CONSENT_LANGUAGE_VERSION, language_text: LEAD_CONSENT_LANGUAGE_TEXT, collected_at: at }];
      throw Error("unexpected query");
    });
    const context = await loadLeadPermissionContext(id, principal);
    expect(context.ok).toBe(true);
    if (!context.ok) throw Error("permission context unavailable");
    expect(context.lead.consentVersion).toBe(LEAD_CONSENT_LANGUAGE_VERSION);
    const decision = evaluateLeadCommunicationPermission(context.lead, context.permissions, { channel: "email", purpose: "manual_one_to_one", autoSendEnabled: false, humanApproved: false });
    expect(decision.code).toBe("auto_send_disabled");
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(query.mock.calls.every(([sql]) => !/\b(INSERT|UPDATE|DELETE|ALTER)\b/i.test(sql))).toBe(true);
  });
  it("keeps an existing explicit manual permission independent of unavailable optional consent evidence", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.leads")) return [row];
      if (sql.includes("FROM public.communication_permissions")) return [{ channel:"phone",purpose:"manual_one_to_one",state:"allowed",source:"explicit",consent_version:"recorded",evidence_at:at }];
      if (sql.includes("FROM public.consents")) throw Error("synthetic evidence read outage");
      throw Error("unexpected query");
    });
    const context=await loadLeadPermissionContext(id,principal);if(!context.ok)throw Error('context');
    expect(evaluateLeadCommunicationPermission(context.lead,context.permissions,{channel:'phone',purpose:'manual_one_to_one',humanApproved:true}).allowed).toBe(true);
    expect(evaluateLeadCommunicationPermission(context.lead,context.permissions,{channel:'email',purpose:'manual_one_to_one',humanApproved:true}).allowed).toBe(false);
    expect(context.contact.evidence.email.reason).toContain('could not be read');
  });
});
