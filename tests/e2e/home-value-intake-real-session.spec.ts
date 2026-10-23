import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";

// Real compiled local UI + actual health capability in the existing isolated
// PG/auth harness. EVERY browser mutation is intercepted. Lead receipts below
// are synthetic UI fixtures, NOT evidence of public-handler/SQL acceptance.
// In particular, never rewrite localhost's Origin to pretend it is Production.
test.skip(process.env.AMM_HOME_VALUE_ACCEPTANCE !== "1", "Explicit isolated Home Value UI acceptance only");
test.use({ contextOptions: { reducedMotion: "reduce" }, hasTouch: true, serviceWorkers: "block", trace: "off", video: "off", screenshot: "off" });

const ADDRESS = "101 Synthetic Fixture Road, Wilson NC | INTERNAL QA | DO NOT CONTACT";
const EDITED_ADDRESS = "102 Synthetic Fixture Road, Wilson NC | INTERNAL QA | DO NOT CONTACT";
const LOOKUP_QUERY = "101 Synthetic Fixture Rd Apt 4";
const SUGGESTED_ADDRESS = "101 Synthetic Fixture Road, Apt 4, Wilson, NC 27893";
const MANUAL_EDITED_ADDRESS = "101 Synthetic Fixture Road, Apt 5, Wilson, NC 27893";
const NAME = "SYNTHETIC FIXTURE | INTERNAL QA | DO NOT CONTACT";
const EMAIL = "home-value-fixture@example.test";
const PHONE = "+12025550199"; // reserved fictional range; never sent anywhere
const PENDING_KEY = "amm_home_value_pending_request_v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIVE_CTA = "https://www.askmagicmike.com/home-value";
type Attempt = { key: string; body: string; payload: Record<string, unknown> };
type Capture = {
  attempts: Attempt[];
  statuses: (number | "aborted")[];
  violations: string[];
  appointments: number;
  auxiliaryWrites: number;
  externalBlocked: number;
  capabilityReads: number;
  capabilityModes: Set<string>;
  pageErrors: string[];
  addressLookupFixture?: boolean;
  checks: Promise<void>[];
  syntheticLeadIds: Map<string, string>;
  reply: (route: Route, attempt: Attempt, index: number) => Promise<void>;
  historyResult?: "trusted_browser_bfcache" | "new_document_pending_reference_guard";
  ownedRedirect?: { httpStatus: number; locationPreservedQuery: boolean; browserReachedCanonical: boolean };
};
type BrowserEvidence = {
  documentId: string;
  events: string[];
  pageShows: { trusted: boolean; persisted: boolean }[];
};
const captures = new WeakMap<Page, Capture>();
let appOrigin = "";
let outputDirectory = "";

const funnel = (page: Page) => page.locator(".amm-home-value");
const error = (page: Page) => funnel(page).getByRole("alert");
const submit = (page: Page) => funnel(page).getByRole("button", { name: "Request Valuation", exact: true });

function evidence(page: Page) {
  return page.evaluate(() => {
    const state = (window as Window & { __ammIntakeEvidence?: BrowserEvidence }).__ammIntakeEvidence;
    if (!state) throw new Error("browser_evidence_not_initialized");
    return state;
  });
}

async function savedReply(route: Route, capture: Capture, attempt: Attempt, replay = false) {
  const correlation = randomUUID();
  const leadId = capture.syntheticLeadIds.get(attempt.key) ?? randomUUID();
  capture.syntheticLeadIds.set(attempt.key, leadId);
  capture.statuses.push(200);
  await route.fulfill({
    status: 200, contentType: "application/json",
    headers: { "X-AMM-Correlation-Id": correlation, ...(replay ? { "X-AMM-Idempotent-Replay": "1" } : {}) },
    body: JSON.stringify({ lead_id: leadId, session_id: attempt.key, correlation_id: correlation,
      duplicate_of_lead_id: null, message: "INTERCEPTED SYNTHETIC UI RECEIPT — no intake persistence occurred." }),
  });
}

async function refusal(route: Route, capture: Capture, status: number, code: string, headers: Record<string, string> = {}) {
  const correlation = randomUUID();
  capture.statuses.push(status);
  await route.fulfill({ status, contentType: "application/json",
    headers: { "X-AMM-Correlation-Id": correlation, ...headers },
    body: JSON.stringify({ code, error: "INTERCEPTED SYNTHETIC REFUSAL", correlation_id: correlation }),
  });
}

