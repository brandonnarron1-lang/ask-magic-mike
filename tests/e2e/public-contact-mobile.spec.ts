import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// Explicit local compiled UI only. No provider, external app, SQL or delivery
// claim. Every mutation and nonlocal request is intercepted, never forwarded.
test.skip(process.env.AMM_PUBLIC_CONTACT_ACCEPTANCE !== "1", "Explicit local public-contact UI acceptance only");
test.use({ serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } });
test.beforeEach(async ({ page, baseURL }) => {
  expect(process.env.PREVIEW_URL).toBeFalsy();
  expect(process.env.AMM_E2E_BUILT).toBe("1");
  const origin = new URL(baseURL!).origin;
  expect(["127.0.0.1", "localhost"]).toContain(new URL(origin).hostname);
  await page.route("**/*", async route => {
    const request = route.request(), target = new URL(request.url());
    if (target.origin !== origin) return route.abort("blockedbyclient");
    if (request.method() !== "GET" && request.method() !== "HEAD") return route.abort("blockedbyclient");
    if (target.pathname === "/api/health/live") return route.fulfill({ json: { ok: true, service: "ask-magic-mike", public_intake: "synthetic_qa" } });
    if (target.pathname === "/api/address-suggestions") return route.fulfill({ json: { enabled: false } });
    if (target.pathname.startsWith("/api/")) return route.abort("blockedbyclient");
    return route.continue();
  });
});

