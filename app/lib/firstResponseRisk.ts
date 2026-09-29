export const FIRST_RESPONSE_SLA_MINUTES = 15;
export const FIRST_RESPONSE_ACTIVE_WINDOW_DAYS = 7;

const TERMINAL_RESPONSE_STATES = new Set([
  "converted",
  "closed",
  "won",
  "lost",
  "dead",
  "disqualified",
  "spam",
  "test",
]);

export type FirstResponseRiskReason =
  | "risk"
  | "excluded"
  | "terminal"
  | "invalid_created_at"
  | "future_created_at"
  | "outside_active_window"
  | "within_sla"
  | "response_recorded";

export type FirstResponseRiskEvaluation = {
  isRisk: boolean;
  reason: FirstResponseRiskReason;
  dueAt: string | null;
  ageMinutes: number | null;
};

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function statusKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "new";
}

export function evaluateFirstResponseRisk(input: {
  createdAt: string | null;
  status: string;
  conversionStage?: string | null;
  firstHumanResponseAt?: string | null;
  isTest?: boolean;
  communicationSuppressed?: boolean;
}, now = new Date()): FirstResponseRiskEvaluation {
  if (input.isTest || input.communicationSuppressed) {
    return { isRisk: false, reason: "excluded", dueAt: null, ageMinutes: null };
  }

  const createdAt = timestamp(input.createdAt);
  if (createdAt === null) {
    return { isRisk: false, reason: "invalid_created_at", dueAt: null, ageMinutes: null };
  }

  const nowTime = now.getTime();
  const dueTime = createdAt + FIRST_RESPONSE_SLA_MINUTES * 60_000;
  const dueAt = new Date(dueTime).toISOString();
  const ageMinutes = Math.max(0, Math.floor((nowTime - createdAt) / 60_000));

  if (createdAt > nowTime) {
    return { isRisk: false, reason: "future_created_at", dueAt, ageMinutes };
  }

  if (TERMINAL_RESPONSE_STATES.has(statusKey(input.conversionStage || input.status))) {
    return { isRisk: false, reason: "terminal", dueAt, ageMinutes };
  }

  if (timestamp(input.firstHumanResponseAt) !== null) {
    return { isRisk: false, reason: "response_recorded", dueAt, ageMinutes };
  }

  const activeWindowStart = nowTime - FIRST_RESPONSE_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1_000;
  if (createdAt < activeWindowStart) {
    return { isRisk: false, reason: "outside_active_window", dueAt, ageMinutes };
  }

  if (nowTime < dueTime) {
    return { isRisk: false, reason: "within_sla", dueAt, ageMinutes };
  }

  return { isRisk: true, reason: "risk", dueAt, ageMinutes };
}
