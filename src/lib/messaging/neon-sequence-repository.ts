import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { LeadCenterPrincipal } from "@/lib/admin/rbac-policy";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";
import { assertDatabaseMutationAllowed } from "@/lib/preview-security";
import { materializeSequence, MESSAGE_SEQUENCES } from "./sequence-engine";
import { sequenceMustStop, transitionSequence, type SequenceAction, type SequenceStatus } from "./sequence-state-machine";

function sqlFromEnv() {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function scopedWhere(principal: LeadCenterPrincipal, parameter = 2) {
  return hasLeadCenterPermission(principal.role, "lead:view_all") ? "" : ` AND l.assigned_agent_id = $${parameter}::uuid`;
}

function scopedParams(principal: LeadCenterPrincipal, leadId: string) {
  return hasLeadCenterPermission(principal.role, "lead:view_all") ? [leadId] : [leadId, principal.agentId];
}

export async function loadLeadSequences(leadId: string, principal: LeadCenterPrincipal) {
  const sql = sqlFromEnv();
  if (!sql) return { ok: false as const, statusCode: 503, error: "database_not_configured" };
  if (!hasLeadCenterPermission(principal.role, "lead:view_all") && !principal.agentId) {
    return { ok: false as const, statusCode: 404, error: "lead_not_found" };
  }
  const leadRows = await sql.query(
    `SELECT l.id FROM public.leads l WHERE l.id = $1::uuid${scopedWhere(principal)} LIMIT 1`,
    scopedParams(principal, leadId),
  ) as Array<{ id: string }>;
  if (!leadRows[0]) return { ok: false as const, statusCode: 404, error: "lead_not_found" };
  const rows = await sql.query(
    `SELECT msi.id, msi.sequence_id, msi.sequence_version, msi.status,
            msi.started_at, msi.stopped_at, msi.stop_reason, msi.created_at,
            msi.last_transition_at, msi.last_transition_by,
            COALESCE(json_agg(json_build_object(
              'id', msr.id, 'stepIndex', msr.step_index, 'templateId', msr.template_id,
              'templateVersion', msr.template_version, 'scheduledAt', msr.scheduled_at,
              'status', msr.status, 'humanApprovedAt', msr.human_approved_at
            ) ORDER BY msr.step_index) FILTER (WHERE msr.id IS NOT NULL), '[]') AS steps
       FROM public.message_sequence_instances msi
       LEFT JOIN public.message_sequence_step_runs msr ON msr.sequence_instance_id = msi.id
      WHERE msi.lead_id = $1::uuid
      GROUP BY msi.id
      ORDER BY msi.created_at DESC`,
    [leadId],
  ) as Array<Record<string, unknown>>;
  return { ok: true as const, sequences: rows, definitions: MESSAGE_SEQUENCES };
}

export async function createLeadSequence(input: {
  leadId: string;
  sequenceId: string;
  principal: LeadCenterPrincipal;
}) {
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false as const, statusCode: mutation.statusCode, error: mutation.error };
  const sql = sqlFromEnv();
  if (!sql) return { ok: false as const, statusCode: 503, error: "database_not_configured" };
  const definition = MESSAGE_SEQUENCES.find((candidate) => candidate.id === input.sequenceId);
  if (!definition) return { ok: false as const, statusCode: 400, error: "unknown_sequence" };
  const leadRows = await sql.query(
    `SELECT l.id, l.is_test, l.communication_suppressed, l.status,
            l.email_suppressed, l.sms_suppressed, l.master_lead_id
       FROM public.leads l
      WHERE l.id = $1::uuid${scopedWhere(input.principal)} LIMIT 1`,
    scopedParams(input.principal, input.leadId),
  ) as Array<Record<string, unknown>>;
  const lead = leadRows[0];
  if (!lead) return { ok: false as const, statusCode: 404, error: "lead_not_found" };
  const stop = sequenceMustStop({
    isTest: lead.is_test === true,
    suppressed: lead.communication_suppressed === true,
    optedOut: lead.email_suppressed === true || lead.sms_suppressed === true,
    duplicate: Boolean(lead.master_lead_id),
    terminalStage: ["closed", "closed_won", "closed_lost", "disqualified", "spam_test"].includes(String(lead.status || "")),
    allowSuppressedQaTest: true,
  });
  const status: SequenceStatus = stop.stop ? "blocked" : "draft";
  const instanceRows = await sql.query(
    `INSERT INTO public.message_sequence_instances
      (lead_id, sequence_id, sequence_version, status, stop_reason, created_by,
       last_transition_at, last_transition_by, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, now(), $6, $7::jsonb)
     ON CONFLICT (lead_id, sequence_id, sequence_version)
     DO UPDATE SET updated_at = public.message_sequence_instances.updated_at
     RETURNING id, status`,
    [input.leadId, definition.id, definition.version, status, stop.reason,
      input.principal.userId, JSON.stringify({ release: "phase7", auto_send: false })],
  ) as Array<{ id: string; status: SequenceStatus }>;
  const instance = instanceRows[0];
  if (!instance) return { ok: false as const, statusCode: 500, error: "sequence_create_failed" };
  const steps = materializeSequence(definition.id, new Date());
  for (const step of steps) {
    const idempotencyKey = createHash("sha256").update(`${instance.id}:${step.stepIndex}:${step.template.id}:${step.template.version}`).digest("hex");
    await sql.query(
      `INSERT INTO public.message_sequence_step_runs
        (sequence_instance_id, step_index, template_id, template_version,
         scheduled_at, status, idempotency_key, purpose, channel)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9)
       ON CONFLICT (sequence_instance_id, step_index) DO NOTHING`,
      [instance.id, step.stepIndex, step.template.id, step.template.version,
        step.scheduledAt, stop.stop ? "blocked" : "draft", idempotencyKey,
        step.template.purpose, step.template.channel],
    );
  }
  await sql.query(
    `INSERT INTO public.audit_logs
      (actor, action, resource_type, resource_id, before_state, after_state, metadata)
     VALUES ($1, 'lead.sequence_created', 'lead', $2, NULL, $3::jsonb, $4::jsonb)`,
    [input.principal.userId, input.leadId,
      JSON.stringify({ sequence_instance_id: instance.id, status: instance.status }),
      JSON.stringify({ sequence_id: definition.id, sequence_version: definition.version, stop_reason: stop.reason })],
  );
  return { ok: true as const, sequenceInstanceId: instance.id, status: instance.status, stopReason: stop.reason };
}

