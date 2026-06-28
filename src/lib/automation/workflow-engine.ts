/**
 * Workflow Engine — Ask Magic Mike Autonomous Operations
 *
 * Pure, typed, versioned, deterministic workflow definitions.
 *
 * Architecture:
 *   - WorkflowDefinition  : immutable declarative spec (no side effects)
 *   - ExecutionPlan       : derived from a definition + context signals
 *   - ApprovalGate        : explicit human checkpoint before any action
 *
 * Nothing in this file sends messages, writes to prod, or calls external APIs.
 * The engine only PLANS and DESCRIBES what should happen. Humans approve.
 */

// ---------------------------------------------------------------------------
// Trigger types
// ---------------------------------------------------------------------------

export type WorkflowTrigger =
  | "lead_created"
  | "lead_assigned"
  | "lead_accepted"
  | "lead_unassigned"
  | "lead_becomes_hot"
  | "sla_warning"
  | "sla_breached"
  | "appointment_requested"
  | "appointment_confirmed"
  | "appointment_missed"
  | "listing_signed"
  | "buyer_agreement_signed"
  | "campaign_underperforming"
  | "campaign_surging"
  | "agent_capacity_high"
  | "agent_capacity_low"
  | "conversation_abandoned"
  | "conversation_resumed"
  | "task_overdue"
  | "task_completed"
  | "admin_review_needed";

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

export type StepType =
  | "prepare"          // Prepare a document, packet, or checklist
  | "notify_draft"     // Draft a notification (NOT sent until approved)
  | "assign"           // Assign a task or responsibility
  | "schedule"         // Schedule a follow-up or reminder
  | "flag"             // Flag for broker attention
  | "escalate"         // Escalate to next tier
  | "log"              // Record a structured audit event
  | "route"            // Route lead to agent
  | "score"            // Rescore lead signal
  | "review";          // Request broker review

export type ApprovalRequirement = "always" | "if_high_impact" | "never";

export type ImpactLevel = "critical" | "high" | "medium" | "low";

export type WorkflowCategory =
  | "lead_management"
  | "agent_operations"
  | "marketing"
  | "reporting"
  | "compliance"
  | "coaching";

export type WorkflowStatus =
  | "pending"
  | "queued"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export interface WorkflowCondition {
  field: string;
  operator: "eq" | "gt" | "lt" | "gte" | "lte" | "contains" | "not_null" | "is_null";
  value: string | number | boolean | null;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  description: string;
  approvalRequired: ApprovalRequirement;
  estimatedMinutes: number;
  rollbackCapable: boolean;
  dependencies: string[];   // step IDs that must complete first
  outputKeys?: string[];    // keys this step produces in the execution context
}

