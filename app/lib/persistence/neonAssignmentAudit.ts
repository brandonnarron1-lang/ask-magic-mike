import { neon } from "@neondatabase/serverless";
import {
  buildAssignmentAuditPayload,
  normalizeAssignmentAuditRow,
  type AdminAssignmentAuditEvent,
  type AdminAssignmentAuditRecord,
  type AdminAssignmentAuditResult,
} from "./supabase/adminAssignmentAudit";

type Query = ReturnType<typeof neon>;
function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

export async function writeNeonAssignmentAuditEvent(
  event: AdminAssignmentAuditEvent,
): Promise<AdminAssignmentAuditResult> {
  const sql = queryFromEnv();
  if (!sql) return { ok: false, statusCode: 503, error: "audit_store_not_configured" };
  const payload = buildAssignmentAuditPayload(event);
  try {
    const rows = await sql.query(
      `INSERT INTO public.audit_logs
        (actor, action, resource_type, resource_id, before_state, after_state, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
       RETURNING id, created_at`,
      [
        payload.actor,
        payload.action,
        payload.resource_type,
        payload.resource_id,
        JSON.stringify(payload.before_state),
        JSON.stringify(payload.after_state),
        JSON.stringify(payload.metadata),
      ],
    ) as Array<Record<string, unknown>>;
    return {
      ok: true,
      id: typeof rows[0]?.id === "string" ? rows[0].id : undefined,
      created_at: typeof rows[0]?.created_at === "string" ? rows[0].created_at : null,
    };
  } catch {
    return { ok: false, statusCode: 500, error: "audit_write_failed" };
  }
}

export async function loadRecentNeonAssignmentAuditEvents(
  limit = 25,
): Promise<{ configured: boolean; events: AdminAssignmentAuditRecord[]; error?: string }> {
  const sql = queryFromEnv();
  if (!sql) return { configured: false, events: [] };
  const capped = Math.max(1, Math.min(limit, 50));
  try {
    const rows = await sql.query(
      `SELECT id, created_at, actor, action, resource_type, resource_id,
              before_state, after_state, metadata
         FROM public.audit_logs
        WHERE resource_type = 'lead'
          AND action IN ('lead.assigned','lead.reassigned','lead.unassigned')
        ORDER BY created_at DESC
        LIMIT $1`,
      [capped],
    ) as Array<Record<string, unknown>>;
    return { configured: true, events: rows.map(normalizeAssignmentAuditRow) };
  } catch {
    return { configured: true, events: [], error: "Canonical Neon assignment audit query failed" };
  }
}

