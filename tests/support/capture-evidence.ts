import {writeFileSync} from "node:fs";
import type {Page} from "@playwright/test";

type CapturePage=Pick<Page,"screenshot"|"evaluate">;
const signature=Buffer.from([137,80,78,71,13,10,26,10]);

/** Required full-page evidence, not a retry of product assertions. A single
 * recognized Chromium capture failure may retry after paint settles. Both
 * attempts remain visible; missing/invalid pixels and other errors still fail.
 * Two5s capture bounds remain inside the unchanged60s enclosing test limit. */
export async function captureFullPageEvidence(page:CapturePage,path:string):Promise<Buffer>{
 const attempts:Array<{attempt:number;at:string;status:"PASS"|"FAIL";code?:string;bytes?:number}>=[];
 const record=()=>writeFileSync(path+".capture.json",JSON.stringify({version:1,required:true,maximumAttempts:2,captureTimeoutMs:5000,attempts},null,2)+"\n",{mode:0o600});
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const png=await page.screenshot({path,type:"png",fullPage:true,animations:"disabled",timeout:5000});
   if(png.length<45||!png.subarray(0,8).equals(signature)||png.subarray(12,16).toString()!=="IHDR"||png.subarray(-8,-4).toString()!=="IEND"||png.readUInt32BE(16)===0||png.readUInt32BE(20)===0)throw new Error("capture_png_invalid");
   attempts.push({attempt,at:new Date().toISOString(),status:"PASS",bytes:png.length});record();return png;
  }catch(error){
   const captureUnavailable=error instanceof Error&&/Protocol error \(Page\.captureScreenshot\): Unable to capture screenshot/.test(error.message);
   attempts.push({attempt,at:new Date().toISOString(),status:"FAIL",code:captureUnavailable?"chromium_capture_unavailable":"not_retryable"});record();
   if(!captureUnavailable||attempt===2)throw error;
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
  }
 }
 throw new Error("required_capture_missing");
}
