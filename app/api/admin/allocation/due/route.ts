import { NextRequest,NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "../../../../../src/lib/admin/rbac-session";
import { allocationQuery } from "../../../../lib/leadAllocation";
import { assertDatabaseMutationAllowed } from "../../../../../src/lib/preview-security";
import { checkBearerSecret } from "../../../../../src/lib/admin/auth";
import { processPendingAllocationIntents } from "../../../../lib/leadAllocationDispatch";
export async function GET(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 // Machine-authenticated due endpoint only; human/browser GET cannot mutate.
 if(!checkBearerSecret(request,process.env.CRON_SECRET))return NextResponse.json({ok:false,error:"unauthorized"},{status:401,headers});
 const gate=assertDatabaseMutationAllowed();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers});
 if(process.env.LEAD_ALLOCATION_DUE_ENABLED!=="true"||process.env.LEAD_ALLOCATION_ENABLED!=="true")return NextResponse.json({ok:true,held:true,processed:0},{headers});
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try{const rows=await sql.query("SELECT public.expire_lead_allocation_offers_v1(25) AS result");const dispatch=await processPendingAllocationIntents(sql);return NextResponse.json({...rows[0]?.result as object,dispatch},{headers});}catch{return NextResponse.json({ok:false,error:"allocation_due_failed"},{status:503,headers});}
}
export async function POST(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers});
 const auth=await requireLeadCenterApiPermission(request,"routing:manage");if(!auth.ok)return auth.response;
 const gate=assertDatabaseMutationAllowed();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers});
 if(process.env.LEAD_ALLOCATION_DUE_ENABLED!=="true")return NextResponse.json({ok:false,error:"allocation_due_held"},{status:409,headers});
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try{const rows=await sql.query("SELECT public.expire_lead_allocation_offers_v1(25) AS result");return NextResponse.json(rows[0]?.result,{headers});}catch{return NextResponse.json({ok:false,error:"allocation_due_failed"},{status:503,headers});}
}
