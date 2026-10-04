import {
  buildStalledLeadSignals,
  lifecycleStageLabel,
  type StalledLeadSignal,
} from "./adminLeadLifecycle";

export type AdminLeadTimelineSource =
  | "lead"
  | "attribution"
  | "consent"
  | "assignment"
  | "audit"
  | "notification"
  | "appointment"
  | "task"
  | "message"
  | "communication"
  | "response"
  | "ai_review"
  | "outcome";

export type AdminLeadTimelineEvent = {
  /** Stable namespaced identity. Never derived from rendered prose. */
  id: string;
  source_id: string;
  source_type: AdminLeadTimelineSource;
  event_type: string;
  occurred_at: string | null;
  recorded_at: string | null;
  actor: string;
  summary: string;
  detail: string;
  reference: string;
  /** True when the source exposes current state instead of an immutable transition. */
  snapshot: boolean;
  /** Backward-compatible presentation aliases used by the existing Lead Center. */
  type:
    | "captured"
    | "attribution"
    | "consent"
    | "assignment"
    | "lifecycle"
    | "notification"
    | "appointment"
    | "followup"
    | "note"
    | "communication"
    | "response"
    | "ai_review"
    | "outcome";
  label: string;
};

export type AdminLeadTimelinePage = {
  events: AdminLeadTimelineEvent[];
  offset: number;
  limit: number;
  hasMore: boolean;
  complete: boolean;
  incompleteSources: string[];
  loadedCount: number;
};

type TimelineInput = {
  lead: {
    id: string;
    created_at: string | null;
    attribution_summary: string;
    lead_source_surface: string;
  };
  auditRows?: Array<Record<string, unknown>>;
  notificationRows?: Array<Record<string, unknown>>;
  appointmentRows?: Array<Record<string, unknown>>;
  taskRows?: Array<Record<string, unknown>>;
  outcomeRows?: Array<Record<string, unknown>>;
  attributionRows?: Array<Record<string, unknown>>;
  consentRows?: Array<Record<string, unknown>>;
  assignmentRows?: Array<Record<string, unknown>>;
  messageRows?: Array<Record<string, unknown>>;
  communicationRows?: Array<Record<string, unknown>>;
  responseRows?: Array<Record<string, unknown>>;
  aiReviewRows?: Array<Record<string, unknown>>;
};

function text(value: unknown): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function metadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeTimelineText(value: string | null, fallback = "Event recorded") {
  if (!value) return fallback;
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]")
    .replace(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[redacted phone]")
    .replace(/authorization\s*:\s*bearer\s+[a-z0-9._-]+/gi, "[redacted authorization]")
    .replace(/service[_-]?role[a-z0-9._-]*/gi, "[redacted credential]")
    .replace(/raw[_-]?provider[_-]?payload/gi, "[redacted provider payload]")
    .replace(/\s*(\[redacted (?:email|phone|authorization|credential|provider payload)\])/g, " $1")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 320);
}

function safeActor(value: unknown) {
  const actor = text(value);
  if (!actor) return "Unknown actor";
  if (sanitizeTimelineText(actor, "") !== actor) return "Protected actor";
  return actor.slice(0, 80);
}

