import { describe, expect, it } from "vitest";

import {
  buildGrowthBaselineReadiness,
  formatGrowthBaselineValue,
} from "../../app/lib/growth/baseline-target-readiness";
import {
  buildGrowthIntelligence,
  type GrowthLeadFact,
  type GrowthOutcomeFact,
  type GrowthSpendFact,
} from "../../app/lib/growth/intelligence";
import type {
  GrowthDeliverySnapshot,
  GrowthIntelligenceView,
  GrowthOutcomeMetricsSnapshot,
  GrowthWebVitalsSnapshot,
} from "../../app/lib/persistence/neonGrowthIntelligenceView";

const NOW = new Date("2026-08-28T19:45:52.419Z");

const EMPTY_DELIVERY: GrowthDeliverySnapshot = {
  configured: true,
  terminalInternalNotifications: 0,
  permanentInternalFailures: 0,
  eligibleEmailSends: 0,
  emailBounces: 0,
  deliveredCustomerMessages: 0,
  customerComplaints: 0,
};

const EMPTY_WEB_VITALS: GrowthWebVitalsSnapshot = {
  configured: true,
  lcp: { p75: null, sampleSize: 0, mobileP75: null, mobileSampleSize: 0, desktopP75: null, desktopSampleSize: 0 },
  inp: { p75: null, sampleSize: 0, mobileP75: null, mobileSampleSize: 0, desktopP75: null, desktopSampleSize: 0 },
  cls: { p75: null, sampleSize: 0, mobileP75: null, mobileSampleSize: 0, desktopP75: null, desktopSampleSize: 0 },
};

function growthView({
  leads = [],
  spend = [],
  outcomes = [],
  configured = true,
  schemaReady = true,
  outcomeMetrics = {
    configured: true,
    appointmentSetLeads: 0,
    signedClientLeads: 0,
  },
  delivery = EMPTY_DELIVERY,
  webVitals = EMPTY_WEB_VITALS,
}: {
  leads?: GrowthLeadFact[];
  spend?: GrowthSpendFact[];
  outcomes?: GrowthOutcomeFact[];
  configured?: boolean;
  schemaReady?: boolean;
  outcomeMetrics?: GrowthOutcomeMetricsSnapshot;
  delivery?: GrowthDeliverySnapshot;
  webVitals?: GrowthWebVitalsSnapshot;
} = {}): GrowthIntelligenceView {
  const intelligence = buildGrowthIntelligence({ leads, spend, outcomes, now: NOW });
  return {
    ...intelligence,
    configured,
    schemaReady,
    windowDays: 90,
    generatedAt: NOW.toISOString(),
    experiments: [],
    persistedOpportunities: [],
    recommendations: [],
    ownedDemandSignals: [],
    outcomeMetrics,
    delivery,
    webVitals,
    sourceRowsRead: leads.length,
    spendRowsRead: spend.length,
    outcomeRowsRead: outcomes.length,
    webVitalRowsRead: webVitals.lcp.sampleSize + webVitals.inp.sampleSize + webVitals.cls.sampleSize,
  };
}

function measuredLeads(): GrowthLeadFact[] {
  return Array.from({ length: 20 }, (_, index) => {
    const status = index < 3
      ? "closed"
      : index < 5
        ? "agreement_signed"
        : index < 8
          ? "appointment_requested"
          : index < 12
            ? "qualified"
            : "new";
    return {
      id: `live-${index + 1}`,
      createdAt: "2026-08-20T12:00:00.000Z",
      status,
      source: "askmagicmike",
      medium: "owned_web",
      campaign: "three_offer_flight",
      score: index < 12 ? 80 : 45,
      firstHumanResponseAt: "2026-08-20T12:05:00.000Z",
      lastContactedAt: "2026-08-20T12:05:00.000Z",
    };
  });
}

function metric(register: ReturnType<typeof buildGrowthBaselineReadiness>, key: string) {
  const found = register.metrics.find((item) => item.key === key);
  if (!found) throw new Error(`Missing metric ${key}`);
  return found;
}

