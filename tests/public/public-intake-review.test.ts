import { describe, expect, it } from "vitest";
import { buyerHasQaMarkers, buyerReviewFingerprint, isSafeListingReference, readBuyerForm } from "../../app/lib/client/publicIntakeReview";

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ "buyer-name": "SYNTHETIC | INTERNAL QA | DO NOT CONTACT", "buyer-email": "fixture@example.test", "buyer-address": "101 Synthetic Fixture Road", ...extra })) data.set(key, value);
  return data;
}

describe("native buyer review snapshot (pure, no lookup or network)", () => {
  it("captures one specific property, trims text and retains native contact/consent", () => {
    const snapshot = readBuyerForm(form({ "buyer-address": " 101 Synthetic Fixture Road ", "buyer-unit": " Unit 4 ", "buyer-reference": " SYNTHETIC-17 ", consent: "yes" }), "buyer", "specific");
    expect(snapshot.buyerInterest).toEqual({ version: 1, kind: "specific", properties: [{ address_text: "101 Synthetic Fixture Road", unit: "Unit 4", reference: "SYNTHETIC-17" }] });
    expect(snapshot.consent).toBe(true);
  });
  it("requires address OR URL, never an empty property", () => {
    expect(() => readBuyerForm(form({ "buyer-address": "" }), "buyer", "specific")).toThrow("Add the property's address or a listing URL.");
    expect(readBuyerForm(form({ "buyer-address": "", "buyer-listing-url": "https://listing.example.test/17" }), "buyer", "specific").buyerInterest).toMatchObject({ kind: "specific", properties: [{ listing_url: "https://listing.example.test/17" }] });
  });
  it("captures search independently from the residential or property address", () => {
    const snapshot = readBuyerForm(form({ "buyer-desired-area": "Wilson", "buyer-budget": "Approx. 250–350k" }), "buyer", "search");
    expect(snapshot.buyerInterest).toEqual({ version: 1, kind: "search", desired_area: "Wilson", budget_range: "Approx. 250–350k" });
    expect(snapshot).not.toHaveProperty("address");
  });
  it("requires desired area and omits a blank optional budget", () => {
    expect(() => readBuyerForm(form(), "buyer", "search")).toThrow("Add the area where you would like to buy.");
    expect(readBuyerForm(form({ "buyer-desired-area": "Wilson", "buyer-budget": " " }), "buyer", "search").buyerInterest).toEqual({ version: 1, kind: "search", desired_area: "Wilson" });
  });
  it.each([
    ["buyer-address", 500, "specific"], ["buyer-unit", 100, "specific"],
    ["buyer-reference", 160, "specific"], ["buyer-desired-area", 500, "search"],
    ["buyer-budget", 160, "search"],
  ] as const)("keeps the exact %s bound %i", (field, maximum, kind) => {
    const extra = { "buyer-desired-area": "Wilson", [field]: "x".repeat(maximum) };
    expect(() => readBuyerForm(form(extra), "buyer", kind)).not.toThrow();
    expect(() => readBuyerForm(form({ ...extra, [field]: "x".repeat(maximum + 1) }), "buyer", kind)).toThrow("Keep this entry within " + maximum + " characters.");
  });
  it("accepts a URL at the 2048 limit but not beyond it", () => {
    const prefix = "https://listing.example.test/";
    const url = prefix + "x".repeat(2048 - prefix.length);
    expect(isSafeListingReference(url)).toBe(true);
    expect(isSafeListingReference(url + "x")).toBe(false);
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "/relative", "https:listing.example.test", "https:/listing.example.test", "https://user:password@listing.example.test/17", "https://listing.example.test/a b", "https://listing.example.test/a\\b", "https://listing.example.test/\n17"])("rejects unsafe reference %s without fetching it", value => {
    expect(isSafeListingReference(value)).toBe(false);
  });
  it.each(["https://listing.example.test/17?ref=fixture", "http://listing.example.test/17"])("accepts reference-only %s", value => {
    expect(isSafeListingReference(value)).toBe(true);
  });
  it("shares strict control-character validation with the pure server model", () => {
    expect(() => readBuyerForm(form({ "buyer-unit": "Unit\u0000four" }), "buyer", "specific")).toThrow("Use plain text without control characters.");
  });
  it("permits phone-only, rejects a malformed supplied second channel, and never defaults consent", () => {
    const snapshot = readBuyerForm(form({ "buyer-email": "", "buyer-phone": "+12025550194" }), "buyer", "specific");
    expect(snapshot.email).toBe(""); expect(snapshot.consent).toBe(false);
    expect(() => readBuyerForm(form({ "buyer-phone": "252" }), "buyer", "specific")).toThrow("Enter a phone number with area code.");
    expect(() => readBuyerForm(form({ "buyer-email": "broken", "buyer-phone": "+12025550194" }), "buyer", "specific")).toThrow("Enter a valid email address.");
  });
  it.each(["renter", "open_house"] as const)("retains the legacy %s shape with optional name and area", preset => {
    const snapshot = readBuyerForm(form({ "buyer-name": "", "buyer-area": "Wilson", "buyer-financing": "Cash", "buyer-preapproval": "yes" }), preset, "specific");
    expect(snapshot).toMatchObject({ name: "", area: "Wilson", financing: "Cash", preapproval: true });
    expect(snapshot).not.toHaveProperty("buyerInterest");
  });
  it("detects native changes in the in-memory fingerprint, including consent", () => {
    const first = readBuyerForm(form(), "buyer", "specific");
    expect(buyerReviewFingerprint(first)).not.toBe(buyerReviewFingerprint({ ...first, consent: true }));
    expect(buyerReviewFingerprint(first)).not.toBe(buyerReviewFingerprint({ ...first, phone: "+12025550194" }));
  });
  it("uses existing name/question QA markers, not listing-derived or area-derived classifications", () => {
    expect(buyerHasQaMarkers(readBuyerForm(form(), "buyer", "specific"))).toBe(true);
    expect(buyerHasQaMarkers(readBuyerForm(form({ "buyer-name": "Synthetic Fixture", "buyer-address": "INTERNAL QA | DO NOT CONTACT" }), "buyer", "specific"))).toBe(false);
  });
});
