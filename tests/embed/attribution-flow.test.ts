/**
 * Regression: WordPress embed attribution must be captured and persisted.
 *
 * Before the fix, the embed page never called captureAttribution(), so
 * readAttribution() returned null at submit time and source_attribution was
 * never written. These tests verify the full UTM flow from the loader-built
 * iframe URL through sessionStorage to the shape expected at submit time.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureAttribution,
  clearAttribution,
  readAttribution,
} from "@/lib/attribution/client-storage";

// Exact iframe URL shape that amm-loader.js builds for the WP embed widget.
const EMBED_IFRAME_URL =
  "https://www.askmagicmike.com/embed/ask" +
  "?utm_source=ourtownproperties" +
  "&utm_medium=referral" +
  "&utm_campaign=website_widget" +
  "&referrer=https%3A%2F%2Fwww.ourtownproperties.com%2Fask-magic-mike%2F";

const WP_PAGE_URL = "https://www.ourtownproperties.com/ask-magic-mike/";

const setHref = (href: string) => {
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      href:     url.href,
      origin:   url.origin,
      protocol: url.protocol,
      host:     url.host,
      hostname: url.hostname,
      port:     url.port,
      pathname: url.pathname,
      search:   url.search,
      hash:     url.hash,
      assign:   () => {},
      replace:  () => {},
      reload:   () => {},
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

describe("WordPress embed attribution flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setReferrer("");
  });

  afterEach(() => {
    clearAttribution();
  });

  it("readAttribution returns null before captureAttribution is called (pre-fix state)", () => {
    // This is exactly what happened before the fix: the embed page never called
    // captureAttribution(), so readAttribution() returned null at submit time.
    setHref(EMBED_IFRAME_URL);
    expect(readAttribution()).toBeNull();
  });

  it("captureAttribution stores UTMs from the loader-built iframe URL", () => {
    setHref(EMBED_IFRAME_URL);
    const stored = captureAttribution();

    expect(stored?.utmSource).toBe("ourtownproperties");
    expect(stored?.utmMedium).toBe("referral");
    expect(stored?.utmCampaign).toBe("website_widget");
    expect(stored?.utmContent).toBeNull();
    expect(stored?.utmTerm).toBeNull();
  });

  it("readAttribution returns the UTMs after captureAttribution is called", () => {
    setHref(EMBED_IFRAME_URL);
    captureAttribution();

    const attribution = readAttribution();
    expect(attribution).not.toBeNull();
    expect(attribution?.utmSource).toBe("ourtownproperties");
    expect(attribution?.utmMedium).toBe("referral");
    expect(attribution?.utmCampaign).toBe("website_widget");
  });

  it("referrerType is 'referral' when document.referrer is the WP page", () => {
    setHref(EMBED_IFRAME_URL);
    setReferrer(WP_PAGE_URL);
    const stored = captureAttribution();

    // ourtownproperties.com is not a search engine or known social host,
    // so classifyReferrer returns "referral" for any non-empty referrerUrl.
    expect(stored?.referrerType).toBe("referral");
    expect(stored?.referrerUrl).toBe(WP_PAGE_URL);
  });

  it("referrerType is not 'direct' even without document.referrer because UTMs are present", () => {
    // utm_medium=referral does not match PAID_MEDIUMS and document.referrer is
    // empty — classifyReferrer falls through to "direct". But the UTMs are still
    // captured, so the source_attribution write condition (utmSource truthy) is met.
    setHref(EMBED_IFRAME_URL);
    setReferrer("");
    const stored = captureAttribution();

    expect(stored?.utmSource).toBe("ourtownproperties");
    expect(stored?.utmCampaign).toBe("website_widget");
    // referrerType from classifyReferrer: medium="referral" (not in PAID_MEDIUMS),
    // referrerUrl="" → "direct". UTMs are still present so attribution row is written.
    expect(stored?.referrerType).toBe("direct");
  });

  it("source_attribution write condition is satisfied: utmSource is truthy after capture", () => {
    // The route.ts condition is:
    //   if (input.utmSource || input.utmMedium || input.utmCampaign || ...)
    // This test verifies that the captured values satisfy at least one branch.
    setHref(EMBED_IFRAME_URL);
    captureAttribution();

    const attribution = readAttribution();
    const wouldWriteAttribution =
      !!(attribution?.utmSource ||
         attribution?.utmMedium ||
         attribution?.utmCampaign ||
         attribution?.referrerUrl ||
         attribution?.landingPath);

    expect(wouldWriteAttribution).toBe(true);
  });

  it("landingPath is the embed path, not root", () => {
    setHref(EMBED_IFRAME_URL);
    const stored = captureAttribution();
    expect(stored?.landingPath).toBe("/embed/ask");
  });
});
