import { NextRequest, NextResponse } from "next/server";
import { checkAdminBasicAuth } from "@/lib/admin/auth";
import { getLeadCenterRbacState } from "@/lib/admin/rbac-policy";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { createPhoneSetupInviteResponse } from "../../../../lib/phoneSetupInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (getLeadCenterRbacState().enabled) {
    const result = await requireLeadCenterApiPermission(request, "notification:manage");
    if (!result.ok) return result.response;
  } else {
    const auth = checkAdminBasicAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, {
        status: auth.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  return createPhoneSetupInviteResponse(request);
}