export interface WorkflowDefinition {
  id: string;
  version: string;
  trigger: WorkflowTrigger;
  name: string;
  description: string;
  priority: ImpactLevel;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  estimatedImpact: ImpactLevel;
  estimatedTotalMinutes: number;
  requiresBrokerApproval: boolean;
  rollbackStrategy: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Execution plan
// ---------------------------------------------------------------------------

export interface StepPlan {
  stepId: string;
  label: string;
  type: StepType;
  status: WorkflowStatus;
  approvalRequired: boolean;
  estimatedMinutes: number;
  rollbackCapable: boolean;
  dependencies: string[];
}

export interface ExecutionImpact {
  level: ImpactLevel;
  description: string;
  estimatedLeadsAffected: number;
  estimatedRevenueImpact: "low" | "medium" | "high" | "transformative";
  conversionLiftPct: number;
}

export interface ExecutionPlan {
  workflowId: string;
  workflowName: string;
  trigger: WorkflowTrigger;
  category: WorkflowCategory;
  status: WorkflowStatus;
  steps: StepPlan[];
  impact: ExecutionImpact;
  estimatedTotalMinutes: number;
  requiresBrokerApproval: boolean;
  blockingDependencies: string[];
  rollbackStrategy: string;
  confidence: number;           // 0–100
  priority: ImpactLevel;
  preparedAt: string;           // ISO timestamp
}

// ---------------------------------------------------------------------------
// Approval gate
// ---------------------------------------------------------------------------

export type ApprovalDecision = "approved" | "rejected" | "deferred";

export interface ApprovalGate {
  workflowId: string;
  stepId: string | null;        // null = whole-workflow gate
  decision: ApprovalDecision | null;
  decidedAt: string | null;
  decidedBy: string | null;
  reason: string | null;
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Context signals (what the engine reads from current platform state)
// ---------------------------------------------------------------------------

export interface WorkflowSignals {
  urgentLeadCount: number;
  slaBreachCount: number;
  slaWarningCount: number;
  unassignedLeadCount: number;
  hotLeadCount: number;
  overdueTasks: number;
  overdueTaskCount: number;
  openTaskCount: number;
  agentCapacityPct: number;     // 0–100
  activeAgentCount: number;
  overCapacityAgents: number;
  underCapacityAgents: number;
  campaignUnderperformingCount: number;
  campaignSurgingCount: number;
  activeCampaignCount: number;
  underperformingCampaigns: number;
  appointmentsMissed24h: number;
  missedAppointments24h: number;
  appointmentsToday: number;
  abandonedConversations: number;
  pendingReviewCount: number;
  averageLeadScore: number;
  newLeads24h: number;
  conversionsLast7d: number;
  staleLeadCount: number;
}

// ---------------------------------------------------------------------------
// Pure engine functions
// ---------------------------------------------------------------------------

export function buildExecutionPlan(
  definition: WorkflowDefinition,
  signals: WorkflowSignals,
  confidence: number = 75
): ExecutionPlan {
  const steps: StepPlan[] = definition.steps.map((step) => ({
    stepId:           step.id,
    label:            step.label,
    type:             step.type,
    status:           "pending" as WorkflowStatus,
    approvalRequired: step.approvalRequired !== "never",
    estimatedMinutes: step.estimatedMinutes,
    rollbackCapable:  step.rollbackCapable,
    dependencies:     step.dependencies,
  }));

  const blockingDeps = definition.steps
    .filter((s) => s.dependencies.length > 0)
    .flatMap((s) => s.dependencies);

  const impact = deriveImpact(definition, signals);

  return {
    workflowId:             definition.id,
    workflowName:           definition.name,
    trigger:                definition.trigger,
    category:               definition.category,
    status:                 definition.requiresBrokerApproval ? "awaiting_approval" : "queued",
    steps,
    impact,
    estimatedTotalMinutes:  definition.estimatedTotalMinutes,
    requiresBrokerApproval: definition.requiresBrokerApproval,
    blockingDependencies:   [...new Set(blockingDeps)],
    rollbackStrategy:       definition.rollbackStrategy,
    confidence:             Math.min(100, Math.max(0, confidence)),
    priority:               definition.priority,
    preparedAt:             new Date().toISOString(),
  };
}

function deriveImpact(
  definition: WorkflowDefinition,
  signals: WorkflowSignals
): ExecutionImpact {
  const leadsAffected =
    definition.trigger === "sla_breached"       ? signals.slaBreachCount :
    definition.trigger === "lead_becomes_hot"   ? signals.hotLeadCount :
    definition.trigger === "lead_unassigned"    ? signals.unassignedLeadCount :
    definition.trigger === "task_overdue"       ? signals.overdueTasks :
    definition.trigger === "campaign_underperforming" ? signals.campaignUnderperformingCount :
    definition.trigger === "agent_capacity_high" ? Math.round(signals.urgentLeadCount * 0.5) :
    1;

  const revenueImpact: ExecutionImpact["estimatedRevenueImpact"] =
    definition.estimatedImpact === "critical" ? "transformative" :
    definition.estimatedImpact === "high"     ? "high" :
    definition.estimatedImpact === "medium"   ? "medium" : "low";

  const liftPct =
    definition.estimatedImpact === "critical" ? 18 :
    definition.estimatedImpact === "high"     ? 12 :
    definition.estimatedImpact === "medium"   ? 6  : 2;

  return {
    level:                     definition.estimatedImpact,
    description:               definition.description,
    estimatedLeadsAffected:    Math.max(0, leadsAffected),
    estimatedRevenueImpact:    revenueImpact,
    conversionLiftPct:         liftPct,
  };
}

export function evaluateConditions(
  conditions: WorkflowCondition[],
  signals: WorkflowSignals
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((c) => {
    const signalValue = (signals as unknown as Record<string, unknown>)[c.field];

    switch (c.operator) {
      case "eq":       return signalValue === c.value;
      case "gt":       return typeof signalValue === "number" && signalValue > (c.value as number);
      case "lt":       return typeof signalValue === "number" && signalValue < (c.value as number);
      case "gte":      return typeof signalValue === "number" && signalValue >= (c.value as number);
      case "lte":      return typeof signalValue === "number" && signalValue <= (c.value as number);
      case "not_null": return signalValue !== null && signalValue !== undefined;
      case "is_null":  return signalValue === null || signalValue === undefined;
      case "contains": return typeof signalValue === "string" && signalValue.includes(String(c.value));
      default:         return false;
    }
  });
}

export function resolveApprovalRequirements(
  steps: WorkflowStep[],
  impact: ImpactLevel
): boolean {
  return steps.some((s) => {
    if (s.approvalRequired === "always") return true;
    if (s.approvalRequired === "if_high_impact") {
      return impact === "critical" || impact === "high";
    }
    return false;
  });
}

export function prioritizeWorkflowQueue(plans: ExecutionPlan[]): ExecutionPlan[] {
  const PRIORITY_WEIGHT: Record<ImpactLevel, number> = {
    critical: 4,
    high:     3,
    medium:   2,
    low:      1,
  };

  return [...plans].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 1;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 1;
    if (pa !== pb) return pb - pa;
    return b.impact.conversionLiftPct - a.impact.conversionLiftPct;
  });
}

