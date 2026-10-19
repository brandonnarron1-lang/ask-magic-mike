// @vitest-environment node
import { randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { bind, install, localQuery, psql, startDatabase, stopDatabase } from "../support/qa-audit-postgres";
import { evaluationBudget, restoreEvaluationCheckpoint } from "../../src/lib/intelligence/evaluation-budget";
import { journaledEvaluationBudget, openEvaluationJournal, type EvaluationJournal } from "../../src/lib/intelligence/evaluation-journal";
import { generateGroundedAnswer, type DevelopmentBinding } from "../../src/lib/intelligence/grounded-generation";
import { approvedPublicPassages } from "../../src/lib/intelligence/public-knowledge";

const ref="b".repeat(40),actor="synthetic-evaluation-operator",now=new Date("2026-10-18T00:00:00Z");
const binding:DevelopmentBinding={apiKey:"synthetic-noncredential",projectId:"proj_synthetic",projectName:"Ask Magic Mike R2 Development",organizationId:"org-synthetic",organizationName:"EyesUp Industries",excludedProjectIds:["proj_syntheticDefault"],verifiedNonproduction:true};
function capture(db:"amm_qa_upgrade"|"amm_qa_fresh"){
 const session=randomUUID();return JSON.parse(psql(bind("SELECT capture_public_lead_v1($1::jsonb,$2::jsonb,'{}'::jsonb,'disabled')",[JSON.stringify({id:session}),JSON.stringify({first_name:"INTERNAL QA",last_name:"DO NOT CONTACT",session_id:session,lead_type:"buyer",primary_intent:"buy",source:"internal_qa",email:"checkpoint@example.test",is_test:true,communication_suppressed:true,email_suppressed:true,sms_suppressed:true,request_idempotency_key:session})]),db)).lead_id as string;
}
const freshQuery={async query(sql:string,params:unknown[]=[]):Promise<Array<Record<string,unknown>>>{
 const bound=bind(sql,params);
 if(/^\s*(UPDATE|DELETE)\b/i.test(bound)&&!/\bRETURNING\b/i.test(bound)){psql(`SET ROLE service_role;${bound};`,"amm_qa_fresh");return[];}
 const select=/^\s*INSERT\b/i.test(bound)?`WITH rows AS (${bound}) SELECT coalesce(jsonb_agg(rows),'[]') FROM rows`:`SELECT coalesce(jsonb_agg(rows),'[]') FROM (${bound}) rows`;
 return JSON.parse(psql(`SET ROLE service_role;${select}`,"amm_qa_fresh"));
}};
const counts=(db:"amm_qa_upgrade"|"amm_qa_fresh")=>psql("SELECT jsonb_build_object('leads',(SELECT count(*) FROM leads),'outbox',(SELECT count(*) FROM lead_notifications),'assignments',(SELECT count(*) FROM agent_assignments),'audit',(SELECT count(*) FROM audit_logs))",db);
describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("evaluation restart: two owned synthetic PostgreSQL databases,no paid call",()=>{
 let dir="",journal:EvaluationJournal,originalLead="",freshLead="",originalCounts="",freshCounts="";
 const provider=vi.fn();
 beforeAll(async()=>{
  await startDatabase();install("amm_qa_upgrade",true);install("amm_qa_fresh",true);
  originalLead=capture("amm_qa_upgrade");freshLead=capture("amm_qa_fresh");originalCounts=counts("amm_qa_upgrade");freshCounts=counts("amm_qa_fresh");
  dir=mkdtempSync(path.join(tmpdir(),"amm-evaluation-checkpoint-test-"));chmodSync(dir,0o700);journal=openEvaluationJournal({directory:dir,projectId:"proj_synthetic"});
  vi.stubGlobal("fetch",vi.fn(async()=>{throw Error("external_network_forbidden");}));
 },120000);
 afterAll(()=>{journal?.close();stopDatabase();vi.unstubAllGlobals();if(dir.startsWith(path.join(tmpdir(),"amm-evaluation-checkpoint-test-")))rmSync(dir,{recursive:true});},20000);
 it("executes one mocked-provider sentinel through actual canonical SQL budget and durable receipt",async()=>{
  const passage=approvedPublicPassages.find(p=>p.intent==="buyer")!;
  provider.mockImplementation(async()=>Response.json({id:"synthetic-response",status:"completed",usage:{input_tokens:100,output_tokens:100},output:[{content:[{type:"output_text",text:JSON.stringify({passageIds:[passage.id],version:passage.version})}]}]}));
  const budget=journaledEvaluationBudget(evaluationBudget(localQuery,{leadId:originalLead,actor,phase:"sentinel"}),journal,{phase:"sentinel",sourceRef:ref});
  const key="r2:checkpoint:sentinel:0001",started=Date.now();
  const result=await generateGroundedAnswer("Help me buy a home",{binding,requestKey:key,model:"synthetic-model",pricing:{inputPerMillionUsd:1,outputPerMillionUsd:1,verifiedAt:now.toISOString()},budget,now:()=>now,transport:provider});
  expect(result.mode).toBe("validated_selection");journal.recordOutcome({key,sourceRef:ref,passed:true,mode:result.mode,latencyMs:Date.now()-started,citations:result.reply.citations.length});
  expect(psql("SELECT count(*) FROM ai_usage_events WHERE feature='r2_evaluation_sentinel'")).toBe("1");expect(provider).toHaveBeenCalledOnce();
 });
 it("preserves an ambiguous second attempt without an automatic retry",async()=>{
  provider.mockRejectedValueOnce(Error("synthetic_timeout"));
  const budget=journaledEvaluationBudget(evaluationBudget(localQuery,{leadId:originalLead,actor,phase:"sentinel"}),journal,{phase:"sentinel",sourceRef:ref});
  const key="r2:checkpoint:sentinel:0002";
  const result=await generateGroundedAnswer("Help me buy a home",{binding,requestKey:key,model:"synthetic-model",pricing:{inputPerMillionUsd:1,outputPerMillionUsd:1,verifiedAt:now.toISOString()},budget,now:()=>now,transport:provider});
  expect(result.mode).toBe("reconciliation_required");expect(journal.snapshot()[1].held).toBe(true);expect(provider).toHaveBeenCalledTimes(2);
 });
 it("rebuilds canonical reservation/usage state in a fresh database after reopening the private checkpoint",async()=>{
  const snapshot=journal.snapshot();journal.close();journal=openEvaluationJournal({directory:dir,projectId:"proj_synthetic"});expect(journal.snapshot()).toEqual(snapshot);
  expect(await restoreEvaluationCheckpoint(freshQuery,{leadId:freshLead,actor,records:journal.snapshot()})).toEqual({restored:2,providerCalls:0});
  expect(psql("SELECT count(*) FROM ai_budget_reservations WHERE feature='r2_evaluation_sentinel'","amm_qa_fresh")).toBe("2");
  expect(psql("SELECT count(*) FROM ai_usage_events WHERE feature='r2_evaluation_sentinel' AND fallback_reason='restored_private_evaluation_checkpoint'","amm_qa_fresh")).toBe("1");
  expect(provider).toHaveBeenCalledTimes(2);
 });
 it("refuses both old keys before SQL/provider and allows only a genuinely new budgeted case",async()=>{
  const budget=journaledEvaluationBudget(evaluationBudget(freshQuery,{leadId:freshLead,actor,phase:"sentinel"}),journal,{phase:"sentinel",sourceRef:ref});
  for(const row of journal.snapshot())expect(await budget.reserve({key:row.key,model:row.model,maximumUsd:row.maximumMicroUsd/1000000})).toEqual({authorized:false});
  expect(provider).toHaveBeenCalledTimes(2);
  const fixed=journaledEvaluationBudget(evaluationBudget(freshQuery,{leadId:freshLead,actor,phase:"fixed"}),journal,{phase:"fixed",sourceRef:ref});
  expect(await fixed.reserve({key:"r2:checkpoint:fixed:0001",model:"synthetic-model",maximumUsd:0.16})).toEqual({authorized:true});
  expect(counts("amm_qa_upgrade")).toBe(originalCounts);expect(counts("amm_qa_fresh")).toBe(freshCounts);
 });
 it("does not import into an existing partial budget or an unapproved lead",async()=>{
  await expect(restoreEvaluationCheckpoint(freshQuery,{leadId:freshLead,actor,records:journal.snapshot()})).rejects.toThrow("fresh_isolated_evaluation_budget_required");
  await expect(restoreEvaluationCheckpoint(freshQuery,{leadId:randomUUID(),actor,records:journal.snapshot()})).rejects.toThrow("suppressed_synthetic_evaluation_lead_required");
  expect(provider).toHaveBeenCalledTimes(2);expect(fetch).not.toHaveBeenCalled();
 });
});
