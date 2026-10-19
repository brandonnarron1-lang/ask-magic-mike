// @vitest-environment node
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { journaledEvaluationBudget, openEvaluationJournal } from "../../src/lib/intelligence/evaluation-journal";

const directories: string[] = [], ref="a".repeat(40);
function directory(){ const d=mkdtempSync(path.join(tmpdir(),"amm-evaluation-journal-test-"));chmodSync(d,0o700);directories.push(d);return d; }
const request=(n:number,phase:"sentinel"|"fixed"="sentinel")=>({key:`r2:synthetic:${phase}:${String(n).padStart(4,"0")}`,model:"synthetic-model",maximumUsd:0.16,phase,sourceRef:ref});
const settle=(key:string)=>({key,inputTokens:100,outputTokens:100,costUsd:0.0002,providerId:"synthetic-response"});
const outcome=(key:string)=>({key,sourceRef:ref,passed:true,mode:"validated_selection" as const,latencyMs:10,citations:1});
afterEach(()=>{vi.restoreAllMocks();for(const d of directories.splice(0)){if(!d.startsWith(path.join(tmpdir(),"amm-evaluation-journal-test-")))throw Error("owned_fixture_only");rmSync(d,{recursive:true});}});
describe("durable private evaluation receipts, no key or paid provider",()=>{
 it("restores settled and ambiguous reservations after closing the process handle",()=>{
  const d=directory(),j=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});
  expect(j.reserve(request(1))).toBe(true);j.settle(settle(request(1).key));j.recordOutcome(outcome(request(1).key));
  expect(j.reserve(request(2))).toBe(true);j.hold(request(2).key);const before=j.snapshot();j.close();
  const reopened=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});try{
   expect(reopened.snapshot()).toEqual(before);expect(reopened.reserve(request(1))).toBe(false);expect(reopened.reserve(request(2))).toBe(false);
   expect(reopened.totals()).toMatchObject({maximumOrAccountedUsd:0.1602,sentinelAttempts:2});
  }finally{reopened.close();}
 });
 it("never treats a monthly reset, failed output or a held request as a new allowance",()=>{
  const j=openEvaluationJournal({directory:directory(),projectId:"proj_synthetic"});try{
   for(let i=1;i<=3;i++){expect(j.reserve(request(i))).toBe(true);j.hold(request(i).key);}
   expect(j.reserve(request(4))).toBe(false);expect(j.reserve(request(1,"fixed"))).toBe(false);
   expect(j.totals()).toMatchObject({sentinelMaximumOrAccountedUsd:0.48,sentinelAttempts:3});
  }finally{j.close();}
 });
 it("requires validated, settled sentinel evidence before fixed paid execution",()=>{
  const j=openEvaluationJournal({directory:directory(),projectId:"proj_synthetic"});try{
   expect(j.reserve(request(1,"fixed"))).toBe(false);j.reserve(request(1));
   expect(()=>j.recordOutcome(outcome(request(1).key))).toThrow("invalid_evaluation_outcome");
   j.settle(settle(request(1).key));j.recordOutcome(outcome(request(1).key));expect(j.reserve(request(1,"fixed"))).toBe(true);
   expect(()=>j.recordOutcome(outcome(request(1).key))).toThrow("invalid_evaluation_outcome");
  }finally{j.close();}
 });
 it("enforces lifetime $10 and at most three sentinel attempts across reopen",()=>{
  const d=directory(),j=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});j.reserve(request(1));j.settle(settle(request(1).key));j.recordOutcome(outcome(request(1).key));
  let count=0;for(let i=1;i<=65;i++)if(j.reserve(request(i,"fixed")))count++;
  expect(count).toBe(62);j.close();const reopened=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});try{
   expect(reopened.reserve(request(66,"fixed"))).toBe(false);expect(reopened.totals().maximumOrAccountedUsd).toBe(9.9202);
  }finally{reopened.close();}
 });
 it("blocks concurrent processes/stale locks without deleting or stealing a lock",()=>{
  const d=directory(),j=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});try{
   expect(()=>openEvaluationJournal({directory:d,projectId:"proj_synthetic"})).toThrow();
   expect(readFileSync(j.file+".lock","utf8")).toContain(String(process.pid));
  }finally{j.close();}
  writeFileSync(path.join(d,"r2-evaluation-journal.v1.jsonl.lock"),"dead process requires manual reconciliation",{mode:0o600});
  expect(()=>openEvaluationJournal({directory:d,projectId:"proj_synthetic"})).toThrow();
 });
 it.each(["truncated","tampered"])("fails closed on a %s receipt;does not silently repair it",problem=>{
  const d=directory(),j=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});j.reserve(request(1));const file=j.file;j.close();
  const original=readFileSync(file,"utf8");writeFileSync(file,problem==="truncated"?original.slice(0,-1):original.replace("synthetic-model","different-model"));
  expect(()=>openEvaluationJournal({directory:d,projectId:"proj_synthetic"})).toThrow();
  expect(readFileSync(file,"utf8")).not.toBe(original);
 });
 it("refuses another project,changed request identity and unsafe storage permissions",()=>{
  const d=directory(),j=openEvaluationJournal({directory:d,projectId:"proj_synthetic"});j.reserve(request(1));
  expect(()=>j.reserve({...request(1),model:"changed-model"})).toThrow("evaluation_replay_conflict");j.close();
  expect(()=>openEvaluationJournal({directory:d,projectId:"proj_other"})).toThrow("evaluation_project_binding_mismatch");
  chmodSync(d,0o755);expect(()=>openEvaluationJournal({directory:d,projectId:"proj_synthetic"})).toThrow("private_evaluation_directory_required");
 });
 it("refuses symlink targets rather than overwriting another file",()=>{
  const d=directory(),other=directory();writeFileSync(path.join(other,"protected"),"unchanged",{mode:0o600});
  symlinkSync(path.join(other,"protected"),path.join(d,"r2-evaluation-journal.v1.jsonl"));
  expect(()=>openEvaluationJournal({directory:d,projectId:"proj_synthetic"})).toThrow();expect(readFileSync(path.join(other,"protected"),"utf8")).toBe("unchanged");
 });
 it("fsyncs the reservation before asking existing SQL to authorize a call",async()=>{
  const j=openEvaluationJournal({directory:directory(),projectId:"proj_synthetic"});
  const sql={reserve:vi.fn(async()=>{expect(readFileSync(j.file,"utf8")).toContain(request(1).key);return{authorized:true};}),settle:vi.fn(async()=>{}),hold:vi.fn(async()=>{})};
  try{const budget=journaledEvaluationBudget(sql,j,{phase:"sentinel",sourceRef:ref});
   expect(await budget.reserve(request(1))).toEqual({authorized:true});await budget.hold({key:request(1).key,reason:"provider_outcome_or_usage_unverified"});
   expect(await budget.reserve(request(1))).toEqual({authorized:false});expect(sql.reserve).toHaveBeenCalledOnce();
  }finally{j.close();}
 });
});
