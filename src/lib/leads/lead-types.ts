/**
 * Canonical lead taxonomy.
 *
 * The funnel today already ships a `primary_intent` enum (sell/buy/both/
 * unknown) plus a status pipeline tied to the intake flow. The canonical
 * platform extends that with a `lead_type` axis (what KIND of lead this is)
 * and an explicit status/event vocabulary that covers buyer, seller,
 * seller-cash-offer, investor, listing-inquiry, home-value, and the rest.
 *
 * The existing `primary_intent` column stays as-is so the scoring engine
 * keeps working. The new `lead_type` is a separate column on `leads`
 * (migration 00012) and is what the unified `POST /api/leads` endpoint
 * accepts.
 */

export const LEAD_TYPES = [
  "buyer",
  "seller",
  "seller_cash_offer",
  "investor",
  "listing_inquiry",
  "home_value",
  "relocation",
  "renter",
  "agent_referral",
  "general_question",
  "unknown",
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

/** Maps a canonical lead type → the legacy `primary_intent` enum used by
 *  the scoring engine. Lets `lead_type` ride alongside without breaking
 *  scoring. */
export function legacyIntentFor(
  leadType: LeadType
): "sell" | "buy" | "both" | "unknown" {
  switch (leadType) {
    case "seller":
    case "seller_cash_offer":
    case "investor":
    case "home_value":
      return "sell";
    case "buyer":
    case "listing_inquiry":
    case "relocation":
    case "renter":
      return "buy";
    case "agent_referral":
    case "general_question":
    case "unknown":
      return "unknown";
  }
}

/** General-purpose lead status pipeline. */
export const LEAD_STATUSES = [
  // converting
  "new",
  "qualified",
  "contacted",
  "appointment_requested",
  "appointment_set",
  "appointment_completed",
  "active_client",
  "under_contract",
  "closed_won",
  // nurture / non-converting
  "unqualified",
  "nurture",
  "closed_lost",
  "spam",
  // seller-cash-offer specific (extras)
  "new_seller_lead",
  "valuation_started",
  "offer_ready",
  "offer_sent",
  "offer_accepted",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Lead grade derived from numeric score (0–100). */
export const LEAD_GRADES = ["A+", "A", "B", "C", "D"] as const;
export type LeadGrade = (typeof LEAD_GRADES)[number];

export function gradeForScore(score: number): LeadGrade {
  if (score >= 90) return "A+";
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

/** Speed-to-lead SLA targets, in seconds, keyed by grade. */
export const SLA_CONTACT_TARGETS_SECONDS: Record<LeadGrade, number> = {
  "A+": 2 * 60,
  A: 5 * 60,
  B: 30 * 60,
  C: 24 * 60 * 60,
  D: 7 * 24 * 60 * 60,
};

/** Whether to fire an immediate auto-confirmation send. */
export function shouldAutoSendConfirmation(grade: LeadGrade): boolean {
  return grade === "A+" || grade === "A" || grade === "B";
}

/** Lead-event taxonomy. Stored as `analytics_events.event_name` so the
 *  existing event ledger keeps working; we extend the enum with these. */
export const LEAD_EVENT_NAMES = [
  "lead_created",
  "lead_updated",
  "duplicate_detected",
  "score_calculated",
  "status_changed",
  "assigned",
  "reassigned",
  "agent_notified",
  "note_added",
  "sms_sent",
  "sms_received",
  "sms_delivered",
  "sms_failed",
  "email_sent",
  "email_received",
  "email_opened",
  "email_clicked",
  "appointment_requested",
  "appointment_set",
  "appointment_completed",
  "listing_viewed",
  "listing_matched",
  "marketing_asset_generated",
  "flex_import_completed",
  "consent_granted",
  "opt_out",
  "opt_in",
  "sla_started",
  "sla_missed",
  "escalated",
  "closed_won",
  "closed_lost",
  "spam_flagged",
  "rate_limited",
] as const;
export type LeadEventName = (typeof LEAD_EVENT_NAMES)[number];

/** Lead source canonical labels. Free-form `source_detail` is allowed. */
export const LEAD_SOURCES = [
  "ask_magic_mike_landing",
  "we_buy_houses_landing",
  "widget",
  "embed_widget",
  "listing_page",
  "admin_manual",
  "csv_import",
  "webhook",
  "wordpress_cta",
  "ad_form",
  "referral",
  "phone_call",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Bucketed timelines used by qualification + scoring. */
export const TIMELINE_BUCKETS = [
  "asap",
  "0_30_days",
  "31_90_days",
  "3_6_months",
  "6_plus_months",
  "unknown",
] as const;
export type TimelineBucket = (typeof TIMELINE_BUCKETS)[number];

/** Convert a months-from-now number into a bucket. */
export function timelineBucketFromMonths(
  months: number | null | undefined
): TimelineBucket {
  if (months === null || months === undefined) return "unknown";
  if (months <= 0) return "asap";
  if (months <= 1) return "0_30_days";
  if (months <= 3) return "31_90_days";
  if (months <= 6) return "3_6_months";
  return "6_plus_months";
}

/** Property condition buckets. */
export const PROPERTY_CONDITIONS = [
  "excellent",
  "good",
  "fair",
  "needs_repairs",
  "distressed",
  "unknown",
] as const;
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number];

/** Occupancy buckets. */
export const OCCUPANCY_STATUSES = [
  "owner_occupied",
  "tenant_occupied",
  "vacant",
  "inherited",
  "unknown",
] as const;
export type OccupancyStatus = (typeof OCCUPANCY_STATUSES)[number];
