import {expect,test} from "@playwright/test";
import {mkdirSync,writeFileSync} from "node:fs";
import {renderDailyDigest} from "../../app/lib/operations/dailyDigest";
import {TRAFFIC_METRICS,type TrafficMetrics} from "../../app/lib/persistence/neonTrafficReport";
const ARTIFACT_DIR=process.env.AMM_QUALIFIED_CONVERSION_ARTIFACT_DIR || "output/playwright/qualified-conversion";
// Explicit local compiled UI only; all mutations intercepted. No SQL/delivery
// claim here (see qualified-conversion-postgres for real SQL evidence).
test.skip(process.env.AMM_QUALIFIED_CONVERSION_ACCEPTANCE!=="1","Explicit isolated UI acceptance required");
test.beforeEach(async({page,baseURL})=>{
 expect(process.env.PREVIEW_URL).toBeFalsy();
 const origin=new URL(baseURL!).origin;expect(["127.0.0.1","localhost"]).toContain(new URL(origin).hostname);
 await page.route("**/*",async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname==="/api/health/live")return route.fulfill({json:{ok:true,service:"ask-magic-mike",public_intake:"synthetic_qa"}});
  if(url.pathname==="/api/address-suggestions")return route.fulfill({json:{enabled:false}});
  if(route.request().method()!=="GET" || url.pathname.startsWith("/api/"))return route.abort();
  return route.continue();
 });
});
test("Brandon daily email review preview is responsive and honest about partial zero coverage",async({page})=>{
 const email=renderDailyDigest({coverage:"partial",reason:"Synthetic preview: collection began partway through day.",
  from:"2026-11-03T05:00:00Z",to:"2026-11-04T05:00:00Z",generatedAt:"2026-11-04T13:00:00Z",collectionStartedAt:"2026-11-03T23:00:00Z",
  metrics:Object.fromEntries(TRAFFIC_METRICS.map(k=>[k,0])) as TrafficMetrics});
 await page.setViewportSize({width:390,height:844});
 await page.setContent(email.html);
 await expect(page.getByRole("heading",{name:"Your daily operating brief"})).toBeVisible();
 await expect(page.getByRole("link",{name:"Open protected report"})).toHaveAttribute("href","https://www.askmagicmike.com/admin/distribution");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 mkdirSync(ARTIFACT_DIR,{recursive:true});
 writeFileSync(ARTIFACT_DIR+"/daily-email-preview.html",email.html);
 writeFileSync(ARTIFACT_DIR+"/daily-email-preview.txt",email.text);
 await page.screenshot({path:ARTIFACT_DIR+"/daily-email-390.png",fullPage:true});
});
for(const width of [320,375,390,768]) {
 test("cash-review and optional buyer address at "+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/sell?seller_option=cash-review");
  await expect(page.getByRole("combobox",{name:"Selling goal"})).toHaveValue("cash-review");
  await expect(page.getByRole("combobox",{name:"Property address",exact:true})).toHaveAttribute("autocomplete","street-address");
  await page.getByRole("combobox",{name:"Property address",exact:true}).fill("101 Synthetic Fixture Road Apt 4");
  await page.getByLabel("Name",{exact:true}).fill("INTERNAL QA DO NOT CONTACT");
  await page.getByLabel("Email",{exact:true}).fill("synthetic@example.test");
  await page.getByRole("button",{name:"Review property request",exact:true}).click();
  await expect(page.getByRole("region",{name:"Review your property request"})).toContainText("Request a cash/direct-purchase review");
  await expect(page.getByRole("button",{name:"Send property review request",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync(ARTIFACT_DIR,{recursive:true});
  await page.screenshot({path:ARTIFACT_DIR+"/cash-review-normal-"+width+".png",fullPage:true});
  await page.addStyleTag({content:"html{font-size:200% !important}"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:ARTIFACT_DIR+"/cash-review-"+width+".png",fullPage:true});
  await page.goto("/buy");
  await expect(page.getByRole("combobox",{name:"Property address (or provide a listing URL)",exact:true})).not.toHaveAttribute("required","");
  await page.getByRole("radio",{name:"A general home search",exact:true}).check();
  await expect(page.getByLabel("Desired area",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
