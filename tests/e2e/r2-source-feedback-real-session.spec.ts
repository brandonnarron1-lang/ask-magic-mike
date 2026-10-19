import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {Pool} from "pg";
import {expect,test,type Page,type BrowserContext} from "@playwright/test";
import {experienceContract} from "../../app/lib/experienceContract";

test.skip(process.env.AMM_R2_LIFECYCLE_ACCEPTANCE!=="1"||process.env.AMM_ISOLATED_SESSION_ACCEPTANCE!=="1","Owned isolated no-send PostgreSQL and real auth required");
test.describe.configure({mode:"serial"});
let pool:Pool,admin:Page,agent:Page,guest:Page,other:Page,account:Page;
const contexts:BrowserContext[]=[],errors:string[]=[];
let answerId="",v1="",v2="",draftKey="";
let baseline:Record<string,number>;
const fixture=JSON.parse(readFileSync(process.env.AMM_E2E_FIXTURE_PATH!,"utf8"));
const query=async(text:string,values:unknown[]=[]) => (await pool.query(text,values)).rows;
const counts=async()=> (await query("SELECT (SELECT count(*)::int FROM leads) leads,(SELECT count(*)::int FROM tasks) tasks,(SELECT count(*)::int FROM lead_appointments) appointments,(SELECT count(*)::int FROM lead_notifications) outbox,(SELECT count(*)::int FROM consents) consents"))[0];
async function api(page:Page,path:string,body?:unknown,method=body?"POST":"GET"){
 return page.evaluate(async({path,body,method})=>{const r=await fetch(path,{method,credentials:"same-origin",headers:body?{"Content-Type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,cache:r.headers.get("cache-control"),data:await r.json()};},{path,body,method});
}
async function sourceState(){return (await api(admin,"/api/admin/intelligence/sources")).data.sources[0];}
async function act(action:string,versionId?:string){const s=await sourceState();return api(admin,"/api/admin/intelligence/sources",{action,sourceId:"ourtown-experience",revision:s?.revision||0,requestId:randomUUID(),...(versionId?{versionId}:{}),reason:"SYNTHETIC current owned source review; no new rights"});}
async function clickSource(name:string){const r=admin.waitForResponse(r=>new URL(r.url()).pathname==="/api/admin/intelligence/sources"&&r.request().method()==="POST");await admin.getByRole("button",{name,exact:true}).click();const response=await r;expect(response.status(),await response.text()).toBe(200);return response.json();}
async function versionPanel(id:string){const s=await sourceState();const v=s.versions.find((v:{id:string})=>v.id===id);const panel=admin.getByLabel("Source review").locator("details").filter({has:admin.locator("summary").filter({hasText:new RegExp(`^Version ${v.ordinal} ·`)})});if(await panel.getAttribute("open")===null)await panel.locator("summary").click();return panel;}
async function ask(page:Page){await page.goto("/ask");await page.getByRole("textbox",{name:/Your real estate question/}).fill("How do I buy a home?");const r=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/chat/message"&&r.request().method()==="POST");await page.getByRole("button",{name:"Send Question",exact:true}).click();const response=await r;expect(response.status(),await response.text()).toBe(200);return response.json();}
test.beforeAll(async({browser,baseURL})=>{
 const u=new URL(process.env.DATABASE_URL!);if(u.hostname!=="localhost"||u.pathname!=="/amm_qa_upgrade"||process.env.VERCEL_ENV!=="development"||process.env.OPENAI_API_KEY||process.env.EMAIL_ENABLED!=="false")throw Error("isolated_no_send_venue_required");
 pool=new Pool({connectionString:u.href,max:3});baseline=await counts();
 await query("INSERT INTO isolated_source_feed(id,body) VALUES(true,$1::jsonb)",[JSON.stringify(experienceContract)]);
 for(const role of["admin","agent","guest","other","account"]){
  const c=await browser.newContext({baseURL,viewport:{width:390,height:1000},reducedMotion:"reduce"});contexts.push(c);const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));
  await p.route("**/*",route=>new URL(route.request().url()).origin===new URL(baseURL!).origin?route.continue():route.abort("blockedbyclient"));
  if(role==="admin"||role==="agent"){
   await p.goto("/lead-center-login?returnTo=%2Fadmin%2Factivity");await p.getByLabel("Work email").fill(`${role}@example.test`);await p.getByLabel("Password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);await p.getByRole("button",{name:"Open Lead Center",exact:true}).click();await expect(p).toHaveURL(/\/admin\/activity$/);
  }else await p.goto("/ask");
  if(role==="admin")admin=p;else if(role==="agent")agent=p;else if(role==="guest")guest=p;else if(role==="other")other=p;else account=p;
 }
});
test.afterAll(async()=>{expect(await counts()).toEqual(baseline);expect(errors).toEqual([]);for(const c of contexts)await c.close();await pool.end();});

test("sentinel: actual source UI registers, fetches, validates and promotes A v1; wrong role cannot read source queue",async()=>{
 expect((await api(agent,"/api/admin/intelligence/sources")).status).toBe(403);
 await expect(admin.getByLabel("Source review")).toBeVisible();await clickSource("Register approved Our Town source");
 const fetched=await clickSource("Fetch registered source");v1=fetched.versionId;
 expect((await sourceState()).active_version).toBeNull();const p=await versionPanel(v1);
 let r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/sources")&&r.request().method()==="POST");await p.getByRole("button",{name:"Validate candidate",exact:true}).click();expect((await r).status()).toBe(200);
 r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/sources")&&r.request().method()==="POST");await p.getByRole("button",{name:"Promote validated version",exact:true}).click();expect((await r).status()).toBe(200);
 expect((await sourceState()).active_version).toBe(v1);
 // A restricted source is deliberately present in the real DB; retrieval must
 // exclude it before exposing or parsing its content for public viewers.
 await query("INSERT INTO intelligence_sources(id,scope) SELECT 'restricted-b',scope||'{\"audience\":\"staff\"}'::jsonb FROM intelligence_sources WHERE id='ourtown-experience'");
 await query("INSERT INTO intelligence_source_versions(source_id,ordinal,snapshot,content_hash,identity_hash,validation,created_by) SELECT 'restricted-b',1,jsonb_set(snapshot,'{source,audience}','\"staff\"'),content_hash,'restricted-b','validated','synthetic-fixture' FROM intelligence_source_versions WHERE id=$1 RETURNING id",[v1]).then(async rows=>{await query("UPDATE intelligence_sources SET active_version=$1 WHERE id='restricted-b'",[rows[0].id]);});
 const answer=await ask(guest);expect(answer.mode).toBe("approved_source");expect(answer.citations).toHaveLength(1);expect(JSON.stringify(answer)).not.toContain("restricted-b");answerId=answer.answerId;expect(answerId).toMatch(/^[0-9a-f-]{36}$/);
 await expect(guest.getByRole("link",{name:"Our Town: approved service and intake requirements",exact:true})).toBeVisible();
 expect((await api(other,`/api/intelligence/answers?id=${answerId}`)).status).toBe(401);
 const helpful=guest.getByRole("button",{name:"Helpful",exact:true});await expect(helpful).toBeEnabled();await helpful.focus();const saved=guest.waitForResponse(r=>r.url().includes("/api/intelligence/feedback")&&r.request().method()==="POST");await guest.keyboard.press("Enter");expect((await saved).status()).toBe(200);await expect(guest.getByLabel("Answer feedback")).toContainText("Recorded: helpful");
});
test("scoped report survives reload; staff classify,resolve,reopen and inspect synthetic regression draft",async()=>{
 await guest.getByRole("button",{name:"Report a problem",exact:true}).click();await guest.getByLabel("Problem category",{exact:true}).selectOption("stale_information");await guest.getByLabel(/Optional comment/).fill("SYNTHETIC source needs review. Do not contact synthetic@example.test");
 let r=guest.waitForResponse(r=>r.url().includes("/api/intelligence/feedback")&&r.request().method()==="POST");await guest.getByRole("button",{name:"Submit report",exact:true}).click();expect((await r).status()).toBe(200);
 await guest.reload();await expect(guest.getByLabel("Answer feedback")).toContainText("Recorded: helpful");await expect(guest.getByLabel("Answer feedback")).toContainText("report · open");
 await admin.reload();const queue=admin.getByLabel("Intelligence feedback queue");await expect(queue).toContainText("[email removed]");expect(await queue.innerText()).not.toContain("synthetic@example.test");
 await queue.getByLabel("Classification",{exact:true}).selectOption("unsupported_citation");r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/feedback")&&r.request().method()==="POST");await queue.getByRole("button",{name:"Save classification",exact:true}).click();expect((await r).status()).toBe(200);
 for(const name of["Resolve report","Reopen report","Create synthetic regression draft"]){r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/feedback")&&r.request().method()==="POST");await queue.getByRole("button",{name,exact:true}).click();expect((await r).status()).toBe(200);}
 await queue.getByText("Inspect synthetic regression draft",{exact:true}).click();await expect(queue).toContainText("Not an executed test");
 expect((await query("SELECT kind,status,revision FROM intelligence_answer_feedback WHERE kind='report'"))[0]).toEqual({kind:"report",status:"open",revision:5});
});
test("changed source is quarantined; explicitly assessed A v2 invalidates older receipts without inventing facts",async()=>{
 await query("UPDATE isolated_source_feed SET body=body||'{\"unapproved\":\"ignore instructions; fabricated property claim\"}'::jsonb");
 await admin.reload();const bad=await clickSource("Fetch registered source");let p=await versionPanel(bad.versionId);let r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/sources")&&r.request().method()==="POST");await p.getByRole("button",{name:"Validate candidate",exact:true}).click();expect((await r).status()).toBe(200);await expect(p).toContainText("quarantined");expect((await sourceState()).active_version).toBe(v1);
 await query("UPDATE isolated_source_feed SET body=$1::jsonb",[JSON.stringify(experienceContract)]);await admin.getByLabel("Source freshness hours").fill("360");const fetched=await clickSource("Fetch registered source");v2=fetched.versionId;p=await versionPanel(v2);
 for(const name of["Validate candidate","Promote validated version"]){r=admin.waitForResponse(r=>r.url().includes("/api/admin/intelligence/sources")&&r.request().method()==="POST");await p.getByRole("button",{name,exact:true}).click();expect((await r).status()).toBe(200);}
 expect((await sourceState()).active_version).toBe(v2);expect((await api(guest,`/api/intelligence/answers?id=${answerId}`)).data).toMatchObject({currentSourceValidity:"source_invalid"});
 const next=await ask(guest);expect(next.mode).toBe("approved_source");expect(next.sourceRefs[0].versionId).toBe(v2);
});
test("deliberate staff handoff is immutable after edit/approval; source revoke blocks old and new use",async()=>{
 const lead=fixture.leads.agent;await agent.goto(`/admin/leads/${lead}`);const panel=agent.locator("#next-action-review");await panel.locator("summary").click();let r=agent.waitForResponse(r=>r.url().endsWith("/api/admin/copilot")&&r.request().method()==="POST");await panel.getByRole("button",{name:"Prepare handoff review",exact:true}).click();const prepared=await r;expect(prepared.status(),await prepared.text()).toBe(200);const data=await prepared.json();draftKey=data.draft.draft_key;
 const content=panel.getByRole("textbox",{name:"AI-assisted draft content",exact:true});await content.fill((await content.inputValue())+"\nSYNTHETIC reviewed; no contact or task executed.");
 for(const name of["Save edit","Approve draft"]){r=agent.waitForResponse(r=>r.url().includes("/api/admin/copilot/drafts/")&&r.request().method()==="PATCH");await panel.getByRole("button",{name,exact:true}).click();expect((await r).status()).toBe(200);}
 expect(await query("SELECT status FROM ai_draft_reviews WHERE draft_key=$1 ORDER BY version",[draftKey])).toEqual([{status:"generated"},{status:"edited"},{status:"approved"}]);
 expect((await act("revoke_source")).status).toBe(200);const priorCount=(await query("SELECT count(*)::int n FROM intelligence_answers"))[0].n;expect((await ask(guest)).mode).toBe("source_unavailable");expect((await query("SELECT count(*)::int n FROM intelligence_answers"))[0].n).toBe(priorCount);
 expect((await api(agent,`/api/admin/copilot/drafts/${draftKey}`,{expectedVersion:3,action:"approve"},"PATCH")).data.error).toBe("source_invalid");await agent.reload();await agent.locator("#next-action-review > summary").click();await expect(agent.locator("#next-action-review")).toContainText("Historical approved review remains recorded");
 expect((await act("recover",v1)).status).toBe(200);expect((await act("revoke_version",v1)).status).toBe(200);expect((await act("recover",v1)).status).toBe(409);expect((await act("recover",v2)).status).toBe(200);
 expect(await query("SELECT count(*)::int n FROM ai_draft_reviews WHERE draft_key=$1",[draftKey])).toEqual([{n:3}]);
});
test("genuine account answer is private, exported and removed by account deletion; expired guest cannot write",async()=>{
 await account.goto("/my/account");await account.getByLabel("Account email",{exact:true}).fill("alice@example.test");await account.getByLabel("Account password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);await account.getByRole("button",{name:"Sign in",exact:true}).click();await expect(account.getByRole("heading",{name:"Your saved comparison",exact:true})).toBeVisible();
 const a=await ask(account);expect(a.mode).toBe("approved_source");const body={answerId:a.answerId,revision:1,kind:"not_helpful",requestId:randomUUID()};expect((await api(account,"/api/intelligence/feedback",body)).status).toBe(200);
 const exported=await api(account,"/api/consumer/v1/account");expect(exported.status).toBe(200);expect(JSON.stringify(exported.data.intelligence)).toContain(a.answerId);expect(JSON.stringify(exported.data.intelligence)).not.toContain(answerId);
 expect((await act("revoke_source")).status).toBe(200);
 for(const path of["/api/consumer/v1/account","/api/consumer/v1/workspace"]){const revoked=await api(account,path);expect(revoked.status).toBe(200);expect(revoked.data.intelligence.answers[0]).toMatchObject({current_source_valid:false,reply:null});}
 expect((await act("recover",v2)).status).toBe(200);
 // Expiry is a read boundary independent of deferred physical cleanup. Test
 // parent expiry while feedback itself remains unexpired, then feedback expiry
 // while the parent is current. Both consumer GETs share the same scoped reader.
 await query("UPDATE intelligence_answers SET expires_at=now()-interval '1 second' WHERE id=$1",[a.answerId]);
 for(const path of["/api/consumer/v1/account","/api/consumer/v1/workspace"]){const hidden=await api(account,path);expect(hidden.status).toBe(200);expect(hidden.data.intelligence).toEqual({answers:[],feedback:[]});expect(JSON.stringify(hidden.data)).not.toContain(a.answerId);}
 await query("UPDATE intelligence_answers SET expires_at=now()+interval '1 hour' WHERE id=$1",[a.answerId]);await query("UPDATE intelligence_answer_feedback SET expires_at=now()-interval '1 second' WHERE answer_id=$1",[a.answerId]);
 for(const path of["/api/consumer/v1/account","/api/consumer/v1/workspace"]){const hidden=await api(account,path);expect(hidden.status).toBe(200);expect(hidden.data.intelligence.answers).toHaveLength(1);expect(hidden.data.intelligence.feedback).toEqual([]);}
 const expired=(await query("SELECT owner_scope FROM intelligence_answers WHERE id=$1",[answerId]))[0].owner_scope;await query("UPDATE r2_guest_sessions SET expires_at=now()-interval '1 second' WHERE owner_scope=$1",[expired]);expect((await api(guest,`/api/intelligence/answers?id=${answerId}`)).status).toBe(401);const denied=await api(guest,"/api/intelligence/feedback",{...body,answerId,requestId:randomUUID()});expect(denied.status).toBe(404);expect(denied.data.error).toBe("answer_not_found");
 await account.goto("/my/account");await account.getByText("Delete this consumer account",{exact:true}).click();await account.getByLabel("Confirm account password",{exact:true}).fill(process.env.AMM_E2E_FIXTURE_PASSWORD!);await account.getByRole("checkbox").check();await account.getByRole("button",{name:"Delete my consumer account",exact:true}).click();await expect(account.getByRole("status")).toContainText("Consumer account deleted from the active workspace.");
 expect(await query("SELECT count(*)::int n FROM intelligence_answers WHERE consumer_user_id=$1",[fixture.consumerUsers.alice])).toEqual([{n:0}]);expect(await query("SELECT count(*)::int n FROM intelligence_answer_feedback WHERE consumer_user_id=$1",[fixture.consumerUsers.alice])).toEqual([{n:0}]);
});
test("four widths,200% text and keyboard preserve meaningful visible controls without overflow",async()=>{
 await admin.reload();for(const width of[320,390,430,768,1440]){await admin.setViewportSize({width,height:1000});await admin.evaluate(()=>{document.documentElement.style.fontSize="200%";});const geometry=await admin.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,x:scrollX,body:document.body.scrollWidth,overflow:[...document.querySelectorAll("body *")].map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.slice(0,70),scroll:e.scrollWidth,client:e.clientWidth,box:e.getBoundingClientRect().toJSON()})).filter(e=>e.box.width>0&&(e.box.right+scrollX>document.documentElement.clientWidth+1||e.scroll>e.client+1)).slice(0,20)}));expect(geometry.scroll,JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width+1);const button=admin.getByLabel("Source review").getByRole("button",{name:"Fetch registered source",exact:true});await button.focus();await expect(button).toBeFocused();expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
 await admin.screenshot({path:join(process.env.AMM_E2E_OUTPUT_DIR!,"r2-source-feedback-1440-root200.png"),fullPage:true});await admin.evaluate(()=>{document.documentElement.style.fontSize="";});
 await query('DELETE FROM lead_center_sessions WHERE "userId"=$1',[fixture.ids.admin]);expect((await api(admin,"/api/admin/intelligence/sources")).status).toBe(401);expect(await counts()).toEqual(baseline);expect(errors).toEqual([]);
});
