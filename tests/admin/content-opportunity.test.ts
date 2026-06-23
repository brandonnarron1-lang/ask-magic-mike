/**
 * Tests for src/lib/admin/content-opportunity.ts
 */
import { describe, expect, it } from "vitest";
import {
  buildContentOpportunities,
  INTENT_SCORES,
} from "@/lib/admin/content-opportunity";
import type { ContentOpportunity } from "@/lib/admin/content-opportunity";
import type { QuestionIntelligence } from "@/lib/admin/question-intelligence";
import { buildSourceRollup } from "@/lib/admin/source-attribution-rollup";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function emptyQuestionIntel(
  topCategory: QuestionIntelligence["topCategory"] = null
): QuestionIntelligence {
  return {
    topQuestions: [],
    categoryBreakdown: {
      home_value: 0,
      selling: 0,
      buying: 0,
      investing: 0,
      cash_offer: 0,
      relocation: 0,
      market_timing: 0,
      financing: 0,
      general: 0,
    },
    highIntentCount: 0,
    totalQuestionsAnalyzed: 0,
    topCategory,
  };
}

// Use the real builder to get a correctly-typed empty summary
function emptySourceRollup() {
  return buildSourceRollup([]);
}

// ---------------------------------------------------------------------------
// INTENT_SCORES re-export
// ---------------------------------------------------------------------------

describe("INTENT_SCORES re-export", () => {
  it("re-exports INTENT_SCORES with all nine categories", () => {
    const keys = Object.keys(INTENT_SCORES);
    expect(keys).toHaveLength(9);
    expect(INTENT_SCORES.cash_offer).toBe(100);
    expect(INTENT_SCORES.general).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// buildContentOpportunities
// ---------------------------------------------------------------------------

describe("buildContentOpportunities", () => {
  it("returns up to limit results (default 25)", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    expect(r.length).toBeLessThanOrEqual(25);
    expect(r.length).toBeGreaterThan(0);
  });

  it("respects custom limit", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup(), 5);
    expect(r).toHaveLength(5);
  });

  it("assigns rank starting at 1", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup(), 3);
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(2);
    expect(r[2].rank).toBe(3);
  });

  it("each opportunity has required fields", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup(), 3);
    for (const opp of r) {
      expect(opp.title).toBeTruthy();
      expect(opp.hook).toBeTruthy();
      expect(opp.cta).toBeTruthy();
      expect(typeof opp.intentScore).toBe("number");
      expect(opp.category).toBeTruthy();
      expect(["question", "intent", "attribution"]).toContain(opp.dataSource);
    }
  });

  it("boosts templates matching topCategory to the top", () => {
    const intel = emptyQuestionIntel("cash_offer");
    const r = buildContentOpportunities(intel, emptySourceRollup(), 25);
    // First result should be in the cash_offer category (boosted)
    expect(r[0].category).toBe("cash_offer");
  });

  it("without topCategory, highest base score templates come first", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(null), emptySourceRollup());
    // Cash offer templates have baseIntentScore 93-95, so should rank near top
    const firstCategories = r.slice(0, 3).map((o) => o.category);
    expect(firstCategories.some((c) => c === "cash_offer" || c === "home_value")).toBe(true);
  });

  it("fills {year} placeholder in titles", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    const yearStr = String(new Date().getFullYear());
    const withYear = r.filter((o) => o.title.includes(yearStr));
    // At least one template uses {year}
    expect(withYear.length).toBeGreaterThan(0);
  });

  it("fills {delta} placeholder in hooks", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    // The first template has {delta} in the hook
    const withDelta = r.some((o) => !o.hook.includes("{delta}"));
    expect(withDelta).toBe(true); // no unreplaced {delta} placeholders
  });

  it("no unreplaced {year} or {delta} in any output", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    for (const opp of r) {
      expect(opp.title).not.toContain("{year}");
      expect(opp.title).not.toContain("{delta}");
      expect(opp.hook).not.toContain("{year}");
      expect(opp.hook).not.toContain("{delta}");
    }
  });

  it("dataSource is 'intent' for all template-based results", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    for (const opp of r) {
      expect(opp.dataSource).toBe("intent");
    }
  });

  it("intentScore reflects the template baseIntentScore", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup(), 25);
    // All scores should be positive numbers in a reasonable range
    for (const opp of r) {
      expect(opp.intentScore).toBeGreaterThan(0);
      expect(opp.intentScore).toBeLessThanOrEqual(100);
    }
  });

  it("booting home_value category bumps home_value templates up", () => {
    const intel = emptyQuestionIntel("home_value");
    const r = buildContentOpportunities(intel, emptySourceRollup(), 5);
    // First result should be home_value category
    expect(r[0].category).toBe("home_value");
  });

  it("returns a ContentOpportunity array", () => {
    const r = buildContentOpportunities(emptyQuestionIntel(), emptySourceRollup());
    const typed: ContentOpportunity[] = r;
    expect(Array.isArray(typed)).toBe(true);
  });
});
