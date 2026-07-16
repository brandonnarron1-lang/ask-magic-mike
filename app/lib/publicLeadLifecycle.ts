import { writeAssignmentAuditEvent } from "./adminAssignmentAudit";
import { loadAgentForNotification, loadLeadForNotification } from "./leadNotificationRepository";
import { createAssignmentNotification } from "./leadNotificationService";

type SupabaseHeaders = Record<string, string>;
type SupabaseConfig = { supabaseUrl: string; headers: SupabaseHeaders };
type AssignmentAgent = {
  id: string;
  name: string | null;
  priority_score: number;
  max_daily_leads: number;
  current_load: number;
  active_count: number;
};

function withoutUndefined(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

async function getJsonRows(url: string, headers: SupabaseHeaders) {
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok || typeof response.json !== "function") return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

async function patchPostgrest(url: string, headers: SupabaseHeaders, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify(withoutUndefined(body)),
    cache: "no-store",
  });
  if (!response.ok || typeof response.json !== "function") return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

async function postgrestUpsert(url: string, headers: SupabaseHeaders, row: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(withoutUndefined(row)),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("public_lead_lifecycle_write_failed");
}

async function activeLeadCountForAgent(config: SupabaseConfig, agentId: string) {
  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("select", "id");
  url.searchParams.set("assigned_agent_id", "eq." + agentId);
  url.searchParams.set("assignment_status", "eq.assigned");
  url.searchParams.set("status", "in.(new,scored,assigned,contacted,qualified,appointment_requested,appointment_set,nurture,escalated)");
  const rows = await getJsonRows(url.toString(), config.headers);
  return rows.length;
}

async function selectEligibleAgent(config: SupabaseConfig): Promise<AssignmentAgent | null> {
  const url = new URL("/rest/v1/agents", config.supabaseUrl);
  url.searchParams.set("select", "id,name,is_active,availability,max_daily_leads,current_load,priority_score");
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("order", "priority_score.desc");
  url.searchParams.set("limit", "25");
  const rows = await getJsonRows(url.toString(), config.headers);
  const candidates: AssignmentAgent[] = [];
  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) continue;
    if (typeof row.availability === "string" && row.availability !== "available") continue;
    const maxDailyLeads = typeof row.max_daily_leads === "number" ? row.max_daily_leads : Number(row.max_daily_leads || 0);
    const activeCount = await activeLeadCountForAgent(config, id);
    if (maxDailyLeads > 0 && activeCount >= maxDailyLeads) continue;
    candidates.push({
      id,
      name: typeof row.name === "string" ? row.name : null,
      priority_score: typeof row.priority_score === "number" ? row.priority_score : Number(row.priority_score || 0),
      max_daily_leads: maxDailyLeads,
      current_load: typeof row.current_load === "number" ? row.current_load : Number(row.current_load || 0),
      active_count: activeCount,
    });
  }
  candidates.sort((a, b) => b.priority_score - a.priority_score || a.active_count - b.active_count || a.current_load - b.current_load);
  return candidates[0] || null;
}

async function assignLead(config: SupabaseConfig, leadId: string, agent: AssignmentAgent) {
  const assignedAt = new Date().toISOString();
  const url = new URL("/rest/v1/leads", config.supabaseUrl);
  url.searchParams.set("id", "eq." + leadId);
  url.searchParams.set("assigned_agent_id", "is.null");
  url.searchParams.set("select", "id,assigned_agent_id,assigned_at,assignment_status");
  const rows = await patchPostgrest(url.toString(), config.headers, {
    assigned_agent_id: agent.id,
    assigned_at: assignedAt,
    assignment_status: "assigned",
    status: "assigned",
  });
  return rows[0] ? { assigned_at: String(rows[0].assigned_at || assignedAt) } : null;
}

async function writeLeadRouting(config: SupabaseConfig, leadId: string, agent: AssignmentAgent) {
  await postgrestUpsert(
    config.supabaseUrl + "/rest/v1/lead_routing?on_conflict=lead_id",
    config.headers,
    {
      lead_id: leadId,
      agent_id: agent.id,
      assignment_reason: "Public home-value lead routed to highest-priority eligible agent.",
      agent_priority_score: Math.max(-32768, Math.min(32767, Math.round(agent.priority_score))),
      status: "pending",
      notes: "Created by root public lead capture after local qualification.",
    },
  );
}

async function writeAssignmentAndNotification(leadId: string, agent: AssignmentAgent, assignedAt: string) {
  const audit = await writeAssignmentAuditEvent({
    lead_id: leadId,
    previous_agent_id: null,
    new_agent_id: agent.id,
    action: "assigned",
    source: "admin_allocation",
    actor: "system/public_lead_capture",
    assignment_status: "assigned",
    action_route: "/api/leads",
    created_at: assignedAt,
    warning_flags: [],
  });

  const [lead, notificationAgent] = await Promise.all([
    loadLeadForNotification(leadId),
    loadAgentForNotification(agent.id),
  ]);
  if (!lead || !notificationAgent) {
    return { audit, notification_warning: "notification_context_missing" };
  }

  const notification = await createAssignmentNotification({
    lead,
    agent: notificationAgent,
    assignmentAuditId: audit.ok ? audit.id || null : null,
    assignmentEventAt: audit.ok ? audit.created_at || assignedAt : assignedAt,
    assignmentRoute: "/api/leads",
    actor: "system/public_lead_capture",
    action: "assigned",
  });
  return {
    audit,
    notification_warning: notification.ok ? notification.warning : notification.error,
  };
}

export async function completePublicLeadLifecycle(config: SupabaseConfig, leadId: string, duplicate: boolean) {
  if (duplicate) return { duplicate: true };

  const agent = await selectEligibleAgent(config);
  if (!agent) return { duplicate: false, assignment: "no_eligible_agent" };
  const assignment = await assignLead(config, leadId, agent);
  if (!assignment) return { duplicate: false, assignment: "assignment_conflict" };
  await writeLeadRouting(config, leadId, agent);
  const sideEffects = await writeAssignmentAndNotification(leadId, agent, assignment.assigned_at);
  return {
    duplicate: false,
    assignment: "assigned",
    assigned_agent_id: agent.id,
    audit_warning: sideEffects.audit.ok ? undefined : sideEffects.audit.error,
    notification_warning: sideEffects.notification_warning,
  };
}
