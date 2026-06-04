/**
 * SLA / speed-to-lead engine.
 *
 * Pure computation: deadline calculation + grade-driven thresholds +
 * breach detection. A scheduler (Vercel Cron / Inngest / custom worker)
 * calls `sweepDueLeads()` periodically and acts on the result. We keep
 * the engine deterministic so it's easy to test.
 */
import {
  SLA_CONTACT_TARGETS_SECONDS,
  type LeadGrade,
} from "@/lib/leads/lead-types";

const ACCEPT_TARGETS_SECONDS: Record<LeadGrade, number> = {
  "A+": 60,
  A: 90,
  B: 5 * 60,
  C: 60 * 60,
  D: 24 * 60 * 60,
};

export interface SlaDeadlines {
  acceptDueAt: Date;
  contactDueAt: Date;
}

export function computeDeadlines(
  createdAt: Date,
  grade: LeadGrade
): SlaDeadlines {
  const acceptSecs = ACCEPT_TARGETS_SECONDS[grade];
  const contactSecs = SLA_CONTACT_TARGETS_SECONDS[grade];
  return {
    acceptDueAt: new Date(createdAt.getTime() + acceptSecs * 1000),
    contactDueAt: new Date(createdAt.getTime() + contactSecs * 1000),
  };
}

export interface LeadSlaState {
  leadId: string;
  grade: LeadGrade;
  createdAt: Date;
  acceptedAt: Date | null;
  contactedAt: Date | null;
}

export interface SlaBreach {
  leadId: string;
  grade: LeadGrade;
  type: "accept_missed" | "contact_missed" | "both_missed";
  dueAt: Date;
}

/** Returns breaches for any leads whose deadline has passed without action. */
export function detectBreaches(
  states: ReadonlyArray<LeadSlaState>,
  now: Date = new Date()
): SlaBreach[] {
  const out: SlaBreach[] = [];
  for (const s of states) {
    const deadlines = computeDeadlines(s.createdAt, s.grade);
    const acceptMissed =
      !s.acceptedAt && now.getTime() > deadlines.acceptDueAt.getTime();
    const contactMissed =
      !s.contactedAt && now.getTime() > deadlines.contactDueAt.getTime();
    if (acceptMissed && contactMissed) {
      out.push({
        leadId: s.leadId,
        grade: s.grade,
        type: "both_missed",
        dueAt: deadlines.contactDueAt,
      });
    } else if (acceptMissed) {
      out.push({
        leadId: s.leadId,
        grade: s.grade,
        type: "accept_missed",
        dueAt: deadlines.acceptDueAt,
      });
    } else if (contactMissed) {
      out.push({
        leadId: s.leadId,
        grade: s.grade,
        type: "contact_missed",
        dueAt: deadlines.contactDueAt,
      });
    }
  }
  return out;
}

/** Rank breaches so the worst comes first (A+ > A > B …). */
export function rankBreaches(breaches: SlaBreach[]): SlaBreach[] {
  const order: Record<LeadGrade, number> = {
    "A+": 0,
    A: 1,
    B: 2,
    C: 3,
    D: 4,
  };
  return [...breaches].sort(
    (a, b) =>
      order[a.grade] - order[b.grade] || a.dueAt.getTime() - b.dueAt.getTime()
  );
}

export interface SlaSummary {
  total: number;
  withinTarget: number;
  breached: number;
  hitRate: number; // 0..1
}

export function summarizeSla(
  states: ReadonlyArray<LeadSlaState>,
  now: Date = new Date()
): SlaSummary {
  if (states.length === 0) return { total: 0, withinTarget: 0, breached: 0, hitRate: 1 };
  const breaches = detectBreaches(states, now);
  const breached = new Set(breaches.map((b) => b.leadId));
  const withinTarget = states.length - breached.size;
  return {
    total: states.length,
    withinTarget,
    breached: breached.size,
    hitRate: withinTarget / states.length,
  };
}
