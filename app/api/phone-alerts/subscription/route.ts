import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, LIMITS, rateLimitKey } from "@/lib/security/rate-limit";
import { NeonPushSubscriptionRepository } from "../../../lib/persistence/neonPushSubscriptionRepository";
import {
  hasPhoneSetupRequestHeader,
  isExactSameOrigin,
  phoneSetupSessionFromRequest,
} from "../../../lib/phoneSetupSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  device_name: z.string().trim().min(2).max(64).optional(),
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({
      p256dh: z.string().min(16).max(256),
      auth: z.string().min(16).max(256),
    }).strict(),
  }).strict(),
}).strict();

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

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.subscription.endpoint.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "invalid_push_subscription" }, { status: 400 });
  }

  try {
    const saved = await new NeonPushSubscriptionRepository().upsertCopy(
      parsed.data.subscription,
      request.headers.get("user-agent"),
      parsed.data.device_name,
    );
    return NextResponse.json({ ok: true, id: saved.id, role: "copy" }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const roleConflict = error instanceof Error && error.message === "push_subscription_role_conflict";
    return NextResponse.json(
      { ok: false, error: roleConflict ? "push_subscription_role_conflict" : "push_subscription_save_failed" },
      { status: roleConflict ? 409 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
