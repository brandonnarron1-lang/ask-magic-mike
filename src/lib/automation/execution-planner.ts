/**
 * Execution Planner — Deterministic workflow execution planning.
 *
 * Takes current platform state signals and produces a prioritized queue of
 * execution plans with impact scores, effort estimates, and approval flags.
 *
 * Pure functions. No side effects. No DB writes. No external calls.
 */

import {
  buildExecutionPlan,
  evaluateConditions,
  prioritizeWorkflowQueue,
  type WorkflowSignals,
  type ExecutionPlan,
  type ImpactLevel,
} from "./workflow-engine";
import { AUTOMATION_TEMPLATES } from "./automation-templates";

// ---------------------------------------------------------------------------
// Morning brief
// ---------------------------------------------------------------------------

export interface MorningBriefItem {
  question: string;
  answer: string;
  urgency: "critical" | "high" | "normal";
  actionRequired: boolean;
}

export interface MorningBrief {
  generatedAt: string;
  items: MorningBriefItem[];
  topPriorityWorkflow: ExecutionPlan | null;
  pendingApprovals: number;
  urgentCount: number;
}

export function buildMorningBrief(
  signals: WorkflowSignals,
  pendingApprovals: number
): MorningBrief {
  const items: MorningBriefItem[] = [];

  // Overnight changes
  const overnightNew = signals.newLeads24h;
  items.push({
    question:       "What changed overnight?",
    answer:         overnightNew > 0
      ? `${overnightNew} new lead${overnightNew > 1 ? "s" : ""} arrived. ${signals.conversionsLast7d} conversions this week.`
      : "No new leads overnight. Review follow-up queue for today.",
    urgency:        "normal",
    actionRequired: false,
  });

  // Immediate attention
  const attention = [
    signals.slaBreachCount > 0 && `${signals.slaBreachCount} SLA breach${signals.slaBreachCount > 1 ? "es" : ""} require immediate response`,
    signals.urgentLeadCount > 0 && `${signals.urgentLeadCount} urgent lead${signals.urgentLeadCount > 1 ? "s" : ""} never contacted`,
    signals.appointmentsMissed24h > 0 && `${signals.appointmentsMissed24h} missed appointment${signals.appointmentsMissed24h > 1 ? "s" : ""} in last 24 hours`,
  ].filter(Boolean).join(". ");

  items.push({
    question:       "What needs immediate attention?",
    answer:         attention || "No critical items. Maintain current pace.",
    urgency:        signals.slaBreachCount > 0 || signals.urgentLeadCount > 0 ? "critical" : "normal",
    actionRequired: signals.slaBreachCount > 0 || signals.urgentLeadCount > 0,
  });

  // Opportunities
  const oppCount = signals.hotLeadCount + signals.campaignSurgingCount;
  items.push({
    question:       "What opportunities appeared?",
    answer:         oppCount > 0
      ? `${signals.hotLeadCount} hot lead${signals.hotLeadCount !== 1 ? "s" : ""} ready for conversion. ${signals.campaignSurgingCount > 0 ? `${signals.campaignSurgingCount} campaign${signals.campaignSurgingCount > 1 ? "s" : ""} surging — increase spend or expand.` : ""}`
      : "No new opportunities flagged. Check campaign performance for signals.",
    urgency:        signals.hotLeadCount > 5 ? "high" : "normal",
    actionRequired: signals.hotLeadCount > 0,
  });

  // Campaigns
  items.push({
    question:       "What campaigns changed?",
    answer:         (signals.campaignUnderperformingCount + signals.campaignSurgingCount) > 0
      ? `${signals.campaignUnderperformingCount} underperforming, ${signals.campaignSurgingCount} surging. Review in Campaign Intelligence.`
      : "All campaigns within normal performance bands.",
    urgency:        signals.campaignUnderperformingCount > 1 ? "high" : "normal",
    actionRequired: signals.campaignUnderperformingCount > 0,
  });

  // Agents
  const agentIssue = signals.agentCapacityPct >= 90 || signals.agentCapacityPct <= 30;
  items.push({
    question:       "What agents need coaching?",
    answer:         agentIssue
      ? signals.agentCapacityPct >= 90
        ? "Agent roster is near full capacity. Review lead distribution and consider reassignment."
        : "Agent activity is low. Review assigned leads and follow-up compliance."
      : "Agent capacity is healthy. No coaching flags today.",
    urgency:        agentIssue ? "high" : "normal",
    actionRequired: agentIssue,
  });

  // Stale leads
  items.push({
    question:       "What buyers need follow-up?",
    answer:         signals.staleLeadCount > 0
      ? `${signals.staleLeadCount} lead${signals.staleLeadCount > 1 ? "s" : ""} stale (no contact in 72h+). High conversion risk.`
      : "No stale leads. Follow-up compliance is strong.",
    urgency:        signals.staleLeadCount > 3 ? "high" : "normal",
    actionRequired: signals.staleLeadCount > 0,
  });

  // Automation queue
  items.push({
    question:       "What automation is waiting?",
    answer:         pendingApprovals > 0
      ? `${pendingApprovals} workflow${pendingApprovals > 1 ? "s" : ""} awaiting your approval. Review in the Automation Queue.`
      : "Automation queue is clear. No pending approvals.",
    urgency:        pendingApprovals > 3 ? "high" : "normal",
    actionRequired: pendingApprovals > 0,
  });

  // Approve first
  const approveFirst = signals.slaBreachCount > 0
    ? "Escalate and reassign SLA-breached leads."
    : signals.urgentLeadCount > 0
    ? "Review urgent uncontacted leads and confirm assignments."
    : pendingApprovals > 0
    ? "Process the highest-impact approval in the automation queue."
    : "Review overnight leads and confirm today's follow-up priority order.";

  items.push({
    question:       "What should you approve first?",
    answer:         approveFirst,
    urgency:        signals.slaBreachCount > 0 ? "critical" : "high",
    actionRequired: true,
  });

  // Build top priority workflow
  const active = planActiveWorkflows(signals);
  const topPriorityWorkflow = active.length > 0 ? active[0] : null;

  return {
    generatedAt:        new Date().toISOString(),
    items,
    topPriorityWorkflow,
    pendingApprovals,
    urgentCount:        signals.urgentLeadCount + signals.slaBreachCount,
  };
}

