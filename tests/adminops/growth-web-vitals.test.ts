import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeGrowthWebVitals } from "../../app/lib/persistence/neonGrowthIntelligenceView";

describe("field-experience growth view", () => {
  it("normalizes aggregate-only P75 evidence by metric and device", () => {
    const snapshot = normalizeGrowthWebVitals([
      { metric_name: "LCP", device_category: "all", p75: 2200, sample_size: 120 },
      { metric_name: "LCP", device_category: "mobile", p75: 2450, sample_size: 75 },
      { metric_name: "LCP", device_category: "desktop", p75: 1700, sample_size: 45 },
      { metric_name: "INP", device_category: "all", p75: 180, sample_size: 82 },
      { metric_name: "CLS", device_category: "all", p75: 0.08, sample_size: 90 },
    ], true);

    expect(snapshot).toMatchObject({
      configured: true,
      lcp: {
        p75: 2200,
        sampleSize: 120,
        mobileP75: 2450,
        mobileSampleSize: 75,
        desktopP75: 1700,
        desktopSampleSize: 45,
      },
      inp: { p75: 180, sampleSize: 82 },
      cls: { p75: 0.08, sampleSize: 90 },
    });
  });

  it("keeps missing or failed evidence unavailable instead of manufacturing zero performance", () => {
    expect(normalizeGrowthWebVitals([], true).lcp).toMatchObject({ p75: null, sampleSize: 0 });
    expect(normalizeGrowthWebVitals([], true, "query failed")).toMatchObject({
      configured: false,
      error: "query failed",
      lcp: { p75: null, sampleSize: 0 },
    });
  });

  it("uses a bounded, deduplicated aggregate and renders truthful sample maturity", () => {
    const root = process.cwd();
    const view = fs.readFileSync(
      path.join(root, "app/lib/persistence/neonGrowthIntelligenceView.ts"),
      "utf8",
    );
    const page = fs.readFileSync(path.join(root, "app/admin/growth/page.tsx"), "utf8");
    expect(view).toContain("SELECT DISTINCT ON (metric_name, metric_id)");
    expect(view).toContain("LIMIT 25000");
    expect(view).toContain("GROUP BY GROUPING SETS");
    expect(view).toContain("public_production");
    expect(view).toContain("browser/(mobile|desktop)");
    expect(page).toContain("Real-user conversion performance");
    expect(page).toContain("No synthetic performance value is displayed.");
    expect(page).toContain("not a formal Core Web Vitals, accessibility");
  });
});
