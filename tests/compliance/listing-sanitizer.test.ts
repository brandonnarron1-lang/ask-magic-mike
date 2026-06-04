import { describe, expect, it } from "vitest";
import {
  splitListing,
  sanitizeForMarketing,
  PRIVATE_FIELD_NAMES,
  PUBLIC_FIELD_NAMES,
} from "@/lib/compliance/listing-sanitizer";

const FULL_ROW = {
  id: "00000000-0000-4000-8000-000000000000",
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
  directions: "From I-95 take exit 119; turn right onto Nash St NW.",
  list_office: "Our Town Properties, Inc.",
  dom: 12,
  cdom: 12,
  taxes: 3200,
  // Private:
  agent_remarks: "Seller motivated. Will entertain reasonable offers.",
  lockbox_info: "Lockbox at front door — combo 1234",
  showing_instructions: "Call list agent",
  compensation: "2.4% co-op",
  owner_notes: "Seller working with attorney",
  internal_notes: "Confidential",
  raw_payload: { foo: "bar" },
};

describe("splitListing", () => {
  it("places every private field in the private bag", () => {
    const split = splitListing(FULL_ROW);
    for (const k of PRIVATE_FIELD_NAMES) {
      const v = (split.private as Record<string, unknown>)[k];
      expect(v, `private bag must contain ${k}`).toBeDefined();
    }
  });

  it("public bag contains only whitelisted keys", () => {
    const split = splitListing(FULL_ROW);
    for (const k of Object.keys(split.public)) {
      expect(PUBLIC_FIELD_NAMES).toContain(k);
    }
  });

  it("public bag is missing every private field name", () => {
    const split = splitListing(FULL_ROW);
    for (const priv of PRIVATE_FIELD_NAMES) {
      expect(priv in split.public, `public bag leaked ${priv}`).toBe(false);
    }
  });
});

describe("sanitizeForMarketing", () => {
  it("returns a public listing when input has only public fields", () => {
    const safe = { ...FULL_ROW } as Record<string, unknown>;
    for (const k of PRIVATE_FIELD_NAMES) delete safe[k];
    const out = sanitizeForMarketing(safe);
    expect(out.mls_number).toBe("10001234");
    expect(out.list_price).toBe(425000);
  });

  it("throws when lockbox_info is present (and no other private field)", () => {
    const leaky: Record<string, unknown> = { ...FULL_ROW };
    for (const k of PRIVATE_FIELD_NAMES) {
      if (k !== "lockbox_info") leaky[k] = null;
    }
    expect(() => sanitizeForMarketing(leaky)).toThrow(/lockbox_info/);
  });

  it("throws when agent_remarks is present (and no other private field)", () => {
    const leaky: Record<string, unknown> = { ...FULL_ROW };
    for (const k of PRIVATE_FIELD_NAMES) {
      if (k !== "agent_remarks") leaky[k] = null;
    }
    expect(() => sanitizeForMarketing(leaky)).toThrow(/agent_remarks/);
  });

  it("strips unknown keys (no passthrough of arbitrary data)", () => {
    const safe: Record<string, unknown> = { id: FULL_ROW.id };
    safe.public_remarks = "ok";
    safe.list_price = 1;
    safe.surprise = "should be dropped";
    const out = sanitizeForMarketing(safe) as Record<string, unknown>;
    expect(out.surprise).toBeUndefined();
  });
});
