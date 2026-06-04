import { describe, expect, it } from "vitest";
import {
  scoreSellerOffer,
  type SellerSignals,
} from "@/lib/engines/seller-offer-intelligence";

function base(overrides: Partial<SellerSignals> = {}): SellerSignals {
  return {
    timeline: null,
    condition: null,
    occupancy: null,
    hasAddress: false,
    hasMotivation: false,
    hasMortgagePayoff: false,
    hasAskingPrice: false,
    preferredOutcomes: [],
    ...overrides,
  };
}

describe("scoreSellerOffer", () => {
  it("scores a vacant distressed 30-day seller as A or A+", () => {
    const r = scoreSellerOffer(
      base({
        timeline: "asap",
        condition: "distressed",
        occupancy: "vacant",
        hasAddress: true,
        hasMotivation: true,
        motivationText: "Inherited from my dad, want to settle the estate.",
        preferredOutcomes: ["fastest_close"],
      })
    );
    expect(["A+", "A"]).toContain(r.grade);
    expect(r.route).toBe("cash_offer_consult");
  });

  it("routes good-condition owner-occupied to listing_consult", () => {
    const r = scoreSellerOffer(
      base({
        timeline: "3_6_months",
        condition: "good",
        occupancy: "owner_occupied",
        hasAddress: true,
      })
    );
    expect(r.route).toBe("listing_consult");
  });

  it("routes 'compare both' when seller explicitly asks", () => {
    const r = scoreSellerOffer(
      base({
        timeline: "31_90_days",
        condition: "fair",
        occupancy: "owner_occupied",
        hasAddress: true,
        preferredOutcomes: ["compare_cash_vs_listing"],
      })
    );
    expect(r.route).toBe("compare_both_consult");
  });

  it("nurtures low-score 6+ month leads", () => {
    const r = scoreSellerOffer(
      base({
        timeline: "6_plus_months",
        occupancy: "owner_occupied",
      })
    );
    expect(r.route).toBe("nurture");
    expect(r.grade === "C" || r.grade === "D").toBe(true);
  });

  it("flags missing data so admin knows what to ask next", () => {
    const r = scoreSellerOffer(base());
    expect(r.missingData).toContain("property_address");
    expect(r.missingData).toContain("timeline");
    expect(r.missingData).toContain("condition");
  });

  it("never produces a binding-offer or guaranteed-value claim", () => {
    const r = scoreSellerOffer(
      base({
        timeline: "asap",
        condition: "distressed",
        occupancy: "vacant",
        hasAddress: true,
        preferredOutcomes: ["fastest_close"],
      })
    );
    // Customer-facing text (next-best-action + script) must be clean.
    // complianceNotes intentionally mention the banned phrases as
    // reminders to humans; they are NOT customer-facing.
    const customerFacing = `${r.nextBestAction} ${r.suggestedScript}`.toLowerCase();
    expect(customerFacing).not.toMatch(/guaranteed/);
    expect(customerFacing).not.toMatch(/instant cash offer/);
    expect(customerFacing).not.toMatch(/binding offer/);
  });

  it("docks score heavily when spam signals are high", () => {
    const clean = scoreSellerOffer(
      base({
        timeline: "0_30_days",
        condition: "needs_repairs",
        occupancy: "vacant",
        hasAddress: true,
      })
    );
    const spammy = scoreSellerOffer(
      base({
        timeline: "0_30_days",
        condition: "needs_repairs",
        occupancy: "vacant",
        hasAddress: true,
        spamScore: 60,
      })
    );
    expect(spammy.score).toBeLessThan(clean.score);
  });
});
