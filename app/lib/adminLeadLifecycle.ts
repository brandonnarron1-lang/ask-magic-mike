export const ADMIN_LEAD_STATUSES = [
  "new",
  "scored",
  "qualified",
  "assigned",
  "contacted",
  "appointment_requested",
  "appointment_set",
  "nurture",
  "dead",
  "converted",
  "spam",
  "escalated",
] as const;

export type AdminLeadStatus = (typeof ADMIN_LEAD_STATUSES)[number];

export type AdminLeadStatusAction = {
  status: AdminLeadStatus;
  label: string;
  intent: "standard" | "caution";
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  reasonSet?: "lost" | "disqualified";
};

export const LOST_REASONS = [
  "chose_another_agent",
  "timing_changed",
  "price_expectations",
  "financing",
  "unresponsive",
  "duplicate",
  "outside_service_area",
  "other",
] as const;

export const DISQUALIFIED_REASONS = [
  "invalid_contact",
  "spam",
  "not_real_estate",
  "unsupported_location",
  "duplicate_record",
  "internal_test",
  "other",
] as const;

export type LeadTerminalReason =
  | (typeof LOST_REASONS)[number]
  | (typeof DISQUALIFIED_REASONS)[number];

type LifecycleFieldAction = "set" | "preserve" | "clear";

type LifecycleFieldBehavior = {
  appointment_requested: LifecycleFieldAction;
  last_contacted_at: LifecycleFieldAction;
  conversion_stage: LifecycleFieldAction;
  converted_at: LifecycleFieldAction;
  closed_won_at: LifecycleFieldAction;
  closed_lost_at: LifecycleFieldAction;
  closed_lost_reason: LifecycleFieldAction;
};

type LifecyclePatchContext = {
  nowIso: string;
  reason: LeadTerminalReason | null;
};

export const TERMINAL_REASON_LABELS: Record<LeadTerminalReason, string> = {
  chose_another_agent: "Chose another agent",
  timing_changed: "Timing changed",
  price_expectations: "Price expectations",
  financing: "Financing",
  unresponsive: "Unresponsive",
  duplicate: "Duplicate",
  outside_service_area: "Outside service area",
  invalid_contact: "Invalid contact",
  spam: "Spam",
  not_real_estate: "Not real estate",
  unsupported_location: "Unsupported location",
  duplicate_record: "Duplicate record",
  internal_test: "Internal test",
  other: "Other",
};

