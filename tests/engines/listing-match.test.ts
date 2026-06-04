import { describe, expect, it } from "vitest";
import { matchListings } from "@/lib/engines/listing-match";
import type { PublicListing } from "@/schemas/listing.schema";

function listing(over: Partial<PublicListing> = {}): PublicListing {
  return {
    id: over.id ?? "00000000-0000-4000-8000-000000000001",
    mls_number: "10001234",
    status: "active",
    address_line1: "123 Nash St NW",
    address_line2: null,
    city: "Wilson",
    county: "Wilson",
    state: "NC",
    zip: "27893",
    list_price: 425000,
    beds: 4,
    baths_full: 2,
    baths_half: 1,
    sqft: 2300,
    acres: 0.55,
    year_built: 1998,
    property_type: "single_family",
    public_remarks: "Updated home with fenced yard and finished basement.",
    directions: null,
    list_office: "Our Town Properties, Inc.",
    dom: 12,
    cdom: 12,
    taxes: 3200,
    ...over,
  };
}

describe("matchListings", () => {
  it("ranks zip + in-budget + bed/bath match highest", () => {
    const matches = matchListings(
      {
        zip: "27893",
        budgetMin: 350000,
        budgetMax: 450000,
        bedsMin: 3,
        bathsMin: 2,
        propertyType: "single_family",
      },
      [listing()]
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBeGreaterThanOrEqual(80);
    const codes = matches[0].reasons.map((r) => r.code);
    expect(codes).toContain("zip_match");
    expect(codes).toContain("in_budget");
    expect(codes).toContain("beds_match");
    expect(codes).toContain("property_type_match");
  });

  it("downranks listings way over budget", () => {
    const matches = matchListings(
      { zip: "27893", budgetMax: 200000, bedsMin: 3 },
      [listing()]
    );
    // 27893 zip matches (30) + 3+ beds (15) = 45, but price misses entirely.
    expect(matches[0].score).toBeLessThan(60);
  });

  it("gives partial credit for 1 bed short", () => {
    const matches = matchListings(
      { zip: "27893", bedsMin: 5, budgetMax: 500000 },
      [listing()] // 4 beds
    );
    const codes = matches[0].reasons.map((r) => r.code);
    expect(codes).toContain("beds_near");
  });

  it("counts soft must-have keyword hits without privileged interpretation", () => {
    const matches = matchListings(
      { zip: "27893", mustHaves: ["fenced yard", "finished basement"], budgetMax: 500000 },
      [listing()]
    );
    const r = matches[0].reasons.find((r) => r.code === "must_have_hit");
    expect(r).toBeDefined();
    expect(r?.points).toBe(2);
  });

  it("returns empty when nothing scores above 0", () => {
    const matches = matchListings(
      { zip: "99999", budgetMax: 100, bedsMin: 99 },
      [listing()]
    );
    expect(matches).toHaveLength(0);
  });
});
