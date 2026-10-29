import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { timelineOptions } from "../../app/lib/constants";
import { LEAD_CONSENT_LANGUAGE_TEXT, LEAD_CONSENT_LANGUAGE_VERSION } from "../../app/lib/leadConsent";

// Main's opt-in runner creates this disposable database, synthetic identities,
// and built-app transport. Never attach this mutation suite to another venue.
// Intake proof is intentionally split: marked Home Value UI -> real SQL,
// ordinary Home Value/seller HTTP -> real SQL/appointment/manual UI. Marked
// seller UI now also follows the synthetic-only capability and has no consumer
// appointment CTA. Ordinary consumer UI is separately covered by intercepted
// compiled UI cases, not falsely unlocked here. Health/capability are never mocked.
test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_CONVERSION_SESSION_ACCEPTANCE !== "1", "Run the isolated conversion acceptance command");
test.describe.configure({ mode: "serial" });
type Fixture = { ids: Record<string, string>; agents: Record<string, string>; leads: Record<string, string> };
let fixture: Fixture;
let pool: Pool;
const contexts: Record<string, BrowserContext> = {};
const renderFailures: string[]=[];
const renderChecks: Promise<void>[]=[];
const sql = async (statement: string, values: unknown[] = []) => (await pool.query(statement, values)).rows;

function actionForm(page: Page, name: string): Locator {
  return page.getByRole("form",{name,exact:true});
}
function panel(page: Page, name: string): Locator {
  if (name === "Appointment operations") return page.locator("details").filter({ has: page.locator("summary").filter({hasText:/^Appointment operations$/}) }).last();
  return page.locator("section").filter({ has: page.getByRole("heading", { name, exact: true }) }).last();
}
async function openWorkPanels(page: Page) {
  for (const name of ["Log manual interaction + next task", "Appointment operations", "Follow-up tasks", "First-response evidence"]) {
    const summary=page.locator("main details > summary").filter({hasText:new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}$`)}).first();
    if (await summary.count() && await summary.locator("..").getAttribute("open") === null) await summary.click();
  }
}
async function openLead(role = "agent") {
  const page = await contexts[role].newPage();
  await page.goto(`/admin/leads/${fixture.leads.agent}`);
  await expect(page.locator("summary").filter({hasText:/^Appointment operations$/})).toBeVisible();
  await openWorkPanels(page);
  return page;
}
async function countResponse() {
  return Number((await sql("SELECT count(*)::int AS n FROM lead_response_milestones WHERE lead_id=$1", [fixture.leads.agent]))[0].n);
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
async function isolatedPublicOrigin(page: Page) {
  // next start uses Production Origin policy in this isolated venue. Map ONLY
  // the Origin; actual UI bytes, public handlers, responses and SQL are real.
  // This proves neither deployed DNS/TLS nor cross-domain browser behavior.
  await page.route(/\/api\/(?:leads|appointments\/request)$/, async route => {
    expect(new URL(route.request().url()).origin).toBe(new URL(test.info().project.use.baseURL!).origin);
    const response = await route.fetch({ headers: { ...route.request().headers(), origin: "https://www.askmagicmike.com" } });
    await route.fulfill({ response });
  });
}

test.beforeAll(async ({ browser }) => {
  if (process.env.VERCEL_ENV !== "development" || process.env.PREVIEW_URL) throw new Error("isolated_development_venue_required");
  const database = new URL(process.env.DATABASE_URL || "");
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/amm_qa_upgrade" || database.username !== "postgres") throw new Error("exact_disposable_database_required");
  const app = new URL(test.info().project.use.baseURL || "");
  if (app.protocol !== "http:" || app.hostname !== "localhost" || app.port !== process.env.AMM_E2E_PORT) throw new Error("exact_isolated_app_required");
  fixture = JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!, "utf8"));
  pool = new Pool({ connectionString: database.toString(), max: 2 });
  for (const role of ["admin", "owner", "agent", "analyst", "other"]) {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 1000 }, baseURL: app.origin });
    context.on("response",response=>{
      const local=new URL(response.url());
      if(local.origin!==app.origin||!local.pathname.startsWith("/admin/")) return;
      renderChecks.push((async()=>{
        if(response.status()>=500) renderFailures.push(`${local.pathname}:HTTP_${response.status()}`);
        if(response.headers()["content-type"]?.includes("text/x-component")&&(await response.text()).includes('"digest":"DYNAMIC_SERVER_USAGE"')) renderFailures.push(`${local.pathname}:DYNAMIC_SERVER_USAGE`);
      })().catch(()=>undefined));
    });
    const page = await context.newPage();
    const target = role === "analyst" ? "/admin/reporting" : "/admin/leads";
    await page.goto(`/lead-center-login?returnTo=${encodeURIComponent(target)}`);
    await page.getByLabel("Work email").fill(`${role}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Open Lead Center" }).click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    expect((await sql('SELECT count(*)::int AS n FROM lead_center_sessions WHERE "userId"=$1', [fixture.ids[role]]))[0].n).toBeGreaterThan(0);
    contexts[role] = context;
    await page.close();
  }
});
test.afterAll(async () => {
  await Promise.all(renderChecks);
  for (const context of Object.values(contexts)) await context.close();
  await pool?.end();
  expect(renderFailures,"Unexpected built-app render failures (no contact data)").toEqual([]);
});

