import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { canAccessAssignedLead } from "@/lib/admin/rbac-policy";
import { checkAdminAuth } from "@/lib/admin/auth";
import type { LeadCenterPrincipal } from "@/lib/admin/rbac-policy";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { createCanonicalAdminLeadTask } from "@/lib/admin/lead-operations";
// Keep the same canonical task transaction; do not ask agents for an admin
// secret or permit them to choose another lead/assignee in a browser body.
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}) {
 const headers={"Cache-Control":"private, no-store"};
 if((request.headers.get("origin")!==new URL(request.url).origin)&&!(request.headers.has("x-admin-secret")&&!request.headers.has("origin")))return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers});
 let principal:LeadCenterPrincipal;
 if(request.headers.has("x-admin-secret")){
  const legacy=checkAdminAuth(request);if(!legacy.ok)return NextResponse.json({ok:false,error:legacy.error},{status:legacy.status,headers});
  principal={userId:legacy.actor,role:"administrator",agentId:null,name:"Authenticated administrator",email:""};
 }else{
  const auth=await requireLeadCenterApiPermission(request,"task:manage_assigned");if(!auth.ok)return auth.response;principal=auth.principal;
 }
 const {id}=await context.params;
 const parsed=z.object({title:z.string().trim().min(1).max(200),body:z.string().trim().max(5000).nullable().optional(),due_at:z.string().trim().max(64).refine(value=>!Number.isNaN(Date.parse(value))).nullable().optional(),priority:z.enum(["low","normal","high","urgent"]).default("normal"),category:z.string().trim().max(100).nullable().optional(),agent_id:z.string().uuid().nullable().optional()}).strict().safeParse(await request.json().catch(()=>null));
 if(!z.string().uuid().safeParse(id).success||!parsed.success)return NextResponse.json({ok:false,error:"invalid_task_request"},{status:400,headers});
 if(!process.env.DATABASE_URL)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try {
  const rows=await neon(process.env.DATABASE_URL).query("SELECT assigned_agent_id,is_test,communication_suppressed FROM public.leads WHERE id=$1::uuid",[id]);const lead=rows[0] as {assigned_agent_id:string|null;is_test:boolean;communication_suppressed:boolean}|undefined;
  if(!lead||!canAccessAssignedLead(principal,lead.assigned_agent_id))return NextResponse.json({ok:false,error:"lead_not_found"},{status:404,headers});
  if(lead.is_test||lead.communication_suppressed)return NextResponse.json({ok:false,error:"test_or_suppressed_task_held"},{status:409,headers});
  if(parsed.data.agent_id && parsed.data.agent_id!==lead.assigned_agent_id)return NextResponse.json({ok:false,error:"task_assignee_mismatch"},{status:403,headers});
  const result=await createCanonicalAdminLeadTask({leadId:id,title:parsed.data.title,body:parsed.data.body,dueAt:parsed.data.due_at,priority:parsed.data.priority,category:parsed.data.category,agentId:lead.assigned_agent_id,actor:`lead_center:${principal.userId}`});
  if(result.ok)trackEventNoWait({eventName:"task_created",leadId:id,properties:{taskId:result.value.taskId,priority:parsed.data.priority}});
  return NextResponse.json(result.ok?{ok:true,task_id:result.value.taskId,audit_id:result.value.auditId,created_at:result.value.createdAt}:{ok:false,error:result.error},{status:result.ok?200:result.statusCode,headers});
 }catch{return NextResponse.json({ok:false,error:"task_transaction_unavailable"},{status:503,headers});}
}
