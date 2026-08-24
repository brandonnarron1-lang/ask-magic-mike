/**
 * Browser acceptance for the public funnel identity contract.
 *
 * Every mutating first-party API request is intercepted before navigation.
 * The suite therefore proves browser behavior against an immutable protected
 * Preview without writing a lead/event, calling a provider, or queueing a
 * notification. Server-owned outcome events may remain browser-visible for
 * approved analytics integrations, but must never reach the public event API.
 */
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { previewTestUse } from "./preview-test-config";

test.use(previewTestUse);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROTECTED_OUTCOMES = new Set([
  "lead_created",
  "widget_lead_created",
  "lead_qualified",
  "appointment_requested",
  "notification_queued",
  "notification_delivered",
  "notification_failed",
]);

type JsonRecord = Record<string, unknown>;

type Capture = {
  leads: JsonRecord[];
  events: JsonRecord[];
  chatMessages: JsonRecord[];
  appointments: JsonRecord[];
  experiments: JsonRecord[];
  unexpectedPosts: string[];
};

function jsonBody(request: { postDataJSON(): unknown }): JsonRecord {
  try {
    return request.postDataJSON() as JsonRecord;
  } catch {
    return {};
  }
}

async function installNoWriteInterception(page: Page, failLead = false) {
  const capture: Capture = {
    leads: [],
    events: [],
    chatMessages: [],
    appointments: [],
    experiments: [],
    unexpectedPosts: [],
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
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }

    const pathname = new URL(request.url()).pathname;
    const body = jsonBody(request);

    if (pathname === "/api/leads") {
      capture.leads.push(body);
      if (failLead) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "temporarily_unavailable" }),
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
          message: "INTERNAL QA — intercepted before durable storage.",
        }),
      });
      return;
    }

    if (pathname === "/api/events" || pathname === "/api/analytics/event") {
      capture.events.push(body);
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, intercepted: true }),
      });
      return;
    }

    if (pathname === "/api/chat/message") {
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

    if (pathname === "/api/appointments/request") {
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

    if (pathname === "/api/experiments/event") {
      capture.experiments.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ active: false, recorded: false, intercepted: true }),
      });
      return;
    }

    capture.unexpectedPosts.push(pathname);
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "unexpected_preview_write_blocked" }),
    });
  });

  return capture;
}

