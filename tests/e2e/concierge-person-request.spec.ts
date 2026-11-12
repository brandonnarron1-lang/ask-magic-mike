import {mkdirSync} from "node:fs";
import {expect,test} from "@playwright/test";

test.skip(process.env.AMM_PUBLIC_CONCIERGE_ACCEPTANCE!=="1","Explicit disconnected no-send UI opt-in required");
test.beforeAll(()=>{
  if(process.env.PREVIEW_URL||process.env.DATABASE_URL||process.env.OPENAI_API_KEY||process.env.RESEND_API_KEY||process.env.DATABASE_ENV!=="preview")throw Error("disconnected_credential_free_venue_required");
});
for(const width of [320,390,430,768,1440])test(`immediate person request / safe retry / retained widget state at ${width}`,async({page,baseURL})=>{
  const errors:string[]=[],captures:string[]=[],appointments:unknown[]=[];
  let chatCalls=0;
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==new URL(baseURL!).origin)return route.abort("blockedbyclient");
    if(url.pathname==="/api/chat/message") {chatCalls++;return route.fulfill({status:503,json:{error:"synthetic AI unavailable"}});}
    if(url.pathname==="/api/leads") {
      captures.push(request.postData()!);
      return captures.length===1 ? route.fulfill({status:503,json:{error:"Synthetic save uncertainty"}})
        : route.fulfill({status:200,json:{lead_id:"00000000-0000-4000-8000-000000009911",session_id:"00000000-0000-4000-8000-000000009912",review_only:false}});
    }
    if(url.pathname==="/api/appointments/request") {appointments.push(request.postDataJSON());return route.fulfill({status:200,json:{status:"requested",appointment_status:"requested"}});}
    // Every remaining mutation is refused by the fixture, never forwarded.
    if(request.method()!=="GET")return route.fulfill({status:503,json:{error:"isolated_fixture_no_write"}});
    return route.continue();
  });
  await page.setViewportSize({width,height:1000});await page.goto("/ask");
  await expect(page.getByText("AI assistant for Our Town Properties, Inc.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Request a person",exact:true}).focus();
  await page.keyboard.press("Enter");
  const form=page.locator("#ask-person-request");
  await expect(form.getByRole("textbox",{name:/Question for local follow-up/})).toBeFocused();
  expect(chatCalls).toBe(0);expect(captures).toHaveLength(0);
  await form.getByRole("button",{name:"Request local follow-up",exact:true}).click();
  await expect(form.getByRole("alert")).toContainText("email address or phone number");
  await form.getByLabel("Phone",{exact:true}).fill("252-555-0199");
  await form.getByRole("checkbox",{name:/I agree that Our Town Properties/}).check();
  await form.getByRole("button",{name:"Request local follow-up",exact:true}).click();
  await expect(form.getByRole("alert")).toContainText("outcome is not confirmed");
  await expect(form.getByLabel("Phone",{exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Request a person",exact:true}).click();
  await form.getByRole("button",{name:"Retry identical follow-up request"}).click();
  await expect(page.getByText(/Your request is saved\./)).toBeVisible();
  expect(captures).toHaveLength(2);expect(captures[1]).toBe(captures[0]);expect(appointments).toHaveLength(0);
  await expect(page.getByText(/A requested time is not a confirmed appointment/)).toBeVisible();
  await page.getByLabel("Preferred day (optional)").fill("2026-12-01");
  await page.getByRole("button",{name:"Request a conversation",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Your appointment request has been received."})).toBeVisible();
  expect(appointments).toHaveLength(1);
  expect(appointments[0]).toMatchObject({preferences:{day:"2026-12-01",timezone:"America/New_York"}});
  await expect(page.getByText("No calendar event has been created yet.",{exact:false})).toBeVisible();
  const out="output/playwright/concierge-person";mkdirSync(out,{recursive:true});
  await page.screenshot({path:`${out}/ask-requested-${width}.png`,fullPage:true});

  await page.goto("/widget/v1");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await page.getByRole("button",{name:"Request a person",exact:true}).press("Enter");
  const widgetForm=page.locator("#ask-person-request");
  const question=widgetForm.getByRole("textbox",{name:/Question for local follow-up/});
  await expect(question).toBeFocused();
  await question.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}/widget-person-${width}-viewport.png`});
  await question.fill("Synthetic retained request; no real consumer.");
  await page.getByRole("tab",{name:"Buying Help",exact:true}).click();
  await page.getByRole("button",{name:"Request a person",exact:true}).click();
  await expect(question).toHaveValue("Synthetic retained request; no real consumer.");
  await expect(question).toBeFocused();
  await expect(page.getByRole("link",{name:"Open full form",exact:true})).toHaveAttribute("href",/ask\?/);
  await expect(page.getByRole("link",{name:"Open full form",exact:true})).toHaveAttribute("rel","noopener noreferrer");
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await question.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}/widget-person-enlarged-${width}-viewport.png`});
  await page.screenshot({path:`${out}/widget-person-enlarged-${width}.png`,fullPage:true});
  expect(captures).toHaveLength(2);expect(chatCalls).toBe(0);expect(errors).toEqual([]);
});
