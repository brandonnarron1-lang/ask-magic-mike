import { describe, expect, it } from "vitest";
import { filterOperationalRowsForLiveLeads } from "../../app/lib/persistence/neonAdminReportingView";

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
});