async function installBoundary(page: Page): Promise<Capture> {
  const capture: Capture = {
    attempts: [], statuses: [], violations: [], appointments: 0, auxiliaryWrites: 0,
    externalBlocked: 0, capabilityReads: 0, capabilityModes: new Set(), pageErrors: [], checks: [], syntheticLeadIds: new Map(),
    reply: (route, attempt) => savedReply(route, capture, attempt),
  };
  page.on("pageerror", error => capture.pageErrors.push(error.stack || error.message));
  await page.addInitScript(() => {
    const state: BrowserEvidence = { documentId: crypto.randomUUID(), events: [], pageShows: [] };
    (window as Window & { __ammIntakeEvidence?: BrowserEvidence }).__ammIntakeEvidence = state;
    window.addEventListener("pageshow", event => state.pageShows.push({ trusted: event.isTrusted, persisted: event.persisted }));
    window.addEventListener("askmagicmike:event", event => {
      const name: unknown = (event as CustomEvent).detail?.event;
      // Retain event names only, never analytics dimensions or contact values.
      if (typeof name === "string" && /^[a-z_]+$/.test(name)) state.events.push(name);
    });
  });
  page.on("response", response => {
    const target = new URL(response.url());
    if (target.origin !== appOrigin || target.pathname !== "/api/health/live") return;
    capture.checks.push((async () => {
      capture.capabilityReads += 1;
      const body: unknown = await response.json();
      const mode = body && typeof body === "object" ? (body as Record<string, unknown>).public_intake : null;
      if (response.status() !== 200 || mode !== "synthetic_qa") capture.violations.push("actual_health_not_synthetic_qa");
      else capture.capabilityModes.add(mode);
    })().catch(() => { capture.violations.push("actual_health_unreadable"); }));
  });

  // One pre-navigation, fail-closed boundary includes aliases, unexpected API
  // mutations, analytics and external resources. No route.fetch(), request
  // forwarding, Origin changes, APIRequestContext POST or provider calls.
  await page.route("**/*", async route => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin !== appOrigin) {
      capture.externalBlocked += 1;
      await route.abort("blockedbyclient");
      return;
    }
    const method = request.method();
    if (target.pathname === "/api/address-suggestions" && capture.addressLookupFixture) {
      // Offline fixture only. No real billable provider or application limiter
      // request is forwarded; the ordinary unconfigured GET remains genuine.
      if (method === "GET") { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: true }) }); return; }
      const input = request.postDataJSON();
      if (method !== "POST" || input.query !== LOOKUP_QUERY || !UUID.test(input.sessionToken) ||
        Object.keys(input).some(key => !["operation", "query", "sessionToken", "candidateToken"].includes(key))) {
        capture.violations.push("non_synthetic_address_lookup_blocked"); await route.abort("blockedbyclient"); return;
      }
      if (input.operation === "suggest") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "results", suggestions: [{ id: "synthetic_place", label: "101 Synthetic Fixture Road", secondary: "Wilson, NC 27893", token: "offline_fixture_token" }] }) });
      else if (input.operation === "resolve" && input.candidateToken === "offline_fixture_token") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ state: "resolved", result: { id: "synthetic_place", label: "101 Synthetic Fixture Road, Wilson NC 27893", components: { line1: "101 Synthetic Fixture Road", line2: "", locality: "Wilson", region: "NC", postalCode: "27893", country: "US" } } }) });
      else { capture.violations.push("invalid_lookup_operation_blocked"); await route.abort("blockedbyclient"); }
      return;
    }
    if (target.pathname === "/api/leads" && method === "POST" && !target.search) {
      const raw = request.postData() ?? "";
      let payload: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
      } catch { /* Never print a raw request or contact value. */ }
      const key = request.headers()["idempotency-key"] ?? "";
      const fixtureName = typeof payload.name === "string" ? payload.name.toUpperCase() : "";
      if (!UUID.test(key) || payload.idempotency_key !== key || payload.widget_session_id !== key ||
        !fixtureName.includes("INTERNAL QA") || !fixtureName.includes("DO NOT CONTACT") ||
        typeof payload.email !== "string" || !payload.email.endsWith("@example.test") ||
        ![ADDRESS, EDITED_ADDRESS, SUGGESTED_ADDRESS, MANUAL_EDITED_ADDRESS].includes(String(payload.address)) ||
        !["", PHONE, "+12025550188"].includes(String(payload.phone))) {
        capture.violations.push("non_synthetic_or_invalid_lead_request_blocked");
        await route.abort("blockedbyclient");
        return;
      }
      const attempt = { key, body: raw, payload };
      capture.attempts.push(attempt);
      await capture.reply(route, attempt, capture.attempts.length);
      return;
    }
    if (target.pathname.startsWith("/api/leads") || target.pathname.startsWith("/api/appointments")) {
      if (target.pathname.startsWith("/api/appointments")) capture.appointments += 1;
      capture.violations.push("unexpected_lead_or_appointment_route_blocked");
      await route.abort("blockedbyclient");
      return;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      if (["/api/events", "/api/analytics/event", "/api/experiments/event"].includes(target.pathname) && method === "POST") {
        capture.auxiliaryWrites += 1;
        await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ ok: true, recorded: false, active: false, intercepted: true }) });
      } else {
        capture.violations.push("unexpected_first_party_mutation_blocked");
        await route.abort("blockedbyclient");
      }
      return;
    }
    // In particular /api/health/live is the actual local harness response;
    // never mock an enabling capability or treat the UI fixture as authority.
    await route.fallback();
  });
  captures.set(page, capture);
  return capture;
}

async function openHomeValue(page: Page, width = 390) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/home-value?utm_source=internal_qa&utm_campaign=synthetic_ui_acceptance");
  await expect(page.locator('[data-intake-mode="synthetic_qa"]')).toHaveCount(1);
  await expect(page.getByLabel("Property address", { exact: true })).toBeEnabled();
}

async function contact(page: Page, phone = "") {
  await page.getByLabel("Property address", { exact: true }).fill(ADDRESS);
  await funnel(page).getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeFocused();
  await page.getByLabel("Your name", { exact: true }).fill(NAME);
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill(EMAIL);
  await page.getByLabel("Phone (optional)", { exact: true }).fill(phone);
}

async function noOverflow(page: Page) {
  try {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  } catch (failure) {
    const layout = await page.evaluate(() => ({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
      rootFont:getComputedStyle(document.documentElement).fontSize,
      offenders:Array.from(document.querySelectorAll("main *")).flatMap(element=>{
        const rect=element.getBoundingClientRect();
        return rect.width>0&&(rect.right>document.documentElement.clientWidth+1||rect.left< -1)
          ?[{tag:element.tagName,className:element.getAttribute("class"),left:rect.left,right:rect.right,width:rect.width,inForm:Boolean(element.closest(".amm-home-value"))}]:[];
      }).slice(0,40)}));
    writeFileSync(path.join(outputDirectory,"first-overflow-private.json"),JSON.stringify(layout,null,2),{mode:0o600});
    await page.screenshot({path:path.join(outputDirectory,"first-overflow-private.png"),fullPage:true});
    throw failure;
  }
}

