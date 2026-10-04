import type {
  AdminAppointmentRow,
  AdminFollowupTaskRow,
} from "./adminAppointmentFollowupOps";
import type { LeadCenterPermission } from "../../src/lib/admin/rbac-policy";
import { NOTIFICATION_PENDING_STALE_MINUTES, NOTIFICATION_PROCESSING_STALE_MINUTES } from "./leadNotificationRetryPolicy";

export const TODAY_PRIORITY_BUCKETS = [
  "unassigned_exception",
  "hot",
  "overdue_sla",
  "notification_failure",
  "active",
  "new_followup",
] as const;

export type TodayPriorityBucket = (typeof TODAY_PRIORITY_BUCKETS)[number];
export type TodayActionKind =
  | "assign_lead"
  | "record_human_response"
  | "complete_task"
  | "prepare_appointment"
  | "schedule_appointment"
  | "review_notification"
  | "follow_up"
  | "review_hold";

export type TodayReasonCode =
  | "lead_unassigned"
  | "hot_lead"
  | "assignment_acceptance_overdue"
  | "first_human_response_overdue"
  | "followup_overdue"
  | "followup_due_today"
  | "appointment_today"
  | "appointment_unscheduled"
  | "notification_failed"
  | "notification_pending_stale"
  | "notification_provider_reconciliation"
  | "active_lead"
  | "new_lead";

export type TodayBlocker =
  | "test_record"
  | "communication_suppressed"
  | "contact_permission_missing"
  | "lead_unassigned";

export type AdminTodayAction = {
  id: string;
  actionKey: string;
  leadId: string;
  taskId: string | null;
  appointmentId: string | null;
  notificationId: string | null;
  assignedAgentId: string | null;
  leadLabel: string;
  actionKind: TodayActionKind;
  priorityBucket: TodayPriorityBucket;
  dueAt: string | null;
  timezone: string;
  reasonCodes: TodayReasonCode[];
  evidenceReferences: string[];
  blockers: TodayBlocker[];
  requiredPermission: LeadCenterPermission;
  recordVersion: string;
  reviewVersion: number;
  recommendedAction: string;
};

export type AdminTodayQueueResult = {
  configured: boolean;
  generatedAt: string;
  timezone: string;
  items: AdminTodayAction[];
  upcomingAppointments: AdminTodayAction[];
  counts: Record<TodayPriorityBucket, number>;
  excludedTestRecords: number;
  error?: string;
};

type TodayLeadRow = Record<string, unknown>;
type PermissionRow = Record<string, unknown>;
type NotificationRow = Record<string, unknown>;
type ReviewRow = Record<string, unknown>;

const TERMINAL_STATUSES = new Set(["converted", "dead", "closed", "closed_won", "closed_lost", "spam"]);
const ACTIVE_STATUSES = new Set(["assigned", "contacted", "qualified", "appointment_requested", "appointment_set", "nurture", "escalated"]);

