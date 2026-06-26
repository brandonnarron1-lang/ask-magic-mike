import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin/auth";
import { loadLeadDetail } from "@/lib/admin/lead-detail";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { LEAD_STATUSES, LEAD_TYPES } from "@/lib/leads/lead-types";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { ok: false, error: "bad_id" },
      { status: 400, headers: NO_STORE }
    );
  }
  const detail = await loadLeadDetail(id);
  if (!detail) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json({ ok: true, ...detail }, { headers: NO_STORE });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { ok: false, error: "bad_id" },
      { status: 400, headers: NO_STORE }
    );
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof body.status === "string" && (LEAD_STATUSES as readonly string[]).includes(body.status)) {
    updates.status = body.status;
  }
  if (typeof body.lead_type === "string" && (LEAD_TYPES as readonly string[]).includes(body.lead_type)) {
    updates.lead_type = body.lead_type;
  }
  if (typeof body.lead_grade === "string") updates.lead_grade = body.lead_grade;
  if (typeof body.next_follow_up_at === "string" || body.next_follow_up_at === null)
    updates.next_follow_up_at = body.next_follow_up_at;
  if (typeof body.last_contacted_at === "string" || body.last_contacted_at === null)
    updates.last_contacted_at = body.last_contacted_at;
  if (typeof body.closed_lost_reason === "string")
    updates.closed_lost_reason = body.closed_lost_reason;
  if (typeof body.mark_spam === "boolean") {
    updates.status = body.mark_spam ? "spam" : "qualified";
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_supported_fields" },
      { status: 400, headers: NO_STORE }
    );
  }

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured) {
    return NextResponse.json(
      { ok: true, note: "mock_mode", updates },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { data: prior } = await client
    .from("leads")
    .select("status, lead_type, lead_grade")
    .eq("id", id)
    .maybeSingle();

  const { error } = await client.from("leads").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  await client.from("audit_logs").insert({
    actor: auth.actor,
    action: "lead.updated",
    resource_type: "lead",
    resource_id: id,
    before_state: prior ?? null,
    after_state: updates,
  });

  if (updates.status) {
    trackEventNoWait({
      eventName: "lead_updated",
      leadId: id,
      properties: { newStatus: updates.status },
    });
  }

  return NextResponse.json({ ok: true, updates }, { headers: NO_STORE });
}
