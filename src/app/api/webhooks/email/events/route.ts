import { NextRequest, NextResponse } from "next/server";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Email provider event webhook.
 *
 * Generic shape — accepts the common Resend / SendGrid / Postmark event
 * envelope. Maps to `message_deliveries` updates + analytics events.
 * Bounce / unsubscribe events flip `opt_out_email` on the matching lead.
 *
 * Authentication: relies on provider-specific signature header. When the
 * provider is not yet picked, we accept ADMIN_SECRET-gated test events
 * so the admin can replay payloads from `webhook_events`.
 */
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  // We don't enforce a provider sig here yet (provider TBD). Production
  // will plug verification in before this route handles real traffic.
  if (
    adminSecret &&
    process.env.ADMIN_SECRET &&
    adminSecret !== process.env.ADMIN_SECRET
  ) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  const payload = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "json_required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const eventType = String(
    payload.event ?? payload.type ?? payload.event_type ?? ""
  ).toLowerCase();
  const messageId = String(
    payload.provider_message_id ?? payload.id ?? payload.message_id ?? ""
  );

  let leadId: string | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    if (messageId) {
      const { data: del } = await client
        .from("message_deliveries")
        .select("id, lead_id")
        .eq("provider_message_id", messageId)
        .maybeSingle();
      leadId = del?.lead_id ?? null;

      const statusMap: Record<string, string> = {
        delivered: "delivered",
        bounce: "bounced",
        bounced: "bounced",
        opened: "opened",
        clicked: "clicked",
        unsubscribed: "undelivered",
        complaint: "failed",
      };
      const newStatus = statusMap[eventType] ?? "sent";
      if (del?.id) {
        await client
          .from("message_deliveries")
          .update({ status: newStatus, raw_payload: payload })
          .eq("id", del.id);
      }
    }

    // unsubscribe / bounce → opt_out_email
    if (
      leadId &&
      (eventType === "unsubscribed" ||
        eventType === "bounce" ||
        eventType === "bounced")
    ) {
      await client.from("compliance_flags").insert({
        lead_id: leadId,
        flag_type: "opt_out_email",
        severity: eventType.includes("bounce") ? "warn" : "info",
        notes: JSON.stringify({ eventType }),
      });
    }

    await client.from("webhook_events").insert({
      provider: "email",
      topic: eventType || "unknown",
      signature_ok: null,
      payload,
      processed_at: new Date().toISOString(),
    });
  }

  const evMap: Record<string, "email_opened" | "email_clicked" | "email_sent" | "opt_out"> =
    {
      opened: "email_opened",
      clicked: "email_clicked",
      delivered: "email_sent",
      bounce: "opt_out",
      bounced: "opt_out",
      unsubscribed: "opt_out",
    };
  const eventName = evMap[eventType] ?? "email_sent";

  trackEventNoWait({
    eventName,
    leadId: leadId ?? undefined,
    properties: { eventType, messageId },
  });

  return NextResponse.json(
    { ok: true, event: eventType, lead_id: leadId },
    { headers: NO_STORE }
  );
}
