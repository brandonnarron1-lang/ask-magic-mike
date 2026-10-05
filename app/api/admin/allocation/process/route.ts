import { NextRequest,NextResponse } from "next/server";
import { requireLeadCenterApiPermission } from "../../../../../src/lib/admin/rbac-session";
import { allocationMutationGate,allocationQuery } from "../../../../lib/leadAllocation";
import { processPendingAllocationIntents } from "../../../../lib/leadAllocationDispatch";
import { notificationMode,productionNotificationDeliveryEnabled } from "../../../../lib/leadNotificationProvider";
export async function POST(request:NextRequest) {
 const headers={"Cache-Control":"private, no-store"};
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"invalid_origin"},{status:403,headers});
 const auth=await requireLeadCenterApiPermission(request,"notification:manage");if(!auth.ok)return auth.response;
 const gate=allocationMutationGate();if(!gate.ok)return NextResponse.json({ok:false,error:gate.error},{status:gate.statusCode,headers});
 if(process.env.LEAD_ALLOCATION_SENDS_ENABLED!=="true"||process.env.LEAD_ALLOCATION_TRANSPORT_APPROVED!=="true"||notificationMode()!=="production"||!productionNotificationDeliveryEnabled())return NextResponse.json({ok:false,error:"reviewed_transport_activation_required"},{status:409,headers});
 const sql=allocationQuery();if(!sql)return NextResponse.json({ok:false,error:"database_unavailable"},{status:503,headers});
 try{
  return NextResponse.json({ok:true,...await processPendingAllocationIntents(sql)},{headers});
 }catch{return NextResponse.json({ok:false,error:"allocation_batch_unavailable_reconcile_before_retry"},{status:503,headers});}
}
