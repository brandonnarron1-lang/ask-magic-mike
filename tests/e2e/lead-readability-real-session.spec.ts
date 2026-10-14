import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type BrowserContext } from "@playwright/test";
import { renderLeadAlertForTemplateVersion } from "../../app/lib/leadAlertTemplates";
import type { LeadAlertRenderInput } from "../../app/lib/leadAlertTemplates";

// Render current compiled source from explicit synthetic data. A clean hosted
// checkout must not depend on an ignored artifact from an operator's machine.
const emailFixture: LeadAlertRenderInput = {
  leadId: "00000000-0000-4000-8000-000000000101",
  sessionId: "00000000-0000-4000-8000-000000000102",
  correlationId: "00000000-0000-4000-8000-000000000103",
  payload: {
    funnel_type: "renter", lead_type: "renter", lead_source_surface: "renter_page",
    name: "INTERNAL QA — DO NOT CONTACT", city: "Wilson", timeline: "Just planning",
    question: "Synthetic review only. No consumer exists.", is_test: true,
    consent_email: false, consent_call: false, consent_sms: false,
    consent_language_version: "isolated_fixture_v1",
    attribution: { source: "ourtownproperties", medium: "owned_media", campaign: "isolated_fixture" },
    status: "new", assigned_agent_id: null,
  },
  score: { score: 23, grade: "new", version: "deterministic_v1", factors: [], explanation: "Synthetic score only" },
  routing: { owner: "mike", sourceLabel: "ourtownproperties", intentLabel: "Rental-to-homeownership", routingReason: "Synthetic review only" },
  submittedAt: "2026-10-09T12:49:38.090Z",
};

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_LEAD_READABILITY_ACCEPTANCE !== "1", "Disposable local real-session venue only");
test.describe.configure({mode:"serial"});
let fixture: {ids:Record<string,string>;leads:Record<string,string>};
let pool:Pool;
let context:BrowserContext;
const query=async(statement:string,values:unknown[]=[]) => (await pool.query(statement,values)).rows;
const output = process.env.AMM_E2E_OUTPUT_DIR || "output/playwright";
function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(value => { const c = Number(value) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
}
test.beforeAll(async({browser})=>{
  const url=new URL(process.env.DATABASE_URL||"");
  if(process.env.VERCEL_ENV!=="development" || process.env.PREVIEW_URL || !["localhost","127.0.0.1"].includes(url.hostname) || url.pathname!=="/amm_qa_upgrade") throw new Error("disposable_local_database_required");
  fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));
  pool=new Pool({connectionString:url.toString(),max:2});
  const app=new URL(test.info().project.use.baseURL||"");
  if(app.protocol!=="http:" || app.hostname!=="localhost" || app.port!==process.env.AMM_E2E_PORT) throw new Error("exact_isolated_app_required");
  context=await browser.newContext({reducedMotion:"reduce",baseURL:app.origin});
  const page=await context.newPage();
  await page.goto("/lead-center-login?returnTo=/admin/leads");
  await page.getByLabel("Work email").fill("agent@example.test"); await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await page.getByRole("button",{name:"Open Lead Center"}).click();
  // The sign-in URL itself ends in returnTo=/admin/leads. A suffix regex
  // falsely passed before the authenticated navigation/session completed.
  await expect(page).toHaveURL(`${app.origin}/admin/leads`);
  await expect(page.getByRole("heading",{level:1})).toHaveText("Lead inbox and routing readiness");
  expect((await query('SELECT count(*)::int AS n FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids.agent]))[0].n).toBeGreaterThan(0);
  await page.close();
  await query("UPDATE leads SET question_raw=$2,source='ourtownproperties',timeline_months=3 WHERE id=$1",[fixture.leads.agent,'Question: SYNTHETIC REQUEST — NOT A CONSUMER\nAttribution: {"source":"ourtownproperties","campaign":"synthetic"}']);
  await query("INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_text,source,evidence_at) VALUES($1,'phone','manual_one_to_one','allowed','SYNTHETIC — NO CONTACT','isolated_fixture',now()),($1,'email','manual_one_to_one','allowed','SYNTHETIC — NO CONTACT','isolated_fixture',now())",[fixture.leads.agent]);
  mkdirSync(output,{recursive:true});
});
test.afterAll(async()=>{await context?.close();await pool?.end();});
test("repeat inquiry shows canonical read owner without inventing assignment or changing buyer interest", async()=>{
  const id=randomUUID(), session=randomUUID();
  await query("INSERT INTO sessions(id) VALUES($1)",[session]);
  await query(`INSERT INTO leads(id,session_id,first_name,last_name,lead_type,primary_intent,is_test,communication_suppressed,
    duplicate_of_lead_id,buyer_interest) VALUES($1,$3,'SYNTHETIC','REPEAT DO NOT CONTACT',
    'buyer','buy',true,true,$2,'{"version":1,"kind":"search","desired_area":"Elm City"}')`,[id,fixture.leads.agent,session]);
  const snapshot=async()=>JSON.stringify((await query(`SELECT (SELECT coalesce(jsonb_agg(a ORDER BY id),'[]') FROM agent_assignments a) assignments,
    (SELECT coalesce(jsonb_agg(n ORDER BY id),'[]') FROM lead_notifications n) notifications,
    (SELECT jsonb_agg(jsonb_build_object('id',id,'assigned',assigned_agent_id,'buyer',buyer_interest) ORDER BY id) FROM leads) leads`))[0]);
  const before=await snapshot(); const page=await context.newPage();
  try {
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000}); await page.goto(`/admin/leads/${id}`);
      await expect(page.getByRole("region",{name:"Lead overview"})).toContainText("SYNTHETIC AGENT · inherited from canonical lead");
      await expect(page.getByRole("region",{name:"Lead overview"})).toContainText("Elm City");
      await expect(page.getByRole("button",{name:"Review & call"})).toBeDisabled();
      await page.locator("summary").filter({hasText:"Lead state"}).click();
      await expect(page.locator("summary").filter({hasText:"Lead state"}).locator("..")).toContainText("Inherited ownership");
      await expect(page.locator("summary").filter({hasText:"Lead state"}).locator("..")).not.toContainText("Unassigned");
      await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      await page.screenshot({path:path.join(output,`inherited-owner-${width}.png`),fullPage:false});
    }
    expect(await snapshot()).toBe(before);
  }finally{await page.close();}
});
for(const width of [320,390,768,1440]) {
  test(`Action-first detail ${width}px, keyboard and enlarged text`,async()=>{
    const page=await context.newPage();const errors:string[]=[];const hydrationContext:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error" && /hydration|server rendered|didn't match/i.test(message.text())) hydrationContext.push(message.text());});
    await page.setViewportSize({width,height:1000}); const started=Date.now(); await page.goto(`/admin/leads/${fixture.leads.agent}`);
    await expect(page.getByRole("heading",{level:1})).toHaveText("SYNTHETIC AGENT DO NOT CONTACT");
    const overview=page.getByRole("region",{name:"Lead overview"});
    const contacts=overview.getByRole("definition");
    await expect(overview.locator('[aria-label="Saved contact details"]')).toContainText("private-agent@example.test");
    await expect(overview.locator('[aria-label="Saved contact details"]')).toContainText("+12025550199");
    const accessMs=Date.now()-started;
    const savedContactTop=(await overview.locator('[aria-label="Saved contact details"]').boundingBox())!.y;
    const contactColors = await overview.evaluate(el => [getComputedStyle(el.querySelector('[aria-label="Saved contact details"] dd')!).color, getComputedStyle(el).backgroundColor]);
    const contactContrast = contrast(contactColors[0],contactColors[1]);
    expect(contactContrast).toBeGreaterThanOrEqual(4.5);
    expect((await overview.locator('[aria-label="Saved contact details"]').boundingBox())!.y).toBeLessThan((await contacts.filter({hasText:"Our Town Properties website"}).boundingBox())!.y);
    expect(await overview.locator('a[href^="tel:"],a[href^="mailto:"],a[href^="sms:"]').count()).toBe(0);
    await expect(overview).toContainText("Our Town Properties website"); await expect(overview).not.toContainText("Attribution:");
    const call=overview.getByRole("button",{name:"Review & call"}); await expect(call).toBeEnabled();
    for (const link of await page.getByRole("navigation", {name:"Command Center navigation"}).getByRole("link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await call.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await call.boundingBox())!.y).toBeLessThan(width===320?1000:844);
    expect(await page.locator("main details[open]").count()).toBe(0);
    await call.focus();await expect(call).toBeFocused();await page.keyboard.press("Enter");
    expect((await page.getByRole("checkbox",{name:/I reviewed the request/}).locator("..").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("button",{name:"Open dialer"})).toBeDisabled(); // Never open or call the fictional number.
    await page.getByRole("button",{name:"Cancel",exact:true}).click();
    await page.screenshot({path:path.join(output,`readable-lead-${width}.png`),fullPage:false});
    await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    // Extra administration stays absent for an assigned-agent session.
    await expect(page.locator("summary").filter({hasText:"More tools"})).toHaveCount(0);
    const historyLink=page.getByRole("navigation",{name:"Lead next steps"}).getByRole("link",{name:"History",exact:true});
    expect((await historyLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await historyLink.focus();
    await page.keyboard.press("Enter");
    const history=page.locator("summary").filter({hasText:"Unified activity history"});
    await expect(history.locator("..")).toHaveAttribute("open","");
    await expect(history).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.keyboard.press("Enter");
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(output,`readable-lead-200-${width}.png`),fullPage:false});
    writeFileSync(path.join(output,`contact-diagnostic-${width}.json`),JSON.stringify({errors,hydrationContext,accessMs,savedContactTop,contactContrast,stepsFromAuthenticatedLink:1,expansionsNeeded:0,scope:"synthetic loopback, not human response or iPhone/Mail latency",at:new Date().toISOString()},null,2),{mode:0o600});
    expect(errors).toEqual([]); await page.close();
  });
}
test("missing and long untrusted saved values remain readable without fabricating actions",async()=>{
  const original=(await query("SELECT phone,email,city FROM leads WHERE id=$1",[fixture.leads.agent]))[0];
  const page=await context.newPage();
  try {
    await query("UPDATE leads SET phone=NULL,email=NULL,city=NULL WHERE id=$1",[fixture.leads.agent]);
    await page.goto(`/admin/leads/${fixture.leads.agent}`);
    const details=page.locator('[aria-label="Saved contact details"]');
    await expect(details.getByText("Not provided",{exact:true})).toHaveCount(2);
    await expect(page.getByRole("button",{name:"Review & call"})).toBeDisabled();
    await expect(page.getByRole("button",{name:"Review & email"})).toBeDisabled();
    const untrusted=`${"long".repeat(100)}<script>synthetic</script>@example.test`;
    await query("UPDATE leads SET email=$2 WHERE id=$1",[fixture.leads.agent,untrusted]);
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});await page.reload();
      await expect(details).toContainText(untrusted);
      expect(await details.locator("script").count()).toBe(0);
      await expect(page.getByRole("button",{name:"Review & email"})).toBeDisabled();
      await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    }
  } finally {await query("UPDATE leads SET phone=$2,email=$3,city=$4 WHERE id=$1",[fixture.leads.agent,original.phone,original.email,original.city]);await page.close();}
});
test("QA is visibly blocked; changed opt-out and role/assignment fail closed without sending",async()=>{
  const page=await context.newPage();
  await page.setViewportSize({width:390,height:1000});
  await query("UPDATE leads SET is_test=true,communication_suppressed=true WHERE id=$1",[fixture.leads.agent]);
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await expect(page.getByRole("heading",{level:1})).toHaveText("Test lead");
  await expect(page.getByText("Contact blocked.",{exact:false})).toBeVisible(); await expect(page.getByRole("button",{name:"Review & call"})).toHaveCount(0);
  await expect(page.locator('[aria-label="Saved contact details"]')).toContainText("private-agent@example.test");
  await expect(page.getByRole("form",{name:"Save interaction and next task"})).toHaveCount(0);
  await page.screenshot({path:path.join(output,"readable-qa-lead-390.png"),fullPage:false});
  await query("UPDATE leads SET is_test=false,communication_suppressed=false WHERE id=$1",[fixture.leads.agent]);
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await page.getByRole("button",{name:"Review & call"}).click();
  await query("UPDATE communication_permissions SET state='opted_out' WHERE lead_id=$1 AND channel='phone' AND purpose='manual_one_to_one'",[fixture.leads.agent]);
  await page.getByRole("checkbox",{name:/I reviewed the request/}).check(); await page.getByRole("button",{name:"Open dialer"}).click();
  await expect(page.getByRole("status").filter({hasText:"Permission changed"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Review & call"})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Review & email"})).toBeEnabled();
  expect(page.url()).toContain(`/admin/leads/${fixture.leads.agent}`);
  // Contact holds must not remove authorized cleanup of existing internal
  // records. This is synthetic setup only, not an actual appointment/contact.
  await query("INSERT INTO lead_appointments(lead_id,assigned_agent_id,created_by,status,timezone,location_type) SELECT id,assigned_agent_id,$2,'requested','America/New_York','office' FROM leads WHERE id=$1",[fixture.leads.agent,fixture.ids.agent]);
  await query("UPDATE leads SET status='converted' WHERE id=$1",[fixture.leads.agent]);
  await page.goto(`/admin/leads/${fixture.leads.agent}`);
  await expect(page.getByRole("button",{name:"Review & call"})).toHaveCount(0);
  await page.locator("summary").filter({hasText:/^Appointment operations$/}).click();
  await expect(page.getByRole("form",{name:"Mark canceled",exact:true})).toBeVisible();
  await expect(page.getByRole("form",{name:"Create appointment record",exact:true})).toHaveCount(0);
  await page.locator("summary").filter({hasText:/^Follow-up tasks$/}).click();
  await expect(page.getByRole("button",{name:"Cancel task",exact:true})).toBeVisible();
  await page.goto(`/admin/leads/${fixture.leads.other}`);await expect(page).toHaveURL(/error=forbidden/);expect(await page.content()).not.toContain("private-other@example.test");
  expect((await query("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  expect((await query("SELECT count(*)::int AS n FROM lead_response_milestones"))[0].n).toBe(0);
  await page.close();
});
test("one click reveals tasks and appointments; a direct history bookmark opens its panel",async()=>{
  // Restore this synthetic lead after the preceding terminal-state regression.
  await query("UPDATE leads SET status='assigned' WHERE id=$1",[fixture.leads.agent]);
  const page=await context.newPage(); await page.setViewportSize({width:390,height:1000});
  await page.goto(`/admin/leads/${fixture.leads.agent}`);
  const nav=page.getByRole("navigation",{name:"Lead next steps"});
  await nav.getByRole("link",{name:"Log result / next task",exact:true}).click();
  await expect(page.getByRole("form",{name:"Save interaction and next task"})).toBeVisible();
  await nav.getByRole("link",{name:"Appointments",exact:true}).click();
  const appointments=page.locator("#appointment-review > details");
  await expect(appointments).toHaveAttribute("open","");
  await expect(appointments.locator("summary")).toBeFocused();
  await page.goto(`/admin/leads/${fixture.leads.agent}#activity`);
  await expect(page.locator("#activity > details")).toHaveAttribute("open","");
  await expect(page.locator("#activity > details > summary")).toBeFocused();
  await page.close();
});
test("optional seller evidence stays closed until requested and QA cannot save it",async()=>{
  await query("UPDATE leads SET lead_type='home_value',is_test=true,communication_suppressed=true WHERE id=$1",[fixture.leads.agent]);
  const page=await context.newPage(); await page.setViewportSize({width:390,height:1000});
  await page.goto(`/admin/leads/${fixture.leads.agent}`);
  const evidence=page.locator("summary").filter({hasText:/^Property evidence \(optional\)$/});
  await expect(evidence).toBeVisible();
  await expect(evidence.locator("..")).not.toHaveAttribute("open","");
  await expect(page.getByLabel("Evidence source URL")).not.toBeVisible();
  await page.goto(`/admin/leads/${fixture.leads.agent}#property-evidence-review`);
  await expect(evidence.locator("..")).toHaveAttribute("open","");
  await expect(page.getByLabel("Evidence source URL")).toBeVisible();
  await expect(page.getByRole("button",{name:"Save review task",exact:true})).toBeDisabled();
  expect((await query("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  await page.screenshot({path:path.join(output,"seller-evidence-on-request-390.png"),fullPage:false});
  await query("UPDATE leads SET lead_type='buyer',is_test=false,communication_suppressed=false WHERE id=$1",[fixture.leads.agent]);
  await page.close();
});
test("a genuine supervisor session sees saved QA values without gaining contact actions",async({browser})=>{
  const ctx=await browser.newContext({baseURL:test.info().project.use.baseURL,viewport:{width:390,height:1000}});
  const page=await ctx.newPage();
  try {
    await query("UPDATE leads SET is_test=true,communication_suppressed=true WHERE id=$1",[fixture.leads.agent]);
    await page.goto(`/lead-center-login?returnTo=/admin/leads/${fixture.leads.agent}`);
    await page.getByLabel("Work email").fill("admin@example.test");
    await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
    await page.getByRole("button",{name:"Open Lead Center"}).click();
    await expect(page.getByRole("heading",{level:1})).toHaveText("Test lead");
    expect((await query('SELECT count(*)::int AS n FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids.admin]))[0].n).toBeGreaterThan(0);
    await expect(page.locator('[aria-label="Saved contact details"]')).toContainText("private-agent@example.test");
    await expect(page.getByRole("button",{name:"Review & call"})).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Review & email"})).toHaveCount(0);
    await expect(page.getByRole("form",{name:"Save interaction and next task"})).toHaveCount(0);
    await page.getByText("More tools",{exact:true}).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link",{name:"Notifications",exact:true})).toBeVisible();
    expect((await page.getByRole("link",{name:"Notifications",exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({path:path.join(output,"readable-supervisor-test-390.png"),fullPage:false});
  } finally { await query("UPDATE leads SET is_test=false,communication_suppressed=false WHERE id=$1",[fixture.leads.agent]);await ctx.close(); }
});
for(const version of ["lead_alert_email_v4", "lead_alert_email_v5"]) for(const width of [320,390,768,1440]) {
  test(`Actual ${version} renderer fits ${width}px with main link early`,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height:1000}}); const page=await ctx.newPage();
    await page.route("**/*",route=>{
      // Approved image bytes from the repository, never a Production fetch.
      const assets: Record<string,string>={"/images/ask-magic-mike/our-town-properties-logo.webp":"public/images/ask-magic-mike/our-town-properties-logo.webp","/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp":"public/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp"};
      const asset=assets[new URL(route.request().url()).pathname];
      return asset?route.fulfill({status:200,contentType:"image/webp",body:readFileSync(asset)}):route.abort();
    }); // No provider, contact or private-data request.
    const rendered=renderLeadAlertForTemplateVersion(emailFixture,version)!;
    await page.setContent(rendered.html);
    const link=page.getByRole("link",{name:"Open saved lead",exact:true}); await expect(link).toBeVisible();
    expect((await link.boundingBox())!.y).toBeLessThan(600);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await expect(page.locator("body")).not.toContainText("First touch:");
    const ctaTop=(await link.boundingBox())!.y;
    const ctaColors=await link.evaluate(el=>[getComputedStyle(el).color,getComputedStyle(el).backgroundColor]);
    const ctaContrast=contrast(ctaColors[0],ctaColors[1]);expect(ctaContrast).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({path:path.join(output,`readable-email-${version}-${width}.png`),fullPage:true});
    if(width===390) {
      writeFileSync(path.join(output,`${version}.html`),rendered.html,{mode:0o600});
      writeFileSync(path.join(output,`${version}.txt`),rendered.text,{mode:0o600});
    }
    await page.evaluate(()=>{const sizes=Array.from(document.body.querySelectorAll<HTMLElement>("h1,p,a,strong")).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));for(const {el,size} of sizes)el.style.fontSize=`${size*2}px`;});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await link.focus();await expect(link).toBeFocused();
    writeFileSync(path.join(output,`email-layout-${version}-${width}.json`),JSON.stringify({ctaTop,ctaContrast,textCtaLine:rendered.text.split("\n").findIndex(line=>line.startsWith("Open saved lead:"))+1,scope:"synthetic Chromium renderer, not Apple Mail",at:new Date().toISOString()},null,2),{mode:0o600});
    await ctx.close();
  });
}

test("fresh ownership, role and expired-session reads remove stale contact details; server denies disclosure", async()=>{
  await query("UPDATE leads SET lead_type='buyer',status='assigned',is_test=false,communication_suppressed=false WHERE id=$1",[fixture.leads.agent]);
  await query("UPDATE communication_permissions SET state='allowed' WHERE lead_id=$1 AND channel='phone' AND purpose='manual_one_to_one'",[fixture.leads.agent]);
  const page=await context.newPage();
  const choose=async()=>{await page.goto(`/admin/leads/${fixture.leads.agent}`);await page.getByRole("button",{name:"Review & call"}).click();await page.getByRole("checkbox",{name:/I reviewed the request/}).check();};
  const denied=async(status:number)=>{
    const response=page.waitForResponse(r=>r.url().endsWith("/communication-permissions") && r.status()===status);
    await page.getByRole("button",{name:"Open dialer"}).click();
    expect((await response).headers()["cache-control"]).toContain("private");
    await expect(page.getByRole("status",{name:"Lead access unavailable"})).toBeVisible();
    await expect(page.locator('[aria-label="Saved contact details"]')).toHaveCount(0);
    await expect(page.getByRole("button",{name:"Open dialer"})).toHaveCount(0);
  };
  const owner=(await query("SELECT assigned_agent_id FROM leads WHERE id=$1",[fixture.leads.agent]))[0].assigned_agent_id;
  await choose();
  try {await query("UPDATE leads SET assigned_agent_id=NULL WHERE id=$1",[fixture.leads.agent]);await denied(404);
    await page.goto(`/admin/leads/${fixture.leads.agent}`);await expect(page).toHaveURL(/error=forbidden/);expect(await page.content()).not.toContain("private-agent@example.test");
  } finally {await query("UPDATE leads SET assigned_agent_id=$2 WHERE id=$1",[fixture.leads.agent,owner]);}
  await choose();
  try {await query("UPDATE lead_center_users SET role='read_only_analyst' WHERE id=$1",[fixture.ids.agent]);await denied(403);
    await page.goto(`/admin/leads/${fixture.leads.agent}`);await expect(page).toHaveURL(/error=forbidden/);expect(await page.content()).not.toContain("private-agent@example.test");
  } finally {await query("UPDATE lead_center_users SET role='approved_agent' WHERE id=$1",[fixture.ids.agent]);}
  await choose();
  await query('UPDATE lead_center_sessions SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1',[fixture.ids.agent]);
  await denied(401);
  await page.goto(`/admin/leads/${fixture.leads.agent}#message-review`);
  // A same-document fragment change is not a fresh server authorization read.
  await page.reload();
  const login=new URL(page.url());expect(login.pathname).toBe("/lead-center-login");expect(login.searchParams.get("returnTo")).toBe(`/admin/leads/${fixture.leads.agent}`);
  expect(await page.content()).not.toContain("private-agent@example.test");
  await page.getByLabel("Work email").fill("agent@example.test");await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);
  await page.getByRole("button",{name:"Open Lead Center"}).click();
  await expect(page).toHaveURL(`${login.origin}/admin/leads/${fixture.leads.agent}#message-review`);
  await expect(page.locator("details#message-review")).toHaveAttribute("open", "");
  await expect(page.locator("details#message-review > summary")).toBeFocused();
  await expect(page.locator('[aria-label="Saved contact details"]')).toContainText("private-agent@example.test");
  await query('DELETE FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids.agent]);
  const revoke=await page.evaluate(async id=>{const response=await fetch(`/api/admin/leads/${id}/communication-permissions`,{cache:"no-store"});return {status:response.status,body:await response.text()};},fixture.leads.agent);
  expect(revoke.status).toBe(401);expect(revoke.body).not.toContain("private-agent@example.test");
  expect((await query("SELECT count(*)::int AS n FROM lead_response_milestones"))[0].n).toBe(0);
  expect((await query("SELECT count(*)::int AS n FROM lead_notifications WHERE provider_message_id IS NOT NULL"))[0].n).toBe(0);
  await page.close();
});
