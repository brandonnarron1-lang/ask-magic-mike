import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/home-value",
  "/value",
  "/sell",
  "/we-buy-houses",
  "/ask",
  "/widget",
  "/widget-preview",
  "/embed/ask",
  "/integrations/ourtownproperties",
  "/social-preview",
] as const;

test("INFRA-02 canonical public routes render with zero external browser calls", async ({
  page,
}) => {
  const baseUrl = test.info().project.use.baseURL;
  expect(typeof baseUrl).toBe("string");
  const expectedOrigin = new URL(String(baseUrl)).origin;
  const externalRequests: string[] = [];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      if (url.origin !== expectedOrigin) {
        externalRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`);
        await route.abort("blockedbyclient");
        return;
      }
    }
    await route.continue();
  });

  for (const path of PUBLIC_ROUTES) {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("body"), path).not.toHaveText("");
  }

  await page.screenshot({
    path: "output/playwright/infra-02-public-routes.png",
    fullPage: true,
  });
  expect(externalRequests).toEqual([]);
});

test("INFRA-02 Admin middleware and cron fail closed in a real browser stack", async ({
  request,
}) => {
  const unauthorized = await request.get("/admin/leads", { maxRedirects: 0 });
  expect(unauthorized.status()).toBe(401);
  expect(unauthorized.headers()["www-authenticate"]).toContain("Basic");

  const unauthenticatedCron = await request.get("/api/admin/sla/sweep");
  expect(unauthenticatedCron.status()).toBe(401);

  const localCronSecret = process.env.CRON_SECRET;
  expect(localCronSecret).toBeTruthy();
  const noPersistence = await request.get("/api/admin/sla/sweep", {
    headers: { Authorization: `Bearer ${localCronSecret}` },
  });
  expect(noPersistence.status()).toBe(503);
  expect(await noPersistence.json()).toMatchObject({
    ok: false,
    error: "sla_store_not_configured",
  });
});
