import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { GrowthLeadFact, GrowthOutcomeFact } from "../../app/lib/growth/intelligence";
import {
  buildGrowthOutcomeMetrics,
  normalizeGrowthDeliverySnapshot,
} from "../../app/lib/persistence/neonGrowthIntelligenceView";

describe("Growth KPI trust aggregates", () => {
  it("deduplicates exact appointment and signed-client outcomes inside the eligible lead cohort", () => {
    const leads: GrowthLeadFact[] = [
      { id: "lead-a", createdAt: "2026-08-20T10:00:00.000Z", status: "appointment_set" },
      { id: "lead-b", createdAt: "2026-08-20T11:00:00.000Z", status: "agreement_signed" },
    ];
    const outcomes: GrowthOutcomeFact[] = [
      { leadId: "lead-a", outcomeType: "appointment" },
      { leadId: "lead-a", outcomeType: "appointment" },
      { leadId: "lead-b", outcomeType: "agreement_signed" },
      { leadId: "outside-window", outcomeType: "agreement_signed" },
    ];

    expect(buildGrowthOutcomeMetrics(leads, outcomes, true)).toEqual({
      configured: true,
      appointmentSetLeads: 1,
      signedClientLeads: 1,
    });
  });

  it("normalizes aggregate-only delivery counts without consumer or recipient fields", () => {
    expect(normalizeGrowthDeliverySnapshot([{
      terminal_internal_notifications: "23",
      permanent_internal_failures: "2",
      eligible_email_sends: "21",
      email_bounces: "1",
      delivered_customer_messages: "20",
      customer_complaints: "1",
      recipient_reference: "must-not-be-returned",
    }], true)).toEqual({
      configured: true,
      terminalInternalNotifications: 23,
      permanentInternalFailures: 2,
      eligibleEmailSends: 21,
      emailBounces: 1,
      deliveredCustomerMessages: 20,
      customerComplaints: 1,
    });
  });

  it("renders failed outcome and delivery aggregates as unavailable instead of false zero", () => {
    expect(buildGrowthOutcomeMetrics([], [], true, "Outcome aggregate failed")).toEqual({
      configured: false,
      appointmentSetLeads: 0,
      signedClientLeads: 0,
      error: "Outcome aggregate failed",
    });
    expect(normalizeGrowthDeliverySnapshot([], true, "Delivery aggregate failed")).toEqual({
      configured: false,
      terminalInternalNotifications: 0,
      permanentInternalFailures: 0,
      eligibleEmailSends: 0,
      emailBounces: 0,
      deliveredCustomerMessages: 0,
      customerComplaints: 0,
      error: "Delivery aggregate failed",
    });
  });

  it("keeps the canonical SQL aggregate test-excluded, suppression-excluded, and PII-free", () => {
    const source = readFileSync(
      join(process.cwd(), "app/lib/persistence/neonGrowthIntelligenceView.ts"),
      "utf8",
    );
    expect(source).toContain("FROM public.lead_notifications n");
    expect(source).toContain("JOIN public.leads l ON l.id = n.lead_id");
    expect(source).toContain("l.is_test = false");
    expect(source).toContain("l.communication_suppressed = false");
    expect(source).toContain("n.recipient_type IN ('agent', 'internal')");
    expect(source).toContain("FROM public.communication_events ce");
    expect(source).toContain("JOIN eligible_notifications eligible");
    expect(source).toContain("COUNT(*) FILTER");
    expect(source).not.toContain("n.recipient_reference");
    expect(source).not.toContain("l.email");
    expect(source).not.toContain("l.phone");
  });
});