function eventTime(value: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function compareEvents(a: AdminLeadTimelineEvent, b: AdminLeadTimelineEvent) {
  return eventTime(b.occurred_at) - eventTime(a.occurred_at)
    || eventTime(b.recorded_at) - eventTime(a.recorded_at)
    || a.id.localeCompare(b.id);
}

function uniqueEvents(events: AdminLeadTimelineEvent[]) {
  const seen = new Set<string>();
  return events.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function event(input: Omit<AdminLeadTimelineEvent, "label"> & { label?: string }): AdminLeadTimelineEvent {
  return { ...input, label: input.label || input.summary };
}

export function normalizeAuditTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const action = text(row.action);
  if (!action) return null;
  const afterState = metadata(row.after_state);
  const meta = metadata(row.metadata);
  const occurredAt = text(meta.occurred_at) || text(row.created_at);
  const recordedAt = text(row.created_at) || occurredAt;
  const sourceId = text(row.id) || `${action}:${recordedAt || "unknown"}`;
  const base = {
    id: `audit:${sourceId}`,
    source_id: sourceId,
    source_type: "audit" as const,
    event_type: action,
    occurred_at: occurredAt,
    recorded_at: recordedAt,
    actor: safeActor(row.actor),
    reference: `audit:${sourceId}`,
    snapshot: false,
  };

  if (action === "lead.lifecycle_changed") {
    const status = text(afterState.status) || "unknown";
    const reason = text(afterState.reason);
    return event({
      ...base,
      type: "lifecycle",
      summary: `Lifecycle changed to ${lifecycleStageLabel(status)}`,
      detail: sanitizeTimelineText(reason ? `Reason: ${reason.replaceAll("_", " ")}` : "Status transition recorded"),
    });
  }
  if (action === "lead.first_human_response_recorded") {
    return event({ ...base, type: "response", summary: "First human response recorded", detail: "Immutable speed-to-lead evidence recorded" });
  }
  if (action === "lead.qa_suppressed") {
    return event({
      ...base, type: "lifecycle", summary: "QA capture suppressed",
      detail: "Test classification and communication suppression recorded; not a consumer lead",
    });
  }
  if (["lead.assigned", "lead.reassigned", "lead.unassigned"].includes(action)) {
    return event({
      ...base,
      type: "assignment",
      summary: action === "lead.reassigned" ? "Lead reassigned" : action === "lead.unassigned" ? "Lead unassigned" : "Lead assigned",
      detail: sanitizeTimelineText(text(afterState.assignment_status) || text(meta.assignment_action), "Assignment event"),
    });
  }
  if (action.startsWith("lead.followup_") || action.startsWith("lead.appointment_")) {
    const kind = action.includes("followup") ? "followup" : "appointment";
    return event({
      ...base,
      type: kind,
      summary: action.replace(/^lead\./, "").replaceAll("_", " "),
      detail: sanitizeTimelineText(text(meta.operation), "Operational change recorded"),
    });
  }
  if (action === "lead.note_added") {
    return event({
      ...base,
      type: "note",
      summary: "Lead note added",
      detail: "Protected note content is available in the canonical record",
    });
  }
  return null;
}

export function normalizeNotificationTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent {
  const status = text(row.status) || "unknown";
  const notificationType = text(row.notification_type) || text(row.type) || "notification";
  const channel = text(row.channel) || "unknown channel";
  const sourceId = text(row.id) || `${notificationType}:${status}:${text(row.created_at) || "unknown"}`;
  const occurredAt = text(row.sent_at) || text(row.failed_at) || text(row.updated_at) || text(row.created_at);
  return event({
    id: `notification:${sourceId}:snapshot`, source_id: sourceId, source_type: "notification",
    event_type: `notification.${status}`, occurred_at: occurredAt,
    recorded_at: text(row.updated_at) || text(row.created_at) || occurredAt,
    type: "notification", summary: `Notification ${status.replaceAll("_", " ")}`,
    actor: safeActor(row.provider), detail: sanitizeTimelineText(`${notificationType.replaceAll("_", " ")} / ${channel}`),
    reference: `notification:${sourceId}`, snapshot: true,
  });
}

export function normalizeAppointmentTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const status = text(row.status);
  if (!sourceId || !status) return null;
  const occurredAt = text(row.completed_at) || text(row.confirmed_at) || text(row.canceled_at) || text(row.updated_at) || text(row.created_at);
  const startsAt = text(row.starts_at);
  const timezone = text(row.timezone) || "local time";
  return event({
    id: `appointment:${sourceId}:snapshot`, source_id: sourceId, source_type: "appointment",
    event_type: `appointment.${status}`, occurred_at: occurredAt,
    recorded_at: text(row.updated_at) || text(row.created_at) || occurredAt,
    type: "appointment", summary: `Appointment ${status.replaceAll("_", " ")}`,
    actor: safeActor(row.created_by),
    detail: sanitizeTimelineText(startsAt ? `Starts ${startsAt} (${timezone})` : "Appointment state recorded"),
    reference: `appointment:${sourceId}`, snapshot: true,
  });
}

export function normalizeFollowupTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const status = text(row.status);
  if (!sourceId || !status) return null;
  const category = (text(row.category) || "followup").replace(/^followup:/, "").replaceAll("_", " ");
  const dueAt = text(row.due_at);
  const occurredAt = text(row.updated_at) || text(row.created_at) || dueAt;
  return event({
    id: `task:${sourceId}:snapshot`, source_id: sourceId, source_type: "task",
    event_type: `task.${status}`, occurred_at: occurredAt,
    recorded_at: text(row.updated_at) || text(row.created_at) || occurredAt,
    type: "followup", summary: `Follow-up ${status.replaceAll("_", " ")}`,
    actor: safeActor(row.created_by), detail: sanitizeTimelineText(dueAt ? `${category} due ${dueAt}` : category),
    reference: `task:${sourceId}`, snapshot: true,
  });
}

