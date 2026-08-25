import { describe, expect, it } from "vitest";
import {
  assignExperimentVariant,
  buildGrowthIntelligence,
  evaluateExperiment,
  growthChannelKey,
  normalizeVendorSource,
} from "../../app/lib/growth/intelligence";
import {
  fingerprintVendorPayload,
  normalizeVendorLead,
} from "../../app/lib/growth/vendor-ingress";

const NOW = new Date("2026-08-18T16:00:00.000Z");

describe("Phase 9 growth intelligence", () => {
  it("normalizes major vendor aliases into stable source keys", () => {
    expect(normalizeVendorSource("Realtor.com")).toBe("realtor_com");
    expect(normalizeVendorSource("Facebook")).toBe("meta");
    expect(normalizeVendorSource("FUB")).toBe("follow_up_boss");
    expect(normalizeVendorSource("kvCORE")).toBe("boldtrail");
    expect(growthChannelKey({ source: "Google Ads", medium: "CPC", campaign: "Wilson Sellers" }))
      .toBe("google|cpc|wilson_sellers");
  });

  it("calculates channel economics from live leads, spend, and closed outcomes", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        {
          id: "lead-1",
          createdAt: "2026-08-17T12:00:00.000Z",
          status: "qualified",
          source: "google",
          medium: "cpc",
          campaign: "wilson_sellers",
          score: 82,
          lastContactedAt: "2026-08-17T12:04:00.000Z",
          firstHumanResponseAt: "2026-08-17T12:04:00.000Z",
        },
        {
          id: "lead-2",
          createdAt: "2026-08-16T12:00:00.000Z",
          status: "closed",
          source: "google",
          medium: "cpc",
          campaign: "wilson_sellers",
          lastContactedAt: "2026-08-16T12:03:00.000Z",
          firstHumanResponseAt: "2026-08-16T12:03:00.000Z",
        },
        {
          id: "lead-3",
          createdAt: "2026-08-15T12:00:00.000Z",
          status: "new",
          source: "facebook",
          medium: "paid_social",
          campaign: "home_value",
          lastContactedAt: null,
        },
      ],
      spend: [
        {
          source: "google",
          medium: "cpc",
          campaign: "wilson_sellers",
          spendUsd: 400,
          impressions: 10_000,
          clicks: 200,
          platformLeads: 2,
        },
      ],
      outcomes: [
        {
          leadId: "lead-2",
          outcomeType: "closed",
          amountUsd: 8_000,
          occurredAt: "2026-08-18T12:00:00.000Z",
        },
      ],
    });

    expect(result.summary).toMatchObject({
      leads: 3,
      qualified: 2,
      appointments: 1,
      agreements: 1,
      closes: 1,
      spendUsd: 400,
      attributedRevenueUsd: 8000,
      referralFeesUsd: 0,
      trackedContributionUsd: null,
      trackedContributionRate: null,
      closedRevenueRecordCount: 1,
      closedRevenueCoverageRate: 100,
      referralFeeRecordCount: 0,
      referralFeeExpectedCloseCount: 0,
      referralFeeCoverageRate: null,
      blendedCostPerQualifiedLead: 200,
      blendedCostPerSignedClient: 400,
      returnOnAdSpend: null,
      speedToLeadRisks: 1,
      firstResponseSampleSize: 2,
      firstResponseCoverageRate: 66.7,
      medianFirstResponseMinutes: 3.5,
      p75FirstResponseMinutes: 3.8,
      p90FirstResponseMinutes: 3.9,
    });
    const google = result.channels.find((channel) => channel.source === "google");
    expect(google).toMatchObject({
      leads: 2,
      qualified: 2,
      appointments: 1,
      agreements: 1,
      closes: 1,
      costPerLead: 200,
      costPerQualifiedLead: 200,
      costPerAppointment: 400,
      costPerSignedClient: 400,
      costPerClose: 400,
      attributedRevenueUsd: 8000,
      referralFeesUsd: 0,
      trackedContributionUsd: 7600,
      trackedContributionRate: 95,
      closedRevenueRecordCount: 1,
      closedRevenueCoverageRate: 100,
      referralFeeRecordCount: 0,
      referralFeeExpectedCloseCount: 0,
      referralFeeCoverageRate: null,
      returnOnAdSpend: 20,
      medianFirstResponseMinutes: 3.5,
      p75FirstResponseMinutes: 3.8,
      p90FirstResponseMinutes: 3.9,
    });
    const meta = result.channels.find((channel) => channel.source === "meta");
    expect(meta?.flags).toContain("spend_missing");
    expect(result.summary.trackedContributionUsd).toBeNull();
    expect(result.summary.returnOnAdSpend).toBeNull();
    expect(result.opportunities.map((row) => row.key)).toContain("complete_paid_channel_economics");
    expect(result.opportunities.map((row) => row.key)).toContain("first_response_measurement");
  });

  it("treats referral-paid outcomes as cost, keeps the latest typed outcome, and computes signed-client economics", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        {
          id: "portal-1",
          createdAt: "2026-08-10T12:00:00.000Z",
          status: "closed",
          source: "zillow",
          medium: "referral",
          campaign: "wilson_buyers",
        },
        {
          id: "portal-2",
          createdAt: "2026-08-11T12:00:00.000Z",
          status: "closed",
          source: "zillow",
          medium: "referral",
          campaign: "wilson_buyers",
        },
      ],
      spend: [{
        source: "zillow",
        medium: "referral",
        campaign: "wilson_buyers",
        spendUsd: 1000,
      }],
      outcomes: [
        {
          leadId: "portal-1",
          outcomeType: "closed",
          amountUsd: 7000,
          occurredAt: "2026-08-15T12:00:00.000Z",
        },
        {
          leadId: "portal-1",
          outcomeType: "closed",
          amountUsd: 9000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "portal-1",
          outcomeType: "referral_paid",
          amountUsd: 2000,
          occurredAt: "2026-08-15T12:00:00.000Z",
        },
        {
          leadId: "portal-1",
          outcomeType: "referral_paid",
          amountUsd: 2500,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "portal-2",
          outcomeType: "closed",
          amountUsd: 6000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "portal-2",
          outcomeType: "referral_paid",
          amountUsd: 1500,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
      ],
    });

    expect(result.summary).toMatchObject({
      agreements: 2,
      closes: 2,
      attributedRevenueUsd: 15000,
      referralFeesUsd: 4000,
      trackedContributionUsd: 10000,
      trackedContributionRate: 66.7,
      closedRevenueRecordCount: 2,
      closedRevenueCoverageRate: 100,
      referralFeeRecordCount: 2,
      referralFeeExpectedCloseCount: 2,
      referralFeeCoverageRate: 100,
      blendedCostPerSignedClient: 500,
      returnOnAdSpend: 15,
    });
    expect(result.channels[0]).toMatchObject({
      agreements: 2,
      closes: 2,
      attributedRevenueUsd: 15000,
      referralFeesUsd: 4000,
      trackedContributionUsd: 10000,
      trackedContributionRate: 66.7,
      closedRevenueRecordCount: 2,
      closedRevenueCoverageRate: 100,
      referralFeeRecordCount: 2,
      referralFeeExpectedCloseCount: 2,
      referralFeeCoverageRate: 100,
      costPerSignedClient: 500,
      returnOnAdSpend: 15,
    });
    expect(result.channels[0].flags).toContain("scale_candidate");
    expect(result.channels[0].flags).not.toContain("referral_fee_review_required");
  });

  it("withholds scale recommendations when portal referral-fee evidence is missing", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: ["one", "two"].map((id) => ({
        id,
        createdAt: "2026-08-10T12:00:00.000Z",
        status: "closed",
        source: "realtor.com",
        medium: "referral",
        campaign: "ready_connect",
      })),
      spend: [{
        source: "realtor.com",
        medium: "referral",
        campaign: "ready_connect",
        spendUsd: 1000,
      }],
      outcomes: ["one", "two"].map((leadId) => ({
        leadId,
        outcomeType: "closed",
        amountUsd: 8000,
        occurredAt: "2026-08-17T12:00:00.000Z",
      })),
    });

    expect(result.channels[0].flags).toContain("referral_fee_review_required");
    expect(result.channels[0].flags).not.toContain("scale_candidate");
    expect(result.channels[0].trackedContributionUsd).toBeNull();
    expect(result.channels[0].returnOnAdSpend).toBeNull();
    expect(result.opportunities.map((row) => row.key)).toContain("reconcile_referral_fee_evidence");
    expect(result.opportunities.some((row) => row.key.startsWith("scale_"))).toBe(false);
  });

  it("does not let an unrelated fee record satisfy a portal close review", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        {
          id: "portal",
          createdAt: "2026-08-10T12:00:00.000Z",
          status: "closed",
          source: "zillow",
          medium: "referral",
          campaign: "portal",
        },
        {
          id: "owned",
          createdAt: "2026-08-10T12:00:00.000Z",
          status: "closed",
          source: "newsletter",
          medium: "email",
          campaign: "sphere",
        },
      ],
      spend: [{
        source: "zillow",
        medium: "referral",
        campaign: "portal",
        spendUsd: 100,
      }],
      outcomes: [
        {
          leadId: "portal",
          outcomeType: "closed",
          amountUsd: 8000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "owned",
          outcomeType: "closed",
          amountUsd: 6000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "owned",
          outcomeType: "referral_paid",
          amountUsd: 500,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
      ],
    });

    expect(result.summary).toMatchObject({
      referralFeesUsd: 500,
      referralFeeRecordCount: 0,
      referralFeeExpectedCloseCount: 1,
      referralFeeCoverageRate: 0,
      trackedContributionUsd: null,
      returnOnAdSpend: null,
    });
    expect(result.channels.find((channel) => channel.source === "zillow")?.flags)
      .toContain("referral_fee_review_required");
  });

  it("does not let a non-closed lead fee mask a same-channel close fee gap", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        {
          id: "closed-without-fee",
          createdAt: "2026-08-10T12:00:00.000Z",
          status: "closed",
          source: "zillow",
          medium: "referral",
          campaign: "same_channel",
        },
        {
          id: "open-with-fee",
          createdAt: "2026-08-11T12:00:00.000Z",
          status: "new",
          source: "zillow",
          medium: "referral",
          campaign: "same_channel",
        },
      ],
      spend: [{
        source: "zillow",
        medium: "referral",
        campaign: "same_channel",
        spendUsd: 100,
      }],
      outcomes: [
        {
          leadId: "closed-without-fee",
          outcomeType: "closed",
          amountUsd: 8000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "open-with-fee",
          outcomeType: "referral_paid",
          amountUsd: 2000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
      ],
    });

    expect(result.summary).toMatchObject({
      closes: 1,
      referralFeesUsd: 2000,
      referralFeeRecordCount: 0,
      referralFeeExpectedCloseCount: 1,
      referralFeeCoverageRate: 0,
      trackedContributionUsd: null,
      returnOnAdSpend: null,
    });
    expect(result.channels[0].flags).toContain("referral_fee_review_required");
  });

  it("treats partial revenue and referral-fee coverage as unknown, not zero", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: ["one", "two"].map((id) => ({
        id,
        createdAt: "2026-08-10T12:00:00.000Z",
        status: "closed",
        source: "zillow",
        medium: "referral",
        campaign: "partial_economics",
      })),
      spend: [{
        source: "zillow",
        medium: "referral",
        campaign: "partial_economics",
        spendUsd: 500,
      }],
      outcomes: [
        {
          leadId: "one",
          outcomeType: "closed",
          amountUsd: 9000,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "one",
          outcomeType: "referral_paid",
          amountUsd: 2500,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
        {
          leadId: "two",
          outcomeType: "closed",
          amountUsd: null,
          occurredAt: "2026-08-17T12:00:00.000Z",
        },
      ],
    });

    expect(result.summary).toMatchObject({
      closes: 2,
      attributedRevenueUsd: 9000,
      referralFeesUsd: 2500,
      trackedContributionUsd: null,
      returnOnAdSpend: null,
      closedRevenueRecordCount: 1,
      closedRevenueCoverageRate: 50,
      referralFeeRecordCount: 1,
      referralFeeExpectedCloseCount: 2,
      referralFeeCoverageRate: 50,
    });
    expect(result.channels[0].flags).toEqual(expect.arrayContaining([
      "closed_revenue_missing",
      "referral_fee_review_required",
    ]));
    expect(result.channels[0].flags).not.toContain("scale_candidate");
    expect(result.opportunities.find((row) => row.key === "complete_closed_revenue_evidence")?.evidence)
      .toMatchObject({ closesMissingRevenue: 1 });
    expect(result.opportunities.find((row) => row.key === "reconcile_referral_fee_evidence")?.evidence)
      .toMatchObject({ closesNeedingReferralReview: 1 });
  });

  it("does not manufacture ROAS or contribution from a close without recorded revenue", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [{
        id: "closed-without-revenue",
        createdAt: "2026-08-10T12:00:00.000Z",
        status: "closed",
        source: "google",
        medium: "cpc",
        campaign: "seller_intent",
      }],
      spend: [{
        source: "google",
        medium: "cpc",
        campaign: "seller_intent",
        spendUsd: 500,
      }],
      outcomes: [{
        leadId: "closed-without-revenue",
        outcomeType: "closed",
        amountUsd: null,
        occurredAt: "2026-08-17T12:00:00.000Z",
      }],
    });

    expect(result.summary.returnOnAdSpend).toBeNull();
    expect(result.summary.trackedContributionUsd).toBeNull();
    expect(result.channels[0]).toMatchObject({
      closes: 1,
      attributedRevenueUsd: 0,
      closedRevenueRecordCount: 0,
      returnOnAdSpend: null,
      trackedContributionUsd: null,
    });
    expect(result.channels[0].flags).toContain("closed_revenue_missing");
    expect(result.opportunities.map((row) => row.key)).toContain("complete_closed_revenue_evidence");
  });

  it("computes interpolated first-response percentiles only from immutable evidence", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        ...[5, 10, 20, 40].map((minutes, index) => ({
          id: `response-${index}`,
          createdAt: "2026-08-18T12:00:00.000Z",
          status: "contacted",
          source: "organic",
          lastContactedAt: "2026-08-18T15:00:00.000Z",
          firstHumanResponseAt: new Date(Date.parse("2026-08-18T12:00:00.000Z") + minutes * 60_000).toISOString(),
        })),
        {
          id: "legacy-only",
          createdAt: "2026-08-18T12:00:00.000Z",
          status: "contacted",
          source: "organic",
          lastContactedAt: "2026-08-18T12:01:00.000Z",
          firstHumanResponseAt: null,
        },
      ],
    });

    expect(result.summary).toMatchObject({
      firstResponseSampleSize: 4,
      firstResponseCoverageRate: 80,
      medianFirstResponseMinutes: 15,
      p75FirstResponseMinutes: 25,
      p90FirstResponseMinutes: 34,
    });
    expect(result.channels[0]).toMatchObject({
      firstResponseSampleSize: 4,
      medianFirstResponseMinutes: 15,
      p90FirstResponseMinutes: 34,
    });
  });

  it("reports truthful response percentiles by lead type and server-resolved response owner", () => {
    const createdAt = "2026-08-18T12:00:00.000Z";
    const response = (
      id: string,
      leadType: string,
      minutes: number | null,
      owner?: {
        key: string;
        label: string;
        basis: "responder_agent" | "responder_user" | "assigned_owner_snapshot";
      },
    ) => ({
      id,
      createdAt,
      status: minutes == null ? "new" : "contacted",
      source: "organic",
      leadType,
      firstHumanResponseAt: minutes == null
        ? null
        : new Date(Date.parse(createdAt) + minutes * 60_000).toISOString(),
      firstResponseOwnerKey: owner?.key ?? null,
      firstResponseOwnerLabel: owner?.label ?? null,
      firstResponseOwnerBasis: owner?.basis ?? null,
    });
    const mike = {
      key: "agent:mike",
      label: "Mike Eatmon",
      basis: "responder_agent" as const,
    };
    const brandon = {
      key: "user:brandon",
      label: "Brandon Narron",
      basis: "responder_user" as const,
    };
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        ...[5, 10, 20, 40, 60].map((minutes, index) =>
          response(`seller-${index}`, "seller", minutes, mike)),
        response("seller-unmeasured", "seller", null),
        response("buyer-brandon", "buyer", 30, brandon),
        response("buyer-unattributed", "buyer", 90),
      ],
    });

    expect(result.summary).toMatchObject({
      firstResponseSampleSize: 7,
      firstResponseCoverageRate: 87.5,
      firstResponseOwnerAttributionRate: 85.7,
    });
    expect(result.responseByLeadType.find((row) => row.key === "seller")).toMatchObject({
      eligibleLeads: 6,
      firstResponseSampleSize: 5,
      coverageRate: 83.3,
      medianFirstResponseMinutes: 20,
      p75FirstResponseMinutes: 40,
      p90FirstResponseMinutes: 52,
      sampleStatus: "directional",
    });
    expect(result.responseByAgent.find((row) => row.label === "Mike Eatmon")).toMatchObject({
      firstResponseSampleSize: 5,
      coverageRate: null,
      medianFirstResponseMinutes: 20,
      p75FirstResponseMinutes: 40,
      p90FirstResponseMinutes: 52,
      sampleStatus: "directional",
      attributionBasis: "responder_agent",
    });
    expect(result.responseByAgent.find((row) => row.label === "Brandon Narron")).toMatchObject({
      firstResponseSampleSize: 1,
      attributionBasis: "responder_user",
    });
    expect(result.responseByAgent.find((row) => row.key === "unattributed")).toMatchObject({
      firstResponseSampleSize: 1,
      attributionBasis: "unattributed",
    });
    expect(result.opportunities.map((row) => row.key)).toContain("first_response_owner_attribution");
  });

  it("detects dormant non-terminal leads without treating closed records as nurture candidates", () => {
    const result = buildGrowthIntelligence({
      now: NOW,
      leads: [
        {
          id: "stale",
          createdAt: "2026-05-01T12:00:00.000Z",
          status: "contacted",
          source: "sphere",
          medium: "database",
          campaign: "annual_review",
          lastContactedAt: "2026-05-15T12:00:00.000Z",
        },
        {
          id: "closed",
          createdAt: "2026-05-01T12:00:00.000Z",
          status: "closed",
          source: "sphere",
          medium: "database",
          campaign: "annual_review",
          lastContactedAt: null,
        },
      ],
    });

    expect(result.summary.staleNurtureCandidates).toBe(1);
    expect(result.opportunities.map((row) => row.key)).toContain("database_reactivation");
  });

  it("assigns experiment variants deterministically", () => {
    const variants = [
      { key: "control", weight: 50 },
      { key: "challenger", weight: 50 },
    ];
    const first = assignExperimentVariant("hero-value-v1", "session-123", variants);
    const second = assignExperimentVariant("hero-value-v1", "session-123", variants);
    expect(first).toBe(second);
    expect(["control", "challenger"]).toContain(first);
    expect(() => assignExperimentVariant("bad", "subject", [{ key: "one", weight: 1 }]))
      .toThrow("At least two");
  });

  it("keeps experiment decisions practical and approval-gated rather than pretending to prove significance", () => {
    expect(evaluateExperiment({
      minimumSampleSize: 100,
      variants: [
        { key: "control", exposures: 40, conversions: 4 },
        { key: "challenger", exposures: 50, conversions: 8 },
      ],
    })).toMatchObject({ status: "continue", sampleReady: false });

    expect(evaluateExperiment({
      minimumSampleSize: 100,
      variants: [
        { key: "control", exposures: 200, conversions: 20 },
        { key: "challenger", exposures: 200, conversions: 30 },
      ],
    })).toMatchObject({
      status: "promote",
      winner: "challenger",
      sampleReady: true,
      upliftPercent: 50,
    });

    expect(evaluateExperiment({
      minimumSampleSize: 100,
      variants: [
        { key: "control", exposures: 200, conversions: 20 },
        { key: "challenger", exposures: 200, conversions: 30, guardrailBreaches: 1 },
      ],
    })).toMatchObject({ status: "stop", winner: null });
  });
});

