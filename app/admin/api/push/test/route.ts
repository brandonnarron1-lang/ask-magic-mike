import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminBasicAuth } from "@/lib/admin/auth";
import { getLeadCenterRbacState } from "@/lib/admin/rbac-policy";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { WebPushNotificationProvider } from "../../../../lib/leadNotificationProvider";
import { NeonPushSubscriptionRepository } from "../../../../lib/persistence/neonPushSubscriptionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ subscription_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  if (getLeadCenterRbacState().enabled) {
    const result = await requireLeadCenterApiPermission(request, "notification:manage");
    if (!result.ok) return result.response;
  } else {
    const auth = checkAdminBasicAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, {
        status: auth.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_subscription_id" }, { status: 400 });
  }

  try {
    const repository = new NeonPushSubscriptionRepository();
    const subscription = await repository.findActiveById(parsed.data.subscription_id);
    if (!subscription || subscription.recipientRole !== "copy") {
      return NextResponse.json({ ok: false, error: "brandon_copy_subscription_not_found" }, { status: 404 });
    }

    const result = await new WebPushNotificationProvider().send({
      notificationId: `phone-test-${subscription.id}`,
      channel: "push",
      recipient: subscription.id,
      subject: "[TEST] Ask Magic Mike phone alerts",
      text: "INTERNAL QA — Brandon copy alerts are connected. No lead was created.",
      idempotencyKey: `phone-test:${subscription.id}:${Date.now()}`,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.errorCode }, { status: result.retryable ? 503 : 422 });
    }
    return NextResponse.json({ ok: true, provider: result.provider, test: true });
  } catch {
    return NextResponse.json({ ok: false, error: "push_test_unavailable" }, { status: 503 });
  }
}