async function browserEvents(page: Page): Promise<JsonRecord[]> {
  return page.evaluate(() => {
    const state = window as Window & { __ammBrowserEvents?: JsonRecord[] };
    return state.__ammBrowserEvents ?? [];
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectLinkedEvents(
  capture: Capture,
  startIndex: number,
  sessionId: string,
  expectedNames: string[],
  piiMarkers: string[],
) {
  expect(sessionId).toMatch(UUID_PATTERN);
  for (const name of expectedNames) {
    await expect.poll(() =>
      capture.events.slice(startIndex).some((entry) => entry.event_name === name),
    ).toBe(true);
  }

  const linked = capture.events
    .slice(startIndex)
    .filter((entry) => expectedNames.includes(String(entry.event_name)));
  expect(linked.length).toBeGreaterThanOrEqual(expectedNames.length);
  for (const event of linked) expect(event.session_id).toBe(sessionId);

  const serialized = JSON.stringify(capture.events.slice(startIndex));
  for (const marker of piiMarkers) expect(serialized).not.toContain(marker);
  expect(
    capture.events.slice(startIndex).filter((event) =>
      PROTECTED_OUTCOMES.has(String(event.event_name)),
    ),
  ).toEqual([]);
}

async function expectBrowserConversion(page: Page, eventName = "lead_created") {
  await expect.poll(async () =>
    (await browserEvents(page)).some((entry) => entry.event === eventName),
  ).toBe(true);
}

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`Home Value, seller, buyer, and Ask preserve one intercepted identity on ${viewport.name}`, async ({ page }) => {
    mkdirSync("artifacts", { recursive: true });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const capture = await installNoWriteInterception(page);

    // Home Value
    let eventStart = capture.events.length;
    await page.goto("/home-value?utm_source=internal_qa&utm_medium=qa&utm_campaign=funnel_identity_preview");
    await page.getByLabel("Property address").fill("123 INTERNAL QA Avenue, Wilson, NC");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Your name").fill("INTERNAL QA DO NOT CONTACT");
    await page.getByLabel("Email for your valuation follow-up").fill("funnel-qa@example.com");
    await page.getByLabel("Phone (optional)").fill("2525550100");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Request Valuation" }).click();
    await expect(page.getByText("Your request is in.")).toBeVisible();
    const homeLead = capture.leads.at(-1) as JsonRecord;
    const homeSessionId = String(homeLead.widget_session_id);
    await expectLinkedEvents(
      capture,
      eventStart,
      homeSessionId,
      ["funnel_started", "address_submitted", "contact_submitted", "consent_accepted", "thank_you_viewed"],
      ["INTERNAL QA DO NOT CONTACT", "funnel-qa@example.com", "2525550100", "123 INTERNAL QA Avenue"],
    );
    await expectBrowserConversion(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/funnel-identity-${viewport.name}-home-value.png`, fullPage: false });

    // Seller
    eventStart = capture.events.length;
    await page.goto("/sell?utm_source=internal_qa&utm_medium=qa&utm_campaign=funnel_identity_preview");
    await page.getByLabel("Property address").fill("456 INTERNAL QA Street, Wilson, NC");
    await page.getByLabel("Name optional").fill("INTERNAL QA DO NOT CONTACT");
    await page.getByLabel("Phone required").fill("2525550101");
    await page.getByLabel("Email optional").fill("seller-funnel-qa@example.com");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send Seller Details" }).click();
    await expect(page.getByText("INTERNAL QA — intercepted before durable storage.")).toBeVisible();
    const sellerLead = capture.leads.at(-1) as JsonRecord;
    const sellerSessionId = String(sellerLead.widget_session_id);
    await expectLinkedEvents(
      capture,
      eventStart,
      sellerSessionId,
      ["funnel_started", "contact_submitted", "consent_accepted", "thank_you_viewed"],
      ["INTERNAL QA DO NOT CONTACT", "seller-funnel-qa@example.com", "2525550101", "456 INTERNAL QA Street"],
    );
    await expectBrowserConversion(page);
    await expectNoHorizontalOverflow(page);

    // Buyer
    eventStart = capture.events.length;
    await page.goto("/buy?utm_source=internal_qa&utm_medium=qa&utm_campaign=funnel_identity_preview");
    await page.getByLabel("Name").fill("INTERNAL QA DO NOT CONTACT");
    await page.getByLabel("Email").fill("buyer-funnel-qa@example.com");
    await page.getByLabel("Phone").fill("2525550102");
    await page.getByLabel("Target area or property").fill("INTERNAL QA Wilson");
    await page.getByRole("checkbox", { name: /Our Town Properties may contact me/ }).check();
    await page.getByRole("button", { name: "Request Buyer Plan" }).click();
    await expect(page.getByText("INTERNAL QA — intercepted before durable storage.")).toBeVisible();
    const buyerLead = capture.leads.at(-1) as JsonRecord;
    const buyerSessionId = String(buyerLead.widget_session_id);
    await expectLinkedEvents(
      capture,
      eventStart,
      buyerSessionId,
      ["funnel_started", "contact_submitted", "consent_accepted", "thank_you_viewed"],
      ["INTERNAL QA DO NOT CONTACT", "buyer-funnel-qa@example.com", "2525550102", "INTERNAL QA Wilson"],
    );
    await expectBrowserConversion(page);
    await expectNoHorizontalOverflow(page);

    // Ask Mike
    eventStart = capture.events.length;
    await page.goto("/ask?utm_source=internal_qa&utm_medium=qa&utm_campaign=funnel_identity_preview");
    await page.getByLabel(/Your real estate question/).fill("INTERNAL QA — what should I prepare before listing?");
    await page.getByRole("button", { name: "Send Question" }).click();
    await expect(page.getByText("INTERNAL QA — synthetic local answer; no provider called.")).toBeVisible();
    await expect.poll(() => capture.leads.length).toBe(4);
    const askLead = capture.leads.at(-1) as JsonRecord;
    const askSessionId = String(askLead.widget_session_id);
    await expectLinkedEvents(
      capture,
      eventStart,
      askSessionId,
      ["chat_started", "chat_message_sent"],
      ["INTERNAL QA — what should I prepare before listing?"],
    );
    await expectBrowserConversion(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `artifacts/funnel-identity-${viewport.name}-ask.png`, fullPage: false });

    expect(capture.chatMessages).toHaveLength(1);
    expect(capture.appointments).toHaveLength(0);
    expect(capture.unexpectedPosts).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

test("intercepted durable failure is recoverable, linked, private, and non-converting", async ({ page }) => {
  const capture = await installNoWriteInterception(page, true);
  await page.goto("/home-value?utm_source=internal_qa&utm_medium=qa&utm_campaign=funnel_identity_failure");
  await page.getByLabel("Property address").fill("789 INTERNAL QA Road, Wilson, NC");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your name").fill("INTERNAL QA DO NOT CONTACT");
  await page.getByLabel("Email for your valuation follow-up").fill("failure-funnel-qa@example.com");
  await page.getByRole("button", { name: "Request Valuation" }).click();

  await expect(page.locator("#home-value-form-error")).toBeVisible();
  const failedLead = capture.leads.at(-1) as JsonRecord;
  const sessionId = String(failedLead.widget_session_id);
  await expectLinkedEvents(
    capture,
    0,
    sessionId,
    ["funnel_started", "address_submitted", "contact_submitted", "lead_submit_failed"],
    ["INTERNAL QA DO NOT CONTACT", "failure-funnel-qa@example.com", "789 INTERNAL QA Road"],
  );
  const emitted = await browserEvents(page);
  expect(emitted.some((entry) => entry.event === "lead_created")).toBe(false);
  expect(capture.unexpectedPosts).toEqual([]);
});
