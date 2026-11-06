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
  if (process.env.AMM_E2E_BUILT === "1") {
    const trace = JSON.parse(readFileSync(".next/server/app/admin/distribution/page.js.nft.json", "utf8")) as { files: string[] };
    for (const file of ["seller-feed.jpg", "seller-story.jpg", "buyer-feed.jpg", "buyer-story.jpg", "compare-selling-options-feed-20261021.jpg", "compare-selling-options-story-20261021.jpg"])
      expect(trace.files.some(path => path.endsWith(`/public/launch-20261013/${file}`))).toBe(true);
  }
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
    // The new server-rendered draft workspace follows existing growth:manage,
    // not mere report:view. DOM hiding is not the access boundary.
    if (role === "analyst") expect(await page.content()).not.toContain("14-day draft review queue");
    else await expect(page.getByRole("region", { name: "Fortnight review queue", exact: true })).toBeVisible();
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
  expect(await page.content()).not.toContain("Globally distinct recorded contacts");expect(await page.content()).not.toContain("14-day draft review queue");await fresh.close();
  await pool.query('UPDATE lead_center_sessions SET "expiresAt"=now()-interval \'1 minute\' WHERE "userId"=$1',[fixture.ids.analyst]);
  const expired=await contexts.analyst.newPage();await expired.goto("/admin/distribution");await expect(expired).toHaveURL(/lead-center-login/);expect(await expired.content()).not.toContain("Globally distinct recorded contacts");await expired.close();
});
for (const width of [320,390,430,768,1440]) test(`review-only fortnight queue ${width}px, keyboard, 200% text and zero business mutations`, async () => {
  const tables = ["leads", "contacts", "lead_notifications", "agent_assignments", "tasks", "lead_appointments", "audit_logs", "ai_intelligence_jobs", "ai_usage_events", "owned_demand_publication_proofs", "lead_allocation_policy"];
  const hashes = async () => Promise.all(tables.map(async table => (await pool.query(`SELECT md5(coalesce(jsonb_agg(t ORDER BY to_jsonb(t)::text),'[]')::text) hash FROM public.${table} t`)).rows[0].hash));
  const before = await hashes(); const page = await contexts.admin.newPage(); const errors: string[] = [], writes: string[] = [];
  await contexts.admin.grantPermissions(["clipboard-read", "clipboard-write"]);
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (!["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  await page.setViewportSize({ width, height: 1000 }); await page.goto("/admin/distribution");
  const queue = page.getByRole("region", { name: "Fortnight review queue", exact: true });
  const outer = queue.locator("details").first(); await expect(outer).not.toHaveAttribute("open");
  await outer.locator(":scope > summary").focus(); await page.keyboard.press("Enter"); await expect(outer).toHaveAttribute("open", "");
  await expect(queue.locator("ol > li")).toHaveCount(14);
  const compare = queue.locator("ol > li").nth(2).locator("details").first();
  await compare.locator(":scope > summary").focus(); await page.keyboard.press("Space"); await expect(compare).toHaveAttribute("open", "");
  const destination = compare.getByRole("link", { name: "Open matching selling options destination" });
  await expect(destination).toHaveAttribute("href", /seller_option=compare/);
  const evidence = compare.getByText("Evidence and review holds", { exact: true }); await evidence.click();
  await expect(compare).toContainText("Reviewer, review time and proposed publication time: not recorded");
  const copy = compare.getByRole("button", { name: "Copy day 3 review packet to clipboard" });
  await copy.focus(); await expect(copy).toBeFocused(); expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Space"); await expect(copy).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("REVIEW DRAFT — day 3; NOT SCHEDULED / NOT PUBLISHED");
  expect(copied).toContain("seller_option=compare"); expect(copied).toContain("Reviewer / proposed time: not recorded");
  await queue.screenshot({ path: join(output, `fortnight-${width}.png`) });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  for (const item of await queue.locator("ol > li > details").all()) await item.evaluate(el => { (el as HTMLDetailsElement).open = true; });
  const reflow = await page.evaluate(() => ({ width: innerWidth, scrollX, scroll: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter(el => !el.closest("table") && el.checkVisibility()).map(el => ({ tag: el.tagName, className: el.getAttribute("class"), right: el.getBoundingClientRect().right + scrollX, width: el.getBoundingClientRect().width, ownScroll: el.scrollWidth, text: el.textContent?.slice(0,80) })).filter(el => el.right > innerWidth + 1).slice(0,40) }));
  await test.info().attach("full-page-reflow-diagnostic", { body: JSON.stringify(reflow, null, 2), contentType: "application/json" });
  const intrinsic = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => !el.closest("table")).map(el => ({ tag: el.tagName, className: el.getAttribute("class"), right: el.getBoundingClientRect().right + scrollX, width: el.clientWidth, ownScroll: el.scrollWidth, visible: el.checkVisibility(), details: el.closest("details")?.getAttribute("open"), text: el.textContent?.slice(0,55) })).filter(el => el.right > innerWidth + 1 && el.right <= document.documentElement.scrollWidth + 1 || el.ownScroll > el.width + 1 && el.ownScroll < 500).slice(0,60));
  await test.info().attach("intrinsic-overflow-diagnostic", { body: JSON.stringify(intrinsic, null, 2), contentType: "application/json" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  await expect(queue).toContainText("permission not established");
  await queue.screenshot({ path: join(output, `fortnight-${width}-200.png`) });
  expect(writes).toEqual([]); expect(errors).toEqual([]); expect(await hashes()).toEqual(before); await page.close();
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
