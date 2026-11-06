// @vitest-environment node
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it,vi} from "vitest";
import type {Page} from "@playwright/test";
import {captureFullPageEvidence} from "./support/capture-evidence";

const owned:string[]=[];
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),"amm-capture-evidence-"));owned.push(dir);
 const path=join(dir,"required.png"),png=readFileSync("public/brand/black-diamond/our-town-logo.png");
 const screenshot=vi.fn().mockResolvedValue(png),evaluate=vi.fn().mockResolvedValue(undefined);
 return{path,png,screenshot,evaluate,page:{screenshot,evaluate} as unknown as Pick<Page,"screenshot"|"evaluate">,journal:()=>JSON.parse(readFileSync(path+".capture.json","utf8"))};
}
afterEach(()=>{for(const dir of owned.splice(0))rmSync(dir,{recursive:true});});
const transient=()=>new Error("page.screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot");
describe("required capture evidence",()=>{
 it("requires complete PNG framing once with the bounded full-page options",async()=>{
  const f=fixture();expect(await captureFullPageEvidence(f.page,f.path)).toEqual(f.png);
  expect(f.screenshot).toHaveBeenCalledTimes(1);expect(f.screenshot).toHaveBeenCalledWith({path:f.path,type:"png",fullPage:true,animations:"disabled",timeout:5000});
  expect(f.journal().attempts).toEqual([expect.objectContaining({attempt:1,status:"PASS",bytes:f.png.length})]);expect(f.evaluate).not.toHaveBeenCalled();
 });
 it("preserves one recognized failed capture before requiring a successful second capture",async()=>{
  const f=fixture();f.screenshot.mockRejectedValueOnce(transient());await captureFullPageEvidence(f.page,f.path);
  expect(f.evaluate).toHaveBeenCalledTimes(1);expect(f.screenshot).toHaveBeenCalledTimes(2);
  expect(f.journal().attempts.map((r:{status:string})=>r.status)).toEqual(["FAIL","PASS"]);
 });
 it("fails after the second compositor failure without a third attempt",async()=>{
  const f=fixture();f.screenshot.mockRejectedValue(transient());await expect(captureFullPageEvidence(f.page,f.path)).rejects.toThrow("Unable to capture screenshot");
  expect(f.screenshot).toHaveBeenCalledTimes(2);expect(f.journal().attempts.map((r:{status:string})=>r.status)).toEqual(["FAIL","FAIL"]);
 });
 it("never retries navigation, closed-browser or other unrelated failures",async()=>{
  const f=fixture();f.screenshot.mockRejectedValue(new Error("Target page has been closed"));await expect(captureFullPageEvidence(f.page,f.path)).rejects.toThrow("closed");
  expect(f.screenshot).toHaveBeenCalledTimes(1);expect(f.evaluate).not.toHaveBeenCalled();expect(f.journal().attempts[0].status).toBe("FAIL");
 });
 it("rejects malformed or empty image evidence instead of reporting a pass",async()=>{
  const f=fixture();f.screenshot.mockResolvedValue(Buffer.alloc(0));await expect(captureFullPageEvidence(f.page,f.path)).rejects.toThrow("capture_png_invalid");
  expect(f.screenshot).toHaveBeenCalledTimes(1);expect(f.journal().attempts[0].status).toBe("FAIL");
 });
 it("requires a valid nonzero image even after the recognized transient failure",async()=>{
  const f=fixture();f.png.writeUInt32BE(0,20);f.screenshot.mockRejectedValueOnce(transient());await expect(captureFullPageEvidence(f.page,f.path)).rejects.toThrow("capture_png_invalid");
  expect(f.screenshot).toHaveBeenCalledTimes(2);expect(f.journal().attempts.map((r:{status:string})=>r.status)).toEqual(["FAIL","FAIL"]);
 });
});