for (const width of [320, 360, 390, 430, 768, 1440]) {
  test(`public offers and all widget tabs reflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const destination of ["/home-value", "/buy", "/sell?seller_option=compare", "/ask", "/contact", "/thank-you", "/widget/v1"]) {
      await page.goto(destination);
      const call = page.getByRole("link", { name: /Call Magic Mike at/ }).first();
      await expect(call).toHaveAttribute("href", "tel:+12522454337");
      await expect(call).toBeVisible();
      await expect(page.getByRole("link", { name: /Text Magic Mike/ }).first()).toHaveAttribute("href", "sms:+12522454337");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await call.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      if (destination === "/widget/v1") {
        for (const tab of ["Home Value Review", "Buying Help", "Selling Options", "Ask a Question"]) {
          await page.getByRole("tab", { name: tab, exact: true }).click();
          await expect(call).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
      }
      if ([390, 1440].includes(width) && ["/home-value", "/widget/v1", "/contact"].includes(destination)) {
        const dir = path.resolve(process.env.AMM_E2E_OUTPUT_DIR || "output/playwright/public-contact-mobile"); mkdirSync(dir, { recursive: true });
        if (destination === "/widget/v1") await page.getByRole("tab", { name: "Home Value Review", exact: true }).click();
        if (destination !== "/contact") await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
        await page.screenshot({ path: path.join(dir, `${destination.split("/")[1]}-${width}.png`), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("ordinary links preserve typed state and record intent only, with keyboard focus", async ({ page }) => {
  await page.goto("/home-value");
  const address = page.getByRole("combobox", { name: "Property address", exact: true });
  await address.fill("101 Synthetic Fixture Road Apt 4");
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() === "POST") mutations.push(new URL(request.url()).pathname); });
  await page.evaluate(() => document.querySelectorAll('a[href^="tel:"], a[href^="sms:"]').forEach(a => a.addEventListener("click", event => event.preventDefault())));
  const call = page.getByRole("link", { name: /Call Magic Mike at/ }).first();
  await call.focus(); await expect(call).toBeFocused(); await page.keyboard.press("Enter");
  await page.getByRole("link", { name: /Text Magic Mike/ }).first().click();
  await expect(address).toHaveValue("101 Synthetic Fixture Road Apt 4");
  expect(mutations).toEqual([]); // automated browser is excluded from the ledger
  expect(await page.evaluate(() => sessionStorage.getItem("amm_home_value_pending_request_v1"))).toBeNull();
});

test("200% text and landscape keep in-flow contact clear of form controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/widget/v1");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.getByRole("link", { name: /Call Magic Mike at/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("[data-public-mike-contact]").evaluate(e => getComputedStyle(e).position)).toBe("static");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("combobox", { name: "Property address", exact: true }).focus();
  await expect(page.getByRole("combobox", { name: "Property address", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("public utility/auth routes never acquire a marketing contact bar", async ({ page }) => {
  for (const destination of ["/lead-center-login", "/lead-center-password-help", "/phone-alerts/setup"]) {
    await page.goto(destination);
    await expect(page.locator("[data-public-mike-contact]")).toHaveCount(0);
  }
});

test("shared public route inventory, aliases and fallback retain contact; no root-layout overlay", async ({ page }) => {
  for (const destination of ["/", "/accessibility", "/privacy", "/terms", "/rent", "/my", "/my/account", "/plan", "/integrations/ourtownproperties", "/widget-preview", "/value", "/we-buy-houses", "/widget", "/embed/ask", "/missing-public-page"]) {
    await page.goto(destination);
    await expect(page.getByRole("link", { name: /Call Magic Mike at/ }).first()).toHaveAttribute("href", "tel:+12522454337");
    await expect(page.getByRole("link", { name: /Text Magic Mike/ }).first()).toHaveAttribute("href", "sms:+12522454337");
  }
});

test("intercepted confirmation keeps direct contact readable on paper; failure stays unsaved", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dir = path.resolve(process.env.AMM_E2E_OUTPUT_DIR || "output/playwright/public-contact-mobile"); mkdirSync(dir, { recursive: true });
  let accept = false, attempts = 0;
  await page.route("**/api/leads", async route => {
    expect(new URL(route.request().url()).hostname).toBe("127.0.0.1");
    const input = route.request().postDataJSON();
    expect(input.email).toBe("public-contact@example.test");
    expect(input.name).toContain("INTERNAL QA");
    attempts++;
    const correlation = randomUUID();
    await route.fulfill({ status: accept ? 200 : 503, contentType: "application/json", headers: { "X-AMM-Correlation-Id": correlation },
      body: JSON.stringify(accept
        ? { lead_id: randomUUID(), session_id: input.idempotency_key, correlation_id: correlation, duplicate_of_lead_id: null, message: "INTERCEPTED UI RECEIPT — no inquiry persisted." }
        : { code: "intake_storage_unavailable", error: "INTERCEPTED FAILURE — nothing saved.", correlation_id: correlation }) });
  });
  await page.goto("/home-value");
  await expect(page.locator('[data-intake-mode="synthetic_qa"]')).toBeVisible();
  await page.getByRole("combobox", { name: "Property address", exact: true }).fill("101 Synthetic Fixture Road Apt 4");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("SYNTHETIC INTERNAL QA DO NOT CONTACT");
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill("public-contact@example.test");
  await page.getByRole("button", { name: "Request Valuation", exact: true }).click();
  // Next's route announcer is also role=alert; target the actual form failure,
  // not whichever framework alert happens to mount first on a CI worker.
  const failure = page.locator("#home-value-form-error");
  await expect(failure).toHaveAttribute("role", "alert");
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("couldn't confirm whether your request was saved");
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(dir, "home-value-error-390.png"), fullPage: true });
  accept = true;
  await page.getByRole("button", { name: "Retry identical request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  expect(attempts).toBe(2); // mock failure then same-key retry, not two inquiries
  const contact = page.locator('[data-amm-step="thank-you"] [data-public-mike-contact]');
  const colors = await contact.evaluate(e => {
    const call = e.querySelector("[data-mike-call]")!, label = call.querySelector("span")!, text = e.querySelector("[data-mike-text]")!;
    return { call: getComputedStyle(label).color, callBg: getComputedStyle(call).backgroundColor,
      text: getComputedStyle(text).color, textBg: getComputedStyle(text).backgroundColor };
  });
  const luminance = (color: string) => {
    const channels = color.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(v => { const s = Number(v) / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  for (const [fg, bg] of [[colors.call, colors.callBg], [colors.text, colors.textBg]]) {
    const a = luminance(fg), b = luminance(bg);
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5);
  }
  await page.screenshot({ path: path.join(dir, "home-value-confirmation-390.png"), fullPage: true });
});
