import { neon } from "@neondatabase/serverless";
import type { LeadCenterPrincipal } from "@/lib/admin/rbac-policy";
import { hasLeadCenterPermission } from "@/lib/admin/rbac-policy";
import type { MessageChannel, MessagePurpose } from "./permission-engine";
import {
  evaluateLeadCommunicationPermission,
  permissionDecisionIdempotencyKey,
  type LeadPermissionFacts,
  type PermissionEvaluationInput,
  type StoredPermission,
} from "./permission-service";

function sqlFromEnv() {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function bool(value: unknown) {
  return value === true || value === "true";
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadLeadPermissionContext(leadId: string, principal: LeadCenterPrincipal) {
  const sql = sqlFromEnv();
  if (!sql) return { ok: false as const, error: "database_not_configured" as const };
  const scoped = !hasLeadCenterPermission(principal.role, "lead:view_all");
  if (scoped && !principal.agentId) return { ok: false as const, error: "lead_not_found" as const };
  const leads = await sql.query(
    `SELECT id, is_test, communication_suppressed, email_suppressed, sms_suppressed,
            consent_email, consent_sms, consent_call, consent_timestamp,
            source, lead_source_surface, source_url, assigned_agent_id
       FROM public.leads
      WHERE id = $1::uuid${scoped ? " AND assigned_agent_id = $2::uuid" : ""}
      LIMIT 1`,
    scoped ? [leadId, principal.agentId] : [leadId],
  ) as Array<Record<string, unknown>>;
  const row = leads[0];
  if (!row) return { ok: false as const, error: "lead_not_found" as const };
  const permissionRows = await sql.query(
    `SELECT channel, purpose, state, consent_version, source, evidence_at
       FROM public.communication_permissions
      WHERE lead_id = $1::uuid
      ORDER BY updated_at DESC`,
    [leadId],
  ) as Array<Record<string, unknown>>;
  const lead: LeadPermissionFacts = {
    leadId,
    isTest: bool(row.is_test),
    suppressed: bool(row.communication_suppressed),
    consentEmail: bool(row.consent_email),
    consentSms: bool(row.consent_sms),
    consentCall: bool(row.consent_call),
    consentText: null,
    consentVersion: null,
    source: text(row.source) || text(row.lead_source_surface),
    formOrRoute: text(row.source_url) || text(row.lead_source_surface),
    optedOutEmail: bool(row.email_suppressed),
    optedOutSms: bool(row.sms_suppressed),
  };
  const permissions = permissionRows.map((permission) => ({
    channel: permission.channel as MessageChannel,
    purpose: permission.purpose as MessagePurpose,
    state: permission.state as StoredPermission["state"],
    consentVersion: text(permission.consent_version),
    source: text(permission.source),
    evidenceAt: text(permission.evidence_at),
  }));
  return { ok: true as const, sql, lead, permissions };
}

export async function evaluateAndRecordPermission(input: {
  leadId: string;
  principal: LeadCenterPrincipal;
  request: PermissionEvaluationInput;
}) {
  const context = await loadLeadPermissionContext(input.leadId, input.principal);
  if (!context.ok) return context;
  const decision = evaluateLeadCommunicationPermission(context.lead, context.permissions, input.request);
  const idempotencyKey = permissionDecisionIdempotencyKey(input.leadId, decision, input.principal.userId);
  const rows = await context.sql.query(
    `INSERT INTO public.communication_decisions
      (lead_id, channel, purpose, allowed, decision_code, explanation,
       is_test, actor, idempotency_key, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (idempotency_key)
     DO UPDATE SET decided_at = public.communication_decisions.decided_at
     RETURNING id, decided_at`,
    [input.leadId, decision.channel, decision.purpose, decision.allowed,
      decision.code, decision.explanation, context.lead.isTest,
      input.principal.userId, idempotencyKey,
      JSON.stringify({ ...decision.evidence, consent_version: decision.consentVersion, form_or_route: decision.formOrRoute })],
  ) as Array<{ id: string; decided_at: string }>;
  return { ok: true as const, decision, decisionId: rows[0]?.id || null, persistedAt: rows[0]?.decided_at || null };
}

