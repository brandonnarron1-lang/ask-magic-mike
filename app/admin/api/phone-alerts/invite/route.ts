import { NextRequest, NextResponse } from "next/server";
import { checkAdminBasicAuth } from "@/lib/admin/auth";
import { createPhoneSetupInviteResponse } from "../../../../lib/phoneSetupInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = checkAdminBasicAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, {
      status: auth.status,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return createPhoneSetupInviteResponse(request);
}
