import { describe, expect, it } from "vitest";

import {
  buildKpiBaselineSnapshot,
  validateKpiTarget,
  type KpiMetricKey,
} from "../../app/lib/growth/kpi-targets";
import { buildGrowthIntelligence, type GrowthLeadFact } from "../../app/lib/growth/intelligence";
import {
  loadGrowthKpiTargetRegister,
  recordGrowthKpiTarget,
  type GrowthKpiTargetQuery,
} from "../../app/lib/persistence/neonGrowthKpiTargets";
import type { GrowthIntelligenceView } from "../../app/lib/persistence/neonGrowthIntelligenceView";

const NOW = new Date("2026-08-21T21:30:00.000Z");

function growthView(leads: GrowthLeadFact[] = []): GrowthIntelligenceView {
  const intelligence = buildGrowthIntelligence({ leads, now: NOW });
  return {
    ...intelligence,
    configured: true,
    schemaReady: true,
    windowDays: 30,
    generatedAt: NOW.toISOString(),
    experiments: [],
    persistedOpportunities: [],
    recommendations: [],
    ownedDemandSignals: [],
    sourceRowsRead: leads.length,
    spendRowsRead: 0,
    outcomeRowsRead: 0,
  };
}

function measuredLeads(count = 20): GrowthLeadFact[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `lead-${index}`,
    createdAt: new Date(NOW.getTime() - (index + 1) * 60 * 60 * 1000).toISOString(),
    status: index < 10 ? "qualified" : "contacted",
    source: "facebook",
    medium: "social_organic",
    campaign: "amm_owned_demand_2026",
    firstHumanResponseAt: new Date(NOW.getTime() - (index + 1) * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    firstResponseOwnerKey: "agent:mike",
    firstResponseOwnerLabel: "Mike",
    firstResponseOwnerBasis: "responder_agent",
    isPaid: false,
  }));
}

function validInput(metricKey: KpiMetricKey = "useful_source_attribution_rate") {
  return {
    metricKey,
    status: "approved",
    targetValue: "95",
    rationale: "Use an evidence-backed portfolio target and review it after each complete operating window.",
    approvalReference: "Owner KPI review 2026-08-21",
    windowDays: 30,
    actor: "lead_center:user-123",
    isTest: false,
  };
}

class QueryStub implements GrowthKpiTargetQuery {
  calls: Array<{ text: string; params?: unknown[] }> = [];

  constructor(private readonly responses: unknown[]) {}

  async query(text: string, params?: unknown[]) {
    this.calls.push({ text, params });
    return this.responses.shift() ?? [];
  }
}

describe("Growth KPI baseline quality contract", () => {
  it("does not treat an empty rate as a measured zero", () => {
    const baseline = buildKpiBaselineSnapshot("useful_source_attribution_rate", growthView());
    expect(baseline.value).toBeNull();
    expect(baseline.sampleSize).toBe(0);
    expect(baseline.state).toBe("insufficient_sample");
    expect(baseline.reason).toContain("20 are required");
  });

  it("permits a truthful zero inventory count when the canonical query succeeded", () => {
    const baseline = buildKpiBaselineSnapshot("stale_lead_inventory", growthView());
    expect(baseline).toMatchObject({ value: 0, sampleSize: 0, state: "measured" });
  });

  it("marks exact outcomes that are not yet aggregated as not instrumented", () => {
    const baseline = buildKpiBaselineSnapshot("appointment_set_rate", growthView(measuredLeads()));
    expect(baseline.value).toBeNull();
    expect(baseline.state).toBe("not_instrumented");
    expect(baseline.reason).toContain("exact appointment-set denominator");
  });

  it("promotes a rate only after the documented operational sample threshold", () => {
    const directional = buildKpiBaselineSnapshot("qualification_rate", growthView(measuredLeads(5)));
    const measured = buildKpiBaselineSnapshot("qualification_rate", growthView(measuredLeads(20)));
    expect(directional.state).toBe("directional");
    expect(measured).toMatchObject({ state: "measured", value: 50, sampleSize: 20 });
  });

  it("uses a stable evidence hash that excludes the observation timestamp", () => {
    const first = buildKpiBaselineSnapshot("qualification_rate", growthView(measuredLeads()));
    const secondView = { ...growthView(measuredLeads()), generatedAt: "2026-08-21T22:30:00.000Z" };
    const second = buildKpiBaselineSnapshot("qualification_rate", secondView);
    expect(first.evidenceSha256).toBe(second.evidenceSha256);
    expect(first.observedAt).not.toBe(second.observedAt);
  });
});

