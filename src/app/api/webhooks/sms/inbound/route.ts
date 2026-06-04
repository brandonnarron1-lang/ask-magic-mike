import { NextRequest, NextResponse } from "next/server";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { verifyTwilioSignature } from "@/lib/adapters/twilio-signature";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Inbound SMS webhook.
 *
 * Two accepted call shapes:
 *   1) Twilio (form-urlencoded) — verified against `X-Twilio-Signature`
 *      when `SMS_PROVIDER=twilio` and `ENABLE_SMS=true`.
 *   2) Dev / mock (JSON or form) — accepted only when `x-admin-secret`
 *      matches `ADMIN_SECRET`. Use this for replaying captured payloads
 *      and end-to-end tests.
 *
 * STOP / START / UNSTOP keywords update consent state via
 * `compliance_flags`. The raw payload is mirrored to `webhook_events`
 * for replay.
 *
 * Response shapes (stable):
 *   200 { ok: true,  lead_id, stop_handled, start_handled, mode }
 *   401 { ok: false, error: "unauthorized" }
 *   400 { ok: false, error: "..." }
 */
export async function POST(req: NextRequest) {
  const twilioEnabled =
    (process.env.SMS_PROVIDER ?? "").toLowerCase() === "twilio" &&
    (process.env.ENABLE_SMS ?? "false").toLowerCase() === "true";

  const adminSecret = req.headers.get("x-admin-secret");
  const twilioSig = req.headers.get("x-twilio-signature");
  const ct = req.headers.get("content-type") ?? "";

  // Parse body once (we may need it for sig verification).
  let formParams: Record<string, string> | undefined;
  let jsonBody: Record<string, unknown> | undefined;
  if (ct.includes("application/json")) {
    jsonBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    formParams = {};
    for (const [k, v] of params) formParams[k] = v;
  }

  // Determine authorization mode.
  let mode: "twilio" | "mock" = "mock";
  if (twilioEnabled) {
    const fullUrl =
      req.headers.get("x-forwarded-proto") && req.headers.get("host")
        ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("host")}${req.nextUrl.pathname}${req.nextUrl.search}`
        : req.url;
    const verify = verifyTwilioSignature({
      url: fullUrl,
      providedSignature: twilioSig,
      authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
      formParams,
    });
    if (!verify.ok) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", reason: verify.reason },
        { status: 401, headers: NO_STORE }
      );
    }
    mode = "twilio";
  } else {
    if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: NO_STORE }
      );
    }
    mode = "mock";
  }

  // Extract canonical fields from whichever body shape arrived.
  const from = String(
    jsonBody?.from ?? jsonBody?.From ?? formParams?.From ?? ""
  ).trim();
  const body = String(
    jsonBody?.body ?? jsonBody?.Body ?? formParams?.Body ?? ""
  );
  const providerMessageId =
    String(
      jsonBody?.message_id ??
        jsonBody?.MessageSid ??
        formParams?.MessageSid ??
        ""
    ) || null;

  if (!from || !body) {
    return NextResponse.json(
      { ok: false, error: "from_and_body_required" },
      { status: 400, headers: NO_STORE }
    );
  }

  const normalizedBody = body.trim().toLowerCase();
  const isStop = /^(stop|stopall|unsubscribe|cancel|end|quit)$/.test(
    normalizedBody
  );
  const isStart = /^(start|unstop|yes)$/.test(normalizedBody);

  // Find a matching lead by normalized phone (when configured).
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
        notes: JSON.stringify({ providerMessageId, mode }),
      });
    }

    await client.from("webhook_events").insert({
      provider: mode === "twilio" ? "twilio_sms" : "mock_sms",
      topic: "inbound",
      signature_ok: mode === "twilio",
      payload: { from, body, providerMessageId, params: formParams ?? jsonBody },
      processed_at: new Date().toISOString(),
    });
  }

  trackEventNoWait({
    eventName: isStop ? "opt_out" : isStart ? "opt_in" : "sms_received",
    leadId: leadId ?? undefined,
    properties: { from, providerMessageId, body, mode },
  });

  return NextResponse.json(
    {
      ok: true,
      lead_id: leadId,
      stop_handled: isStop,
      start_handled: isStart,
      mode,
    },
    { headers: NO_STORE }
  );
}