describe("Vendor-neutral lead ingress", () => {
  it("normalizes portal payloads while refusing to invent consent", () => {
    const normalized = normalizeVendorLead({
      vendor: "Zillow",
      receivedAt: NOW,
      payload: {
        lead_id: "z-123",
        first_name: "Jane",
        last_name: "Seller",
        email: "jane@example.com",
        phone: "2525550101",
        property: {
          address: "100 Nash Street N",
          city: "Wilson",
          state: "NC",
          postal_code: "27896",
        },
        type: "seller_lead",
        campaign_name: "Wilson Premier Agent",
      },
    });

    expect(normalized).toMatchObject({
      vendor: "zillow",
      externalLeadId: "z-123",
      contact: {
        firstName: "Jane",
        lastName: "Seller",
        email: "jane@example.com",
        phone: "2525550101",
      },
      attribution: {
        source: "zillow",
        medium: "portal",
        campaign: "Wilson Premier Agent",
      },
      consent: {
        email: null,
        sms: null,
        call: null,
      },
      intent: { leadType: "seller" },
      requiresReview: true,
    });
    expect(normalized.reviewReasons).toContain("consent_not_explicit");
  });

  it("creates stable payload fingerprints without retaining raw payloads", () => {
    const left = fingerprintVendorPayload({ b: 2, a: { y: 2, x: 1 } });
    const right = fingerprintVendorPayload({ a: { x: 1, y: 2 }, b: 2 });
    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });
});