test("Authentication-dependent command aliases render dynamically when auth was configured only at runtime",async()=>{
  const page=await contexts.agent.newPage();
  const response=await page.goto("/admin/action-queue");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/today$/);
  await expect(page.getByRole("heading",{name:"Your next step.",exact:true})).toBeVisible();
  await page.close();
});

test("Real Home Value synthetic-QA UI rejects unmarked contact without POST, then captures a distinct marked request with no appointment CTA",async()=>{
  test.setTimeout(120_000);
  const owner=await contexts.owner.newPage();
  const health = await owner.request.get("/api/health/live");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, service: "ask-magic-mike", public_intake: "synthetic_qa" });
  let leadPosts = 0;
  owner.on("request", request => {
    if (new URL(request.url()).pathname === "/api/leads" && request.method() === "POST") leadPosts += 1;
  });
  await isolatedPublicOrigin(owner);
  const source="ourtownproperties";
  await owner.goto(`/home-value?utm_source=${source}&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_home_value_page`);
  await expect(owner.locator('.amm-home-value [data-intake-mode="synthetic_qa"]')).toBeVisible();
  const email=`${randomUUID()}@example.test`;
  await owner.getByLabel("Property address").fill("2 Synthetic Test Street, Wilson, NC");
  await owner.getByRole("button",{name:"Continue",exact:true}).click();
  await owner.getByLabel("Your name",{exact:true}).fill("SYNTHETIC FIXTURE — NOT A CONSUMER");
  await owner.getByLabel("Email for your valuation follow-up").fill(email);
  await owner.locator('[data-amm-step="contact"]').getByRole("checkbox").check();
  await owner.getByRole("button",{name:"Request Valuation",exact:true}).click();
  await expect(owner.locator(".amm-home-value").getByRole("alert")).toContainText("Synthetic QA only: use an INTERNAL QA / DO NOT CONTACT name and an example.test email.");
  await expect(owner.getByLabel("Your name",{exact:true})).toHaveValue("SYNTHETIC FIXTURE — NOT A CONSUMER");
  await expect(owner.getByLabel("Email for your valuation follow-up")).toHaveValue(email);
  await expect(owner.getByRole("heading",{name:"Your request is in.",exact:true})).toHaveCount(0);
  expect(leadPosts).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM leads WHERE email=$1",[email]))[0].n).toBe(0);

  const qaEmail=`${randomUUID()}@example.test`;
  await owner.getByLabel("Your name",{exact:true}).fill("SYNTHETIC UI FIXTURE | INTERNAL QA | DO NOT CONTACT");
  await owner.getByLabel("Email for your valuation follow-up").fill(qaEmail);
  const [intake] = await Promise.all([
    owner.waitForResponse(r=>new URL(r.url()).pathname==="/api/leads"&&r.request().method()==="POST"),
    owner.getByRole("button",{name:"Request Valuation",exact:true}).click(),
  ]);
  const body=await intake.json();
  expect(intake.status(),JSON.stringify(body)).toBe(200);
  const submitted = intake.request().postDataJSON();
  expect(submitted).toMatchObject({funnel_type:"home_value",lead_source_surface:"home_value_page",
    name:"SYNTHETIC UI FIXTURE | INTERNAL QA | DO NOT CONTACT",email:qaEmail});
  expect(body.session_id).toBe(submitted.idempotency_key);
  await expect(owner.getByRole("heading",{name:"Your request is in.",exact:true})).toBeVisible();
  expect(leadPosts).toBe(1);
  const leadId=body.lead_id; expect(leadId).toBeTruthy();
  expect((await sql("SELECT email,is_test,communication_suppressed,assigned_agent_id FROM leads WHERE id=$1",[leadId]))[0])
    .toMatchObject({email:qaEmail,is_test:true,communication_suppressed:true,assigned_agent_id:fixture.agents.owner});
  expect((await sql("SELECT count(*)::int AS n FROM consents WHERE lead_id=$1",[leadId]))[0].n).toBe(3);
  expect((await sql("SELECT count(*)::int AS n FROM audit_logs WHERE resource_id=$1 AND action='lead.qa_suppressed'",[leadId]))[0].n).toBe(1);
  await expect(owner.getByRole("button",{name:"Request a conversation",exact:true})).toHaveCount(0);
  await expect(owner.locator(".amm-home-value")).toContainText("This test request does not create an appointment or consumer outreach.");
  expect((await sql("SELECT count(*)::int AS n FROM lead_appointments WHERE lead_id=$1",[leadId]))[0].n).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM tasks WHERE lead_id=$1 AND category='followup:appointment_confirmation'",[leadId]))[0].n).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  await owner.close();
});

