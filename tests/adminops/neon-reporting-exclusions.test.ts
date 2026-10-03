import { describe, expect, it } from "vitest";
import {
  filterOperationalRowsForLiveLeads,
  normalizeOperationalTrustRow,
} from "../../app/lib/persistence/neonAdminReportingView";

describe("canonical Neon reporting exclusions", () => {
  it("keeps appointments and follow-up rows scoped to live lead ids", () => {
    const rows = [
      { id: "live-row", lead_id: "live-lead" },
      { id: "qa-row", lead_id: "qa-lead" },
      { id: "orphan-row", lead_id: null },
    ];

    expect(filterOperationalRowsForLiveLeads(rows, new Set(["live-lead"]))).toEqual([
      { id: "live-row", lead_id: "live-lead" },
    ]);
  });

  it("keeps unavailable distinct from zero and reports explicit n/N evidence", () => {
    expect(normalizeOperationalTrustRow(undefined).responseSla).toMatchObject({
      available: false,
      rate: null,
    });

    const evidence = normalizeOperationalTrustRow({
      canonical_leads: "8",
      response_measured: "6",
      response_within_target: "3",
      assignments_measured: "5",
      assignments_accepted: "4",
      assignments_pending: "1",
      notification_intents: "10",
      notifications_provider_accepted: "8",
      notifications_delivered: "6",
      notifications_failed: "1",
      duplicate_aliases: "2",
      ai_requests: "5",
      ai_provider_responses: "3",
      ai_fallbacks: "1",
      ai_blocked: "1",
      ai_estimated_cost_usd: "0.012345",
    });

    expect(evidence.responseSla).toEqual({
      available: true,
      measured: 6,
      withinTarget: 3,
      targetMinutes: 5,
      unknown: 2,
      rate: 50,
    });
    expect(evidence.assignmentAcceptance.rate).toBe(80);
    expect(evidence.notifications).toMatchObject({
      providerAcceptanceRate: 80,
      deliveryRate: 60,
      deliveryUnknown: 3,
    });
    expect(evidence.duplicates).toMatchObject({
      canonicalLeads: 8,
      excludedAliases: 2,
      submissionRecords: 10,
      rate: 20,
    });
    expect(evidence.aiUsage).toMatchObject({
      fallbackRate: 20,
      estimatedCostUsd: 0.012345,
    });
  });
});
