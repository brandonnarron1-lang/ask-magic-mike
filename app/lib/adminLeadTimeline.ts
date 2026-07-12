import {
  buildStalledLeadSignals,
  lifecycleStageLabel,
  type StalledLeadSignal,
} from "./adminLeadLifecycle";

export type AdminLeadTimelineEvent = {
  id: string;
  occurred_at: string | null;
  type:
    | "captured"
    | "attribution"
    | "assignment"
    | "lifecycle"
    | "notification";
  label: string;
  actor: string | null;
  detail: string;
};

function text(value: unknown): string | null {
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
    .slice(0, 220);
}

function safeActor(value: unknown) {
  const actor = text(value);
  if (!actor) return null;
  if (sanitizeTimelineText(actor, "") !== actor) return "AdminOps";
  return actor.slice(0, 80);
}

function eventTime(event: AdminLeadTimelineEvent) {
  if (!event.occurred_at) return 0;
  const time = new Date(event.occurred_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

function uniqueEvents(events: AdminLeadTimelineEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.type}:${event.occurred_at || ""}:${event.label}:${event.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeAuditTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent | null {
  const action = text(row.action);
  if (!action) return null;
  const beforeState = metadata(row.before_state);
  const afterState = metadata(row.after_state);
  const meta = metadata(row.metadata);
  const occurredAt = text(row.created_at);
  const id = text(row.id) || `${action}-${occurredAt || "unknown"}`;

  if (action === "lead.lifecycle_changed") {
    const status = text(afterState.status) || "unknown";
    const reason = text(afterState.reason);
    return {
      id,
      occurred_at: occurredAt,
      type: "lifecycle",
      label: `Lifecycle changed to ${lifecycleStageLabel(status)}`,
      actor: safeActor(row.actor),
      detail: sanitizeTimelineText(reason ? `Reason: ${reason.replaceAll("_", " ")}` : "Status transition recorded"),
    };
  }

  if (["lead.assigned", "lead.reassigned", "lead.unassigned"].includes(action)) {
    return {
      id,
      occurred_at: occurredAt,
      type: "assignment",
      label:
        action === "lead.reassigned"
          ? "Lead reassigned"
          : action === "lead.unassigned"
            ? "Lead unassigned"
            : "Lead assigned",
      actor: safeActor(row.actor),
      detail: sanitizeTimelineText(text(afterState.assignment_status) || text(meta.assignment_action), "Assignment event"),
    };
  }

  return null;
}

export function normalizeNotificationTimelineEvent(row: Record<string, unknown>): AdminLeadTimelineEvent {
  const status = text(row.status) || "unknown";
  const notificationType = text(row.notification_type) || text(row.type) || "notification";
  const channel = text(row.channel) || "unknown channel";
  const occurredAt = text(row.sent_at) || text(row.updated_at) || text(row.created_at);
  return {
    id: text(row.id) || `${notificationType}-${status}-${occurredAt || "unknown"}`,
    occurred_at: occurredAt,
    type: "notification",
    label: `Notification ${status.replaceAll("_", " ")}`,
    actor: safeActor(row.provider),
    detail: sanitizeTimelineText(`${notificationType.replaceAll("_", " ")} / ${channel}`),
  };
}

export function buildLeadTimeline(input: {
  lead: {
    id: string;
    created_at: string | null;
    attribution_summary: string;
    lead_source_surface: string;
  };
  auditRows?: Array<Record<string, unknown>>;
  notificationRows?: Array<Record<string, unknown>>;
}): AdminLeadTimelineEvent[] {
  const events: AdminLeadTimelineEvent[] = [
    {
      id: `${input.lead.id}-captured`,
      occurred_at: input.lead.created_at,
      type: "captured",
      label: "Lead captured",
      actor: "public_capture",
      detail: sanitizeTimelineText(input.lead.lead_source_surface),
    },
  ];

  if (input.lead.attribution_summary !== "No attribution captured") {
    events.push({
      id: `${input.lead.id}-attribution`,
      occurred_at: input.lead.created_at,
      type: "attribution",
      label: "Attribution captured",
      actor: "source_attribution",
      detail: sanitizeTimelineText(input.lead.attribution_summary),
    });
  }

  for (const row of input.auditRows || []) {
    const event = normalizeAuditTimelineEvent(row);
    if (event) events.push(event);
  }

  for (const row of input.notificationRows || []) {
    events.push(normalizeNotificationTimelineEvent(row));
  }

  return uniqueEvents(events).sort((a, b) => eventTime(b) - eventTime(a));
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
