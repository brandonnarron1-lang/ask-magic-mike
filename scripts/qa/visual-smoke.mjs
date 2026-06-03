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

const REQUIRED_VALUE = [
  "Start with your address",
  "Get a local read on your home",
  "Start With Your Address",
  "Ask Magic Mike by Our Town Properties",
  "Mike Eatmon",
  "Our Town Properties, Inc.",
  "Licensed in North Carolina",
  "Selling real estate since 1993",
  "Compare selling options",
  "Request direct-purchase review",
  "Ask Mike a question",
  "AI-assisted",
  "Local human follow-up",
  "not an appraisal",
];

const FORBIDDEN = [
  /rub the lamp/i,
  /guaranteed value/i,
  /guaranteed offer/i,
  /\bbinding offer\b/i,
  /instant cash offer/i,
  /MLS comps/i,
];

const PAGES = [
  {
    name: "value",
    url: `${BASE}/value?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: REQUIRED_VALUE,
  },
  {
    name: "ask-first-step",
    url: `${BASE}/ask?utm_source=ourtown_wp&utm_medium=homepage_cta&utm_campaign=ask_magic_mike&q=test`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: ["Mike Eatmon", "Our Town Properties", "AI-assisted"],
  },
  {
    name: "embed-ask",
    url: `${BASE}/embed/ask?utm_source=ourtown_wp&utm_medium=embed_test&utm_campaign=ask_magic_mike`,
    desktop: { width: 1024, height: 900 },
    mobile: { width: 390, height: 844 },
    required: ["Mike Eatmon", "Our Town Properties", "AI-assisted"],
  },
  {
    name: "widget-preview",
    url: `${BASE}/widget-preview`,
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
    required: [
      "Mike Eatmon",
      "Our Town Properties",
      "AI-assisted",
      "not an appraisal",
      "MagicMikeWidgetShell",
    ],
  },
];

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
    });
    const p = await ctx.newPage();
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
    } catch (err) {
      consoleErrors.push(`navigation failed: ${err.message}`);
    }

    // Measure horizontal overflow.
    const overflow = await p.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    const horizontalScroll = overflow.docWidth > overflow.viewport + 1;

    const html = await p.content();
    const missing = page.required.filter((s) => !html.includes(s));
    const forbiddenHits = FORBIDDEN.flatMap((rx) => {
      const m = html.match(rx);
      return m ? [m[0]] : [];
    });

    // Bare-appraisal check (allowed only inside "not an appraisal").
    const cleaned = html.replace(/(?:is )?not an appraisal/gi, "");
    const bareAppraisal = (cleaned.match(/\bappraisal\b/gi) ?? []).length;

    const screenshotPath = join(
      OUT_DIR,
      `${page.name}-${device}-${viewport.width}x${viewport.height}.png`
    );
    try {
      await p.screenshot({ path: screenshotPath, fullPage: false });
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
