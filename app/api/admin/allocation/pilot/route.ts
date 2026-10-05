import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "../../../../../src/lib/admin/rbac-session";
import { allocationQuery } from "../../../../lib/leadAllocation";
import { staffPilotMutationGate } from "../../../../lib/staffAllocationPilot";
import { processPendingStaffPilotIntents } from "../../../../lib/leadAllocationDispatch";

export const runtime = "nodejs";
export const maxDuration = 45;
const headers = { "Cache-Control": "private, no-store" };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seed"), pilotId: z.string().uuid(), index: z.number().int().min(1).max(3) }).strict(),
  z.object({ action: z.literal("offer"), pilotId: z.string().uuid(), leadId: z.string().uuid(), version: z.number().int().nonnegative() }).strict(),
  z.object({ action: z.literal("dispatch"), pilotId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("pause"), pilotId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("expire"), pilotId: z.string().uuid() }).strict(),
]);
/** No GET mutation, arming endpoint, arbitrary recipient/body/budget/roster,
 * public intake trigger, cron, or bypass of ordinary QA suppression. */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers });
  const auth = await requireLeadCenterApiPermission(request, "routing:manage");
  if (!auth.ok) return auth.response;
  const gate = staffPilotMutationGate();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.statusCode, headers });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers });
  const sql = allocationQuery();
  if (!sql) return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503, headers });
  const body = parsed.data;
  try {
    const scope = (await sql.query(`SELECT id,lead_ids FROM public.lead_allocation_pilots
      WHERE id=$1::uuid AND approved_by=$2 AND approved_at IS NOT NULL
        AND active AND clock_timestamp()>=starts_at AND clock_timestamp()<ends_at`, [body.pilotId, auth.principal.userId]))[0];
    // Pause is allowed after expiry; nothing else can revive a closed scope.
    if (body.action === "pause") {
      const result = (await sql.query(`WITH fence AS MATERIALIZED (SELECT pg_advisory_xact_lock(731042026)), changed AS (
        UPDATE public.lead_allocation_pilots SET active=false FROM fence WHERE id=$1::uuid AND approved_by=$2 AND active RETURNING id),
        audit AS (INSERT INTO public.audit_logs(actor,action,resource_type,resource_id,metadata)
          SELECT $2,'allocation.pilot_paused','allocation_pilot',id,'{}'::jsonb FROM changed RETURNING id)
        SELECT id FROM changed`, [body.pilotId, auth.principal.userId]))[0];
      return NextResponse.json({ ok: Boolean(result), sendsMessage: false }, { status: result ? 200 : 409, headers });
    }
    if (body.action === "expire") {
      const result=(await sql.query("SELECT public.expire_staff_allocation_pilot_v1($1::uuid,$2) AS result",[body.pilotId,auth.principal.userId]))[0]?.result as {ok?:boolean};
      return NextResponse.json(result,{status:result?.ok?200:409,headers});
    }
    if (!scope) return NextResponse.json({ ok: false, error: "pilot_scope_held" }, { status: 409, headers });
    if (body.action === "dispatch") return NextResponse.json(await processPendingStaffPilotIntents(sql, body.pilotId), { headers });
    const rows = body.action === "seed"
      ? await sql.query("SELECT public.seed_staff_allocation_fixture_v1($1::uuid,$2::int,$3) AS result", [body.pilotId, body.index, auth.principal.userId])
      : await sql.query(`SELECT public.create_lead_allocation_offers_v1($1::uuid,$2::bigint,$3) AS result
            WHERE EXISTS(SELECT 1 FROM public.staff_allocation_pilot_v1($1::uuid) WHERE id=$4::uuid)`, [body.leadId, body.version, auth.principal.userId, body.pilotId]);
    const result = rows[0]?.result as { ok?: boolean } | undefined;
    return NextResponse.json(result || { ok: false, error: "pilot_scope_held" }, { status: result?.ok ? 200 : 409, headers });
  } catch {
    return NextResponse.json({ ok: false, error: "pilot_operation_unavailable", noAutomaticResend: true }, { status: 503, headers });
  }
}
