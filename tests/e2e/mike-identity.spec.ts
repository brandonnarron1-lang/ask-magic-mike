import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { installNoWriteInterception } from "./no-write-preview-interception";

// Public rendering only: the existing interception refuses all application writes.
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`Mike profile retains its portrait and identity at ${width}px`, async ({ page }) => {
    const capture = await installNoWriteInterception(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/mike-eatmon");
    await expect(page.getByRole("heading", { level: 1, name: "Mike Eatmon · Magic Mike" })).toBeVisible();
    const portrait = page.getByAltText("Mike Eatmon, broker with Our Town Properties in Wilson, North Carolina.");
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.getByRole("link", { name: "Mike's official brokerage biography" })).toHaveAttribute("href", "https://www.ourtownproperties.com/agents/mike-eatmon/");
    await expect(page.getByText(/It is not Mike personally/)).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.askmagicmike.com/mike-eatmon");
    const nodes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.flatMap((script) => JSON.parse(script.textContent || "{}")["@graph"] || []));
    expect(nodes.filter((node) => node["@type"] === "Person")).toHaveLength(1);
    expect(nodes.find((node) => node["@type"] === "ProfilePage")?.mainEntity).toEqual({ "@id": "https://www.ourtownproperties.com/agents/mike-eatmon/#person" });
    expect(new Set(nodes.map((node) => node["@id"])).size).toBe(nodes.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    // A page can have zero overflow while its footer contact column collapses
    // to single-character lines. Keep the contact panel and call action readable.
    const footerContact = page.locator("footer").getByRole("complementary", { name: "Contact Magic Mike" });
    const footerContactBox = await footerContact.boundingBox();
    const footerCallBox = await footerContact.getByRole("link", { name: /^Call Magic Mike at/ }).boundingBox();
    expect(footerContactBox?.width).toBeGreaterThanOrEqual(Math.min(300, width - 64));
    expect(footerCallBox?.width).toBeGreaterThanOrEqual(150);
    expect(footerCallBox?.height).toBeLessThanOrEqual(72);
    mkdirSync("output/playwright/mike-identity", { recursive: true });
    await page.screenshot({ path: `output/playwright/mike-identity/profile-${width}.png`, fullPage: true });
    if (width === 390) {
      await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: "output/playwright/mike-identity/profile-390-text200.png", fullPage: true });
    }
    expect(capture.leads).toEqual([]);
    expect(capture.chatMessages).toEqual([]);
    expect(capture.unexpectedMutations).toEqual([]);
  });
}

test("homepage biography links to the public Mike profile without a form submission", async ({ page }) => {
  const capture = await installNoWriteInterception(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const identity = page.getByRole("region", { name: "Mike Eatmon · Magic Mike" });
  await identity.scrollIntoViewIfNeeded();
  await expect(identity.getByRole("img", { name: "Mike Eatmon, broker with Our Town Properties in Wilson, North Carolina." })).toBeVisible();
  mkdirSync("output/playwright/mike-identity", { recursive: true });
  await identity.screenshot({ path: "output/playwright/mike-identity/homepage-desktop.png" });
  await identity.getByRole("link", { name: "More about Mike Eatmon" }).click();
  await expect(page).toHaveURL(/\/mike-eatmon$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mike Eatmon · Magic Mike" })).toBeVisible();
  expect(capture.leads).toEqual([]);
  expect(capture.chatMessages).toEqual([]);
  expect(capture.unexpectedMutations).toEqual([]);
});