describe("Growth KPI target validation", () => {
  it("rejects target approval until the canonical baseline is measured", () => {
    const baseline = buildKpiBaselineSnapshot("useful_source_attribution_rate", growthView());
    expect(validateKpiTarget(validInput(), baseline)).toEqual({
      ok: false,
      error: "measured_kpi_baseline_required",
    });
  });

  it("accepts an approved target only with a measured baseline and approval reference", () => {
    const baseline = buildKpiBaselineSnapshot("useful_source_attribution_rate", growthView(measuredLeads()));
    const result = validateKpiTarget(validInput(), baseline);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ status: "approved", targetValue: 95, isTest: false });
    expect(result.value.idempotencyKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("allows an unapproved draft while preventing false approval language", () => {
    const baseline = buildKpiBaselineSnapshot("appointment_set_rate", growthView(measuredLeads()));
    const draft = validateKpiTarget({
      ...validInput("appointment_set_rate"),
      status: "draft",
      targetValue: null,
      approvalReference: null,
    }, baseline);
    expect(draft.ok).toBe(true);
    expect(validateKpiTarget({
      ...validInput("appointment_set_rate"),
      status: "draft",
    }, baseline)).toEqual({ ok: false, error: "draft_kpi_target_cannot_claim_approval" });
  });

  it("does not store a numeric draft target before a measured baseline exists", () => {
    const baseline = buildKpiBaselineSnapshot("appointment_set_rate", growthView(measuredLeads()));
    expect(validateKpiTarget({
      ...validInput("appointment_set_rate"),
      status: "draft",
      approvalReference: null,
    }, baseline)).toEqual({ ok: false, error: "measured_kpi_baseline_required" });
  });

  it("rejects out-of-range targets, PII, secrets, and window mismatches", () => {
    const baseline = buildKpiBaselineSnapshot("useful_source_attribution_rate", growthView(measuredLeads()));
    expect(validateKpiTarget({ ...validInput(), targetValue: 101 }, baseline).ok).toBe(false);
    expect(validateKpiTarget({ ...validInput(), rationale: "Contact owner@example.com before setting this evidence-backed operating target." }, baseline).ok).toBe(false);
    expect(validateKpiTarget({ ...validInput(), rationale: "Use api_key=private before setting this evidence-backed operating target." }, baseline).ok).toBe(false);
    expect(validateKpiTarget({ ...validInput(), windowDays: 90 }, baseline)).toEqual({ ok: false, error: "invalid_kpi_window" });
  });
});

describe("Canonical Neon KPI target repository", () => {
  it("reports an unconfigured or migration-pending register without inventing rows", async () => {
    expect(await loadGrowthKpiTargetRegister({ query: null, now: NOW })).toMatchObject({ configured: false, schemaReady: false, versions: [] });
    const sql = new QueryStub([[{ ready: false }]]);
    expect(await loadGrowthKpiTargetRegister({ query: sql, now: NOW })).toMatchObject({ configured: true, schemaReady: false, versions: [] });
    expect(sql.calls).toHaveLength(1);
  });

  it("loads only bounded non-test versions and selects the latest metric version", async () => {
    const sql = new QueryStub([
      [{ ready: true }],
      [{
        id: "version-1",
        metric_key: "useful_source_attribution_rate",
        metric_unit: "percentage",
        direction: "higher_is_better",
        status: "approved",
        target_value: "95",
        baseline_value: "90",
        baseline_state: "measured",
        baseline_sample_size: 20,
        baseline_window_days: 30,
        baseline_evidence_sha256: "a".repeat(64),
        baseline_observed_at: NOW.toISOString(),
        rationale: "Evidence-backed operating target for canonical attribution coverage.",
        approval_reference: "Owner review",
        recorded_by: "lead_center:user-123",
        created_at: NOW.toISOString(),
      }],
    ]);
    const register = await loadGrowthKpiTargetRegister({ query: sql, now: NOW });
    expect(register.schemaReady).toBe(true);
    expect(register.latestByMetric.useful_source_attribution_rate?.targetValue).toBe(95);
    expect(sql.calls[1].text).toContain("WHERE is_test = false");
    expect(sql.calls[1].text).toContain("LIMIT 500");
  });

  it("fails closed in Preview before any database or baseline query", async () => {
    const sql = new QueryStub([]);
    const result = await recordGrowthKpiTarget(validInput(), {
      query: sql,
      growth: growthView(measuredLeads()),
      env: { VERCEL_ENV: "preview", PREVIEW_DATA_MODE: "disabled" },
    });
    expect(result).toEqual({ ok: false, statusCode: 503, error: "preview_data_disabled" });
    expect(sql.calls).toHaveLength(0);
  });

  it("records only the server-derived baseline and returns an idempotent result", async () => {
    const sql = new QueryStub([
      [{ ready: true }],
      [{ result: { ok: true, version_id: "version-1", audit_id: "audit-1", idempotent_replay: false } }],
    ]);
    const result = await recordGrowthKpiTarget(validInput(), {
      query: sql,
      growth: growthView(measuredLeads()),
      env: {},
    });
    expect(result).toEqual({ ok: true, versionId: "version-1", auditId: "audit-1", idempotentReplay: false });
    expect(sql.calls[1].text).toContain("record_growth_kpi_target_version_v1");
    expect(sql.calls[1].params).toContain("measured");
    expect(sql.calls[1].params).toContain(20);
    expect(sql.calls[1].params).toContain("Owner KPI review 2026-08-21");
    expect(sql.calls[1].params?.some((value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value))).toBe(true);
  });
});
