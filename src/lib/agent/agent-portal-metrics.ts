/**
 * Agent Portal Metrics
 *
 * Derives agent-specific operational metrics from existing tables.
 * Wraps the lead-list and routing-command data sources with agent-scoped filters.
 * Pure read-only. No writes. No outbound calls.
 * Degrades gracefully when Supabase is not configured.
 */

import { calculateConversion, calculateHealthScore } from "@/lib/admin/intelligence-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentPortalMetrics {
  configured: boolean;
  agentId: string;
  generatedAt: string;

  queue: {
    total: number;
    newToday: number;
    hot: number;
    urgent: number;
    slaRisk: number;
    followUpDue: number;
    neverContacted: number;
    appointmentsRequested: number;
    stale: number;       // assigned > 72h, no contact
    recentlyContacted: number; // contacted in last 24h
  };

  performance: {
    conversionRate: number;    // 0–100: hot / total
    responseRate: number;      // 0–100: contacted / total
    slaCompliance: number;     // 0–100: (total - slaRisk) / total
    followUpCompliance: number;// 0–100: (total - followUpDue) / total
    healthScore: number;       // 0–100 composite
    healthGrade: "A" | "B" | "C" | "D" | "F";
  };

  recentLeads: Array<{
    id: string;
    name: string | null;
    leadType: string;
    grade: string | null;
    status: string;
    temperature: string | null;
    createdAt: string;
    lastContactedAt: string | null;
    nextFollowUpAt: string | null;
  }>;

  tasks: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
    leadId: string | null;
    priority: string | null;
  }>;
}

const EMPTY_METRICS = (agentId: string): AgentPortalMetrics => ({
  configured: false,
  agentId,
  generatedAt: new Date().toISOString(),
  queue: {
    total: 0,
    newToday: 0,
    hot: 0,
    urgent: 0,
    slaRisk: 0,
    followUpDue: 0,
    neverContacted: 0,
    appointmentsRequested: 0,
    stale: 0,
    recentlyContacted: 0,
  },
  performance: {
    conversionRate: 0,
    responseRate: 0,
    slaCompliance: 0,
    followUpCompliance: 0,
    healthScore: 0,
    healthGrade: "F",
  },
  recentLeads: [],
  tasks: [],
});

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loadAgentPortalMetrics(
  agentId: string
): Promise<AgentPortalMetrics> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return EMPTY_METRICS(agentId);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = createAdminClient() as any;

  const now          = new Date();
  const todayStart   = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const ago24h       = new Date(now.getTime() - 24  * 60 * 60 * 1000).toISOString();
  const ago72h       = new Date(now.getTime() - 72  * 60 * 60 * 1000).toISOString();
  const nowIso       = now.toISOString();

  // All assigned leads for this agent (bounded to 200)
  const { data: leads, error: leadsErr } = await client
    .from("leads")
    .select("id, created_at, first_name, last_name, lead_type, lead_grade, status, appointment_requested, last_contacted_at, next_follow_up_at")
    .eq("assigned_agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (leadsErr) return EMPTY_METRICS(agentId);

  const rows = (leads ?? []) as Array<Record<string, unknown>>;

  // Queue calculations
  const total                = rows.length;
  const todayStartIso        = todayStart.toISOString();
  const newToday             = rows.filter((r) => (r.created_at as string) >= todayStartIso).length;
  const hot                  = rows.filter((r) => r.lead_grade === "A" || r.lead_grade === "A+").length;
  const urgent               = rows.filter((r) =>
    (r.lead_grade === "A+" || r.lead_grade === "A") && !r.last_contacted_at
  ).length;
  const followUpDue          = rows.filter((r) =>
    r.next_follow_up_at && (r.next_follow_up_at as string) <= nowIso
  ).length;
  const neverContacted       = rows.filter((r) => !r.last_contacted_at).length;
  const appointmentsRequested = rows.filter((r) => r.appointment_requested === true).length;
  const stale                = rows.filter((r) =>
    !r.last_contacted_at && (r.created_at as string) <= ago72h
  ).length;
  const recentlyContacted    = rows.filter((r) =>
    r.last_contacted_at && (r.last_contacted_at as string) >= ago24h
  ).length;
  const slaRisk              = urgent; // SLA risk = hot leads not yet contacted

  // Performance
  const conversionRate    = calculateConversion(hot, total).rate;
  const responseRate      = calculateConversion(total - neverContacted, total).rate;
  const slaCompliance     = calculateConversion(total - slaRisk, total).rate;
  const followUpCompliance = calculateConversion(total - followUpDue, total).rate;

  const health = calculateHealthScore({
    conversionRate,
    responseRate,
    slaCompliance,
    pipelineActivity: appointmentsRequested > 0 ? 60 : 20,
    dataQuality: 80,
  });

  // Recent leads for dashboard
  const recentLeads = rows.slice(0, 10).map((r) => ({
    id:               r.id as string,
    name:             r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : null,
    leadType:         (r.lead_type as string) ?? "unknown",
    grade:            (r.lead_grade as string | null) ?? null,
    status:           (r.status as string) ?? "new",
    temperature:      null as string | null,
    createdAt:        r.created_at as string,
    lastContactedAt:  (r.last_contacted_at as string | null) ?? null,
    nextFollowUpAt:   (r.next_follow_up_at as string | null) ?? null,
  }));

  // Tasks for this agent's leads
  const leadIds = rows.slice(0, 50).map((r) => r.id as string);
  let tasks: AgentPortalMetrics["tasks"] = [];

  if (leadIds.length > 0) {
    const { data: taskRows } = await client
      .from("tasks")
      .select("id, title, due_at, status, lead_id, priority")
      .in("lead_id", leadIds)
      .neq("status", "completed")
      .order("due_at", { ascending: true })
      .limit(30);

    tasks = ((taskRows ?? []) as Array<Record<string, unknown>>).map((t) => ({
      id:       t.id as string,
      title:    (t.title as string) ?? "Task",
      dueAt:    (t.due_at as string | null) ?? null,
      status:   (t.status as string) ?? "open",
      leadId:   (t.lead_id as string | null) ?? null,
      priority: (t.priority as string | null) ?? null,
    }));
  }

  return {
    configured: true,
    agentId,
    generatedAt: now.toISOString(),
    queue: {
      total,
      newToday,
      hot,
      urgent,
      slaRisk,
      followUpDue,
      neverContacted,
      appointmentsRequested,
      stale,
      recentlyContacted,
    },
    performance: {
      conversionRate,
      responseRate,
      slaCompliance,
      followUpCompliance,
      healthScore: health.score,
      healthGrade: health.grade,
    },
    recentLeads,
    tasks,
  };
}

