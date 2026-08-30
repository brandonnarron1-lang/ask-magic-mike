import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminAuth } from "@/lib/admin/auth";
import { addCanonicalAdminLeadNote } from "@/lib/admin/lead-operations";
import { trackEventNoWait } from "@/lib/analytics/ledger";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NoteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
  agent_id: z.string().uuid().nullable().optional(),
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

  const parsed = NoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.code === "too_big");
    return NextResponse.json(
      { ok: false, error: tooLong ? "note_too_long" : "note_required" },
      { status: tooLong ? 413 : 400, headers: NO_STORE }
    );
  }

  const result = await addCanonicalAdminLeadNote({
    leadId: id,
    content: parsed.data.note,
    agentId: parsed.data.agent_id,
    actor: auth.actor,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.statusCode, headers: NO_STORE }
    );
  }

  trackEventNoWait({
    eventName: "note_added",
    leadId: id,
    properties: { len: parsed.data.note.length },
  });

  return NextResponse.json({
    ok: true,
    message_id: result.value.messageId,
    audit_id: result.value.auditId,
    created_at: result.value.createdAt,
  }, { headers: NO_STORE });
}
