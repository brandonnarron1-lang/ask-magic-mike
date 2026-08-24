import type { Page } from "@playwright/test";

export type JsonRecord = Record<string, unknown>;

export type NoWriteCapture = {
  leads: JsonRecord[];
  events: JsonRecord[];
  chatMessages: JsonRecord[];
  appointments: JsonRecord[];
  experiments: JsonRecord[];
  unexpectedMutations: string[];
};

type LeadFailure = {
  status: number;
  error: string;
};

type NoWriteOptions = {
  leadFailure?: LeadFailure;
  /**
   * Exercise ordinary public-browser analytics behavior while every mutating
   * request is already blocked by this helper. Leave false when the scenario
   * is specifically proving automated-browser suppression.
   */
  simulatePublicBrowser?: boolean;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function jsonBody(request: { postDataJSON(): unknown }): JsonRecord {
  try {
    return request.postDataJSON() as JsonRecord;
  } catch {
    return {};
  }
}

/**
 * Install one fail-closed mutation boundary before Preview navigation.
 *
 * Known public commands receive deterministic synthetic responses. Any other
 * mutating first-party API request is blocked and retained as test evidence.
 * Read-only API requests may continue to the immutable Preview.
 */
export async function installNoWriteInterception(
  page: Page,
  options: NoWriteOptions = {},
): Promise<NoWriteCapture> {
  const capture: NoWriteCapture = {
    leads: [],
    events: [],
    chatMessages: [],
    appointments: [],
    experiments: [],
    unexpectedMutations: [],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      await route.fallback();
      return;
    }

    const pathname = new URL(request.url()).pathname;
    const body = jsonBody(request);

    if (method === "POST" && pathname === "/api/leads") {
      capture.leads.push(body);
      if (options.leadFailure) {
        await route.fulfill({
          status: options.leadFailure.status,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: options.leadFailure.error }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          lead_id: `qa_intercepted_${capture.leads.length}`,
          session_id: body.widget_session_id,
          status: "accepted",
          mock: true,
          message: "INTERNAL QA — intercepted before durable storage.",
        }),
      });
      return;
    }

    if (
      method === "POST" &&
      (pathname === "/api/events" || pathname === "/api/analytics/event")
    ) {
      capture.events.push(body);
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, intercepted: true }),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/chat/message") {
      capture.chatMessages.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "INTERNAL QA — synthetic local answer; no provider called.",
        }),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/appointments/request") {
      capture.appointments.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "requested",
          appointment_id: "qa_intercepted_appointment",
          appointment_status: "requested",
        }),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/experiments/event") {
      capture.experiments.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, recorded: false, intercepted: true }),
      });
      return;
    }

    capture.unexpectedMutations.push(`${method} ${pathname}`);
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "unexpected_preview_write_blocked" }),
    });
  });

  // Install the public-browser simulation only after the fail-closed route is
  // active. This lets the suite inspect the requests a real visitor would
  // issue without weakening application automation exclusion or allowing a
  // request to escape to Preview. The init script applies to child frames too.
  await page.addInitScript(
    ({ simulatePublicBrowser, userAgent }) => {
      if (simulatePublicBrowser) {
        Object.defineProperty(navigator, "webdriver", {
          configurable: true,
          get: () => false,
        });
        Object.defineProperty(navigator, "userAgent", {
          configurable: true,
          get: () => userAgent,
        });
      }

      const state = window as Window & { __ammBrowserEvents?: unknown[] };
      state.__ammBrowserEvents = [];
      window.addEventListener("askmagicmike:event", (event) => {
        state.__ammBrowserEvents?.push((event as CustomEvent).detail);
      });
    },
    {
      simulatePublicBrowser: options.simulatePublicBrowser === true,
      userAgent: PUBLIC_BROWSER_USER_AGENT,
    },
  );

  return capture;
}