test("Ordinary synthetic Home Value root HTTP capture reaches Mike-first owner, genuine appointment HTTP, manual UI and scoped reporting (not consumer intake UI proof)",async()=>{
  test.setTimeout(120_000);
  const owner=await contexts.owner.newPage();
  const source="ourtownproperties";
  const email=`${randomUUID()}@example.test`;
  const key=randomUUID();
  // Preserve ordinary lifecycle semantics without clearing a QA record or
  // claiming the synthetic-QA Home Value UI accepts an unmarked consumer.
  // This is the real local root HTTP handler -> isolated SQL, not direct SQL,
  // a handler import, a mocked receipt, or a replacement browser response.
  const intake=await owner.request.post("/api/leads",{
    headers:{Origin:"https://www.askmagicmike.com","Idempotency-Key":key},
    data:{
      funnel_type:"home_value",lead_source_surface:"home_value_page",
      address:"1 Synthetic Test Street, Wilson, NC",name:"SYNTHETIC FIXTURE — NOT A CONSUMER",email,phone:"",
      timeline:timelineOptions[1],status:"new",assigned_agent_id:null,
      widget_session_id:key,idempotency_key:key,
      consent:true,consent_email:true,consent_call:false,
      consent_language_version:LEAD_CONSENT_LANGUAGE_VERSION,consent_language_text:LEAD_CONSENT_LANGUAGE_TEXT,
      consent_source:"home_value_page:home-value",
      attribution:{source,medium:"owned_media",campaign:"amm_owned_demand_2026",content:"wordpress_home_value_page"},
    },
  });
  const body=await intake.json();
  expect(intake.status(),JSON.stringify(body)).toBe(200);
  expect(body.session_id).toBe(key);
  const leadId=body.lead_id; expect(leadId).toBeTruthy();
  expect((await sql("SELECT email,is_test,communication_suppressed FROM leads WHERE id=$1",[leadId]))[0])
    .toMatchObject({email,is_test:false,communication_suppressed:false});
  expect((await sql("SELECT assigned_agent_id FROM leads WHERE id=$1",[leadId]))[0].assigned_agent_id).toBe(fixture.agents.owner);
  expect((await sql("SELECT utm_source,utm_medium,utm_campaign,utm_content FROM source_attribution WHERE lead_id=$1",[leadId]))[0])
    .toMatchObject({utm_source:source,utm_medium:"owned_media",utm_campaign:"amm_owned_demand_2026",utm_content:"wordpress_home_value_page"});
  expect((await sql("SELECT count(*)::int AS n FROM consents WHERE lead_id=$1",[leadId]))[0].n).toBe(3);
  const appointmentBody={lead_id:leadId,session_id:body.session_id,request_surface:"home_value_page"};
  const requested=await owner.request.post("/api/appointments/request",{headers:{Origin:"https://www.askmagicmike.com"},data:appointmentBody});
  expect(requested.status()).toBe(200);
  expect(await requested.json()).toMatchObject({status:"requested"});
  expect((await sql("SELECT count(*)::int AS n FROM tasks WHERE lead_id=$1 AND category='followup:appointment_confirmation'",[leadId]))[0].n).toBe(1);
  const replay=await owner.request.post("/api/appointments/request",{headers:{Origin:"https://www.askmagicmike.com"},data:appointmentBody});
  expect(replay.status()).toBe(200); expect(await replay.json()).toMatchObject({status:"already_requested"});
  const wrongSession=await owner.request.post("/api/appointments/request",{headers:{Origin:"https://www.askmagicmike.com"},data:{...appointmentBody,session_id:randomUUID()}});
  expect(wrongSession.status()).toBe(404);
  await owner.goto(`/admin/leads/${leadId}`);
  await openWorkPanels(owner);
  const human=actionForm(owner,"Save interaction and next task");
  await human.getByLabel("Actual channel").selectOption("phone"); await human.getByLabel("Actual result").selectOption("two_way_conversation");
  await human.getByLabel("Safe interaction note",{exact:true}).fill("SYNTHETIC WALKTHROUGH ONLY — NOT A REAL CONVERSATION OR CONSUMER");
  await human.getByLabel("Next task due",{exact:true}).fill("2030-02-15T10:00");
  await human.getByRole("checkbox",{name:/Required for a two-way conversation/}).check(); await human.getByRole("checkbox",{name:/Confirm this manual interaction/}).check();
  await human.getByRole("button",{name:"Save interaction and next task",exact:true}).click(); await expect(human.getByRole("status")).toContainText("saved together");
  await expect(actionForm(owner,"Mark scheduled")).toBeVisible();
  expect((await sql("SELECT count(*)::int AS n FROM lead_appointments WHERE lead_id=$1 AND status='requested'",[leadId]))[0].n).toBe(1);
  expect((await sql("SELECT count(*)::int AS n FROM lead_response_milestones WHERE lead_id=$1",[leadId]))[0].n).toBe(1);
  await noOverflow(owner);
  await owner.screenshot({path:"output/playwright/conversion-inquiry-owner-walkthrough-390.png",fullPage:true});
  await human.screenshot({path:"output/playwright/conversion-owner-manual-action-390.png"});
  const analyst=await contexts.analyst.newPage(); await analyst.goto("/admin/reporting");
  await expect(analyst.getByRole("heading",{name:"Source to outcome",exact:true})).toBeVisible();
  await expect(analyst.getByText(source,{exact:true}).first()).toBeVisible(); expect(await analyst.content()).not.toContain(email);
  await analyst.screenshot({path:"output/playwright/conversion-source-outcome-walkthrough-390.png",fullPage:true});
  await panel(analyst,"Source to outcome").screenshot({path:"output/playwright/conversion-source-outcome-panel-390.png"});
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  await owner.close();await analyst.close();
});

