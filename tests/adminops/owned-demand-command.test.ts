import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOwnedDemandCommand } from "../../app/lib/growth/owned-demand";
import type { GrowthChannelEconomics, GrowthSummary } from "../../app/lib/growth/intelligence";

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
    runningExperiments: 0,
    ...overrides,
  };
}

function channel(source: string, leads: number): GrowthChannelEconomics {
  return {
    key: `${source}:organic:amm_owned_demand_2026`,
    source,
    medium: "organic",
    campaign: "amm_owned_demand_2026",
    paid: false,
    leads,
    qualified: 0,
    appointments: 0,
    closes: 0,
    spendUsd: 0,
    attributedRevenueUsd: 0,
    impressions: 0,
    clicks: 0,
    platformLeads: 0,
    costPerLead: null,
    costPerQualifiedLead: null,
    costPerAppointment: null,
    costPerClose: null,
    returnOnAdSpend: null,
    leadToQualifiedRate: 0,
    leadToAppointmentRate: 0,
    leadToCloseRate: 0,
    qualityScore: 0,
    confidence: 0,
    flags: [],
  };
}

describe("Owned Demand Command", () => {
  it("identifies activation as the bottleneck when no eligible live leads exist", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), channels: [] }, new Date("2026-08-19T12:00:00Z"));
    expect(result.measurementState).toBe("no_live_signal");
    expect(result.attributedLiveLeads).toBe(0);
    expect(result.bottleneck).toContain("owned-demand activation");
    expect(result.channels.every((row) => row.status === "ready_unmeasured")).toBe(true);
  });

  it("counts only matching canonical source signals without inferring publication", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 4, attributedLeadRate: 100 }),
      channels: [channel("facebook", 2), channel("gbp", 1), channel("portal", 1)],
    });
    expect(result.attributedLiveLeads).toBe(3);
    expect(result.channels.find((row) => row.key === "facebook")?.attributedLeads).toBe(2);
    expect(result.channels.find((row) => row.key === "google_business_profile")?.attributedLeads).toBe(1);
    expect(result.operatorBoundary).toContain("never publishes");
  });

  it("does not call unrelated attributed demand a measured owned-channel signal", () => {
    const result = buildOwnedDemandCommand({
      summary: summary({ leads: 3, attributedLeadRate: 100 }),
      channels: [channel("portal", 3)],
    });
    expect(result.attributedLiveLeads).toBe(0);
    expect(result.measurementState).toBe("no_live_signal");
    expect(result.bottleneck).toContain("no lead is attributed to an owned-demand placement");
  });

  it("creates canonical lowercase UTM links for every manual channel", () => {
    const result = buildOwnedDemandCommand({ summary: summary(), channels: [] });
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
    const result = buildOwnedDemandCommand({ summary: summary(), channels: [] });
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

  it("contains wide tables on mobile", () => {
    expect(page).toContain('className="min-w-0 rounded-2xl');
    expect(page).toContain('className="min-w-[760px]');
    expect(page).toContain("break-all");
  });
});
