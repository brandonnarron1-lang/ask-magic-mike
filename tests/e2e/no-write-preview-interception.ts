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
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

  await page.addInitScript(() => {
    const state = window as Window & { __ammBrowserEvents?: unknown[] };
    state.__ammBrowserEvents = [];
    window.addEventListener("askmagicmike:event", (event) => {
      state.__ammBrowserEvents?.push((event as CustomEvent).detail);
    });
  });

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

  return capture;
}
