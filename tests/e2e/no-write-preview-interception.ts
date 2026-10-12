import { randomUUID } from "node:crypto";
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
  code?: string;
};

type NoWriteOptions = {
  leadFailure?: LeadFailure;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonBody(request: { postDataJSON(): unknown }): JsonRecord {
  try {
    const parsed: unknown = request.postDataJSON();
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as JsonRecord
      : {};
  } catch {
    return {};
  }
}

/**
 * Install one fail-closed mutation boundary before Preview navigation.
 *
 * Known public commands receive synthetic command-contract responses. Any other
 * mutating first-party API request is blocked and retained as test evidence.
 * Read-only API requests may continue to the immutable Preview. In particular,
 * capability reads are never mocked to unlock a read-only Preview. An
 * intercepted receipt proves client rendering only, never a database commit
 * or cloud/provider acceptance.
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
  const syntheticReceipts = new Map<string, { leadId: string; payload: string }>();

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
      const correlationId = randomUUID();
      const responseHeaders = { "X-AMM-Correlation-Id": correlationId };
      // Never mint a substitute session or allow dummy IDs to satisfy the
      // strict Home Value receipt. Use the actual intercepted request identity.
      const sessionId = body.idempotency_key;
      const requestKey = request.headers()["idempotency-key"];
      if (
        typeof sessionId !== "string" || !UUID_PATTERN.test(sessionId) ||
        body.widget_session_id !== sessionId ||
        (requestKey !== undefined && requestKey !== sessionId)
      ) {
        capture.unexpectedMutations.push("POST /api/leads invalid_fixture_identity");
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          headers: responseHeaders,
          body: JSON.stringify({
            error: "The submission reference is invalid. Please refresh and try again.",
            code: "idempotency_key_invalid",
            correlation_id: correlationId,
          }),
        });
        return;
      }
      if (options.leadFailure) {
        await route.fulfill({
          status: options.leadFailure.status,
          contentType: "application/json",
          headers: responseHeaders,
          body: JSON.stringify({
            error: options.leadFailure.error,
            ...(options.leadFailure.code ? { code: options.leadFailure.code } : {}),
            correlation_id: correlationId,
          }),
        });
        return;
      }
      const payload = JSON.stringify(body);
      const existing = syntheticReceipts.get(sessionId);
      if (existing && existing.payload !== payload) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          headers: responseHeaders,
          body: JSON.stringify({
            error: "That submission conflicts with an existing request. Please refresh and submit again, or call Our Town Properties at 252-243-7700.",
            code: "idempotency_conflict",
            correlation_id: correlationId,
          }),
        });
        return;
      }
      const leadId = existing?.leadId ?? randomUUID();
      syntheticReceipts.set(sessionId, { leadId, payload });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        // The real API omits the replay header on a new capture and sends
        // exactly "1" for a same-key, same-payload replay. No body replay flag.
        headers: { ...responseHeaders, ...(existing ? { "X-AMM-Idempotent-Replay": "1" } : {}) },
        body: JSON.stringify({
          lead_id: leadId,
          session_id: sessionId,
          correlation_id: correlationId,
          duplicate_of_lead_id: null,
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
