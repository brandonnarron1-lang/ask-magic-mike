import { expect, test } from "@playwright/test";

const ROUTES = [
  ["/admin/today", /What needs attention today/i],
  ["/admin/leads", /Lead inbox and routing readiness/i],
  ["/admin/activity", /Authorized activity/i],
  ["/admin/reporting", /Analytics and reporting/i],
] as const;

async function expectNoPageOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

for (const viewport of [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "narrow-320", width: 320, height: 720 },
] as const) {
  test(`Agent Command Center renders protected primary surfaces at ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      httpCredentials: { username: "", password: process.env.ADMIN_SECRET || "changeme-local" },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const [path, heading] of ROUTES) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Command Center navigation" })).toBeVisible();
      await expectNoPageOverflow(page);
    }
    await page.goto("/admin/today", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName || "");
    expect(focusedTag).not.toBe("BODY");
    await page.screenshot({
      path: `output/playwright/agent-command-center-${viewport.name}.png`,
      fullPage: true,
    });
    await context.close();
  });
}

test("Agent Command Center remains reachable at a 200% visual zoom check", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    httpCredentials: { username: "", password: process.env.ADMIN_SECRET || "changeme-local" },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/admin/today", { waitUntil: "networkidle" });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  await expect(page.getByRole("heading", { name: /What needs attention today/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leads", exact: true })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/agent-command-center-zoom-200.png",
    fullPage: true,
  });
  await context.close();
});
