import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireLeadCenterApiPermission } from "@/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
const schema = z.object({ leadId: z.string().uuid() });

function enabled() {
  return (process.env.AI_ASYNC_COPILOT_ENABLED || "false").toLowerCase() === "true"
    && (process.env.AI_EMERGENCY_DISABLED || "false").toLowerCase() !== "true";
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403, headers: NO_STORE });
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  if (!enabled()) return NextResponse.json({ ok: false, error: "async_copilot_disabled" }, { status: 409, headers: NO_STORE });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400, headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  const sql = neon(process.env.DATABASE_URL);
  const scoped = !hasLeadCenterPermission(auth.principal.role, "lead:view_all");
  if (scoped && !auth.principal.agentId) return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404, headers: NO_STORE });
  const leads = await sql.query(
    `SELECT id FROM public.leads WHERE id = $1::uuid${scoped ? " AND assigned_agent_id = $2::uuid" : ""} LIMIT 1`,
    scoped ? [parsed.data.leadId, auth.principal.agentId] : [parsed.data.leadId],
  ) as Array<{ id: string }>;
  if (!leads[0]) return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404, headers: NO_STORE });
  const release = process.env.VERCEL_GIT_COMMIT_SHA || "local";
  const requestKey = createHash("sha256").update(`${parsed.data.leadId}:${auth.principal.userId}:phase7-v1:${release}`).digest("hex");
  const rows = await sql.query(
    `INSERT INTO public.ai_intelligence_jobs
      (lead_id, status, request_key, requested_by, metadata)
     VALUES ($1::uuid, 'queued', $2, $3, $4::jsonb)
     ON CONFLICT (request_key) DO UPDATE SET updated_at = now()
     RETURNING id, status, created_at`,
    [parsed.data.leadId, requestKey, auth.principal.userId, JSON.stringify({ release, read_only: true })],
  ) as Array<Record<string, unknown>>;
  return NextResponse.json({ ok: true, job: rows[0], mutatesLead: false, sendsCommunication: false }, { status: 202, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const auth = await requireLeadCenterApiPermission(request, "lead:view_assigned");
  if (!auth.ok) return auth.response;
  const leadId = new URL(request.url).searchParams.get("lead_id");
  if (!leadId || !z.string().uuid().safeParse(leadId).success) return NextResponse.json({ ok: false, error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503, headers: NO_STORE });
  const sql = neon(process.env.DATABASE_URL);
  const scoped = !hasLeadCenterPermission(auth.principal.role, "lead:view_all");
  const rows = await sql.query(
    `SELECT aij.id, aij.status, aij.attempt_count, aij.last_error_code,
            aij.created_at, aij.completed_at, aij.result_id
       FROM public.ai_intelligence_jobs aij
       JOIN public.leads l ON l.id = aij.lead_id
      WHERE aij.lead_id = $1::uuid${scoped ? " AND l.assigned_agent_id = $2::uuid" : ""}
      ORDER BY aij.created_at DESC LIMIT 10`,
    scoped ? [leadId, auth.principal.agentId] : [leadId],
  ) as Array<Record<string, unknown>>;
  return NextResponse.json({ ok: true, jobs: rows }, { headers: NO_STORE });
}

