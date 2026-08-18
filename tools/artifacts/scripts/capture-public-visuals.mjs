import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const output = path.join(repo, "output/phase8");
const screenshotDir = path.join(output, "screenshots/public");
const dataDir = path.join(output, "data");
const target = (process.env.TARGET_URL || "https://www.askmagicmike.com").replace(/\/$/, "");

const routes = [
  ["/", "home"],
  ["/sell", "seller"],
  ["/buy", "buyer"],
  ["/value", "value"],
  ["/ask", "ask"],
  ["/widget/v1", "widget"],
  ["/thank-you", "thank-you"],
  ["/phase8-intentional-404", "error-404"],
];
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const screenshotWidths = new Set([390, 1440]);

await mkdir(screenshotDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const metrics = [];

try {
  for (const width of widths) {
    const height = width < 768 ? 844 : 1000;
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    // Keep visual QA out of production analytics and avoid burst-triggering
    // the public telemetry rate limiter while traversing 72 route states.
    await page.route("**/api/events", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/widget/events", (route) => route.fulfill({ status: 204 }));
    const consoleFindings = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleFindings.push({ type: message.type(), text: message.text().slice(0, 500) });
      }
    });

    for (const [route, slug] of routes) {
      consoleFindings.length = 0;
      await page.goto(`${target}${route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(250);

      const measured = await page.evaluate(() => ({
        bodyScrollWidth: document.body.scrollWidth,
        buttons: document.querySelectorAll("button").length,
        clientWidth: document.documentElement.clientWidth,
        h1: document.querySelector("h1")?.textContent?.trim() || "",
        inputs: document.querySelectorAll("input, textarea, select").length,
        main: Boolean(document.querySelector("main")),
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
      }));

      const expectedConsoleFindings = route.includes("intentional-404")
        ? consoleFindings.filter((finding) => finding.text.includes("status of 404"))
        : [];
      const unexpectedConsoleFindings = consoleFindings.filter(
        (finding) => !expectedConsoleFindings.includes(finding),
      );

      metrics.push({
        viewport: width,
        route,
        slug,
        ...measured,
        overflow: measured.scrollWidth > measured.clientWidth,
        consoleFindings: unexpectedConsoleFindings,
        expectedConsoleFindings,
        captureMode: "viewport-only",
      });

      if (screenshotWidths.has(width)) {
        // Full-page capture can temporarily reflow responsive layouts to the
        // document's minimum width in some browser automation environments.
        await page.screenshot({
          path: path.join(screenshotDir, `${slug}-${width}.png`),
          fullPage: false,
        });
      }
    }

    if (width === 390) {
      await page.goto(`${target}/value`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Continue" }).click();
      await page.locator("#home-value-form-error").waitFor();
      await page.screenshot({
        path: path.join(screenshotDir, "home-value-validation-390.png"),
        fullPage: false,
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(dataDir, "public-visual-metrics.json"),
  `${JSON.stringify(metrics, null, 2)}\n`,
);

const failures = metrics.filter(
  (entry) => entry.overflow || entry.consoleFindings.length > 0 || !entry.main,
);
console.log(JSON.stringify({
  target,
  checks: metrics.length,
  failures: failures.length,
  screenshots: routes.length * screenshotWidths.size + 1,
  captureMode: "viewport-only",
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
