import { readFileSync, mkdirSync } from "node:fs";
import { Pool } from "pg";
import { expect, test, type BrowserContext } from "@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE !== "1" || process.env.AMM_LEAD_READABILITY_ACCEPTANCE !== "1", "Disposable local real-session venue only");
test.describe.configure({mode:"serial"});
let fixture: {ids:Record<string,string>;leads:Record<string,string>};
let pool:Pool;
let context:BrowserContext;
const query=async(statement:string,values:unknown[]=[]) => (await pool.query(statement,values)).rows;
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
  await query("INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_text,source,evidence_at) VALUES($1,'phone','manual_one_to_one','allowed','SYNTHETIC — NO CONTACT','isolated_fixture',now())",[fixture.leads.agent]);
  mkdirSync("output/playwright",{recursive:true});
});
test.afterAll(async()=>{await context?.close();await pool?.end();});
for(const width of [320,390,768,1440]) {
  test(`Action-first detail ${width}px, keyboard and enlarged text`,async()=>{
    const page=await context.newPage();const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    await page.setViewportSize({width,height:1000}); await page.goto(`/admin/leads/${fixture.leads.agent}`);
    await expect(page.getByRole("heading",{level:1})).toHaveText("SYNTHETIC AGENT DO NOT CONTACT");
    const overview=page.getByRole("region",{name:"Lead overview"});
    await expect(overview).toContainText("Our Town Properties website"); await expect(overview).not.toContainText("Attribution:");
    const call=overview.getByRole("button",{name:"Review & call"}); await expect(call).toBeEnabled();
    expect((await call.boundingBox())!.y).toBeLessThan(width===320?1000:844);
    expect(await page.locator("main details[open]").count()).toBe(0);
    await call.focus();await expect(call).toBeFocused();await page.keyboard.press("Enter");
    await expect(page.getByRole("button",{name:"Open dialer"})).toBeDisabled(); // Never open or call the fictional number.
    await page.getByRole("button",{name:"Cancel",exact:true}).click();
    await page.screenshot({path:`output/playwright/readable-lead-${width}.png`,fullPage:false});
    await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    // Extra administration stays absent for an assigned-agent session.
    await expect(page.locator("summary").filter({hasText:"More tools"})).toHaveCount(0);
    await page.getByRole("navigation",{name:"Lead next steps"}).getByRole("link",{name:"History",exact:true}).focus();
    await page.keyboard.press("Enter");
    const history=page.locator("summary").filter({hasText:"Unified activity history"});
    await history.focus();await page.keyboard.press("Enter");
    await expect(history.locator("..")).toHaveAttribute("open","");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.keyboard.press("Enter");
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`output/playwright/readable-lead-200-${width}.png`,fullPage:false});
    expect(errors).toEqual([]); await page.close();
  });
}
test("QA is visibly blocked; changed opt-out and role/assignment fail closed without sending",async()=>{
  const page=await context.newPage();
  await page.setViewportSize({width:390,height:1000});
  await query("UPDATE leads SET is_test=true,communication_suppressed=true WHERE id=$1",[fixture.leads.agent]);
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await expect(page.getByRole("heading",{level:1})).toHaveText("Test lead");
  await expect(page.getByText("Contact blocked.",{exact:false})).toBeVisible(); await expect(page.getByRole("button",{name:"Review & call"})).toHaveCount(0);
  await expect(page.getByRole("form",{name:"Save interaction and next task"})).toHaveCount(0);
  await page.screenshot({path:"output/playwright/readable-qa-lead-390.png",fullPage:false});
  await query("UPDATE leads SET is_test=false,communication_suppressed=false WHERE id=$1",[fixture.leads.agent]);
  await page.goto(`/admin/leads/${fixture.leads.agent}`); await page.getByRole("button",{name:"Review & call"}).click();
  await query("UPDATE communication_permissions SET state='opted_out' WHERE lead_id=$1 AND channel='phone' AND purpose='manual_one_to_one'",[fixture.leads.agent]);
  await page.getByRole("checkbox",{name:/I reviewed the request/}).check(); await page.getByRole("button",{name:"Open dialer"}).click();
  await expect(page.getByRole("status").filter({hasText:"Permission changed"})).toBeVisible();
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
for(const width of [320,390,768,1440]) {
  test(`Actual compiled email fits ${width}px with main link early`,async({browser})=>{
    const ctx=await browser.newContext({viewport:{width,height:1000}}); const page=await ctx.newPage();
    await page.route("**/*",route=>{
      // Approved image bytes from the repository, never a Production fetch.
      const assets: Record<string,string>={"/images/ask-magic-mike/our-town-properties-logo.webp":"public/images/ask-magic-mike/our-town-properties-logo.webp","/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp":"public/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.webp"};
      const asset=assets[new URL(route.request().url()).pathname];
      return asset?route.fulfill({status:200,contentType:"image/webp",body:readFileSync(asset)}):route.abort();
    }); // No provider, contact or private-data request.
    await page.setContent(readFileSync(".amm-run/lead-alert-readability-20261009/email-preview.html","utf8"));
    const link=page.getByRole("link",{name:"Open saved lead",exact:true}); await expect(link).toBeVisible();
    expect((await link.boundingBox())!.y).toBeLessThan(600);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await expect(page.locator("body")).not.toContainText("First touch:");
    await page.screenshot({path:`output/playwright/readable-email-${width}.png`,fullPage:true});await ctx.close();
  });
}
