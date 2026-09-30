import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessOwnedDemandMeasurement,
  buildOwnedDemandChannelPacket,
  buildOwnedDemandCommand,
  resolveOwnedDemandPlacement,
  type OwnedDemandAttributionSignal,
} from "../../app/lib/growth/owned-demand";
import type { GrowthSummary } from "../../app/lib/growth/intelligence";
import { buildOwnedDemandAttributionSignals } from "../../app/lib/persistence/neonGrowthIntelligenceView";

const root = process.cwd();

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
  campaign = "amm_owned_demand_2026",
  basis?: "legacy_wordpress_compatibility",
): OwnedDemandAttributionSignal {
  return {
    source,
    medium,
    campaign,
    content,
    leads,
    ...(basis ? { basis } : {}),
  };
}

describe("Owned Demand Command", () => {
  it("distinguishes unavailable measurement from a truthful zero-live-demand result", () => {
    expect(assessOwnedDemandMeasurement({ configured: false, schemaReady: false })).toMatchObject({
      ready: false,
      status: "not_configured",
      label: "Measurement unavailable",
    });
    expect(assessOwnedDemandMeasurement({ configured: true, schemaReady: false })).toMatchObject({
      ready: false,
      status: "schema_pending",
    });
    expect(assessOwnedDemandMeasurement({
      configured: true,
      schemaReady: true,
      error: "Canonical Neon growth intelligence query failed",
    })).toMatchObject({
      ready: false,
      status: "query_failed",
    });
    const healthy = assessOwnedDemandMeasurement({ configured: true, schemaReady: true });
    expect(healthy).toMatchObject({ ready: true, status: "ready", label: "Measured" });
    expect(healthy.detail).toContain("test and suppressed records are excluded");
  });

  it("identifies activation as the bottleneck when no eligible live leads exist", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] }, new Date("2026-08-19T12:00:00Z"));
    expect(result.measurementState).toBe("no_live_signal");
    expect(result.attributedLiveLeads).toBe(0);
    expect(result.bottleneck).toContain("owned-demand activation");
    expect(result.channels.every((row) => row.status === "ready_unmeasured")).toBe(true);
  });

  it("counts only exact canonical campaign and placement signals without inferring publication", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 4, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal("facebook", "social_organic", "facebook_local_question", 2),
        signal("gbp", "organic_local", "gbp_update", 1),
        signal("portal", "social_organic", "facebook_local_question", 1),
      ],
    });
    expect(result.attributedLiveLeads).toBe(3);
    expect(result.channels.find((row) => row.key === "facebook")?.attributedLeads).toBe(2);
    expect(result.channels.find((row) => row.key === "google_business_profile")?.attributedLeads).toBe(1);
    expect(result.operatorBoundary).toContain("never publishes");
  });

  it("counts generic and offer-specific signals exactly once at the channel and command levels", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 7, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal("facebook", "social_organic", "facebook_local_question", 2),
        signal("facebook", "social_organic", "facebook_local_question_seller_review", 3),
        signal("facebook", "social_organic", "facebook_local_question_buyer_match", 1),
        signal("facebook", "social_organic", "facebook_local_question_renter_plan", 1),
      ],
    });
    const facebook = result.channels.find((row) => row.key === "facebook");
    expect(facebook?.attributedLeads).toBe(7);
    expect(facebook?.offers.map((offer) => offer.attributedLeads)).toEqual([3, 1, 1]);
    expect(result.attributedLiveLeads).toBe(7);
  });

  it("counts open-house packet attribution as an exact instance-specific QR signal", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 2, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal("qr", "owned_media", "open_house_registration", 2),
      ],
    });
    const qr = result.channels.find((row) => row.key === "qr_print");
    expect(qr?.attributedLeads).toBe(2);
    expect(qr?.instancePlacements).toEqual([
      expect.objectContaining({
        key: "open_house_registration",
        content: "open_house_registration",
        attributedLeads: 2,
        status: "signal_detected",
      }),
    ]);
    expect(result.attributedLiveLeads).toBe(2);
    expect(buildOwnedDemandChannelPacket(qr!)).toContain(
      "INSTANCE-SPECIFIC ATTRIBUTION CLASSES",
    );
  });

  it("does not call unrelated attributed demand a measured owned-channel signal", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 3, attributedLeadRate: 100 }),
      ownedDemandSignals: [signal("portal", "social_organic", "facebook_local_question", 3)],
    });
    expect(result.attributedLiveLeads).toBe(0);
    expect(result.measurementState).toBe("no_live_signal");
    expect(result.bottleneck).toContain("no lead is attributed to an owned-demand placement");
  });

  it("ignores unrelated campaigns and creative placements from the same source", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 4, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal("facebook", "social_organic", "facebook_local_question", 1, "old_launch"),
        signal("facebook", "social_organic", "different_creative", 1),
        signal("facebook", "paid_social", "facebook_local_question", 1),
        signal("instagram", "social_organic", "instagram_story_question", 1),
      ],
    });
    expect(result.attributedLiveLeads).toBe(1);
    expect(result.channels.find((row) => row.key === "facebook")?.attributedLeads).toBe(0);
    expect(result.channels.find((row) => row.key === "instagram")?.attributedLeads).toBe(1);
  });

  it("preserves Facebook and Instagram as distinct raw latest-touch signals", () => {
    const signals = buildOwnedDemandAttributionSignals([
      { utm_source: "Facebook", utm_medium: "social-organic", utm_campaign: "AMM Owned Demand 2026", utm_content: "facebook local question" },
      { utm_source: "facebook", utm_medium: "social_organic", utm_campaign: "amm_owned_demand_2026", utm_content: "facebook_local_question" },
      { utm_source: "Instagram", utm_medium: "social_organic", utm_campaign: "amm_owned_demand_2026", utm_content: "instagram_story_question" },
      { utm_source: "facebook", utm_medium: "social_organic", utm_campaign: "amm_owned_demand_2026", utm_content: null },
    ]);
    expect(signals).toEqual([
      signal("facebook", "social_organic", "facebook_local_question", 2),
      signal("instagram", "social_organic", "instagram_story_question", 1),
    ]);
  });

  it("recognizes only the audited legacy WordPress tuples as compatibility evidence", () => {
    const signals = buildOwnedDemandAttributionSignals([
      {
        utm_source: "ourtownproperties",
        utm_medium: "homepage_cta",
        utm_campaign: "website_widget",
        utm_content: null,
        referrer_url: "https://www.ourtownproperties.com/",
      },
      {
        utm_source: "ourtownproperties",
        utm_medium: "home_value_page",
        utm_campaign: "website_widget",
        utm_content: null,
        referrer_url: "https://www.ourtownproperties.com/how-much-is-your-home-worth/?private=value",
      },
      {
        utm_source: "ourtownproperties",
        utm_medium: "seller_page_cta",
        utm_campaign: "website_widget",
        utm_content: null,
        referrer_url: "https://www.ourtownproperties.com/we-buy-homes/",
      },
      {
        utm_source: "ourtownproperties",
        utm_medium: "referral",
        utm_campaign: "website_widget",
        utm_content: null,
        referrer_url: "https://www.ourtownproperties.com/ask-mike/",
      },
    ]);

    expect(signals).toHaveLength(4);
    expect(signals.every((row) => row.basis === "legacy_wordpress_compatibility")).toBe(true);
    expect(signals.map((row) => row.content).sort()).toEqual([
      "wordpress_ask_magic_mike_embed",
      "wordpress_home_value_page",
      "wordpress_homepage_ask_mike",
      "wordpress_we_buy_homes",
    ]);
    expect(signals.every((row) => row.source === "ourtownproperties")).toBe(true);
    expect(signals.every((row) => row.medium === "owned_media")).toBe(true);
    expect(signals.every((row) => row.campaign === "amm_owned_demand_2026")).toBe(true);
  });

  it("fails closed for lookalike, mismatched, or already-tagged legacy WordPress rows", () => {
    const base = {
      utm_source: "ourtownproperties",
      utm_medium: "homepage_cta",
      utm_campaign: "website_widget",
      utm_content: null,
      referrer_url: "https://www.ourtownproperties.com/",
    };
    const signals = buildOwnedDemandAttributionSignals([
      { ...base, referrer_url: "https://ourtownproperties.com.example.invalid/" },
      { ...base, referrer_url: "http://www.ourtownproperties.com/" },
      { ...base, referrer_url: "https://www.ourtownproperties.com:444/" },
      { ...base, referrer_url: "https://www.ourtownproperties.com/unreviewed-page/" },
      { ...base, utm_medium: "referral" },
      { ...base, utm_campaign: "different_campaign" },
      { ...base, utm_content: "already_tagged" },
      { ...base, utm_source: "unapproved_source" },
      { ...base, referrer_url: null },
    ]);

    expect(signals).toEqual([
      signal("ourtownproperties", "homepage_cta", "already_tagged", 1, "website_widget"),
    ]);
  });

  it("creates canonical lowercase UTM links for every manual channel", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    expect(result.channels.length).toBeGreaterThanOrEqual(6);
    for (const row of result.channels) {
      const url = new URL(row.trackedUrl);
      expect(url.origin).toBe("https://www.askmagicmike.com");
      expect(url.searchParams.get("utm_source")).toBe(row.source);
      expect(url.searchParams.get("utm_medium")).toBe(row.medium);
      expect(url.searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
      expect(url.searchParams.get("utm_content")).toBe(row.content);
    }
  });

  it("provides exact seller, buyer, and renter links for the existing Our Town WordPress surface", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    const wordpress = result.channels.find((row) => row.key === "ourtown_wordpress");
    expect(wordpress).toBeDefined();
    expect(wordpress?.source).toBe("ourtownproperties");
    expect(wordpress?.medium).toBe("owned_media");
    expect(wordpress?.offers.map((offer) => new URL(offer.trackedUrl).pathname)).toEqual([
      "/home-value",
      "/buy",
      "/rent",
    ]);

    const seller = resolveOwnedDemandPlacement("ourtown_wordpress", "seller_review");
    expect(seller?.campaign).toBe("amm_owned_demand_2026");
    expect(seller?.content).toBe("wordpress_ask_magic_mike_seller_review");
    expect(seller?.trackedUrl).toContain("utm_source=ourtownproperties");
    expect(seller?.trackedUrl).toContain("utm_medium=owned_media");
    expect(wordpress?.namedPlacements.map((placement) => placement.placementKey)).toEqual([
      "wordpress_homepage_ask_mike",
      "wordpress_home_value",
      "wordpress_we_buy_homes",
      "wordpress_mike_agent",
      "wordpress_listing_buyer",
      "wordpress_rental_to_homeownership",
      "wordpress_ask_magic_mike_embed",
    ]);
    expect(resolveOwnedDemandPlacement("ourtown_wordpress", "wordpress_we_buy_homes")?.trackedUrl).toContain("/sell?");
  });

  it("counts a named WordPress placement as an exact owned-demand signal", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 2, attributedLeadRate: 100 }),
      ownedDemandSignals: [signal("ourtownproperties", "owned_media", "wordpress_homepage_ask_mike", 2)],
    });
    const wordpress = result.channels.find((row) => row.key === "ourtown_wordpress");
    expect(wordpress?.attributedLeads).toBe(2);
    expect(wordpress?.namedPlacements.find((row) => row.placementKey === "wordpress_homepage_ask_mike")?.attributedLeads).toBe(2);
    expect(result.attributedLiveLeads).toBe(2);
  });

  it("surfaces legacy WordPress evidence separately without inflating exact KPIs", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 3, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal(
          "ourtownproperties",
          "owned_media",
          "wordpress_homepage_ask_mike",
          2,
          "amm_owned_demand_2026",
          "legacy_wordpress_compatibility",
        ),
        signal("ourtownproperties", "owned_media", "wordpress_homepage_ask_mike", 1),
      ],
    });
    const wordpress = result.channels.find((row) => row.key === "ourtown_wordpress");
    const homepage = wordpress?.namedPlacements.find(
      (row) => row.placementKey === "wordpress_homepage_ask_mike",
    );

    expect(result.attributedLiveLeads).toBe(1);
    expect(result.legacyAttributedLiveLeads).toBe(2);
    expect(wordpress?.attributedLeads).toBe(1);
    expect(wordpress?.legacyAttributedLeads).toBe(2);
    expect(homepage?.attributedLeads).toBe(1);
    expect(homepage?.legacyAttributedLeads).toBe(2);
  });

  it("keeps legacy-only evidence out of exact measurement state and explains the repair", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 2, attributedLeadRate: 100 }),
      ownedDemandSignals: [
        signal(
          "ourtownproperties",
          "owned_media",
          "wordpress_ask_magic_mike_embed",
          2,
          "amm_owned_demand_2026",
          "legacy_wordpress_compatibility",
        ),
      ],
    });

    expect(result.attributedLiveLeads).toBe(0);
    expect(result.legacyAttributedLiveLeads).toBe(2);
    expect(result.measurementState).toBe("no_live_signal");
    expect(result.bottleneck).toContain("legacy Our Town placement tuple");
    expect(result.bottleneck).toContain("do not count compatibility evidence as an exact KPI");
  });

  it("creates a seller, buyer, and renter flight for every existing channel", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    expect(result.offers.map((offer) => offer.key)).toEqual(["seller_review", "buyer_match", "renter_plan"]);
    expect(result.offers.map((offer) => new URL(offer.destination).pathname)).toEqual(["/home-value", "/buy", "/rent"]);

    for (const channel of result.channels) {
      expect(channel.offers).toHaveLength(3);
      for (const offer of channel.offers) {
        const url = new URL(offer.trackedUrl);
        expect(url.origin).toBe("https://www.askmagicmike.com");
        expect(url.pathname).toBe(new URL(offer.destination).pathname);
        expect(url.searchParams.get("utm_source")).toBe(channel.source);
        expect(url.searchParams.get("utm_medium")).toBe(channel.medium);
        expect(url.searchParams.get("utm_campaign")).toBe("amm_owned_demand_2026");
        expect(url.searchParams.get("utm_content")).toBe(offer.content);
        expect(offer.content).toBe(`${channel.content}_${offer.key}`);
      }
    }
  });

  it("ships only local retained visuals and compliance-bounded offer copy", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    const offerCopy = result.offers.map((offer) => `${offer.draftTitle} ${offer.draftBody} ${offer.reviewNote}`).join(" ");
    expect(offerCopy).not.toMatch(/instant|exact value|guaranteed result|preapproved|best neighborhood|school district|cash buyer waiting|respond in \d+/i);
    expect(offerCopy).toContain("not an appraisal");
    expect(offerCopy).toContain("not a lending decision");

    for (const offer of result.offers) {
      expect(offer.creativePath).toMatch(/^\/(brand|images)\//);
      expect(fs.existsSync(path.join(root, "public", offer.creativePath))).toBe(true);
    }
  });

  it("keeps public-action and unsupported-claim language out of the drafts", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    const copy = result.channels.map((row) => `${row.draftTitle} ${row.draftBody}`).join(" ");
    expect(copy).not.toMatch(/instant answer|exact value|best neighborhood|outperforming|guaranteed value|guaranteed result|\$\d{2,}/i);
    expect(copy).toContain("no automated appraisal or guaranteed offer");
  });

  it("builds one complete, approval-bounded packet per channel", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    const facebook = result.channels.find((channel) => channel.key === "facebook");
    expect(facebook).toBeDefined();

    const packet = buildOwnedDemandChannelPacket(facebook!);
    expect(packet).toContain("FACEBOOK OWNED-DEMAND FLIGHT");
    expect(packet).toContain("GENERAL QUESTION PLACEMENT");
    expect(packet).toContain(facebook!.trackedUrl);
    for (const offer of facebook!.offers) {
      expect(packet).toContain(offer.draftTitle);
      expect(packet).toContain(offer.trackedUrl);
      expect(packet).toContain(offer.reviewNote);
    }
    const wordpress = result.channels.find((channel) => channel.key === "ourtown_wordpress");
    const wordpressPacket = buildOwnedDemandChannelPacket(wordpress!);
    expect(wordpressPacket).toContain("NAMED BROKERAGE PLACEMENTS");
    expect(wordpressPacket).toContain("wordpress_we_buy_homes");
    expect(packet).toContain("External publication remains a separate human-reviewed approval.");
  });
});

