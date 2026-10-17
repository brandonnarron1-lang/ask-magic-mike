import { mkdirSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { expect, test } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_CONSUMER_WORKSPACE_ACCEPTANCE !== "1", "Existing isolated PostgreSQL/Better Auth harness required");
test.describe.configure({mode:"serial"});
const output = process.env.AMM_E2E_OUTPUT_DIR || ".amm-run/consumer-workspace/screenshots";
let pool: Pool;
test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (process.env.VERCEL_ENV !== "development" || process.env.PREVIEW_URL || url.hostname !== "localhost" || url.pathname !== "/amm_qa_upgrade") throw new Error("owned_disposable_loopback_database_required");
  pool = new Pool({connectionString:url.href,max:1}); mkdirSync(output,{recursive:true});
});
test.afterAll(async () => { await pool?.end(); });
test.beforeEach(async ({page,baseURL}) => {
  const origin = new URL(baseURL!).origin;
  await page.route("**/*", async route => {
    if (new URL(route.request().url()).origin !== origin) { await route.abort("blockedbyclient"); return; }
    await route.continue(); // Actual built app, real canonical handler and isolated SQL.
  });
});

test("public versioned API and canonical links contain no account or private record data", async ({request,page}) => {
  const response = await request.get("/api/experience/v1");
  expect(response.status()).toBe(200);
  const contract = await response.json();
  expect(contract.version).toBe("amm.experience.v1");
  expect(contract.compatibility.publicIntake).toBe("/api/leads");
  expect(JSON.stringify(contract)).not.toMatch(/@|assigned_agent_id|lead_id|session_id|token/);
  await page.goto("/my");
  await expect(page.getByRole("link",{name:"buying-plan guidance"})).toHaveAttribute("href","/buy");
  await expect(page.getByRole("link",{name:"seller-options review"})).toHaveAttribute("href","/sell?seller_option=compare");
});

for (const width of [320,390,430,768,1440]) test(`guest comparison, keyboard and 200% text at ${width}`, async ({page}) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({width,height:1000}); await page.goto("/my");
  await page.getByLabel("Address or listing link",{exact:true}).fill("123 Synthetic Fixture Lane, Wilson NC");
  await page.getByRole("button",{name:"Save for comparison",exact:true}).press("Enter");
  await expect(page.getByRole("heading",{name:"123 Synthetic Fixture Lane, Wilson NC",exact:true})).toBeVisible();
  await page.evaluate(() => {document.documentElement.style.fontSize="200%";});
  const button = page.getByRole("button",{name:"Prepare a help request",exact:true});
  await button.focus(); await expect(button).toBeFocused();
  const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44);
  const geometry = await page.evaluate(() => ({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.documentElement).fontSize}));
  expect(geometry.font).toBe("32px"); expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  await page.screenshot({path:path.join(output,`guest-${width}-root200.png`),fullPage:true});
  expect(errors).toEqual([]);
});

test(process.env.AMM_E2E_BUILT === "1"
  ? "compiled loopback origin fails closed and preserves the unresolved request without SQL effects"
  : "development diagnostic: saved search reaches real canonical persistence and safe receipt once, with no sends", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const before = (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_receipts")).rows[0];
  await page.goto("/my");
  await page.getByLabel("Interest type").selectOption("search");
  await page.getByLabel("Search area",{exact:true}).fill("Wilson SYNTHETIC FIXTURE");
  await page.getByLabel("Budget range (optional)",{exact:true}).fill("Under $300,000");
  await page.getByRole("button",{name:"Save for comparison",exact:true}).click();
  expect((await pool.query("SELECT count(*)::int n FROM leads")).rows[0].n).toBe(before.leads);
  await page.getByRole("button",{name:"Prepare a help request",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Review before you ask for help.",exact:true})).toBeFocused();
  await expect(page.getByLabel("Desired area",{exact:true})).toHaveValue("Wilson SYNTHETIC FIXTURE");
  await expect(page.getByLabel("Name",{exact:true})).toHaveValue("");
  await expect(page.locator('input[name="consent"]')).not.toBeChecked();
  await page.getByLabel("Name",{exact:true}).fill("INTERNAL QA — DO NOT CONTACT — GUEST WORKSPACE");
  await page.getByLabel("Email",{exact:true}).fill("guest-workspace@example.test");
  await page.getByRole("button",{name:"Review request",exact:true}).click();
  expect((await pool.query("SELECT count(*)::int n FROM leads")).rows[0].n).toBe(before.leads);
  await expect(page.getByRole("heading",{name:"Review your request",exact:true})).toBeFocused();
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === "/api/leads" && response.request().method() === "POST");
  await page.getByRole("button",{name:"Request Buyer Plan",exact:true}).click();
  const response = await responsePromise;
  if (process.env.AMM_E2E_BUILT === "1") {
    // Production-mode Origin allowlisting deliberately refuses loopback. Do not
    // forge an Origin or relax the app just to turn this into capture evidence.
    expect(response.status()).toBe(403);
    await expect(page.getByRole("alert").filter({hasText:"This form origin is not approved."})).toBeVisible();
    await expect(page.getByLabel("Name",{exact:true})).toBeDisabled();
    expect((await pool.query("SELECT count(*)::int n FROM leads")).rows[0].n).toBe(before.leads);
    expect(errors).toEqual([]);
    return;
  }
  expect(response.status()).toBe(200);
  await expect(page.getByRole("heading",{name:"Your request is in.",exact:true})).toBeVisible();
  const rows = (await pool.query("SELECT is_test,communication_suppressed,consent_email,consent_sms,consent_call FROM leads WHERE email=$1",["guest-workspace@example.test"])).rows;
  expect(rows).toEqual([{is_test:true,communication_suppressed:true,consent_email:false,consent_sms:false,consent_call:false}]);
  const after = (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_receipts")).rows[0];
  expect(after).toEqual({...before,leads:before.leads+1});
  await expect(page.getByText(/Saved request reference:/)).toBeVisible();
  await expect(page.getByText(/No appointment or consumer outreach is created/)).toBeVisible();
  expect(errors).toEqual([]);
});
