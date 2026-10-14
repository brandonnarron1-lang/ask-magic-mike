import { NextRequest, NextResponse } from "next/server";
import { checkBearerSecret } from "@/lib/admin/auth";
import { createFirstLiveLeadMonitor, observeFirstLiveMonitor } from "@/lib/operations/first-live-lead-monitor";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  if (!checkBearerSecret(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const monitor = createFirstLiveLeadMonitor();
  const result = await observeFirstLiveMonitor(monitor, { lookbackHours: 48 }, crypto.randomUUID());
  return NextResponse.json(result, { status: result.ok ? 200 : 503, headers: NO_STORE });
}