// ---------------------------------------------------------------------------
// Human-readable label helpers
// ---------------------------------------------------------------------------

export const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  lead_created:             "Lead Created",
  lead_assigned:            "Lead Assigned",
  lead_accepted:            "Lead Accepted",
  lead_unassigned:          "Lead Unassigned",
  lead_becomes_hot:         "Lead Becomes Hot",
  sla_warning:              "SLA Warning",
  sla_breached:             "SLA Breached",
  appointment_requested:    "Appointment Requested",
  appointment_confirmed:    "Appointment Confirmed",
  appointment_missed:       "Appointment Missed",
  listing_signed:           "Listing Signed",
  buyer_agreement_signed:   "Buyer Agreement Signed",
  campaign_underperforming: "Campaign Underperforming",
  campaign_surging:         "Campaign Surging",
  agent_capacity_high:      "Agent Capacity High",
  agent_capacity_low:       "Agent Capacity Low",
  conversation_abandoned:   "Conversation Abandoned",
  conversation_resumed:     "Conversation Resumed",
  task_overdue:             "Task Overdue",
  task_completed:           "Task Completed",
  admin_review_needed:      "Admin Review Needed",
};

export const CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  lead_management:  "Lead Management",
  agent_operations: "Agent Operations",
  marketing:        "Marketing",
  reporting:        "Reporting",
  compliance:       "Compliance",
  coaching:         "Coaching",
};

export const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string }> = {
  pending:           { label: "Pending",           color: "text-slate-400 border-slate-400/25 bg-slate-400/[0.06]" },
  queued:            { label: "Queued",             color: "text-cyan-400 border-cyan-400/25 bg-cyan-400/[0.06]" },
  awaiting_approval: { label: "Awaiting Approval",  color: "text-amber-400 border-amber-400/25 bg-amber-400/[0.08]" },
  approved:          { label: "Approved",            color: "text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.06]" },
  rejected:          { label: "Rejected",            color: "text-ruby-400 border-ruby-400/25 bg-ruby-400/[0.06]" },
  completed:         { label: "Completed",           color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/[0.08]" },
  failed:            { label: "Failed",              color: "text-ruby-400 border-ruby-400/30 bg-ruby-400/[0.08]" },
  cancelled:         { label: "Cancelled",           color: "text-slate-600 border-white/[0.06] bg-white/[0.02]" },
  retrying:          { label: "Retrying",            color: "text-gold-400 border-gold-400/25 bg-gold-400/[0.06]" },
};