test("Marked seller UI persists without consumer CTA; distinct ordinary seller HTTP reaches genuine appointment SQL", async () => {
  test.setTimeout(120_000);
  const owner = await contexts.owner.newPage();
  await isolatedPublicOrigin(owner);
  const source = "ourtownproperties";
  const qaEmail = `${randomUUID()}@example.test`;
  // Preserve the real synthetic-QA capability. Do not force LIVE, remove the
  // guard, clear a test flag, inject a component/receipt or fabricate delivery.
  await owner.goto(`/sell?utm_source=${source}&utm_medium=owned_media&utm_campaign=amm_owned_demand_2026&utm_content=wordpress_we_buy_homes`);
  await owner.getByLabel("Property address", { exact: true }).fill("3 Synthetic Test Street, Wilson, NC");
  await owner.getByLabel("Name optional", { exact: true }).fill("INTERNAL QA — DO NOT CONTACT — SYNTHETIC SELLER UI");
  await owner.getByLabel("Phone required", { exact: true }).fill("+12025550198");
  await owner.getByLabel("Email optional", { exact: true }).fill(qaEmail);
  await owner.getByRole("combobox", { name: /Timeline \(optional\)/ }).selectOption(timelineOptions[1]);
  await owner.getByRole("checkbox", { name: /I agree that Our Town Properties/ }).check();
  await expect(owner.getByRole("button", { name: "Request a conversation", exact: true })).toHaveCount(0);
  const [intake] = await Promise.all([
    owner.waitForResponse(response => new URL(response.url()).pathname === "/api/leads" && response.request().method() === "POST"),
    owner.getByRole("button", { name: "Send Seller Details", exact: true }).click(),
  ]);
  const qaBody = await intake.json();
  expect(intake.status(), JSON.stringify(qaBody)).toBe(200);
  expect(intake.request().postDataJSON()).toMatchObject({ funnel_type: "seller", lead_source_surface: "seller_page", email:qaEmail });
  expect(qaBody.session_id).toBe(intake.request().postDataJSON().idempotency_key);
  expect((await sql("SELECT email,is_test,communication_suppressed FROM leads WHERE id=$1",[qaBody.lead_id]))[0])
    .toMatchObject({email:qaEmail,is_test:true,communication_suppressed:true});
  await expect(owner.locator("#seller-form-status")).toContainText("stored for review");
  await expect(owner.getByRole("button", { name: "Request a conversation", exact: true })).toHaveCount(0);
  expect((await sql("SELECT count(*)::int AS n FROM lead_appointments WHERE lead_id=$1",[qaBody.lead_id]))[0].n).toBe(0);
  // A separate ordinary synthetic record tests the real public appointment
  // HTTP-to-SQL contract. This is explicitly NOT ordinary seller browser UI.
  const email=`${randomUUID()}@example.test`,key=randomUUID();
  const ordinary=await owner.request.post("/api/leads",{headers:{Origin:"https://www.askmagicmike.com","Idempotency-Key":key},data:{
    funnel_type:"seller",lead_source_surface:"seller_page",name:"SYNTHETIC SELLER HTTP FIXTURE — NOT A CONSUMER",email,phone:"+12025550197",
    address:"4 Synthetic Test Street, Wilson, NC",timeline:timelineOptions[1],widget_session_id:key,idempotency_key:key,
    consent:true,consent_email:true,consent_call:true,consent_sms:false,
    consent_language_version:LEAD_CONSENT_LANGUAGE_VERSION,consent_language_text:LEAD_CONSENT_LANGUAGE_TEXT,consent_source:"seller_page:seller-intake",
    attribution:{source,medium:"owned_media",campaign:"amm_owned_demand_2026",content:"wordpress_we_buy_homes"},
  }});
  const body=await ordinary.json();expect(ordinary.status(),JSON.stringify(body)).toBe(200);expect(body.session_id).toBe(key);
  const leadId=body.lead_id;expect(leadId).toBeTruthy();
  expect((await sql("SELECT email,is_test,communication_suppressed,assigned_agent_id FROM leads WHERE id=$1", [leadId]))[0])
    .toMatchObject({ email, is_test: false, communication_suppressed: false, assigned_agent_id: fixture.agents.owner });
  expect((await sql("SELECT utm_source,utm_medium,utm_campaign,utm_content FROM source_attribution WHERE lead_id=$1", [leadId]))[0])
    .toMatchObject({ utm_source: source, utm_medium: "owned_media", utm_campaign:"amm_owned_demand_2026",utm_content:"wordpress_we_buy_homes" });
  expect((await sql("SELECT count(*)::int AS n FROM consents WHERE lead_id=$1", [leadId]))[0].n).toBe(3);
  const appointmentPayload={lead_id:leadId,session_id:body.session_id,request_surface:"seller_page"};
  const requested=await owner.request.post("/api/appointments/request",{headers:{Origin:"https://www.askmagicmike.com"},data:appointmentPayload});
  expect(requested.status()).toBe(200);
  expect(await requested.json()).toMatchObject({ status: "requested" });
  expect((await sql("SELECT is_test,communication_suppressed FROM leads WHERE id=$1",[qaBody.lead_id]))[0])
    .toMatchObject({is_test:true,communication_suppressed:true});
  expect((await sql("SELECT count(*)::int AS n FROM tasks WHERE lead_id=$1 AND category='followup:appointment_confirmation'", [leadId]))[0].n).toBe(1);
  expect((await sql("SELECT count(*)::int AS n FROM lead_appointments WHERE lead_id=$1 AND status='requested'", [leadId]))[0].n).toBe(1);
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  await owner.screenshot({ path: "output/playwright/conversion-marked-seller-ui-no-consumer-appointment-390.png", fullPage: true });
  await owner.close();
});