export async function transitionLeadSequence(input: {
  leadId: string;
  sequenceInstanceId: string;
  action: SequenceAction;
  principal: LeadCenterPrincipal;
  schedulerEnabled: boolean;
}) {
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false as const, statusCode: mutation.statusCode, error: mutation.error };
  const sql = sqlFromEnv();
  if (!sql) return { ok: false as const, statusCode: 503, error: "database_not_configured" };
  const rows = await sql.query(
    `SELECT msi.id, msi.sequence_id, msi.status, l.is_test, l.communication_suppressed FROM public.message_sequence_instances msi
       JOIN public.leads l ON l.id = msi.lead_id
      WHERE msi.id = $1::uuid AND msi.lead_id = $2::uuid${scopedWhere(input.principal, 3)} LIMIT 1`,
    hasLeadCenterPermission(input.principal.role, "lead:view_all")
      ? [input.sequenceInstanceId, input.leadId]
      : [input.sequenceInstanceId, input.leadId, input.principal.agentId],
  ) as Array<{ id: string; sequence_id: string; status: SequenceStatus; is_test: boolean; communication_suppressed: boolean }>;
  const current = rows[0];
  if (!current) return { ok: false as const, statusCode: 404, error: "sequence_not_found" };
  if (["approve", "activate", "begin_test"].includes(input.action) && !input.schedulerEnabled) {
    return { ok: false as const, statusCode: 409, error: "sequence_scheduler_disabled" };
  }
  if (input.action === "begin_test" && !(current.is_test === true && current.communication_suppressed === true)) {
    return { ok: false as const, statusCode: 409, error: "test_sequence_requires_suppressed_test_lead" };
  }
  const transition = transitionSequence(current.status, input.action);
  if (!transition.ok) return { ok: false as const, statusCode: 409, error: transition.error };
  const updated = await sql.query(
    `UPDATE public.message_sequence_instances
        SET status = $1, updated_at = now(), last_transition_at = now(), last_transition_by = $2,
            started_at = CASE WHEN $1 IN ('test','scheduled','active') THEN COALESCE(started_at, now()) ELSE started_at END,
            stopped_at = CASE WHEN $1 IN ('completed','cancelled','blocked','failed') THEN now() ELSE stopped_at END,
            stop_reason = CASE WHEN $1 IN ('cancelled','blocked','failed') THEN $3 ELSE stop_reason END
      WHERE id = $4::uuid AND status = $5
      RETURNING id`,
    [transition.next, input.principal.userId, input.action, current.id, current.status],
  ) as Array<{ id: string }>;
  if (!updated[0]) return { ok: false as const, statusCode: 409, error: "concurrent_sequence_update" };
  if (input.action === "begin_test") {
    const scheduledSteps = materializeSequence(current.sequence_id, new Date());
    for (const step of scheduledSteps) {
      await sql.query(
        `UPDATE public.message_sequence_step_runs
            SET status = 'scheduled', scheduled_at = $1::timestamptz, updated_at = now()
          WHERE sequence_instance_id = $2::uuid AND step_index = $3
            AND status IN ('draft', 'approval_required', 'scheduled')`,
        [step.scheduledAt, current.id, step.stepIndex],
      );
    }
  }
  await sql.query(
    `INSERT INTO public.audit_logs
      (actor, action, resource_type, resource_id, before_state, after_state, metadata)
     VALUES ($1, 'lead.sequence_transitioned', 'lead', $2, $3::jsonb, $4::jsonb, $5::jsonb)`,
    [input.principal.userId, input.leadId, JSON.stringify({ status: current.status }),
      JSON.stringify({ status: transition.next }),
      JSON.stringify({ sequence_instance_id: current.id, action: input.action })],
  );
  return { ok: true as const, status: transition.next };
}