async function targets(page: Page) {
  const measurements = await funnel(page).locator('form button, form input:not([type="checkbox"]), form select, form label:has(input[type="checkbox"]), [data-intake-mode] a').evaluateAll(elements =>
    elements.filter(element => element.getClientRects().length > 0).map(element => {
      const box = element.getBoundingClientRect();
      return { tag: element.tagName, width: box.width, height: box.height,
        inside: box.left >= -1 && box.right <= document.documentElement.clientWidth + 1 };
    }));
  expect(measurements.length).toBeGreaterThan(0);
  for (const measurement of measurements) {
    expect(measurement.height, `${measurement.tag} target height`).toBeGreaterThanOrEqual(44);
    expect(measurement.width, `${measurement.tag} target width`).toBeGreaterThanOrEqual(44);
    expect(measurement.inside, `${measurement.tag} must remain in the viewport width`).toBe(true);
  }
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(outputDirectory, `synthetic-home-value-${name}.png`), fullPage: true });
}

async function pendingMarker(page: Page, key: string) {
  const raw = await page.evaluate(storageKey => sessionStorage.getItem(storageKey), PENDING_KEY);
  expect(typeof raw).toBe("string");
  const marker = JSON.parse(raw!);
  expect(Object.keys(marker).sort()).toEqual(["at", "key", "version"]);
  expect(marker.version).toBe(1);
  expect(marker.key === key).toBe(true);
  expect(new Date(marker.at).toISOString()).toBe(marker.at);
  for (const value of [ADDRESS, NAME, EMAIL, PHONE, "consent", "body", "hash"]) expect(raw!.includes(value)).toBe(false);
}

async function assertSaved(page: Page) {
  const heading = funnel(page).getByRole("heading", { name: "Your request is in.", exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(funnel(page)).toContainText("Saved request reference:");
  await expect(funnel(page)).toContainText("This test request does not create an appointment or consumer outreach.");
  await expect(funnel(page).getByText("Our Town Properties follows up through your provided contact path.", { exact: true })).toHaveCount(0);
  await expect(funnel(page).getByText("You can request a conversation now if you want a faster handoff.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Request a conversation", exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(storageKey => sessionStorage.getItem(storageKey), PENDING_KEY)).toBeNull();
}

async function assertUnconfirmed(page: Page) {
  await expect(error(page)).toContainText("couldn't confirm");
  await expect(funnel(page).getByRole("heading", { name: "Your request is in.", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email for your valuation follow-up", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Email for your valuation follow-up", { exact: true })).toHaveValue(EMAIL);
  await expect(funnel(page).getByRole("button", { name: "Edit address", exact: true })).toBeDisabled();
}

async function fixedLiveLinks(page: Page) {
  const help = funnel(page).locator('[data-intake-mode] details');
  const initiallyClosed = await help.getAttribute("open") === null;
  if (initiallyClosed) await help.locator("summary").click();
  const links = page.getByRole("link", { name: "Open the live Home Value form", exact: true });
  await expect(links).toHaveCount(1);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", LIVE_CTA);
    await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(link).toHaveAttribute("rel", "noreferrer");
  }
  if (initiallyClosed) await help.locator("summary").click();
}

async function beforeInDocument(first: Locator, second: Locator) {
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  expect(a).not.toBeNull(); expect(b).not.toBeNull();
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 1);
}

async function rootFontDiagnostic(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.documentElement;
    const address = document.querySelector<HTMLInputElement>('.amm-home-value input[name="address"]')!;
    const probe = document.createElement("span");
    probe.textContent = "Hgx1"; // Fixed non-PII glyph sample; never customer content.
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {position:"fixed",left:"-10000px",visibility:"hidden",
      display:"inline-block",whiteSpace:"pre",fontSize:"1rem",lineHeight:"normal",pointerEvents:"none"});
    document.body.appendChild(probe);
    const snapshot = () => ({
      immediate:getComputedStyle(root).fontSize,
      readable:{address:{"font-size":getComputedStyle(address).fontSize}},
      glyphs:[{size:"1rem",width:probe.getBoundingClientRect().width}],
    });
    try {
      const original = snapshot();
      root.style.fontSize = "200%";
      const immediate = snapshot().immediate;
      let restoredAfterFrames = snapshot();
      let framesWaited = 0;
      // Reduced-motion CSS still has an ultra-short transition. Sample the
      // actual enlarged root, control AND glyph, not a percentage during its
      // initial frame. Bound the wait; keep literal 200% and every assertion.
      for (; framesWaited < 60; framesWaited++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        restoredAfterFrames = snapshot();
        const rootRatio = parseFloat(restoredAfterFrames.immediate) / parseFloat(original.immediate);
        const inputRatio = parseFloat(restoredAfterFrames.readable.address["font-size"]) / parseFloat(original.readable.address["font-size"]);
        const glyphRatio = restoredAfterFrames.glyphs[0].width / original.glyphs[0].width;
        if (rootRatio === 2 && inputRatio === 2 && Math.abs(glyphRatio-2)<0.05) break;
      }
      return {source:"bounded-literal-200-percent-root-control-and-glyph-measurement",
        before:original.immediate,inline:root.style.fontSize,immediate,framesWaited,
        original,restoredAfterFrames};
    } finally { probe.remove(); }
  });
}

