// Visual smoke script — captures screenshots of the key Ask Magic Mike
// surfaces at desktop and mobile sizes and runs basic copy/forbidden-language
// checks against the rendered HTML.
//
// Usage:
//   ./node_modules/.bin/next dev -p 4101 &
//   node scripts/qa/visual-smoke.mjs
//
// Artifacts land in artifacts/ask-magic-mike-visual-upgrade/.

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:4101";
const OUT_DIR =
  process.env.OUT_DIR ?? "artifacts/ask-magic-mike-visual-upgrade";
const INCLUDE_ADMIN = (process.env.INCLUDE_ADMIN ?? "true").toLowerCase() === "true";
const ADMIN_BASIC_PASSWORD = process.env.ADMIN_BASIC_PASSWORD?.trim() ?? "";

const REQUIRED_HOME_VALUE = [
  "Start with the address. Get a practical local follow-up.",
  "This is a real intake, not an instant automated promise.",
  "Property address",
  "Our Town Properties",
  "Licensed in North Carolina",
  "Local real estate guidance",
];

const FORBIDDEN = [
  /rub the lamp/i,
  /\bget (?:your |a )?guaranteed value\b/i,
  /\bwe guarantee (?:a )?value\b/i,
  /\breceive (?:a )?guaranteed offer\b/i,
  /\bbinding offer\b/i,
  /instant cash offer/i,
  /\bexact home value\b/i,
  /\bcertified appraisal\b/i,
  /\bcompare neighborhoods?\b/i,
  /\bbest neighborhoods?\b/i,
  /\bschool district\b/i,
  /\bbuyer demand\b/i,
  /MLS comps/i,
];

const PAGES = [
  {
    name: "home-value",
    url: `${BASE}/home-value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: REQUIRED_HOME_VALUE,
  },
  {
    name: "ask-first-step",
    url: `${BASE}/ask?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike&q=test`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: [
      "A focused local real estate advisor interface.",
      "objective criteria you choose",
      "Mike Eatmon",
      "Our Town Properties",
    ],
  },
  {
    name: "embed-ask",
    url: `${BASE}/embed/ask?utm_source=ourtown_wp&utm_medium=embed_test&utm_campaign=ask_magic_mike`,
    desktop: { width: 1024, height: 900 },
    mobile: { width: 390, height: 844 },
    required: [
      "Ask Magic Mike",
      "Local guidance from Our Town Properties",
      "Get My Home Value",
      "Property address",
    ],
  },
  {
    name: "widget-preview",
    url: `${BASE}/widget-preview`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: [
      "Our Town Properties preview",
      "Wilson real estate, locally guided.",
      "Integration check",
      "Open the bottom-right launcher",
    ],
  },
  {
    name: "owned-demand-command",
    admin: true,
    url: `${BASE}/admin/distribution`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: [
      "Ask Magic Mike · Owned Demand Command",
      "Turn the existing audience into measurable local demand.",
      "Three-offer launch flight",
      "Seller value + readiness review",
      "Buyer property-match review",
      "Rental-to-homeownership review",
      "Draft here. Publish elsewhere.",
    ],
    openFirstDetails: true,
    fullPage: true,
  },
].filter((page) => INCLUDE_ADMIN || !page.admin);

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

const results = [];
let failures = 0;

for (const page of PAGES) {
  for (const [device, viewport] of Object.entries({
    desktop: page.desktop,
    mobile: page.mobile,
  })) {
    const ctx = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
      ...(page.admin && ADMIN_BASIC_PASSWORD
        ? {
            httpCredentials: {
              username: "admin",
              password: ADMIN_BASIC_PASSWORD,
            },
          }
        : {}),
    });
    const p = await ctx.newPage();
    await p.route("**/api/events", (route) => route.fulfill({ status: 204, body: "" }));
    await p.route("**/api/experiments/event", (route) => route.fulfill({ status: 204, body: "" }));
    const consoleErrors = [];
    p.on("pageerror", (e) => consoleErrors.push(String(e)));
    p.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    let status = 0;
    try {
      const resp = await p.goto(page.url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      status = resp?.status() ?? 0;
      // give the hero a moment to settle without depending on networkidle
      // (the keep-alive analytics fetch can keep the connection open in dev).
      await p.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
      await p.waitForTimeout(800);
      if (status === 200 && page.openFirstDetails) {
        await p.locator("details").first().evaluate((details) => {
          details.open = true;
        });
      }
    } catch (err) {
      consoleErrors.push(`navigation failed: ${err.message}`);
    }

    // Measure horizontal overflow.
    const overflow = await p.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    const horizontalScroll = overflow.docWidth > overflow.viewport + 1;

    const renderedText = await p.locator("body").innerText().catch(() => "");
    const normalizedText = renderedText.replace(/\s+/g, " ").trim();
    const normalizedTextFolded = normalizedText.toLocaleLowerCase("en-US");
    const missing = page.required.filter(
      (s) => !normalizedTextFolded.includes(s.toLocaleLowerCase("en-US")),
    );
    const forbiddenHits = FORBIDDEN.flatMap((rx) => {
      const m = normalizedText.match(rx);
      return m ? [m[0]] : [];
    });

    // Bare-appraisal check (allowed only inside "not an appraisal").
    const cleaned = normalizedText.replace(
      /(?:(?:is )?not an|no automated) appraisal/gi,
      "",
    );
    const bareAppraisal = (cleaned.match(/\bappraisal\b/gi) ?? []).length;

    const screenshotPath = join(
      OUT_DIR,
      `${page.name}-${device}-${viewport.width}x${viewport.height}.png`
    );
    try {
      await p.screenshot({ path: screenshotPath, fullPage: page.fullPage ?? false });
    } catch (err) {
      consoleErrors.push(`screenshot failed: ${err.message}`);
    }

    const ok =
      status === 200 &&
      missing.length === 0 &&
      forbiddenHits.length === 0 &&
      bareAppraisal === 0 &&
      consoleErrors.length === 0 &&
      !horizontalScroll;
    if (!ok) failures += 1;

    results.push({
      page: page.name,
      device,
      viewport,
      url: page.url,
      status,
      horizontalScroll,
      missing,
      forbiddenHits,
      bareAppraisal,
      consoleErrors,
      screenshot: screenshotPath,
      ok,
    });

    await ctx.close();
  }
}

await browser.close();

await writeFile(
  join(OUT_DIR, "smoke-report.json"),
  JSON.stringify(results, null, 2)
);

for (const r of results) {
  const tag = r.ok ? "PASS" : "FAIL";
  console.log(
    `[${tag}] ${r.page} ${r.device} ${r.viewport.width}x${r.viewport.height} -> ${r.status} ` +
      `overflow=${r.horizontalScroll} missing=${r.missing.length} ` +
      `forbidden=${r.forbiddenHits.length} bare_appraisal=${r.bareAppraisal} ` +
      `console_errors=${r.consoleErrors.length}`
  );
  if (!r.ok) {
    if (r.missing.length) console.log("  missing:", r.missing);
    if (r.forbiddenHits.length) console.log("  forbidden:", r.forbiddenHits);
    if (r.consoleErrors.length) console.log("  errors:", r.consoleErrors);
  }
}

process.exit(failures === 0 ? 0 : 1);