describe("canonical /admin/distribution route guards", () => {
  const page = fs.readFileSync(path.join(root, "app/admin/distribution/page.tsx"), "utf8");
  const copyControl = fs.readFileSync(path.join(root, "app/admin/distribution/CopyDemandAsset.tsx"), "utf8");
  const action = fs.readFileSync(path.join(root, "app/admin/distribution/actions.ts"), "utf8");
  const proofStore = fs.readFileSync(path.join(root, "app/lib/persistence/neonOwnedDemandPublicationProofs.ts"), "utf8");
  const view = fs.readFileSync(path.join(root, "app/lib/persistence/neonGrowthIntelligenceView.ts"), "utf8");
  const manifest = fs.readFileSync(path.join(root, "config/active-route-manifest.json"), "utf8");

  it("uses the root router, canonical Neon view, and report permission", () => {
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(action).toContain('requireLeadCenterPermission("growth:manage")');
    expect(page).toContain("loadGrowthIntelligence(30)");
    expect(page).toContain("buildOwnedDemandActivationLoop");
    expect(page).toContain("Exact placement activation loop");
    expect(manifest).toContain('"/admin/distribution"');
    expect(manifest).toContain("active-protected-owned-demand-neon-append-only-publication-proof");
    expect(view).toContain("sa.referrer_url");
    expect(page).toContain("Legacy WordPress signals");
    expect(page).toContain("legacyAttributedLeads");
    expect(page).not.toContain("referrer_url");
  });

  it("adds only an append-only proof mutation while excluding test and suppressed lead records upstream", () => {
    expect(page).toContain("<form");
    expect(page).toContain("recordOwnedDemandPublicationProofAction");
    expect(action).toContain('redirect("/lead-center-login?error=rbac_required")');
    expect(action).not.toContain("system/admin_basic_auth");
    expect(action).toContain('formData.get("confirm") !== "yes"');
    expect(action).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon/);
    expect(proofStore).toContain("assertDatabaseMutationAllowed");
    expect(proofStore).toContain("WHERE is_test = false");
    expect(proofStore).toContain("record_owned_demand_publication_proof_v1");
    expect(view).toContain("l.is_test = false");
    expect(view).toContain("l.communication_suppressed = false");
  });

  it("adds local-only copy controls without adding a publishing or network mutation path", () => {
    expect(page).toContain("CopyDemandAsset");
    expect(page).toContain("Three-offer launch flight");
    expect(page).toContain("Three offer-specific placements");
    expect(page).toContain("Copy full channel flight");
    expect(page).toContain("Next evidence-backed operator decision");
    expect(page).toContain("Named brokerage placements");
    expect(page).toContain("channel.namedPlacements");
    expect(page).toContain("Open exact channel packet");
    expect(page).toContain('href={`#channel-${next.channelKey}`}');
    expect(copyControl).toContain('type="button"');
    expect(copyControl).toContain("navigator.clipboard.writeText");
    expect(copyControl).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|<form|use server/i);
  });

  it("never presents unavailable Growth measurement as zero demand or a measured recommendation", () => {
    expect(page).toContain("assessOwnedDemandMeasurement(growth)");
    expect(page).toContain("Unavailable is not zero live demand");
    expect(page).toContain("Restore measurement before selecting a first channel.");
    expect(page).toContain("Prepared sequence · measurement unavailable");
    expect(page).toContain("measurementReady={measurement.ready}");
  });

  it("keeps the cadence fully readable across mobile and desktop", () => {
    expect(page).toContain('className="min-w-0 rounded-2xl');
    expect(page).toContain('className="space-y-3 md:hidden"');
    expect(page).toContain('className="hidden overflow-x-auto md:block"');
    expect(page).toContain('className="min-w-[760px]');
    expect(page).toContain("Proof required");
    expect(page).toContain("break-all");
  });
});
