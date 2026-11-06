import{readFileSync,mkdirSync}from"node:fs";
import path from"node:path";
import{Pool}from"pg";
import{test,expect,type Page,type BrowserContext,type Cookie}from"@playwright/test";

test.skip(process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=="1"||process.env.AMM_CONSUMER_ACCOUNT_ACCEPTANCE!=="1","Genuine owned local PostgreSQL/Better Auth venue required");
test.describe.configure({mode:"serial"});
const fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));
const password=process.env.AMM_E2E_FIXTURE_PASSWORD!,output=process.env.AMM_E2E_OUTPUT_DIR!;
let pool:Pool,aliceCookies:Cookie[],bob:BrowserContext,second:BrowserContext,secondPage:Page;
let initial:{leads:number;outbox:number;provider:number};
let externalAttempts=0;
async function guard(page:Page,origin:string){await page.route("**/*",async route=>{if(new URL(route.request().url()).origin!==origin){externalAttempts++;await route.abort("blockedbyclient");return;}await route.continue();});}
const counts=async()=> (await pool.query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM lead_notifications WHERE provider_message_id IS NOT NULL) provider")).rows[0];
async function login(page:Page,email="alice@example.test",secret=password){await page.goto("/my/account");await page.getByLabel("Account email",{exact:true}).fill(email);await page.getByLabel("Account password",{exact:true}).fill(secret);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("heading",{name:"Your saved comparison",exact:true})).toBeVisible();}
test.beforeAll(async()=>{const u=new URL(process.env.DATABASE_URL!);if(process.env.VERCEL_ENV!=="development"||u.hostname!=="localhost"||u.pathname!=="/amm_qa_upgrade"||process.env.PREVIEW_URL)throw Error("dedicated_loopback_database_required");pool=new Pool({connectionString:u.href,max:1});initial=await counts();mkdirSync(output,{recursive:true});});
test.beforeEach(async({page,baseURL})=>{await guard(page,new URL(baseURL!).origin);});
test.afterAll(async()=>{await bob?.close();await second?.close();await pool?.end();expect(externalAttempts).toBe(0);});

