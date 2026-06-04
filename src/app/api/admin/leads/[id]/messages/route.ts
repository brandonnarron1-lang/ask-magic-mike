import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { CommunicationsEngine } from "@/lib/engines/communications";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Body {
  channel: "sms" | "email";
  template_slug: string;
  vars?: Record<string, string>;
  override_marketing?: boolean;
}

/**
 * Admin: send a templated SMS or email from a lead's detail page.
 *
 * Consent state is read from the leads/consents table. The
 * CommunicationsEngine blocks marketing sends when consent isn't set
 * and blocks all sends when `do_not_contact` is set.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );

  const { id } = await params;
  if (!UUID.test(id))
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400, headers: NO_STORE });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.channel || !body.template_slug)
    return NextResponse.json(
      { ok: false, error: "channel_and_template_required" },
      { status: 400, headers: NO_STORE }
    );

  // Lookup lead + consent.
  let to = "";
  const consent: {
    sms: boolean;
    email: boolean;
    call: boolean;
    doNotContact: boolean;
  } = { sms: false, email: false, call: false, doNotContact: false };

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;
    const { data: lead } = await client
      .from("leads")
      .select("email, phone, consent_sms, consent_call, consent_email")
      .eq("id", id)
      .maybeSingle();
    if (!lead) {
      return NextResponse.json(
        { ok: false, error: "lead_not_found" },
        { status: 404, headers: NO_STORE }
      );
    }
    to = body.channel === "sms" ? (lead.phone ?? "") : (lead.email ?? "");
    consent.sms = !!lead.consent_sms;
    consent.email = !!lead.consent_email;
    consent.call = !!lead.consent_call;

    const { data: dnc } = await client
      .from("compliance_flags")
      .select("flag_type")
      .eq("lead_id", id)
      .in("flag_type", ["do_not_contact", "opt_out_sms", "opt_out_email"]);
    if ((dnc ?? []).some((f: { flag_type: string }) => f.flag_type === "do_not_contact"))
      consent.doNotContact = true;
    if (
      body.channel === "sms" &&
      (dnc ?? []).some((f: { flag_type: string }) => f.flag_type === "opt_out_sms")
    )
      consent.sms = false;
    if (
      body.channel === "email" &&
      (dnc ?? []).some((f: { flag_type: string }) => f.flag_type === "opt_out_email")
    )
      consent.email = false;
  }

  if (!to) {
    return NextResponse.json(
      { ok: false, error: "no_recipient_address" },
      { status: 400, headers: NO_STORE }
    );
  }

  const engine = new CommunicationsEngine();
  const result =
    body.channel === "sms"
      ? await engine.sendSms({
          to,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          templateSlug: body.template_slug as any,
          vars: body.vars ?? {},
          consent,
          leadId: id,
          overrideMarketing: body.override_marketing ?? false,
        })
      : await engine.sendEmail({
          to,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          templateSlug: body.template_slug as any,
          vars: body.vars ?? {},
          consent,
          leadId: id,
          overrideMarketing: body.override_marketing ?? false,
        });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason, template_slug: result.templateSlug },
      { status: 400, headers: NO_STORE }
    );
  }
  return NextResponse.json(
    {
      ok: true,
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      template_slug: result.templateSlug,
    },
    { headers: NO_STORE }
  );
}
