import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.skip(process.env.AMM_MOBILE_CONVERSATION_UI !== "1", "Explicit isolated local UI only; no real submissions");
test.beforeEach(async ({ page, baseURL }) => {
  expect(process.env.PREVIEW_URL).toBeFalsy();
  const origin = new URL(baseURL!).origin;
  expect(new URL(origin).hostname).toBe("127.0.0.1");
  await page.route("**/*", route => {
    const r = route.request(), url = new URL(r.url());
    if (url.origin !== origin || !["GET", "HEAD"].includes(r.method())) return route.abort("blockedbyclient");
    if (url.pathname === "/api/address-suggestions") return route.fulfill({ json: { enabled: false } });
    if (url.pathname === "/api/health/live") return route.fulfill({ json: { ok: true, service: "ask-magic-mike", public_intake: "synthetic_qa" } });
    if (url.pathname.startsWith("/api/")) return route.abort("blockedbyclient");
    return route.continue();
  });
});
test("phone-only native capture, visible unit, optional preferences and ambiguous retry; blocked storage", async ({ page }) => {
  test.skip(process.env.AMM_CAPTURE_BEFORE === "1", "New-flow regression runs only after implementation");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Synthetic blocked storage", "SecurityError"); }; });
  await page.route("**/api/health/live", route => route.fulfill({ json: { ok: true, service: "ask-magic-mike", public_intake: "live" } }));
  const leadId = randomUUID(); let sessionId = ""; const conversations: unknown[] = [];
  await page.route("**/api/leads", async route => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe(""); expect(body.phone).toBe("2025550107");
    expect(body.address_entry.components.line2).toBe("Unit 4B");
    expect(body.receipt_email_requested).toBe(false);
    sessionId = body.widget_session_id;
    const correlationId = randomUUID();
    await route.fulfill({ headers: { "X-AMM-Correlation-Id": correlationId }, json: { lead_id: leadId, session_id: sessionId, duplicate_of_lead_id: null, correlation_id: correlationId } });
  });
  await page.route("**/api/appointments/request", async route => {
    const body = route.request().postDataJSON(); conversations.push(body);
    expect(body.lead_id).toBe(leadId); expect(body.session_id).toBe(sessionId);
    if (conversations.length === 1) return route.abort("timedout");
    return route.fulfill({ json: { status: "already_requested", appointment_status: "requested" } });
  });
  await page.goto("/widget/v1");
  await page.getByRole("combobox", { name: "Property address", exact: true }).evaluate((input: HTMLInputElement) => { input.value = "101 Synthetic Fixture Road, Wilson NC"; });
  await page.getByLabel("Unit / apartment (if applicable)").fill("Unit 4B");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Ordinary-looking LOCAL fixture exercises the normal CTA. Explicit QA
  // markers deliberately suppress it; all transport remains intercepted.
  await page.getByLabel("Your name", { exact: true }).fill("Synthetic Local Fixture");
  await page.getByLabel("Phone (optional)", { exact: true }).fill("2025550107");
  await expect(page.getByRole("checkbox", { name: /Email me a receipt/ })).toHaveCount(0);
  await expect(page.getByText(/Email receipts are currently unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Request Valuation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  await page.getByLabel("Preferred contact method").selectOption("phone");
  await page.getByLabel("Preferred day (optional)").fill("2026-11-12");
  await page.getByLabel("Preferred Eastern-time window").selectOption("afternoon");
  const dir = process.env.AMM_E2E_OUTPUT_DIR || "output/playwright/mobile-conversation"; mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.resolve(dir, "after-conversation-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Request a conversation", exact: true }).click();
  await page.getByRole("button", { name: "Retry identical conversation request", exact: true }).click();
  expect(conversations).toHaveLength(2); expect(conversations[0]).toEqual(conversations[1]);
  expect(conversations[0]).toMatchObject({ preferences: { channel: "phone", day: "2026-11-12", window: "afternoon", timezone: "America/New_York" } });
});
test("200% text, keyboard and landscape have no overlay or horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await page.goto("/widget/v1");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Home Value Review", exact: true }).focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Buying Help", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("[data-public-mike-contact]").evaluate(e => getComputedStyle(e).position)).toBe("static");
});
test("actual local OFF health hides receipt choice; explicit ON advisory offers unchanged opt-in with fake capture", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const actual = await page.request.get("/api/health/live").then(r => r.json());
  expect(actual.request_receipts_available).toBe(false);
  await page.goto("/widget/v1");
  await page.getByRole("combobox", { name: "Property address", exact: true }).fill("101 Synthetic Fixture Road, Wilson NC");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Email me a receipt/ })).toHaveCount(0);
  await expect(page.getByText(/Email receipts are currently unavailable/)).toBeVisible();
  const dir = process.env.AMM_E2E_OUTPUT_DIR || "output/playwright/mobile-conversation"; mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.resolve(dir, "receipt-off-after-390.png"), fullPage: true });
  // Explicit UI-only ON fixture. No provider configuration is enabled and every
  // business mutation stays intercepted, just like the other UI acceptance.
  await page.route("**/api/health/live", route => route.fulfill({ json: { ok: true, service: "ask-magic-mike", public_intake: "live", request_receipts_available: true } }));
  await page.reload();
  await page.getByRole("combobox", { name: "Property address", exact: true }).fill("101 Synthetic Fixture Road, Wilson NC");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Synthetic Local Fixture");
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill("receipt@example.test");
  await page.getByRole("checkbox", { name: /I agree that Our Town Properties/ }).check();
  const choice = page.getByRole("checkbox", { name: /Email me a receipt/ });
  await expect(choice).not.toBeChecked(); await choice.focus(); await page.keyboard.press("Space");
  await expect(choice).toBeChecked();
  await page.screenshot({ path: path.resolve(dir, "receipt-on-fixture-390.png"), fullPage: true });
  let posted = false;
  await page.route("**/api/leads", async route => {
    const body = route.request().postDataJSON(); expect(body.receipt_email_requested).toBe(true); expect(body.consent_email).toBe(true);
    posted = true; const correlation = randomUUID();
    await route.fulfill({ headers: { "X-AMM-Correlation-Id": correlation }, json: { lead_id: randomUUID(), session_id: body.widget_session_id, duplicate_of_lead_id: null, correlation_id: correlation } });
  });
  await page.getByRole("button", { name: "Request Valuation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  expect(posted).toBe(true);
});
for (const width of [320, 360, 390, 430]) test(`local mobile widget ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/widget/v1");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  for (const name of ["Home Value Review", "Buying Help", "Selling Options", "Ask a Question"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("link", { name: /Call Magic Mike at/ })).toHaveAttribute("href", "tel:+12522454337");
    await expect(page.getByRole("link", { name: /Text Magic Mike/ })).toHaveAttribute("href", "sms:+12522454337");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("tab", { name: "Home Value Review", exact: true }).click();
  const dir = process.env.AMM_E2E_OUTPUT_DIR || "output/playwright/mobile-conversation";
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.resolve(dir, `${process.env.AMM_CAPTURE_BEFORE === "1" ? "before" : "after"}-widget-${width}.png`), fullPage: true });
});