function text(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function bool(value: unknown) {
  return value === true || value === "true";
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function time(value: string | null) {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function leadName(row: TodayLeadRow) {
  return text(row.address_raw)
    || [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ")
    || text(row.name)
    || text(row.id)
    || "Lead";
}

function contactAllowed(leadId: string, permissions: PermissionRow[]) {
  return permissions.some((row) =>
    text(row.lead_id) === leadId
    && text(row.state) === "allowed"
    && row.manual_review_required !== true
    && row.manual_review_required !== "true"
    && ["requested_service_response", "appointment_coordination", "manual_one_to_one"].includes(text(row.purpose) || "")
    && ["email", "sms", "phone"].includes(text(row.channel) || ""),
  );
}

function blockersFor(lead: TodayLeadRow, permissions: PermissionRow[], contactAction: boolean): TodayBlocker[] {
  const blockers: TodayBlocker[] = [];
  if (bool(lead.is_test)) blockers.push("test_record");
  if (bool(lead.communication_suppressed)) blockers.push("communication_suppressed");
  if (contactAction && !contactAllowed(text(lead.id) || "", permissions)) blockers.push("contact_permission_missing");
  return blockers;
}

function actionForBlockers(action: TodayActionKind, blockers: TodayBlocker[]): TodayActionKind {
  return blockers.length ? "review_hold" : action;
}

function bucketRank(bucket: TodayPriorityBucket) {
  return TODAY_PRIORITY_BUCKETS.indexOf(bucket);
}

function buildCounts(items: AdminTodayAction[]): Record<TodayPriorityBucket, number> {
  return TODAY_PRIORITY_BUCKETS.reduce((counts, bucket) => {
    counts[bucket] = items.filter((item) => item.priorityBucket === bucket).length;
    return counts;
  }, {} as Record<TodayPriorityBucket, number>);
}

function activeReviewMap(rows: ReviewRow[], now: Date) {
  return new Map(rows.flatMap((row) => {
    const leadId = text(row.lead_id);
    const actionKey = text(row.action_key);
    if (!leadId || !actionKey) return [];
    const status = text(row.status) || "open";
    const snoozeUntil = text(row.snooze_until);
    const hidden = status === "dismissed" || (status === "snoozed" && Number.isFinite(time(snoozeUntil)) && time(snoozeUntil) > now.getTime());
    return [[`${leadId}:${actionKey}`, { hidden, version: number(row.version) || 0 }]];
  }));
}

export function buildAdminTodayQueue(input: {
  leads: TodayLeadRow[];
  appointments: AdminAppointmentRow[];
  tasks: AdminFollowupTaskRow[];
  notifications?: NotificationRow[];
  permissions?: PermissionRow[];
  reviews?: ReviewRow[];
  now?: Date;
  timezone?: string;
  canViewUnassigned?: boolean;
}): AdminTodayQueueResult {
  const now = input.now || new Date();
  const timezone = input.timezone || "America/New_York";
  const permissions = input.permissions || [];
  const reviews = activeReviewMap(input.reviews || [], now);
  const excludedTestRecords = input.leads.filter((lead) => bool(lead.is_test)).length;
  const leads = input.leads.filter((lead) =>
    !bool(lead.is_test)
    && !TERMINAL_STATUSES.has((text(lead.status) || "new").toLowerCase()),
  );
  const leadMap = new Map(leads.map((lead) => [text(lead.id) || "", lead]));
  const items: AdminTodayAction[] = [];
  const nowMs = now.getTime();
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const isToday = (value: string | null) => Boolean(value && new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) === localDate);

  const add = (inputAction: Omit<AdminTodayAction, "id" | "reviewVersion">) => {
    const review = reviews.get(`${inputAction.leadId}:${inputAction.actionKey}`);
    if (review?.hidden) return;
    items.push({
      ...inputAction,
      id: `${inputAction.leadId}:${inputAction.actionKey}`,
      reviewVersion: review?.version || 0,
    });
  };

  for (const lead of leads) {
    const leadId = text(lead.id);
    if (!leadId) continue;
    const assignedAgentId = text(lead.assigned_agent_id);
    const createdAt = text(lead.created_at);
    const assignedAt = text(lead.assigned_at);
    const firstResponseAt = text(lead.first_human_response_at);
    const score = number(lead.score) || 0;
    const grade = (text(lead.lead_grade) || "").toUpperCase();
    const label = leadName(lead);
    const version = text(lead.updated_at) || createdAt || "unknown";

    if (!assignedAgentId && input.canViewUnassigned) {
      add({
        actionKey: "assign", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId: null, leadLabel: label, actionKind: "assign_lead", priorityBucket: "unassigned_exception",
        dueAt: createdAt, timezone, reasonCodes: ["lead_unassigned"], evidenceReferences: [`lead:${leadId}`],
        blockers: ["lead_unassigned"], requiredPermission: "lead:assign", recordVersion: version,
        recommendedAction: "Assign an eligible owner and record the routing reason.",
      });
    }

    if (score >= 80 || grade === "A+" || grade === "A") {
      const blockers = blockersFor(lead, permissions, true);
      add({
        actionKey: "hot-review", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId, leadLabel: label, actionKind: actionForBlockers("follow_up", blockers), priorityBucket: "hot",
        dueAt: createdAt, timezone, reasonCodes: ["hot_lead"], evidenceReferences: [`lead:${leadId}`, `score:${score}`],
        blockers, requiredPermission: "lead:update_assigned", recordVersion: version,
        recommendedAction: blockers.length ? "Review the communication hold before any contact." : "Review the request and record genuine human follow-up.",
      });
    }

    if (assignedAgentId && assignedAt && nowMs - time(assignedAt) >= 2 * 60_000 && text(lead.assignment_status) === "pending") {
      add({
        actionKey: "assignment-acceptance", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId, leadLabel: label, actionKind: "follow_up", priorityBucket: "overdue_sla",
        dueAt: new Date(time(assignedAt) + 2 * 60_000).toISOString(), timezone,
        reasonCodes: ["assignment_acceptance_overdue"], evidenceReferences: [`assignment:${text(lead.assignment_id) || leadId}`],
        blockers: [], requiredPermission: "lead:update_assigned", recordVersion: version,
        recommendedAction: "Accept or escalate the pending assignment.",
      });
    }

    if (assignedAgentId && !firstResponseAt && createdAt && nowMs - time(createdAt) >= 5 * 60_000) {
      const blockers = blockersFor(lead, permissions, true);
      add({
        actionKey: "first-human-response", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId, leadLabel: label, actionKind: actionForBlockers("record_human_response", blockers),
        priorityBucket: "overdue_sla", dueAt: new Date(time(createdAt) + 5 * 60_000).toISOString(), timezone,
        reasonCodes: ["first_human_response_overdue"], evidenceReferences: [`lead:${leadId}`], blockers,
        requiredPermission: "lead:update_assigned", recordVersion: version,
        recommendedAction: blockers.length ? "Resolve the hold; do not contact while blocked." : "Make a genuine one-to-one follow-up, then record the milestone.",
      });
    }

    const status = (text(lead.status) || "new").toLowerCase();
    if (ACTIVE_STATUSES.has(status)) {
      const blockers = blockersFor(lead, permissions, true);
      add({
        actionKey: "active-review", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId, leadLabel: label, actionKind: actionForBlockers("follow_up", blockers), priorityBucket: "active",
        dueAt: text(lead.next_follow_up_at), timezone, reasonCodes: ["active_lead"], evidenceReferences: [`lead:${leadId}`],
        blockers, requiredPermission: "lead:update_assigned", recordVersion: version,
        recommendedAction: blockers.length ? "Resolve the communication hold before any contact." : "Review the latest evidence and maintain the next action.",
      });
    } else if (status === "new" || status === "scored") {
      const blockers = blockersFor(lead, permissions, true);
      add({
        actionKey: "new-review", leadId, taskId: null, appointmentId: null, notificationId: null,
        assignedAgentId, leadLabel: label, actionKind: actionForBlockers("follow_up", blockers), priorityBucket: "new_followup",
        dueAt: createdAt, timezone, reasonCodes: ["new_lead"], evidenceReferences: [`lead:${leadId}`],
        blockers, requiredPermission: "lead:update_assigned", recordVersion: version,
        recommendedAction: blockers.length ? "Resolve the communication hold before any contact." : "Review intake facts and set the next action.",
      });
    }
  }

  for (const task of input.tasks) {
    if (!task.lead_id || !leadMap.has(task.lead_id) || !["open", "in_progress"].includes(task.status)) continue;
    const due = time(task.due_at);
    if (!Number.isFinite(due) || (due >= nowMs && !isToday(task.due_at))) continue;
    const lead = leadMap.get(task.lead_id)!;
    const overdue = due < nowMs;
    const blockers = blockersFor(lead, permissions, true);
    add({
      actionKey: `task:${task.id}`, leadId: task.lead_id, taskId: task.id, appointmentId: null, notificationId: null,
      assignedAgentId: text(lead.assigned_agent_id), leadLabel: leadName(lead),
      actionKind: actionForBlockers("complete_task", blockers), priorityBucket: overdue ? "overdue_sla" : "new_followup",
      dueAt: task.due_at, timezone, reasonCodes: [overdue ? "followup_overdue" : "followup_due_today"],
      evidenceReferences: [`task:${task.id}`], blockers, requiredPermission: "task:manage_assigned",
      recordVersion: task.updated_at || task.created_at || "unknown",
      recommendedAction: blockers.length ? "Review the communication hold before completing contact work." : "Complete, snooze, or reschedule this follow-up.",
    });
  }

  const upcomingAppointments: AdminTodayAction[] = [];
  for (const appointment of input.appointments) {
    const lead = leadMap.get(appointment.lead_id);
    if (!lead || !["requested", "scheduled", "confirmed", "reschedule_requested"].includes(appointment.status)) continue;
    const unscheduled = !appointment.starts_at || ["requested", "reschedule_requested"].includes(appointment.status);
    const today = isToday(appointment.starts_at);
    if (!unscheduled && !today) continue;
    const actionKey = `appointment:${appointment.id}`;
    const blockers = blockersFor(lead, permissions, false);
    const appointmentAction: Omit<AdminTodayAction, "id" | "reviewVersion"> = {
      actionKey, leadId: appointment.lead_id, taskId: null, appointmentId: appointment.id, notificationId: null,
      assignedAgentId: text(lead.assigned_agent_id), leadLabel: leadName(lead),
      actionKind: unscheduled ? "schedule_appointment" : "prepare_appointment", priorityBucket: unscheduled ? "overdue_sla" : "hot",
      dueAt: appointment.starts_at || appointment.requested_at, timezone: appointment.timezone || timezone,
      reasonCodes: [unscheduled ? "appointment_unscheduled" : "appointment_today"], evidenceReferences: [`appointment:${appointment.id}`],
      blockers, requiredPermission: "task:manage_assigned", recordVersion: appointment.updated_at || appointment.created_at || "unknown",
      recommendedAction: unscheduled ? "Set verified appointment details." : "Review the lead timeline and prepare for the appointment.",
    };
    const review = reviews.get(`${appointment.lead_id}:${actionKey}`);
    if (!review?.hidden) {
      const normalized = { ...appointmentAction, id: `${appointment.lead_id}:${actionKey}`, reviewVersion: review?.version || 0 };
      items.push(normalized);
      upcomingAppointments.push(normalized);
    }
  }

  for (const notification of input.notifications || []) {
    const leadId = text(notification.lead_id);
    const lead = leadId ? leadMap.get(leadId) : null;
    const status = text(notification.status);
    const stalePending = status === "pending" && time(text(notification.created_at)) <= nowMs - NOTIFICATION_PENDING_STALE_MINUTES * 60_000;
    const ambiguous = (status === "processing" && time(text(notification.updated_at)) <= nowMs - NOTIFICATION_PROCESSING_STALE_MINUTES * 60_000)
      || (stalePending && (number(notification.attempt_count) !== 0 || Boolean(text(notification.provider_message_id))));
    if (!leadId || !lead || (!stalePending && !ambiguous && !["failed", "retry_scheduled", "permanently_failed"].includes(status || ""))) continue;
    const notificationId = text(notification.id) || leadId;
    add({
      actionKey: `notification:${notificationId}`, leadId, taskId: null, appointmentId: null, notificationId,
      assignedAgentId: text(lead.assigned_agent_id), leadLabel: leadName(lead), actionKind: "review_notification",
      priorityBucket: "notification_failure", dueAt: text(notification.next_attempt_at) || text(notification.updated_at), timezone,
      reasonCodes: [ambiguous ? "notification_provider_reconciliation" : stalePending ? "notification_pending_stale" : "notification_failed"], evidenceReferences: [`notification:${notificationId}`], blockers: [],
      requiredPermission: "notification:manage", recordVersion: text(notification.updated_at) || text(notification.created_at) || "unknown",
      recommendedAction: ambiguous ? "Reconcile provider history before intervention; do not resend an ambiguous delivery."
        : stalePending ? "Inspect the never-claimed intent and delivery configuration; scheduled recovery is not activated."
        : "Inspect provider evidence and retry policy before intervention.",
    });
  }

  items.sort((a, b) => bucketRank(a.priorityBucket) - bucketRank(b.priorityBucket)
    || eventTime(a.dueAt) - eventTime(b.dueAt)
    || a.leadLabel.localeCompare(b.leadLabel)
    || a.id.localeCompare(b.id));

  return {
    configured: true,
    generatedAt: now.toISOString(),
    timezone,
    items,
    upcomingAppointments: upcomingAppointments.sort((a, b) => eventTime(a.dueAt) - eventTime(b.dueAt) || a.id.localeCompare(b.id)),
    counts: buildCounts(items),
    excludedTestRecords,
  };
}

function eventTime(value: string | null) {
  const parsed = time(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export function emptyAdminTodayQueue(now = new Date(), timezone = "America/New_York", error?: string): AdminTodayQueueResult {
  return {
    configured: false,
    generatedAt: now.toISOString(),
    timezone,
    items: [],
    upcomingAppointments: [],
    counts: buildCounts([]),
    excludedTestRecords: 0,
    ...(error ? { error } : {}),
  };
}
