import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const body = (await req.json().catch(() => ({}))) as { note?: string; agent_id?: string };
  const note = (body.note ?? "").trim();
  if (!note)
    return NextResponse.json(
      { ok: false, error: "note_required" },
      { status: 400, headers: NO_STORE }
    );
  if (note.length > 5000)
    return NextResponse.json(
      { ok: false, error: "note_too_long" },
      { status: 413, headers: NO_STORE }
    );

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { ok: true, note: "mock_mode", body: note },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { error: insertErr } = await client.from("messages").insert({
    lead_id: id,
    role: "agent",
    content: note,
    agent_id: body.agent_id ?? null,
  });

  if (insertErr) {
    console.error("[notes] insert error:", insertErr.message);
    return NextResponse.json(
      { ok: false, error: "note_save_failed" },
      { status: 500, headers: NO_STORE }
    );
  }

  await client.from("audit_logs").insert({
    actor: auth.actor,
    action: "lead.note_added",
    resource_type: "lead",
    resource_id: id,
    after_state: { len: note.length },
  });

  trackEventNoWait({
    eventName: "note_added",
    leadId: id,
    properties: { len: note.length },
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