// ---------------------------------------------------------------------------
// Active workflow planner
// ---------------------------------------------------------------------------

export function planActiveWorkflows(signals: WorkflowSignals): ExecutionPlan[] {
  const plans: ExecutionPlan[] = [];

  for (const template of AUTOMATION_TEMPLATES) {
    if (!evaluateConditions(template.conditions, signals)) continue;

    const confidence = calculateConfidence(template.trigger, signals);
    const plan = buildExecutionPlan(template, signals, confidence);
    plans.push(plan);
  }

  return prioritizeWorkflowQueue(plans);
}

function calculateConfidence(
  trigger: string,
  signals: WorkflowSignals
): number {
  // Higher confidence when there's clear signal data
  switch (trigger) {
    case "sla_breached":
      return signals.slaBreachCount > 0 ? 95 : 70;
    case "sla_warning":
      return 90;
    case "lead_becomes_hot":
      return signals.hotLeadCount > 0 ? 92 : 65;
    case "agent_capacity_high":
      return signals.agentCapacityPct >= 90 ? 95 : 80;
    case "campaign_underperforming":
      return signals.campaignUnderperformingCount > 0 ? 88 : 60;
    case "campaign_surging":
      return signals.campaignSurgingCount > 0 ? 90 : 60;
    case "appointment_missed":
      return signals.appointmentsMissed24h > 0 ? 95 : 50;
    case "task_overdue":
      return signals.overdueTasks > 0 ? 93 : 70;
    default:
      return 75;
  }
}

// ---------------------------------------------------------------------------
// Impact scoring
// ---------------------------------------------------------------------------

export interface ImpactBreakdown {
  label: string;
  score: number;         // 0–100
  level: ImpactLevel;
  description: string;
}

