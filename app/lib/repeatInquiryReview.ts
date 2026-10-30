import type { AdminLeadView } from "./adminLeadView";
import { allocationQuery } from "./leadAllocation";
import { buildLeadLifecyclePatch } from "./adminLeadLifecycle";
import { assertDatabaseMutationAllowed } from "../../src/lib/preview-security";
import { hasLeadCenterPermission, type LeadCenterPrincipal } from "../../src/lib/admin/rbac-policy";

type ReviewLead = Pick<AdminLeadView, "duplicate_of_lead_id" | "assigned_agent_id" | "status" | "conversion_stage" | "is_test" | "communication_suppressed">;
export function repeatInquiryReviewState(lead: ReviewLead) {
  if (!lead.duplicate_of_lead_id || lead.conversion_stage !== "duplicate") return "not_required";
  if (lead.is_test || lead.communication_suppressed || lead.status !== "new") return "held";
  return lead.assigned_agent_id ? "supervisor_review" : "direct_assignment_required";
}

/** Explicit supervisor exception after existing direct assignment. It neither
 * assigns by inheritance nor manufactures permission, readiness or response.
 * Uses the existing audited lifecycle CAS; no schema/outbox/policy change. */
export async function reviewRepeatInquiry(leadId: string, principal: LeadCenterPrincipal, confirmed: boolean, expected?: { agentId: string; assignedAt: string }) {
  if (!hasLeadCenterPermission(principal.role, "lead:assign")) return { ok: false as const, error: "forbidden" };
  if (!confirmed) return { ok: false as const, error: "confirmation_required" };
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return { ok: false as const, error: "invalid_lead_id" };
  if (!expected || !/^[0-9a-f-]{36}$/i.test(expected.agentId) || !Number.isFinite(Date.parse(expected.assignedAt)) || expected.assignedAt.length > 40) return { ok: false as const, error: "repeat_review_held" };
  const mutation = assertDatabaseMutationAllowed();
  if (!mutation.ok) return { ok: false as const, error: mutation.error };
  const sql = allocationQuery();
  if (!sql) return { ok: false as const, error: "lead_store_not_configured" };
  try {
    const now = new Date().toISOString();
    // One statement/transaction. Lock in the same lead -> user order as the
    // existing conversion wrapper. No stale assignment, lifecycle, suppression
    // or cached role may clear this hold. Reuse its immutable lifecycle audit.
    const rows = await sql.query(`WITH reviewed AS MATERIALIZED (
      SELECT l.id FROM public.leads l WHERE l.id=$1::uuid AND l.assigned_agent_id=$2::uuid
        AND l.assigned_at=$3::timestamptz AND l.status='new' AND l.conversion_stage='duplicate'
        AND l.duplicate_of_lead_id IS NOT NULL AND l.is_test=false AND l.communication_suppressed=false
      FOR UPDATE OF l
    ), reviewer AS MATERIALIZED (
      SELECT u.id FROM public.lead_center_users u CROSS JOIN reviewed
      WHERE u.id=$4 AND u.role='administrator' AND u.banned IS NOT TRUE FOR SHARE OF u
    ) SELECT public.mutate_admin_lead_status_v4($1::uuid,'new','assigned',$5::jsonb,NULL,NULL,$6,$7::timestamptz) AS result FROM reviewer`,
    [leadId, expected.agentId, expected.assignedAt, principal.userId, JSON.stringify(buildLeadLifecyclePatch("assigned", { nowIso: now, reason: null })), `lead_center:${principal.userId}`, now]);
    const result = rows[0]?.result as { ok?: boolean; error?: string } | undefined;
    return result?.ok === true ? { ok: true as const } : { ok: false as const, error: "repeat_review_held" };
  } catch { return { ok: false as const, error: "repeat_review_unavailable" }; }
}
