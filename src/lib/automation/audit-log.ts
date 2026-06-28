/**
 * Audit Log — Immutable audit trail for all automation events.
 *
 * All audit events are append-only. Nothing in this file modifies existing records.
 * Events are read from analytics_events with automation-specific event names.
 *
 * No messages sent. No external APIs called. Read + append only.
 */

// ---------------------------------------------------------------------------
// Audit event types
// ---------------------------------------------------------------------------

export type AuditEventType =
  | "workflow_created"
  | "workflow_modified"
  | "workflow_executed"
  | "workflow_cancelled"
  | "approval_granted"
  | "approval_rejected"
  | "retry_executed"
  | "failure_detected"
  | "manual_override"
  | "rollback_executed";

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  workflowId: string;
  workflowName: string;
  timestamp: string;            // ISO 8601
  actorId: string | null;      // broker/admin who triggered it (null = system)
  actorLabel: string;          // "System" or name
  detail: string;              // human-readable description
  metadata: Record<string, string | number | boolean | null>;
  immutable: true;             // type-level marker — never mutated after creation
}

// ---------------------------------------------------------------------------
// Derived audit summary
// ---------------------------------------------------------------------------

export interface AuditSummary {
  totalEvents: number;
  workflowsCreated: number;
  approvalsGranted: number;
  approvalsRejected: number;
  failuresDetected: number;
  rollbacksExecuted: number;
  recentEvents: AuditEvent[];
}

// ---------------------------------------------------------------------------
// Loader — reads from analytics_events using automation- prefixed event names
// ---------------------------------------------------------------------------

export async function loadAuditHistory(
  limit = 50,
  workflowId?: string
): Promise<AuditEvent[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const AUTOMATION_EVENTS = [
    "automation_workflow_created",
    "automation_workflow_modified",
    "automation_workflow_executed",
    "automation_workflow_cancelled",
    "automation_approval_granted",
    "automation_approval_rejected",
    "automation_retry_executed",
    "automation_failure_detected",
    "automation_manual_override",
    "automation_rollback_executed",
  ];

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    let query = client
      .from("analytics_events")
      .select("id, event_name, occurred_at, agent_id, properties")
      .in("event_name", AUTOMATION_EVENTS)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (workflowId) {
      query = query.contains("properties", { workflow_id: workflowId });
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const AUDIT_TYPE_MAP: Record<string, AuditEventType> = {
      automation_workflow_created:  "workflow_created",
      automation_workflow_modified: "workflow_modified",
      automation_workflow_executed: "workflow_executed",
      automation_workflow_cancelled:"workflow_cancelled",
      automation_approval_granted:  "approval_granted",
      automation_approval_rejected: "approval_rejected",
      automation_retry_executed:    "retry_executed",
      automation_failure_detected:  "failure_detected",
      automation_manual_override:   "manual_override",
      automation_rollback_executed: "rollback_executed",
    };

    return (data as Array<Record<string, unknown>>).map((row) => {
      const eventName = (row.event_name as string) ?? "";
      const props = (row.properties as Record<string, unknown>) ?? {};
      return {
        id:           row.id as string,
        eventType:    AUDIT_TYPE_MAP[eventName] ?? "workflow_executed",
        workflowId:   (props.workflow_id as string) ?? "",
        workflowName: (props.workflow_name as string) ?? "Unknown Workflow",
        timestamp:    row.occurred_at as string,
        actorId:      (row.agent_id as string | null) ?? null,
        actorLabel:   (props.actor_label as string) ?? "System",
        detail:       (props.detail as string) ?? eventName.replace(/^automation_/, "").replace(/_/g, " "),
        metadata:     Object.fromEntries(
          Object.entries(props)
            .filter(([k]) => !["workflow_id", "workflow_name", "actor_label", "detail"].includes(k))
            .map(([k, v]) => [k, v as string | number | boolean | null])
        ),
        immutable:    true as const,
      };
    });
  } catch {
    return [];
  }
}

export function buildAuditSummary(events: AuditEvent[]): AuditSummary {
  return {
    totalEvents:        events.length,
    workflowsCreated:   events.filter((e) => e.eventType === "workflow_created").length,
    approvalsGranted:   events.filter((e) => e.eventType === "approval_granted").length,
    approvalsRejected:  events.filter((e) => e.eventType === "approval_rejected").length,
    failuresDetected:   events.filter((e) => e.eventType === "failure_detected").length,
    rollbacksExecuted:  events.filter((e) => e.eventType === "rollback_executed").length,
    recentEvents:       events.slice(0, 10),
  };
}

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  workflow_created:  "Workflow Created",
  workflow_modified: "Workflow Modified",
  workflow_executed: "Workflow Executed",
  workflow_cancelled:"Workflow Cancelled",
  approval_granted:  "Approval Granted",
  approval_rejected: "Approval Rejected",
  retry_executed:    "Retry Executed",
  failure_detected:  "Failure Detected",
  manual_override:   "Manual Override",
  rollback_executed: "Rollback Executed",
};

export const AUDIT_EVENT_COLORS: Record<AuditEventType, string> = {
  workflow_created:  "text-cyan-400",
  workflow_modified: "text-slate-400",
  workflow_executed: "text-emerald-400",
  workflow_cancelled:"text-slate-600",
  approval_granted:  "text-emerald-400",
  approval_rejected: "text-ruby-400",
  retry_executed:    "text-gold-300",
  failure_detected:  "text-ruby-400",
  manual_override:   "text-amber-400",
  rollback_executed: "text-amber-400",
};
