import { createHash } from "node:crypto";
import { z } from "zod";
import { isTerminalContactRecord } from "../../../app/lib/manualContactReview";
import { hasLeadCenterPermission, type LeadCenterPrincipal } from "../admin/rbac-policy";
import { approvedPublicSources } from "./public-knowledge";
import {readSourceSet,sourceRefsValid} from "./source-lifecycle";
import { currentWorkerSourceVersions, enqueueWorker, runOneWorker, WORKER_VERSION, workerJobSchema, type WorkerLead, type WorkerQuery } from "./bounded-workers";

const contextSchema = z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/), lead: z.object({
  id:z.string().uuid(), version:z.string(), owner:z.string().nullable(),intent:z.string(),propertyReference:z.string().nullable(),
  missing:z.array(z.string()),permissions:z.array(z.string()),isTest:z.boolean(),suppressed:z.boolean(),status:z.string(),conversionStage:z.string().nullable(),
}) });

/** Operator identity is supplied only by the current Better Auth server check.
 * SQL independently rechecks role/ownership. No model or sender is imported. */
export async function prepareOperatorHandoff(sql: WorkerQuery, principal: LeadCenterPrincipal, leadId: string) {
  if (!hasLeadCenterPermission(principal.role,"lead:update_assigned")) throw Error("handoff_scope_denied");
  const rows=await sql.query("SELECT public.r2_handoff_context_v1($1::uuid,$2) AS context",[leadId,principal.userId]);
  if (!rows[0]?.context) throw Error("lead_not_found");
  const current=contextSchema.parse(rows[0].context);
  if(current.lead.id!==leadId)throw Error("handoff_scope_denied");
  if(current.lead.isTest||current.lead.suppressed)throw Error("handoff_record_blocked");
  const sourceVersions=currentWorkerSourceVersions();
  const governed=process.env.R2_SOURCE_GOVERNANCE_ENABLED==="true"?await readSourceSet(sql):null;
  if(governed&&!governed.active.length)throw Error("handoff_source_invalid");
  const digest=createHash("sha256").update(JSON.stringify([principal.userId,leadId,current.fingerprint,sourceVersions,governed?.refs||null])).digest("hex");
  const eventId=`${digest.slice(0,8)}-${digest.slice(8,12)}-5${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
  const key=`r2:${createHash("sha256").update(JSON.stringify(["ask-magic-mike",principal.userId,"concierge_handoff",eventId])).digest("hex")}`;
  const prior=await sql.query("SELECT id,r2_contract,status FROM public.ai_intelligence_jobs WHERE request_key=$1 AND requested_by=$2 AND lead_id=$3::uuid AND feature='bounded_intelligence_v1'",[key,principal.userId,leadId]);
  const contract=prior[0]?workerJobSchema.parse(prior[0].r2_contract):workerJobSchema.parse({
    version:WORKER_VERSION,tenant:"ask-magic-mike",actor:principal.userId,role:"concierge_handoff",eventId,
    entityId:leadId,entityVersion:current.lead.version,sourceVersions,deadline:new Date(Date.now()+3600000).toISOString(),
    risk:"read_draft_review",approval:"human_required",budget:{steps:2,tokens:0,costUsd:0},
    input:{question:"Review saved inquiry",offer:/sell|value/.test(current.lead.intent)?"homeValue":"buyer",source:governed?.active[0]?.snapshot.source||approvedPublicSources[0],checkpoint:null,contextFingerprint:current.fingerprint,...(governed?{sourceAuthorization:governed.refs}:{})},
  });
  if(contract.actor!==principal.userId||contract.entityId!==leadId||contract.role!=="concierge_handoff"
    ||contract.input.contextFingerprint!==current.fingerprint)throw Error("handoff_context_changed");
  const workerPrincipal={tenant:"ask-magic-mike" as const,actor:principal.userId,permittedRoles:["concierge_handoff" as const],permittedLeadIds:[leadId]};
  let id=typeof prior[0]?.id==="string"?prior[0].id:null;
  if(!id){
    try{id=(await enqueueWorker(sql,workerPrincipal,contract,leadId)).id??null;}
    catch(error){
      if(!(error instanceof Error)||error.message!=="worker_replay_conflict")throw error;
      const concurrent=await sql.query("SELECT id FROM public.ai_intelligence_jobs WHERE request_key=$1 AND requested_by=$2 AND lead_id=$3::uuid AND r2_contract->'input'->>'contextFingerprint'=$4",[key,principal.userId,leadId,current.fingerprint]);
      id=typeof concurrent[0]?.id==="string"?concurrent[0].id:null;
    }
  }
  if(!id)throw Error("handoff_not_available");
  const drafts=()=>sql.query("SELECT * FROM public.ai_draft_reviews WHERE draft_key=$1::uuid AND lead_id=$2::uuid ORDER BY version DESC LIMIT 1",[id,leadId]);
  let draft=(await drafts())[0];
  if(!draft){
    const lead:WorkerLead={...current.lead,contactBlocked:isTerminalContactRecord(current.lead.status,current.lead.conversionStage)};
    await runOneWorker(sql,"operator-handoff",{now:new Date(),principal:workerPrincipal,lead},id);
    draft=(await drafts())[0];
  }
  if(!draft)throw Error("handoff_pending_review_or_processing");
  const projectedDraft:Record<string,unknown>={...draft,...(governed?{current_source_valid:await sourceRefsValid(sql,governed.refs)}:{})};
  return {ok:true,draft:projectedDraft,replayed:Boolean(prior[0]),sendsCommunication:false,createsTask:false,modelCalls:0};
}