test.beforeAll(async ({ request }, info) => {
  if (process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_QA_POSTGRES_TEST !== "1" ||
    process.env.VERCEL_ENV !== "development" || process.env.VERCEL || process.env.VERCEL_URL || process.env.PREVIEW_URL) throw new Error("isolated_home_value_harness_required");
  let db: URL, app: URL;
  try {
    db = new URL(process.env.DATABASE_URL || "http://invalid");
    app = new URL(info.project.use.baseURL || "http://invalid");
  } catch { throw new Error("invalid_isolated_home_value_venue_configuration"); }
  if (!["postgres:", "postgresql:"].includes(db.protocol) || db.hostname !== "localhost" || db.username !== "postgres" ||
    db.password || !db.port || db.pathname !== "/amm_qa_upgrade" || db.search || db.hash ||
    app.protocol !== "http:" || app.hostname !== "localhost" || app.port !== process.env.AMM_E2E_PORT ||
    process.env.BETTER_AUTH_URL !== app.origin ||
    !(process.env.NODE_OPTIONS || "").split(/\s+/).includes(`--import=${path.resolve("tests/support/isolated-neon-transport.mjs")}`)) throw new Error("exact_isolated_home_value_venue_required");
  for (const key of ["EMAIL_ENABLED", "CUSTOMER_EMAIL_ENABLED", "CUSTOMER_SMS_ENABLED", "AGENT_SMS_NOTIFICATIONS_ENABLED", "AGENT_EMAIL_NOTIFICATIONS_ENABLED", "LEAD_NOTIFICATION_ENABLED", "WEB_PUSH_ENABLED", "LEAD_ALLOCATION_SENDS_ENABLED"]) {
    if (process.env[key] !== "false") throw new Error("explicit_outbound_disabled_required");
  }
  const artifactDir = path.resolve(process.env.AMM_SESSION_ARTIFACT_DIR || "");
  outputDirectory = path.resolve(process.env.AMM_E2E_OUTPUT_DIR || "");
  if (!artifactDir.startsWith(`${path.resolve(".amm-run")}${path.sep}`) ||
    !outputDirectory.startsWith(`${artifactDir}${path.sep}`)) throw new Error("private_home_value_artifact_directory_required");
  appOrigin = app.origin;
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  // Read-only actual GET, not an intercepted response and not a SQL readiness
  // claim. The app's own no-store capability must attest this exact harness.
  const health = await request.get("/api/health/live");
  expect(health.status()).toBe(200);
  const body = await health.json();
  expect(body.public_intake).toBe("synthetic_qa");
  expect(health.headers()["cache-control"]).toContain("no-store");
});

test.beforeEach(async ({ page }) => { await installBoundary(page); });

test.afterEach(async ({ page }, info: TestInfo) => {
  const capture = captures.get(page);
  if (!capture) return;
  await Promise.all(capture.checks);
  // Explicit sanitized allowlist: no payload/contact/consent/body/hash, raw
  // URL/query, credentials, UUIDs, server bodies, or console messages exported.
  const diagnostics = {
    source: "browser-intercepted-synthetic-ui-receipts-not-intake-sql-proof",
    test: info.title, status: info.status, viewport: page.viewportSize(),
    actualCapabilityReads: capture.capabilityReads, actualCapabilityModes: [...capture.capabilityModes],
    canonicalLeadRequestsIntercepted: capture.attempts.length, responseStatuses: capture.statuses,
    identicalKeys: capture.attempts.every(attempt => attempt.key === capture.attempts[0]?.key),
    identicalPayloadBytes: capture.attempts.every(attempt => attempt.body === capture.attempts[0]?.body),
    appointmentRequestsBlocked: capture.appointments, auxiliaryMutationsIntercepted: capture.auxiliaryWrites,
    externalRequestsBlocked: capture.externalBlocked, violations: capture.violations,
    uncaughtPageErrorCount: capture.pageErrors.length,
    react418Observed: capture.pageErrors.some(message => /#418|errors\/418/.test(message)),
    historyRestoration: capture.historyResult ?? "not_exercised",
    ownedRedirect: capture.ownedRedirect ?? null,
  };
  const name = info.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 110);
  const file = path.join(outputDirectory, `synthetic-home-value-${name}-diagnostics.json`);
  writeFileSync(file, JSON.stringify(diagnostics, null, 2), { mode: 0o600 });
  if (capture.pageErrors.length) writeFileSync(path.join(outputDirectory, `${name}-page-errors-private.json`), JSON.stringify({scope:"synthetic loopback only",errors:capture.pageErrors},null,2),{mode:0o600});
  await info.attach("sanitized synthetic UI request diagnostics", { path: file, contentType: "application/json" });
  expect(capture.violations, "Blocked boundary violations; never forwarded to the server").toEqual([]);
  expect(capture.pageErrors.length, "Uncaught page errors preserved privately; a later pass is not a repair").toBe(0);
  expect(capture.appointments).toBe(0);
  expect(capture.capabilityReads).toBeGreaterThan(0);
  expect([...capture.capabilityModes]).toEqual(["synthetic_qa"]);
});

test("Actual local GET /value redirects to /home-value and the browser retains the owned-media query", async ({ page }) => {
  const capture = captures.get(page)!;
  const query = "utm_source=ourtownproperties&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page";
  const requested = `${appOrigin}/value?${query}`;
  const canonical = `${appOrigin}/home-value?${query}`;
  await page.setViewportSize({ width: 390, height: 1000 });
  const redirectObserved = page.waitForResponse(response =>
    response.request().isNavigationRequest() && response.request().method() === "GET" && response.url() === requested);
  const final = await page.goto(requested);
  const redirect = await redirectObserved;
  // These assertions exercise the compiled next.config.ts redirect over actual
  // HTTP. No imported redirect-rule strings or intercepted redirect response.
  const location = new URL(redirect.headers()["location"] || "/missing", appOrigin);
  capture.ownedRedirect = { httpStatus: redirect.status(), locationPreservedQuery: location.href === canonical, browserReachedCanonical: page.url() === canonical };
  expect(redirect.status()).toBe(308);
  expect(location.href).toBe(canonical);
  expect(final?.status()).toBe(200);
  expect(final?.request().redirectedFrom()?.url()).toBe(requested);
  await expect(page).toHaveURL(canonical);
  await expect(page.locator('[data-intake-mode="synthetic_qa"]')).toHaveCount(1);
  await expect(page.getByLabel("Property address", { exact: true })).toBeEnabled();
  await fixedLiveLinks(page); await noOverflow(page);
  expect(capture.attempts).toHaveLength(0);
  await screenshot(page, "actual-value-owned-media-redirect-390");
});

