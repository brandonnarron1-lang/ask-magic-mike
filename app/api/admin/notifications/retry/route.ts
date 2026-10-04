import { NextResponse, type NextRequest } from "next/server";
import { checkAdminAuth, checkBearerSecret } from "../../../../../src/lib/admin/auth";
import { assertProviderDeliveryAllowed } from "../../../../../src/lib/preview-security";
import { notificationRetryDeliveryReady, retryDueLeadAlertNotifications } from "../../../../lib/leadAlertService";

export async function GET(req: NextRequest) {
  // Scheduled auth is distinct from administrator readiness. No retry cron is
  // installed or enabled by this release candidate.
  if (checkBearerSecret(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "scheduled_notification_retry_not_activated" }, { status: 409 });
  }
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  return NextResponse.json({ ok: true, status: "retry_endpoint_ready" });
}

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const delivery = assertProviderDeliveryAllowed();
  if (!delivery.ok) return NextResponse.json({ ok: false, error: delivery.error }, { status: delivery.statusCode });
  if (!notificationRetryDeliveryReady()) return NextResponse.json({ ok: false, error: "notification_retry_delivery_not_ready", processed: 0 }, { status: 503 });
  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit) || 25, 100));
  const results = await retryDueLeadAlertNotifications(limit);
  return NextResponse.json({ ok: true, processed: results.length, statuses: results.map((result) => result ? { id: result.id, status: result.status, provider_message_id: result.provider_message_id, error_code: result.error_code } : null) });
}
