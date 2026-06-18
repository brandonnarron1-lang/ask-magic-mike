import { describe, it, expect } from "vitest";
import { classifyReferrer } from "@/lib/attribution/referrer-classifier";

describe("classifyReferrer", () => {
  it("classifies cpc medium as paid", () => {
    expect(classifyReferrer("", "cpc")).toBe("paid");
  });

  it("classifies ppc medium as paid", () => {
    expect(classifyReferrer("", "ppc")).toBe("paid");
  });

  it("classifies display medium as paid", () => {
    expect(classifyReferrer("", "display")).toBe("paid");
  });

  it("classifies email medium as email", () => {
    expect(classifyReferrer("https://example.com", "email")).toBe("email");
  });

  it("classifies Google referrer with no UTM as organic", () => {
    expect(classifyReferrer("https://www.google.com/search?q=wilson+nc+homes", null)).toBe("organic");
  });

  it("classifies Bing referrer with no UTM as organic", () => {
    expect(classifyReferrer("https://www.bing.com/search?q=wilson+nc+real+estate", null)).toBe("organic");
  });

  it("classifies Facebook referrer as social", () => {
    expect(classifyReferrer("https://www.facebook.com/ads/something", null)).toBe("social");
  });

  it("classifies Instagram referrer as social", () => {
    expect(classifyReferrer("https://www.instagram.com/p/abc123", null)).toBe("social");
  });

  it("classifies unknown external referrer as referral", () => {
    expect(classifyReferrer("https://someblog.com/article", null)).toBe("referral");
  });

  it("classifies empty referrer with no UTM as direct", () => {
    expect(classifyReferrer("", null)).toBe("direct");
  });

  it("paid medium overrides organic search referrer", () => {
    expect(classifyReferrer("https://www.google.com/search", "cpc")).toBe("paid");
  });

  it("paid_social medium (underscore variant) is classified as paid", () => {
    // utm_medium=paid_social is a common GA export variant — must match PAID_MEDIUMS
    expect(classifyReferrer("https://www.facebook.com/feed", "paid_social")).toBe("paid");
  });

  it("paid-social medium (hyphen variant) is classified as paid", () => {
    expect(classifyReferrer("", "paid-social")).toBe("paid");
  });

  it("paid_search medium (underscore variant) is classified as paid", () => {
    expect(classifyReferrer("https://www.google.com/search", "paid_search")).toBe("paid");
  });
});
