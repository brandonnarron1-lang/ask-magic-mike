import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import {
  leadFactsFingerprint,
  loadLeadIntelligenceFacts,
} from "@/lib/ai/neon-intelligence";

const requestSchema = z.object({
  expectedVersion: z.number().int().positive(),
  action: z.enum(["edit", "approve", "reject", "expire"]),
  content: z.string().max(12_000).optional(),
});
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ draftKey: string }> },
) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "lead:update_assigned");
  if (!auth.ok) return auth.response;
  const { draftKey } = await context.params;
  if (!UUID.test(draftKey)) return NextResponse.json({ ok: false, error: "invalid_draft_key" }, { status: 400, headers: NO_STORE });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.action === "edit" && !parsed.data.content?.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.statusCode, headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });

  const sql = neon(process.env.DATABASE_URL);
  const scoped = !hasLeadCenterPermission(auth.principal.role, "lead:view_all");
  if (scoped && !auth.principal.agentId) return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404, headers: NO_STORE });
  const authorized = await sql.query(
    `SELECT d.lead_id, d.source_fingerprint, d.version
       FROM public.ai_draft_reviews d
       JOIN public.leads l ON l.id = d.lead_id
      WHERE d.draft_key = $1::uuid${scoped ? " AND l.assigned_agent_id = $2::uuid" : ""}
      ORDER BY d.version DESC LIMIT 1`,
    scoped ? [draftKey, auth.principal.agentId] : [draftKey],
  ) as Array<{ lead_id: string; source_fingerprint: string; version: number }>;
  if (!authorized[0]) return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404, headers: NO_STORE });

  if (parsed.data.action !== "expire") {
    let currentFacts: Awaited<ReturnType<typeof loadLeadIntelligenceFacts>>;
    try {
      currentFacts = await loadLeadIntelligenceFacts(
        sql,
        authorized[0].lead_id,
        scoped ? auth.principal.agentId : null,
      );
    } catch {
      return NextResponse.json({ ok: false, error: "communication_permissions_unavailable" }, { status: 503, headers: NO_STORE });
    }
    if (!currentFacts) return NextResponse.json({ ok: false, error: "draft_not_found" }, { status: 404, headers: NO_STORE });
    if (leadFactsFingerprint(currentFacts.facts) !== authorized[0].source_fingerprint) {
      const expiredRows = await sql.query(
        `SELECT public.mutate_ai_draft_review_v1(
           $1::uuid, $2::integer, 'expire', '', '', $3::text, now()
         ) AS result`,
        [draftKey, parsed.data.expectedVersion, auth.principal.userId],
      ) as Array<{ result?: Record<string, unknown> }>;
      const expired = expiredRows[0]?.result || {};
      return NextResponse.json({
        ok: false,
        error: expired.ok === true ? "stale_draft_facts" : (expired.error || "stale_draft_version"),
        expired: expired.ok === true,
        version: expired.version,
        status: expired.status,
        sendsCommunication: false,
      }, { status: 409, headers: NO_STORE });
    }
  }

  const content = parsed.data.action === "edit" ? parsed.data.content!.trim() : "";
  const contentHash = content ? createHash("sha256").update(content).digest("hex") : "";
  const rows = await sql.query(
    `SELECT public.mutate_ai_draft_review_v1(
       $1::uuid, $2::integer, $3::text, $4::text, $5::text, $6::text, now()
     ) AS result`,
    [draftKey, parsed.data.expectedVersion, parsed.data.action, content, contentHash, auth.principal.userId],
  ) as Array<{ result?: Record<string, unknown> }>;
  const result = rows[0]?.result || {};
  if (result.ok !== true) {
    const error = typeof result.error === "string" ? result.error : "draft_review_failed";
    const conflict = error === "stale_draft_version";
    return NextResponse.json({ ok: false, error }, { status: conflict ? 409 : 400, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, ...result, sendsCommunication: false }, { headers: NO_STORE });
}
