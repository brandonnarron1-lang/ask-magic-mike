import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requireLeadCenterApiPermission} from "@/lib/admin/rbac-session";
import {assertDatabaseMutationAllowed} from "@/lib/preview-security";
import {r2Query} from "@/lib/intelligence/viewer";
import {approvedPublicSources} from "@/lib/intelligence/public-knowledge";
import {refreshSource,sourceTransition,validateCandidate} from "@/lib/intelligence/source-lifecycle";
import {ingressSameOrigin,readBoundedIngressJson,privateIngressResponse} from "../../../../lib/growth/ingress-http";
const response=(body:unknown,status=200)=>privateIngressResponse(NextResponse.json(body,{status}));
const input=z.object({action:z.enum(["register","refresh","validate","promote","revoke_version","revoke_source","recover"]),requestId:z.string().uuid(),revision:z.number().int().nonnegative(),sourceId:z.literal("ourtown-experience"),versionId:z.string().uuid().optional(),reason:z.string().trim().max(500).default(""),freshnessHours:z.number().int().min(1).max(720).default(720)}).strict();
export async function GET(request:NextRequest){
 const auth=await requireLeadCenterApiPermission(request,"user:manage");if(!auth.ok)return privateIngressResponse(auth.response);
 try{const sql=r2Query();const sources=await sql.query("SELECT s.*,coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.ordinal DESC) FROM (SELECT * FROM intelligence_source_versions WHERE source_id=s.id ORDER BY ordinal DESC LIMIT 20) v),'[]'::jsonb) versions FROM intelligence_sources s WHERE s.id=$1 ORDER BY s.id LIMIT 20",[approvedPublicSources[0].id]);
  // Existing bounded-job review results only, never lead input or customer
  // context. Inspection is not approval/publication or another worker queue.
  const drafts=await sql.query(`SELECT id,r2_contract->>'role' AS role,status,r2_result AS result,created_at,
    coalesce(public.r2_sources_valid_v1(r2_contract->'input'->'sourceAuthorization','public'),false) AS source_valid
    FROM ai_intelligence_jobs WHERE feature='bounded_intelligence_v1' AND lead_id IS NULL
    AND requested_by=$1 AND r2_contract->>'role' IN ('research_assistant','marketing_producer','quality_operations')
    ORDER BY created_at DESC LIMIT 20`,[auth.principal.userId]);
  return response({ok:true,sources,drafts,registeredScope:approvedPublicSources[0],paidAI:false,schedules:false});}catch{return response({ok:false,error:"source_governance_unavailable"},503);}
}
export async function POST(request:NextRequest){
 if(!ingressSameOrigin(request))return response({ok:false,error:"invalid_origin"},403);
 const auth=await requireLeadCenterApiPermission(request,"user:manage");if(!auth.ok)return privateIngressResponse(auth.response);
 const mutation=assertDatabaseMutationAllowed();if(!mutation.ok)return response({ok:false,error:mutation.error},mutation.statusCode);
 const body=await readBoundedIngressJson(request,{maxRequestBytes:4096});if(!body.ok)return response({ok:false,error:"invalid_request"},body.status);
 const parsed=input.safeParse(body.value);if(!parsed.success)return response({ok:false,error:"invalid_request"},400);
 const p=parsed.data;
 if(["validate","promote","recover","revoke_version"].includes(p.action)&&!p.versionId)return response({ok:false,error:"version_required"},400);
 if(["revoke_source","revoke_version","recover"].includes(p.action)&&!p.reason)return response({ok:false,error:"reason_required"},400);
 try{
  const sql=r2Query();let result;
  if(p.action==="register")result=await sourceTransition(sql,auth.principal.userId,p.requestId,p.sourceId,p.revision,"register",{scope:approvedPublicSources[0]});
  else if(p.action==="refresh")result=await refreshSource(sql,auth.principal.userId,p.requestId,p.sourceId,p.revision,p.freshnessHours);
  else if(p.action==="validate")result=await validateCandidate(sql,auth.principal.userId,p.requestId,p.sourceId,p.revision,p.versionId!);
  else result=await sourceTransition(sql,auth.principal.userId,p.requestId,p.sourceId,p.revision,p.action,{versionId:p.versionId,reason:p.reason,confirmedGrant:approvedPublicSources[0].grantReference});
  return response(result,result?.ok===true?200:409);
 }catch(error){const safe=error instanceof Error&&["source_revision_changed","source_scope_not_registered","source_too_large","source_fetch_unavailable"].includes(error.message)?error.message:"source_operation_unavailable";return response({ok:false,error:safe},safe==="source_revision_changed"?409:503);}
}
