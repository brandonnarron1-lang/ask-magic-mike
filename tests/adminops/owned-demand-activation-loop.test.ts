import { describe, expect, it } from "vitest";
import {
  buildOwnedDemandActivationLoop,
} from "../../app/lib/growth/owned-demand-activation";
import {
  buildOwnedDemandCommand,
  resolveOwnedDemandPlacement,
  type OwnedDemandAttributionSignal,
} from "../../app/lib/growth/owned-demand";
import type { GrowthSummary } from "../../app/lib/growth/intelligence";
import type {
  OwnedDemandPublicationProofLedger,
  OwnedDemandPublicationProofRow,
} from "../../app/lib/persistence/neonOwnedDemandPublicationProofs";

const NOW = new Date("2026-08-21T22:30:00.000Z");

function summary(overrides: Partial<GrowthSummary> = {}): GrowthSummary {
  return {
    leads: 0,
    qualified: 0,
    appointments: 0,
    agreements: 0,
    closes: 0,
    spendUsd: 0,
    attributedRevenueUsd: 0,
    referralFeesUsd: 0,
    trackedContributionUsd: null,
    trackedContributionRate: null,
    closedRevenueRecordCount: 0,
    closedRevenueCoverageRate: null,
    referralFeeRecordCount: 0,
    referralFeeExpectedCloseCount: 0,
    referralFeeCoverageRate: null,
    blendedCostPerLead: null,
    blendedCostPerQualifiedLead: null,
    blendedCostPerAppointment: null,
    blendedCostPerSignedClient: null,
    blendedCostPerClose: null,
    returnOnAdSpend: null,
    attributedLeadRate: 0,
    paidLeadSpendCoverageRate: 0,
    staleNurtureCandidates: 0,
    speedToLeadRisks: 0,
    firstResponseSampleSize: 0,
    firstResponseCoverageRate: 0,
    firstResponseOwnerAttributionRate: 0,
    medianFirstResponseMinutes: null,
    p75FirstResponseMinutes: null,
    p90FirstResponseMinutes: null,
    runningExperiments: 0,
    ...overrides,
  };
}

function signal(
  source: string,
  medium: string,
  content: string,
  leads: number,
): OwnedDemandAttributionSignal {
  return { source, medium, campaign: "amm_owned_demand_2026", content, leads };
}

function command(signals: OwnedDemandAttributionSignal[] = []) {
  return buildOwnedDemandCommand({
    summary: summary({ leads: signals.reduce((total, row) => total + row.leads, 0), attributedLeadRate: signals.length ? 100 : 0 }),
    ownedDemandSignals: signals,
  }, NOW);
}

function proof(overrides: Partial<OwnedDemandPublicationProofRow> = {}): OwnedDemandPublicationProofRow {
  const channelKey = overrides.channelKey || "facebook";
  const placementKey = overrides.placementKey || "seller_review";
  const definition = resolveOwnedDemandPlacement(channelKey, placementKey);
  if (!definition) throw new Error("test requires a canonical owned-demand placement");
  return {
    id: "proof-facebook-seller-live",
    channelKey,
    placementKey: definition.placementKey,
    platformState: "live",
    proofType: "public_url",
    campaignKey: definition.campaign,
    source: definition.source,
    medium: definition.medium,
    content: definition.content,
    trackedUrl: definition.trackedUrl,
    evidenceUrl: "https://www.facebook.com/OurTownProperties/posts/123",
    evidenceReference: null,
    finalCopySha256: "a".repeat(64),
    creativeAssetKey: null,
    approvalReference: "Owner approval 2026-08-21",
    observedAt: "2026-08-21T21:00:00.000Z",
    recordedBy: "lead_center:user-123",
    createdAt: "2026-08-21T21:00:01.000Z",
    ...overrides,
  };
}

function ledger(
  proofs: OwnedDemandPublicationProofRow[] = [],
  overrides: Partial<OwnedDemandPublicationProofLedger> = {},
): OwnedDemandPublicationProofLedger {
  return {
    configured: true,
    schemaReady: true,
    generatedAt: NOW.toISOString(),
    proofs,
    ...overrides,
  };
}

function placement(
  loop: ReturnType<typeof buildOwnedDemandActivationLoop>,
  channelKey: string,
  placementKey: string,
) {
  return loop.placements.find((row) => row.channelKey === channelKey && row.placementKey === placementKey);
}