export const LEAD_LIFECYCLE_FIELD_CLEANUP: Record<AdminLeadStatus, LifecycleFieldBehavior> = {
  new: {
    appointment_requested: "clear",
    last_contacted_at: "preserve",
    conversion_stage: "clear",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  scored: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  assigned: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  contacted: {
    appointment_requested: "preserve",
    last_contacted_at: "set",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  qualified: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  appointment_requested: {
    appointment_requested: "set",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  appointment_set: {
    appointment_requested: "set",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  nurture: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  escalated: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  converted: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "set",
    closed_won_at: "set",
    closed_lost_at: "clear",
    closed_lost_reason: "clear",
  },
  dead: {
    appointment_requested: "preserve",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "set",
    closed_lost_reason: "set",
  },
  spam: {
    appointment_requested: "clear",
    last_contacted_at: "preserve",
    conversion_stage: "set",
    converted_at: "clear",
    closed_won_at: "clear",
    closed_lost_at: "set",
    closed_lost_reason: "set",
  },
};

const CONVERSION_STAGE_BY_STATUS: Partial<Record<AdminLeadStatus, string | null>> = {
  scored: "scored",
  assigned: "assigned",
  contacted: "contacted",
  qualified: "qualified",
  appointment_requested: "appointment_requested",
  appointment_set: "appointment_set",
  nurture: "nurture",
  escalated: "escalated",
  converted: "converted",
  dead: "dead",
  spam: "disqualified",
  new: null,
};

export const ADMIN_LEAD_STATUS_ACTIONS: AdminLeadStatusAction[] = [
  { status: "contacted", label: "Mark contacted", intent: "standard" },
  { status: "qualified", label: "Mark qualified", intent: "standard" },
  { status: "appointment_requested", label: "Appointment requested", intent: "standard" },
  { status: "appointment_set", label: "Appointment set", intent: "standard" },
  { status: "nurture", label: "Move to nurture", intent: "standard" },
  {
    status: "converted",
    label: "Closed won",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm closed won",
  },
  {
    status: "dead",
    label: "Closed lost",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm closed lost",
    reasonSet: "lost",
  },
  {
    status: "spam",
    label: "Spam / test lead",
    intent: "caution",
    requiresConfirmation: true,
    confirmationLabel: "Confirm not a real lead",
    reasonSet: "disqualified",
  },
  { status: "escalated", label: "Escalate", intent: "caution" },
  { status: "new", label: "Restore to new", intent: "standard" },
];

const STATUS_ORDER: Record<AdminLeadStatus, number> = {
  new: 0,
  scored: 1,
  assigned: 2,
  escalated: 2,
  contacted: 3,
  qualified: 4,
  appointment_requested: 5,
  appointment_set: 6,
  nurture: 4,
  converted: 7,
  dead: 7,
  spam: 7,
};

const TERMINAL_STATUSES = new Set<AdminLeadStatus>(["converted", "dead", "spam"]);

const ACTIVE_STATUSES = new Set<AdminLeadStatus>([
  "new",
  "scored",
  "assigned",
  "contacted",
  "qualified",
  "appointment_requested",
  "appointment_set",
  "nurture",
  "escalated",
]);

export const STALLED_LEAD_THRESHOLDS_HOURS = {
  unassignedAssignmentSla: 4,
  assignedNoContact: 2,
  contactedNoProgression: 72,
  appointmentRequestedNotSet: 48,
  hotIdle: 24,
} as const;

export type StalledLeadSignal = {
  key:
    | "unassigned_assignment_sla"
    | "assigned_not_contacted"
    | "contacted_no_progression"
    | "appointment_not_set"
    | "hot_idle";
  label: string;
  ageHours: number;
  nextAction: string;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function hoursSince(value: string | null, now: Date) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / (60 * 60 * 1000)));
}

export function isAdminLeadStatus(value: string): value is AdminLeadStatus {
  return (ADMIN_LEAD_STATUSES as readonly string[]).includes(value);
}

export function statusActionFor(status: string) {
  return ADMIN_LEAD_STATUS_ACTIONS.find((action) => action.status === status);
}

export function isTerminalReason(value: string | null): value is LeadTerminalReason {
  if (!value) return false;
  return (
    (LOST_REASONS as readonly string[]).includes(value) ||
    (DISQUALIFIED_REASONS as readonly string[]).includes(value)
  );
}

export function validateTerminalReasonForStatus(
  status: AdminLeadStatus,
  reason: string | null,
): { ok: true; reason: LeadTerminalReason | null } | { ok: false; error: "invalid_terminal_reason" } {
  const cleaned = text(reason);

  if (status === "dead") {
    if (!cleaned || !(LOST_REASONS as readonly string[]).includes(cleaned)) {
      return { ok: false, error: "invalid_terminal_reason" };
    }
    return { ok: true, reason: cleaned as LeadTerminalReason };
  }

  if (status === "spam") {
    if (!cleaned || !(DISQUALIFIED_REASONS as readonly string[]).includes(cleaned)) {
      return { ok: false, error: "invalid_terminal_reason" };
    }
    return { ok: true, reason: cleaned as LeadTerminalReason };
  }

  if (cleaned) {
    return { ok: false, error: "invalid_terminal_reason" };
  }

  return { ok: true, reason: null };
}

export function buildLeadLifecyclePatch(
  status: AdminLeadStatus,
  context: LifecyclePatchContext,
): Record<string, unknown> {
  const behavior = LEAD_LIFECYCLE_FIELD_CLEANUP[status];
  const patch: Record<string, unknown> = { status };

  if (behavior.appointment_requested === "set") patch.appointment_requested = true;
  if (behavior.appointment_requested === "clear") patch.appointment_requested = false;

  if (behavior.last_contacted_at === "set") patch.last_contacted_at = context.nowIso;

  if (behavior.conversion_stage === "set") patch.conversion_stage = CONVERSION_STAGE_BY_STATUS[status] ?? null;
  if (behavior.conversion_stage === "clear") patch.conversion_stage = null;

  if (behavior.converted_at === "set") patch.converted_at = context.nowIso;
  if (behavior.converted_at === "clear") patch.converted_at = null;

  if (behavior.closed_won_at === "set") patch.closed_won_at = context.nowIso;
  if (behavior.closed_won_at === "clear") patch.closed_won_at = null;

  if (behavior.closed_lost_at === "set") patch.closed_lost_at = context.nowIso;
  if (behavior.closed_lost_at === "clear") patch.closed_lost_at = null;

  if (behavior.closed_lost_reason === "set") patch.closed_lost_reason = context.reason;
  if (behavior.closed_lost_reason === "clear") patch.closed_lost_reason = null;

  return patch;
}

export function isAllowedLeadTransition(current: AdminLeadStatus, next: AdminLeadStatus) {
  if (current === next) return true;
  if (next === "spam") return current !== "converted";
  if (next === "new") return current === "dead" || current === "spam" || current === "escalated";
  if (TERMINAL_STATUSES.has(current)) return false;
  if (next === "escalated") return ACTIVE_STATUSES.has(current);
  if (next === "dead" || next === "converted") return ACTIVE_STATUSES.has(current);
  if (next === "nurture") return ["contacted", "qualified", "appointment_requested", "escalated"].includes(current);
  return STATUS_ORDER[next] >= STATUS_ORDER[current];
}

export function lifecycleStageLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function buildStalledLeadSignals(input: {
  status: string;
  created_at: string | null;
  assigned_agent_id?: string | null;
  assigned_at?: string | null;
  last_contacted_at?: string | null;
  lead_grade?: string | null;
  timeline_months?: number | null;
}, now = new Date()): StalledLeadSignal[] {
  const status = isAdminLeadStatus(input.status) ? input.status : "new";
  if (TERMINAL_STATUSES.has(status)) return [];

  const createdAge = hoursSince(input.created_at, now);
  const assignedAge = hoursSince(input.assigned_at || null, now);
  const contactedAge = hoursSince(input.last_contacted_at || null, now);
  const hotLead = ["A+", "A"].includes(text(input.lead_grade) || "") || input.timeline_months === 0;
  const signals: StalledLeadSignal[] = [];

  if (!input.assigned_agent_id && createdAge !== null && createdAge >= STALLED_LEAD_THRESHOLDS_HOURS.unassignedAssignmentSla) {
    signals.push({
      key: "unassigned_assignment_sla",
      label: "Unassigned past assignment SLA",
      ageHours: createdAge,
      nextAction: "Assign an eligible active agent",
    });
  }

  if (
    input.assigned_agent_id &&
    !input.last_contacted_at &&
    assignedAge !== null &&
    assignedAge >= STALLED_LEAD_THRESHOLDS_HOURS.assignedNoContact
  ) {
    signals.push({
      key: "assigned_not_contacted",
      label: "Assigned but not contacted",
      ageHours: assignedAge,
      nextAction: "Confirm first contact or reassign",
    });
  }

  if (
    status === "contacted" &&
    contactedAge !== null &&
    contactedAge >= STALLED_LEAD_THRESHOLDS_HOURS.contactedNoProgression
  ) {
    signals.push({
      key: "contacted_no_progression",
      label: "Contacted with no progression",
      ageHours: contactedAge,
      nextAction: "Qualify, nurture, or close lost",
    });
  }

  if (
    status === "appointment_requested" &&
    contactedAge !== null &&
    contactedAge >= STALLED_LEAD_THRESHOLDS_HOURS.appointmentRequestedNotSet
  ) {
    signals.push({
      key: "appointment_not_set",
      label: "Appointment requested but not set",
      ageHours: contactedAge,
      nextAction: "Confirm appointment details",
    });
  }

  if (
    hotLead &&
    ["new", "scored", "assigned", "escalated"].includes(status) &&
    createdAge !== null &&
    createdAge >= STALLED_LEAD_THRESHOLDS_HOURS.hotIdle
  ) {
    signals.push({
      key: "hot_idle",
      label: "Hot lead idle beyond threshold",
      ageHours: createdAge,
      nextAction: "Prioritize same-day follow-up",
    });
  }

  return signals;
}
