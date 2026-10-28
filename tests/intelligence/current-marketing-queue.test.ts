// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import kit from "../../public/launch-20261013/share-manifest-20261021.json";
import { resolveOwnedDemandPlacement } from "../../app/lib/growth/owned-demand";
import { CURRENT_LAUNCH_TEMPLATE, currentFortnightReviewQueue, currentLaunchWorkItem, formatFortnightReviewItem, reviewedFortnightExport } from "../../src/lib/content/reviewed-launch-work-item";
import { scanForFairHousingIssues } from "../../src/lib/compliance/fair-housing";
import nextConfig from "../../next.config";

afterEach(() => vi.unstubAllGlobals());
describe("current three-offer draft kit, not publication", () => {
  it("packages the exact server-read files only for the protected distribution function", () => {
    const includes = nextConfig.outputFileTracingIncludes!;
    expect(Object.keys(includes)).toEqual(["/admin/distribution"]);
    const files = includes["/admin/distribution"];
    expect(files).toHaveLength(7); expect(files).toContain("./public/launch-20261013/share-manifest-20261021.json");
    for (const offer of ["homeValue", "buyer", "compare"] as const) for (const channel of ["facebook", "instagram"] as const)
      expect(files).toContain(`./${currentLaunchWorkItem(offer, channel).asset}`);
  });
  it.each(["homeValue", "buyer", "compare"] as const)("binds %s to existing channel registry links and actual image bytes", offer => {
    const placement = { homeValue: "seller_review", buyer: "buyer_match", compare: "compare_selling_options" }[offer];
    for (const channel of ["facebook", "instagram"] as const) {
      const item = currentLaunchWorkItem(offer, channel);
      expect(item.version).toBe(CURRENT_LAUNCH_TEMPLATE);
      expect(item.link).toBe(resolveOwnedDemandPlacement(channel, placement)!.trackedUrl);
      expect(item.assetHash).toBe(createHash("sha256").update(readFileSync(item.asset)).digest("hex"));
      expect(item.alt).toContain("Our Town");
      expect(item.publication).toEqual({ status: "NOT_PUBLISHED", permalink: null, publishedAt: null, scheduledAt: null });
      expect(item).toMatchObject({ sends: 0, costUsd: 0, reviewer: null, proposedAt: null, customerDataIncluded: false });
      expect(new URL(item.link).searchParams.get("seller_option")).toBe(offer === "compare" ? "compare" : null);
    }
  });
  it("fails closed on changed assets, tracking links and unsupported control values", () => {
    const image = kit.images[0], hash = image.sha256;
    try { image.sha256 = "0".repeat(64); expect(() => currentLaunchWorkItem("homeValue", "facebook")).toThrow("launch_asset_changed_review_required"); }
    finally { image.sha256 = hash; }
    const link = kit.offers[0].registeredLinks[0], url = link.url;
    try { link.url = "https://untrusted.example/"; expect(() => currentLaunchWorkItem("homeValue", "facebook")).toThrow("launch_template_review_required"); }
    finally { link.url = url; }
    expect(() => currentLaunchWorkItem("unknown" as "buyer", "facebook")).toThrow("launch_template_review_required");
    expect(() => currentLaunchWorkItem("buyer", "untrusted" as "facebook")).toThrow("launch_template_review_required");
  });
  it("keeps legacy queued/exported behavior independent of the explicit successor", () => {
    const old = reviewedFortnightExport();
    expect(old).toHaveLength(14);
    expect(new Set(old.map(item => item.version))).toEqual(new Set(["amm.launch-work-item.v1"]));
    expect(old.every(item => item.link.includes("amm_seller_buyer_launch_2026"))).toBe(true);
    expect(new Set(old.map(item => item.kind))).toEqual(new Set(["seller", "buyer"]));
  });
  it("exports 14 genuine review slots with education, neutral feedback and referral holds, never fetching or sending", () => {
    const fetch = vi.fn(() => { throw Error("network_forbidden"); }); vi.stubGlobal("fetch", fetch);
    const items = currentFortnightReviewQueue();
    expect(items.map(item => item.day)).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(new Set(items.map(item => item.offer))).toEqual(new Set(["homeValue", "buyer", "compare"]));
    expect(new Set(items.map(item => item.purpose))).toEqual(new Set(["offer", "education", "reputation", "referral"]));
    expect(items.filter(item => item.reference)).toHaveLength(3);
    for (const item of items) {
      expect(scanForFairHousingIssues(item.caption).passes).toBe(true);
      expect(item.publication.scheduledAt).toBeNull(); expect(item.reviewer).toBeNull();
      expect(item.holds.join(" ")).toContain("October 15/22 posts remain unchanged");
      expect(formatFortnightReviewItem(item)).toContain("NOT SCHEDULED / NOT PUBLISHED");
      if (item.reference) {
        expect(item.reference.state).toBe("REFERENCE_ONLY_NOT_REGISTERED");
        expect(item.reference.rights).toContain("permission not established");
        expect(item.reference.reviewedAt).toBeNull();
        expect(formatFortnightReviewItem(item)).toContain(item.reference.url);
      }
    }
    const reputation = items.find(item => item.purpose === "reputation")!;
    expect(reputation.audience).toContain("without sentiment filtering");
    expect(reputation.caption).toContain("critical feedback");
    expect(reputation.holds.join(" ")).toContain("not a review/rating endpoint");
    expect(items.find(item => item.purpose === "referral")!.caption).toContain("without permission");
    expect(fetch).not.toHaveBeenCalled();
  });
});
