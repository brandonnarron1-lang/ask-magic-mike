import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminAuth } from "@/lib/admin/auth";
import { assignCanonicalAdminLead } from "@/lib/admin/lead-operations";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AssignmentSchema = z.object({
  agent_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
}).strict();

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

  const parsed = AssignmentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, error: "agent_id_required" },
      { status: 400, headers: NO_STORE }
    );

  const result = await assignCanonicalAdminLead({
    leadId: id,
    agentId: parsed.data.agent_id,
    reason: parsed.data.reason,
    actor: auth.actor,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.statusCode, headers: NO_STORE }
    );
  }

  trackEventNoWait({
    eventName: "lead_assigned",
    leadId: id,
    agentId: parsed.data.agent_id,
    properties: { reasonProvided: Boolean(parsed.data.reason) },
  });

  return NextResponse.json({
    ok: true,
    lead_id: id,
    agent_id: parsed.data.agent_id,
    action: result.value.action,
    audit_id: result.value.auditId ?? null,
    notification_id: result.value.notificationId ?? null,
    notification_status: result.value.notificationStatus ?? null,
    idempotent_replay: result.value.idempotentReplay,
  }, { headers: NO_STORE });
}
