import { NextRequest, NextResponse } from "next/server";
import { checkBearerSecret } from "@/lib/admin/auth";
import { createFirstLiveLeadMonitor } from "@/lib/operations/first-live-lead-monitor";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  if (!checkBearerSecret(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const monitor = createFirstLiveLeadMonitor();
  if (!monitor) {
    return NextResponse.json({ ok: false, error: "monitor_store_not_configured" }, { status: 503, headers: NO_STORE });
  }

  try {
    const report = await monitor.run({ lookbackHours: 48 });
    const unhealthy = report.escalated > 0 || Object.values(report.states).some((count) => count > 0);
    return NextResponse.json({ ok: !unhealthy, ...report }, { status: unhealthy ? 503 : 200, headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "first_live_monitor_failed", correlation_id: crypto.randomUUID() }, { status: 503, headers: NO_STORE });
  }
}
