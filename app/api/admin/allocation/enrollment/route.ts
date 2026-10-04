import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "../../../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../../../src/lib/admin/rbac-policy";
import { allocationMutationGate,allocationQuery,ALLOCATION_CONSENT_TEXT,ALLOCATION_CONSENT_VERSION,staffPhoneFingerprint,createPossessionChallenge } from "../../../../lib/leadAllocation";
const bodySchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("approve"),agentId:z.string().uuid(),userId:z.string().min(1).max(120),towns:z.array(z.enum(["Wilson","Elm City","Lucama","Stantonsburg","Sims","Kenly"])).min(1).max(6),intents:z.array(z.enum(["buyer","seller","seller_cash_offer","investor","home_value","renter"])).min(1).max(6)}).strict(),
 z.object({action:z.literal("consent"),text:z.literal(ALLOCATION_CONSENT_TEXT),version:z.literal(ALLOCATION_CONSENT_VERSION),confirmed:z.literal(true)}).strict(),
 z.object({action:z.literal("challenge")}).strict(),z.object({action:z.enum(["pause","resume","revoke"])}).strict(),
 z.object({action:z.literal("preferences"),email:z.boolean(),sms:z.boolean(),mms:z.boolean()}).strict(),
]);
export async function GET(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 const auth=await requireLeadCenterApiPermission(request,"lead:view_assigned");if(!auth.ok)return auth.response;
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try{
  const rows=await sql.query("SELECT approved_at,possession_verified_at,consent_at,consent_version,revoked_at,paused,email_enabled,sms_enabled,mms_enabled,towns,intents,weight,daily_cap,concurrent_cap FROM public.agent_operational_enrollment WHERE user_id=$1 AND agent_id=$2::uuid",[auth.principal.userId,auth.principal.agentId]);
  return NextResponse.json({ok:true,enrollment:rows[0]||null,held:process.env.LEAD_ALLOCATION_ENABLED!=="true"},{headers});
 }catch{return NextResponse.json({ok:false,error:"allocation_schema_unavailable"},{status:503,headers});}
}
export async function POST(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers});
 const auth=await requireLeadCenterApiPermission(request,"lead:view_assigned");if(!auth.ok)return auth.response;
 const gate=allocationMutationGate();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers});
 const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_request"},{status:400,headers});
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 const body=parsed.data;
 try {
  if(body.action==="approve") {
   if(!hasLeadCenterPermission(auth.principal.role,"routing:manage"))return NextResponse.json({ok:false,error:"forbidden"},{status:403,headers});
   const rows=await sql.query(`WITH approved AS (INSERT INTO public.agent_operational_enrollment(agent_id,user_id,approved_at,approved_by,towns,intents)
    SELECT g.id,u.id,now(),$3,$4::text[],$5::text[] FROM public.agents g JOIN public.lead_center_users u ON u.id=$2 WHERE g.id=$1::uuid AND g.is_active AND u.banned IS NOT TRUE AND u.role IN ('approved_agent','primary_lead_owner') AND u."agentId"=g.id::text
    ON CONFLICT DO NOTHING RETURNING agent_id),audit AS(INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT $3,'allocation.roster_approved','agent',agent_id,jsonb_build_object('coverage_reviewed',true) FROM approved RETURNING id) SELECT agent_id FROM approved`,[body.agentId,body.userId,auth.principal.userId,body.towns,body.intents]);
   return NextResponse.json({ok:rows.length===1,sendsMessage:false},{status:rows.length===1?200:409,headers});
  }
  const agent=auth.principal.agentId;if(!agent)return NextResponse.json({ok:false,error:"agent_identity_required"},{status:403,headers});
  if(body.action==="preferences") {
   const rows=await sql.query(`WITH changed AS (UPDATE public.agent_operational_enrollment SET
     email_enabled=$3,sms_enabled=$4,mms_enabled=$5,updated_at=now()
     WHERE agent_id=$1::uuid AND user_id=$2 AND approved_at IS NOT NULL AND revoked_at IS NULL
       AND (NOT $4 OR (consent_at IS NOT NULL AND consent_version=$6 AND possession_verified_at IS NOT NULL AND phone_fingerprint IS NOT NULL))
       AND (NOT $5 OR $4) RETURNING agent_id),
     audit AS(INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT $2,'allocation.channel_preferences','agent',agent_id,jsonb_build_object('email',$3,'sms',$4,'mms',$5) FROM changed RETURNING id)
     SELECT agent_id FROM changed`,[agent,auth.principal.userId,body.email,body.sms,body.mms,ALLOCATION_CONSENT_VERSION]);
   return NextResponse.json({ok:rows.length===1,sendsMessage:false,...(rows.length?{}:{error:"approved_consent_possession_required"})},{status:rows.length?200:409,headers});
  }
  if(body.action==="challenge") {
   const rows=await sql.query(`SELECT g.notification_phone FROM public.agents g JOIN public.agent_operational_enrollment e ON e.agent_id=g.id WHERE g.id=$1::uuid AND e.user_id=$2 AND e.approved_at IS NOT NULL AND e.revoked_at IS NULL`,[agent,auth.principal.userId]);
   if(!rows[0])return NextResponse.json({ok:false,error:"approved_binding_required"},{status:409,headers});
   const challenge=createPossessionChallenge(),fingerprint=staffPhoneFingerprint(String(rows[0].notification_phone));
   await sql.query(`WITH changed AS(UPDATE public.agent_operational_enrollment SET phone_fingerprint=$1,challenge_hash=$2,challenge_expires_at=now()+interval '10 minutes',challenge_attempts=0,possession_verified_at=NULL,paused=true,updated_at=now() WHERE agent_id=$3::uuid AND user_id=$4 RETURNING agent_id)
     INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT $4,'allocation.possession_challenge','agent',agent_id,jsonb_build_object('expires_seconds',600) FROM changed`,[fingerprint,challenge.hash,agent,auth.principal.userId]);
   return NextResponse.json({ok:true,command:`VERIFY ${challenge.value}`,expiresInSeconds:600,sendsMessage:false,notice:"Text this from your approved directory mobile to the registered staff sender only during an approved pilot. Inbound carrier/provider fees may apply."},{headers});
  }
  const result=await sql.query(`WITH changed AS (UPDATE public.agent_operational_enrollment SET
    consent_at=CASE WHEN $3='consent' THEN now() ELSE consent_at END,consent_version=CASE WHEN $3='consent' THEN $4 ELSE consent_version END,
    paused=CASE WHEN $3 IN ('pause','revoke') THEN true WHEN $3='resume' THEN false ELSE paused END,
    revoked_at=CASE WHEN $3='revoke' THEN now() ELSE revoked_at END,updated_at=now()
    WHERE agent_id=$1::uuid AND user_id=$2 AND revoked_at IS NULL RETURNING agent_id),
    audit AS (INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata) SELECT $2,'allocation.staff_'||$3,'agent',agent_id,jsonb_build_object('consent_version',$4,'consent_text',CASE WHEN $3='consent' THEN $5 ELSE NULL END) FROM changed RETURNING id)
    SELECT agent_id FROM changed`,[agent,auth.principal.userId,body.action,ALLOCATION_CONSENT_VERSION,ALLOCATION_CONSENT_TEXT]);
  return NextResponse.json({ok:result.length===1,sendsMessage:false},{status:result.length===1?200:409,headers});
 }catch{return NextResponse.json({ok:false,error:"enrollment_operation_unavailable"},{status:503,headers});}
}
