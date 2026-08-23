import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAttribution } from "../../app/lib/attribution";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
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

function setPage(path: string, title: string, referrer = "") {
  const url = new URL(path, "https://www.askmagicmike.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      assign: () => {},
      replace: () => {},
      reload: () => {},
      toString: () => url.href,
    } as Location,
  });
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: referrer,
  });
  document.title = title;
}

beforeEach(() => {
  window.sessionStorage.clear();
  setPage("/", "Ask Magic Mike");
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("Black Diamond first-touch and last-touch attribution", () => {
  it("keeps the first touch immutable while a fresh tagged visit becomes the last touch", () => {
    setPage(
      "/home-value?utm_source=ourtownproperties&utm_medium=homepage_cta&utm_campaign=owned_site&utm_content=home_value",
      "Home Value | Ask Magic Mike",
      "https://www.ourtownproperties.com/",
    );
    const first = readAttribution();

    expect(first.first_touch).toMatchObject({
      source: "ourtownproperties",
      medium: "homepage_cta",
      campaign: "owned_site",
      content: "home_value",
      current_path: expect.stringContaining("/home-value?"),
      page_title: "Home Value | Ask Magic Mike",
    });

    setPage(
      "/buy?utm_source=facebook&utm_medium=social_organic&utm_campaign=buyer_plan&utm_content=buyer_post",
      "Buyer Plan | Ask Magic Mike",
      "https://www.askmagicmike.com/home-value",
    );
    const last = readAttribution();

    expect(last).toMatchObject({
      source: "facebook",
      medium: "social_organic",
      campaign: "buyer_plan",
      content: "buyer_post",
      current_path: expect.stringContaining("/buy?"),
      page_title: "Buyer Plan | Ask Magic Mike",
    });
    expect(last.first_touch).toEqual(first.first_touch);
    expect(last.last_touch).toMatchObject({
      source: "facebook",
      medium: "social_organic",
      campaign: "buyer_plan",
      content: "buyer_post",
      landing_page: expect.stringContaining("/buy?"),
      current_path: expect.stringContaining("/buy?"),
      page_title: "Buyer Plan | Ask Magic Mike",
    });
  });

  it("retains the acquired campaign on an untagged internal step while updating submission context", () => {
    setPage(
      "/rent?utm_source=google_business_profile&utm_medium=organic&utm_campaign=renter_plan",
      "Renter Plan | Ask Magic Mike",
    );
    const first = readAttribution();

    setPage("/ask", "Ask Mike | Ask Magic Mike", "https://www.askmagicmike.com/rent");
    const next = readAttribution();

    expect(next.source).toBe("google_business_profile");
    expect(next.medium).toBe("organic");
    expect(next.campaign).toBe("renter_plan");
    expect(next.first_touch).toEqual(first.first_touch);
    expect(next.last_touch).toMatchObject({
      source: "google_business_profile",
      current_path: "/ask",
      landing_page: "https://www.askmagicmike.com/ask",
      page_title: "Ask Mike | Ask Magic Mike",
    });
  });

  it("fails open when session storage is unavailable", () => {
    setPage(
      "/sell?utm_source=direct_mail&utm_medium=qr&utm_campaign=seller_review",
      "Seller Review | Ask Magic Mike",
    );
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => readAttribution()).not.toThrow();
    expect(readAttribution()).toMatchObject({
      source: "direct_mail",
      medium: "qr",
      campaign: "seller_review",
    });
  });
});
