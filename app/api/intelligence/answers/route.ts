import {NextRequest,NextResponse} from "next/server";
import {readR2Viewer,r2Query} from "@/lib/intelligence/viewer";
import {assertDatabaseMutationAllowed} from "@/lib/preview-security";
import {ingressSameOrigin,privateIngressResponse} from "../../../lib/growth/ingress-http";
const response=(data:unknown,status=200)=>privateIngressResponse(NextResponse.json(data,{status}));
export async function GET(request:NextRequest){
 try{const viewer=await readR2Viewer(request);if(!viewer)return response({ok:false,error:"session_unavailable"},401);
  const id=new URL(request.url).searchParams.get("id");if(!id||!/^[0-9a-f-]{36}$/i.test(id))return response({ok:false,error:"answer_unavailable"},404);
  const rows=await r2Query().query(`SELECT id,revision,reply,source_refs,public.r2_sources_valid_v1(source_refs,'public') AS valid FROM intelligence_answers
   WHERE id=$1::uuid AND owner_scope=$2 AND expires_at>now() AND public.r2_viewer_valid_v1($2,$3,$4)`,[id,viewer.ownerScope,viewer.consumerUserId,viewer.consumerSessionId]);
  if(!rows[0])return response({ok:false,error:"answer_unavailable"},404);
  const r=rows[0];return response({ok:true,answerId:r.id,revision:r.revision,currentSourceValidity:r.valid?"valid":"source_invalid",...(r.valid?{reply:r.reply}:{message:"Previously released guidance is no longer supported by the current source. Historical approval does not restore source eligibility."})});
 }catch{return response({ok:false,error:"answer_unavailable"},503);}
}
export async function POST(request:NextRequest){
 if(!ingressSameOrigin(request))return response({ok:false,error:"invalid_origin"},403);
 const mutation=assertDatabaseMutationAllowed();if(!mutation.ok)return response({ok:false,error:mutation.error},mutation.statusCode);
 try{const viewer=await readR2Viewer(request);if(!viewer)return response({ok:false,error:"session_unavailable"},401);
  if(viewer.consumerUserId)return response({ok:false,error:"use_account_sign_out"},400);
  await r2Query().query("UPDATE r2_guest_sessions SET revoked_at=now() WHERE owner_scope=$1 AND revoked_at IS NULL",[viewer.ownerScope]);
  return response({ok:true,revoked:true});
 }catch{return response({ok:false,error:"session_unavailable"},503);}
}
