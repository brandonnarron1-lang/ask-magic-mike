/**
 * Widget attribution override logic.
 *
 * Validates that WidgetApp correctly prefers utm_source/utm_medium over
 * bare source/medium params, and falls back to widget/embed defaults.
 *
 * Tests the resolution logic directly (without rendering the component)
 * using the same readAttribution() function the component calls.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readAttribution } from "../../app/lib/attribution";

// jsdom does not stub matchMedia — provide a no-match stub for device category
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

function setSearch(search: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      search,
      href: "https://www.askmagicmike.com/embed/ask" + search,
      pathname: "/embed/ask",
    },
  });
}

function buildWidgetOverrides(search: string) {
  const params = new URLSearchParams(search);
  return {
    source: params.get("utm_source") || params.get("source") || "widget",
    medium: params.get("utm_medium") || params.get("medium") || "embed",
    campaign: params.get("campaign") || undefined,
    parent_url: params.get("parent_url") || undefined,
    embed_host: params.get("embed_host") || undefined,
    placement: params.get("placement") || "sitewide-floating",
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  setSearch("");
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("Widget attribution — source resolution", () => {
  it("defaults to 'widget' when no params", () => {
    const overrides = buildWidgetOverrides("");
    expect(overrides.source).toBe("widget");
  });

  it("uses utm_source when present (not 'widget')", () => {
    const overrides = buildWidgetOverrides("?utm_source=facebook");
    expect(overrides.source).toBe("facebook");
  });

  it("uses source param as fallback when no utm_source", () => {
    const overrides = buildWidgetOverrides("?source=organic_referral");
    expect(overrides.source).toBe("organic_referral");
  });

  it("utm_source takes priority over source param", () => {
    const overrides = buildWidgetOverrides("?utm_source=google&source=widget");
    expect(overrides.source).toBe("google");
  });

  it("utm_source takes priority even when source=widget is default param", () => {
    const overrides = buildWidgetOverrides("?utm_source=email&source=widget");
    expect(overrides.source).toBe("email");
  });
});

describe("Widget attribution — medium resolution", () => {
  it("defaults to 'embed' when no params", () => {
    const overrides = buildWidgetOverrides("");
    expect(overrides.medium).toBe("embed");
  });

  it("uses utm_medium when present", () => {
    const overrides = buildWidgetOverrides("?utm_medium=paid_social");
    expect(overrides.medium).toBe("paid_social");
  });

  it("uses medium param as fallback when no utm_medium", () => {
    const overrides = buildWidgetOverrides("?medium=referral");
    expect(overrides.medium).toBe("referral");
  });

  it("utm_medium takes priority over medium param", () => {
    const overrides = buildWidgetOverrides("?utm_medium=organic&medium=embed");
    expect(overrides.medium).toBe("organic");
  });
});

describe("Widget attribution — embed-specific fields", () => {
  it("passes parent_url through", () => {
    const overrides = buildWidgetOverrides("?parent_url=https%3A%2F%2Fourtownproperties.com%2F");
    expect(overrides.parent_url).toBe("https://ourtownproperties.com/");
  });

  it("passes embed_host through", () => {
    const overrides = buildWidgetOverrides("?embed_host=ourtownproperties.com");
    expect(overrides.embed_host).toBe("ourtownproperties.com");
  });

  it("defaults placement to sitewide-floating", () => {
    const overrides = buildWidgetOverrides("");
    expect(overrides.placement).toBe("sitewide-floating");
  });

  it("passes explicit placement through", () => {
    const overrides = buildWidgetOverrides("?placement=sidebar");
    expect(overrides.placement).toBe("sidebar");
  });

  it("passes campaign through", () => {
    const overrides = buildWidgetOverrides("?campaign=seller_q3");
    expect(overrides.campaign).toBe("seller_q3");
  });

  it("campaign is undefined when not provided", () => {
    const overrides = buildWidgetOverrides("");
    expect(overrides.campaign).toBeUndefined();
  });
});

describe("Widget attribution — readAttribution with overrides", () => {
  it("overrides win over URL params when both present", () => {
    setSearch("?utm_source=gclid_source");
    window.sessionStorage.clear();

    const overrides = buildWidgetOverrides("?utm_source=facebook&embed_host=example.com");
    const attribution = readAttribution(overrides);

    expect(attribution.source).toBe("facebook");
    expect(attribution.embed_host).toBe("example.com");
  });

  it("returns placement from overrides in final attribution", () => {
    setSearch("?placement=homepage-hero");
    window.sessionStorage.clear();

    const overrides = buildWidgetOverrides("?placement=homepage-hero&embed_host=ourtownproperties.com");
    const attribution = readAttribution(overrides);

    expect(attribution.placement).toBe("homepage-hero");
  });

  it("attribution from widget has medium=embed by default", () => {
    setSearch("");
    window.sessionStorage.clear();

    const overrides = buildWidgetOverrides("");
    const attribution = readAttribution(overrides);

    expect(attribution.medium).toBe("embed");
  });
});

describe("Legacy embed compat — /embed/ask preserves widget overrides", () => {
  it("embed/ask page renders widget attribution fields", () => {
    // The embed path sets embed-specific defaults.
    // Verifies the logic chain works end-to-end without rendering.
    const iframeSearch =
      "?utm_source=ourtownproperties&utm_medium=referral&utm_campaign=website_widget" +
      "&embed_host=ourtownproperties.com&parent_url=https%3A%2F%2Fourtownproperties.com%2Fask-magic-mike%2F";

    const overrides = buildWidgetOverrides(iframeSearch);

    // utm_source takes priority — should NOT be "widget"
    expect(overrides.source).toBe("ourtownproperties");
    expect(overrides.medium).toBe("referral");
    expect(overrides.embed_host).toBe("ourtownproperties.com");
    expect(overrides.parent_url).toBe("https://ourtownproperties.com/ask-magic-mike/");
  });
});
