import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { test, expect, type BrowserContext } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_NC_ROUTING_ACCEPTANCE !== "1", "Dedicated synthetic loopback venue only");
test.describe.configure({ mode: "serial" });
let fixture: { ids: Record<string,string>; agents: Record<string,string>; leads: Record<string,string> };
let pool: Pool;
let agent: BrowserContext, admin: BrowserContext;
const output = process.env.AMM_E2E_OUTPUT_DIR || "output/playwright";
const query = async (sql: string, values: unknown[] = []) => (await pool.query(sql, values)).rows;
const address = (region = "NC") => ({ version: 1, enteredText: "101 Synthetic Lane", acceptedText: `101 Synthetic Lane, Unit TEST, Wilson, ${region} 27893`, components: { line1: "101 Synthetic Lane", line2: "Unit TEST", locality: "Wilson", region, postalCode: "27893", country: "US" }, confirmation: "manual", validation: "not_performed" });
async function signIn(context: BrowserContext, role: string, target: string) {
  const page = await context.newPage();
  await page.goto(`/lead-center-login?returnTo=${encodeURIComponent(target)}`);
  await page.getByLabel("Work email").fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Open Lead Center" }).click();
  await expect(page).toHaveURL(new URL(target, test.info().project.use.baseURL).href);
  return page;
}
async function businessHash() {
  const tables = ["leads", "agent_operational_enrollment", "lead_allocation_policy", "lead_allocation_offers", "agent_assignments", "lead_notifications", "tasks", "lead_appointments", "audit_logs", "lead_allocation_send_reservations"];
  return Promise.all(tables.map(async table => (await query(`SELECT md5(coalesce(jsonb_agg(t ORDER BY to_jsonb(t)::text),'[]')::text) AS hash FROM public.${table} t`))[0].hash));
}
test.beforeAll(async ({ browser }) => {
  const url = new URL(process.env.DATABASE_URL || "http://invalid");
  if (process.env.VERCEL_ENV !== "development" || !["localhost","127.0.0.1"].includes(url.hostname) || url.pathname !== "/amm_qa_upgrade" || process.env.PREVIEW_URL) throw new Error("isolated_synthetic_database_required");
  fixture = JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!, "utf8"));
  pool = new Pool({ connectionString: url.href, max: 2 });
  await query("UPDATE leads SET address_entry=$2::jsonb,timeline_months=3 WHERE id=$1", [fixture.leads.agent, JSON.stringify(address())]);
  agent = await browser.newContext({ reducedMotion: "reduce" }); admin = await browser.newContext({ reducedMotion: "reduce" });
  await (await signIn(agent, "agent", `/admin/leads/${fixture.leads.agent}`)).close();
  await (await signIn(admin, "admin", `/admin/leads/${fixture.leads.agent}`)).close();
  mkdirSync(output, { recursive: true });
});
test.afterAll(async () => { await agent?.close(); await admin?.close(); await pool?.end(); });

