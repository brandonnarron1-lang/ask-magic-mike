import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { installNoWriteInterception } from "./no-write-preview-interception";

// Local review only. No form submission, session, fixture or provider request.
for (const width of [320, 390, 768]) {
  test(`Ask reflows at 200% root text within ${width}px without clipping navigation`, async ({ page }) => {
    const capture = await installNoWriteInterception(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/ask");
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      font: getComputedStyle(document.documentElement).fontSize,
    }));
    expect(dimensions.font).toBe("32px");
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewport + 1);
    const menu = page.getByRole("button", { name: "Open site navigation" });
    if (width < 768) {
      await expect(menu).toBeVisible();
      await menu.click();
      await expect(page.getByRole("navigation", { name: "Mobile primary navigation" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width + 1);
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
    }
    await expect(page.getByLabel("Your real estate question (required)")).toBeVisible();
    mkdirSync("output/playwright", { recursive: true });
    await page.screenshot({ path: `output/playwright/ask-root-text-200-${width}.png`, fullPage: false });
    expect(capture.leads).toEqual([]);
    expect(capture.chatMessages).toEqual([]);
    expect(capture.unexpectedMutations).toEqual([]);
  });
}
