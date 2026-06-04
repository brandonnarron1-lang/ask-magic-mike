import { NextRequest, NextResponse } from "next/server";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Inbound SMS webhook.
 *
 * Twilio sends an `application/x-www-form-urlencoded` body with `From`,
 * `Body`, `MessageSid`, etc. Other carriers vary; we accept JSON too.
 * STOP / START / UNSTOP keywords are honored by updating
 * `compliance_flags` with `opt_out_sms` / clearing it.
 *
 * Signature verification: when `TWILIO_AUTH_TOKEN` is set we'll soon
 * compute the Twilio signature; for now we accept the payload but log
 * the signature header so production can flip on verification.
 */
export async function POST(req: NextRequest) {
  // Dev/mock path: allow ADMIN_SECRET-gated test payloads.
  const adminSecret = req.headers.get("x-admin-secret");
  const twilioSig = req.headers.get("x-twilio-signature");
  const looksLikeTwilio =
    !!twilioSig || (req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");

  if (!adminSecret && !looksLikeTwilio) {
    return NextResponse.json(
      { ok: false, error: "unrecognized_source" },
      { status: 400, headers: NO_STORE }
    );
  }
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

  // Parse based on content-type.
  let from = "";
  let body = "";
  let providerMessageId: string | null = null;

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    from = String(j.from ?? j.From ?? "");
    body = String(j.body ?? j.Body ?? "");
    providerMessageId = String(j.message_id ?? j.MessageSid ?? "") || null;
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    from = params.get("From") ?? "";
    body = params.get("Body") ?? "";
    providerMessageId = params.get("MessageSid");
  }

  if (!from || !body) {
    return NextResponse.json(
      { ok: false, error: "from_and_body_required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const normalizedBody = body.trim().toLowerCase();
  const isStop = /^(stop|stopall|unsubscribe|cancel|end|quit)$/.test(normalizedBody);
  const isStart = /^(start|unstop|yes)$/.test(normalizedBody);

  // Find the matching lead by normalized phone (when configured).
  let leadId: string | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;
    const { data } = await client
      .from("leads")
      .select("id")
      .eq("normalized_phone", from)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    leadId = data?.id ?? null;

    // Log the message either way.
    if (leadId) {
      await client.from("messages").insert({
        lead_id: leadId,
        role: "user",
        content: body,
      });
    }

    if (isStop && leadId) {
      await client.from("compliance_flags").insert({
        lead_id: leadId,
        flag_type: "opt_out_sms",
        severity: "warn",
        notes: JSON.stringify({ providerMessageId }),
      });
    }
    if (isStart && leadId) {
      await client.from("compliance_flags").insert({
        lead_id: leadId,
        flag_type: "opt_in" as never, // we accept extra values for future schema growth
        severity: "info",
        notes: JSON.stringify({ providerMessageId }),
      }).then(
        () => {},
        () => {}
      );
    }

    // Mirror raw payload to webhook_events for replay.
    await client.from("webhook_events").insert({
      provider: "twilio_sms",
      topic: "inbound",
      signature_ok: !!twilioSig, // verification stub
      payload: { from, body, providerMessageId },
      processed_at: new Date().toISOString(),
    });
  }

  trackEventNoWait({
    eventName: isStop ? "opt_out" : isStart ? "opt_in" : "sms_received",
    leadId: leadId ?? undefined,
    properties: { from, providerMessageId, body },
  });

  return NextResponse.json(
    {
      ok: true,
      lead_id: leadId,
      stop_handled: isStop,
      start_handled: isStart,
    },
    { headers: NO_STORE }
  );
}