test("Genuine task action preserves invalid draft, replays a lost response once, and never infers contact", async () => {
  test.setTimeout(120_000);
  const page = await openLead();
  const note = "SYNTHETIC CONVERSION REPLAY — DO NOT CONTACT";
  const form = actionForm(page, "Add follow-up");
  await form.locator('[name="task_type"]').selectOption("manual_callback");
  await form.locator('[name="note"]').fill(note);
  await form.locator('[name="due_at"]').fill("2026-03-08T02:30");
  await form.getByRole("button", { name: "Add follow-up", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("does not exist");
  await expect(form.locator('[name="note"]')).toHaveValue(note);
  await expect(form.locator('[name="due_at"]')).toHaveValue("2026-03-08T02:30");
  expect((await sql("SELECT count(*)::int AS n FROM tasks WHERE lead_id=$1 AND body=$2", [fixture.leads.agent, note]))[0].n).toBe(0);
  await form.locator('[name="due_at"]').fill("2026-10-06T00:00");

  let dropped = false;
  const url = `**/admin/leads/${fixture.leads.agent}`;
  await page.route(url, async (route) => {
    if (!dropped && route.request().method() === "POST" && route.request().headers()["next-action"]) {
      dropped = true;
      // The real server action and SQL execute. Only its response is lost.
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await form.getByRole("button", { name: "Add follow-up", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("Save outcome not confirmed");
  await expect(form.locator('[name="note"]')).toBeDisabled();
  await page.screenshot({ path: "output/playwright/conversion-real-session-uncertain-replay-390.png", fullPage: true });
  await page.unroute(url);
  expect(dropped).toBe(true);
  await form.getByRole("button", { name: "Retry same request", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("already saved");
  const rows = await sql("SELECT id,status FROM tasks WHERE lead_id=$1 AND body=$2", [fixture.leads.agent, note]);
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe("open");
  expect((await sql("SELECT count(*)::int AS n FROM audit_logs WHERE resource_id=$1 AND metadata->>'task_id'=$2 AND metadata->>'operation'='task_create'", [fixture.leads.agent, rows[0].id]))[0].n).toBe(1);
  expect(await countResponse()).toBe(0);

  const today = await contexts.agent.newPage();
  await today.goto("/admin/today");
  const taskActionId = `${fixture.leads.agent}:task:${rows[0].id}`;
  await expect(today.locator(`input[name="action_id"][value="${taskActionId}"]`).first()).toHaveCount(1);

  const complete = page.locator("form").filter({ has: page.locator(`input[name="task_id"][value="${rows[0].id}"]`) }).filter({ has: page.getByRole("button", { name: "Complete task", exact: true }) });
  await expect(complete).toBeVisible();
  await complete.getByRole("button").click();
  await expect.poll(async () => (await sql("SELECT status FROM tasks WHERE id=$1", [rows[0].id]))[0].status).toBe("done");
  expect(await countResponse()).toBe(0);
  await today.reload();
  await expect(today.getByRole("heading", { name: "Your next step.", exact: true })).toBeVisible();
  await expect(today.locator(`input[name="action_id"][value="${taskActionId}"]`)).toHaveCount(0);
  await today.screenshot({ path: "output/playwright/conversion-real-session-task-today-390.png", fullPage: true });
  await today.close();
  await page.close();
});

test("Manual result and keyboard-confirmed conversation save real audit, next task and first response atomically", async () => {
  const page = await openLead();
  const form = actionForm(page, "Save interaction and next task");
  await form.getByLabel("Actual channel").selectOption("phone");
  await form.getByLabel("Actual result").selectOption("no_answer");
  await form.getByLabel("Safe interaction note", { exact: true }).fill("SYNTHETIC NO ANSWER — DO NOT CONTACT");
  await form.getByLabel("Next task due", { exact: true }).fill("2030-01-15T10:00");
  await form.getByRole("checkbox", { name: /Confirm this manual interaction/ }).check();
  await form.getByRole("button", { name: "Save interaction and next task", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("saved together");
  expect(await countResponse()).toBe(0);
  await form.getByRole("button", { name: "Log a separate interaction", exact: true }).click();
  await form.getByLabel("Actual result").selectOption("two_way_conversation");
  await form.getByLabel("Safe interaction note", { exact: true }).fill("SYNTHETIC TWO-WAY CONVERSATION — DO NOT CONTACT");
  await form.getByLabel("Next task due", { exact: true }).fill("2030-01-15T11:00");
  await form.getByRole("checkbox", { name: /Confirm this manual interaction/ }).check();
  await form.getByRole("button", { name: "Save interaction and next task", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("explicitly confirmed two-way conversation");
  expect(await countResponse()).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM tasks WHERE lead_id=$1 AND body LIKE 'SYNTHETIC TWO-WAY%';", [fixture.leads.agent]))[0].n).toBe(0);
  const confirmation = form.getByRole("checkbox", { name: /Required for a two-way conversation/ });
  await confirmation.focus();
  await page.keyboard.press("Space");
  await expect(confirmation).toBeChecked();
  // Re-confirm the actual interaction using only the keyboard, then submit.
  const actual = form.getByRole("checkbox", { name: /Confirm this manual interaction/ });
  await actual.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(form.getByRole("button", { name: "Save interaction and next task", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(form.getByRole("status")).toContainText("saved together");
  expect(await countResponse()).toBe(1);
  const evidence = await sql("SELECT metadata->>'provenance' AS provenance,metadata->>'channel' AS channel,metadata->>'result' AS result,metadata->>'task_id' AS task_id,actor FROM audit_logs WHERE resource_id=$1 AND action='lead.human_interaction_recorded' ORDER BY created_at", [fixture.leads.agent]);
  expect(evidence).toHaveLength(2);
  expect(evidence[1]).toMatchObject({ provenance: "manual_operator_record", channel: "phone", result: "two_way_conversation", actor: `lead_center:${fixture.ids.agent}` });
  expect((await sql("SELECT status FROM tasks WHERE id=$1", [evidence[1].task_id]))[0].status).toBe("open");
  await page.screenshot({ path: "output/playwright/conversion-real-session-human-followthrough-390.png", fullPage: true });
  await page.close();
});

test("Appointment request, declared-zone schedule and stale cancellation use genuine confirmed actions", async () => {
  test.setTimeout(120_000);
  const page = await openLead();
  const appointment = panel(page, "Appointment operations");
  const create = actionForm(page, "Create appointment record");
  await expect(appointment).toContainText("no external calendar event is created");
  await create.getByRole("checkbox").check();
  await create.getByRole("button", { name: "Create appointment record", exact: true }).click();
  await expect.poll(async () => (await sql("SELECT status FROM lead_appointments WHERE lead_id=$1", [fixture.leads.agent]))[0]?.status).toBe("requested");
  const schedule = actionForm(page, "Mark scheduled");
  await schedule.locator('[name="starts_at"]').fill("2026-11-01T01:30");
  await schedule.locator('[name="ends_at"]').fill("2026-11-01T02:30");
  await schedule.getByRole("checkbox").check();
  await schedule.getByRole("button", { name: "Mark scheduled", exact: true }).click();
  await expect(schedule.getByRole("alert")).toContainText("occurs twice");
  await expect(schedule.locator('[name="starts_at"]')).toHaveValue("2026-11-01T01:30");
  await schedule.locator('[name="starts_at"]').fill("2030-01-15T14:00");
  await schedule.locator('[name="ends_at"]').fill("2030-01-15T14:30");
  await schedule.getByRole("button", { name: "Mark scheduled", exact: true }).click();
  await expect(actionForm(page, "Mark confirmed")).toBeVisible();
  const row = (await sql("SELECT id,status,starts_at::text AS starts_at FROM lead_appointments WHERE lead_id=$1", [fixture.leads.agent]))[0];
  expect(row.status).toBe("scheduled");
  expect(new Date(row.starts_at).toISOString()).toBe("2030-01-15T19:00:00.000Z");
  const stalePage = await openLead();
  const cancel = actionForm(stalePage, "Mark canceled");
  const reason = "SYNTHETIC draft retained through conflict";
  await cancel.locator('[name="cancellation_reason"]').fill(reason);
  await cancel.getByRole("checkbox").check();
  const confirm = actionForm(page, "Mark confirmed");
  await confirm.getByRole("checkbox").check();
  await confirm.getByRole("button", { name: "Mark confirmed", exact: true }).click();
  await expect.poll(async () => (await sql("SELECT status FROM lead_appointments WHERE id=$1", [row.id]))[0].status).toBe("confirmed");
  await cancel.getByRole("button", { name: "Mark canceled", exact: true }).click();
  await expect(cancel.getByRole("alert")).toContainText("changed in another session");
  await expect(cancel.locator('[name="cancellation_reason"]')).toHaveValue(reason);
  await expect(cancel.getByRole("button", { name: "Mark canceled", exact: true })).toBeDisabled();
  await stalePage.screenshot({ path: "output/playwright/conversion-real-session-appointment-conflict-390.png", fullPage: true });
  await cancel.screenshot({ path: "output/playwright/conversion-appointment-conflict-panel-390.png" });
  await cancel.getByRole("button", { name: "Review latest record (keep draft)", exact: true }).click();
  await expect(cancel.getByRole("checkbox")).not.toBeChecked();
  await expect(cancel.locator('[name="cancellation_reason"]')).toHaveValue(reason);
  await cancel.getByRole("checkbox").check();
  await cancel.getByRole("button", { name: "Mark canceled", exact: true }).click();
  await expect.poll(async () => (await sql("SELECT status FROM lead_appointments WHERE id=$1", [row.id]))[0].status).toBe("canceled");
  expect((await sql("SELECT count(*)::int AS n FROM lead_appointments WHERE lead_id=$1", [fixture.leads.agent]))[0].n).toBe(1);
  await stalePage.close();
  await page.close();
});

test("Real role sessions preserve assignment/report boundaries with no provider dispatch", async () => {
  for (const role of ["owner", "other", "analyst"]) {
    const page = await contexts[role].newPage();
    await page.goto(`/admin/leads/${fixture.leads.agent}`);
    await expect(page).toHaveURL(/lead-center-login\?error=forbidden/);
    expect(await page.content()).not.toContain("private-agent@example.test");
    await page.close();
  }
  const admin = await openLead("admin");
  await expect(actionForm(admin, "Save interaction and next task")).toBeVisible();
  await admin.close();
  const analyst = await contexts.analyst.newPage();
  await analyst.goto("/admin/reporting");
  await expect(analyst.getByRole("heading", { name: /Analytics and reporting/ })).toBeVisible();
  await expect(analyst.getByRole("button", { name: "Save interaction and next task", exact: true })).toHaveCount(0);
  await analyst.screenshot({ path: "output/playwright/conversion-real-session-reporting-390.png", fullPage: true });
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM lead_allocation_send_reservations"))[0].n).toBe(0);
  await analyst.close();
});

test("Genuine detail form reflows at 320/390/768/1440 and 200% zoom with visible keyboard controls", async () => {
  test.setTimeout(120_000);
  const page = await openLead();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const form = actionForm(page, "Save interaction and next task");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await form.scrollIntoViewIfNeeded();
    await expect(form.getByLabel("Safe interaction note", { exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `output/playwright/conversion-real-session-detail-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  await form.scrollIntoViewIfNeeded();
  await noOverflow(page);
  await form.getByRole("checkbox", { name: /Confirm this manual interaction/ }).focus();
  await page.keyboard.press("Tab");
  await expect(form.getByRole("button", { name: "Save interaction and next task", exact: true })).toBeFocused();
  await expect(form.getByRole("button", { name: "Save interaction and next task", exact: true })).toBeVisible();
  await page.screenshot({ path: "output/playwright/conversion-real-session-detail-zoom-200.png", fullPage: true });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
    document.documentElement.style.fontSize = "200%";
  });
  await form.scrollIntoViewIfNeeded();
  await noOverflow(page);
  await expect(form.getByRole("button", { name: "Save interaction and next task", exact: true })).toBeVisible();
  await page.screenshot({ path: "output/playwright/conversion-real-session-detail-text-200.png", fullPage: true });
  expect(errors).toEqual([]);
  await page.close();
});

test("Analyst report reflows at 320/390/768/1440 and 200% text without private drill-through", async () => {
  test.setTimeout(120_000);
  const page = await contexts.analyst.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/reporting");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("heading", { name: /Analytics and reporting/ })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: `output/playwright/conversion-real-session-reporting-${width}.png`, fullPage: true });
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await noOverflow(page);
  await page.screenshot({ path: "output/playwright/conversion-real-session-reporting-text-200.png", fullPage: true });
  expect(await page.locator('a[href^="/admin/leads/"]').count()).toBe(0);
  expect(await page.content()).not.toContain("private-agent@example.test");
  expect(errors).toEqual([]);
  await page.close();
});