describe("owned-demand per-placement activation loop", () => {
  it("fails closed when the canonical proof ledger cannot be read", () => {
    const result = buildOwnedDemandActivationLoop(command(), ledger([], { configured: false, schemaReady: false }));
    expect(result.evidenceAvailable).toBe(false);
    expect(result.nextPlacement).toBeNull();
    expect(result.placements.every((row) => row.state === "evidence_unavailable")).toBe(true);
    expect(result.authorityBoundary).toContain("cannot publish");
  });

  it("keeps native proof inspectable but disables placement selection when Growth measurement is unavailable", () => {
    const result = buildOwnedDemandActivationLoop(command(), ledger([proof()]), false);
    expect(result.evidenceAvailable).toBe(true);
    expect(result.measurementAvailable).toBe(false);
    expect(result.activeProofPlacements).toBe(1);
    expect(result.nextPlacement).toBeNull();
    expect(result.placements.every((row) => row.state === "measurement_unavailable")).toBe(true);
    expect(result.placements[0]?.nextAction).toContain("Restore measurement before selecting a first channel");
  });

  it("enumerates every exact placement and prioritizes the audited WordPress homepage without inventing proof", () => {
    const result = buildOwnedDemandActivationLoop(command(), ledger());
    expect(result.totalPlacements).toBe(35);
    expect(result.unobservedPlacements).toBe(35);
    expect(result.activeProofPlacements).toBe(0);
    expect(result.measuredPlacements).toBe(0);
    expect(result.nextPlacement).toMatchObject({
      channelKey: "ourtown_wordpress",
      placementKey: "wordpress_homepage_ask_mike",
      state: "prepared_not_observed",
    });
  });

  it("skips a publication-blocked WordPress target and recommends the next exact visible placement", () => {
    const result = buildOwnedDemandActivationLoop(command(), ledger(), true, [
      {
        channelKey: "ourtown_wordpress",
        placementKey: "wordpress_homepage_ask_mike",
        activationEligible: false,
        status: "hidden_target",
        detail: "The exact CTA remains hidden by known public CSS.",
      },
      {
        channelKey: "ourtown_wordpress",
        placementKey: "wordpress_home_value",
        activationEligible: true,
        status: "legacy_match_ready",
        detail: "One exact visible legacy CTA is ready for review.",
        nextAction: "Use the exact home-value readiness manifest and approval gate.",
      },
    ]);

    expect(result.nextPlacement).toMatchObject({
      channelKey: "ourtown_wordpress",
      placementKey: "wordpress_home_value",
      selectionBlocked: false,
      readinessStatus: "legacy_match_ready",
      nextAction: "Use the exact home-value readiness manifest and approval gate.",
    });
    expect(result.readinessBlockedPlacements).toBe(10);
    expect(placement(
      result,
      "ourtown_wordpress",
      "wordpress_homepage_ask_mike",
    )).toMatchObject({
      selectionBlocked: true,
      readinessStatus: "hidden_target",
      readinessDetail: "The exact CTA remains hidden by known public CSS.",
    });
    expect(placement(
      result,
      "ourtown_wordpress",
      "wordpress_homepage_ask_mike",
    )?.nextAction).toContain("Do not activate this placement yet");
    expect(placement(
      result,
      "ourtown_wordpress",
      "wordpress_mike_agent",
    )).toMatchObject({
      selectionBlocked: true,
      readinessStatus: "readiness_unavailable",
      readinessDetail: "This WordPress placement has no bounded live readiness manifest and cannot be selected by fallback priority.",
    });
  });

  it("returns no recommendation when every prepared placement has an explicit readiness hold", () => {
    const baseline = buildOwnedDemandActivationLoop(command(), ledger());
    const result = buildOwnedDemandActivationLoop(
      command(),
      ledger(),
      true,
      baseline.placements.map((row) => ({
        channelKey: row.channelKey,
        placementKey: row.placementKey,
        activationEligible: false,
        status: "readiness_unavailable",
        detail: "No exact native readiness evidence is available.",
      })),
    );

    expect(result.readinessBlockedPlacements).toBe(result.totalPlacements);
    expect(result.nextPlacement).toBeNull();
  });

  it("does not recycle a measured or held placement as a false next action", () => {
    const baseline = buildOwnedDemandActivationLoop(command([
      signal("facebook", "social_organic", "facebook_local_question_seller_review", 1),
    ]), ledger([proof()]));
    const result = buildOwnedDemandActivationLoop(
      command([
        signal("facebook", "social_organic", "facebook_local_question_seller_review", 1),
      ]),
      ledger([proof()]),
      true,
      baseline.placements.map((row) => ({
        channelKey: row.channelKey,
        placementKey: row.placementKey,
        activationEligible: false,
        status: "readiness_unavailable",
        detail: "No exact native readiness evidence is available.",
      })),
    );

    expect(result.measuredPlacements).toBe(1);
    expect(result.nextPlacement).toBeNull();
  });

  it("fails closed when a latest proof no longer matches the current canonical attribution identity", () => {
    const result = buildOwnedDemandActivationLoop(command(), ledger([proof({
      trackedUrl: "https://www.askmagicmike.com/home-value?utm_source=facebook&utm_campaign=old_campaign",
    })]));
    expect(placement(result, "facebook", "seller_review")?.state).toBe("proof_attribution_mismatch");
    expect(result.identityReviewPlacements).toBe(1);
    expect(result.activeProofPlacements).toBe(0);
    expect(result.nextPlacement?.placementKey).toBe("seller_review");
  });

  it("joins an exact active proof and exact attribution signal without double counting", () => {
    const result = buildOwnedDemandActivationLoop(command([
      signal("facebook", "social_organic", "facebook_local_question_seller_review", 2),
    ]), ledger([proof()]));
    expect(placement(result, "facebook", "seller_review")).toMatchObject({
      state: "measured_signal",
      attributedLeads: 2,
    });
    expect(placement(result, "facebook", "general_question")?.attributedLeads).toBe(0);
    expect(result.attributedLeads).toBe(2);
    expect(result.measuredPlacements).toBe(1);
  });

  it("treats attribution without a current active proof as a reconciliation issue, never publication proof", () => {
    const result = buildOwnedDemandActivationLoop(command([
      signal("instagram", "social_organic", "instagram_story_question", 1),
    ]), ledger());
    expect(result.nextPlacement).toMatchObject({
      channelKey: "instagram",
      placementKey: "general_question",
      state: "signal_without_active_proof",
    });
    expect(result.signalReviewPlacements).toBe(1);
    expect(result.nextPlacement?.nextAction).toContain("Do not infer publication from attribution");
  });

  it("uses the latest exact-placement proof even when rows arrive out of order", () => {
    const removed = proof({
      id: "proof-facebook-seller-removed",
      platformState: "removed",
      proofType: "removal_reference",
      evidenceUrl: null,
      evidenceReference: "Native removal reference 321",
      observedAt: "2026-08-21T22:00:00.000Z",
      createdAt: "2026-08-21T22:00:01.000Z",
    });
    const result = buildOwnedDemandActivationLoop(command(), ledger([removed, proof()]));
    expect(placement(result, "facebook", "seller_review")).toMatchObject({
      state: "native_inactive",
      latestProof: { id: "proof-facebook-seller-removed" },
    });
    expect(result.inactiveProofPlacements).toBe(1);
  });

  it("distinguishes active configuration from merely configured WordPress work", () => {
    const wordpressConfigured = proof({
      id: "proof-wordpress-configured",
      channelKey: "ourtown_wordpress",
      placementKey: "wordpress_homepage_ask_mike",
      platformState: "configured",
      proofType: "configuration_reference",
      evidenceUrl: null,
      evidenceReference: "Staged page configuration 3631",
    });
    const signatureConfigured = proof({
      id: "proof-email-configured",
      channelKey: "email_signature",
      placementKey: "general_question",
      platformState: "configured",
      proofType: "configuration_reference",
      evidenceUrl: null,
      evidenceReference: "Approved brokerage signature v2",
    });
    const qrDistributed = proof({
      id: "proof-qr-distributed",
      channelKey: "qr_print",
      placementKey: "buyer_match",
      platformState: "distributed",
      proofType: "scan_test_reference",
      evidenceUrl: null,
      evidenceReference: "Two-device scan packet 14",
    });
    const result = buildOwnedDemandActivationLoop(command(), ledger([
      wordpressConfigured,
      signatureConfigured,
      qrDistributed,
    ]));
    expect(placement(result, "ourtown_wordpress", "wordpress_homepage_ask_mike")?.state).toBe("native_pending");
    expect(placement(result, "email_signature", "general_question")?.state).toBe("observed_unmeasured");
    expect(placement(result, "qr_print", "buyer_match")?.state).toBe("observed_unmeasured");
    expect(result.activeProofPlacements).toBe(2);
    expect(result.pendingProofPlacements).toBe(1);
  });

  it("keeps a current signal under review after a later removal rather than claiming a live placement", () => {
    const removed = proof({
      id: "proof-facebook-seller-removed",
      platformState: "removed",
      proofType: "removal_reference",
      evidenceUrl: null,
      evidenceReference: "Native removal reference 321",
      observedAt: "2026-08-21T22:00:00.000Z",
    });
    const result = buildOwnedDemandActivationLoop(command([
      signal("facebook", "social_organic", "facebook_local_question_seller_review", 1),
    ]), ledger([proof(), removed]));
    expect(placement(result, "facebook", "seller_review")?.state).toBe("signal_without_active_proof");
    expect(result.measuredPlacements).toBe(0);
    expect(result.signalReviewPlacements).toBe(1);
  });
});
