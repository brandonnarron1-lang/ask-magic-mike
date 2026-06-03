import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendUtmsToParams,
  captureAttribution,
  clearAttribution,
  readAttribution,
} from "@/lib/attribution/client-storage";

const setHref = (href: string) => {
  // jsdom doesn't let us reassign window.location.href directly without a real
  // navigation, so swap the whole location with a real URL object.
  const url = new URL(href);
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
};

const setReferrer = (referrer: string) => {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: referrer,
  });
};

describe("client-storage attribution", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setHref("https://ask-magic-mike.vercel.app/value");
    setReferrer("");
  });

  afterEach(() => {
    clearAttribution();
  });

  it("captures UTMs from URL into sessionStorage", () => {
    setHref(
      "https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike"
    );
    const captured = captureAttribution();
    expect(captured?.utmSource).toBe("ourtown_wp");
    expect(captured?.utmMedium).toBe("homepage_cta");
    expect(captured?.utmCampaign).toBe("ask_magic_mike");
    expect(captured?.landingPath).toBe("/value");
    expect(captured?.landingUrl).toContain("/value?utm_source=ourtown_wp");

    const persisted = readAttribution();
    expect(persisted?.utmSource).toBe("ourtown_wp");
    expect(persisted?.utmCampaign).toBe("ask_magic_mike");
  });

  it("preserves first-touch attribution when no fresh UTMs are present", () => {
    setHref(
      "https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=mike_profile&utm_campaign=ask_magic_mike"
    );
    const first = captureAttribution();
    expect(first?.utmMedium).toBe("mike_profile");

    // Simulate a navigation to /ask with no UTMs in the URL.
    setHref("https://ask-magic-mike.vercel.app/ask?q=hello");
    const second = captureAttribution();
    expect(second?.utmSource).toBe("ourtown_wp");
    expect(second?.utmMedium).toBe("mike_profile");
    expect(second?.firstSeenAt).toBe(first?.firstSeenAt);
  });

  it("replaces attribution when fresh UTMs are present", () => {
    setHref(
      "https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike"
    );
    captureAttribution();
    setHref(
      "https://ask-magic-mike.vercel.app/value?utm_source=ourtown_wp&utm_medium=seller_page_cta&utm_campaign=ask_magic_mike"
    );
    const next = captureAttribution();
    expect(next?.utmMedium).toBe("seller_page_cta");
  });

  it("returns null landing referrer for direct visits", () => {
    setHref("https://ask-magic-mike.vercel.app/value");
    const captured = captureAttribution();
    expect(captured?.utmSource).toBeNull();
    expect(captured?.referrerType).toBe("direct");
    expect(captured?.referrerUrl).toBeNull();
  });

  it("appends UTMs to URLSearchParams without clobbering existing values", () => {
    const params = new URLSearchParams({ q: "hello", utm_source: "manual" });
    appendUtmsToParams(params, {
      utmSource:   "ourtown_wp",
      utmMedium:   "homepage_cta",
      utmCampaign: "ask_magic_mike",
      utmContent:  null,
      utmTerm:     null,
    });
    expect(params.get("utm_source")).toBe("manual");
    expect(params.get("utm_medium")).toBe("homepage_cta");
    expect(params.get("utm_campaign")).toBe("ask_magic_mike");
    expect(params.get("utm_content")).toBeNull();
  });

  it("appendUtmsToParams is a no-op when attribution is null", () => {
    const params = new URLSearchParams({ q: "hello" });
    appendUtmsToParams(params, null);
    expect(params.toString()).toBe("q=hello");
  });
});
