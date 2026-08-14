import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";
import { leadCenterAuth } from "../../../../src/lib/admin/rbac-auth";
import { getLeadCenterRbacState } from "../../../../src/lib/admin/rbac-policy";

const handlers = toNextJsHandler(leadCenterAuth);

function unavailable() {
  return NextResponse.json(
    { ok: false, error: "lead_center_per_user_auth_unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  if (!getLeadCenterRbacState().ready) return unavailable();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!getLeadCenterRbacState().ready) return unavailable();
  return handlers.POST(request);
}
