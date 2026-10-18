import {Pool} from "pg";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {expect,test,type BrowserContext,type Page} from "@playwright/test";

test.skip(process.env.AMM_CONCIERGE_HANDOFF_ACCEPTANCE!=="1"||process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=="1","Owned real isolated PostgreSQL harness required");
test("reviewed question reaches canonical test capture once; answer does not become consent or a property fact",async({page,baseURL})=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(url.hostname!=="localhost"||url.pathname!=="/amm_qa_upgrade"||process.env.VERCEL_ENV!=="development"||process.env.PREVIEW_URL||process.env.OPENAI_API_KEY||process.env.EMAIL_ENABLED!=="false") throw Error("owned_isolated_no_send_venue_required");
  const pool=new Pool({connectionString:url.href,max:1});
  const counts=async()=> (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider_receipts")).rows[0];
  const before=await counts();
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    await page.route("**/*",async route=>new URL(route.request().url()).origin===new URL(baseURL!).origin?route.continue():route.abort("blockedbyclient"));
    await page.goto("/ask");
    await page.getByRole("textbox",{name:/Your real estate question/}).fill("How do I buy a home?");
    await page.getByRole("button",{name:"Send Question",exact:true}).click();
    if(process.env.AMM_E2E_BUILT==="1"){
      await expect(page.getByRole("alert").filter({hasText:"The assistant's answer"})).toContainText("answer did not come through");
      expect(await counts()).toEqual(before);expect(errors).toEqual([]);return;
    }
    await expect(page.getByRole("link",{name:"Our Town: approved service and intake requirements",exact:true})).toBeVisible();
    expect(await counts()).toEqual(before);
    await expect(page.getByLabel("Email",{exact:true})).toHaveValue("");
    await expect(page.getByRole("checkbox",{name:/I agree that Our Town Properties/})).not.toBeChecked();
    const reviewed="INTERNAL QA — DO NOT CONTACT — R2 SYNTHETIC. My corrected buying-plan question; no actual consumer inquiry or appointment.";
    await page.getByRole("textbox",{name:/Question for local follow-up/}).fill(reviewed);
    await page.getByLabel("Your name (optional)",{exact:true}).fill("INTERNAL QA — DO NOT CONTACT — R2 CONCIERGE");
    await page.getByLabel("Email",{exact:true}).fill("r2-concierge@example.test");
    await page.getByRole("checkbox",{name:/I agree that Our Town Properties/}).check();
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/leads"&&r.request().method()==="POST");
    await page.getByRole("button",{name:"Request local follow-up",exact:true}).click();
    expect((await response).status()).toBe(200);
    await expect(page.getByRole("button",{name:"Request a conversation",exact:true})).toBeVisible();
    const records=(await pool.query("SELECT is_test,communication_suppressed,email_suppressed,sms_suppressed,consent_email,consent_call,consent_sms,question_raw FROM leads WHERE email=$1",["r2-concierge@example.test"])).rows;
    expect(records).toHaveLength(1);
    // This actual chat contract retains the explicitly checked email evidence;
    // is_test plus channel suppression independently blocks consumer contact.
    // Do not falsify that evidence to match another funnel's test projection.
    expect(records[0]).toMatchObject({is_test:true,communication_suppressed:true,email_suppressed:true,sms_suppressed:true,consent_email:true,consent_call:false,consent_sms:false});
    expect(JSON.stringify(records[0])).toContain("My corrected buying-plan question");
    expect(JSON.stringify(records[0])).not.toContain("approved service and intake requirements");
    expect(await counts()).toEqual({...before,leads:before.leads+1});
    expect(errors).toEqual([]);
  }finally{await pool.end();}
});