test("sentinel: consumer account signs in, explicitly saves, reads a genuine private snapshot without intake effects",async({page,baseURL})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await login(page);
 await expect(page.getByText("No saved online comparison yet.",{exact:false})).toBeVisible();
 await page.getByLabel("Address or listing link",{exact:true}).fill("123 SYNTHETIC ACCOUNT Lane");await page.getByRole("button",{name:"Add to this comparison",exact:true}).click();
 expect((await pool.query("SELECT count(*)::int n FROM consumer_workspaces")).rows[0].n).toBe(0);
 const post=page.waitForRequest(r=>r.method()==="PUT"&&new URL(r.url()).pathname==="/api/consumer/v1/workspace");
 await page.getByRole("button",{name:"Save comparison online",exact:true}).click();const native=await post;
 expect((await native.allHeaders()).origin).toBe(new URL(baseURL!).origin);
 await expect(page.getByRole("status")).toContainText("Comparison saved online. No inquiry or message was sent.");
 const state=(await pool.query("SELECT revision,interests FROM consumer_workspaces WHERE user_id=$1",[fixture.consumerUsers.alice])).rows[0];expect(state.revision).toBe(1);expect(state.interests[0].label).toBe("123 SYNTHETIC ACCOUNT Lane");
 await page.reload();await expect(page.getByRole("heading",{name:"123 SYNTHETIC ACCOUNT Lane",exact:true})).toBeVisible();
 aliceCookies=await page.context().cookies();expect(await counts()).toEqual(initial);expect(errors).toEqual([]);
});
for(const width of[320,390,430,768,1440])test(`private account comparison ${width}px, keyboard and200% text`,async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.context().addCookies(aliceCookies);await page.setViewportSize({width,height:1050});await page.goto("/my/account");
 await expect(page.getByRole("heading",{name:"Your saved comparison",exact:true})).toBeVisible();
 await page.getByLabel("Address or listing link",{exact:true}).fill("SYNTHETIC "+"long-reference-".repeat(25));await page.getByRole("button",{name:"Add to this comparison",exact:true}).click();
 await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
 const save=page.getByRole("button",{name:"Save comparison online",exact:true});await save.focus();await expect(save).toBeFocused();expect((await save.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize)).toBe("32px");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await page.getByText("Delete this consumer account",{exact:true}).press("Enter");await expect(page.getByLabel("Confirm account password",{exact:true})).toBeVisible();
 await page.getByText("Delete this consumer account",{exact:true}).press("Enter");
 await page.screenshot({path:path.join(output,`consumer-account-${width}-root200.png`),fullPage:true});expect(errors).toEqual([]);expect(await counts()).toEqual(initial);
});
test("two genuine consumer sessions share only their subject; staff session and guessed IDs do not substitute",async({browser,page,baseURL})=>{
 second=await browser.newContext({baseURL});secondPage=await second.newPage();await guard(secondPage,new URL(baseURL!).origin);await login(secondPage);await expect(secondPage.getByRole("heading",{name:"123 SYNTHETIC ACCOUNT Lane",exact:true})).toBeVisible();
 bob=await browser.newContext({baseURL});const bp=await bob.newPage();await guard(bp,new URL(baseURL!).origin);await login(bp,"bob@example.test");await expect(bp.getByText("No saved online comparison yet.",{exact:false})).toBeVisible();
 const body={revision:0,interests:[],userId:fixture.consumerUsers.alice};expect((await bp.request.put("/api/consumer/v1/workspace",{data:body,headers:{Origin:baseURL!}})).status()).toBe(400);
 await page.context().addCookies(aliceCookies);const staffDenied=await page.request.get(`/admin/leads/${fixture.leads.owner}`,{maxRedirects:0});expect([303,307,308]).toContain(staffDenied.status());expect(staffDenied.headers().location).toContain("lead-center-login");
 const staff=await browser.newContext({baseURL});try{const r=await staff.request.post("/api/lead-center-auth/sign-in/email",{data:{email:"owner@example.test",password},headers:{Origin:baseURL!}});expect(r.status()).toBe(200);expect((await staff.request.get("/api/consumer/v1/workspace")).status()).toBe(401);}finally{await staff.close();}
 expect(await counts()).toEqual(initial);
});
test("expiry removes stale private UI and rejects its pending save against the real database",async()=>{
 const s=await secondPage.request.get("/api/consumer-auth/get-session");const state=await s.json();expect(state.user.id).toBe(fixture.consumerUsers.alice);
 await pool.query("UPDATE consumer_sessions SET \"expiresAt\"=now()-interval '1 second' WHERE id=$1",[state.session.id]);
 await secondPage.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(secondPage.getByRole("heading",{name:"Sign in to your comparison",exact:true})).toBeVisible();expect(await secondPage.getByText("123 SYNTHETIC ACCOUNT Lane",{exact:true}).count()).toBe(0);
 expect((await secondPage.request.put("/api/consumer/v1/workspace",{data:{revision:1,interests:[]},headers:{Origin:new URL(secondPage.url()).origin}})).status()).toBe(401);
 expect((await pool.query("SELECT revision FROM consumer_workspaces WHERE user_id=$1",[fixture.consumerUsers.alice])).rows[0].revision).toBe(1);expect(await counts()).toEqual(initial);
});
test("current-password deletion removes only the consumer account and has no outbound effect",async()=>{
 const page=bob.pages()[0];await page.getByText("Delete this consumer account",{exact:true}).click();await page.getByLabel("Confirm account password",{exact:true}).fill("not-the-password");await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Delete my consumer account",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Password not confirmed. Nothing was deleted.");
 await page.getByLabel("Confirm account password",{exact:true}).fill(password);await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Delete my consumer account",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Consumer account deleted from the active workspace.");expect((await pool.query("SELECT count(*)::int n FROM consumer_users WHERE id=$1",[fixture.consumerUsers.bob])).rows[0].n).toBe(0);expect((await pool.query("SELECT count(*)::int n FROM consumer_users WHERE id=$1",[fixture.consumerUsers.alice])).rows[0].n).toBe(1);expect(await counts()).toEqual(initial);
});
test("signing out all consumer devices clears the local comparison and keeps inquiry state intact",async({page})=>{
 await page.context().addCookies(aliceCookies);await page.goto("/my/account");await expect(page.getByRole("heading",{name:"Your saved comparison",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Sign out all devices",exact:true}).click();await expect(page.getByRole("status")).toContainText("Consumer sessions ended on all devices.");expect(await page.getByText("123 SYNTHETIC ACCOUNT Lane",{exact:true}).count()).toBe(0);
 expect((await pool.query("SELECT count(*)::int n FROM consumer_sessions WHERE \"userId\"=$1",[fixture.consumerUsers.alice])).rows[0].n).toBe(0);expect(await counts()).toEqual(initial);
});
test("actual signup of a same-email consumer remains unverified and does not become a staff identity",async({page})=>{
 await page.goto("/my/account");await page.getByRole("button",{name:"Create an account instead",exact:true}).click();await page.getByLabel("Your name",{exact:true}).fill("SYNTHETIC CONSUMER SAME EMAIL");await page.getByLabel("Account email",{exact:true}).fill("owner@example.test");await page.getByLabel("Account password",{exact:true}).fill(password);await page.getByRole("button",{name:"Create account",exact:true}).click();await expect(page.getByRole("status")).toContainText("Account request processed.");
 await page.getByLabel("Account email",{exact:true}).fill("owner@example.test");await page.getByLabel("Account password",{exact:true}).fill(password);await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("heading",{name:"Your saved comparison",exact:true})).toBeVisible();
 const response=await page.request.get("/api/consumer/v1/account");const value=await response.json();expect(response.status()).toBe(200);expect(value.profile.emailVerified).toBe(false);expect(value.workspace.interests).toEqual([]);expect(JSON.stringify(value)).not.toMatch(/lead_id|leadPermissions|assigned_agent|session_token|password/);
 const denied=await page.request.get(`/admin/leads/${fixture.leads.owner}`,{maxRedirects:0});expect([303,307,308]).toContain(denied.status());expect(await counts()).toEqual(initial);
});
