import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "../../app/lib/analytics";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({ matches: false, media: query }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
});

describe("client analytics privacy boundary", () => {
  it("publishes only approved dimensions to browser analytics and the server ledger", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const browser = window as Window & { dataLayer?: unknown[] };
    browser.dataLayer = [];

    trackEvent(
      "page_view",
      {
        source: "facebook",
        medium: "social_organic",
        campaign: "home_value",
        referrer: "https://example.com/?email=person@example.com",
        gclid: "raw-click-id",
        placement: "homepage",
        placement_id: "homepage-hero",
      },
      {
        funnel_name: "seller",
        arbitrary: "person@example.com",
      },
    );

    expect(browser.dataLayer).toEqual([
      {
        event: "page_view",
        properties: expect.objectContaining({
          funnel_name: "seller",
          current_path: "/",
          device_category: "desktop",
          placement: "homepage",
          placement_id: "homepage-hero",
          utm_source: "facebook",
          utm_medium: "social_organic",
          utm_campaign: "home_value",
        }),
      },
    ]);
    const browserProperties = (browser.dataLayer[0] as { properties: Record<string, unknown> }).properties;
    expect(browserProperties).not.toHaveProperty("arbitrary");
    expect(browserProperties).not.toHaveProperty("referrer");
    expect(browserProperties).not.toHaveProperty("gclid");

    const serverBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      properties: Record<string, unknown>;
      attribution: Record<string, unknown>;
    };
    expect(serverBody.properties).toEqual(
      expect.objectContaining({
        funnel_name: "seller",
        current_path: "/",
        device_category: "desktop",
        placement: "homepage",
        placement_id: "homepage-hero",
        utm_source: "facebook",
        utm_medium: "social_organic",
        utm_campaign: "home_value",
      }),
    );
    expect(serverBody.properties).not.toHaveProperty("arbitrary");
    expect(serverBody.properties).not.toHaveProperty("referrer");
    expect(serverBody.properties).not.toHaveProperty("gclid");
    expect(serverBody.attribution).toEqual({
      source: "facebook",
      medium: "social_organic",
      campaign: "home_value",
    });
  });
});
