import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.skip(process.env.AMM_COMMAND_DESK_ACCEPTANCE !== "1" || process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1", "Explicit owned local synthetic command desk venue only");
test.describe.configure({ mode: "serial" });
let pool:Pool, f:{ids:Record<string,string>;agents:Record<string,string>;leads:Record<string,string>};
const contexts:Record<string,BrowserContext>={}, output=process.env.AMM_E2E_OUTPUT_DIR!;
const inherited=randomUUID(), timings:Array<{width:number;navigationToReadyMs:number}>=[];
async function ready(page:Page) { await expect(page.getByRole("heading",{name:"Your next step.",exact:true})).toBeVisible(); }
async function safety() {
  const row=(await pool.query("SELECT (SELECT count(*)::int FROM lead_allocation_offers) offers,(SELECT count(*)::int FROM agent_operational_enrollment) enrollments,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) sent,(SELECT active FROM lead_allocation_policy WHERE id='staff_v1') active")).rows[0];
  expect(row).toEqual({offers:0,enrollments:0,sent:0,active:false});
}
test.beforeAll(async({browser})=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(url.hostname!=="localhost"||url.pathname!=="/amm_qa_upgrade"||process.env.VERCEL_ENV!=="development"||process.env.PREVIEW_URL||process.env.LEAD_ALLOCATION_ENABLED!=="false"||process.env.REQUEST_RESPONSE_WORKER_ENABLED!=="false")throw new Error("owned_no_send_local_venue_required");
  pool=new Pool({connectionString:url.href,max:1});
  f=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));mkdirSync(output,{recursive:true});
  await pool.query("INSERT INTO sessions(id) VALUES($1)",[inherited]);
  await pool.query("INSERT INTO leads(id,session_id,status,duplicate_of_lead_id,primary_intent,email,is_test,communication_suppressed) VALUES($1,$1,'new',$2,'buy','inherited@example.test',false,false)",[inherited,f.leads.agent]);
  for(const role of ["agent","admin","analyst"]){
    const context=await browser.newContext({baseURL:process.env.BETTER_AUTH_URL,viewport:{width:390,height:1000},reducedMotion:"reduce"});
    await context.route("**/*",route=>new URL(route.request().url()).origin===process.env.BETTER_AUTH_URL?route.continue():route.abort("blockedbyclient"));
    contexts[role]=context;
    const page=await context.newPage();await page.goto("/lead-center-login?returnTo=%2Fadmin%2Ftoday");
    await page.getByLabel("Work email").fill(`${role}@example.test`);await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
    await page.getByRole("button",{name:"Open Lead Center",exact:true}).click();
    await expect(page).toHaveURL(role==="analyst"?/error=forbidden/:/\/admin\/today$/);await page.close();
  }
  await safety();
});
test.afterEach(async()=>{for(const c of Object.values(contexts))for(const p of c.pages())await p.close();});
test.afterAll(async()=>{if(pool){await safety();writeFileSync(path.join(output,"local-navigation-timings.json"),JSON.stringify({at:new Date().toISOString(),environment:"built local Chromium; fresh synthetic PostgreSQL17; not a Production benchmark",timings},null,2),{mode:0o600});}for(const c of Object.values(contexts))await c.close();await pool?.end();});

