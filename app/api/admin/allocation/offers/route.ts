import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "../../../../../src/lib/admin/rbac-session";
import { allocationMutationGate,allocationQuery } from "../../../../lib/leadAllocation";
export async function POST(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers});
 const auth=await requireLeadCenterApiPermission(request,"routing:manage");if(!auth.ok)return auth.response;
 const gate=allocationMutationGate();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers});
 const parsed=z.object({leadId:z.string().uuid(),expectedVersion:z.number().int().nonnegative()}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_request"},{status:400,headers});
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try{const rows=await sql.query("SELECT public.create_lead_allocation_offers_v1($1::uuid,$2::bigint,$3) AS result",[parsed.data.leadId,parsed.data.expectedVersion,auth.principal.userId]);const result=rows[0]?.result as {ok:boolean};return NextResponse.json(result,{status:result.ok?200:409,headers});}catch{return NextResponse.json({ok:false,error:"allocation_transaction_failed"},{status:503,headers});}
}
