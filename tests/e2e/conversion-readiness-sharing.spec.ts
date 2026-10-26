import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_WEB_ACQUISITION_ACCEPTANCE !== "1", "Owned isolated loopback/no-send harness required");
test.describe.configure({ mode: "serial" });
const kit = "/launch-20261013/share-20261021.html";
const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "public/launch-20261013/share-manifest-20261021.json"), "utf8")) as {
  offers: Array<{ caption: string; alt: string; clean: string; registeredLinks: Array<{ channel: string; url: string }> }>;
};
const ids = ["home-value", "buying-help", "compare-selling-options"];
const reply = (mode: string) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, service: "ask-magic-mike", public_intake: mode }) });

test.beforeAll(() => {
  const db = new URL(process.env.DATABASE_URL!);
  if (process.env.VERCEL_ENV !== "development" || process.env.PREVIEW_URL || db.hostname !== "localhost" || db.pathname !== "/amm_qa_upgrade" || process.env.LEAD_ALERT_V6_WORKER_ENABLED !== "false") throw new Error("isolated_no_send_venue_required");
});
test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("loopback_only");
  // These UI cases do not create records. The main acquisition suite owns real
  // SQL/session/outbox proof. Keep all optional telemetry/provider IO inert.
  await page.route("**/*", route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin !== origin) return route.abort("blockedbyclient");
    if (url.pathname === "/api/address-suggestions") return route.fulfill({ status: 200, contentType: "application/json", body: '{"enabled":false}' });
    if (request.method() !== "GET" && request.method() !== "HEAD") return route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' });
    return route.continue();
  });
});

async function enterContact(page: Page) {
  await page.getByLabel("Property address", { exact: true }).fill("101 Synthetic Fixture Road, Wilson NC");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("INTERNAL QA DO NOT CONTACT — Readiness Fixture");
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill("readiness@example.test");
}

test("one stable notice; failed health is unknown, retry is GET-only and keeps eventless values", async ({ page }, testInfo) => {
  let checks = 0; let posts = 0; const methods: string[] = [];
  await page.route("**/api/health/live", route => {
    methods.push(route.request().method()); checks++;
    return route.fulfill(checks === 2 ? { status: 503, contentType: "application/json", body: '{"ok":false}' } : reply("live"));
  });
  await page.route("**/api/leads", route => { posts++; return route.abort("failed"); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home-value"); await expect(page.locator('[data-intake-mode="live"]')).toHaveCount(1);
  await expect(page.locator("[data-intake-mode]")).toHaveCount(1);
  await enterContact(page);
  const email = page.getByLabel("Email for your valuation follow-up", { exact: true });
  await email.evaluate((node: HTMLInputElement) => { node.value = "eventless@example.test"; });
  const notice = page.locator("[data-intake-mode]"); const before = (await notice.boundingBox())!;
  const inputBefore = (await email.boundingBox())!;
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Check availability again", exact: true }).click();
  await expect(page.locator('[data-intake-mode="unknown"]')).toBeVisible();
  await expect(page.getByText("Availability not confirmed. Saving is paused.", { exact: true })).toBeVisible();
  await expect(email).toHaveValue("eventless@example.test");
  await expect(page.getByRole("button", { name: "Saving unavailable", exact: true })).toBeDisabled();
  expect((await notice.boundingBox())!.height).toBeCloseTo(before.height, 0);
  // Clicking a control above the focused field may scroll the viewport. Compare
  // document coordinates, not viewport coordinates, to measure actual reflow.
  expect((await email.boundingBox())!.y + await page.evaluate(() => window.scrollY)).toBeCloseTo(inputBefore.y + scrollBefore, 0);
  await page.screenshot({ path: testInfo.outputPath("readiness-unknown-390.png"), fullPage: true });
  await page.getByRole("button", { name: "Check availability again", exact: true }).click();
  await expect(page.locator('[data-intake-mode="live"]')).toBeVisible();
  await expect(email).toHaveValue("eventless@example.test");
  expect(methods).toEqual(["GET", "GET", "GET"]); expect(posts).toBe(0);
});

test("late health cannot turn a newer confirmed read-only check live", async ({ page }) => {
  let checks = 0; let settle!: () => Promise<void>;
  await page.route("**/api/health/live", route => {
    checks++;
    if (checks === 1) return new Promise<void>(resolve => { settle = async () => { try { await route.fulfill(reply("live")); } catch { /* The superseded browser request was aborted. */ } resolve(); }; });
    return route.fulfill(reply("read_only"));
  });
  await page.goto("/home-value", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-intake-mode="checking"]')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page.locator('[data-intake-mode="read_only"]')).toHaveCount(1);
  await settle();
  await expect(page.locator('[data-intake-mode="read_only"]')).toHaveCount(1);
  await expect(page.getByText("Read-only demo. Do not enter personal details.", { exact: true })).toBeVisible();
});

test("blocked storage + lost response retain widget lock and identical body/key across health retry", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("synthetic blocked storage"); };
  });
  let mode = "live"; const attempts: Array<{ key: string; body: string }> = [];
  await page.route("**/api/health/live", route => route.fulfill(mode === "unknown" ? { status: 503, contentType: "application/json", body: '{}' } : reply(mode)));
  await page.route("**/api/leads", route => {
    attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData()! });
    return route.abort("failed"); // Explicit browser transport fixture, no SQL or send.
  });
  await page.goto("/widget/v1"); await expect(page.locator('[data-intake-mode="live"]')).toBeVisible();
  await enterContact(page);
  await page.getByRole("button", { name: "Request Valuation", exact: true }).click();
  await expect(page.getByText(/could not retain the recovery reference across a reload/)).toBeVisible();
  await expect(page.getByRole("tab", { name: "Buying Help", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Your name", { exact: true })).toBeDisabled();
  mode = "unknown";
  await page.getByRole("button", { name: "Check availability again", exact: true }).click();
  await expect(page.locator('[data-intake-mode="unknown"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry identical request", exact: true })).toBeDisabled();
  expect(attempts).toHaveLength(1); mode = "live";
  await page.getByRole("button", { name: "Check availability again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry identical request", exact: true })).toBeEnabled();
  await expect(page.getByText(attempts[0].key, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry identical request", exact: true }).click();
  await expect.poll(() => attempts.length).toBe(2); expect(attempts[1]).toEqual(attempts[0]);
  await expect(page.getByRole("tab", { name: "Buying Help", exact: true })).toBeDisabled();
});

for (const [index, id] of ids.entries()) test(`one-action ${id} sharing copies exact registered text and never publishes`, async ({ page }) => {
  await page.addInitScript(() => {
    const copied: string[] = []; Object.assign(window, { __ammCopied: copied });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { copied.push(text); } } });
  });
  await page.goto(kit); const section = page.locator(`#${id}`); const offer = manifest.offers[index];
  await section.getByRole("button", { name: "Copy Facebook post", exact: true }).click();
  await section.getByRole("button", { name: "Copy clean link", exact: true }).click();
  await section.getByRole("button", { name: "Copy alt text", exact: true }).click();
  await section.getByRole("button", { name: "Copy Instagram caption", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __ammCopied: string[] }).__ammCopied)).toEqual([
    `${offer.caption}\n\n${offer.registeredLinks.find(link => link.channel === "facebook")!.url}`, offer.clean, offer.alt, offer.caption,
  ]);
  await expect(section.getByText(/Instagram captions do not provide a clickable destination/)).toBeVisible();
  const download = section.locator("figure a[download]").first();
  const filename = id === "home-value" ? "seller-feed.jpg" : id === "buying-help" ? "buyer-feed.jpg" : "compare-selling-options-feed-20261021.jpg";
  await expect(download).toHaveAttribute("href", filename);
  const saved = page.waitForEvent("download"); await download.click(); expect((await saved).suggestedFilename()).toBe(filename);
  for (const status of await section.locator(".copy-row .status").all()) await expect(status).toHaveText("Copied. Not posted or sent.");
});

