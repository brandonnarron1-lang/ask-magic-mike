import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

// Compiled LOCAL UI only. Health modes and all mutation receipts are explicitly
// intercepted fixtures, NOT deployed capability, HTTP-to-SQL, delivery, or QA
// persistence proof. No request forwarding, provider call or real contact.
test.skip(process.env.AMM_LAUNCH_INTAKE_UI_ACCEPTANCE !== "1", "Explicit local intercepted launch UI acceptance only");
test.use({ hasTouch: true, serviceWorkers: "block", contextOptions: { reducedMotion: "reduce" } });
const NAME = "SYNTHETIC FIXTURE | INTERNAL QA | DO NOT CONTACT";
const EMAIL = "launch-ui-fixture@example.test";
const PHONE = "+12025550194";
const ADDRESS = "101 Synthetic Fixture Road, Wilson NC | INTERNAL QA | DO NOT CONTACT";
type Attempt = { key: string; body: string; payload: Record<string, unknown> };
type Capture = {
  attempts: Attempt[]; pageErrors: string[]; violations: string[]; appointmentBodies: Record<string, unknown>[];
  mode: "live" | "synthetic_qa"; lead: string;
  reply: (route: Route, attempt: Attempt, index: number) => Promise<void>;
};
const captures = new WeakMap<Page, Capture>();

async function saved(route: Route, attempt: Attempt, lead: string, replay = false) {
  const correlation = randomUUID();
  await route.fulfill({ status: 200, contentType: "application/json",
    headers: { "X-AMM-Correlation-Id": correlation, ...(replay ? { "X-AMM-Idempotent-Replay": "1" } : {}) },
    body: JSON.stringify({ lead_id: lead, session_id: attempt.key, correlation_id: correlation, duplicate_of_lead_id: null,
      message: "INTERCEPTED UI FIXTURE — no capture persistence or delivery occurred." }),
  });
}

test.beforeEach(async ({ page, baseURL }) => {
  expect(process.env.PREVIEW_URL, "Never force a deployed capability or capture a real Preview lead").toBeFalsy();
  expect(process.env.AMM_E2E_BUILT, "Required compiled native-keyboard reproduction").toBe("1");
  const origin = new URL(baseURL!).origin;
  expect(["localhost", "127.0.0.1", "[::1]"]).toContain(new URL(origin).hostname);
  const capture: Capture = {
    attempts: [], pageErrors: [], violations: [], appointmentBodies: [], mode: "synthetic_qa", lead: randomUUID(),
    reply: (route, attempt) => saved(route, attempt, capture.lead),
  };
  captures.set(page, capture);
  page.on("pageerror", error => capture.pageErrors.push(error.stack || error.message));
  await page.route("**/*", async route => {
    const request = route.request(); const target = new URL(request.url());
    if (target.origin !== origin) { await route.abort("blockedbyclient"); return; }
    if (target.pathname === "/api/health/live" && request.method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, service: "ask-magic-mike", public_intake: capture.mode }) }); return;
    }
    if (target.pathname === "/api/address-suggestions" && request.method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ enabled: false }) }); return;
    }
    if (["GET", "HEAD"].includes(request.method())) {
      if (target.pathname.startsWith("/api/")) { capture.violations.push("unexpected_api_read"); await route.abort("blockedbyclient"); return; }
      await route.continue(); return; // local documents/static assets only
    }
    if (target.pathname === "/api/leads" && request.method() === "POST") {
      const body = request.postData() || "";
      const attempt = { body, key: request.headers()["idempotency-key"] || "", payload: JSON.parse(body) as Record<string, unknown> };
      capture.attempts.push(attempt); await capture.reply(route, attempt, capture.attempts.length); return;
    }
    if (target.pathname === "/api/appointments/request" && request.method() === "POST") {
      capture.appointmentBodies.push(request.postDataJSON() as Record<string, unknown>);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "requested" }) }); return;
    }
    if (target.pathname === "/api/events" && request.method() === "POST") { await route.fulfill({ status: 202, body: "" }); return; }
    capture.violations.push("unexpected_mutation"); await route.abort("blockedbyclient");
  });
});
test.afterEach(async ({ page }) => {
  const capture = captures.get(page);
  expect(capture?.violations).toEqual([]);
  expect(capture?.pageErrors, "Never waive React #185, hydration or any page error").toEqual([]);
});

