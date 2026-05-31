import { describe, it, expect } from "vitest";
import { parseAttribution, parseAttributionFromUrl } from "@/lib/attribution/utm-parser";

describe("parseAttribution", () => {
  it("parses all UTM params from URLSearchParams", () => {
    const params = new URLSearchParams(
      "utm_source=google&utm_medium=cpc&utm_campaign=gainesville-homes&utm_content=ad1&utm_term=sell+my+home"
    );
    const result = parseAttribution(params, "", "/");
    expect(result.utmSource).toBe("google");
    expect(result.utmMedium).toBe("cpc");
    expect(result.utmCampaign).toBe("gainesville-homes");
    expect(result.utmContent).toBe("ad1");
    expect(result.utmTerm).toBe("sell my home"); // URLSearchParams decodes + as space
    expect(result.referrerType).toBe("paid");
  });

  it("returns null for missing UTM params", () => {
    const params = new URLSearchParams("");
    const result = parseAttribution(params, "", "/");
    expect(result.utmSource).toBeNull();
    expect(result.utmMedium).toBeNull();
  });

  it("classifies Google referrer without UTM as organic", () => {
    const result = parseAttribution(
      new URLSearchParams(""),
      "https://www.google.com/search?q=gainesville+real+estate",
      "/"
    );
    expect(result.referrerType).toBe("organic");
  });

  it("classifies Facebook referrer as social", () => {
    const result = parseAttribution(
      new URLSearchParams(""),
      "https://www.facebook.com/feed",
      "/"
    );
    expect(result.referrerType).toBe("social");
  });

  it("classifies empty referrer as direct", () => {
    const result = parseAttribution(new URLSearchParams(""), "", "/");
    expect(result.referrerType).toBe("direct");
  });

  it("strips HTML tags from UTM values (XSS safety)", () => {
    const params = new URLSearchParams(
      "utm_source=<script>alert(1)</script>"
    );
    const result = parseAttribution(params, "", "/");
    expect(result.utmSource).toBe("alert(1)");
  });

  it("truncates UTM values longer than 200 chars", () => {
    const longValue = "a".repeat(300);
    const params = new URLSearchParams(`utm_source=${longValue}`);
    const result = parseAttribution(params, "", "/");
    expect(result.utmSource!.length).toBeLessThanOrEqual(200);
  });

  it("classifies utm_medium=email as email type", () => {
    const params = new URLSearchParams("utm_medium=email");
    const result = parseAttribution(params, "", "/");
    expect(result.referrerType).toBe("email");
  });
});

describe("parseAttributionFromUrl", () => {
  it("parses a full URL with UTM params", () => {
    const result = parseAttributionFromUrl(
      "https://askmagicmike.com/?utm_source=google&utm_medium=cpc&utm_campaign=test"
    );
    expect(result.utmSource).toBe("google");
    expect(result.utmMedium).toBe("cpc");
    expect(result.utmCampaign).toBe("test");
  });

  it("returns direct defaults for invalid URL", () => {
    const result = parseAttributionFromUrl("not-a-url");
    expect(result.referrerType).toBe("direct");
    expect(result.utmSource).toBeNull();
  });
});
