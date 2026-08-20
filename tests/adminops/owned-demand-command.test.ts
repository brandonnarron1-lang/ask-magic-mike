import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildOwnedDemandCommand,
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
    closes: 0,
    spendUsd: 0,
    attributedRevenueUsd: 0,
    blendedCostPerLead: null,
    blendedCostPerAppointment: null,
    blendedCostPerClose: null,
    returnOnAdSpend: null,
    attributedLeadRate: 0,
    paidLeadSpendCoverageRate: 0,
    staleNurtureCandidates: 0,
    speedToLeadRisks: 0,
    firstResponseSampleSize: 0,
    firstResponseCoverageRate: 0,
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
): OwnedDemandAttributionSignal {
  return {
    source,
    medium,
    campaign,
    content,
    leads,
  };
}

describe("Owned Demand Command", () => {
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

  it("keeps public-action and unsupported-claim language out of the drafts", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), ownedDemandSignals: [] });
    const copy = result.channels.map((row) => `${row.draftTitle} ${row.draftBody}`).join(" ");
    expect(copy).not.toMatch(/instant answer|exact value|best neighborhood|outperforming|guaranteed value|guaranteed result|\$\d{2,}/i);
    expect(copy).toContain("no automated appraisal or guaranteed offer");
  });
});

describe("canonical /admin/distribution route guards", () => {
  const page = fs.readFileSync(path.join(root, "app/admin/distribution/page.tsx"), "utf8");
  const view = fs.readFileSync(path.join(root, "app/lib/persistence/neonGrowthIntelligenceView.ts"), "utf8");
  const manifest = fs.readFileSync(path.join(root, "config/active-route-manifest.json"), "utf8");

  it("uses the root router, canonical Neon view, and report permission", () => {
    expect(page).toContain('requireLeadCenterPermission("report:view")');
    expect(page).toContain("loadGrowthIntelligence(30)");
    expect(manifest).toContain('"/admin/distribution"');
    expect(manifest).toContain("active-protected-read-only-owned-demand-neon");
  });

  it("remains read-only and excludes test and suppressed records upstream", () => {
    expect(page).not.toContain("<form");
    expect(page).not.toContain('"use server"');
    expect(page).not.toMatch(/method:\s*["'`](POST|PUT|PATCH|DELETE)["'`]/);
    expect(view).toContain("l.is_test = false");
    expect(view).toContain("l.communication_suppressed = false");
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