async function buyer(page: Page, phoneOnly = false) {
  await page.getByLabel("Name", { exact: true }).fill(NAME);
  if (phoneOnly) await page.getByLabel("Phone", { exact: true }).fill(PHONE);
  else await page.getByLabel("Email", { exact: true }).fill(EMAIL);
}
async function review(page: Page) {
  await page.getByRole("button", { name: "Review request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your request", exact: true })).toBeFocused();
}
async function submit(page: Page) {
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
}

test("rapid native typing, idle and touch-390 specific property retain a reviewed QA request", async ({ page }) => {
  const capture = captures.get(page)!;
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/buy");
  for (const name of ["A specific property", "A general home search"]) {
    const label = page.getByRole("radio", { name, exact: true }).locator("..");
    await expect(label).toBeVisible();
    const box = await label.boundingBox();
    expect(box?.height, "Native radio label must render at least 44px tall").toBeGreaterThanOrEqual(44);
  }
  const address = page.getByLabel("Property address (or provide a listing URL)");
  await address.focus(); await page.keyboard.type(ADDRESS); await page.waitForTimeout(10_000);
  await expect(address).toHaveValue(ADDRESS); expect(capture.pageErrors).toEqual([]);
  await buyer(page); await review(page); expect(capture.attempts).toHaveLength(0);
  await submit(page); expect(capture.attempts).toHaveLength(1);
  expect(capture.attempts[0].payload.buyer_interest).toEqual({ version: 1, kind: "specific", properties: [{ address_text: ADDRESS }] });
  await expect(page.getByRole("button", { name: "Request a conversation", exact: true })).toHaveCount(0);
  expect(capture.appointmentBodies).toHaveLength(0);
});

test("URL-only property, unit and reference remain unverified references", async ({ page }) => {
  const capture = captures.get(page)!; await page.goto("/buy"); await buyer(page);
  await page.getByLabel("Listing URL (or provide an address)").fill("https://listing.example.test/17");
  await page.getByLabel("Unit or apartment (optional)").fill("Unit 4");
  await page.getByLabel("Listing reference (optional)").fill("SYNTHETIC-17");
  await review(page); await expect(page.getByText("Listing URL: https://listing.example.test/17")).toBeVisible(); await submit(page);
  expect(capture.attempts[0].payload.buyer_interest).toEqual({ version: 1, kind: "specific", properties: [{ listing_url: "https://listing.example.test/17", unit: "Unit 4", reference: "SYNTHETIC-17" }] });
  expect(capture.attempts[0].payload).not.toHaveProperty("address");
});

test("general search captures desired area/budget and top-level timeline/question", async ({ page }) => {
  const capture = captures.get(page)!; await page.goto("/buy"); await buyer(page);
  await page.getByRole("radio", { name: "A general home search" }).check();
  await page.getByLabel("Desired area").fill("Wilson and Elm City"); await page.getByLabel("Budget range (optional)").fill("Approx. 250–350k");
  await page.getByRole("combobox", { name: "Timeline (optional)", exact: true }).selectOption("Just planning");
  await page.getByLabel("What would be most helpful?").fill("A practical search plan."); await review(page); await submit(page);
  expect(capture.attempts[0].payload).toMatchObject({ buyer_interest: { version: 1, kind: "search", desired_area: "Wilson and Elm City", budget_range: "Approx. 250–350k" }, timeline: "Just planning", question: "A practical search plan." });
  expect(capture.attempts[0].payload).not.toHaveProperty("target_geography"); expect(capture.attempts[0].payload).not.toHaveProperty("address");
});

test("eventless native contact and consent require an updated visible review before POST", async ({ page }) => {
  const capture = captures.get(page)!; await page.goto("/buy"); await buyer(page);
  await page.getByLabel("Property address (or provide a listing URL)").fill(ADDRESS); await review(page);
  await page.getByLabel("Email", { exact: true }).evaluate((element: HTMLInputElement) => { element.value = "eventless@example.test"; });
  await page.getByRole("checkbox", { name: /Our Town Properties may contact me/i }).evaluate((element: HTMLInputElement) => { element.checked = true; });
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click();
  await expect(page.locator("#buyer-form-status")).toHaveAttribute("role", "alert");
  await expect(page.locator("#buyer-form-status")).toContainText("Your details changed"); expect(capture.attempts).toHaveLength(0);
  await expect(page.getByText("Email: eventless@example.test")).toBeVisible(); await submit(page);
  expect(capture.attempts[0].payload).toMatchObject({ email: "eventless@example.test", consent: true, consent_email: true, consent_call: false });
});

