import { describe, expect, it, vi } from "vitest";
import {
  NeonAnalyticsEventRepository,
  safeAnalyticsProperties,
} from "@/lib/persistence/neon/analytics-event-repository";
import {
  coarseAnalyticsUserAgent,
  safeAnalyticsDimension,
  safeAnalyticsPath,
  safePublicAnalyticsDimension,
  safePublicAnalyticsProperties,
} from "@/lib/analytics/privacy";

describe("safeAnalyticsProperties", () => {
  it("removes PII-shaped keys and non-scalar values", () => {
    expect(
      safeAnalyticsProperties({
        source: "widget",
        score: 82,
        email: "person@example.com",
        nested: { unsafe: true },
      }),
    ).toEqual({ source: "widget", score: 82 });
  });

  it("uses an allowlist and rejects sensitive values hidden under safe keys", () => {
    expect(
      safeAnalyticsProperties({
        arbitrary: "person@example.com",
        surface: "person@example.com",
        request_surface: "Sarah",
        funnel_name: "seller",
        phone: "252-555-0100",
        score: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({ funnel_name: "seller" });
  });

  it("retains a public listing identifier without accepting arbitrary identifiers", () => {
    expect(safeAnalyticsProperties({
      listingId: "7ac9db45-2eb4-49d3-93eb-f74297a3ca24",
      providerMessageId: "provider-private-id",
      routingId: "internal-routing-id",
    })).toEqual({ listingId: "7ac9db45-2eb4-49d3-93eb-f74297a3ca24" });
  });

  it("retains only event-specific public dimensions", () => {
    expect(
      safePublicAnalyticsProperties("widget_contact_submitted", {
        hasEmail: true,
        hasPhone: false,
        surface: "landing_hero",
        email: "person@example.com",
      }),
    ).toEqual({ hasEmail: true, hasPhone: false });
  });

  it("normalizes public paths and rejects unsafe attribution dimensions", () => {
    expect(safeAnalyticsPath("https://www.askmagicmike.com/home-value?utm_source=facebook"))
      .toBe("/home-value");
    expect(safeAnalyticsPath("/open-house/3106-quinn-dr")).toBe("/open-house/[property-or-id]");
    expect(safeAnalyticsPath("/admin/leads")).toBeNull();
    expect(safeAnalyticsDimension("wilson-nc-sellers")).toBe("wilson-nc-sellers");
    expect(safeAnalyticsDimension("person@example.com")).toBeNull();
    expect(safeAnalyticsDimension("252-555-0100")).toBeNull();
    expect(safePublicAnalyticsDimension("wilson-nc-sellers")).toBe("wilson-nc-sellers");
    expect(safePublicAnalyticsDimension("Sarah Johnson")).toBeNull();
    expect(safePublicAnalyticsDimension("3106 Quinn Drive")).toBeNull();
  });

  it("restricts public attribution dimensions to controlled slugs", () => {
    expect(safePublicAnalyticsProperties("page_view", {
      placement: "Sarah Johnson",
      placement_id: "open-house:listing-qa-001",
      utm_source: "facebook",
      utm_medium: "social organic",
      utm_campaign: "home_value",
    })).toEqual({
      placement_id: "open-house:listing-qa-001",
      utm_source: "facebook",
      utm_campaign: "home_value",
    });
  });

  it("stores only a coarse browser or automation class", () => {
    expect(coarseAnalyticsUserAgent("Mozilla/5.0 (iPhone) Safari/605", "mobile"))
      .toBe("browser/mobile");
    expect(coarseAnalyticsUserAgent("curl/8.7.1")).toBe("automation/desktop");
    expect(coarseAnalyticsUserAgent(null)).toBeNull();
  });
});

describe("NeonAnalyticsEventRepository", () => {
  it("writes a parameterized, privacy-minimized event", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new NeonAnalyticsEventRepository({ query });

    await expect(
      repository.record({
        eventName: "lead_created",
        eventCategory: "intake",
        leadId: "8de9e7cb-bd11-4f49-a5c7-e5b6d6abf598",
        properties: { source: "wordpress", phone: "252-555-0100" },
      }),
    ).resolves.toBe(true);

    expect(query).toHaveBeenCalledOnce();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO public.analytics_events");
    expect(sql).toContain("$1::uuid");
    expect(params[1]).toBe("8de9e7cb-bd11-4f49-a5c7-e5b6d6abf598");
    expect(params[5]).toBe(JSON.stringify({ source: "wordpress" }));
  });

  it("rejects invalid event names before querying", async () => {
    const query = vi.fn();
    const repository = new NeonAnalyticsEventRepository({ query });
    await expect(
      repository.record({ eventName: "INVALID EVENT" }),
    ).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("minimizes attribution and user-agent again at the durable write boundary", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new NeonAnalyticsEventRepository({ query });

    await repository.record({
      eventName: "page_view",
      properties: { funnel_name: "seller", device_category: "mobile" },
      utmSource: "person@example.com",
      utmMedium: "social_organic",
      utmCampaign: "home_value",
      userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15",
    });

    const params = query.mock.calls[0][1];
    expect(params[6]).toBeNull();
    expect(params[7]).toBe("social_organic");
    expect(params[8]).toBe("home_value");
    expect(params[9]).toBe("browser/mobile");
  });
});
