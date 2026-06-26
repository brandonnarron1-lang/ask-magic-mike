import { NextRequest, NextResponse } from "next/server";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import {
  normalizeEmailEvent,
  type EmailEventType,
} from "@/lib/adapters/email-webhook-normalizer";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Email provider event webhook.
 *
 * Provider-agnostic — `normalizeEmailEvent` detects resend / sendgrid /
 * postmark / mock and returns a canonical `NormalizedEmailEvent`. The
 * route then updates `message_deliveries`, writes `opt_out_email`
 * `compliance_flags` on bounce / complaint / unsubscribe, mirrors raw
 * payloads to `webhook_events`, and emits an analytics event.
 *
 * Authorization:
 *   - Mock / test: `x-admin-secret` (today).
 *   - Live: per-provider signature verification when the provider is
 *     selected (pending).
 *
 * Response shapes:
 *   200 { ok: true,  event_type, provider, lead_id }
 *   401 { ok: false, error: "unauthorized" }
 *   400 { ok: false, error: "..." }
 */
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  const payload = (await req.json().catch(() => null)) as unknown;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "json_required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const normalized = normalizeEmailEvent(payload);

  let leadId: string | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    if (normalized.providerMessageId) {
      const { data: del } = await client
        .from("message_deliveries")
        .select("id, lead_id")
        .eq("provider_message_id", normalized.providerMessageId)
        .maybeSingle();
      leadId = del?.lead_id ?? null;
      const statusMap: Record<EmailEventType, string> = {
        delivered: "delivered",
        opened: "opened",
        clicked: "clicked",
        bounced: "bounced",
        complained: "failed",
        unsubscribed: "undelivered",
        failed: "failed",
        unknown: "sent",
      };
      if (del?.id) {
        const { error: deliveryErr } = await client
          .from("message_deliveries")
          .update({
            status: statusMap[normalized.eventType],
            raw_payload: payload,
          })
          .eq("id", del.id);
        if (deliveryErr) {
          console.error("[email-events] message_deliveries.update failed:", deliveryErr.message);
        }
      }
    }

    if (
      leadId &&
      (normalized.eventType === "bounced" ||
        normalized.eventType === "unsubscribed" ||
        normalized.eventType === "complained")
    ) {
      const { error: flagErr } = await client.from("compliance_flags").insert({
        lead_id: leadId,
        flag_type: "opt_out_email",
        severity:
          normalized.eventType === "complained" ||
          normalized.eventType === "bounced"
            ? "warn"
            : "info",
        notes: JSON.stringify({
          provider: normalized.provider,
          eventType: normalized.eventType,
        }),
      });
      if (flagErr) {
        console.error(
          "[email-events][COMPLIANCE CRITICAL] compliance_flags insert failed for opt-out. Lead",
          leadId, "may NOT be opted out. Error:", flagErr.message
        );
      }
    }

    const { error: evtErr } = await client.from("webhook_events").insert({
      provider: `email_${normalized.provider}`,
      topic: normalized.eventType,
      signature_ok: null,
      payload,
      processed_at: new Date().toISOString(),
    });
    if (evtErr) {
      console.error("[email-events] webhook_events.insert failed:", evtErr.message);
    }
  }

  const evMap: Record<
    EmailEventType,
    "email_opened" | "email_clicked" | "email_sent" | "opt_out"
  > = {
    opened: "email_opened",
    clicked: "email_clicked",
    delivered: "email_sent",
    bounced: "opt_out",
    unsubscribed: "opt_out",
    complained: "opt_out",
    failed: "email_sent",
    unknown: "email_sent",
  };

  trackEventNoWait({
    eventName: evMap[normalized.eventType],
    leadId: leadId ?? undefined,
    properties: {
      provider: normalized.provider,
      eventType: normalized.eventType,
      providerMessageId: normalized.providerMessageId,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      event_type: normalized.eventType,
      provider: normalized.provider,
      lead_id: leadId,
    },
    { headers: NO_STORE }
  );
}
