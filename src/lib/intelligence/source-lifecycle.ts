import {createHash,randomUUID} from "node:crypto";
import {z} from "zod";
import {experienceContract} from "../../../app/lib/experienceContract";
import {approvedPublicSources,approvedPublicPassages,publicSourceSchema,sourceRetrievable,answerFromApprovedSources} from "./public-knowledge";
import type {WorkerQuery} from "./bounded-workers";
import type {GroundedReply} from "../../../app/lib/groundedConciergeContract";

export type SourceRef={sourceId:string;versionId:string;revision:number};
const observationSchema=z.object({rawContentHash:z.string().regex(/^[a-f0-9]{64}$/),contentHash:z.string().regex(/^[a-f0-9]{64}$/),matchedPinnedContent:z.boolean(),reason:z.string().max(500)}).strict();
export const snapshotSchema=z.object({source:publicSourceSchema,passages:z.array(z.object({id:z.string(),sourceId:z.string(),version:z.string(),text:z.string().max(2000),intent:z.enum(["buyer","homeValue","compare"])})).min(1).max(3),observation:observationSchema.optional()}).strict();
export type SourceSnapshot=z.infer<typeof snapshotSchema>;
const stable=(v:unknown):string=>JSON.stringify(v,(_key,value)=>value&&typeof value==="object"&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
const hash=(v:unknown)=>createHash("sha256").update(stable(v)).digest("hex");
export function validateSourceSnapshot(raw:unknown,now=new Date()){
 const parsed=snapshotSchema.safeParse(raw);if(!parsed.success)return {valid:false,reason:"Invalid source format or unsupported scope"};
 if(parsed.data.observation&&!parsed.data.observation.matchedPinnedContent)return {valid:false,reason:parsed.data.observation.reason};
 const {source,passages}=parsed.data,grant=approvedPublicSources.find(s=>s.id===source.id);
 if(!grant||source.url!==grant.url||source.owner!==grant.owner||source.grantReference!==grant.grantReference
   ||source.audience!==grant.audience||Object.entries(source.permissions).some(([k,v])=>v&&!grant.permissions[k as keyof typeof grant.permissions]))return {valid:false,reason:"Source identity,rights or audience not established"};
 if(!sourceRetrievable(source,now))return {valid:false,reason:"Source dates,rights or freshness are ineligible"};
 if(passages.some(p=>!approvedPublicPassages.some(a=>stable(a)===stable(p))))return {valid:false,reason:"Changed business wording requires a source-bound code review;not model approval"};
 if(new Set(passages.map(p=>p.id)).size!==passages.length)return {valid:false,reason:"Conflicting source passage identity"};
 return {valid:true,reason:"Pinned owned service wording,scope and dates validated"};
}
export async function readSourceSet(sql:WorkerQuery){
 const rows=await sql.query(`SELECT s.id,s.revision,v.id AS version_id,v.snapshot,
  public.r2_sources_valid_v1(jsonb_build_array(jsonb_build_object('sourceId',s.id,'versionId',v.id,'revision',s.revision)),'public') AS eligible
  FROM public.intelligence_sources s LEFT JOIN public.intelligence_source_versions v ON v.id=s.active_version ORDER BY s.id`);
 const active=rows.filter(r=>r.eligible===true).map(r=>({snapshot:snapshotSchema.parse(r.snapshot),ref:{sourceId:String(r.id),versionId:String(r.version_id),revision:Number(r.revision)}}));
 return {active,refs:active.map(a=>a.ref)};
}
export async function sourceRefsValid(sql:WorkerQuery,refs:SourceRef[]){return (await sql.query("SELECT public.r2_sources_valid_v1($1::jsonb,'public') AS valid",[JSON.stringify(refs)]))[0]?.valid===true;}
export async function sourceTransition(sql:WorkerQuery,actor:string,requestId:string,sourceId:string,revision:number,action:string,input:Record<string,unknown>={}){
 const rows=await sql.query("SELECT public.r2_source_transition_v1($1,$2::uuid,$3,$4,$5,$6::jsonb) AS result",[actor,requestId,sourceId,revision,action,JSON.stringify(input)]);
 return rows[0]?.result as Record<string,unknown>;
}
export async function stageSource(sql:WorkerQuery,actor:string,requestId:string,id:string,revision:number,raw:unknown){
 // Invalid content is retained in quarantine only after its outer scope can be
 // established. No arbitrary URL/unknown rights are fetched or accepted.
 const parsed=snapshotSchema.safeParse(raw);if(!parsed.success)throw Error("invalid_source_snapshot");
 const source=parsed.data.source;
 return sourceTransition(sql,actor,requestId,id,revision,"candidate",{snapshot:parsed.data,contentHash:parsed.data.observation?.contentHash??hash(parsed.data.passages),identityHash:hash(parsed.data)});
}
/** Called only by Source Steward after a durable, revision-fenced lease claim.
 * Retain hashes, never raw response prose. Pinned passages are reference material
 * in a quarantined observation, not a representation that remote prose matched. */
export async function observeRegisteredSource(id:string,freshnessHours:number,transport:typeof fetch){
 const grant=approvedPublicSources.find(s=>s.id===id);
 if(!grant||!Number.isInteger(freshnessHours)||freshnessHours<1||freshnessHours>grant.freshnessHours)throw Error("source_scope_not_registered");
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),5000);
 const stopped=new Promise<never>((_resolve,reject)=>abort.signal.addEventListener("abort",()=>reject(Error("source_fetch_unavailable")),{once:true}));
 let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 try{
  const res=await Promise.race([transport(grant.url,{method:"GET",redirect:"error",signal:abort.signal,headers:{Accept:"application/json"}}),stopped]);
  if(!res.ok||res.redirected||res.url&&res.url!==grant.url)throw Error("source_fetch_unavailable");
  reader=res.body?.getReader();if(!reader)throw Error("source_fetch_unavailable");
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const p=await Promise.race([reader.read(),stopped]);if(p.done)break;bytes+=p.value.length;if(bytes>32000)throw Error("source_too_large");chunks.push(p.value);}
  const raw=Buffer.concat(chunks),rawContentHash=createHash("sha256").update(raw).digest("hex");
  let body:unknown;try{body=JSON.parse(raw.toString("utf8"));}catch{body=null;}
  const matches=!!res.headers.get("content-type")?.toLowerCase().includes("application/json")&&stable(body)===stable(experienceContract);
  const snapshot:SourceSnapshot={source:{...grant,fetchedAt:new Date().toISOString(),freshnessHours},passages:approvedPublicPassages,
   observation:{rawContentHash,contentHash:body===null?rawContentHash:hash(body),matchedPinnedContent:matches,
    reason:matches?"Pinned owned service wording matched":"Fetched payload differs or has unsupported format; pinned passages are reference only. Human source-bound review required."}};
  return {snapshot,contentHash:snapshot.observation!.contentHash,identityHash:hash(snapshot)};
 }finally{clearTimeout(timeout);abort.abort();void reader?.cancel().catch(()=>undefined);}
}

