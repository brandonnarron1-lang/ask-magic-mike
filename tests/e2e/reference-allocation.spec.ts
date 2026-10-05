import { expect,test } from "@playwright/test";
const widths=[320,390,768,1440];
for(const width of widths) {
 test(`Reference studio protected, responsive and no-send at ${width}px`,async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:1000},httpCredentials:{username:"",password:process.env.ADMIN_SECRET||"changeme-local"},reducedMotion:"reduce"});
  const page=await context.newPage(),errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/admin/message-previews",{waitUntil:"domcontentloaded"});
  const studio=page.getByRole("region",{name:"Reference-driven cross-channel studio"});
  await expect(studio).toBeVisible();
  await studio.getByLabel("Channel",{exact:true}).selectOption("web");
  for(const subtype of ["buyer","seller","cash_seller","investor_buyer","copilot","routing"]){
   await studio.getByLabel("Module / subtype",{exact:true}).selectOption(subtype);
   const card=studio.locator(`[data-reference-lead-card="${subtype}"]`);
   await expect(card).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
   await expect(studio.getByRole("button").first()).toBeDisabled();
   if(width===390||width===1440)await card.screenshot({path:`output/playwright/reference-${subtype}-${width}.png`});
   await studio.getByLabel("Disclosure tier",{exact:true}).selectOption("assigned");
   await expect(card.getByRole("heading",{name:"INTERNAL QA DO NOT CONTACT",exact:true})).toBeVisible();
   await card.locator("summary").click();
   await expect(card.getByText("Synthetic qualification example; not a production score.",{exact:true})).toBeVisible();
   await card.locator("summary").click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
   if(width===390||width===1440)await card.screenshot({path:`output/playwright/reference-${subtype}-assigned-${width}.png`});
   await studio.getByLabel("Disclosure tier",{exact:true}).selectOption("pre_claim");
  }
  await studio.getByLabel("Module / subtype",{exact:true}).selectOption("buyer");
  await studio.getByLabel("Channel",{exact:true}).selectOption("email");
  const email=page.frameLocator('iframe[title="Reference allocation email"]');
  await expect(email.getByRole("link",{name:"Review Claim / Pass"})).toBeVisible();
  expect(await email.locator("body").evaluate(e=>e.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  await email.locator("img").evaluate(e=>{(e as HTMLElement).style.display="none";});
  await expect(email.getByText("INTERNAL QA — DO NOT CONTACT",{exact:true}).first()).toBeVisible();
  await studio.getByRole("heading",{name:"Email · compiled HTML + text"}).scrollIntoViewIfNeeded();
  if(width===390||width===1440)await studio.screenshot({path:`output/playwright/reference-email-images-off-${width}.png`});
  await studio.getByLabel("Channel",{exact:true}).selectOption("sms");
  await expect(studio.locator("pre")).toContainText("CLAIM K7M2Q8HJ");
  await expect(studio.locator("pre")).toContainText("STOP");
  await studio.getByLabel("Offer state",{exact:true}).selectOption("expired");
  await expect(studio.locator("pre")).not.toContainText("CLAIM K7M2Q8HJ");
  await studio.getByLabel("Channel",{exact:true}).selectOption("mms");
  const image=studio.getByRole("img");
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(720);
  await expect(studio.locator("pre")).toContainText("STOP");
  await expect(studio.locator("pre")).toContainText("Original offer deadline");
  expect(errors).toEqual([]);
  await context.close();
 });
}
test("Studio keyboard and 200% text zoom remain operable",async({browser})=>{
 const context=await browser.newContext({viewport:{width:1280,height:1000},httpCredentials:{username:"",password:process.env.ADMIN_SECRET||"changeme-local"}});
 const page=await context.newPage();await page.goto("/admin/message-previews",{waitUntil:"domcontentloaded"});
 const studio=page.getByRole("region",{name:"Reference-driven cross-channel studio"});
 await studio.getByLabel("Channel",{exact:true}).selectOption("web");
 // Wait for the client update, not only the server-rendered native control.
 await expect(studio.locator("iframe")).toHaveCount(0);
 await studio.getByLabel("Module / subtype",{exact:true}).focus();
 await expect(studio.getByLabel("Module / subtype",{exact:true})).toBeFocused();
 // Native keyboard type-ahead is deterministic on Mac and Linux headless.
 await page.keyboard.press("s");await page.keyboard.press("Enter");
 await expect(studio.getByLabel("Module / subtype",{exact:true})).toHaveValue("seller");
 await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await studio.screenshot({path:"output/playwright/reference-text-zoom-200.png"});
 await context.close();
});
test("Routing board filters canonical-shaped rows without enabling preview mutations",async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:1000},httpCredentials:{username:"",password:process.env.ADMIN_SECRET||"changeme-local"}});
 const page=await context.newPage();await page.goto("/admin/message-previews",{waitUntil:"domcontentloaded"});
 const studio=page.getByRole("region",{name:"Reference-driven cross-channel studio"});
 await studio.getByLabel("Channel",{exact:true}).selectOption("web");await studio.getByLabel("Module / subtype",{exact:true}).selectOption("routing");
 const board=studio.getByRole("region",{name:"Smart Routing + Next Steps",exact:true});
 await expect(board.getByRole("list",{name:"Filtered allocation candidates"}).getByRole("listitem")).toHaveCount(2);
 await board.getByText("Filter routing queue",{exact:true}).click();
 await board.getByLabel("Routing Intent",{exact:true}).selectOption("seller");
 await expect(board.getByRole("list",{name:"Filtered allocation candidates"}).getByRole("listitem")).toHaveCount(1);
 await board.getByLabel("Routing Offer state",{exact:true}).selectOption("expired");
 await expect(board.getByRole("list",{name:"Filtered allocation candidates"}).getByRole("listitem")).toHaveCount(0);
 await expect(board.getByRole("list",{name:"Filtered allocation offers"}).getByRole("listitem")).toHaveCount(1);
 await board.getByText("Queue health, policy and expiry controls",{exact:true}).click();
 await expect(board.getByRole("button",{name:"Process allocation-only expiry"})).toBeDisabled();
 await board.getByText("Queue health, policy and expiry controls",{exact:true}).click();
 await board.getByRole("button",{name:"Clear routing filters"}).click();
 await expect(board.getByRole("list",{name:"Filtered allocation candidates"}).getByRole("listitem")).toHaveCount(2);
 await board.getByText("Filter routing queue",{exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  if(width===390||width===1440)await board.screenshot({path:`output/playwright/reference-routing-board-${width}.png`});
 }
 await page.setViewportSize({width:1280,height:1000});await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});
 await board.getByText("Filter routing queue",{exact:true}).click();
 await board.getByLabel("Routing Town",{exact:true}).focus();await expect(board.getByLabel("Routing Town",{exact:true})).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await context.close();
});