// These are genuine Better Auth browser sessions against a fresh owned local
// PostgreSQL cluster. No route interception, fake cookie or disabled RBAC.
test.describe("staff handoff uses existing review services without contact effects",()=>{
  test.describe.configure({mode:"serial"});
  let pool:Pool;
  let fixture:{ids:Record<string,string>;agents:Record<string,string>;leads:Record<string,string>};
  const contexts:Record<string,BrowserContext>={};
  const pages:Record<string,Page>={};
  const errors:string[]=[];
  const query=async(sql:string,values:unknown[]=[]) => (await pool.query(sql,values)).rows;
  const unchanged=async()=> (await query(`SELECT
    (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM tasks) tasks,
    (SELECT count(*)::int FROM lead_appointments) appointments,(SELECT count(*)::int FROM agent_assignments) assignments,
    (SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM consents) consents`))[0];
  const request=async(role:string,path:string,body:unknown,method="POST")=>pages[role].evaluate(async({path,body,method})=>{
    const response=await fetch(path,{method,credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return {status:response.status,cache:response.headers.get("cache-control"),data:await response.json()};
  },{path,body,method});
  const prepare=(role:string,leadId:string)=>request(role,"/api/admin/copilot",{mode:"reviewed_handoff",artifactType:"lead_summary",leadId});
  async function openTools(page:Page,leadId:string){
    await page.goto(`/admin/leads/${leadId}`);
    const details=page.locator("#next-action-review");
    if(await details.getAttribute("open")===null) await details.locator("summary").click();
    return details;
  }
  test.beforeAll(async({browser})=>{
    const url=new URL(process.env.DATABASE_URL!);
    if(url.hostname!=="localhost"||url.pathname!=="/amm_qa_upgrade"||process.env.VERCEL_ENV!=="development"||process.env.PREVIEW_URL||process.env.OPENAI_API_KEY||process.env.EMAIL_ENABLED!=="false") throw Error("owned_isolated_no_send_venue_required");
    fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));
    pool=new Pool({connectionString:url.href,max:3});
    for(const role of ["admin","agent","other","analyst"]){
      const context=await browser.newContext({reducedMotion:"reduce",viewport:{width:390,height:1000}});
      const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
      const target=role==="analyst"?"/admin/reporting":"/admin/leads";
      await page.goto(`/lead-center-login?returnTo=${encodeURIComponent(target)}`);
      await page.getByLabel("Work email").fill(`${role}@example.test`);
      await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
      await page.getByRole("button",{name:"Open Lead Center"}).click();
      await expect(page).toHaveURL(new RegExp(`${target}$`));
      expect(await query('SELECT count(*)::int n FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids[role]])).toEqual([{n:1}]);
      contexts[role]=context;pages[role]=page;
    }
  });
  test.afterAll(async()=>{for(const c of Object.values(contexts))await c.close();await pool?.end();});

  test("keyboard prepare,edit,approve,reload and exact replay retain one job with immutable review versions",async()=>{
    const page=pages.agent,lead=fixture.leads.agent,before=await unchanged();
    const panel=await openTools(page,lead);
    const button=panel.getByRole("button",{name:"Prepare handoff review",exact:true});
    await expect(button).toBeEnabled();await button.focus();await expect(button).toBeFocused();
    const generated=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/copilot"&&r.request().method()==="POST");
    await page.keyboard.press("Enter");
    const response=await generated;expect(response.status()).toBe(200);expect(response.headers()["cache-control"]).toContain("private, no-store");
    const data=await response.json();expect(data).toMatchObject({ok:true,modelCalls:0,sendsCommunication:false,createsTask:false});
    await expect(panel.getByRole("status")).toContainText("review required");
    const content=panel.getByRole("textbox",{name:"AI-assisted draft content"});
    await expect(content).toHaveValue(/.+/);
    expect(await content.inputValue()).toContain("not scheduled");
    await content.fill((await content.inputValue())+"\nSYNTHETIC operator reviewed the saved inquiry; no contact occurred.");
    const edited=page.waitForResponse(r=>r.url().includes("/api/admin/copilot/drafts/")&&r.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Save edit",exact:true}).click();expect((await edited).status()).toBe(200);
    const approved=page.waitForResponse(r=>r.url().includes("/api/admin/copilot/drafts/")&&r.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Approve draft",exact:true}).click();expect((await approved).status()).toBe(200);
    await expect(panel.getByRole("status")).toContainText("approved");
    const replay=await prepare("agent",lead);expect(replay.status).toBe(200);expect(replay.data).toMatchObject({replayed:true,draft:{version:3,status:"approved"}});
    expect(await query("SELECT status FROM ai_draft_reviews WHERE draft_key=$1 ORDER BY version",[data.draft.draft_key])).toEqual([{status:"generated"},{status:"edited"},{status:"approved"}]);
    expect(await query("SELECT count(*)::int n FROM ai_intelligence_jobs WHERE lead_id=$1",[lead])).toEqual([{n:1}]);
    const reloaded=await openTools(page,lead);await expect(reloaded.getByRole("status")).toContainText("approved");
    expect(await unchanged()).toEqual(before);expect(errors).toEqual([]);
  });
  test("saved review remains usable at four widths and enlarged text",async()=>{
    const page=pages.agent,panel=page.locator("#next-action-review");
    for(const width of[320,390,768,1440]){
      await page.setViewportSize({width,height:1000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
      const box=await panel.getByRole("button",{name:"Prepare handoff review",exact:true}).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({width:390,height:1000});
    await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await expect(panel.getByRole("textbox",{name:"AI-assisted draft content"})).toBeVisible();
    await panel.screenshot({path:join(process.env.AMM_E2E_OUTPUT_DIR!,"staff-handoff-390-text-200.png")});
    await page.evaluate(()=>{document.documentElement.style.fontSize="";});
    expect(errors).toEqual([]);
  });
  test("changed permission evidence expires the old brief;the UI cannot keep offering its approval",async()=>{
    const page=pages.agent,lead=fixture.leads.agent,before=await unchanged();
    await query("UPDATE leads SET city='SYNTHETIC CONTEXT TWO' WHERE id=$1",[lead]);
    const panel=await openTools(page,lead);
    const generated=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/copilot"&&r.request().method()==="POST");
    await panel.getByRole("button",{name:"Prepare handoff review",exact:true}).click();expect((await generated).status()).toBe(200);
    await expect(panel.getByRole("button",{name:"Approve draft",exact:true})).toBeVisible();
    await query("UPDATE communication_permissions SET state='denied',updated_at=now() WHERE lead_id=$1",[lead]);
    const expired=page.waitForResponse(r=>r.url().includes("/api/admin/copilot/drafts/")&&r.request().method()==="PATCH");
    await panel.getByRole("button",{name:"Approve draft",exact:true}).click();expect((await expired).status()).toBe(409);
    await expect(panel.getByRole("alert")).toContainText("draft was expired");
    await expect(panel.getByRole("button",{name:"Approve draft",exact:true})).toHaveCount(0);
    await expect(panel.getByRole("status")).toContainText("expired");expect(await unchanged()).toEqual(before);
  });
  test("wrong role and another agent fail on the server;ownership loss clears stale contact UI",async()=>{
    const before=await unchanged();
    expect((await prepare("analyst",fixture.leads.agent)).status).toBe(403);
    expect((await prepare("other",fixture.leads.agent)).status).toBe(404);
    const page=pages.other,panel=await openTools(page,fixture.leads.other);
    await query("UPDATE leads SET assigned_agent_id=$2 WHERE id=$1",[fixture.leads.other,fixture.agents.agent]);
    const denied=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/copilot"&&r.request().method()==="POST");
    await panel.getByRole("button",{name:"Prepare handoff review",exact:true}).click();expect((await denied).status()).toBe(404);
    await expect(page.getByRole("status",{name:"Lead access unavailable"})).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain("private-other@example.test");
    expect(await unchanged()).toEqual(before);
  });
  test("QA and suppressed records stay blocked even for administrator;no job or notification is added",async()=>{
    const lead=fixture.leads.owner,before=await unchanged();
    const jobs=await query("SELECT count(*)::int n FROM ai_intelligence_jobs");
    await query("UPDATE leads SET is_test=true WHERE id=$1",[lead]);
    expect((await prepare("admin",lead)).status).toBe(409);
    const panel=await openTools(pages.admin,lead);
    await expect(panel.getByRole("button",{name:"Prepare handoff review",exact:true})).toHaveCount(0);
    await query("UPDATE leads SET is_test=false,communication_suppressed=true WHERE id=$1",[lead]);
    expect((await prepare("admin",lead)).status).toBe(409);
    expect(await query("SELECT count(*)::int n FROM ai_intelligence_jobs")).toEqual(jobs);expect(await unchanged()).toEqual(before);
  });
  test("revoked genuine session removes stale contact content and denies further review",async()=>{
    const page=pages.agent,panel=await openTools(page,fixture.leads.agent),before=await unchanged();
    await query('DELETE FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids.agent]);
    const denied=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/copilot"&&r.request().method()==="POST");
    await panel.getByRole("button",{name:"Prepare handoff review",exact:true}).click();expect((await denied).status()).toBe(401);
    await expect(page.getByRole("status",{name:"Lead access unavailable"})).toBeVisible();
    expect(await page.locator("body").innerText()).not.toContain("private-agent@example.test");
    expect(await unchanged()).toEqual(before);expect(errors).toEqual([]);
  });
});