for (const width of [320, 390, 430, 768, 1440]) {
  test(`Synthetic UI receipt at ${width}px: reduced motion, 44px targets, QA no appointment`, async ({ page }) => {
    await openHomeValue(page, width);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    if (width < 1024) await expect(page.locator("h1 .lg\\:hidden")).toHaveText("Request a local home value review.");
    await fixedLiveLinks(page); await noOverflow(page); await targets(page);
    await screenshot(page, `address-${width}`);
    await contact(page, width === 390 ? PHONE : "");
    await noOverflow(page); await targets(page);
    await screenshot(page, `contact-${width}`);
    await submit(page).click();
    await assertSaved(page);
    const capture = captures.get(page)!;
    expect(capture.attempts).toHaveLength(1);
    expect(capture.attempts[0].payload.phone === (width === 390 ? PHONE : "")).toBe(true);
    expect(capture.attempts[0].payload.consent).toBe(false);
    await noOverflow(page); await screenshot(page, `synthetic-receipt-${width}`);
  });
}

for (const width of [320, 768]) {
  test(`200 percent root text reflows at ${width}px in both form steps`, async ({ page }) => {
    await openHomeValue(page, width);
    const fontDiagnostic = await rootFontDiagnostic(page);
    writeFileSync(path.join(outputDirectory,`root-text-${width}-private.json`),JSON.stringify(fontDiagnostic,null,2),{mode:0o600});
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe("200%");
    // A stored percentage or a root-only change is not enlarged readable type.
    const original = fontDiagnostic.original.readable.address;
    const enlarged = fontDiagnostic.restoredAfterFrames.readable.address;
    expect(original).not.toBeNull(); expect(enlarged).not.toBeNull();
    expect(parseFloat(enlarged!["font-size"]) / parseFloat(original!["font-size"])).toBe(2);
    const beforeGlyph = fontDiagnostic.original.glyphs.find(glyph => glyph.size === "1rem")!;
    const afterGlyph = fontDiagnostic.restoredAfterFrames.glyphs.find(glyph => glyph.size === "1rem")!;
    expect(afterGlyph.width / beforeGlyph.width, "Fixed rendered glyph sample must actually enlarge 2x").toBeCloseTo(2, 1);
    await noOverflow(page); await targets(page); await screenshot(page, `text-200-address-${width}`);
    await contact(page, PHONE);
    await noOverflow(page); await targets(page); await screenshot(page, `text-200-contact-${width}`);
    expect(captures.get(page)!.attempts).toHaveLength(0);
  });
}

test("Keyboard navigation preserves visible focus and saves only an intercepted synthetic receipt", async ({ page }) => {
  await openHomeValue(page);
  const address = page.getByLabel("Property address", { exact: true });
  await address.focus(); await page.keyboard.type(ADDRESS); await page.keyboard.press("Tab");
  await expect(funnel(page).getByRole("button", { name: "Enter / edit address manually", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(funnel(page).getByRole("button", { name: "Continue", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  const name = page.getByLabel("Your name", { exact: true });
  await expect(name).toBeFocused();
  expect(await name.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.type(NAME); await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email for your valuation follow-up", { exact: true })).toBeFocused();
  await page.keyboard.type(EMAIL); await page.keyboard.press("Tab");
  await expect(page.getByLabel("Phone (optional)", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(page.getByLabel("Timeline", { exact: true })).toBeFocused();
  await page.keyboard.press("End"); await page.keyboard.press("Tab");
  await expect(funnel(page).getByRole("checkbox")).toBeFocused();
  await page.keyboard.press("Space"); await expect(funnel(page).getByRole("checkbox")).toBeChecked();
  await page.keyboard.press("Tab"); await expect(funnel(page).getByRole("button", { name: "Back", exact: true })).toBeFocused();
  await page.keyboard.press("Tab"); await expect(submit(page)).toBeFocused();
  await page.keyboard.press("Enter"); await assertSaved(page);
  expect(captures.get(page)!.attempts[0].payload.consent).toBe(true);
  await screenshot(page, "keyboard-synthetic-receipt");
});

test("Eventless DOM address/contact values survive health recheck, consent and timeline changes", async ({ page }) => {
  await openHomeValue(page);
  const address = page.getByLabel("Property address", { exact: true });
  await address.evaluate((element, value) => { (element as HTMLInputElement).value = value; }, ADDRESS);
  // Simulated pageshow triggers the real hook's asynchronous health recheck.
  // Offline failure is unknown and fail-closed, not proof of read-only mode.
  // This is not evidence of a trusted bfcache return or real OS autofill.
  await page.context().setOffline(true);
  try {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false })));
    await expect(page.locator('[data-intake-mode="unknown"]')).toHaveCount(1);
    await expect(address).toHaveValue(ADDRESS);
  } finally {
    await page.context().setOffline(false);
  }
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false })));
  await expect(page.locator('[data-intake-mode="synthetic_qa"]')).toHaveCount(1);
  await expect(address).toHaveValue(ADDRESS);
  await funnel(page).getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeFocused();
  await page.getByLabel("Your name", { exact: true }).fill(NAME);
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill(EMAIL);
  const values = {
    name: "EVENTLESS SYNTHETIC | INTERNAL QA | DO NOT CONTACT",
    email: "eventless@example.test",
    phone: "+12025550188",
  };
  // Eventless DOM assignment models the autofill integration hazard only;
  // it does not exercise real OS/browser autofill or production persistence.
  await funnel(page).locator('[data-amm-step="contact"]').evaluate((form, nativeValues) => {
    for (const key of ["name", "email", "phone"] as const) {
      form.querySelector<HTMLInputElement>(`input[name="${key}"]`)!.value = nativeValues[key];
    }
  }, values);
  const expectNativeValues = async () => {
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(values.name);
    await expect(page.getByLabel("Email for your valuation follow-up", { exact: true })).toHaveValue(values.email);
    await expect(page.getByLabel("Phone (optional)", { exact: true })).toHaveValue(values.phone);
  };
  await funnel(page).getByRole("checkbox").check();
  await expectNativeValues();
  await page.getByLabel("Timeline", { exact: true }).selectOption("Just planning");
  await expectNativeValues();
  await expect(funnel(page).getByRole("checkbox")).toBeChecked();
  await expect(page.getByLabel("Timeline", { exact: true })).toHaveValue("Just planning");
  await submit(page).click();
  await expect(error(page)).toContainText("Review the updated address and email");
  expect(captures.get(page)!.attempts).toHaveLength(0);
  await expect(funnel(page).getByLabel("Review before requesting valuation")).toContainText(values.email);
  await submit(page).click(); await assertSaved(page);
  const capture = captures.get(page)!;
  expect(capture.attempts).toHaveLength(1);
  expect(capture.attempts[0].payload).toMatchObject({
    ...values, address: ADDRESS, timeline: "Just planning", consent: true, consent_email: true, consent_call: true,
  });
});

test("Typed address and focused manual control remain stable through deferred capability deadlines", async ({ page }) => {
  await openHomeValue(page);
  const address = page.getByLabel("Property address", { exact: true });
  await address.focus(); await page.keyboard.type(ADDRESS); await page.keyboard.press("Tab");
  const manual = funnel(page).getByRole("button", { name: "Enter / edit address manually", exact: true });
  await expect(manual).toBeFocused();
  // Reproduce the first failure's ten-second observation window, rather than
  // moving to the next step before pending capability deadlines can execute.
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    await expect(manual).toBeFocused(); await expect(address).toHaveValue(ADDRESS);
    expect(captures.get(page)!.pageErrors).toEqual([]);
    await page.waitForTimeout(250);
  }
  expect(captures.get(page)!.attempts).toHaveLength(0);
});

