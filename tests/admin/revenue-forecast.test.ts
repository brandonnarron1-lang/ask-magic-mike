import { describe, expect, it } from "vitest";
import { buildRevenueForecast, type LeadPipelineRow } from "@/lib/admin/revenue-forecast";

function lead(overrides: Partial<LeadPipelineRow> = {}): LeadPipelineRow {
  return {
    id:          `lead-${Math.random().toString(36).slice(2)}`,
    grade:       "B",
    temperature: "warm",
    leadType:    "seller",
    status:      "new",
    utmSource:   "facebook",
    assignedAgentId: "agent-1",
    ...overrides,
  };
}

describe("buildRevenueForecast", () => {
  it("returns zero forecast for empty pipeline", () => {
    const r = buildRevenueForecast([]);
    expect(r.totalLeadsInPipeline).toBe(0);
    expect(r.activeLeads).toBe(0);
    expect(r.pipelineValue).toBe(0);
    expect(r.expectedCommission30d).toBe(0);
    expect(r.expectedCommission90d).toBe(0);
  });

  it("excludes closed_won and closed_lost from active pipeline", () => {
    const leads = [
      lead({ status: "closed_won" }),
      lead({ status: "closed_lost" }),
      lead({ status: "new" }),
    ];
    const r = buildRevenueForecast(leads);
    expect(r.totalLeadsInPipeline).toBe(3);
    expect(r.activeLeads).toBe(1);
  });

  it("A+ grade has higher closing probability than D grade", () => {
    const highGrade = [lead({ grade: "A+", temperature: "urgent" })];
    const lowGrade  = [lead({ grade: "D",  temperature: "low"    })];
    const rHigh = buildRevenueForecast(highGrade);
    const rLow  = buildRevenueForecast(lowGrade);
    expect(rHigh.projectedClosings30d).toBeGreaterThan(rLow.projectedClosings30d);
    expect(rHigh.expectedCommission30d).toBeGreaterThan(rLow.expectedCommission30d);
  });

  it("uses provided home value in commission calculation", () => {
    const r = buildRevenueForecast([lead({ grade: "A+", estimatedHomeValue: 400_000 })]);
    // pipelineValue = homeVal × closeProbability (not commission-adjusted)
    // A+ close prob = 0.25, so pipelineValue ≈ 100_000
    expect(r.pipelineValue).toBeGreaterThan(0);
    // expectedCommission90d = homeVal × 0.03 × 0.5 × prob ≈ 400_000 × 0.015 × 0.25 ≈ 1500
    expect(r.expectedCommission90d).toBeGreaterThan(0);
    expect(r.expectedCommission90d).toBeLessThan(400_000 * 0.015); // never exceeds full commission
  });

  it("byGrade includes all 5 grades", () => {
    const r = buildRevenueForecast([lead({ grade: "A" })]);
    expect(Object.keys(r.byGrade)).toContain("A+");
    expect(Object.keys(r.byGrade)).toContain("A");
    expect(Object.keys(r.byGrade)).toContain("B");
    expect(Object.keys(r.byGrade)).toContain("C");
    expect(Object.keys(r.byGrade)).toContain("D");
  });

  it("bySource returns top sources sorted by commission", () => {
    const leads = [
      lead({ utmSource: "facebook", grade: "A+" }),
      lead({ utmSource: "facebook", grade: "A+" }),
      lead({ utmSource: "email",    grade: "D"  }),
    ];
    const r = buildRevenueForecast(leads);
    expect(r.bySource[0].source).toBe("facebook");
    expect(r.bySource[0].leadCount).toBe(2);
  });

  it("byAgent groups by assignedAgentId", () => {
    const leads = [
      lead({ assignedAgentId: "mike", grade: "A+" }),
      lead({ assignedAgentId: "mike", grade: "B"  }),
      lead({ assignedAgentId: "other", grade: "D" }),
    ];
    const r = buildRevenueForecast(leads);
    const mike = r.byAgent.find(a => a.agentId === "mike");
    expect(mike).toBeDefined();
    expect(mike!.leadCount).toBe(2);
  });

  it("90-day commission >= 30-day commission", () => {
    const leads = Array.from({ length: 5 }, () => lead({ grade: "B" }));
    const r = buildRevenueForecast(leads);
    expect(r.expectedCommission90d).toBeGreaterThanOrEqual(r.expectedCommission30d);
  });

  it("formatted labels use $ and K", () => {
    const r = buildRevenueForecast([lead({ grade: "A+", estimatedHomeValue: 250_000 })]);
    expect(r.pipelineValueLabel).toMatch(/^\$/);
    expect(r.commission30dLabel).toMatch(/^\$/);
    expect(r.commission90dLabel).toMatch(/^\$/);
  });

  it("low data volume triggers confidence note", () => {
    const r = buildRevenueForecast([lead()]);
    expect(r.confidenceNote.toLowerCase()).toContain("low data");
  });
});
