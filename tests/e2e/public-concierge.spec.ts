import {mkdirSync} from "node:fs";
import path from "node:path";
import {expect,test} from "@playwright/test";

test.skip(process.env.AMM_PUBLIC_CONCIERGE_ACCEPTANCE!=="1","Explicit disconnected local no-send opt-in required");
const built=process.env.AMM_E2E_BUILT==="1";
test.beforeAll(()=>{
  if(process.env.PREVIEW_URL||process.env.DATABASE_URL||process.env.OPENAI_API_KEY||process.env.RESEND_API_KEY||process.env.DATABASE_ENV!=="preview") throw Error("disconnected_credential_free_venue_required");
});
for(const width of [320,390,430,768,1440]) test(`${built?"compiled native Origin refusal":"native local cited answer and reviewed draft"} at ${width}`,async({page,baseURL})=>{
  const errors:string[]=[];const leadRequests:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(new URL(r.url()).pathname==="/api/leads")leadRequests.push(r.method());});
  await page.route("**/*",async route=>{
    if(new URL(route.request().url()).origin!==new URL(baseURL!).origin) return route.abort("blockedbyclient");
    return route.continue(); // Real app and handler; no canned answers/Origin rewrite.
  });
  await page.setViewportSize({width,height:1000});await page.goto("/ask");
  await expect(page.getByText("AI assistant for Mike's team",{exact:true})).toBeVisible();
  await page.getByRole("textbox",{name:/Your real estate question/}).fill("How do I buy a home?");
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/chat/message");
  await page.getByRole("button",{name:"Send Question",exact:true}).press("Enter");
  expect((await response).status()).toBe(built?403:200);
  if(built){
    await expect(page.getByRole("alert").filter({hasText:"The assistant's answer"})).toContainText("answer did not come through");
    await expect(page.getByRole("textbox",{name:/Question for local follow-up/})).toHaveCount(0);
  }else{
    await expect(page.getByRole("log",{name:"Conversation"})).toContainText("Current approved guidance is unavailable");
    await expect(page.getByRole("link",{name:"Our Town: approved service and intake requirements",exact:true})).toHaveCount(0);
    const question=page.getByRole("textbox",{name:/Question for local follow-up/});
    await expect(question).toHaveValue("How do I buy a home?");
    await question.fill(""); await expect(question).toBeVisible();
    await question.fill("My corrected synthetic buying-plan question.");
    await expect(page.getByLabel("Email",{exact:true})).toHaveValue("");
    await expect(page.getByRole("checkbox",{name:/I agree that Our Town Properties/})).not.toBeChecked();
  }
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
  if(!built) expect((await page.getByRole("textbox",{name:/Question for local follow-up/}).boundingBox())!.width).toBeGreaterThanOrEqual(120);
  const geometry=await page.evaluate(()=>({font:getComputedStyle(document.documentElement).fontSize,width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(geometry.font).toBe("32px");expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  const out=".amm-run/grounded-concierge-20261017/screenshots";mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,`${built?"built-refusal":"development-journey"}-${width}.png`),fullPage:true});
  if(!built&&width===390){
    await page.evaluate(()=>{document.documentElement.style.fontSize="100%";});
    await page.getByRole("log",{name:"Conversation"}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,"development-cited-answer-390-viewport.png")});
  }
  expect(leadRequests).toEqual([]);expect(errors).toEqual([]);
});
test("disabled governance refuses a static citation even without an Origin; no database or provider",async({request})=>{
  const response=await request.post("/api/chat/message",{data:{message:"Compare selling options",knowledge_version:"amm.public-knowledge.v1"}});
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({mode:"source_unavailable",citations:[]});
  expect(response.headers()["cache-control"]).toContain("private, no-store");
});
