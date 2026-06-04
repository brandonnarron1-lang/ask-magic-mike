import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { loadLeadList } from "@/lib/admin/lead-list";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const u = req.nextUrl;
  const result = await loadLeadList({
    q: u.searchParams.get("q"),
    leadType: u.searchParams.get("lead_type"),
    status: u.searchParams.get("status"),
    grade: u.searchParams.get("grade"),
    source: u.searchParams.get("source"),
    assignedAgentId: u.searchParams.get("assigned_agent_id"),
    unassignedOnly: u.searchParams.get("unassigned_only") === "true",
    spamSuspect: u.searchParams.get("spam_suspect") === "true",
    city: u.searchParams.get("city"),
    createdFromIso: u.searchParams.get("created_from"),
    createdToIso: u.searchParams.get("created_to"),
    sort: (u.searchParams.get("sort") as never) ?? "newest",
    limit: u.searchParams.get("limit") ? Number(u.searchParams.get("limit")) : undefined,
    offset: u.searchParams.get("offset") ? Number(u.searchParams.get("offset")) : undefined,
  });
  return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
}