export type SourceRefreshResult={ok:boolean;action?:string;jobId?:string;status?:string;pending?:boolean;replayed?:boolean;error?:string;
 revision?:number;versionId?:string|null;unchanged?:boolean;validation?:string};
export async function refreshSource(sql:WorkerQuery,actor:string,requestId:string,id:string,revision:number,freshnessHours:number,transport:typeof fetch=fetch):Promise<SourceRefreshResult>{
 const grant=approvedPublicSources.find(s=>s.id===id);
 if(!grant||!Number.isInteger(freshnessHours)||freshnessHours<1||freshnessHours>grant.freshnessHours)throw Error("source_scope_not_registered");
 const {WORKER_VERSION,currentWorkerSourceVersions,runOneWorker}=await import("./bounded-workers");
 const contract={version:WORKER_VERSION,tenant:"ask-magic-mike",actor,role:"source_steward",eventId:requestId,
  entityId:id,entityVersion:String(revision),sourceVersions:currentWorkerSourceVersions(),deadline:new Date(Date.now()+60000).toISOString(),
  risk:"read_draft_review",approval:"human_required",budget:{steps:2,tokens:0,costUsd:0},
  input:{question:"Refresh the registered owned service contract; stage only, never promote.",offer:"buyer",source:grant,checkpoint:null,
   sourceRefresh:{expectedRevision:revision,freshnessHours}}};
 const key=`r2:${hash(["ask-magic-mike",actor,"source_steward",requestId])}`;
 // SQL checks logical replay BEFORE stale/revoked source state or a new fetch.
 const prepared=(await sql.query("SELECT public.prepare_r2_source_refresh_v1($1,$2::uuid,$3,$4,$5,$6,$7::jsonb) AS result",
  [actor,requestId,id,revision,freshnessHours,key,JSON.stringify(contract)]))[0]?.result as SourceRefreshResult;
 if(!prepared?.ok||!prepared.jobId||!prepared.pending)return prepared??{ok:false,error:"source_fetch_unavailable"};
 const jobId=prepared.jobId;
 try{await runOneWorker(sql,"source-refresh",{now:new Date(),principal:{tenant:"ask-magic-mike",actor,permittedRoles:["source_steward"],permittedLeadIds:[]},fetchSource:transport},jobId);}
 catch(error){
  // A fenced refusal may have committed its terminal receipt; reconcile below.
  if(!(error instanceof Error)||!["source_revision_changed","worker_source_invalid","worker_lease_not_current"].includes(error.message))throw error;
 }
 const row=(await sql.query("SELECT status,last_error_code,metadata->'sourceRefreshResult' AS result FROM public.ai_intelligence_jobs WHERE id=$1::uuid AND requested_by=$2 AND feature='bounded_intelligence_v1'",[jobId,actor]))[0];
 if(row?.result)return {...row.result as SourceRefreshResult,replayed:prepared.replayed??false};
 if(row&&["queued","processing"].includes(String(row.status)))return {ok:true,action:"refresh",jobId,status:String(row.status),pending:true,replayed:prepared.replayed??false};
 return {ok:false,action:"refresh",jobId,status:String(row?.status??"unavailable"),error:String(row?.last_error_code??"source_fetch_unavailable"),replayed:prepared.replayed??false};
}
export async function validateCandidate(sql:WorkerQuery,actor:string,requestId:string,id:string,revision:number,versionId:string){
 const v=(await sql.query("SELECT snapshot FROM public.intelligence_source_versions WHERE id=$1::uuid AND source_id=$2",[versionId,id]))[0];
 return sourceTransition(sql,actor,requestId,id,revision,"validate",{versionId,...validateSourceSnapshot(v?.snapshot)});
}
export const unavailableReply=():GroundedReply=>({message:"Current approved guidance is unavailable or source-invalid. The existing forms remain available for local human review; nothing was submitted.",mode:"source_unavailable",citations:[],limitation:"AI assistant for Our Town Properties,not Mike personally. No property facts,valuation,offer,financing or appointment established."});
/** Buffer the small deterministic answer. Final SQL commit is its release
 * boundary; revocation before it suppresses output. No paid model is activated. */
export async function governedReply(sql:WorkerQuery,question:string,viewer:{ownerScope:string;consumerUserId:string|null;consumerSessionId:string|null},beforeRelease?:()=>Promise<void>){
 const set=await readSourceSet(sql);
 const reply=answerFromApprovedSources(question,{sources:set.active.map(a=>a.snapshot.source),passages:set.active.flatMap(a=>a.snapshot.passages)});
 if(reply.mode!=="approved_source")return {...reply,answerId:null};
 await beforeRelease?.();
 const id=randomUUID();
 const rows=await sql.query("SELECT public.r2_release_answer_v1($1::uuid,$2,$3,$4,$5::jsonb,$6::jsonb) AS result",[id,viewer.ownerScope,viewer.consumerUserId,viewer.consumerSessionId,JSON.stringify(set.refs),JSON.stringify({...reply,sourceRefs:set.refs})]);
 const result=rows[0]?.result as {ok?:boolean};
 return result?.ok?{...reply,answerId:id,revision:1,sourceRefs:set.refs,currentSourceValidity:"valid",releaseBoundary:"atomic-eligibility-and-answer-receipt-commit"}:{...unavailableReply(),answerId:null};
}
