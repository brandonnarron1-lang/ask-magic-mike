import { expect, test } from "@playwright/test";

test("Admin middleware denies anonymous browser access and accepts local Basic auth", async ({
  browser,
  request,
}) => {
  const anonymous = await request.get("/admin/leads", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["www-authenticate"]).toContain("Basic");

  const localSecret = process.env.ADMIN_SECRET || "changeme-local";
  const context = await browser.newContext({
    httpCredentials: { username: "", password: localSecret },
  });
  const page = await context.newPage();
  const response = await page.goto("/admin/leads");
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toContainText(/AdminOps|Lead/i);
  await expect(page.locator("body")).not.toContainText("DEV MOCK DATA");
  await context.close();
});
