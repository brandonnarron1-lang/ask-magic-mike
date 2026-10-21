import { mkdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_WEB_ACQUISITION_ACCEPTANCE !== "1", "Fresh owned loopback PostgreSQL harness only");
test.describe.configure({ mode: "serial" });
const output = process.env.AMM_E2E_OUTPUT_DIR || ".amm-run/web-acquisition/screenshots";
let pool: Pool;
test.beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (process.env.VERCEL_ENV !== "development" || process.env.PREVIEW_URL || url.hostname !== "localhost" || url.pathname !== "/amm_qa_upgrade" || process.env.LEAD_ALERT_V6_WORKER_ENABLED !== "false") throw new Error("isolated_no_send_venue_required");
  pool = new Pool({ connectionString: url.href, max: 1 });
  mkdirSync(output, { recursive: true });
});
test.afterAll(async () => { await pool?.end(); });
test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
});
async function counts() {
  return (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications WHERE template_version='lead_alert_email_v6') envelopes,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_ids,(SELECT count(*)::int FROM lead_appointments) appointments")).rows[0];
}
async function ordinaryAdvisory(page: Page) {
  // UI-only live advisory fixture. The actual POST, Origin/CSRF, classification,
  // ownership, transaction and outbox remain real in the proven local database.
  // This is NOT Production health or a remote write-capability attestation.
  await page.route("**/api/health/live", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, service: "ask-magic-mike", public_intake: "live" }) }));
}
async function assertEnvelope(email: string, qa: boolean) {
  const rows = (await pool.query("SELECT is_test,communication_suppressed,consent_email,consent_call,consent_sms FROM leads WHERE email=$1", [email])).rows;
  expect(rows).toEqual([{ is_test: qa, communication_suppressed: qa, consent_email: false, consent_call: false, consent_sms: false }]);
  const envelopes = (await pool.query("SELECT n.recipient_reference,n.status,n.provider_message_id,n.attempt_count FROM lead_notifications n JOIN leads l ON l.id=n.lead_id WHERE l.email=$1 AND n.template_version='lead_alert_email_v6' ORDER BY n.recipient_reference", [email])).rows;
  expect(envelopes).toHaveLength(2);
  expect(envelopes.map(row => row.recipient_reference)).toEqual(["operator:brandon", "operator:mike"]);
  expect(envelopes.every(row => row.provider_message_id === null && row.attempt_count === 0)).toBe(true);
}
test("sentinel: ordinary seller review creates one inquiry and two unsent v6 operator intents", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const before = await counts(); await ordinaryAdvisory(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sell?seller_option=compare&utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_we_buy_homes");
  await page.getByLabel("Property address", { exact: true }).fill("101 Synthetic Fixture Road, Wilson NC 27893");
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Seller Fixture");
  await page.getByLabel("Email", { exact: true }).fill("web-ordinary-seller@example.test");
  await page.getByRole("button", { name: "Review property request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your property request", exact: true })).toBeFocused();
  expect(await counts()).toEqual(before);
  await page.screenshot({ path: path.join(output, "seller-review-390.png"), fullPage: true });
  const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api/leads" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send property review request", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText("Your request is stored for review. Mike or the approved team will follow up through the contact path you provided.", { exact: true })).toBeVisible();
  await assertEnvelope("web-ordinary-seller@example.test", false);
  expect(await counts()).toEqual({ ...before, leads: before.leads + 1, envelopes: before.envelopes + 2 });
  await page.screenshot({ path: path.join(output, "seller-confirmation-390.png"), fullPage: true }); expect(errors).toEqual([]);
});
test("sentinel: ordinary buyer real capture, lost response and identical replay retain one inquiry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
  await ordinaryAdvisory(page); const before = await counts();
  await page.goto("/buy?utm_source=facebook&utm_medium=organic_social&utm_campaign=amm_seller_buyer_launch_2026");
  await page.getByLabel("Property address (or provide a listing URL)").fill("202 Synthetic Fixture Road, Wilson NC 27893");
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Buyer Fixture");
  await page.getByLabel("Email", { exact: true }).fill("web-ordinary-buyer@example.test");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your request", exact: true })).toBeFocused();
  const attempts: Array<{ key: string; body: string }> = [];
  await page.route("**/api/leads", async route => {
    attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData()! });
    if (attempts.length === 1) {
      const committed = await route.fetch(); expect(committed.status()).toBe(200);
      await route.abort("failed"); // Real SQL committed; only the browser response is lost.
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click();
  await expect(page.locator("#buyer-form-status")).toContainText("couldn't confirm");
  await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry identical request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  expect(attempts).toHaveLength(2); expect(attempts[1]).toEqual(attempts[0]);
  await assertEnvelope("web-ordinary-buyer@example.test", false);
  expect(await counts()).toEqual({ ...before, leads: before.leads + 1, envelopes: before.envelopes + 2 });
  await page.screenshot({ path: path.join(output, "buyer-confirmation-390.png"), fullPage: true });
});
test("genuine synthetic-QA capability keeps test capture suppressed and out of ordinary totals", async ({ page }) => {
  // A fresh harness-owned UUID is explicitly QA-allowlisted in this disposable
  // process only. Deterministic browser reference generation does not bypass
  // the actual server QA fence or any consumer contact restriction.
  await page.addInitScript(key => { Object.defineProperty(crypto, "randomUUID", { value: () => key }); }, process.env.AMM_WEB_QA_SESSION_ID!);
  const before = await counts(); await page.goto("/buy");
  await page.getByLabel("Property address (or provide a listing URL)").fill("303 Synthetic Fixture Road, Wilson NC 27893");
  await page.getByLabel("Name", { exact: true }).fill("INTERNAL QA — DO NOT CONTACT — Web Fixture");
  await page.getByLabel("Email", { exact: true }).fill("web-qa-buyer@example.test");
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  await assertEnvelope("web-qa-buyer@example.test", true);
  expect(await counts()).toEqual({ ...before, leads: before.leads + 1, envelopes: before.envelopes + 2 });
});
for (const width of [320, 390, 430, 768, 1440]) test(`offer navigation, readable fields, keyboard and real 200% text at ${width}`, async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/home-value", "/buy", "/sell?seller_option=compare", "/widget/v1"]) {
    await page.goto(route); await page.evaluate(() => document.fonts.ready);
    if (route === "/") {
      await expect(page.getByRole("link", { name: "Request My Home Value Review", exact: true })).toHaveAttribute("href", "/home-value");
      await expect(page.getByRole("link", { name: "Get Buying Help", exact: true })).toHaveAttribute("href", "/buy");
      for (const link of await page.getByRole("link", { name: "Browse Homes", exact: true }).all()) await expect(link).toHaveAttribute("href", "https://www.ourtownproperties.com/property-search/");
      await expect(page.locator("#home-value")).not.toHaveAttribute("open");
    }
    if (route === "/widget/v1") {
      await expect(page.getByRole("tab", { name: "Buying Help", exact: true })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Selling Options", exact: true })).toBeVisible();
    }
    if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `after-${route === "/" ? "home" : route.split(/[/?]/)[1]}-${width}.png`), fullPage: route !== "/" });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
    const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && e.getBoundingClientRect().width > 0).slice(0,15).map(e => ({ tag:e.tagName, class:e.className, width:e.getBoundingClientRect().width, right:e.getBoundingClientRect().right })) }));
    if (geometry.scroll > geometry.client + 1) console.log(JSON.stringify({ route, width, geometry }));
    expect(geometry.scroll, `${route} must not scroll sideways at real 200% root text`).toBeLessThanOrEqual(geometry.client + 1);
    const operational = page.getByRole("button", { name: /Review property request|Review request|Next: Contact/ }).first();
    if (await operational.count()) { await operational.focus(); await expect(operational).toBeFocused(); expect((await operational.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
  }
  expect(errors).toEqual([]);
});
test("old homepage fragments reveal forms; native values survive closing and reopening", async ({ page }) => {
  await page.goto("/#home-value");
  await expect(page.locator("#home-value")).toHaveAttribute("open");
  const address = page.locator("#home-value").getByLabel("Property address", { exact: true });
  await address.fill("404 Synthetic Fixture Road");
  const summary = page.locator("#home-value > summary");
  await summary.press("Enter"); await expect(page.locator("#home-value")).not.toHaveAttribute("open");
  await summary.press("Enter"); await expect(address).toHaveValue("404 Synthetic Fixture Road");
  expect((await counts()).provider_ids).toBe(0);
});
