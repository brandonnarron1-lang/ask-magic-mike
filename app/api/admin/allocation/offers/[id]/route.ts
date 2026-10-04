import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "../../../../../../src/lib/admin/rbac-session";
import { allocationMutationGate,allocationQuery,loadAllocationOffer,resolveAllocationOffer } from "../../../../../lib/leadAllocation";
const HEADERS={"Cache-Control":"private, no-store"};
export async function GET(request:NextRequest,context:{params:Promise<{id:string}>}) {
  const auth=await requireLeadCenterApiPermission(request,"lead:view_assigned"); if(!auth.ok)return auth.response;
  const sql=allocationQuery(); if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers:HEADERS});
  try { const view=await loadAllocationOffer(sql,(await context.params).id,auth.principal);return NextResponse.json(view?{ok:true,view}:{ok:false,error:"offer_not_found"},{status:view?200:404,headers:HEADERS}); }
  catch {return NextResponse.json({ok:false,error:"offer_read_unavailable"},{status:503,headers:HEADERS});}
}
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}) {
  if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers:HEADERS});
  const auth=await requireLeadCenterApiPermission(request,"lead:view_assigned"); if(!auth.ok)return auth.response;
  const gate=allocationMutationGate();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers:HEADERS});
  const parsed=z.object({action:z.enum(["claim","pass"]),version:z.number().int().positive(),receipt:z.string().uuid()}).strict().safeParse(await request.json().catch(()=>null));
  const id=(await context.params).id;
  if(!parsed.success||!z.string().uuid().safeParse(id).success)return NextResponse.json({ok:false,error:"invalid_request"},{status:400,headers:HEADERS});
  const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers:HEADERS});
  try {const result=await resolveAllocationOffer(sql,{offerId:id,version:parsed.data.version,userId:auth.principal.userId,action:parsed.data.action,receipt:`web:${auth.principal.userId}:${parsed.data.receipt}`});return NextResponse.json(result,{status:result.ok?200:409,headers:HEADERS});}
  catch {return NextResponse.json({ok:false,error:"offer_transaction_failed_no_send"},{status:503,headers:HEADERS});}
}