test("sentinel: saved inquiry to factual dossier, routing holds and existing human next step is read-only", async () => {
  const before = await businessHash(); const page = await admin.newPage(); const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/admin/leads/${fixture.leads.agent}`);
  const panel = page.getByRole("region", { name: "Qualification and routing" });
  await expect(panel).toBeVisible(); await expect(panel).toContainText("NC");
  await expect(panel).toContainText("Client-reported");
  await expect(panel).toContainText("Representation");
  await expect(panel).toContainText("HELD");
  await expect(panel).toContainText("license");
  await expect(panel.getByRole("link", { name: "Open Today" })).toHaveAttribute("href", "/admin/today");
  await expect(panel.getByRole("link", { name: "Review follow-up" })).toHaveAttribute("href", "#follow-up");
  const permission = await page.evaluate(async id => { const response = await fetch(`/api/admin/leads/${id}/communication-permissions`); return { status: response.status, cache: response.headers.get("cache-control") }; }, fixture.leads.agent);
  expect(permission.status).toBe(200); expect(permission.cache).toContain("no-store");
  expect(await businessHash()).toEqual(before); expect(errors).toEqual([]); await page.close();
});
for (const width of [320,390,430,768,1440]) test(`built dossier ${width}px, keyboard and actual 200% root text`, async () => {
  const page = await agent.newPage(); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1000 });
  const permissionRead = page.waitForResponse(response => response.url().includes(`/api/admin/leads/${fixture.leads.agent}/communication-permissions`) && response.request().method() === "GET");
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await permissionRead;
  const panel = page.getByRole("region", { name: "Qualification and routing" });
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText("Agent-by-agent");
  await panel.screenshot({ path: path.join(output, `qualification-${width}-compact.png`) });
  const summary = panel.locator("summary").filter({ hasText: "Facts and evidence" });
  await summary.focus(); await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await expect(panel).toContainText("address_entry");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  await panel.screenshot({ path: path.join(output, `qualification-${width}.png`) });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  // Wait for the normal browser style/layout turn; never shrink or reapply text
  // to conceal a reset. The first attempt's immediate read returned 16px.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  const target = panel.getByRole("link", { name: "Open Today" });
  expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await panel.screenshot({ path: path.join(output, `qualification-${width}-200.png`) });
  expect(errors).toEqual([]); await page.close();
});
test("wrong agent, revoked session and logged-out HTML do not disclose dossier or property facts", async ({ browser }) => {
  const wrong = await browser.newContext(); const page = await signIn(wrong, "other", "/admin/leads");
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await expect(page).toHaveURL(/error=forbidden/);
  expect(await page.content()).not.toContain("101 Synthetic Lane"); await wrong.close();
  const expired = await browser.newContext(); const p = await signIn(expired, "agent", `/admin/leads/${fixture.leads.agent}`);
  await query('UPDATE lead_center_sessions SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1', [fixture.ids.agent]);
  await p.reload(); await expect(p).toHaveURL(/lead-center-login/); expect(await p.content()).not.toContain("101 Synthetic Lane"); await expired.close();
  const guest = await browser.newContext(); const g = await guest.newPage(); await g.goto(`/admin/leads/${fixture.leads.agent}`);
  await expect(g).toHaveURL(/lead-center-login/); expect(await g.content()).not.toContain("Qualification and routing"); await guest.close();
});
test("unknown and out-of-state property jurisdiction do not acquire NC agency conclusions", async () => {
  const page = await admin.newPage();
  for (const entry of [null, address("VA")]) {
    await query("UPDATE leads SET address_entry=$2::jsonb WHERE id=$1", [fixture.leads.agent, entry && JSON.stringify(entry)]);
    await page.goto(`/admin/leads/${fixture.leads.agent}`);
    const panel = page.getByRole("region", { name: "Qualification and routing" });
    await expect(panel).not.toContainText("NC agency review"); await expect(panel).toContainText("HELD");
  }
  await page.close();
});
test("inherited responsibility and QA suppression survive repeat-inquiry review without writes", async () => {
  const id = randomUUID(), session = randomUUID();
  await query("INSERT INTO sessions(id) VALUES($1)", [session]);
  await query("INSERT INTO leads(id,session_id,first_name,last_name,lead_type,primary_intent,is_test,communication_suppressed,duplicate_of_lead_id) VALUES($1,$2,'SYNTHETIC','REPEAT','buyer','buy',true,true,$3)", [id, session, fixture.leads.agent]);
  const before = await businessHash(); const page = await admin.newPage(); await page.goto(`/admin/leads/${id}`);
  const panel = page.getByRole("region", { name: "Qualification and routing" });
  await expect(panel).toContainText("inherited"); await expect(panel).toContainText("HELD");
  await expect(page.getByRole("button", { name: "Review & call" })).toHaveCount(0);
  expect(await businessHash()).toEqual(before); await page.close();
});
test("allocation readiness shows absent professional proof, not SMS as the activation blocker", async () => {
  const before = await businessHash(), page = await admin.newPage(); await page.goto("/admin/allocation");
  const panel = page.getByRole("region", { name: "Future routing readiness" });
  await expect(panel).toContainText("OFF"); await panel.getByText("Review missing readiness evidence", { exact: true }).click();
  await expect(panel).toContainText("not recorded"); await expect(panel).toContainText("Carrier approval is not");
  expect(await businessHash()).toEqual(before); await page.close();
});
test("ownership change after channel selection removes the dossier before any stale native action", async ({ browser }) => {
  await query("INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_text,source,evidence_at) VALUES($1,'phone','manual_one_to_one','allowed','SYNTHETIC NO CONTACT','isolated_fixture',now()) ON CONFLICT DO NOTHING", [fixture.leads.agent]);
  const context = await browser.newContext(), page = await signIn(context, "agent", `/admin/leads/${fixture.leads.agent}`);
  const call = page.getByRole("button", { name: "Review & call" }); await expect(call).toBeEnabled(); await call.click();
  await page.getByRole("checkbox", { name: /I reviewed the request/ }).check();
  await query("UPDATE leads SET assigned_agent_id=$2 WHERE id=$1", [fixture.leads.agent, fixture.agents.other]);
  const before = await businessHash();
  await page.getByRole("button", { name: "Open dialer" }).click();
  await expect(page.getByRole("status", { name: "Lead access unavailable" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Qualification and routing" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open dialer" })).toHaveCount(0);
  expect(await businessHash()).toEqual(before); await context.close();
});
