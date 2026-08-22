import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import { WebPushNotificationProvider } from "../../../lib/leadNotificationProvider";
import { NeonPushSubscriptionRepository } from "../../../lib/persistence/neonPushSubscriptionRepository";
import {
  PHONE_SETUP_MAX_TTL_MS,
  hasPhoneSetupRequestHeader,
  isExactSameOrigin,
  phoneSetupSessionFromRequest,
} from "../../../lib/phoneSetupSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ subscription_id: z.string().uuid() }).strict();

export async function POST(request: NextRequest) {
  if (!isExactSameOrigin(request) || !hasPhoneSetupRequestHeader(request)) {
    return NextResponse.json({ ok: false, error: "invalid_request_origin" }, { status: 403 });
  }
  const session = phoneSetupSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "phone_setup_session_expired" }, { status: 401 });
  }
  const limit = await checkRateLimit(
    rateLimitKey(request.headers.get("x-forwarded-for")),
    LIMITS.phoneSetup.limit,
    LIMITS.phoneSetup.windowMs,
    "phoneSetup",
  );
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
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
    const oneShot = await checkRateLimit(
      `phone-setup-test:${session.nonce}:${subscription.id}`,
      1,
      PHONE_SETUP_MAX_TTL_MS,
      "phoneSetup",
    );
    if (process.env.VERCEL_ENV === "production" && !oneShot.durable) {
      return NextResponse.json(
        { ok: false, error: "push_test_guard_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!oneShot.allowed) {
      return NextResponse.json(
        { ok: false, error: "push_test_already_sent" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await new WebPushNotificationProvider().send({
      notificationId: `phone-test-${subscription.id}`,
      channel: "push",
      recipient: subscription.id,
      subject: "[TEST] Ask Magic Mike phone alerts",
      text: "INTERNAL QA — Brandon copy alerts are connected. No lead was created.",
      idempotencyKey: `phone-test:${session.nonce}:${subscription.id}`,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.errorCode }, { status: result.retryable ? 503 : 422 });
    }
    return NextResponse.json(
      { ok: true, provider: result.provider, test: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "push_test_unavailable" }, { status: 503 });
  }
}
