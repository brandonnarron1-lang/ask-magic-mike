export const SEQUENCE_STATUSES = [
  "draft",
  "approval_required",
  "test",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
  "blocked",
  "failed",
] as const;

export type SequenceStatus = (typeof SEQUENCE_STATUSES)[number];
export type SequenceAction = "request_approval" | "begin_test" | "approve" | "activate" | "pause" | "resume" | "complete" | "cancel" | "block" | "fail";

const TRANSITIONS: Record<SequenceStatus, Partial<Record<SequenceAction, SequenceStatus>>> = {
  draft: { request_approval: "approval_required", begin_test: "test", cancel: "cancelled", block: "blocked", fail: "failed" },
  approval_required: { approve: "scheduled", begin_test: "test", pause: "paused", cancel: "cancelled", block: "blocked", fail: "failed" },
  test: { activate: "active", pause: "paused", complete: "completed", cancel: "cancelled", block: "blocked", fail: "failed" },
  scheduled: { activate: "active", pause: "paused", complete: "completed", cancel: "cancelled", block: "blocked", fail: "failed" },
  active: { pause: "paused", complete: "completed", cancel: "cancelled", block: "blocked", fail: "failed" },
  paused: { resume: "approval_required", cancel: "cancelled", block: "blocked" },
  completed: {},
  cancelled: {},
  blocked: { resume: "approval_required", cancel: "cancelled" },
  failed: { resume: "approval_required", cancel: "cancelled" },
};

export function transitionSequence(current: SequenceStatus, action: SequenceAction) {
  const next = TRANSITIONS[current]?.[action];
  return next ? { ok: true as const, current, next } : { ok: false as const, current, error: "invalid_sequence_transition" as const };
}

export function sequenceMustStop(input: {
  replied?: boolean;
  contacted?: boolean;
  appointmentSet?: boolean;
  terminalStage?: boolean;
  invalidContact?: boolean;
  optedOut?: boolean;
  legalHold?: boolean;
  bicHold?: boolean;
  manuallyPaused?: boolean;
  duplicate?: boolean;
  isTest?: boolean;
  suppressed?: boolean;
  allowSuppressedQaTest?: boolean;
}) {
  const unsafeTestState = Boolean(
    (input.isTest || input.suppressed) &&
    !(input.allowSuppressedQaTest && input.isTest === true && input.suppressed === true),
  );
  const reasons: Array<[boolean | undefined, string]> = [
    [input.replied, "consumer_reply"],
    [input.contacted, "contact_recorded"],
    [input.appointmentSet, "appointment_set"],
    [input.terminalStage, "terminal_stage"],
    [input.invalidContact, "invalid_contact"],
    [input.optedOut, "opt_out"],
    [input.legalHold, "legal_hold"],
    [input.bicHold, "bic_hold"],
    [input.manuallyPaused, "manual_pause"],
    [input.duplicate, "duplicate_consolidation"],
    [unsafeTestState, "test_or_suppressed"],
  ];
  const match = reasons.find(([active]) => active);
  return match ? { stop: true as const, reason: match[1] } : { stop: false as const, reason: null };
}
