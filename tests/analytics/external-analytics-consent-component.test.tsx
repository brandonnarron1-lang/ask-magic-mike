import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/home-value" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import {
  AnalyticsPreferencesButton,
  ExternalAnalyticsConsentManager,
} from "../../app/components/analytics/ExternalAnalyticsConsent";
import {
  EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY,
  EXTERNAL_ANALYTICS_SCRIPT_ID,
} from "../../app/lib/externalAnalytics";
import { OUR_TOWN_GTM_CONTAINER_ID } from "../../app/lib/googleTagConfig";

type TestAnalyticsWindow = Window & {
  ammDataLayer?: unknown[];
  __ammExternalAnalyticsActive?: boolean;
  __ammExternalAnalyticsLoaded?: boolean;
  __ammExternalAnalyticsContainerId?: string;
};

function setPage(path: string, hostname = "www.askmagicmike.com") {
  const url = new URL(path, `https://${hostname}`);
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
      reload: vi.fn(),
      toString: () => url.href,
    } as Location,
  });
  navigation.pathname = url.pathname;
}

function resetRuntime() {
  const analyticsWindow = window as TestAnalyticsWindow;
  delete analyticsWindow.ammDataLayer;
  delete analyticsWindow.__ammExternalAnalyticsActive;
  delete analyticsWindow.__ammExternalAnalyticsLoaded;
  delete analyticsWindow.__ammExternalAnalyticsContainerId;
  document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)?.remove();
}

function installLocalStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    },
  });
}

beforeEach(() => {
  installLocalStorage();
  window.localStorage.clear();
  window.sessionStorage.clear();
  setPage("/home-value");
  document.documentElement.dataset.ammExternalAnalytics = "available";
  Object.defineProperty(navigator, "webdriver", {
    configurable: true,
    value: false,
  });
  resetRuntime();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetRuntime();
  delete document.documentElement.dataset.ammExternalAnalytics;
  vi.restoreAllMocks();
});

describe("ExternalAnalyticsConsentManager", () => {
  it("shows an accessible choice on an eligible first visit and decline sends nothing", async () => {
    render(<ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />);
    expect(await screen.findByRole("region", { name: "Analytics preferences" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => {
      expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY)).toBe("denied");
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
    expect((window as TestAnalyticsWindow).ammDataLayer).toBeUndefined();
  });

  it("loads the verified container only after Allow analytics", async () => {
    render(<ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Allow analytics" }));

    await waitFor(() => {
      expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY)).toBe("granted");
    expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();
  });

  it("lets a denied visitor reopen the same choice from the footer", async () => {
    window.localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY, "denied");
    render(
      <>
        <ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />
        <AnalyticsPreferencesButton />
      </>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Analytics preferences" }));
    expect(await screen.findByTestId("external-analytics-consent")).toBeVisible();
  });

  it("does not render a dead footer control when analytics is unavailable", () => {
    delete document.documentElement.dataset.ammExternalAnalytics;
    render(<AnalyticsPreferencesButton />);
    expect(screen.queryByRole("button", { name: "Analytics preferences" })).not.toBeInTheDocument();
  });

  it("renders no choice and no tag when configuration is absent or the context is excluded", async () => {
    const { rerender } = render(<ExternalAnalyticsConsentManager gtmContainerId={null} />);
    expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();

    setPage("/admin/leads");
    rerender(<ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />);
    await waitFor(() => {
      expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();
    });
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
  });

  it("suppresses internal QA even when the browser previously granted analytics", async () => {
    window.localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY, "granted");
    setPage("/home-value?utm_source=internal_qa&utm_medium=qa");
    render(<ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />);
    await waitFor(() => {
      expect(screen.queryByTestId("external-analytics-consent")).not.toBeInTheDocument();
    });
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
  });

  it("reloads cleanly when a loaded public runtime enters an excluded route", async () => {
    window.localStorage.setItem(EXTERNAL_ANALYTICS_CONSENT_STORAGE_KEY, "granted");
    const { rerender } = render(
      <ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />,
    );
    await waitFor(() => {
      expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeInTheDocument();
    });
    (window as TestAnalyticsWindow).__ammExternalAnalyticsLoaded = true;

    setPage("/admin/leads");
    rerender(<ExternalAnalyticsConsentManager gtmContainerId={OUR_TOWN_GTM_CONTAINER_ID} />);

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalledOnce();
    });
    expect(document.getElementById(EXTERNAL_ANALYTICS_SCRIPT_ID)).toBeNull();
  });
});
