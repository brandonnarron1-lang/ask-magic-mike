#!/usr/bin/env node
// Anonymous, disposable browser only. Public GETs; no forms, sessions or sends.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
export const placements = [
  { key:"wordpress_homepage_ask_mike",url:"https://www.ourtownproperties.com/",selector:"#amm-homepage-choice",routes:["/home-value","/buy","/sell"],count:3 },
  { key:"wordpress_we_buy_homes",url:"https://www.ourtownproperties.com/we-buy-homes/",selector:'[data-amm-source="seller_page_cta"]',routes:["/sell"],count:1 },
  { key:"wordpress_listing_buyer",url:"https://www.ourtownproperties.com/property-search/",selector:'[data-amm-source="listing_buyer_cta"]',routes:["/buy"],count:1 },
];
export function verifyDestination(value, placement, index) {
  const u=new URL(value);
  if(u.origin!=="https://www.askmagicmike.com" || u.pathname!==placement.routes[index] ||
    u.searchParams.get("utm_source")!=="ourtownproperties" || u.searchParams.get("utm_medium")!=="owned_media" ||
    u.searchParams.get("utm_campaign")!=="amm_owned_demand_2026" || u.searchParams.get("utm_content")!==placement.key ||
    (u.pathname==="/sell" && u.searchParams.get("seller_option")!=="compare")) throw new Error("placement_destination_mismatch");
}
export async function run(output) {
  await mkdir(output,{recursive:true,mode:0o700});
  const observations=[];let blockedMutations=0;
  const browser=await chromium.launch({headless:true});
  try {
    for(const p of placements){
      const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
      context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(30000);
      await context.route("**/*",route=>["GET","HEAD","OPTIONS"].includes(route.request().method())?route.continue():(blockedMutations++,route.abort()));
      const page=await context.newPage();
      const r=await page.goto(p.url,{waitUntil:"domcontentloaded",timeout:30000});
      if(!r?.ok()) throw new Error(`public_get_${r?.status()}`);
      const links=page.locator(p.selector).locator('a[href*="askmagicmike.com"]');
      if(await links.count()!==p.count)throw new Error("ordinary_anchor_count_mismatch");
      const targets=[];
      for(let i=0;i<p.count;i++){
        if(i>0)await page.goto(p.url,{waitUntil:"domcontentloaded"});
        const link=page.locator(p.selector).locator('a[href*="askmagicmike.com"]').nth(i);
        await link.scrollIntoViewIfNeeded();if(!await link.isVisible())throw new Error("no_js_link_hidden");
        const href=await link.getAttribute("href");verifyDestination(href,p,i);
        const label=await link.textContent();
        const blank=await link.getAttribute("target")==="_blank";
        let destination;
        if(blank){const popup=page.waitForEvent("popup");await link.press("Enter");destination=await popup;await destination.waitForLoadState("domcontentloaded");}
        else{await Promise.all([page.waitForURL(href,{waitUntil:"domcontentloaded"}),link.press("Enter")]);destination=page;}
        verifyDestination(destination.url(),p,i);targets.push({label,href,arrived:destination.url()});
        if(blank)await destination.close();
      }
      observations.push({placement:p.key,mode:"new-context-javaScriptEnabled:false-before-navigation",observedAt:new Date().toISOString(),status:"PASS",targets});
      await context.close();
    }
    for(const width of [390,1440])for(const p of placements){
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
      context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(30000);
      await context.route("**/*",route=>["GET","HEAD","OPTIONS"].includes(route.request().method())?route.continue():(blockedMutations++,route.abort()));
      const page=await context.newPage();await page.goto(p.url,{waitUntil:"domcontentloaded",timeout:30000});
      // Dismiss the site's existing non-binding cookie notice normally inside
      // this disposable context. Do not hide an overlay with CSS or alter consent configuration.
      // This site's notice uses a visible text control without a button/link
      // role; use its observed exact label rather than guessing semantic markup.
      const decline=page.getByText("Decline",{exact:true});
      // The notice is injected after DOMContentLoaded. Wait for its actual UI,
      // not a fixed sleep, before declaring it absent or checking hit targets.
      await decline.first().waitFor({state:"visible",timeout:5000}).catch(()=>undefined);
      let cookieNotice="not present after bounded 5s notice wait";if(await decline.count()&&await decline.first().isVisible()){await decline.first().click();await decline.first().waitFor({state:"hidden",timeout:5000});cookieNotice="Decline activated normally in disposable browser";}
      const region=page.locator(p.selector);await region.scrollIntoViewIfNeeded();
      // Save ALL computed sizes before any mutation. Assign an absolute 2x
      // value to every element exactly once: inherited sizes cannot compound.
      const enlargement=await region.evaluate(root=>{
        const all=[root,...root.querySelectorAll("*")];
        const before=all.map(el=>{const s=getComputedStyle(el);return{el,font:parseFloat(s.fontSize),line:s.lineHeight};});
        before.forEach(({el,font,line})=>{el.style.fontSize=`${font*2}px`;el.style.lineHeight=line==="normal"?"normal":`${parseFloat(line)*2}px`;});
        const measured=before.filter(({el})=>el.matches("h1,h2,h3,p,a")).map(({el,font})=>({tag:el.tagName,text:el.textContent.trim().slice(0,160),before:font,after:parseFloat(getComputedStyle(el).fontSize)}));
        return{method:"automation-only exact computed-font and line-height doubling; not native zoom",measured};
      });
      if(!enlargement.measured.length || enlargement.measured.some(m=>Math.abs(m.after-m.before*2)>.05))throw new Error("text_not_actually_doubled");
      const links=region.locator('a[href*="askmagicmike.com"]');const evidence=[];
      for(let i=0;i<await links.count();i++){
        const link=links.nth(i);await link.press("Shift+Tab");await page.keyboard.press("Tab");await link.scrollIntoViewIfNeeded();
        evidence.push(await link.evaluate(el=>{
          const r=el.getBoundingClientRect();const s=getComputedStyle(el);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const textRects=[];const hiddenHints=[];
          while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const parent=n.parentElement;const css=getComputedStyle(parent);
            // Beaver's deliberate screen-reader-only new-tab hint is retained
            // in the accessible name, not misclassified as visible clipped copy.
            if(parent.closest('.screen-reader-text,.fl-screen-reader-text,.sr-only')&&(css.clipPath!=="none"||css.clip!=="auto")){hiddenHints.push({text:n.textContent.trim(),clip:css.clip,clipPath:css.clipPath});continue;}
            const range=document.createRange();range.selectNodeContents(n);textRects.push(...range.getClientRects());}
          return{text:el.textContent.trim(),focused:document.activeElement===el,focusVisible:el.matches(":focus-visible"),width:r.width,height:r.height,font:s.fontSize,
            hit:hit===el||el.contains(hit),hitElement:hit?{tag:hit.tagName,id:hit.id,class:hit.className}:null,fullyVisible:textRects.every(t=>t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top-1&&t.bottom<=r.bottom+1),
            noClipping:el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1,hiddenHints};
        }));
      }
      const geometry=await region.evaluate(el=>{const r=el.getBoundingClientRect();const blocks=[...el.querySelectorAll("h1,h2,h3,p,a")].filter(e=>getComputedStyle(e).display!=="none");let overlaps=0;
        for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const a=blocks[i],b=blocks[j];if(a.contains(b)||b.contains(a))continue;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1)overlaps++;}
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let visibleTextFits=true;while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const parent=n.parentElement;const css=getComputedStyle(parent);if(css.display==='none'||css.visibility==='hidden'||(parent.closest('.screen-reader-text,.fl-screen-reader-text,.sr-only')&&(css.clipPath!=='none'||css.clip!=='auto')))continue;const range=document.createRange();range.selectNodeContents(n);for(const t of range.getClientRects())if(t.width>0&&(t.left<r.left-1||t.right>r.right+1))visibleTextFits=false;}
        return{viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,regionWidth:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overlaps,visibleTextFits};});
      const pass=evidence.every(e=>e.focused&&e.focusVisible&&e.hit&&e.fullyVisible&&e.noClipping)&&geometry.visibleTextFits&&geometry.pageWidth<=width+1&&geometry.overlaps===0;
      await region.screenshot({path:path.join(output,`${p.key}-${width}-text200.png`)});
      observations.push({placement:p.key,width,mode:"simulated-text200",observedAt:new Date().toISOString(),status:pass?"PASS":"FAIL",cookieNotice,enlargement,links:evidence,geometry});
      await context.close();
    }
  } finally {await browser.close();await writeFile(path.join(output,"report.json"),JSON.stringify({at:new Date().toISOString(),venue:"disposable anonymous installed Chromium; no physical-device/native-zoom proof",blockedMutations,observations},null,2),{mode:0o600});}
  return observations;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const i=process.argv.indexOf("--output");const output=path.resolve(i>=0?process.argv[i+1]:"output/playwright/wordpress-placement-resilience");
  const results=await run(output);console.log(JSON.stringify({checks:results.length,pass:results.filter(r=>r.status==="PASS").length,fail:results.filter(r=>r.status!=="PASS").length,output}));if(results.some(r=>r.status!=="PASS"))process.exitCode=1;
}
