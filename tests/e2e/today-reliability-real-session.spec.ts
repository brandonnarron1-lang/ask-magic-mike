import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_WEB_ACQUISITION_ACCEPTANCE !== "1", "Owned synthetic PostgreSQL + genuine Better Auth only");
test.describe.configure({ mode: "serial" });
let pool: Pool;
let agentContext: BrowserContext;
let analystContext: BrowserContext;
let f: { agents: Record<string, string>; leads: Record<string, string> };
const repeat = randomUUID();
const output = process.env.AMM_E2E_OUTPUT_DIR!;
async function login(page: Page, role = "agent") {
  await page.goto("/lead-center-login?returnTo=%2Fadmin%2Ftoday");
  await page.getByLabel("Work email").fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Open Lead Center", exact: true }).click();
}
test.beforeAll(async ({ browser }) => {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== "localhost" || url.pathname !== "/amm_qa_upgrade" || process.env.VERCEL_ENV !== "development" || process.env.PREVIEW_URL) throw new Error("isolated_venue_required");
  pool = new Pool({ connectionString: url.href, max: 1 });
  f = JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!, "utf8"));
  mkdirSync(output, { recursive: true });
  await pool.query("INSERT INTO sessions(id) VALUES($1)", [repeat]);
  await pool.query("INSERT INTO leads(id,session_id,status,duplicate_of_lead_id,primary_intent,is_test,communication_suppressed) VALUES($1,$1,'new',$2,'buy',false,false)", [repeat, f.leads.agent]);
  // Reuse real sessions for viewport checks, just as a person would. Repeated
  // sign-ins exceeded the unchanged five-per-15-minute authentication fence.
  // No rate bucket, client IP, role or authentication limit is modified.
  for (const role of ["agent", "analyst"]) {
    const context = await browser.newContext({ baseURL: process.env.BETTER_AUTH_URL, viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await context.route("**/*", route => new URL(route.request().url()).origin === process.env.BETTER_AUTH_URL ? route.continue() : route.abort("blockedbyclient"));
    const page = await context.newPage(); await login(page, role);
    await expect(page).toHaveURL(role === "analyst" ? /error=forbidden/ : /\/admin\/today$/);
    if (role === "agent") agentContext = context; else analystContext = context;
    await page.close();
  }
});
test.afterAll(async () => { await agentContext?.close(); await analystContext?.close(); await pool?.end(); });
test.afterEach(async () => {
  for (const context of [agentContext, analystContext]) for (const page of context?.pages() || []) await page.close();
});
test("real inherited reader sees current inquiry but never gains mutation authority", async () => {
  const page = await agentContext.newPage(); await page.goto("/admin/today");
  const card = page.locator("article").filter({ hasText: "Inherited owner" }).first();
  await expect(card).toBeVisible(); await expect(card).toContainText("Read-only access");
  await expect(card.getByRole("button")).toHaveCount(0);
  await expect(card).not.toContainText("No assigned owner");
  await expect(card.getByRole("link", { name: "Open request", exact: true })).toHaveAttribute("href", `/admin/leads/${repeat}`);
  await card.getByRole("link", { name: "Open request", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/leads/${repeat}$`));
  expect((await pool.query("SELECT assigned_agent_id FROM leads WHERE id=$1", [repeat])).rows).toEqual([{ assigned_agent_id: null }]);
  await page.goto(`/admin/leads/${f.leads.other}`);
  await expect(page).toHaveURL(/error=forbidden/);
  expect(await page.content()).not.toContain("private-other@example.test");
});
test("failed required SQL is unavailable, never a measured clear queue", async () => {
  const page = await agentContext.newPage(); await page.goto("/admin/today");
  await pool.query("ALTER TABLE public.lead_action_reviews RENAME TO synthetic_hidden_reviews");
  try {
    await page.reload();
    await expect(page.getByRole("heading", { name: "Queue unavailable", exact: true })).toBeVisible();
    await expect(page.getByText(/No measured counts are available/)).toBeVisible();
    await expect(page.getByText("Queue clear", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(output, "today-error-390.png"), fullPage: true });
  } finally { await pool.query("ALTER TABLE public.synthetic_hidden_reviews RENAME TO lead_action_reviews"); }
});
test("wrong role remains denied by the real server", async () => {
  const page = await analystContext.newPage(); await page.goto("/admin/today");
  await expect(page).toHaveURL(/error=forbidden/);
  expect(await page.content()).not.toContain("private-agent@example.test");
});
for (const width of [320,390,430,768,1440]) test(`Today keyboard and actual enlarged-text reflow ${width}`, async () => {
  const page = await agentContext.newPage();
  await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/admin/today"); await expect(page).toHaveURL(/\/admin\/today$/);
  const open = page.getByRole("link", { name: "Open request", exact: true }).first();
  await open.focus(); await expect(open).toBeFocused();
  expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => document.fonts.ready);
  if ([390,1440].includes(width)) await page.screenshot({ path: path.join(output, `today-${width}.png`), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
    rootFont: getComputedStyle(document.documentElement).fontSize, inline: document.documentElement.style.fontSize,
    overflowing: [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className })) }));
  writeFileSync(path.join(output, `today-${width}-root200.json`), JSON.stringify(geometry), { mode: 0o600 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await expect(open).toBeVisible(); expect(errors).toEqual([]);
});
