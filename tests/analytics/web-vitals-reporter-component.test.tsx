import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webVitalsHook = vi.hoisted(() => ({
  callback: null as null | ((metric: Record<string, unknown>) => void),
}));

vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (callback: (metric: Record<string, unknown>) => void) => {
    webVitalsHook.callback = callback;
  },
}));

import { WebVitalsReporter } from "../../app/components/experience/WebVitalsReporter";

function setPage(path: string, host = "www.askmagicmike.com") {
  const url = new URL(path, `https://${host}`);
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
}

function reportLcp() {
  webVitalsHook.callback?.({
    name: "LCP",
    id: "v5-browser-metric",
    value: 1_845.237,
    rating: "good",
    navigationType: "navigate",
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  setPage("/home-value?utm_source=google&utm_medium=organic");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: true })),
  });
  Object.defineProperty(navigator, "webdriver", {
    configurable: true,
    value: false,
  });
  webVitalsHook.callback = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("WebVitalsReporter runtime boundary", () => {
  it("emits one minimized same-origin observation on a canonical public route", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebVitalsReporter />);

    reportLcp();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/events");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(String(init.body))).toEqual({
      event_name: "web_vital_observed",
      properties: {
        metric_name: "LCP",
        metric_id: "v5-browser-metric",
        metric_value: 1845.24,
        rating: "good",
        navigation_type: "navigate",
        route: "/home-value",
        device_category: "mobile",
        traffic_class: "public_production",
      },
    });
    expect(String(init.body)).not.toContain("utm_source");
    expect(String(init.body)).not.toContain("session");
    expect(String(init.body)).not.toContain("lead");
  });

  it("suppresses query-identified internal QA and remembers that classification", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setPage("/home-value?utm_source=internal_qa&utm_medium=qa");
    render(<WebVitalsReporter />);

    reportLcp();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("amm_experience_traffic_class")).toBe("internal_qa");
  });

  it("suppresses QA attribution persisted earlier in the browser session", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem("amm_attribution", JSON.stringify({
      first_touch: { source: "internal_qa" },
      last_touch: { source: "google", medium: "organic" },
    }));
    render(<WebVitalsReporter />);

    reportLcp();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suppresses noncanonical hosts, automation, and private routes", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    setPage("/home-value", "preview.vercel.app");
    render(<WebVitalsReporter />);
    reportLcp();

    setPage("/admin/leads");
    reportLcp();

    setPage("/buy");
    Object.defineProperty(navigator, "webdriver", { configurable: true, value: true });
    reportLcp();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