export function scoreExecutionImpact(plan: ExecutionPlan): ImpactBreakdown {
  const levelScores: Record<ImpactLevel, number> = {
    critical: 90,
    high:     70,
    medium:   45,
    low:      20,
  };

  const base = levelScores[plan.impact.level] ?? 45;
  const confidenceBonus = Math.round((plan.confidence - 75) * 0.3);
  const liftBonus = Math.min(10, plan.impact.conversionLiftPct);
  const score = Math.min(100, Math.max(0, base + confidenceBonus + liftBonus));

  return {
    label:       plan.workflowName,
    score,
    level:       plan.impact.level,
    description: `${plan.impact.conversionLiftPct}% conversion lift · ${plan.impact.estimatedLeadsAffected} leads affected · ${plan.estimatedTotalMinutes}m to prepare`,
  };
}

export function estimateCompletionTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Approval queue builder
// ---------------------------------------------------------------------------

export interface ApprovalQueueItem {
  workflowId: string;
  workflowName: string;
  category: ExecutionPlan["category"];
  trigger: ExecutionPlan["trigger"];
  priority: ImpactLevel;
  impactScore: number;
  estimatedMinutes: number;
  preparedAt: string;
  stepsPendingApproval: number;
}

export function buildApprovalQueue(plans: ExecutionPlan[]): ApprovalQueueItem[] {
  return plans
    .filter((p) => p.requiresBrokerApproval && p.status === "awaiting_approval")
    .map((p) => ({
      workflowId:           p.workflowId,
      workflowName:         p.workflowName,
      category:             p.category,
      trigger:              p.trigger,
      priority:             p.priority,
      impactScore:          scoreExecutionImpact(p).score,
      estimatedMinutes:     p.estimatedTotalMinutes,
      preparedAt:           p.preparedAt,
      stepsPendingApproval: p.steps.filter((s) => s.approvalRequired).length,
    }))
    .sort((a, b) => b.impactScore - a.impactScore);
}

// ---------------------------------------------------------------------------
// Signals loader — reads from existing admin data sources
// ---------------------------------------------------------------------------