test("Native values without change events survive Edit address and are submitted from actual controls", async ({ page }) => {
  await openHomeValue(page); await contact(page);
  // Native setter without input/change events models the integration hazard,
  // not evidence that Chrome's password manager/autofill UI actually ran.
  await funnel(page).locator('[data-amm-step="contact"]').evaluate(form => {
    const input = (key: string) => form.querySelector<HTMLInputElement>(`input[name="${key}"]`)!;
    input("name").value = "AUTOFILL SYNTHETIC | INTERNAL QA | DO NOT CONTACT";
    input("email").value = "native-values@example.test";
    input("phone").value = "+12025550188";
    input("consent").checked = true;
    form.querySelector<HTMLSelectElement>('select[name="timeline"]')!.value = "Just planning";
  });
  await funnel(page).getByRole("button", { name: "Edit address", exact: true }).click();
  await expect(page.getByLabel("Property address", { exact: true })).toHaveValue(ADDRESS);
  await page.getByLabel("Property address", { exact: true }).fill(EDITED_ADDRESS);
  await funnel(page).getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("AUTOFILL SYNTHETIC | INTERNAL QA | DO NOT CONTACT");
  await expect(page.getByLabel("Email for your valuation follow-up", { exact: true })).toHaveValue("native-values@example.test");
  await expect(page.getByLabel("Phone (optional)", { exact: true })).toHaveValue("+12025550188");
  await expect(page.getByLabel("Timeline", { exact: true })).toHaveValue("Just planning");
  await expect(funnel(page).getByRole("checkbox")).toBeChecked();
  // A second eventless native value tests the submit path itself as well.
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).evaluate(element => { (element as HTMLInputElement).value = "submitted-native@example.test"; });
  await submit(page).click(); await expect(error(page)).toContainText("Review the updated address and email");
  expect(captures.get(page)!.attempts).toHaveLength(0);
  await submit(page).click(); await assertSaved(page);
  const payload = captures.get(page)!.attempts[0].payload;
  expect(payload.address === EDITED_ADDRESS && payload.email === "submitted-native@example.test" && payload.phone === "+12025550188").toBe(true);
  expect(payload.timeline).toBe("Just planning"); expect(payload.consent).toBe(true);
});

for (const width of [320, 390, 430, 768, 1440]) {
  test(`Offline suggestion correction and structured manual edit at ${width}px`, async ({ page }) => {
    captures.get(page)!.addressLookupFixture = true;
    await openHomeValue(page, width);
    const input = page.getByRole("combobox", { name: "Property address" });
    await input.fill(LOOKUP_QUERY);
    await expect(page.getByRole("listbox", { name: "Address suggestions" })).toBeVisible();
    await input.press("ArrowDown"); await expect(input).toHaveAttribute("aria-activedescendant", /option-0$/);
    if (width === 390) await page.getByRole("option").first().tap();
    else await input.press("Enter");
    const correction = page.getByLabel("Review suggested correction");
    await expect(correction).toBeVisible(); await expect(correction).toBeFocused();
    await expect(correction).toContainText(LOOKUP_QUERY); await expect(correction).toContainText(SUGGESTED_ADDRESS);
    expect(captures.get(page)!.attempts).toHaveLength(0);
    await noOverflow(page); await targets(page); await screenshot(page, `address-correction-${width}`);
    await page.getByRole("button", { name: "Use suggested address" }).click();
    await expect(page.getByLabel("Unit / apartment (if applicable)")).toHaveValue("Apt 4");
    await page.getByLabel("Unit / apartment (if applicable)").fill("Apt 5");
    if (width === 320) {
      const diagnostic = await rootFontDiagnostic(page);
      expect(parseFloat(diagnostic.restoredAfterFrames.readable.address["font-size"]) / parseFloat(diagnostic.original.readable.address["font-size"])).toBe(2);
    }
    await noOverflow(page); await targets(page); await screenshot(page, `address-manual-${width}`);
    await funnel(page).getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Your name", { exact: true }).fill(NAME);
    await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill(EMAIL);
    await expect(funnel(page).getByLabel("Review before requesting valuation")).toContainText(MANUAL_EDITED_ADDRESS);
    await noOverflow(page); await targets(page);
    await submit(page).click(); await assertSaved(page);
    expect(captures.get(page)!.attempts[0].payload.address_entry).toMatchObject({ version: 1, enteredText: LOOKUP_QUERY,
      acceptedText: MANUAL_EDITED_ADDRESS, components: { line2: "Apt 5", postalCode: "27893" }, confirmation: "user_edited", validation: "not_performed" });
  });
}

