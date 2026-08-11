import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { NeonPushSubscriptionRepository } from "../../../../lib/persistence/neonPushSubscriptionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeStoreError(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown_error";
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted-token]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 300);
}

const subscriptionSchema = z.object({
  role: z.enum(["primary", "copy"]),
  subscription: z.object({
    endpoint: z.string().url().max(2048),
    keys: z.object({
      p256dh: z.string().min(16).max(256),
      auth: z.string().min(16).max(256),
    }),
  }),
});

export async function GET() {
  try {
    const subscriptions = await new NeonPushSubscriptionRepository().listActive();
    return NextResponse.json({
      ok: true,
      subscriptions: subscriptions.map((item) => ({
        id: item.id,
        role: item.recipientRole,
        device: item.userAgent?.slice(0, 120) || "Unknown device",
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Push subscription store unavailable", { error: safeStoreError(error) });
    return NextResponse.json({ ok: false, error: "push_subscription_store_unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.subscription.endpoint.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "invalid_push_subscription" }, { status: 400 });
  }
  try {
    const saved = await new NeonPushSubscriptionRepository().upsert(
      parsed.data.role,
      parsed.data.subscription,
      request.headers.get("user-agent"),
    );
    return NextResponse.json({ ok: true, id: saved.id, role: saved.recipientRole }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "push_subscription_save_failed" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "invalid_subscription_id" }, { status: 400 });
  }
  try {
    await new NeonPushSubscriptionRepository().deactivate(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "push_subscription_remove_failed" }, { status: 503 });
  }
}