test("phone-only widget buyer uses intercepted LIVE capability and no outbound capture", async ({ page }) => {
  const capture = captures.get(page)!; capture.mode = "live"; await page.goto("/widget");
  await page.getByRole("tab", { name: "Find a Home", exact: true }).click(); await buyer(page, true);
  await page.getByLabel("Property address (or provide a listing URL)").fill(ADDRESS); await review(page); await submit(page);
  expect(capture.attempts).toHaveLength(1);
  expect(capture.attempts[0].payload).toMatchObject({ funnel_type: "buyer", lead_source_surface: "widget", email: "", phone: PHONE, consent: false, consent_email: false, consent_call: false });
});

test("phone-only Home Value preserves the address path and native review in intercepted LIVE mode", async ({ page }) => {
  const capture = captures.get(page)!; capture.mode = "live"; await page.goto("/home-value");
  await page.getByLabel("Property address", { exact: true }).fill(ADDRESS);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Your name").fill(NAME); await page.getByLabel("Phone (optional)").fill(PHONE);
  await expect(page.getByText("Phone: " + PHONE)).toBeVisible();
  await page.getByRole("button", { name: "Request Valuation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  expect(capture.attempts[0].payload).toMatchObject({ address: ADDRESS, email: "", phone: PHONE, consent: false, consent_email: false, consent_call: false });
});

test("unknown failure retains exact bytes/key for manual replay, never a fresh lead", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = async (route, attempt, index) => {
    if (index === 1) { await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "INTERCEPTED UNKNOWN FAILURE" }) }); return; }
    await saved(route, attempt, capture.lead, true);
  };
  await page.goto("/buy"); await buyer(page); await page.getByLabel("Property address (or provide a listing URL)").fill(ADDRESS); await review(page);
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click();
  await expect(page.locator("#buyer-form-status")).toContainText("couldn't confirm"); await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry identical request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your request is in.", exact: true })).toBeVisible();
  expect(capture.attempts).toHaveLength(2); expect(capture.attempts[1]).toEqual(capture.attempts[0]);
});

test("reload restores reference only and cannot turn uncertainty into a new request", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = route => route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  await page.goto("/buy"); await buyer(page); await page.getByLabel("Property address (or provide a listing URL)").fill(ADDRESS); await review(page);
  await page.getByRole("button", { name: "Request Buyer Plan", exact: true }).click(); await expect(page.locator("#buyer-form-status")).toContainText("couldn't confirm");
  const key = capture.attempts[0].key; await page.reload();
  await expect(page.locator("#buyer-form-status")).toContainText("private form details were not stored"); await expect(page.getByText(key, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(""); await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Retry identical request", exact: true })).toHaveCount(0); expect(capture.attempts).toHaveLength(1);
});

test("ordinary saved-receipt UI passes its exact IDs to the shared appointment CTA (intercepted endpoints)", async ({ page }) => {
  const capture = captures.get(page)!; capture.mode = "live";
  await page.goto("/buy"); await buyer(page);
  await page.getByLabel("Name", { exact: true }).fill("SYNTHETIC FIXTURE — NOT A CONSUMER");
  await page.getByLabel("Property address (or provide a listing URL)").fill("101 Synthetic Fixture Road, Wilson NC");
  await review(page); await submit(page); await page.getByRole("button", { name: "Request a conversation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your appointment request has been received.", exact: true })).toBeVisible();
  expect(capture.appointmentBodies).toEqual([{ lead_id: capture.lead, session_id: capture.attempts[0].key, request_surface: "buyer_page" }]);
});