test("Synthetic QA rejects unlabeled fictional contact and invalid optional phone before any POST", async ({ page }) => {
  await openHomeValue(page); await contact(page);
  await page.getByLabel("Your name", { exact: true }).fill("Unlabeled fictional test contact");
  await submit(page).click(); await expect(error(page)).toContainText("Synthetic QA only");
  expect(captures.get(page)!.attempts).toHaveLength(0);
  await page.getByLabel("Your name", { exact: true }).fill(NAME);
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill("fictional-contact@example.invalid");
  await submit(page).click(); await expect(error(page)).toContainText("example.test email");
  expect(captures.get(page)!.attempts).toHaveLength(0);
  await page.getByLabel("Email for your valuation follow-up", { exact: true }).fill(EMAIL);
  await page.getByLabel("Phone (optional)", { exact: true }).fill("252");
  await submit(page).click(); await expect(error(page)).toContainText("area code");
  await expect(page.getByLabel("Phone (optional)", { exact: true })).toHaveValue("252");
  expect(captures.get(page)!.attempts).toHaveLength(0);
  await page.getByLabel("Phone (optional)", { exact: true }).fill("");
  await submit(page).click(); await assertSaved(page);
});

test("Offline health recheck fails closed: one early unknown notice preserves both steps and blocks saving", async ({ page }, info) => {
  await openHomeValue(page, 320);
  info.annotations.push({ type: "scope", description: "Actual harness GET first attests synthetic_qa; offline recheck fails closed. Synthetic pageshow dispatch is NOT bfcache evidence." });
  await page.context().setOffline(true);
  try {
    // Do not fabricate a capability JSON response. Only a failed actual fetch
    // changes the hook to unknown. This event is explicitly simulated.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false })));
    const notices = page.locator('[data-intake-mode="unknown"]');
    await expect(notices).toHaveCount(1);
    await beforeInDocument(notices, page.getByLabel("Property address", { exact: true }));
    await expect(page.locator('[data-intake-mode="read_only"]')).toHaveCount(0);
    await screenshot(page, "unknown-offline-address-320");
    await contact(page);
    await expect(notices).toHaveCount(1);
    await beforeInDocument(notices, page.getByLabel("Your name", { exact: true }));
    await expect(funnel(page).getByRole("button", { name: "Saving unavailable", exact: true })).toBeDisabled();
    await funnel(page).locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(error(page)).toContainText("Availability is not confirmed");
    await expect(funnel(page).getByRole("heading", { name: "Your request is in.", exact: true })).toHaveCount(0);
    expect(captures.get(page)!.attempts).toHaveLength(0);
    await screenshot(page, "unknown-offline-contact-320");
  } finally { await page.context().setOffline(false); }
});

for (const receipt of ["missing identifiers", "malformed JSON", "HTML instead of JSON", "wrong session"] as const) {
  test(`Malformed HTTP 200 (${receipt}) never becomes SAVED`, async ({ page }) => {
    const capture = captures.get(page)!;
    capture.reply = async (route, attempt) => {
      const correlation = randomUUID();
      capture.statuses.push(200);
      await route.fulfill({ status: 200, contentType: receipt === "HTML instead of JSON" ? "text/html" : "application/json",
        headers: { "X-AMM-Correlation-Id": correlation },
        body: receipt === "malformed JSON" ? "{broken" : receipt === "HTML instead of JSON" ? "<html>synthetic OK</html>"
          : JSON.stringify(receipt === "wrong session" ? { lead_id: randomUUID(), session_id: randomUUID(), correlation_id: correlation } : { message: "synthetic saved claim" }),
      });
      void attempt;
    };
    await openHomeValue(page); await contact(page); await submit(page).click();
    await assertUnconfirmed(page); expect(capture.attempts).toHaveLength(1);
    await pendingMarker(page, capture.attempts[0].key);
    await screenshot(page, `unconfirmed-${receipt.replaceAll(" ", "-").toLowerCase()}`);
  });
}

test("Rapid double tap plus Enter issues one intercepted request while saving", async ({ page }) => {
  const capture = captures.get(page)!;
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  capture.reply = async (route, attempt) => { await held; await savedReply(route, capture, attempt); };
  try {
    await openHomeValue(page); await contact(page, PHONE);
    await submit(page).scrollIntoViewIfNeeded();
    const box = await submit(page).boundingBox(); expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
    await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y);
    await page.keyboard.press("Enter");
    await expect(funnel(page).getByRole("button", { name: "Submitting", exact: true })).toBeDisabled();
    await expect.poll(() => capture.attempts.length).toBe(1);
    await pendingMarker(page, capture.attempts[0].key);
    release(); await assertSaved(page); expect(capture.attempts).toHaveLength(1);
  } finally { release(); }
});

test("Unknown outcome retries only identical bytes and key; synthetic replay creates no new lead event", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = async (route, attempt, index) => {
    if (index === 1) { capture.statuses.push("aborted"); await route.abort("failed"); }
    else await savedReply(route, capture, attempt, true);
  };
  await openHomeValue(page); await contact(page); await submit(page).click();
  await assertUnconfirmed(page); await pendingMarker(page, capture.attempts[0].key);
  expect(capture.attempts).toHaveLength(1);
  await screenshot(page, "unknown-original-reference-390");
  await funnel(page).getByRole("button", { name: "Retry identical request", exact: true }).click();
  await assertSaved(page); expect(capture.attempts).toHaveLength(2);
  expect(capture.attempts[1].body === capture.attempts[0].body).toBe(true);
  expect(capture.attempts[1].key === capture.attempts[0].key).toBe(true);
  const events = (await evidence(page)).events;
  expect(events.filter(event => event === "lead_created")).toHaveLength(0);
  expect(events.filter(event => event === "thank_you_viewed")).toHaveLength(1);
});

