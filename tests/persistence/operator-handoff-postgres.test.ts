// @vitest-environment node
import {createHash,randomUUID} from "node:crypto";
import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {bind,install,literal,localQuery,psql,startDatabase,stopDatabase} from "../support/qa-audit-postgres";
import {prepareOperatorHandoff} from "../../src/lib/intelligence/operator-handoff";
import {leadFactsFingerprint,loadLeadIntelligenceFacts} from "../../src/lib/ai/neon-intelligence";
import type {LeadCenterPrincipal} from "../../src/lib/admin/rbac-policy";

const actor=randomUUID(),otherActor=randomUUID(),agent="00000000-0000-4000-8000-000000009901";
const principal:LeadCenterPrincipal={userId:actor,role:"primary_lead_owner",agentId:agent,email:"operator@example.test",name:"SYNTHETIC OPERATOR"};
function lead(test=false){const session=randomUUID();return JSON.parse(psql(bind("SELECT capture_public_lead_v1($1::jsonb,$2::jsonb,'{}'::jsonb,'disabled')",[JSON.stringify({id:session}),JSON.stringify({session_id:session,first_name:"SYNTHETIC",last_name:"HANDOFF DO NOT CONTACT",email:"handoff@example.test",lead_type:"buyer",primary_intent:"buy",source:"isolated_handoff",is_test:test,communication_suppressed:test,email_suppressed:true,sms_suppressed:true,request_idempotency_key:session})]))).lead_id as string;}
function assign(id:string){psql(`UPDATE leads SET assigned_agent_id=${literal(agent)} WHERE id=${literal(id)}`);}
function review(key:string,version:number,action="approve",who=actor,content=""){
 return JSON.parse(psql(bind("SELECT review_r2_handoff_v1($1::uuid,$2,$3,$4,$5,$6)",[key,version,action,content,content?createHash("sha256").update(content).digest("hex"):"",who])));
}
const counts=()=>psql("SELECT jsonb_build_object('leads',(SELECT count(*) FROM leads),'outbox',(SELECT count(*) FROM lead_notifications),'assignments',(SELECT count(*) FROM agent_assignments),'tasks',(SELECT count(*) FROM tasks),'appointments',(SELECT count(*) FROM lead_appointments),'consent',(SELECT count(*) FROM consents))");
describe.runIf(process.env.AMM_QA_POSTGRES_TEST==="1")("operator handoff: existing SQL stores,synthetic-only,no AI or sends",()=>{
 beforeAll(async()=>{await startDatabase();install("amm_qa_upgrade",true);
  psql(`INSERT INTO lead_center_users(id,name,email,role,"agentId") VALUES(${literal(actor)},'SYNTHETIC OPERATOR','operator@example.test','primary_lead_owner',${literal(agent)}),(${literal(otherActor)},'SYNTHETIC OTHER','other@example.test','approved_agent',${literal(randomUUID())});`);
  vi.stubGlobal("fetch",vi.fn(async()=>{throw Error("outbound_forbidden");}));
 },120000);
 afterAll(()=>{stopDatabase();vi.unstubAllGlobals();},20000);
 it("prepares one replay-safe job,brief and review;legacy facts hash is different but current handoff approval succeeds",async()=>{
  const id=lead();assign(id);const before=counts();
  const first=await prepareOperatorHandoff(localQuery,principal,id),again=await prepareOperatorHandoff(localQuery,principal,id);
  expect(again.draft.id).toBe(first.draft.id);expect(again.replayed).toBe(true);
  expect(first.draft.model).toBe("none");expect(first.draft.content).toContain("not scheduled");
  const loaded=await loadLeadIntelligenceFacts(localQuery as never,id,agent);expect(loaded).not.toBeNull();
  expect(first.draft.source_fingerprint).not.toBe(leadFactsFingerprint(loaded!.facts));
  const approved=review(String(first.draft.draft_key),1);expect(approved).toMatchObject({ok:true,version:2,status:"approved"});
  expect(psql(`SELECT count(*) FROM ai_intelligence_jobs WHERE lead_id=${literal(id)}`)).toBe("1");
  expect(psql(`SELECT count(*) FROM lead_action_reviews WHERE lead_id=${literal(id)}`)).toBe("1");
  expect(psql(`SELECT status FROM ai_draft_reviews WHERE draft_key=${literal(first.draft.draft_key)} AND version=1`)).toBe("generated");
  expect(review(String(first.draft.draft_key),1)).toMatchObject({ok:false,error:"stale_draft_version"});
  expect(counts()).toBe(before);expect(fetch).not.toHaveBeenCalled();
 });
 it("records edits/rejection as immutable review versions,not contact or tasks",async()=>{
  const id=lead();assign(id);const r=await prepareOperatorHandoff(localQuery,principal,id);const before=counts();
  expect(review(String(r.draft.draft_key),1,"edit",actor,"SYNTHETIC edited internal brief")).toMatchObject({ok:true,version:2,status:"edited"});
  expect(review(String(r.draft.draft_key),2,"reject")).toMatchObject({ok:true,version:3,status:"rejected"});expect(counts()).toBe(before);
 });
 it("reconciles concurrent preparation into one targeted job without creating a fresh key",async()=>{
  const id=lead();assign(id);const before=counts();
  const outcomes=await Promise.allSettled([prepareOperatorHandoff(localQuery,principal,id),prepareOperatorHandoff(localQuery,principal,id)]);
  expect(outcomes.some(r=>r.status==="fulfilled")).toBe(true);
  for(const outcome of outcomes)if(outcome.status==="rejected")expect(outcome.reason.message).toBe("handoff_pending_review_or_processing");
  const final=await prepareOperatorHandoff(localQuery,principal,id);expect(final.replayed).toBe(true);
  expect(psql(`SELECT count(*) FROM ai_intelligence_jobs WHERE lead_id=${literal(id)}`)).toBe("1");
  expect(psql(`SELECT count(*) FROM ai_draft_reviews WHERE lead_id=${literal(id)}`)).toBe("1");expect(counts()).toBe(before);
 });
 it("expires stale permission evidence instead of approving a brief after permission changes",async()=>{
  const id=lead();assign(id);const r=await prepareOperatorHandoff(localQuery,principal,id);
  psql(`INSERT INTO communication_permissions(lead_id,channel,purpose,state,consent_version,source) VALUES(${literal(id)},'email','requested_service_response','denied','synthetic','isolated_fixture')`);
  expect(review(String(r.draft.draft_key),1)).toMatchObject({ok:false,error:"stale_draft_facts",expired:true,status:"expired",version:2});
 });
 it("expires a review after its job deadline rather than approving a stale proposed next step",async()=>{
  const id=lead();assign(id);const r=await prepareOperatorHandoff(localQuery,principal,id);
  psql(`UPDATE ai_intelligence_jobs SET r2_deadline=now()-interval '1 second' WHERE id=${literal(r.draft.draft_key)}`);
  expect(review(String(r.draft.draft_key),1)).toMatchObject({ok:false,error:"stale_draft_facts",expired:true,status:"expired"});
 });
 it("rechecks role,ownership and suppression rather than trusting a stale in-memory principal",async()=>{
  const id=lead();assign(id);const r=await prepareOperatorHandoff(localQuery,principal,id);
  psql(`UPDATE lead_center_users SET role='read_only_analyst' WHERE id=${literal(actor)}`);
  await expect(prepareOperatorHandoff(localQuery,principal,id)).rejects.toThrow("lead_not_found");
  expect(review(String(r.draft.draft_key),1)).toMatchObject({ok:false,error:"draft_not_found"});
  psql(`UPDATE lead_center_users SET role='primary_lead_owner' WHERE id=${literal(actor)};UPDATE leads SET assigned_agent_id=NULL WHERE id=${literal(id)}`);
  expect(review(String(r.draft.draft_key),1)).toMatchObject({ok:false,error:"draft_not_found"});
  const qa=lead(true);assign(qa);await expect(prepareOperatorHandoff(localQuery,principal,qa)).rejects.toThrow("handoff_record_blocked");
  const held=lead();assign(held);psql(`UPDATE leads SET communication_suppressed=true WHERE id=${literal(held)}`);
  await expect(prepareOperatorHandoff(localQuery,principal,held)).rejects.toThrow("handoff_record_blocked");
 });
 it("guards the final write against a context change during execution",async()=>{
  const id=lead();assign(id);const before=counts();
  const raced={async query(sql:string,params:unknown[]=[]){if(sql.includes("complete_r2_worker_v1"))psql(`UPDATE leads SET city='SYNTHETIC CHANGED' WHERE id=${literal(id)}`);return localQuery.query(sql,params);}};
  await expect(prepareOperatorHandoff(raced,principal,id)).rejects.toThrow("handoff_context_changed");
  expect(psql(`SELECT count(*) FROM ai_draft_reviews WHERE lead_id=${literal(id)}`)).toBe("0");expect(counts()).toBe(before);
 });
 it("does not grant an analyst or another agent draft access",async()=>{
  const id=lead();assign(id);
  await expect(prepareOperatorHandoff(localQuery,{...principal,role:"read_only_analyst"},id)).rejects.toThrow("handoff_scope_denied");
  await expect(prepareOperatorHandoff(localQuery,{...principal,userId:otherActor},id)).rejects.toThrow("lead_not_found");
 });
 it("denies browser RPC access and preserves immutable data",()=>{
  for(const signature of["r2_handoff_context_v1(uuid,text)","claim_r2_handoff_v1(uuid,text,text)","review_r2_handoff_v1(uuid,integer,text,text,text,text)","complete_r2_worker_v1(uuid,uuid,jsonb)"]){
   expect(psql(`SELECT has_function_privilege('anon',${literal(signature)},'EXECUTE'),has_function_privilege('authenticated',${literal(signature)},'EXECUTE'),has_function_privilege('service_role',${literal(signature)},'EXECUTE')`)).toBe("f|f|t");
  }
  expect(()=>psql("UPDATE ai_draft_reviews SET content='forbidden'")).toThrow();expect(fetch).not.toHaveBeenCalled();
 });
});