describe("Growth baseline and target readiness", () => {
  it("locks business targets when Production has no eligible live demand", () => {
    const register = buildGrowthBaselineReadiness(growthView());

    expect(register).toMatchObject({
      gate: "activation_required",
      gateLabel: "Activation evidence required",
      targetEntryEnabled: false,
      ownerReviewReadyCount: 0,
      priorityHref: "/admin/distribution",
    });
    expect(register.priorityAction).toContain("genuine eligible lead");
    expect(metric(register, "eligible_live_lead_volume")).toMatchObject({
      state: "insufficient_sample",
      value: null,
      sampleSize: 0,
      ownerReviewReady: false,
    });
    expect(metric(register, "qualification_rate").reason).toContain("QA records cannot establish");
    expect(JSON.stringify(register)).not.toContain("targetValue");
  });

  it("keeps reconciled spend visible when it produces no eligible lead without unlocking targets", () => {
    const register = buildGrowthBaselineReadiness(growthView({
      spend: [{
        source: "google",
        medium: "cpc",
        campaign: "seller_search",
        spendUsd: 250,
      }],
    }));

    expect(register.gate).toBe("activation_required");
    expect(register.ownerReviewReadyCount).toBe(0);
    expect(metric(register, "tracked_spend")).toMatchObject({
      state: "measured",
      value: 250,
      sampleSize: 1,
      ownerReviewReady: false,
    });
    expect(metric(register, "cost_per_lead")).toMatchObject({
      state: "insufficient_sample",
      value: null,
    });
  });

  it("opens only evidence-backed metrics for owner review and records no target", () => {
    const leads = measuredLeads();
    const spend: GrowthSpendFact[] = [{
      source: "askmagicmike",
      medium: "owned_web",
      campaign: "three_offer_flight",
      spendUsd: 1_000,
    }];
    const outcomes: GrowthOutcomeFact[] = leads.slice(0, 3).map((lead) => ({
      leadId: lead.id,
      outcomeType: "closed",
      amountUsd: 5_000,
      occurredAt: "2026-08-26T12:00:00.000Z",
    }));
    const register = buildGrowthBaselineReadiness(growthView({
      leads,
      spend,
      outcomes,
      outcomeMetrics: {
        configured: true,
        appointmentSetLeads: 8,
        signedClientLeads: 5,
      },
      delivery: {
        configured: true,
        terminalInternalNotifications: 25,
        permanentInternalFailures: 1,
        eligibleEmailSends: 30,
        emailBounces: 1,
        deliveredCustomerMessages: 40,
        customerComplaints: 1,
      },
      webVitals: {
        configured: true,
        lcp: { ...EMPTY_WEB_VITALS.lcp, p75: 2_100, sampleSize: 80 },
        inp: { ...EMPTY_WEB_VITALS.inp, p75: 175, sampleSize: 55 },
        cls: { ...EMPTY_WEB_VITALS.cls, p75: 0.08, sampleSize: 80 },
      },
    }));

    expect(register.gate).toBe("owner_review_possible");
    expect(register.ownerReviewReadyCount).toBeGreaterThan(0);
    expect(register.targetEntryEnabled).toBe(false);
    expect(metric(register, "useful_source_attribution_rate")).toMatchObject({ state: "measured", value: 100, ownerReviewReady: true });
    expect(metric(register, "appointment_set_rate")).toMatchObject({ state: "measured", value: 40, ownerReviewReady: true });
    expect(metric(register, "cost_per_lead")).toMatchObject({ state: "measured", value: 50, ownerReviewReady: true });
    expect(metric(register, "p75_largest_contentful_paint_ms")).toMatchObject({ state: "measured", value: 2100, ownerReviewReady: true });
    expect(metric(register, "tracked_spend")).toMatchObject({ state: "measured", value: 1000, ownerReviewReady: false });
    expect(JSON.stringify(register)).not.toContain("approvalReference");
  });

  it("shows directional evidence without making it target-ready", () => {
    const register = buildGrowthBaselineReadiness(growthView({
      leads: measuredLeads().slice(0, 5),
    }));

    expect(metric(register, "useful_source_attribution_rate")).toMatchObject({
      state: "directional",
      value: 100,
      sampleSize: 5,
      ownerReviewReady: false,
    });
  });

  it("withholds dollar totals until close-revenue and referral-fee coverage is complete", () => {
    const leads: GrowthLeadFact[] = Array.from({ length: 3 }, (_, index) => ({
      id: `portal-close-${index + 1}`,
      createdAt: "2026-08-20T12:00:00.000Z",
      status: "closed",
      source: "zillow",
      medium: "referral",
      campaign: "portal",
    }));
    const partialOutcomes: GrowthOutcomeFact[] = [
      {
        leadId: leads[0].id,
        outcomeType: "closed",
        amountUsd: 5_000,
        occurredAt: "2026-08-26T12:00:00.000Z",
      },
      {
        leadId: leads[0].id,
        outcomeType: "referral_paid",
        amountUsd: 500,
        occurredAt: "2026-08-26T12:01:00.000Z",
      },
    ];
    const spend: GrowthSpendFact[] = [{
      source: "zillow",
      medium: "referral",
      campaign: "portal",
      spendUsd: 600,
    }];
    const partial = buildGrowthBaselineReadiness(growthView({
      leads,
      spend,
      outcomes: partialOutcomes,
    }));

    expect(metric(partial, "attributed_revenue")).toMatchObject({
      state: "insufficient_sample",
      value: null,
      sampleSize: 1,
    });
    expect(metric(partial, "recorded_referral_fees")).toMatchObject({
      state: "insufficient_sample",
      value: null,
      sampleSize: 1,
    });
    expect(metric(partial, "recorded_referral_fees").reason).toContain("absent row is unknown");

    const completeOutcomes: GrowthOutcomeFact[] = leads.flatMap((lead, index) => ([
      {
        leadId: lead.id,
        outcomeType: "closed",
        amountUsd: 5_000,
        occurredAt: "2026-08-26T12:00:00.000Z",
      },
      {
        leadId: lead.id,
        outcomeType: "referral_paid",
        amountUsd: index === 0 ? 500 : 0,
        occurredAt: "2026-08-26T12:01:00.000Z",
      },
    ]));
    const complete = buildGrowthBaselineReadiness(growthView({
      leads,
      spend,
      outcomes: completeOutcomes,
    }));

    expect(metric(complete, "attributed_revenue")).toMatchObject({
      state: "measured",
      value: 15_000,
      sampleSize: 3,
    });
    expect(metric(complete, "recorded_referral_fees")).toMatchObject({
      state: "measured",
      value: 500,
      sampleSize: 3,
      ownerReviewReady: false,
    });
  });

  it("withholds blended cost baselines while any paid lead channel lacks spend", () => {
    const leads: GrowthLeadFact[] = Array.from({ length: 10 }, (_, index) => ({
      id: `paid-${index + 1}`,
      createdAt: "2026-08-20T12:00:00.000Z",
      status: "qualified",
      source: index < 5 ? "google" : "facebook",
      medium: index < 5 ? "cpc" : "paid_social",
      campaign: "seller_demand",
      isPaid: true,
    }));
    const partial = buildGrowthBaselineReadiness(growthView({
      leads,
      spend: [{
        source: "google",
        medium: "cpc",
        campaign: "seller_demand",
        spendUsd: 100,
      }],
    }));

    expect(metric(partial, "tracked_spend")).toMatchObject({ state: "measured", value: 100 });
    expect(metric(partial, "cost_per_lead")).toMatchObject({
      state: "insufficient_sample",
      value: null,
    });
    expect(metric(partial, "cost_per_lead").reason).toContain("complete paid-channel spend coverage");

    const complete = buildGrowthBaselineReadiness(growthView({
      leads,
      spend: [
        { source: "google", medium: "cpc", campaign: "seller_demand", spendUsd: 100 },
        { source: "facebook", medium: "paid_social", campaign: "seller_demand", spendUsd: 100 },
      ],
    }));
    expect(metric(complete, "cost_per_lead")).toMatchObject({
      state: "measured",
      value: 20,
      sampleSize: 10,
    });
  });

  it("separates missing subsystem evidence from a real measured zero", () => {
    const register = buildGrowthBaselineReadiness(growthView({
      leads: measuredLeads(),
      delivery: { ...EMPTY_DELIVERY, configured: false, error: "Delivery aggregate unavailable" },
      webVitals: { ...EMPTY_WEB_VITALS, configured: false, error: "Field evidence unavailable" },
    }));

    expect(metric(register, "notification_failure_rate")).toMatchObject({ state: "unavailable", value: null });
    expect(metric(register, "email_bounce_rate")).toMatchObject({ state: "unavailable", value: null });
    expect(metric(register, "p75_largest_contentful_paint_ms")).toMatchObject({ state: "unavailable", value: null });
  });

  it("keeps named instrumentation gaps explicit and non-actionable", () => {
    const register = buildGrowthBaselineReadiness(growthView({ leads: measuredLeads() }));

    expect(metric(register, "contactable_rate")).toMatchObject({
      state: "not_instrumented",
      value: null,
      ownerReviewReady: false,
    });
    expect(metric(register, "contactable_rate").reason).toContain("Raw contact details must not be added");
    expect(metric(register, "durable_funnel_completion_rate").state).toBe("not_instrumented");
    expect(metric(register, "agent_first_follow_up_rate")).toMatchObject({
      state: "not_instrumented",
      value: null,
      ownerReviewReady: false,
    });
    expect(metric(register, "agent_first_follow_up_rate").reason).toContain("assigned-lead denominator");
  });

  it("publishes one unique snapshot for every reviewed evidence contract", () => {
    const register = buildGrowthBaselineReadiness(growthView());
    const keys = register.metrics.map((item) => item.key);

    expect(keys).toHaveLength(42);
    expect(new Set(keys).size).toBe(42);
  });

  it("formats unavailable and measured values without fabricating units", () => {
    expect(formatGrowthBaselineValue(null, "percentage")).toBe("Not measured");
    expect(formatGrowthBaselineValue(12.5, "percentage")).toBe("12.5%");
    expect(formatGrowthBaselineValue(4.2, "minutes")).toBe("4.2 min");
    expect(formatGrowthBaselineValue(2_104.6, "milliseconds")).toBe("2105 ms");
    expect(formatGrowthBaselineValue(0.0812, "score")).toBe("0.0812");
  });
});