export function normalizeOutcomeTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const outcomeType = text(row.outcome_type);
  if (!sourceId || !outcomeType) return null;
  const occurredAt = text(row.occurred_at) || text(row.created_at);
  return event({
    id: `outcome:${sourceId}`, source_id: sourceId, source_type: "outcome",
    event_type: `outcome.${outcomeType}`, occurred_at: occurredAt,
    recorded_at: text(row.created_at) || occurredAt, type: "outcome",
    summary: `Outcome ${outcomeType.replaceAll("_", " ")}`, actor: safeActor(row.created_by),
    detail: "Canonical business outcome recorded", reference: `outcome:${sourceId}`, snapshot: false,
  });
}

function normalizeAttributionEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  if (!sourceId) return null;
  const occurredAt = text(row.created_at);
  const detail = [text(row.utm_source), text(row.utm_medium), text(row.utm_campaign), text(row.placement_id)].filter(Boolean).join(" / ");
  return event({
    id: `attribution:${sourceId}`, source_id: sourceId, source_type: "attribution", event_type: "attribution.captured",
    occurred_at: occurredAt, recorded_at: occurredAt, type: "attribution", summary: "Attribution captured",
    actor: "Public intake", detail: sanitizeTimelineText(detail, "Source context recorded"),
    reference: `attribution:${sourceId}`, snapshot: false,
  });
}

function normalizeConsentEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const consentType = text(row.consent_type);
  if (!sourceId || !consentType) return null;
  const granted = row.granted === true || row.granted === "true";
  const occurredAt = text(row.collected_at) || text(row.created_at);
  return event({
    id: `consent:${sourceId}`, source_id: sourceId, source_type: "consent",
    event_type: `consent.${granted ? "granted" : "denied"}`, occurred_at: occurredAt,
    recorded_at: text(row.created_at) || occurredAt, type: "consent",
    summary: `${consentType.toUpperCase()} consent ${granted ? "recorded" : "declined"}`,
    actor: "Public intake", detail: sanitizeTimelineText(text(row.language_version), "Consent evidence recorded"),
    reference: `consent:${sourceId}`, snapshot: false,
  });
}

function normalizeAssignmentEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const status = text(row.status);
  if (!sourceId || !status) return null;
  const occurredAt = text(row.accepted_at) || text(row.declined_at) || text(row.created_at);
  return event({
    id: `assignment:${sourceId}:${status}`, source_id: sourceId, source_type: "assignment",
    event_type: `assignment.${status}`, occurred_at: occurredAt, recorded_at: text(row.created_at) || occurredAt,
    type: "assignment", summary: `Assignment ${status.replaceAll("_", " ")}`, actor: safeActor(row.assigned_by),
    detail: sanitizeTimelineText(text(row.assignment_reason), "Assignment evidence recorded"),
    reference: `assignment:${sourceId}`, snapshot: true,
  });
}

function normalizeMessageEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const role = text(row.role);
  if (!sourceId || !role) return null;
  const occurredAt = text(row.created_at);
  return event({
    id: `message:${sourceId}`, source_id: sourceId, source_type: "message", event_type: `message.${role}`,
    occurred_at: occurredAt, recorded_at: occurredAt, type: role === "agent" ? "note" : "communication",
    summary: role === "agent" ? "Agent note recorded" : `${role.replaceAll("_", " ")} message recorded`,
    actor: role === "agent" ? safeActor(row.agent_id) : role,
    detail: "Protected content retained in the canonical message record", reference: `message:${sourceId}`, snapshot: false,
  });
}

function normalizeCommunicationEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const eventType = text(row.event_type);
  if (!sourceId || !eventType) return null;
  const occurredAt = text(row.occurred_at) || text(row.created_at);
  return event({
    id: `communication:${sourceId}`, source_id: sourceId, source_type: "communication",
    event_type: `communication.${eventType}`, occurred_at: occurredAt, recorded_at: text(row.created_at) || occurredAt,
    type: "communication", summary: `Communication ${eventType.replaceAll("_", " ")}`,
    actor: "Provider evidence", detail: sanitizeTimelineText(text(row.channel), "Communication evidence recorded"),
    reference: `communication:${sourceId}`, snapshot: false,
  });
}

function normalizeResponseEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  if (!sourceId) return null;
  const occurredAt = text(row.first_human_response_at);
  return event({
    id: `response:${sourceId}`, source_id: sourceId, source_type: "response", event_type: "response.first_human",
    occurred_at: occurredAt, recorded_at: text(row.created_at) || occurredAt, type: "response",
    summary: "First human response recorded", actor: safeActor(row.actor), detail: "Immutable first-response milestone",
    reference: `response:${sourceId}`, snapshot: false,
  });
}

function normalizeAiReviewEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const sourceId = text(row.id);
  const status = text(row.status);
  if (!sourceId || !status) return null;
  const occurredAt = text(row.reviewed_at) || text(row.updated_at) || text(row.created_at);
  return event({
    id: `ai_review:${sourceId}:v${text(row.version) || "1"}`, source_id: sourceId, source_type: "ai_review",
    event_type: `ai_review.${status}`, occurred_at: occurredAt,
    recorded_at: text(row.updated_at) || text(row.created_at) || occurredAt, type: "ai_review",
    summary: `AI draft ${status.replaceAll("_", " ")}`, actor: safeActor(row.reviewed_by || row.created_by),
    detail: sanitizeTimelineText([text(row.artifact_type), text(row.channel)].filter(Boolean).join(" / "), "Review evidence recorded"),
    reference: `ai_review:${sourceId}`, snapshot: false,
  });
}

function collectEvents(input: TimelineInput): AdminLeadTimelineEvent[] {
  const events: AdminLeadTimelineEvent[] = [event({
    id: `lead:${input.lead.id}:captured`, source_id: input.lead.id, source_type: "lead", event_type: "lead.captured",
    occurred_at: input.lead.created_at, recorded_at: input.lead.created_at, type: "captured", summary: "Lead captured",
    actor: "Public intake", detail: sanitizeTimelineText(input.lead.lead_source_surface),
    reference: `lead:${input.lead.id}`, snapshot: false,
  })];

  const attributionEvents = (input.attributionRows || []).flatMap((row) => {
    const normalized = normalizeAttributionEvent(row);
    return normalized ? [normalized] : [];
  });
  if (attributionEvents.length) events.push(...attributionEvents);
  else if (input.lead.attribution_summary !== "No attribution captured") {
    events.push(event({
      id: `lead:${input.lead.id}:attribution-snapshot`, source_id: input.lead.id, source_type: "attribution",
      event_type: "attribution.snapshot", occurred_at: input.lead.created_at, recorded_at: input.lead.created_at,
      type: "attribution", summary: "Attribution captured", actor: "Public intake",
      detail: sanitizeTimelineText(input.lead.attribution_summary), reference: `lead:${input.lead.id}`, snapshot: true,
    }));
  }

  const normalizers: Array<[Array<Record<string, unknown>> | undefined, (row: Record<string, unknown>) => AdminLeadTimelineEvent | null]> = [
    [input.auditRows, normalizeAuditTimelineEvent],
    [input.notificationRows, normalizeNotificationTimelineEvent],
    [input.appointmentRows, normalizeAppointmentTimelineEvent],
    [input.taskRows, normalizeFollowupTimelineEvent],
    [input.outcomeRows, normalizeOutcomeTimelineEvent],
    [input.consentRows, normalizeConsentEvent],
    [input.assignmentRows, normalizeAssignmentEvent],
    [input.messageRows, normalizeMessageEvent],
    [input.communicationRows, normalizeCommunicationEvent],
    [input.responseRows, normalizeResponseEvent],
    [input.aiReviewRows, normalizeAiReviewEvent],
  ];
  for (const [rows, normalize] of normalizers) {
    for (const row of rows || []) {
      const normalized = normalize(row);
      if (normalized) events.push(normalized);
    }
  }
  return uniqueEvents(events).sort(compareEvents);
}

export function buildLeadTimeline(input: TimelineInput): AdminLeadTimelineEvent[] {
  return collectEvents(input);
}

export function buildLeadTimelinePage(
  input: TimelineInput & { incompleteSources?: string[] },
  pagination: { offset?: number; limit?: number } = {},
): AdminLeadTimelinePage {
  const offset = Math.max(0, Math.floor(pagination.offset || 0));
  const limit = Math.max(1, Math.min(Math.floor(pagination.limit || 30), 100));
  const events = collectEvents(input);
  const incompleteSources = [...new Set(input.incompleteSources || [])].sort();
  return {
    events: events.slice(offset, offset + limit), offset, limit,
    hasMore: events.length > offset + limit,
    complete: incompleteSources.length === 0,
    incompleteSources,
    loadedCount: events.length,
  };
}

export function buildLeadStalledSignals(input: {
  status: string;
  created_at: string | null;
  assigned_agent_id?: string | null;
  assigned_at?: string | null;
  last_contacted_at?: string | null;
  lead_grade?: string | null;
  timeline_months?: number | null;
}, now = new Date()): StalledLeadSignal[] {
  return buildStalledLeadSignals(input, now);
}
