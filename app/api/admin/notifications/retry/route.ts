import { NextResponse, type NextRequest } from "next/server";
import { checkAdminAuth, checkBearerSecret } from "../../../../../src/lib/admin/auth";
import { assertProviderDeliveryAllowed } from "../../../../../src/lib/preview-security";
import { emailProviderConfigurationReady } from "../../../../lib/emailProviderConfiguration";
import { retryDueNotifications } from "../../../../lib/leadAlertService";
import {
  emailNotificationsEnabled,
  notificationMode,
  productionNotificationDeliveryEnabled,
} from "../../../../lib/leadNotificationProvider";

const NO_STORE = { "Cache-Control": "no-store" };

type RetryResult = Awaited<ReturnType<typeof retryDueNotifications>>[number];

function summarizeRetryBatch(results: RetryResult[]) {
  const statusCounts: Record<string, number> = {};
  let unavailable = 0;
  for (const result of results) {
    if (!result) {
      unavailable += 1;
      continue;
    }
    statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
  }
  return {
    processed: results.length,
    unavailable,
    status_counts: statusCounts,
  };
}

function productionRetryDeliveryReady() {
  if (process.env.VERCEL_ENV !== "production") return true;
  return (
    notificationMode() === "production" &&
    productionNotificationDeliveryEnabled() &&
    emailNotificationsEnabled() &&
    emailProviderConfigurationReady()
  );
}

async function processDueRetries(mode: "cron" | "admin", limit: number) {
  const delivery = assertProviderDeliveryAllowed(
    process.env as Record<string, string | undefined>,
  );
  if (!delivery.ok) {
    return NextResponse.json(
      { ok: false, error: delivery.error, mode, processed: 0 },
      { status: delivery.statusCode, headers: NO_STORE },
    );
  }

  // A disabled or incomplete Production provider is an operational outage,
  // not a permanent delivery result. Preserve due rows for the next healthy
  // run instead of draining the durable outbox as skipped/terminal failures.
  if (!productionRetryDeliveryReady()) {
    return NextResponse.json(
      {
        ok: false,
        error: "notification_retry_delivery_not_ready",
        mode,
        processed: 0,
      },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const results = await retryDueNotifications(limit);
    const summary = summarizeRetryBatch(results);
    const adminDetails = mode === "admin"
      ? {
          statuses: results.map((result) => result
            ? {
                id: result.id,
                status: result.status,
                provider_message_id: result.provider_message_id,
                error_code: result.error_code,
              }
            : null),
        }
      : {};
    return NextResponse.json(
      { ok: summary.unavailable === 0, mode, ...summary, ...adminDetails },
      { status: summary.unavailable === 0 ? 200 : 503, headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "notification_retry_batch_failed",
        mode,
        processed: 0,
        correlation_id: crypto.randomUUID(),
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function GET(req: NextRequest) {
  if (checkBearerSecret(req, process.env.CRON_SECRET)) {
    return processDueRetries("cron", 25);
  }
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: NO_STORE });
  return NextResponse.json({ ok: true, status: "retry_endpoint_ready" }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: NO_STORE });
  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.max(1, Math.min(Number(body.limit) || 25, 100));
  return processDueRetries("admin", limit);
}
