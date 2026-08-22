import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { getLeadCenterRbacState } from "@/lib/admin/rbac-policy";
import { createPhoneSetupInviteResponse } from "../../../lib/phoneSetupInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (getLeadCenterRbacState().enabled) {
    return NextResponse.json(
      { ok: false, error: "legacy_admin_auth_disabled" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const auth = checkAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return createPhoneSetupInviteResponse(request);
}
