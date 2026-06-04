import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const metrics = await loadDashboardMetrics();
  return NextResponse.json({ ok: true, metrics }, { headers: NO_STORE });
}