test("Full reload after uncertainty restores only the pending reference and blocks a fresh request", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = async route => { capture.statuses.push("aborted"); await route.abort("failed"); };
  await openHomeValue(page); await contact(page); await submit(page).click(); await assertUnconfirmed(page);
  const key = capture.attempts[0].key;
  await pendingMarker(page, key);
  const originalDocument = (await evidence(page)).documentId;
  await page.reload();
  await expect(error(page)).toContainText("private form details were not stored");
  expect((await evidence(page)).documentId === originalDocument).toBe(false);
  await expect(page.getByLabel("Property address", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Property address", { exact: true })).toBeDisabled();
  await expect(funnel(page).getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  await expect(funnel(page).getByRole("button", { name: "Retry identical request", exact: true })).toHaveCount(0);
  await expect(funnel(page).getByText(key, { exact: true })).toBeVisible();
  await pendingMarker(page, key); expect(capture.attempts).toHaveLength(1);
  await screenshot(page, "full-reload-reference-only-390");
});

test("Real browser history return reports bfcache only for a trusted persisted pageshow", async ({ page }, info) => {
  const capture = captures.get(page)!;
  capture.reply = async route => { capture.statuses.push("aborted"); await route.abort("failed"); };
  await openHomeValue(page); await contact(page); await submit(page).click(); await assertUnconfirmed(page);
  const key = capture.attempts[0].key;
  const original = (await evidence(page)).documentId;
  const readsBeforeHomepage = capture.capabilityReads;
  await page.goto("/");
  // The actual homepage mounts its own HomeValueFunnel. goto(load) alone does
  // not finish that hook's no-store fetch or this observer's response.json().
  // Leaving immediately can cancel a body read. Await genuine mode + reads;
  // retain every unreadable-health violation, including already-recorded ones.
  await expect(funnel(page).locator('[data-intake-mode="synthetic_qa"]')).toHaveCount(1);
  await expect.poll(() => capture.capabilityReads).toBeGreaterThan(readsBeforeHomepage);
  await Promise.all(capture.checks);
  await page.goBack();
  await expect(page.locator('[data-intake-mode="synthetic_qa"]')).toHaveCount(1);
  const restored = await evidence(page);
  const actualBfcache = restored.documentId === original && restored.pageShows.some(event => event.trusted && event.persisted);
  capture.historyResult = actualBfcache ? "trusted_browser_bfcache" : "new_document_pending_reference_guard";
  info.annotations.push({ type: "history-restoration", description: capture.historyResult });
  if (actualBfcache) {
    await assertUnconfirmed(page);
    await expect(funnel(page).getByRole("button", { name: "Retry identical request", exact: true })).toBeVisible();
  } else {
    expect(restored.documentId === original, "Same document without trusted persisted pageshow is not bfcache proof").toBe(false);
    await expect(error(page)).toContainText("private form details were not stored");
    await expect(page.getByLabel("Property address", { exact: true })).toBeDisabled();
    await expect(funnel(page).getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await expect(funnel(page).getByRole("button", { name: "Retry identical request", exact: true })).toHaveCount(0);
  }
  await pendingMarker(page, key); expect(capture.attempts).toHaveLength(1);
  await screenshot(page, "history-return-observed-not-simulated-390");
});

test("409 conflict retains reference, freezes fields, and offers no unsafe retry", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = route => refusal(route, capture, 409, "idempotency_conflict");
  await openHomeValue(page); await contact(page); await submit(page).click();
  await expect(error(page)).toContainText("conflicts with an existing request");
  await expect(page.getByLabel("Your name", { exact: true })).toBeDisabled();
  await expect(funnel(page).getByRole("button", { name: "Edit address", exact: true })).toBeDisabled();
  await expect(funnel(page).getByRole("button", { name: "Retry identical request", exact: true })).toHaveCount(0);
  await expect(funnel(page).getByRole("heading", { name: "Your request is in.", exact: true })).toHaveCount(0);
  await pendingMarker(page, capture.attempts[0].key); expect(capture.attempts).toHaveLength(1);
  await screenshot(page, "conflict-reference-retained-390");
});

test("429 honors fixture Retry-After without auto retry, then allows only the identical request", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = (route, attempt, index) => index === 1 ? refusal(route, capture, 429, "rate_limited", { "Retry-After": "3" }) : savedReply(route, capture, attempt);
  await openHomeValue(page); await contact(page); await submit(page).click();
  await expect(error(page)).toContainText("Too many requests");
  const retry = funnel(page).getByRole("button", { name: "Retry identical request", exact: true });
  await expect(retry).toBeDisabled();
  await expect(funnel(page).getByText(/Wait \d+ seconds before retrying this same request/)).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toBeDisabled();
  await pendingMarker(page, capture.attempts[0].key);
  await screenshot(page, "rate-limited-reference-retained-390");
  // Real short UI cooldown, not a fake Date or an automatic background retry.
  await expect(retry).toBeEnabled({ timeout: 8000 });
  expect(capture.attempts).toHaveLength(1);
  await retry.click(); await assertSaved(page); expect(capture.attempts).toHaveLength(2);
  expect(capture.attempts[1].body === capture.attempts[0].body && capture.attempts[1].key === capture.attempts[0].key).toBe(true);
});

test("Recognized precommit refusal stays editable and clears only its pending marker", async ({ page }) => {
  const capture = captures.get(page)!;
  capture.reply = route => refusal(route, capture, 400, "invalid_payload");
  await openHomeValue(page); await contact(page); await submit(page).click();
  await expect(error(page)).toContainText("Invalid lead payload");
  await expect(page.getByLabel("Your name", { exact: true })).toBeEnabled();
  await expect(funnel(page).getByRole("button", { name: "Edit address", exact: true })).toBeEnabled();
  await expect(funnel(page).getByRole("heading", { name: "Your request is in.", exact: true })).toHaveCount(0);
  expect(await page.evaluate(storageKey => sessionStorage.getItem(storageKey), PENDING_KEY)).toBeNull();
  expect(capture.attempts).toHaveLength(1);
});