test("clipboard refusal exposes selected complete text and clean comparison URL without losing tags", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("synthetic clipboard denial"); } } }));
  await page.goto(kit); const section = page.locator("#compare-selling-options"); const offer = manifest.offers[2];
  await section.getByRole("button", { name: "Copy Facebook post", exact: true }).focus();
  await page.keyboard.press("Enter");
  const post = section.locator("#facebook-compare-selling-options");
  await expect(post).toBeFocused(); await expect(post).toHaveValue(`${offer.caption}\n\n${offer.registeredLinks.find(link => link.channel === "facebook")!.url}`);
  expect(await post.evaluate((node: HTMLTextAreaElement) => node.value.slice(node.selectionStart, node.selectionEnd))).toBe(await post.inputValue());
  await section.getByRole("button", { name: "Copy clean link", exact: true }).click();
  const fallback = section.getByLabel("Selected text to copy", { exact: true });
  await expect(fallback).toBeFocused(); await expect(fallback).toHaveValue(offer.clean);
  expect(new URL(await fallback.inputValue()).searchParams.get("seller_option")).toBe("compare");
  await expect(section.locator('[data-copy="clean-compare-selling-options"] + .status')).toHaveText("Text selected. Use your device’s Copy command. Not posted or sent.");
});

for (const width of [320, 390, 430, 768, 1440]) test(`readiness/share reflow and keyboard at ${width}, actual 200% text`, async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/health/live", route => route.fulfill(reply("read_only")));
  for (const target of ["/home-value", kit]) {
    await page.goto(target); await page.evaluate(() => document.fonts.ready);
    if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`${target === kit ? "sharing" : "readiness"}-${width}.png`), fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
    if (target === kit) await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe("32px");
    const geometry = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(geometry.scroll, `${target} at ${width}/200%`).toBeLessThanOrEqual(geometry.client + 1);
    const control = target === kit ? page.locator("#home-value").getByRole("button", { name: "Copy Facebook post", exact: true }) : page.getByRole("button", { name: "Check availability again", exact: true });
    await control.focus(); await expect(control).toBeFocused(); expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (target !== kit) { await page.keyboard.press("Enter"); await expect(page.locator('[data-intake-mode="read_only"]')).toHaveCount(1); }
  }
  expect(errors).toEqual([]);
});
