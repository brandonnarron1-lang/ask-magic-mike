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

  const body = (await req.json().catch(() => ({}))) as {
    agent_id?: string;
    reason?: string;
  };
  if (!body.agent_id || !UUID.test(body.agent_id))
    return NextResponse.json(
      { ok: false, error: "agent_id_required" },
      { status: 400, headers: NO_STORE }
    );

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured) {
    return NextResponse.json(
      { ok: true, note: "mock_mode", lead_id: id, agent_id: body.agent_id },
      { headers: NO_STORE }
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const { error: assignErr } = await client.from("leads").update({
    assigned_agent_id: body.agent_id,
    assigned_at: new Date().toISOString(),
    assignment_status: "assigned",
  }).eq("id", id);

  if (assignErr) {
    return NextResponse.json(
      { ok: false, error: "assignment_failed" },
      { status: 500, headers: NO_STORE }
    );
  }

  const { error: assignmentInsertErr } = await client.from("agent_assignments").insert({
    lead_id: id,
    agent_id: body.agent_id,
    assigned_by: "admin",
    assignment_reason: body.reason ?? "manual_admin_assignment",
    status: "pending",
  });
  if (assignmentInsertErr) {
    console.error("[assign] agent_assignments insert failed:", assignmentInsertErr.message);
  }

  const { error: auditErr } = await client.from("audit_logs").insert({
    actor: auth.actor,
    action: "lead.assigned",
    resource_type: "lead",
    resource_id: id,
    after_state: { agent_id: body.agent_id, reason: body.reason ?? null },
  });
  if (auditErr) {
    console.error("[assign] audit_logs insert failed:", auditErr.message);
  }

  trackEventNoWait({
    eventName: "lead_assigned",
    leadId: id,
    agentId: body.agent_id,
    properties: { reason: body.reason ?? null },
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