test("legacy Selling Options does not treat a bare 202 as a saved inquiry", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = route => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ message: "Got it." }) });
  await page.goto("/widget/v1"); await page.getByRole("tab", { name: "Selling Options", exact: true }).click();
  await page.getByLabel("Property address", { exact: true }).fill(ADDRESS);
  await page.getByLabel("Name optional", { exact: true }).fill(NAME);
  await page.getByLabel("Phone required", { exact: true }).fill(PHONE);
  await page.getByLabel("Email optional", { exact: true }).fill(EMAIL);
  await page.getByRole("button", { name: "Send Seller Details", exact: true }).click();
  await expect(page.locator("#seller-form-status")).toContainText("couldn't confirm");
  await expect(page.getByLabel("Property address", { exact: true })).toHaveValue(ADDRESS);
  await expect(page.getByRole("button", { name: "Request a conversation", exact: true })).toHaveCount(0);
  expect(capture.attempts).toHaveLength(1); expect(capture.appointmentBodies).toHaveLength(0);
});

test("unknown Selling Options result holds other widget paths and retries identical bytes/key", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = async (route, attempt, index) => index===1
    ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
    : saved(route, attempt, capture.lead, true);
  await page.goto("/widget/v1"); await page.getByRole("tab", { name: "Selling Options", exact: true }).click();
  await page.getByLabel("Property address", { exact: true }).fill(ADDRESS);
  await page.getByLabel("Name optional", { exact: true }).fill(NAME);
  await page.getByLabel("Phone required", { exact: true }).fill(PHONE);
  await page.getByLabel("Email optional", { exact: true }).fill(EMAIL);
  await page.getByRole("button", { name: "Send Seller Details", exact: true }).click();
  await expect(page.locator("#seller-form-status")).toContainText("couldn't confirm");
  for (const name of ["Get My Home Value", "Find a Home", "Ask a Question"]) await expect(page.getByRole("tab", { name, exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Open full form", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry identical request", exact: true }).click();
  await expect(page.locator("#seller-form-status")).toContainText("stored for review");
  expect(capture.attempts).toHaveLength(2); expect(capture.attempts[1]).toEqual(capture.attempts[0]);
  expect(capture.appointmentBodies).toHaveLength(0);
});

for (const width of [320, 390, 768, 1440]) {
  test(`seller and buyer review reflow at ${width}px and 200% text without submitting`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const output = process.env.AMM_E2E_OUTPUT_DIR;
    if (output) mkdirSync(output, { recursive: true });
    for (const route of ["/home-value", "/buy"] as const) {
      await page.goto(route);
      if (route === "/home-value") {
        await page.getByLabel("Property address", { exact: true }).fill(ADDRESS);
        await page.getByRole("button", { name: "Continue", exact: true }).click();
        await page.getByLabel("Your name").fill(NAME);
        await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill(EMAIL);
      } else {
        await buyer(page);
        await page.getByLabel("Property address (or provide a listing URL)").fill(ADDRESS.repeat(2));
        await review(page);
      }
      await page.evaluate(() => document.fonts.ready);
      const contact = page.getByLabel(route === "/buy" ? "Email" : "Email for your valuation follow-up", { exact: true });
      const originalControlFont = await contact.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      for (const enlarged of [false, true]) {
        await page.evaluate(value => { document.documentElement.style.fontSize = value ? "200%" : "100%"; }, enlarged);
        // The retained reduced-motion CSS uses an ultra-short transition.
        // Wait for its committed computed size, never override CSS or shrink it.
        await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(enlarged ? "32px" : "16px");
        await expect.poll(() => contact.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBe(originalControlFont * (enlarged ? 2 : 1));
        const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, font: getComputedStyle(document.documentElement).fontSize }));
        expect(dimensions.font).toBe(enlarged ? "32px" : "16px");
        expect(dimensions.scroll, "Never conceal horizontal overflow to pass").toBeLessThanOrEqual(dimensions.width + 1);
        const primary = page.getByRole("button", { name: route === "/buy" ? "Request Buyer Plan" : "Request Valuation", exact: true });
        await expect(primary).toBeVisible();
        const box = await primary.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        await primary.focus(); await expect(primary).toBeFocused();
        if (output) await page.screenshot({ path: path.join(output, `${route.slice(1)}-review-${width}-${enlarged ? "200" : "100"}.png`), fullPage: false });
      }
    }
    expect(captures.get(page)!.attempts).toHaveLength(0);
  });
}