export async function loadWorkflowSignals(): Promise<WorkflowSignals> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return {
      urgentLeadCount:               0,
      slaBreachCount:                0,
      slaWarningCount:               0,
      unassignedLeadCount:           0,
      hotLeadCount:                  0,
      overdueTasks:                  0,
      overdueTaskCount:              0,
      openTaskCount:                 0,
      agentCapacityPct:              0,
      activeAgentCount:              0,
      overCapacityAgents:            0,
      underCapacityAgents:           0,
      campaignUnderperformingCount:  0,
      campaignSurgingCount:          0,
      activeCampaignCount:           0,
      underperformingCampaigns:      0,
      appointmentsMissed24h:         0,
      missedAppointments24h:         0,
      appointmentsToday:             0,
      abandonedConversations:        0,
      pendingReviewCount:            0,
      averageLeadScore:              0,
      newLeads24h:                   0,
      conversionsLast7d:             0,
      staleLeadCount:                0,
    };
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    const now        = new Date();
    const ago24h     = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const ago72h     = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const ago7d      = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayIso   = todayStart.toISOString();
    const nowIso     = now.toISOString();

    const { data: leads } = await client
      .from("leads")
      .select("id, lead_grade, status, assigned_agent_id, last_contacted_at, next_follow_up_at, created_at, appointment_requested")
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (leads ?? []) as Array<Record<string, unknown>>;

    const urgentLeadCount      = rows.filter((r) => (r.lead_grade === "A+" || r.lead_grade === "A") && !r.last_contacted_at).length;
    const hotLeadCount         = rows.filter((r) => r.lead_grade === "A" || r.lead_grade === "A+").length;
    const unassignedLeadCount  = rows.filter((r) => !r.assigned_agent_id).length;
    const newLeads24h          = rows.filter((r) => (r.created_at as string) >= ago24h).length;
    const staleLeadCount       = rows.filter((r) => !r.last_contacted_at && (r.created_at as string) <= ago72h).length;
    const followUpDue          = rows.filter((r) => r.next_follow_up_at && (r.next_follow_up_at as string) <= nowIso).length;
    const slaBreachCount       = urgentLeadCount;

    // Tasks
    let overdueTasks = 0;
    const leadIds = rows.slice(0, 100).map((r) => r.id as string);
    if (leadIds.length > 0) {
      const { data: tasks } = await client
        .from("tasks")
        .select("id")
        .in("lead_id", leadIds)
        .lt("due_at", nowIso)
        .neq("status", "completed");
      overdueTasks = (tasks ?? []).length;
    }

    // Agent capacity
    const { data: agents } = await client
      .from("agents")
      .select("id, max_daily_leads")
      .eq("is_active", true)
      .limit(20);

    const agentRows = (agents ?? []) as Array<Record<string, unknown>>;
    let agentCapacityPct = 50;
    if (agentRows.length > 0) {
      const totalMax  = agentRows.reduce((s, a) => s + ((a.max_daily_leads as number) || 10), 0);
      const totalLoad = rows.filter((r) => r.assigned_agent_id).length;
      agentCapacityPct = totalMax > 0 ? Math.min(100, Math.round((totalLoad / totalMax) * 100)) : 50;
    }

    // Conversions
    const conversionsLast7d = rows.filter((r) => r.status === "converted" && (r.created_at as string) >= ago7d).length;

    // Campaign signals (derive from analytics_events)
    const { data: events } = await client
      .from("analytics_events")
      .select("properties")
      .eq("event_name", "campaign_performance_check")
      .gte("occurred_at", ago24h)
      .limit(100);

    let campaignUnderperformingCount = 0;
    let campaignSurgingCount = 0;
    for (const ev of ((events ?? []) as Array<Record<string, unknown>>)) {
      const props = (ev.properties as Record<string, unknown>) ?? {};
      if (props.status === "underperforming") campaignUnderperformingCount++;
      if (props.status === "surging")         campaignSurgingCount++;
    }

    // Missed appointments
    const appointmentsMissed24h = rows.filter(
      (r) => r.appointment_requested && !r.last_contacted_at && (r.created_at as string) >= ago24h
    ).length;

    void followUpDue; // derived but not in final signals — used by stale

    return {
      urgentLeadCount,
      slaBreachCount,
      slaWarningCount:               0,
      unassignedLeadCount,
      hotLeadCount,
      overdueTasks,
      overdueTaskCount:              overdueTasks,
      openTaskCount:                 overdueTasks,
      agentCapacityPct,
      activeAgentCount:              agentRows.length,
      overCapacityAgents:            0,
      underCapacityAgents:           0,
      campaignUnderperformingCount,
      campaignSurgingCount,
      activeCampaignCount:           campaignUnderperformingCount + campaignSurgingCount,
      underperformingCampaigns:      campaignUnderperformingCount,
      appointmentsMissed24h,
      missedAppointments24h:         appointmentsMissed24h,
      appointmentsToday:             0,
      abandonedConversations:        0,
      pendingReviewCount:            0,
      averageLeadScore:              0,
      newLeads24h,
      conversionsLast7d,
      staleLeadCount,
    };
  } catch {
    return {
      urgentLeadCount:               0,
      slaBreachCount:                0,
      slaWarningCount:               0,
      unassignedLeadCount:           0,
      hotLeadCount:                  0,
      overdueTasks:                  0,
      overdueTaskCount:              0,
      openTaskCount:                 0,
      agentCapacityPct:              50,
      activeAgentCount:              0,
      overCapacityAgents:            0,
      underCapacityAgents:           0,
      campaignUnderperformingCount:  0,
      campaignSurgingCount:          0,
      activeCampaignCount:           0,
      underperformingCampaigns:      0,
      appointmentsMissed24h:         0,
      missedAppointments24h:         0,
      appointmentsToday:             0,
      abandonedConversations:        0,
      pendingReviewCount:            0,
      averageLeadScore:              0,
      newLeads24h:                   0,
      conversionsLast7d:             0,
      staleLeadCount:                0,
    };
  }
}
