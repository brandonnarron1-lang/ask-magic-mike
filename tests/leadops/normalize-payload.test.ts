/**
 * Unit tests for normalizeLeadPayload and cleanAttribution.
 *
 * Tests the Black Diamond app/lib/leadPayload.ts layer, which is separate
 * from the src/ engine-based layer tested elsewhere.
 */
import { describe, expect, it } from "vitest";
import {
  normalizeLeadPayload,
  cleanAttribution,
} from "../../app/lib/leadPayload";

// ─── normalizeLeadPayload ─────────────────────────────────────────────────────

describe("normalizeLeadPayload — funnel_type defaults", () => {
  it("defaults to home_value for unknown funnel_type", () => {
    const p = normalizeLeadPayload({ funnel_type: "unknown" });
    expect(p.funnel_type).toBe("home_value");
  });

  it("preserves seller funnel_type", () => {
    const p = normalizeLeadPayload({ funnel_type: "seller" });
    expect(p.funnel_type).toBe("seller");
  });

  it("preserves chat funnel_type", () => {
    const p = normalizeLeadPayload({ funnel_type: "chat" });
    expect(p.funnel_type).toBe("chat");
  });

  it("preserves appointment funnel_type", () => {
    const p = normalizeLeadPayload({ funnel_type: "appointment" });
    expect(p.funnel_type).toBe("appointment");
  });

  it("preserves widget funnel_type", () => {
    const p = normalizeLeadPayload({ funnel_type: "widget" });
    expect(p.funnel_type).toBe("widget");
  });
});

describe("normalizeLeadPayload — lead_source_surface defaults", () => {
  it("defaults seller funnel to seller_page surface", () => {
    const p = normalizeLeadPayload({ funnel_type: "seller" });
    expect(p.lead_source_surface).toBe("seller_page");
  });

  it("defaults chat funnel to ask_page surface", () => {
    const p = normalizeLeadPayload({ funnel_type: "chat" });
    expect(p.lead_source_surface).toBe("ask_page");
  });

  it("defaults widget funnel to widget surface", () => {
    const p = normalizeLeadPayload({ funnel_type: "widget" });
    expect(p.lead_source_surface).toBe("widget");
  });

  it("defaults unknown funnel to home_value_page surface", () => {
    const p = normalizeLeadPayload({});
    expect(p.lead_source_surface).toBe("home_value_page");
  });

  it("preserves explicit surface when valid", () => {
    const p = normalizeLeadPayload({ funnel_type: "seller", lead_source_surface: "ourtownproperties" });
    expect(p.lead_source_surface).toBe("ourtownproperties");
  });
});

describe("normalizeLeadPayload — address normalization", () => {
  it("uses address field", () => {
    const p = normalizeLeadPayload({ address: "  123 Nash St NW  " });
    expect(p.address).toBe("123 Nash St NW");
    expect(p.property_address).toBe("123 Nash St NW");
  });

  it("falls back to property_address when address missing", () => {
    const p = normalizeLeadPayload({ property_address: "456 Pine St" });
    expect(p.address).toBe("456 Pine St");
    expect(p.property_address).toBe("456 Pine St");
  });

  it("returns undefined for empty address", () => {
    const p = normalizeLeadPayload({ address: "   " });
    expect(p.address).toBeUndefined();
  });
});

describe("normalizeLeadPayload — canonical shape", () => {
  it("always sets status=new and assigned_agent_id=null", () => {
    const p = normalizeLeadPayload({ funnel_type: "home_value" });
    expect(p.status).toBe("new");
    expect(p.assigned_agent_id).toBeNull();
  });

  it("always includes attribution object", () => {
    const p = normalizeLeadPayload({});
    expect(p.attribution).toBeDefined();
    expect(typeof p.attribution).toBe("object");
  });

  it("always includes created_at", () => {
    const p = normalizeLeadPayload({});
    expect(p.created_at).toBeDefined();
    expect(new Date(p.created_at!).getTime()).not.toBeNaN();
  });

  it("trims whitespace from all string fields", () => {
    const p = normalizeLeadPayload({
      name: "  Jane Doe  ",
      email: "  jane@example.com  ",
      phone: "  (252) 555-1212  ",
    });
    expect(p.name).toBe("Jane Doe");
    expect(p.email).toBe("jane@example.com");
    expect(p.phone).toBe("(252) 555-1212");
  });

  it("sets optional fields to undefined when empty", () => {
    const p = normalizeLeadPayload({ name: "", email: "", phone: "" });
    expect(p.name).toBeUndefined();
    expect(p.email).toBeUndefined();
    expect(p.phone).toBeUndefined();
  });

  it("rejects non-string values safely", () => {
    const p = normalizeLeadPayload({ name: 42, email: null, phone: {} });
    expect(p.name).toBeUndefined();
    expect(p.email).toBeUndefined();
    expect(p.phone).toBeUndefined();
  });
});

// ─── cleanAttribution ─────────────────────────────────────────────────────────

describe("cleanAttribution — all 15 fields", () => {
  const ALL_FIELDS = {
    source: "facebook",
    medium: "paid_social",
    campaign: "seller_q3",
    content: "video_a",
    term: "wilson homes",
    referrer: "https://example.com",
    landing_page: "/value",
    initial_path: "/value?utm_source=facebook",
    current_path: "/value/confirm",
    parent_url: "https://ourtownproperties.com/",
    embed_host: "ourtownproperties.com",
    placement: "homepage-hero",
    gclid: "abc123",
    fbclid: "def456",
    device_category: "mobile",
  };

  it("preserves all 15 attribution fields", () => {
    const a = cleanAttribution(ALL_FIELDS);
    for (const [key, value] of Object.entries(ALL_FIELDS)) {
      expect(a[key as keyof typeof a]).toBe(value);
    }
  });

  it("returns empty attribution for null input", () => {
    const a = cleanAttribution(null);
    for (const key of Object.keys(ALL_FIELDS)) {
      expect(a[key as keyof typeof a]).toBeUndefined();
    }
  });

  it("returns empty attribution for non-object input", () => {
    const a = cleanAttribution("not-an-object");
    expect(a.source).toBeUndefined();
  });

  it("trims whitespace in attribution fields", () => {
    const a = cleanAttribution({ source: "  google  ", medium: "  organic  " });
    expect(a.source).toBe("google");
    expect(a.medium).toBe("organic");
  });

  it("converts empty string fields to undefined", () => {
    const a = cleanAttribution({ source: "", medium: "  ", campaign: "valid" });
    expect(a.source).toBeUndefined();
    expect(a.medium).toBeUndefined();
    expect(a.campaign).toBe("valid");
  });

  it("strips unknown extra fields — only canonical fields returned", () => {
    const a = cleanAttribution({ source: "google", UNKNOWN_FIELD: "secret", __proto__: "bad" } as Record<string, unknown>);
    expect("UNKNOWN_FIELD" in a).toBe(false);
    expect(a.source).toBe("google");
  });
});

describe("cleanAttribution — widget attribution shape", () => {
  it("preserves embed-specific fields", () => {
    const a = cleanAttribution({
      source: "widget",
      medium: "embed",
      parent_url: "https://ourtownproperties.com/",
      embed_host: "ourtownproperties.com",
      placement: "sitewide-floating",
    });
    expect(a.source).toBe("widget");
    expect(a.medium).toBe("embed");
    expect(a.parent_url).toBe("https://ourtownproperties.com/");
    expect(a.embed_host).toBe("ourtownproperties.com");
    expect(a.placement).toBe("sitewide-floating");
  });
});
