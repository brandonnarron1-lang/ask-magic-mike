import { normalizeAdminLeadRow } from "./persistence/supabase/adminLeadView";
import { presentLead, type DisclosureTier, type LeadSubtype, type OfferState } from "./leadPresentation";
import type { LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

const AGENT = "00000000-0000-4000-8000-000000000001";
export function leadCardFixture(input: { subtype: LeadSubtype; tier: DisclosureTier; state: OfferState; score: number; isTest: boolean }) {
  const lead = normalizeAdminLeadRow({ id: "00000000-0000-4000-8000-000000000002", is_test: input.isTest,
    first_name: "INTERNAL QA", last_name: "DO NOT CONTACT", communication_suppressed: true, status: "new",
    funnel_type: input.subtype, city: "Wilson", score: input.score, timeline: "Stated: 30–60 days",
    assigned_agent_id: input.tier === "pre_claim" ? null : AGENT, email: "synthetic@example.test", phone: null,
    question_raw: "INTERNAL QA — DO NOT CONTACT. Please review the appropriate evidence before any reply.",
    source: "synthetic_review", source_detail: "No-send reference fixture",
    score_factors: [{ explanation: "Synthetic qualification example; not a production score." }] });
  const principal: LeadCenterPrincipal = { userId: "synthetic-review", agentId: AGENT, role: input.tier === "supervisor" || input.tier === "audit" ? "administrator" : "approved_agent", email: "synthetic@example.test", name: "Internal QA" };
  return presentLead({ lead, principal, tier: input.tier, subtype: input.subtype, offer: {
    id: "00000000-0000-4000-8000-000000000003", agentId: AGENT, reference: "QA-REVIEW-ONLY", version: 1,
    deadline: "2026-10-04T18:43:00.000Z", state: input.state,
  } });
}
