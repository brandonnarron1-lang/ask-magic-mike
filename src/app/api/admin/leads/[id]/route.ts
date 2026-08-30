import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminAuth } from "@/lib/admin/auth";
import { loadLeadDetail } from "@/lib/admin/lead-detail";
import {
  ADMIN_LEAD_STATUSES,
  patchCanonicalAdminLead,
  type CanonicalAdminLeadPatch,
} from "@/lib/admin/lead-operations";
import { trackEventNoWait } from "@/lib/analytics/ledger";
import { LEAD_TYPES, LEAD_GRADES } from "@/lib/leads/lead-types";

const NO_STORE = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = z.string().trim().max(64).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "invalid_timestamp",
);
const AdminLeadPatchSchema = z.object({
  status: z.enum(ADMIN_LEAD_STATUSES).optional(),
  lead_type: z.enum(LEAD_TYPES).optional(),
  lead_grade: z.enum(LEAD_GRADES).nullable().optional(),
  next_follow_up_at: timestamp.nullable().optional(),
  last_contacted_at: timestamp.nullable().optional(),
  closed_lost_reason: z.string().trim().max(500).nullable().optional(),
  mark_spam: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "no_supported_fields");

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
  if (detail && (!detail.configured || detail.error)) {
    return NextResponse.json(
      { ok: false, error: detail.error || "lead_store_not_configured" },
      { status: 503, headers: NO_STORE }
    );
  }
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
  const rawBody = await req.json().catch(() => null);
  const parsed = AdminLeadPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "no_supported_fields" },
      { status: 400, headers: NO_STORE }
    );
  }
  const { mark_spam: markSpam, ...validatedPatch } = parsed.data;
  const patch: CanonicalAdminLeadPatch = validatedPatch;
  if (markSpam === true) patch.status = "spam";
  if (markSpam === false) {
    delete patch.status;
    patch.restore_status_before_spam = true;
  }

  const result = await patchCanonicalAdminLead({
    leadId: id,
    patch,
    actor: auth.actor,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.statusCode, headers: NO_STORE }
    );
  }

  const persistedPatch = result.value.patch;
  if (persistedPatch.status) {
    trackEventNoWait({
      eventName: "lead_updated",
      leadId: id,
      properties: { newStatus: persistedPatch.status },
    });
  }

  return NextResponse.json({
    ok: true,
    lead_id: result.value.leadId,
    audit_id: result.value.auditId,
    updated_at: result.value.updatedAt,
    updates: persistedPatch,
  }, { headers: NO_STORE });
}
