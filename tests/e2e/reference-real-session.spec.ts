import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import twilio from "twilio";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// This suite cannot attach to an arbitrary server or inherit Production keys.
test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1", "Run the isolated real-session acceptance command");
test.describe.configure({ mode: "serial" });
type Offer = { id: string; version: number; agent_id: string };
type Fixture = { ids: Record<string, string>; agents: Record<string, string>; leads: Record<string, string>; phones: Record<string, string>; offers: Record<string, Offer[]>; codes: Record<string, string[]> };
let f: Fixture;
let pool: Pool;
const contexts: Record<string, BrowserContext> = {};
const apiPages: Record<string, Page> = {};
const origin = `http://localhost:${process.env.AMM_E2E_PORT}`;
const offerFor = (key: string, role = "agent") => f.offers[key].find(o => o.agent_id === f.agents[role])!;
const commandCode = (key: string, role: string) => f.codes[key][f.offers[key].findIndex(o => o.agent_id === f.agents[role])];
const sql = async (text: string, values: unknown[] = []) => (await pool.query(text, values)).rows;
// Chromium treats loopback as a secure context; Playwright's Node HTTP client
// does not send Secure Better Auth cookies over HTTP. Exercise same-origin
// browser fetch, not a credential-less request accidentally proving a 401.
async function appRequest(role: string, url: string, method = "GET", data?: unknown) {
  const value = await apiPages[role].evaluate(async ({url,method,data}) => {
    const response = await fetch(url, { method, credentials:"same-origin", ...(data === undefined ? {} : {headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}) });
    return {status:response.status,body:await response.text()};
  }, {url,method,data});
  return {status:()=>value.status,text:async()=>value.body,json:async()=>JSON.parse(value.body)};
}
async function inbound(body: string, role = "agent", overrides: Record<string, string> = {}, sid = `SM${randomUUID().replaceAll("-", "")}`) {
  const values = { AccountSid: `AC${"a".repeat(32)}`, To: "+12025550100", From: f.phones[role], Body: body, MessageSid: sid, ...overrides };
  const url = `${origin}/api/webhooks/sms/inbound`;
  const signature = twilio.getExpectedTwilioSignature(process.env.AMM_E2E_TWILIO_TOKEN!, url, values);
  const response = await contexts.admin.request.post(url, { form: values, headers: { "x-twilio-signature": signature } });
  return { response, data: await response.json(), sid };
}
test.beforeAll(async ({ browser }) => {
  f = JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!, "utf8"));
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  for (const role of ["admin", "owner", "agent", "analyst", "other"]) {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 1000 } });
    const page = await context.newPage();
    const target = role === "analyst" ? "/admin/reporting" : "/admin/leads";
    await page.goto(`/lead-center-login?returnTo=${encodeURIComponent(target)}`);
    await page.getByLabel("Work email").fill(`${role}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Open Lead Center" }).click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    expect(await sql('SELECT count(*)::int AS n FROM lead_center_sessions WHERE "userId"=$1', [f.ids[role]])).toEqual([{ n: 1 }]);
    contexts[role] = context;
    apiPages[role] = page;
  }
});
test.afterAll(async () => { for (const context of Object.values(contexts)) await context.close(); await pool?.end(); });

test("Real sessions enforce four-role list/detail/report and direct API boundaries", async () => {
  for (const role of ["admin", "owner", "agent"]) {
    const page = await contexts[role].newPage();
    await page.goto("/admin/leads");
    await expect(page.getByRole("heading", { name: "Lead inbox and routing readiness" })).toBeVisible();
    await expect(page.getByText(`SYNTHETIC ${role === "admin" ? "AGENT" : role.toUpperCase()} DO NOT CONTACT`, { exact: true }).first()).toBeVisible();
    if (role !== "admin") await expect(page.getByText("SYNTHETIC OTHER DO NOT CONTACT", { exact: true })).toHaveCount(0);
    await page.goto(`/admin/leads/${f.leads[role === "admin" ? "agent" : role]}`);
    await expect(page.getByText(`private-${role === "admin" ? "agent" : role}@example.test`, { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: `output/playwright/real-session-${role}-390.png`, fullPage: true });
    if (role !== "admin") {
      await page.goto(`/admin/leads/${f.leads.other}`);
      await expect(page).toHaveURL(/lead-center-login\?error=forbidden/);
      expect(await page.content()).not.toContain("private-other@example.test");
    }
    await page.close();
  }
  const analyst = await contexts.analyst.newPage();
  await analyst.goto("/admin/reporting");
  await expect(analyst.getByRole("heading", { name: /Analytics and reporting/i })).toBeVisible();
  await analyst.goto(`/admin/leads/${f.leads.agent}`);
  await expect(analyst).toHaveURL(/lead-center-login\?error=forbidden/);
  const offer = offerFor("offer");
  expect((await appRequest("analyst",`/api/admin/allocation/offers/${offer.id}`)).status()).toBe(403);
  expect((await appRequest("other",`/api/admin/allocation/offers/${offer.id}`)).status()).toBe(404);
  for (const role of ["agent", "analyst"]) {
    const response = await appRequest(role,`/api/admin/leads/${f.leads.other}`,"PATCH",{status:"contacted"});
    expect([401,403,503]).toContain(response.status());
  }
  expect((await sql("SELECT status FROM leads WHERE id=$1", [f.leads.other]))[0].status).toBe("new");
  await analyst.close();
});

test("Preclaim disclosure, stale version, browser claim, exact replay and pass use canonical SQL", async () => {
  const offer = offerFor("offer");
  const view = await appRequest("agent",`/api/admin/allocation/offers/${offer.id}`);
  expect(view.status()).toBe(200);
  expect(await view.text()).not.toContain("private-offer@example.test");
  const page = await contexts.agent.newPage();
  await page.goto(`/admin/allocation/offers/${offer.id}`);
  expect(await page.content()).not.toContain("private-offer@example.test");
  await expect(page.getByRole("button", { name: "Claim offer" })).toBeEnabled();
  await page.getByRole("button", { name: "Claim offer" }).focus();
  await expect(page.getByRole("button", { name: "Claim offer" })).toBeFocused();
  const stale = await appRequest("agent",`/api/admin/allocation/offers/${offer.id}`,"POST",{action:"claim",version:offer.version+1,receipt:randomUUID()});
  expect(await stale.json()).toMatchObject({ok:false,error:"offer_stale_or_expired"});
  expect(stale.status()).toBe(409);
  await page.getByRole("button", { name: "Claim offer" }).click();
  await expect(page.getByRole("status")).toContainText("Saved: accepted");
  expect((await sql("SELECT assigned_agent_id FROM leads WHERE id=$1", [f.leads.offer]))[0].assigned_agent_id).toBe(f.agents.agent);
  expect((await sql("SELECT count(*)::int AS n FROM agent_assignments WHERE lead_id=$1", [f.leads.offer]))[0].n).toBe(1);
  expect(await sql("SELECT channel,count(*)::int AS n FROM lead_notifications WHERE lead_id=$1 AND notification_type='allocation_confirmation' GROUP BY channel ORDER BY channel", [f.leads.offer])).toEqual([{channel:"email",n:1},{channel:"sms",n:1}]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "SYNTHETIC OFFER DO NOT CONTACT", exact: true })).toBeVisible();
  const assigned = await appRequest("agent",`/api/admin/allocation/offers/${offer.id}`);
  expect(await assigned.text()).toContain("private-offer@example.test");
  const pass = offerFor("pass");
  const receipt = randomUUID();
  const data = { action: "pass", version: pass.version, receipt };
  const first = await appRequest("agent",`/api/admin/allocation/offers/${pass.id}`,"POST",data);
  expect((await first.json()).ok).toBe(true);
  const replay = await appRequest("agent",`/api/admin/allocation/offers/${pass.id}`,"POST",data);
  expect(await replay.json()).toMatchObject({ ok: true, replayed: true });
  expect((await sql("SELECT state FROM lead_allocation_offers WHERE id=$1", [pass.id]))[0].state).toBe("passed");
  await page.close();
});

test("Full signed HTTP inbound and web contend for exactly one SQL winner with no-send confirmation", async () => {
  const offer = offerFor("sms", "other");
  const [sms, web] = await Promise.all([
    inbound(`CLAIM ${commandCode("sms", "agent")}`),
    appRequest("other",`/api/admin/allocation/offers/${offer.id}`,"POST",{action:"claim",version:offer.version,receipt:randomUUID()}),
  ]);
  const webData = await web.json();
  expect([sms.data, webData].filter(r => r.ok)).toHaveLength(1);
  const replay = await inbound(`CLAIM ${commandCode("sms", "agent")}`, "agent", {}, sms.sid);
  expect(replay.data.ok).toBe(sms.data.ok);
  const conflict = await inbound(`PASS ${commandCode("sms", "agent")}`, "agent", {}, sms.sid);
  expect(conflict.data.ok).toBe(false);
  expect((await sql("SELECT count(*)::int AS n FROM agent_assignments WHERE lead_id=$1", [f.leads.sms]))[0].n).toBe(1);
  expect(await sql("SELECT channel,count(*)::int AS n FROM lead_notifications WHERE lead_id=$1 AND notification_type='allocation_confirmation' GROUP BY channel ORDER BY channel", [f.leads.sms])).toEqual([{channel:"email",n:1},{channel:"sms",n:1}]);
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  expect((await sql("SELECT count(*)::int AS n FROM lead_allocation_send_reservations"))[0].n).toBe(0);
});

test("Signed account/destination, phone binding, invalid signature and STOP precedence fail safely", async () => {
  expect((await inbound("HELP", "agent", { AccountSid: `AC${"b".repeat(32)}` })).response.status()).toBe(401);
  expect((await inbound("HELP", "agent", { To: "+12025550109" })).response.status()).toBe(401);
  const invalid = await contexts.admin.request.post("/api/webhooks/sms/inbound", { form: { Body: "STOP" }, headers: { "x-twilio-signature": "invalid" } });
  expect(invalid.status()).toBe(401);
  const before = (await sql("SELECT count(*)::int AS n FROM agent_assignments"))[0].n;
  const wrongBinding = await inbound(`CLAIM ${commandCode("pass", "agent")}`, "other");
  expect(wrongBinding.data.ok).toBe(false);
  expect((await sql("SELECT count(*)::int AS n FROM agent_assignments"))[0].n).toBe(before);
  const challenge=await appRequest("agent","/api/admin/allocation/enrollment","POST",{action:"challenge"});
  const challengeData=await challenge.json();
  expect(challengeData).toMatchObject({ok:true,sendsMessage:false});
  expect((await inbound(challengeData.command)).data).toMatchObject({ok:true,verified:true,replyQueued:false});
  expect((await inbound("RESUME")).data).toMatchObject({ok:true,action:"resume"});
  expect((await inbound(`STATUS ${commandCode("offer","agent")}`)).data).toMatchObject({ok:true,state:"accepted",replyQueued:false});
  expect((await inbound("PAUSE")).data).toMatchObject({ok:true,action:"pause"});
  expect((await inbound("RESUME")).data).toMatchObject({ok:true,action:"resume"});
  expect((await sql("SELECT consent_version FROM agent_operational_enrollment WHERE agent_id=$1",[f.agents.agent]))[0].consent_version).toBe("staff_operational_sms_v1");
  await sql("UPDATE agent_operational_enrollment SET possession_verified_at=NULL,paused=true WHERE agent_id=$1", [f.agents.agent]);
  let throttled=false;
  for (let i=0;i<11;i++) throttled ||= (await inbound("HELP")).data.error === "staff_command_rate_limit";
  expect(throttled).toBe(true);
  const stop = await inbound("STOP");
  expect(stop.response.status()).toBe(200);
  expect((await sql("SELECT paused,revoked_at IS NOT NULL AS revoked FROM agent_operational_enrollment WHERE agent_id=$1", [f.agents.agent]))[0]).toEqual({ paused: true, revoked: true });
  const restart=await inbound("START");
  expect(restart.data.staffConsentRestored).not.toBe(true);
  expect((await sql("SELECT revoked_at IS NOT NULL AS revoked FROM agent_operational_enrollment WHERE agent_id=$1",[f.agents.agent]))[0].revoked).toBe(true);
  expect((await sql("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
});

test("Today real task completion/stale form, paginated timeline and 200% text remain scoped", async () => {
  const page = await contexts.agent.newPage();
  await page.goto(`/admin/leads/${f.leads.agent}`);
  await expect(page.getByRole("link", { name: "Older activity" })).toBeVisible();
  await page.getByRole("link", { name: "Older activity" }).click();
  await expect(page).toHaveURL(/timeline_offset=30/);
  await expect(page.getByRole("link", { name: "Newer activity" })).toBeVisible();
  await page.goto("/admin/today");
  await expect(page.getByRole("heading", { name: /What needs attention today/ })).toBeVisible();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Complete task", exact: true }) }).filter({ has: page.locator(`input[name="lead_id"][value="${f.leads.agent}"]`) }).first();
  await expect(form).toBeVisible();
  await form.locator('input[name="record_version"]').evaluate(el => { (el as HTMLInputElement).value="stale-synthetic-version"; });
  await form.getByRole("button").click();
  await expect(page).toHaveURL(/today_action=stale_action/);
  expect((await sql("SELECT status FROM tasks WHERE lead_id=$1 AND category='followup:manual_callback'", [f.leads.agent]))[0].status).toBe("open");
  await page.getByRole("button", { name: "Complete task", exact: true }).first().click();
  await expect(page).toHaveURL(/today_action=completed/);
  expect((await sql("SELECT status FROM tasks WHERE lead_id=$1 AND category='followup:manual_callback'", [f.leads.agent]))[0].status).toBe("done");
  const snooze = page.locator("form").filter({has:page.getByRole("button",{name:"Snooze 24 hours",exact:true})}).first();
  await expect(snooze).toBeVisible();
  const reviewedLead = await snooze.locator('input[name="lead_id"]').inputValue();
  await snooze.getByRole("button").click();
  await expect(page).toHaveURL(/today_action=snoozed/);
  expect((await sql("SELECT count(*)::int AS n FROM lead_action_reviews WHERE lead_id=$1 AND status='snoozed' AND actor_user_id=$2",[reviewedLead,f.ids.agent]))[0].n).toBe(1);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  }
  await page.setViewportSize({ width:1280,height:1000 });
  await page.evaluate(() => { document.documentElement.style.fontSize="200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await page.screenshot({ path:"output/playwright/real-session-today-text-200.png",fullPage:true });
  await page.close();
});

test("Database session revocation blocks subsequent offer/API/page access", async () => {
  const id = offerFor("pass", "other").id;
  expect((await appRequest("other",`/api/admin/allocation/offers/${id}`)).status()).toBe(200);
  await sql('DELETE FROM lead_center_sessions WHERE "userId"=$1', [f.ids.other]);
  expect((await appRequest("other",`/api/admin/allocation/offers/${id}`)).status()).toBe(401);
  const page = await contexts.other.newPage();
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/lead-center-login\?error=session/);
  await page.close();
});

test("Real administrator session renders six cross-channel subtypes at four widths without sending",async()=>{
  const page=await contexts.admin.newPage();
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/admin/message-previews");
  const studio=page.getByRole("region",{name:"Reference-driven cross-channel studio"});
  await expect(studio).toBeVisible();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    await studio.getByLabel("Channel",{exact:true}).selectOption("web");
    for(const subtype of ["buyer","seller","cash_seller","investor_buyer","copilot","routing"]){
      await studio.getByLabel("Module / subtype",{exact:true}).selectOption(subtype);
      const card=studio.locator(`[data-reference-lead-card="${subtype}"]`);
      await expect(card).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
      if(width===390||width===1440)await card.screenshot({path:`output/playwright/real-session-reference-${subtype}-${width}.png`});
    }
    await studio.getByLabel("Channel",{exact:true}).selectOption("email");
    const mail=page.frameLocator('iframe[title="Reference allocation email"]');
    await mail.locator("img").evaluateAll(images=>images.forEach(img=>{(img as HTMLElement).style.display="none";}));
    await expect(mail.getByRole("link",{name:"Review Claim / Pass"})).toBeVisible();
    expect(await mail.locator("body").evaluate(body=>body.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await studio.getByLabel("Channel",{exact:true}).selectOption("sms");
    await expect(studio.locator("pre")).toContainText("CLAIM K7M2Q8HJ");
    await studio.getByLabel("Offer state",{exact:true}).selectOption("expired");
    await expect(studio.locator("pre")).not.toContainText("CLAIM K7M2Q8HJ");
    await studio.getByLabel("Channel",{exact:true}).selectOption("mms");
    await expect.poll(()=>studio.getByRole("img").evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(720);
    await expect(studio.locator("pre")).toContainText("STOP");
    await studio.getByLabel("Offer state",{exact:true}).selectOption("offered");
  }
  await studio.getByLabel("Channel",{exact:true}).selectOption("web");
  await studio.getByLabel("Module / subtype",{exact:true}).focus();
  await expect(studio.getByLabel("Module / subtype",{exact:true})).toBeFocused();
  await page.setViewportSize({width:1280,height:1000});
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:"output/playwright/real-session-studio-text-200.png",fullPage:true});
  await page.close();
});

test("Bounded real-session reporting/queue load records predeclared latency and SQL-plan evidence",async()=>{
  // Modest launch cohort, not a production capacity/SLA claim. Fixed budgets
  // before measurement; no live credentials, sends, or unbounded workload.
  const dataset=300, concurrency=3, samples=12, budgetP95Ms=2000;
  await sql(`WITH sessions_created AS (INSERT INTO sessions(id) SELECT gen_random_uuid() FROM generate_series(1,$1::int) RETURNING id),
    seeded AS (INSERT INTO leads(session_id,first_name,last_name,email,lead_type,primary_intent,city,state,source,is_test,communication_suppressed,assigned_agent_id,assigned_at)
      SELECT id,'SYNTHETIC','LOAD DO NOT CONTACT','load@example.test','buyer','buy','Wilson','NC','isolated_load',row_number() OVER () % 4 = 0,row_number() OVER () % 4 = 0,$2::uuid,now() FROM sessions_created RETURNING id)
    INSERT INTO audit_logs(actor,action,resource_type,resource_id,metadata,after_state) SELECT 'isolated-fixture','lead.lifecycle_changed','lead',id,'{"fixture":true}','{"status":"new","reason":"isolated_fixture"}' FROM seeded CROSS JOIN generate_series(1,5)`,[dataset,f.agents.agent]);
  await sql("ANALYZE leads; ANALYZE audit_logs;");
  const routes:[string,string][]=[["admin","/admin/today"],["agent","/admin/leads"],["agent",`/admin/leads/${f.leads.agent}?timeline_offset=30`],["admin","/admin/allocation"],["analyst","/admin/reporting"]];
  const metrics=[];
  for(const [role,url] of routes){
    const measure=()=>apiPages[role].evaluate(async url=>{
      const started=performance.now();const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});const body=await response.text();
      return {ms:performance.now()-started,status:response.status,bytes:body.length,error:body.includes("query_failed")||body.includes("could not be read")};
    },url);
    await measure();const rows=[];
    for(let i=0;i<samples;i+=concurrency)rows.push(...await Promise.all(Array.from({length:concurrency},measure)));
    const latency=rows.map(row=>row.ms).sort((a,b)=>a-b);
    const errors=rows.filter(row=>row.status!==200||row.error).length;
    const metric={role,route:url.replace(f.leads.agent,"[fixture]"),samples,concurrency,p50Ms:Math.round(latency[Math.ceil(samples*.5)-1]),p95Ms:Math.round(latency[Math.ceil(samples*.95)-1]),errors};
    metrics.push(metric);expect(errors).toBe(0);expect(metric.p95Ms).toBeLessThan(budgetP95Ms);
  }
  const plans=await sql("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM leads WHERE assigned_agent_id=$1::uuid ORDER BY created_at DESC LIMIT 50",[f.agents.agent]);
  writeFileSync(".amm-run/reference-session-acceptance/performance.json",JSON.stringify({at:new Date().toISOString(),dataset:{additionalLeads:dataset,auditRows:dataset*5},budgetP95Ms,metrics,plans,scope:"isolated PG17/loopback; not hosted latency or carrier SLA"},null,2),{mode:0o600});
});