for(const width of [320,390,430,1440])test(`command desk real auth, keyboard and enlarged text ${width}`,async()=>{
  const page=await contexts.agent.newPage();await page.setViewportSize({width,height:1000});const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const start=performance.now();await page.goto("/admin/today");await ready(page);timings.push({width,navigationToReadyMs:Math.round(performance.now()-start)});
  const card=page.locator("article").first();await expect(card).toContainText("Existing task overdue");await expect(card).toContainText("SYNTHETIC AGENT");
  const open=card.getByRole("link",{name:"Open request",exact:true});await open.focus();await expect(open).toBeFocused();expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,`command-desk-${width}.png`),fullPage:true});
  writeFileSync(path.join(output,`command-desk-${width}-geometry.json`),JSON.stringify({at:new Date().toISOString(),width,firstAction:await open.boundingBox(),localSynthetic:true}),{mode:0o600});
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);await expect(open).toBeVisible();
  await page.screenshot({path:path.join(output,`command-desk-${width}-text200.png`),fullPage:true});expect(errors).toEqual([]);
});
test("mobile response keeps past preference, permission retry, focus and factual outcomes separate",async()=>{
  const appointment=randomUUID(), page=await contexts.admin.newPage();
  const before=(await pool.query("SELECT assigned_agent_id,(SELECT count(*)::int FROM lead_response_milestones WHERE lead_id=leads.id) responses,(SELECT count(*)::int FROM lead_notifications WHERE lead_id=leads.id) notifications FROM leads WHERE id=$1",[f.leads.agent])).rows[0];
  expect((await pool.query("SELECT count(*)::int n FROM communication_permissions WHERE lead_id=$1 AND purpose='manual_one_to_one'",[f.leads.agent])).rows[0].n).toBe(0);
  try {
  await pool.query("INSERT INTO communication_permissions(lead_id,channel,purpose,state,source,evidence_at) VALUES($1,'email','manual_one_to_one','allowed','isolated_mobile_fixture',now()),($1,'phone','manual_one_to_one','allowed','isolated_mobile_fixture',now())",[f.leads.agent]);
  await pool.query("INSERT INTO lead_appointments(id,lead_id,assigned_agent_id,status,requested_at,timezone,location_type,request_preferences,created_by) VALUES($1,$2,$3,'requested',now(),'America/New_York','phone',$4::jsonb,$5)",[appointment,f.leads.agent,f.agents.agent,JSON.stringify({version:1,channel:'phone',day:'2024-01-15',window:'afternoon',timezone:'America/New_York'}),f.ids.admin]);
    const measurements=[];
    for(const width of [320,390,430,1440]){
      await page.setViewportSize({width,height:1000});const started=performance.now();
      await page.goto(`/admin/leads/${f.leads.agent}`);
      const overview=page.getByRole('region',{name:'Lead overview',exact:true});
      await expect(overview.getByRole('heading',{name:'Preferred day has passed',exact:true})).toBeVisible();
      await expect(overview).toContainText('not a missed confirmed appointment');
      await expect(page.getByRole('region',{name:'Initial human review'})).toContainText('Review target unknown');
      await expect(overview.getByRole('button',{name:'Review & call',exact:true})).toBeEnabled();
      measurements.push({width,navigationToReadyMs:Math.round(performance.now()-started)});
      const nav=page.getByRole('navigation',{name:'Command Center navigation',exact:true});
      for(const label of ['Leads','Reports']){
        const link=nav.getByRole('link',{name:label,exact:true});await link.focus();await expect(link).toBeFocused();
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        expect(await link.evaluate(el=>getComputedStyle(el).fontSize)).toBe('12px');
      }
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:path.join(output,`mobile-response-${width}.png`),fullPage:false});
      if(width===390)await overview.screenshot({path:path.join(output,'mobile-response-overview-390.png')});
      const steps=overview.getByRole('navigation',{name:'Lead next steps',exact:true});
      await steps.getByRole('link',{name:'Log result / next task',exact:true}).focus();await page.keyboard.press('Enter');
      const outcome=page.locator('#follow-up > details > summary');await expect(outcome).toBeFocused();
      await expect(page.getByRole('combobox',{name:'Actual result',exact:true})).toBeVisible();
      expect(await page.getByRole('combobox',{name:'Actual result',exact:true}).inputValue()).toBe('attempted');
      await steps.getByRole('link',{name:'Appointments',exact:true}).focus();await page.keyboard.press('Enter');
      await expect(page.locator('#appointment-review > details > summary')).toBeFocused();
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      const actualWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
      if(actualWidth>width+1)console.info('synthetic_mobile_overflow',JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,12).map(el=>({tag:el.tagName,field:el.getAttribute('name'),classes:el.className,width:Math.round(el.getBoundingClientRect().width)})))));
      try { expect(actualWidth).toBeLessThanOrEqual(width+1); }
      finally { await page.screenshot({path:path.join(output,`mobile-response-${width}-text200.png`),fullPage:false}); }
    }
    await page.setViewportSize({width:390,height:1000});
    let first=true;
    await page.route(`**/api/admin/leads/${f.leads.agent}/communication-permissions`,route=>{
      if(first&&route.request().method()==='GET'){first=false;return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});}
      return route.continue();
    });
    await page.goto(`/admin/leads/${f.leads.agent}`);
    const retry=page.getByRole('button',{name:'Retry permission check',exact:true});await expect(retry).toBeVisible();
    const steps=page.getByRole('navigation',{name:'Lead next steps',exact:true});
    await steps.getByRole('link',{name:'Log result / next task',exact:true}).click();
    await page.getByLabel('Safe interaction note',{exact:true}).fill('SYNTHETIC UNSAVED NOTE — no contact occurred');
    await retry.focus();await page.screenshot({path:path.join(output,'mobile-response-read-error-390.png'),fullPage:false});
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button',{name:'Review & call',exact:true})).toBeEnabled();
    await expect(page.getByLabel('Safe interaction note',{exact:true})).toHaveValue('SYNTHETIC UNSAVED NOTE — no contact occurred');
    const call=page.getByRole('button',{name:'Review & call',exact:true});await call.click();
    await expect(page.getByRole('button',{name:'Open dialer',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(call).toBeFocused();
    await page.screenshot({path:path.join(output,'mobile-response-cancel-focus-390.png'),fullPage:false});
    await pool.query("UPDATE communication_permissions SET state='denied' WHERE lead_id=$1 AND purpose='manual_one_to_one'",[f.leads.agent]);
    await page.reload();
    await expect(page.getByRole('button',{name:'Review & call',exact:true})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Review & email',exact:true})).toBeDisabled();
    await expect(page.getByText('Contact remains restricted.',{exact:false})).toBeVisible();
    await page.screenshot({path:path.join(output,'mobile-response-revoked-390.png'),fullPage:false});
    await pool.query("UPDATE communication_permissions SET state='allowed' WHERE lead_id=$1 AND purpose='manual_one_to_one'",[f.leads.agent]);
    await pool.query("UPDATE leads SET closed_lost_reason='no_follow_up' WHERE id=$1",[f.leads.agent]);
    await page.reload();await expect(page.getByRole('region',{name:'Lead overview'})).toContainText('Contact blocked');
    const noFollowUp=await page.request.get(`/api/admin/leads/${f.leads.agent}/communication-permissions`);
    expect(noFollowUp.status()).toBe(200);expect((await noFollowUp.json()).manualContact.terminal).toBe(true);
    await pool.query('UPDATE leads SET closed_lost_reason=NULL WHERE id=$1',[f.leads.agent]);
    await pool.query("UPDATE leads SET communication_suppressed=true WHERE id=$1",[f.leads.agent]);
    await page.reload();await expect(page.getByRole('region',{name:'Lead overview'})).toContainText('Contact blocked');
    await expect(page.getByRole('button',{name:'Review & call',exact:true})).toHaveCount(0);
    await page.screenshot({path:path.join(output,'mobile-response-held-390.png'),fullPage:false});
    const after=(await pool.query("SELECT assigned_agent_id,(SELECT count(*)::int FROM lead_response_milestones WHERE lead_id=leads.id) responses,(SELECT count(*)::int FROM lead_notifications WHERE lead_id=leads.id) notifications FROM leads WHERE id=$1",[f.leads.agent])).rows[0];
    expect(after).toEqual(before);
    expect((await pool.query('SELECT status,starts_at,confirmed_at FROM lead_appointments WHERE id=$1',[appointment])).rows[0]).toEqual({status:'requested',starts_at:null,confirmed_at:null});
    writeFileSync(path.join(output,'mobile-response-local-timings.json'),JSON.stringify({at:new Date().toISOString(),environment:'built local Chromium, real isolated PostgreSQL17; one navigation per width; not field INP or a Production claim',measurements},null,2),{mode:0o600});
    await safety();
  } finally {
    await pool.query('DELETE FROM lead_appointments WHERE id=$1',[appointment]);
    await pool.query("DELETE FROM communication_permissions WHERE lead_id=$1 AND purpose='manual_one_to_one'",[f.leads.agent]);
    await pool.query('UPDATE leads SET communication_suppressed=false,closed_lost_reason=NULL WHERE id=$1',[f.leads.agent]);
  }
});
test("protected deep link, advisory-only assignment and actual owner survive read",async()=>{
  const page=await contexts.admin.newPage();await page.goto(`/admin/leads/${f.leads.agent}`);
  const brief=page.getByRole("region",{name:"Operator action brief"});
  await expect(brief.locator("details")).not.toHaveAttribute("open","");
  await brief.locator("summary").focus();await page.keyboard.press("Enter");
  await expect(brief.locator("details")).toHaveAttribute("open","");
  await expect(page.getByRole("region",{name:"Operator action brief"})).toContainText("SYNTHETIC AGENT");
  await expect(page.getByRole("region",{name:"Operator action brief"})).toContainText("Not recorded");
  await page.getByText("Assignment readiness · ADVISORY ONLY",{exact:true}).click();
  await expect(page.getByText(/NOT ASSIGNED by this simulation/)).toBeVisible();
  await page.screenshot({path:path.join(output,"protected-detail-390.png"),fullPage:true});
  await page.goto(`/admin/leads/${f.leads.agent}#contact-readiness`);await expect(page.locator("#contact-readiness")).toBeVisible();
  expect((await pool.query("SELECT assigned_agent_id FROM leads WHERE id=$1",[f.leads.agent])).rows[0].assigned_agent_id).toBe(f.agents.agent);await safety();
});
for(const width of [320,390,430,1440])test(`protected supporting inbox remains searchable and readable ${width}`,async()=>{
  const page=await contexts.agent.newPage();await page.setViewportSize({width,height:1000});await page.goto("/admin/leads");
  await expect(page.getByRole("heading",{name:"Protected request inbox",exact:true})).toBeVisible();
  const open=page.getByRole("link",{name:"Review request & next step",exact:true}).first();await open.focus();await expect(open).toBeFocused();expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const geometry=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,overflowing:[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>document.documentElement.clientWidth+1).slice(0,8).map(el=>({tag:el.tagName,class:el.className}))}));
  writeFileSync(path.join(output,`protected-inbox-${width}-geometry.json`),JSON.stringify(geometry),{mode:0o600});expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,`protected-inbox-${width}.png`),fullPage:true});
  await page.getByRole("link",{name:"Spam / Test / Closed",exact:true}).click();await expect(page.getByRole("heading",{name:"No inquiries in this view",exact:true})).toBeVisible();await expect(page.getByRole("navigation",{name:"Lead status filters"})).toBeVisible();
});
test("inherited reader and wrong-role/wrong-owner boundaries remain server enforced",async()=>{
  const page=await contexts.agent.newPage();await page.goto("/admin/today?view=held");const card=page.locator("article").filter({hasText:"Inherited owner"}).first();
  await expect(card).toBeVisible();await expect(card.getByRole("button")).toHaveCount(0);await card.getByRole("link",{name:"Open request",exact:true}).click();
  await expect(page.getByRole("region",{name:"Operator action brief"})).toContainText("Read-only");
  await page.goto(`/admin/leads/${f.leads.other}`);await expect(page).toHaveURL(/error=forbidden/);expect(await page.content()).not.toContain("private-other@example.test");
  const analyst=await contexts.analyst.newPage();await analyst.goto("/admin/today");await expect(analyst).toHaveURL(/error=forbidden/);
});
test("streamed loading has no premature counts or action while the authorized read waits",async()=>{
  const page=await contexts.agent.newPage();await pool.query("BEGIN");await pool.query("LOCK TABLE public.lead_action_reviews IN ACCESS EXCLUSIVE MODE");
  try{await page.goto("/admin/today",{waitUntil:"commit"});await expect(page.getByRole("main",{name:"Loading protected command desk"})).toBeVisible();await expect(page.getByText("Counts and actions appear only after the protected read completes.",{exact:true})).toBeVisible();await page.screenshot({path:path.join(output,"command-desk-loading-390.png"),fullPage:true});}
  finally{await pool.query("ROLLBACK");}
  await ready(page);await expect(page.locator("article").first()).toBeVisible();
});
test("required SQL failure is unavailable, then genuine empty scope stays honest",async()=>{
  const page=await contexts.agent.newPage();await pool.query("ALTER TABLE public.lead_action_reviews RENAME TO command_desk_hidden_reviews");
  try{await page.goto("/admin/today");await expect(page.getByRole("heading",{name:"Queue unavailable",exact:true})).toBeVisible();await expect(page.getByText(/No measured counts are available/)).toBeVisible();await expect(page.locator("article")).toHaveCount(0);await page.screenshot({path:path.join(output,"command-desk-unavailable-390.png"),fullPage:true});}
  finally{await pool.query("ALTER TABLE public.command_desk_hidden_reviews RENAME TO lead_action_reviews");}
  await pool.query("ALTER TABLE public.leads RENAME TO command_desk_hidden_leads");
  try{await page.goto("/admin/leads");await expect(page.getByRole("heading",{name:"Inbox unavailable",exact:true})).toBeVisible();await expect(page.getByText("Counts unavailable — protected read incomplete",{exact:true})).toBeVisible();await expect(page.getByText(/0 authorized leads/)).toHaveCount(0);await page.screenshot({path:path.join(output,"protected-inbox-unavailable-390.png"),fullPage:true});}
  finally{await pool.query("ALTER TABLE public.command_desk_hidden_leads RENAME TO leads");}
  await pool.query("UPDATE leads SET assigned_agent_id=NULL WHERE id=$1",[f.leads.agent]);
  try{await page.goto("/admin/today");await expect(page.getByRole("heading",{name:"No open actions returned",exact:true})).toBeVisible();await expect(page.getByText(/No customer task has been invented/)).toBeVisible();await page.screenshot({path:path.join(output,"command-desk-empty-390.png"),fullPage:true});}
  finally{await pool.query("UPDATE leads SET assigned_agent_id=$1 WHERE id=$2",[f.agents.agent,f.leads.agent]);}
});
test("fresh task reads honor changed assignment, permission, suppression, terminal and missing/completed records",async()=>{
  const task=(await pool.query("SELECT id FROM tasks WHERE lead_id=$1 AND title LIKE 'SYNTHETIC follow-up%'",[f.leads.agent])).rows[0].id;
  const page=await contexts.agent.newPage();
  const cases=[
    ["UPDATE leads SET assigned_agent_id=$2 WHERE id=$1",[f.leads.agent,f.agents.other],"UPDATE leads SET assigned_agent_id=$2 WHERE id=$1",[f.leads.agent,f.agents.agent]],
    ["UPDATE communication_permissions SET state='denied' WHERE lead_id=$1",[f.leads.agent],"UPDATE communication_permissions SET state='allowed' WHERE lead_id=$1",[f.leads.agent]],
    ["UPDATE leads SET communication_suppressed=true WHERE id=$1",[f.leads.agent],"UPDATE leads SET communication_suppressed=false WHERE id=$1",[f.leads.agent]],
    ["UPDATE leads SET conversion_stage='disqualified' WHERE id=$1",[f.leads.agent],"UPDATE leads SET conversion_stage=NULL WHERE id=$1",[f.leads.agent]],
    ["UPDATE leads SET closed_lost_reason='no_follow_up' WHERE id=$1",[f.leads.agent],"UPDATE leads SET closed_lost_reason=NULL WHERE id=$1",[f.leads.agent]],
    ["UPDATE tasks SET status='done' WHERE id=$1",[task],"UPDATE tasks SET status='open' WHERE id=$1",[task]],
    ["UPDATE tasks SET status='cancelled' WHERE id=$1",[task],"UPDATE tasks SET status='open' WHERE id=$1",[task]],
  ] as const;
  for(const [change,args,restore,values] of cases){
    await pool.query(change,[...args]);
    try{
      const before=(await pool.query("SELECT (SELECT count(*)::int FROM audit_logs) audit,(SELECT count(*)::int FROM lead_notifications) notifications")).rows[0];
      await page.goto(`/admin/today?review_task=${task}`);
      const review=page.getByRole("region",{name:"Fresh task review",exact:true});await expect(review).toBeVisible();
      await expect(review.getByRole("button",{name:"Complete task",exact:true})).toHaveCount(0);
      expect((await pool.query("SELECT (SELECT count(*)::int FROM audit_logs) audit,(SELECT count(*)::int FROM lead_notifications) notifications")).rows[0]).toEqual(before);
    }finally{await pool.query(restore,[...values]);}
  }
  await page.goto(`/admin/today?review_task=${randomUUID()}`);await expect(page.getByRole("region",{name:"Fresh task review"})).toContainText("Task unavailable in your current authorized queue");await safety();
});
test("one existing internal task completes without creating response, ownership or delivery",async()=>{
  let page=await contexts.agent.newPage();await page.goto("/admin/today");const card=page.locator("article").filter({hasText:"Existing task overdue"}).first();
  const form=card.getByRole("form",{name:"Complete task",exact:true});
  const completedActionId=await form.locator('input[name="action_id"]').inputValue();
  await form.locator('input[name="record_version"]').evaluate(el=>{(el as HTMLInputElement).value="stale-synthetic-version";});
  await form.getByRole("button",{name:"Complete task",exact:true}).click();await expect(form.getByRole("alert")).toContainText("This task changed");await expect(form.getByRole("button",{name:"Complete task",exact:true})).toBeDisabled();
  expect((await pool.query("SELECT status FROM tasks WHERE lead_id=$1 AND title LIKE 'SYNTHETIC follow-up%'",[f.leads.agent])).rows[0].status).toBe("open");
  const original=page;const next=contexts.agent.waitForEvent("page");await form.getByRole("link",{name:"Review latest task (opens in new tab)",exact:true}).click();page=await next;
  const fresh=page.getByRole("region",{name:"Fresh task review",exact:true}).getByRole("form",{name:"Complete task",exact:true}).filter({has:page.locator(`input[name="action_id"][value="${completedActionId}"]`)});
  await expect(fresh.getByRole("button",{name:"Complete task",exact:true})).toBeEnabled();await expect(form.getByRole("button",{name:"Complete task",exact:true})).toBeDisabled();
  await expect(fresh.locator('input[name="record_version"]')).toHaveValue((await pool.query("SELECT updated_at::text FROM tasks WHERE lead_id=$1 AND title LIKE 'SYNTHETIC follow-up%'",[f.leads.agent])).rows[0].updated_at);
  await fresh.getByRole("button",{name:"Complete task",exact:true}).click();await original.close();
  await expect.poll(async()=>(await pool.query("SELECT status FROM tasks WHERE lead_id=$1 AND title LIKE 'SYNTHETIC follow-up%'",[f.leads.agent])).rows[0].status).toBe("done");
  const row=(await pool.query("SELECT assigned_agent_id,(SELECT count(*)::int FROM lead_response_milestones WHERE lead_id=leads.id) responses FROM leads WHERE id=$1",[f.leads.agent])).rows[0];
  expect(row.assigned_agent_id).toBe(f.agents.agent);expect(row.responses).toBe(0);await safety();
  await expect(page).toHaveURL(/\/admin\/today\?today_action=completed$/);
  // A button named Saved is not proof that the following RSC read completed.
  // Wait for the old logical action itself to leave the rendered queue.
  await expect(page.locator(`input[name="action_id"][value="${completedActionId}"]`)).toHaveCount(0);
  await page.locator("summary").filter({hasText:/^More internal actions$/}).first().click();
  const snooze=page.getByRole("form",{name:"Snooze 24 hours",exact:true}).first();await expect(snooze).toBeVisible();
  const version=(await pool.query("SELECT updated_at::text FROM leads WHERE id=$1",[f.leads.agent])).rows[0].updated_at;
  await expect(snooze.locator('input[name="record_version"]')).toHaveValue(version);expect(await snooze.locator('input[name="action_id"]').inputValue()).not.toContain(":task:");
  await snooze.getByRole("button",{name:"Snooze 24 hours",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/today\?today_action=snoozed$/);
  await expect.poll(async()=>(await pool.query("SELECT count(*)::int n FROM lead_action_reviews WHERE lead_id=$1 AND actor_user_id=$2 AND status='snoozed'",[f.leads.agent,f.ids.agent])).rows[0].n).toBe(1);await safety();
});
test("expired real session returns to sign-in with the protected destination",async()=>{
  await pool.query('UPDATE lead_center_sessions SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1',[f.ids.agent]);
  const page=await contexts.agent.newPage();await page.goto(`/admin/leads/${f.leads.agent}`);await expect(page).toHaveURL(/lead-center-login.*returnTo=/);
  expect(decodeURIComponent(page.url())).toContain(`/admin/leads/${f.leads.agent}`);expect(await page.content()).not.toContain("private-agent@example.test");
  const task=(await pool.query("SELECT id FROM tasks WHERE lead_id=$1 AND title LIKE 'SYNTHETIC follow-up%'",[f.leads.agent])).rows[0].id;
  await page.goto(`/admin/today?review_task=${task}`);await expect(page).toHaveURL(/lead-center-login.*returnTo=/);
  expect(decodeURIComponent(page.url())).toContain(`/admin/today?review_task=${task}`);expect(await page.content()).not.toContain("private-agent@example.test");
});
