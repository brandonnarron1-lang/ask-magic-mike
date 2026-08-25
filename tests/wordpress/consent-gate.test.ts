import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "wordpress/ask-magic-mike-canonical-bridge/assets/amm-consent-gate.js",
  ),
  "utf8",
);

type FakeElement = {
  async?: boolean;
  id?: string;
  src?: string;
  referrerPolicy?: string;
  parentNode?: { insertBefore: (node: FakeElement) => void };
  getAttribute: (name: string) => string | null;
};

function createHarness({
  cookie = "",
  container = "GTM-KZMCSLTJ",
  gate = "basic-v1",
  cookieName = "vv_cookieconsent_status",
}: {
  cookie?: string;
  container?: string;
  gate?: string;
  cookieName?: string;
} = {}) {
  const inserted: FakeElement[] = [];
  const documentListeners = new Map<string, Array<() => void>>();
  const windowListeners = new Map<string, Array<() => void>>();
  const intervalCallbacks: Array<() => void> = [];
  const timeoutCallbacks: Array<() => void> = [];

  const attributes: Record<string, string> = {
    "data-amm-consent-gate": gate,
    "data-amm-gtm-container": container,
    "data-amm-consent-cookie": cookieName,
  };

  const currentScript: FakeElement = {
    id: "amm-basic-consent-gate",
    parentNode: {
      insertBefore(node) {
        inserted.push(node);
      },
    },
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };

  const document = {
    cookie,
    currentScript,
    visibilityState: "visible",
    head: {
      appendChild(node: FakeElement) {
        inserted.push(node);
      },
    },
    addEventListener(name: string, callback: () => void) {
      documentListeners.set(name, [
        ...(documentListeners.get(name) ?? []),
        callback,
      ]);
    },
    createElement() {
      const element: FakeElement = {
        getAttribute(name) {
          if (name === "src") return element.src ?? null;
          if (name === "id") return element.id ?? null;
          return null;
        },
      };
      return element;
    },
    getElementById(id: string) {
      return inserted.find((node) => node.id === id) ?? null;
    },
    getElementsByTagName(name: string) {
      return name === "script" ? [currentScript] : [];
    },
  };

  let nextTimer = 1;
  const window = {
    addEventListener(name: string, callback: () => void) {
      windowListeners.set(name, [
        ...(windowListeners.get(name) ?? []),
        callback,
      ]);
    },
    clearInterval() {},
    setInterval(callback: () => void) {
      intervalCallbacks.push(callback);
      return nextTimer++;
    },
    setTimeout(callback: () => void) {
      timeoutCallbacks.push(callback);
      return nextTimer++;
    },
  } as {
    addEventListener: (name: string, callback: () => void) => void;
    clearInterval: (timer: number) => void;
    setInterval: (callback: () => void, delay: number) => number;
    setTimeout: (callback: () => void, delay: number) => number;
    dataLayer?: Array<Record<string, unknown>>;
  };

  vm.runInNewContext(source, {
    Boolean,
    Date,
    String,
    decodeURIComponent,
    document,
    encodeURIComponent,
    window,
  });

  return {
    document,
    documentListeners,
    inserted,
    intervalCallbacks,
    timeoutCallbacks,
    window,
    windowListeners,
  };
}

describe("WordPress Basic Consent measurement gate", () => {
  it.each(["", "deny", "dismiss", "unknown", "%E0%A4%A"])(
    "keeps Google and dataLayer absent for consent value %j",
    (value) => {
      const harness = createHarness({
        cookie: value ? `vv_cookieconsent_status=${value}` : "",
      });

      for (const callback of harness.intervalCallbacks) callback();

      expect(harness.inserted).toHaveLength(0);
      expect(harness.window.dataLayer).toBeUndefined();
    },
  );

  it("loads the one allowlisted GTM runtime once for an existing explicit allow", () => {
    const harness = createHarness({
      cookie: "vv_cookieconsent_status=allow",
    });

    expect(harness.inserted).toHaveLength(1);
    expect(harness.inserted[0]).toMatchObject({
      async: true,
      id: "amm-google-tag-manager",
      referrerPolicy: "strict-origin-when-cross-origin",
      src: "https://www.googletagmanager.com/gtm.js?id=GTM-KZMCSLTJ",
    });
    const dataLayer = Array.from(harness.window.dataLayer ?? []);
    expect(dataLayer).toHaveLength(5);
    expect(Array.from(dataLayer[0] as unknown as ArrayLike<unknown>)).toEqual([
      "consent",
      "default",
      {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      },
    ]);
    expect(Array.from(dataLayer[3] as unknown as ArrayLike<unknown>)).toEqual([
      "consent",
      "update",
      {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "granted",
      },
    ]);

    for (const callback of harness.windowListeners.get("pageshow") ?? []) {
      callback();
    }
    expect(harness.inserted).toHaveLength(1);
    expect(Array.from(harness.window.dataLayer ?? [])).toHaveLength(5);
  });

  it("observes an asynchronous explicit choice without treating dismissal as consent", () => {
    const harness = createHarness({
      cookie: "vv_cookieconsent_status=dismiss",
    });

    for (const callback of harness.documentListeners.get("click") ?? []) {
      callback();
    }
    for (const callback of harness.timeoutCallbacks.splice(0)) callback();
    expect(harness.inserted).toHaveLength(0);

    harness.document.cookie = "vv_cookieconsent_status=allow";
    for (const callback of harness.documentListeners.get("click") ?? []) {
      callback();
    }
    for (const callback of harness.timeoutCallbacks.splice(0)) callback();

    expect(harness.inserted).toHaveLength(1);
    expect(harness.inserted[0]?.src).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-KZMCSLTJ",
    );
  });

  it("fails closed if plugin markup supplies any other gate identity", () => {
    const wrongContainer = createHarness({
      cookie: "vv_cookieconsent_status=allow",
      container: "GTM-OTHER1",
    });
    const wrongCookie = createHarness({
      cookie: "vv_cookieconsent_status=allow",
      cookieName: "unreviewed_cookie",
    });

    expect(wrongContainer.inserted).toHaveLength(0);
    expect(wrongContainer.window.dataLayer).toBeUndefined();
    expect(wrongCookie.inserted).toHaveLength(0);
    expect(wrongCookie.window.dataLayer).toBeUndefined();
  });

  it("contains no dynamic-code, HTML-injection, messaging, or navigation primitive", () => {
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/\bFunction\s*\(/);
    expect(source).not.toContain("innerHTML");
    expect(source).not.toContain("postMessage");
    expect(source).not.toContain("location.href");
    expect(source).not.toContain("window.open");
  });
});
