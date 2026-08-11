import { NextResponse, type NextRequest } from "next/server";
import { checkAdminAuth } from "../../../../../src/lib/admin/auth";
import { retryDueLeadAlertNotifications } from "../../../../lib/leadAlertService";

export async function GET(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  return NextResponse.json({ ok: true, status: "retry_endpoint_ready" });
}

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit) || 25, 100));
  const results = await retryDueLeadAlertNotifications(limit);
  return NextResponse.json({ ok: true, processed: results.length, statuses: results.map((result) => result ? { id: result.id, status: result.status, provider_message_id: result.provider_message_id, error_code: result.error_code } : null) });
}
