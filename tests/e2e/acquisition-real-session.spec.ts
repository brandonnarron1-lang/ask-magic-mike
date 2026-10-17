import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { wordpressTrackedChoices } from "../../app/lib/growth/wordpress-placement-catalog";
test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=="1"||process.env.AMM_ACQUISITION_ACCEPTANCE!=="1","Use the existing isolated synthetic Better Auth harness");
test.describe.configure({mode:"serial"});
const contexts:Record<string,BrowserContext>={};
let pool: Pool;
let fixture:{ids:Record<string,string>};
const output=process.env.AMM_E2E_OUTPUT_DIR||"output/playwright/acquisition";
test.beforeAll(async({browser})=>{
  const url=new URL(process.env.DATABASE_URL||"");
  if(process.env.VERCEL_ENV!=="development"||process.env.PREVIEW_URL||!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/amm_qa_upgrade")throw Error("disposable_local_database_required");
  fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));pool=new Pool({connectionString:url.toString(),max:1});mkdirSync(output,{recursive:true});
  for(const role of ["admin","owner","analyst","agent"]){
    const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:"reduce"});const page=await context.newPage();
    await page.goto("/lead-center-login?returnTo=%2Fadmin%2Fdistribution");await page.getByLabel("Work email").fill(`${role}@example.test`);
    await page.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);await page.getByRole("button",{name:"Open Lead Center"}).click();
    if(role!=="agent")await expect(page).toHaveURL(/\/admin\/distribution$/);else await expect(page).toHaveURL(/lead-center-login\?error=forbidden/);
    contexts[role]=context;await page.close();
  }
});
test.afterAll(async()=>{for(const context of Object.values(contexts))await context.close();await pool?.end();});
test("real analyst/admin aggregates are private, exact, and filterable; owner is assigned-scoped",async()=>{
  for(const role of ["admin","analyst","owner"]){const page=await contexts[role].newPage();const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));const response=await page.goto("/admin/distribution");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    const report=page.getByRole("region",{name:"Inquiries, recorded contacts and operator delivery",exact:true});
    await expect(report.getByRole("status")).toContainText("Coverage: COMPLETE");
    const summary=report.locator('[aria-label="Exact acquisition summary"]');
    await expect(summary).toContainText(role==="owner"?"1":"3");
    if(role!=="owner"){await expect(summary).toContainText("Globally distinct recorded contacts1");await expect(summary).toContainText("Unresolved contact linkage1");}
    expect(await report.innerText()).not.toContain("private-agent@example.test");expect(await report.locator('a[href^="/admin/leads/"]').count()).toBe(0);
    await report.getByRole("combobox",{name:"Inquiry window",exact:true}).selectOption("7");await report.getByRole("combobox",{name:"Placement",exact:true}).selectOption("wordpress_homepage_ask_mike");await report.getByRole("button",{name:"Read report",exact:true}).click();
    await expect(page).toHaveURL(/acq_window=7/);await expect(report.getByRole("status")).toContainText("Coverage: COMPLETE");
    await expect(report.locator("tbody tr")).toHaveCount(1);
    await page.goto("/admin/distribution?acq_window=range&acq_from=not-a-date&acq_to=not-a-date");await expect(report.getByRole("alert")).toContainText("No aggregate query was executed");
    expect(errors).toEqual([]);await page.close();}
});
test("fresh anonymous and expired genuine sessions cannot view the report or carry a private summary",async({browser})=>{
  const fresh=await browser.newContext();const page=await fresh.newPage();await page.goto("/admin/distribution");await expect(page).toHaveURL(/lead-center-login/);
  expect(await page.content()).not.toContain("Globally distinct recorded contacts");await fresh.close();
  await pool.query('UPDATE lead_center_sessions SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1',[fixture.ids.analyst]);
  const expired=await contexts.analyst.newPage();await expired.goto("/admin/distribution");await expect(expired).toHaveURL(/lead-center-login/);expect(await expired.content()).not.toContain("Globally distinct recorded contacts");await expired.close();
});
for(const width of [320,390,768,1440])test(`compiled report reflow/keyboard at ${width}px and 200% root text`,async()=>{
  const page=await contexts.admin.newPage();const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize({width,height:1100});await page.goto("/admin/distribution");
  const report=page.getByRole("region",{name:"Inquiries, recorded contacts and operator delivery",exact:true});await expect(report.getByRole("status")).toContainText("Coverage: COMPLETE");
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
  await report.getByRole("button",{name:"Read report",exact:true}).press("Shift+Tab");await page.keyboard.press("Tab");
  await expect(report.getByRole("button",{name:"Read report",exact:true})).toBeFocused();
  const geometry=await report.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize}));
  expect(geometry.rootFont).toBe("32px");expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  if(width<768){const cards=report.getByLabel("Placement totals on narrow screens");await expect(cards).toBeVisible();await expect(cards.getByText("Recorded contacts:",{exact:true})).toHaveCount(3);await expect(report.getByRole("table")).toHaveCount(0);}
  await report.screenshot({path:join(output,`acquisition-${width}-root200.png`)});expect(errors).toEqual([]);await page.close();
});
test("genuine admin records all homepage choices together; baseline works and replay adds no proof, audit, lead or notification",async()=>{
  const page=await contexts.admin.newPage();const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const effects=async()=>(await pool.query("SELECT (SELECT count(*)::int FROM owned_demand_publication_proofs) proofs,(SELECT count(*)::int FROM audit_logs WHERE action='growth.publication_proof_recorded') audit,(SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications) notifications")).rows[0];
  const before=await effects();
  const urls=wordpressTrackedChoices("wordpress_homepage_ask_mike").map(choice=>choice.trackedUrl);
  async function record(observed:string[]) {
    await page.goto("/admin/distribution");const card=page.locator("#publication-proof-ourtown_wordpress");
    await card.getByText("Record native observation",{exact:true}).click();
    await card.getByRole("combobox",{name:"Placement",exact:true}).selectOption("wordpress_homepage_ask_mike");
    await card.getByLabel("Observed tracked destinations",{exact:false}).fill(observed.join("\n"));
    await card.getByLabel("Public evidence URL",{exact:true}).fill("https://www.ourtownproperties.com/");
    await card.getByLabel("Exact final copy used",{exact:false}).fill("INTERNAL QA LOCAL ONLY. Synthetic homepage choices, not a consumer request.");
    await card.getByLabel("Approval reference",{exact:true}).fill("Synthetic catalog proof authority");
    await card.getByRole("checkbox").check();await card.getByRole("button",{name:"Record observed proof",exact:true}).click();
  }
  await record(urls.slice(0,1));await expect(page).toHaveURL(/publication_action=complete_choice_group_required/);expect(await effects()).toEqual(before);
  await record(urls);await expect(page).toHaveURL(/publication_action=proof_recorded/);
  const after=await effects();expect(after).toEqual({...before,proofs:before.proofs+3,audit:before.audit+3});
  await page.goto("/admin/distribution?acq_window=baseline&acq_placement=wordpress_homepage_ask_mike");
  const report=page.getByRole("region",{name:"Inquiries, recorded contacts and operator delivery",exact:true});
  await expect(report.getByRole("status")).toContainText("Coverage: COMPLETE");await expect(report).toContainText("Live observation");
  await record(urls.toReversed());await expect(page).toHaveURL(/publication_action=already_recorded/);expect(await effects()).toEqual(after);
  await page.goto("/admin/distribution?acq_window=7");await expect(report.locator('[aria-label="Exact acquisition summary"]')).toContainText("Accepted eligible inquiries3");
  expect(errors).toEqual([]);await page.close();
});