// ---------------------------------------------------------------------------
// Agent event log helpers (deterministic, read-only)
// ---------------------------------------------------------------------------

export type AgentEventType =
  | "assigned"
  | "accepted"
  | "contacted"
  | "status_changed"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "follow_up_set"
  | "appointment_marked"
  | "reassigned";

export interface AgentEventLogEntry {
  id: string;
  eventType: AgentEventType;
  timestamp: string;
  leadId: string | null;
  agentId: string;
  detail: string;
}

/**
 * Load event log entries for a lead from analytics_events.
 * Filters to agent-relevant event types only.
 * Returns empty array when DB not configured.
 */
export async function loadAgentEventLog(
  leadId: string,
  agentId: string
): Promise<AgentEventLogEntry[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const AGENT_EVENTS = [
    "lead_assigned",
    "agent_accepted",
    "agent_contacted",
    "note_added",
    "task_created",
    "task_completed",
    "appointment_requested",
    "appointment_set",
  ];

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const { data, error } = await client
      .from("analytics_events")
      .select("id, event_name, occurred_at, agent_id, properties")
      .eq("lead_id", leadId)
      .in("event_name", AGENT_EVENTS)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => {
      const eventName = (row.event_name as string) ?? "unknown";
      const eventTypeMap: Record<string, AgentEventType> = {
        lead_assigned:        "assigned",
        agent_accepted:       "accepted",
        agent_contacted:      "contacted",
        note_added:           "note_added",
        task_created:         "task_created",
        task_completed:       "task_completed",
        appointment_requested:"appointment_marked",
        appointment_set:      "appointment_marked",
      };
      return {
        id:        row.id as string,
        eventType: eventTypeMap[eventName] ?? "status_changed",
        timestamp: row.occurred_at as string,
        leadId,
        agentId:   (row.agent_id as string | null) ?? agentId,
        detail:    eventName.replace(/_/g, " "),
      };
    });
  } catch {
    return [];
  }
}
