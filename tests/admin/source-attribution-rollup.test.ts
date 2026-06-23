/**
 * Tests for src/lib/admin/source-attribution-rollup.ts
 */
import { describe, expect, it } from "vitest";
import {
  normalizePlatform,
  buildSourceRollup,
} from "@/lib/admin/source-attribution-rollup";
import type { AttrInputRow } from "@/lib/admin/source-attribution-rollup";

function makeAttr(
  utm_source: string | null,
  referrer_type: string | null = null,
  utm_medium: string | null = null,
  is_paid: boolean | null = false
): AttrInputRow {
  return { utm_source, utm_medium, referrer_type, is_paid };
}

// ---------------------------------------------------------------------------
// normalizePlatform
// ---------------------------------------------------------------------------

describe("normalizePlatform", () => {
  it("normalizes 'facebook' → Facebook", () => {
    expect(normalizePlatform("facebook", null)).toBe("Facebook");
  });

  it("normalizes 'facebook_page' → Facebook", () => {
    expect(normalizePlatform("facebook_page", null)).toBe("Facebook");
  });

  it("normalizes 'facebook_group' → Facebook", () => {
    expect(normalizePlatform("facebook_group", null)).toBe("Facebook");
  });

  it("normalizes 'fb' → Facebook", () => {
    expect(normalizePlatform("fb", null)).toBe("Facebook");
  });

  it("normalizes 'instagram' → Instagram", () => {
    expect(normalizePlatform("instagram", null)).toBe("Instagram");
  });

  it("normalizes 'ig' → Instagram", () => {
    expect(normalizePlatform("ig", null)).toBe("Instagram");
  });

  it("normalizes 'threads' → Threads", () => {
    expect(normalizePlatform("threads", null)).toBe("Threads");
  });

  it("normalizes 'linkedin' → LinkedIn", () => {
    expect(normalizePlatform("linkedin", null)).toBe("LinkedIn");
  });

  it("normalizes 'li' → LinkedIn", () => {
    expect(normalizePlatform("li", null)).toBe("LinkedIn");
  });

  it("normalizes 'x' → X / Twitter", () => {
    expect(normalizePlatform("x", null)).toBe("X / Twitter");
  });

  it("normalizes 'twitter' → X / Twitter", () => {
    expect(normalizePlatform("twitter", null)).toBe("X / Twitter");
  });

  it("normalizes 'youtube' → YouTube", () => {
    expect(normalizePlatform("youtube", null)).toBe("YouTube");
  });

  it("normalizes 'yt' → YouTube", () => {
    expect(normalizePlatform("yt", null)).toBe("YouTube");
  });

  it("normalizes 'email' → Email", () => {
    expect(normalizePlatform("email", null)).toBe("Email");
  });

  it("normalizes 'qr' → QR Code", () => {
    expect(normalizePlatform("qr", null)).toBe("QR Code");
  });

  it("normalizes 'website_widget' → Website Widget", () => {
    expect(normalizePlatform("website_widget", null)).toBe("Website Widget");
  });

  it("normalizes 'google' → Google", () => {
    expect(normalizePlatform("google", null)).toBe("Google");
  });

  it("normalizes 'direct' → Direct", () => {
    expect(normalizePlatform("direct", null)).toBe("Direct");
  });

  it("returns Direct for null source and null referrer_type", () => {
    expect(normalizePlatform(null, null)).toBe("Direct");
  });

  it("falls back to referrer_type 'social' → Facebook", () => {
    expect(normalizePlatform(null, "social")).toBe("Facebook");
  });

  it("falls back to referrer_type 'organic' → Organic Search", () => {
    expect(normalizePlatform(null, "organic")).toBe("Organic Search");
  });

  it("falls back to referrer_type 'email' → Email", () => {
    expect(normalizePlatform(null, "email")).toBe("Email");
  });

  it("falls back to referrer_type 'direct' → Direct", () => {
    expect(normalizePlatform(null, "direct")).toBe("Direct");
  });

  it("falls back to referrer_type 'paid' → Google", () => {
    expect(normalizePlatform(null, "paid")).toBe("Google");
  });

  it("is case-insensitive for utm_source", () => {
    expect(normalizePlatform("FACEBOOK", null)).toBe("Facebook");
    expect(normalizePlatform("Facebook", null)).toBe("Facebook");
  });

  it("returns Other for unknown source", () => {
    expect(normalizePlatform("unknown_network_xyz", null)).toBe("Other");
  });
});

// ---------------------------------------------------------------------------
// buildSourceRollup
// ---------------------------------------------------------------------------

describe("buildSourceRollup", () => {
  it("returns empty summary for no rows", () => {
    const r = buildSourceRollup([]);
    expect(r.topPlatform).toBeNull();
    expect(r.organicCount).toBe(0);
    expect(r.paidCount).toBe(0);
    expect(r.socialCount).toBe(0);
    expect(r.directCount).toBe(0);
    expect(r.rows).toHaveLength(0);
  });

  it("counts platforms correctly", () => {
    const rows = [
      makeAttr("facebook"),
      makeAttr("facebook"),
      makeAttr("google"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.byPlatform["Facebook"]).toBe(2);
    expect(r.byPlatform["Google"]).toBe(1);
  });

  it("identifies topPlatform as the platform with most leads", () => {
    const rows = [
      makeAttr("instagram"),
      makeAttr("instagram"),
      makeAttr("instagram"),
      makeAttr("facebook"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.topPlatform).toBe("Instagram");
  });

  it("counts social platform leads in socialCount", () => {
    const rows = [
      makeAttr("facebook"),
      makeAttr("instagram"),
      makeAttr("linkedin"),
      makeAttr("google"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.socialCount).toBe(3);
  });

  it("counts organic search in organicCount", () => {
    const rows = [
      makeAttr("google"),
      makeAttr("bing"),
      makeAttr(null, "organic"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.organicCount).toBe(3);
  });

  it("counts direct/QR in directCount", () => {
    const rows = [
      makeAttr("direct"),
      makeAttr("qr"),
      makeAttr(null, "direct"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.directCount).toBe(3);
  });

  it("normalizes facebook variants to same platform bucket", () => {
    const rows = [
      makeAttr("facebook"),
      makeAttr("facebook_page"),
      makeAttr("facebook_group"),
      makeAttr("fb"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.byPlatform["Facebook"]).toBe(4);
  });

  it("rows are sorted by count descending", () => {
    const rows = [
      makeAttr("google"),
      makeAttr("facebook"),
      makeAttr("facebook"),
      makeAttr("facebook"),
    ];
    const r = buildSourceRollup(rows);
    expect(r.rows[0].platform).toBe("Facebook");
    expect(r.rows[0].count).toBe(3);
  });

  it("marks paid rows when is_paid=true", () => {
    const rows = [
      makeAttr("google", "paid", "cpc", true),
      makeAttr("google", null, null, false),
    ];
    const r = buildSourceRollup(rows);
    const googlePaidRow = r.rows.find((row) => row.isPaid);
    expect(googlePaidRow).toBeDefined();
  });
});
