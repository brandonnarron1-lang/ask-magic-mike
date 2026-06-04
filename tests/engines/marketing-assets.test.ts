import { describe, expect, it } from "vitest";
import { MarketingAssetEngine } from "@/lib/engines/marketing-assets";
import { PRIVATE_FIELD_NAMES } from "@/lib/compliance/listing-sanitizer";

const PUBLIC_LISTING = {
  id: "11111111-1111-4111-8111-111111111111",
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
  public_remarks: "Updated home in established neighborhood.",
  directions: null,
  list_office: "Our Town Properties, Inc.",
  dom: 12,
  cdom: 12,
  taxes: 3200,
};

describe("MarketingAssetEngine", () => {
  const engine = new MarketingAssetEngine();

  it("generates SMS that includes address + price + opt-out footer", () => {
    const out = engine.generate({ listing: PUBLIC_LISTING, channel: "sms" });
    expect(out.body).toContain("123 Nash St NW");
    expect(out.body).toContain("425,000");
    expect(out.body).toContain("Reply STOP");
    expect(out.fairHousingPassed).toBe(true);
  });

  it("never includes any private field name in generated body", () => {
    const out = engine.generate({ listing: PUBLIC_LISTING, channel: "email" });
    for (const k of PRIVATE_FIELD_NAMES) {
      expect(out.body.toLowerCase()).not.toContain(k);
    }
  });

  it("refuses to generate when the input still carries private fields", () => {
    const leaky = { ...PUBLIC_LISTING, lockbox_info: "1234 combo" };
    expect(() =>
      engine.generate({ listing: leaky, channel: "sms" })
    ).toThrow(/lockbox_info/);
  });

  it("flags fair-housing issues if a remark contains 'ideal for a family'", () => {
    const leaky = {
      ...PUBLIC_LISTING,
      public_remarks: "Ideal for a Christian family. Empty nesters preferred.",
    };
    const out = engine.generate({ listing: leaky, channel: "email" });
    expect(out.fairHousingPassed).toBe(false);
    expect(out.fairHousingFindings.length).toBeGreaterThan(0);
  });

  it("records sourceFields so admins know which fields fed generation", () => {
    const out = engine.generate({ listing: PUBLIC_LISTING, channel: "social_post" });
    expect(out.sourceFields).toContain("address_line1");
    expect(out.sourceFields).toContain("list_price");
  });
});
