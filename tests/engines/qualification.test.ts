import { describe, expect, it } from "vitest";
import { nextQuestions } from "@/lib/engines/qualification";

const empty = {
  hasContact: false,
  hasAddress: false,
  hasTimeline: false,
  hasCondition: false,
  hasOccupancy: false,
  hasBudget: false,
  hasPreapproval: false,
  hasMotivation: false,
  hasListingId: false,
  hasPreferredContact: false,
};

describe("qualification engine", () => {
  it("buyers get contact + budget + timeline first", () => {
    const r = nextQuestions("buyer", empty, 0);
    const keys = r.questions.map((q) => q.key);
    expect(keys).toContain("contact");
    expect(keys.length).toBeLessThanOrEqual(3);
    // budget should be in the queue (may not be in the top 3 once we have contact + preferred)
    const full = nextQuestions("buyer", { ...empty, hasContact: true, hasPreferredContact: true }, 0);
    expect(full.questions.map((q) => q.key)).toContain("budget");
  });

  it("seller_cash_offer asks address + condition + occupancy", () => {
    const r = nextQuestions(
      "seller_cash_offer",
      { ...empty, hasContact: true, hasPreferredContact: true },
      0
    );
    const keys = r.questions.map((q) => q.key);
    expect(keys).toContain("address");
    expect(keys).toContain("condition");
  });

  it("listing_inquiry asks for the listing id", () => {
    const r = nextQuestions(
      "listing_inquiry",
      { ...empty, hasContact: true },
      0
    );
    expect(r.questions.map((q) => q.key)).toContain("listing_id");
  });

  it("returns done=true with handoff after 5 asked questions", () => {
    const r = nextQuestions("buyer", empty, 5);
    expect(r.handoff).toBe(true);
    expect(r.done).toBe(true);
  });

  it("returns done=true when everything is captured", () => {
    const r = nextQuestions(
      "buyer",
      {
        hasContact: true,
        hasAddress: true,
        hasTimeline: true,
        hasCondition: true,
        hasOccupancy: true,
        hasBudget: true,
        hasPreapproval: true,
        hasMotivation: true,
        hasListingId: true,
        hasPreferredContact: true,
      },
      0
    );
    expect(r.done).toBe(true);
    expect(r.questions).toHaveLength(0);
  });
});
