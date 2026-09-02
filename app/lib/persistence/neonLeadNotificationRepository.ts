import { neon } from "@neondatabase/serverless";
import type {
  AssignmentNotificationAgent,
  AssignmentNotificationLead,
  LeadNotificationCreateInput,
  LeadNotificationRecord,
  LeadNotificationRepository,
} from "../leadNotificationTypes";
import {
  normalizeAssignmentAgentRow,
  normalizeAssignmentLeadRow,
  normalizeLeadNotificationRow,
} from "./supabase/leadNotificationRepository";

type Query = ReturnType<typeof neon>;

function queryFromEnv(env: Record<string, string | undefined> = process.env): Query | null {
  return env.DATABASE_URL ? neon(env.DATABASE_URL) : null;
}

const PATCH_COLUMNS = new Set([
  "status", "attempt_count", "max_attempts", "provider", "provider_message_id",
  "error_code", "error_summary", "next_attempt_at", "sent_at", "failed_at", "metadata",
]);

function row(value: unknown): LeadNotificationRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? normalizeLeadNotificationRow(value as Record<string, unknown>)
    : null;
}

/** Direct Postgres outbox repository. It deliberately persists delivery state
 * before provider delivery, and only accepts an allowlisted update patch. */
export class NeonLeadNotificationRepository implements LeadNotificationRepository {
  constructor(private readonly sql: Query) {}

  static fromEnv(env: Record<string, string | undefined> = process.env) {
    return env.DATABASE_URL ? new NeonLeadNotificationRepository(neon(env.DATABASE_URL)) : null;
  }

  async create(input: LeadNotificationCreateInput): Promise<LeadNotificationRecord> {
    const rows = await this.sql.query(
      `INSERT INTO public.lead_notifications (
        lead_id, agent_id, assignment_audit_id, assignment_event_at,
        notification_type, channel, recipient_type, recipient_reference,
        template_version, idempotency_key, status, max_attempts, provider, metadata
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::timestamptz,
        $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb
      ) ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
      [
        input.lead_id, input.agent_id, input.assignment_audit_id || null,
        input.assignment_event_at || null, input.notification_type, input.channel,
        input.recipient_type, input.recipient_reference || null, input.template_version,
        input.idempotency_key, input.status || "pending", input.max_attempts ?? 3,
        input.provider || null, JSON.stringify(input.metadata || {}),
      ],
    );
    const created = row((rows as unknown[])[0]);
    if (created) return created;
    const existing = await this.findByIdempotencyKey(input.idempotency_key);
    if (existing) return existing;
    throw new Error("notification_create_failed");
  }

  async findById(id: string) {
    const rows = await this.sql.query("SELECT * FROM public.lead_notifications WHERE id = $1::uuid LIMIT 1", [id]);
    return row((rows as unknown[])[0]);
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.sql.query("SELECT * FROM public.lead_notifications WHERE idempotency_key = $1 LIMIT 1", [idempotencyKey]);
    return row((rows as unknown[])[0]);
  }

  async update(id: string, patch: Partial<LeadNotificationRecord>) {
    const entries = Object.entries(patch).filter(([key]) => PATCH_COLUMNS.has(key));
    if (!entries.length) return this.findById(id);
    const values: unknown[] = [];
    const assignments = entries.map(([key, value], index) => {
      values.push(key === "metadata" ? JSON.stringify(value || {}) : value);
      return `${key} = $${index + 1}${key === "metadata" ? "::jsonb" : ""}`;
    });
    values.push(id);
    const rows = await this.sql.query(
      `UPDATE public.lead_notifications SET ${assignments.join(", ")} WHERE id = $${values.length}::uuid RETURNING *`,
      values,
    );
    return row((rows as unknown[])[0]);
  }

  async claimForProcessing(id: string, patch: Partial<LeadNotificationRecord>) {
    const entries = Object.entries(patch).filter(([key]) => PATCH_COLUMNS.has(key));
    if (!entries.length) return null;
    const values: unknown[] = [];
    const assignments = entries.map(([key, value], index) => {
      values.push(key === "metadata" ? JSON.stringify(value || {}) : value);
      return `${key} = $${index + 1}${key === "metadata" ? "::jsonb" : ""}`;
    });
    values.push(id);
    const rows = await this.sql.query(
      `UPDATE public.lead_notifications SET ${assignments.join(", ")}
       WHERE id = $${values.length}::uuid
         AND status IN ('pending', 'failed', 'retry_scheduled') RETURNING *`,
      values,
    );
    return row((rows as unknown[])[0]);
  }

  async listRecent(limit = 50) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        ORDER BY n.created_at DESC
        LIMIT $1`,
      [Math.max(1, Math.min(limit, 100))],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  async listByLead(leadId: string, limit = 25) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        WHERE n.lead_id = $1::uuid
        ORDER BY n.created_at DESC
        LIMIT $2`,
      [leadId, Math.max(1, Math.min(limit, 50))],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }

  async listRetryable(limit = 25, now = new Date()) {
    const rows = await this.sql.query(
      `SELECT n.*, l.is_test AS lead_is_test
         FROM public.lead_notifications n
         LEFT JOIN public.leads l ON l.id = n.lead_id
        WHERE n.status IN ('failed', 'retry_scheduled')
          AND n.next_attempt_at <= $1::timestamptz
        ORDER BY n.next_attempt_at ASC
        LIMIT $2`,
      [now.toISOString(), Math.max(1, Math.min(limit, 50))],
    );
    return (rows as unknown[]).map(row).filter((value): value is LeadNotificationRecord => Boolean(value));
  }
}

export async function loadNeonLeadForNotification(
  leadId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationLead | null> {
  const sql = queryFromEnv(env);
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, created_at, status, assigned_agent_id, assigned_at,
            assignment_status, first_name, last_name, address_raw,
            primary_intent, timeline_months, lead_type, source,
            source_detail, page_url, question_raw
       FROM public.leads
      WHERE id = $1::uuid
      LIMIT 1`,
    [leadId],
  ) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentLeadRow(rows[0]) : null;
}

export async function loadNeonAgentForNotification(
  agentId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<AssignmentNotificationAgent | null> {
  const sql = queryFromEnv(env);
  if (!sql) return null;
  const rows = await sql.query(
    `SELECT id, name, email, phone, notification_phone, role, is_active
       FROM public.agents
      WHERE id = $1::uuid
      LIMIT 1`,
    [agentId],
  ) as Array<Record<string, unknown>>;
  return rows[0] ? normalizeAssignmentAgentRow(rows[0]) : null;
}
