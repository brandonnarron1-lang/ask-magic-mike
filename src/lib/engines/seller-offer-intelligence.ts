/**
 * SellerOfferIntelligence
 *
 * Deterministic scorer + route recommender for seller-cash-offer leads.
 * Sits alongside the generic lead score so cash-offer prospects get a
 * lane built around their workflow (timeline, condition, occupancy,
 * motivation, completeness of intake).
 *
 * Strict rules (carry forward to all generated copy / next-step prompts):
 *   - NO binding valuation claim.
 *   - NO promise of an offer.
 *   - NO instant/guaranteed/binding language.
 *   - NO protected-class signaling (handled by FairHousingScanner).
 *   - Outputs are decision-support for Mike, not a customer-facing offer.
 */
import type {
  PropertyCondition,
  OccupancyStatus,
  TimelineBucket,
} from "@/lib/leads/lead-types";
import { gradeForScore, type LeadGrade } from "@/lib/leads/lead-types";

export interface SellerSignals {
  timeline?: TimelineBucket | null;
  condition?: PropertyCondition | null;
  occupancy?: OccupancyStatus | null;
  hasAddress: boolean;
  hasMotivation: boolean;
  motivationText?: string | null;
  hasMortgagePayoff: boolean;
  hasAskingPrice: boolean;
  preferredOutcomes?: SellerOutcome[];
  /** Free-form note from intake — never used for protected-class inference. */
  notes?: string | null;
  /** Spam/quality signals from upstream (capture engine). */
  spamScore?: number;
}

export const SELLER_OUTCOMES = [
  "fastest_close",
  "highest_price",
  "avoid_repairs",
  "avoid_showings",
  "compare_cash_vs_listing",
  "settle_estate",
  "relocate",
  "unknown",
] as const;
export type SellerOutcome = (typeof SELLER_OUTCOMES)[number];

export type SellerRoute =
  | "cash_offer_consult"
  | "listing_consult"
  | "compare_both_consult"
  | "nurture";

export interface SellerOfferAssessment {
  score: number; // 0–100
  grade: LeadGrade;
  reasons: Array<{ code: string; points: number; label: string }>;
  route: SellerRoute;
  nextBestAction: string;
  missingData: string[];
  complianceNotes: string[];
  suggestedScript: string;
}

const MOTIVATION_KEYWORDS = [
  ["estate", "inherited", "probate"],
  ["divorce"],
  ["relocate", "moving", "relocation"],
  ["tenants", "landlord", "tired", "rental"],
  ["repairs", "fix", "condition"],
  ["foreclosure", "behind", "default"],
  ["downsize", "downsizing"],
];

/** Score the seller lead. Pure function — easy to test. */
export function scoreSellerOffer(s: SellerSignals): SellerOfferAssessment {
  const reasons: SellerOfferAssessment["reasons"] = [];
  let score = 0;

  // Timeline (max 30)
  switch (s.timeline) {
    case "asap":
    case "0_30_days":
      score += 30;
      reasons.push({ code: "timeline_hot", points: 30, label: "Selling within 30 days" });
      break;
    case "31_90_days":
      score += 22;
      reasons.push({ code: "timeline_warm", points: 22, label: "Selling within 31–90 days" });
      break;
    case "3_6_months":
      score += 12;
      reasons.push({ code: "timeline_soft", points: 12, label: "Selling within 3–6 months" });
      break;
    case "6_plus_months":
      score += 5;
      reasons.push({ code: "timeline_long", points: 5, label: "Selling 6+ months out" });
      break;
  }

  // Condition (max 15)
  switch (s.condition) {
    case "distressed":
      score += 15;
      reasons.push({ code: "condition_distressed", points: 15, label: "Distressed condition" });
      break;
    case "needs_repairs":
      score += 12;
      reasons.push({ code: "condition_needs_repairs", points: 12, label: "Needs repairs" });
      break;
    case "fair":
      score += 7;
      reasons.push({ code: "condition_fair", points: 7, label: "Fair condition" });
      break;
    case "good":
      score += 4;
      reasons.push({ code: "condition_good", points: 4, label: "Good condition" });
      break;
    case "excellent":
      score += 2;
      reasons.push({ code: "condition_excellent", points: 2, label: "Excellent condition" });
      break;
  }

  // Occupancy (max 10)
  switch (s.occupancy) {
    case "vacant":
      score += 10;
      reasons.push({ code: "occ_vacant", points: 10, label: "Vacant property" });
      break;
    case "inherited":
      score += 9;
      reasons.push({ code: "occ_inherited", points: 9, label: "Inherited property" });
      break;
    case "tenant_occupied":
      score += 7;
      reasons.push({ code: "occ_tenant", points: 7, label: "Tenant-occupied" });
      break;
    case "owner_occupied":
      score += 3;
      reasons.push({ code: "occ_owner", points: 3, label: "Owner-occupied" });
      break;
  }

  // Address completeness (max 10)
  if (s.hasAddress) {
    score += 10;
    reasons.push({ code: "has_address", points: 10, label: "Address captured" });
  }

  // Motivation (max 10) — keyword presence only; we never store inference.
  if (s.hasMotivation) {
    let motivationPoints = 4;
    const txt = (s.motivationText ?? "").toLowerCase();
    for (const group of MOTIVATION_KEYWORDS) {
      if (group.some((k) => txt.includes(k))) {
        motivationPoints = 10;
        break;
      }
    }
    score += motivationPoints;
    reasons.push({
      code: "motivation_present",
      points: motivationPoints,
      label: "Seller shared a reason",
    });
  }

  // Mortgage / asking-price disclosure (max 10 combined)
  if (s.hasMortgagePayoff) {
    score += 5;
    reasons.push({ code: "payoff_shared", points: 5, label: "Payoff context shared" });
  }
  if (s.hasAskingPrice) {
    score += 5;
    reasons.push({ code: "price_expectation_shared", points: 5, label: "Asking price shared" });
  }

  // Preferred outcomes (max 10)
  if (s.preferredOutcomes && s.preferredOutcomes.length > 0) {
    score += 6;
    reasons.push({
      code: "outcome_specified",
      points: 6,
      label: `Outcome preferences captured (${s.preferredOutcomes.length})`,
    });
    if (s.preferredOutcomes.includes("fastest_close")) {
      score += 4;
      reasons.push({ code: "wants_fastest_close", points: 4, label: "Wants fastest close" });
    }
  }

  // Penalties
  if (s.spamScore && s.spamScore >= 40) {
    score -= 25;
    reasons.push({ code: "spam_suspect", points: -25, label: "Spam signals present" });
  }

  score = Math.max(0, Math.min(100, score));
  const grade = gradeForScore(score);

  // Routing decision
  const route = pickRoute(s, score);
  const nextBestAction = pickNextAction(s, route, grade);
  const missingData = listMissingData(s);
  const complianceNotes = buildComplianceNotes();
  const suggestedScript = buildScript(s, route);

  return {
    score,
    grade,
    reasons,
    route,
    nextBestAction,
    missingData,
    complianceNotes,
    suggestedScript,
  };
}

function pickRoute(s: SellerSignals, score: number): SellerRoute {
  if (s.preferredOutcomes?.includes("compare_cash_vs_listing")) {
    return "compare_both_consult";
  }
  if (
    s.condition === "distressed" ||
    s.condition === "needs_repairs" ||
    s.occupancy === "vacant" ||
    s.occupancy === "inherited" ||
    s.preferredOutcomes?.includes("avoid_repairs") ||
    s.preferredOutcomes?.includes("avoid_showings") ||
    s.preferredOutcomes?.includes("fastest_close")
  ) {
    return "cash_offer_consult";
  }
  if (s.condition === "excellent" || s.condition === "good") {
    return "listing_consult";
  }
  if (score < 35) return "nurture";
  return "compare_both_consult";
}

function pickNextAction(
  s: SellerSignals,
  route: SellerRoute,
  grade: LeadGrade
): string {
  if (grade === "A+" || grade === "A") {
    switch (route) {
      case "cash_offer_consult":
        return "Call within 5 minutes — schedule a property review. This is a review, not a written offer. Subject to review.";
      case "listing_consult":
        return "Call within 5 minutes — book a listing consultation to walk through options.";
      case "compare_both_consult":
        return "Call within 5 minutes — offer to compare cash vs listing scenarios.";
      case "nurture":
        return "Confirm receipt and add to nurture sequence.";
    }
  }
  if (grade === "B") {
    return "Call same business day; if no answer, send compliant SMS + email and create a 24-hour follow-up task.";
  }
  return "Send transactional confirmation and add to nurture; revisit when timeline tightens.";
}

function listMissingData(s: SellerSignals): string[] {
  const out: string[] = [];
  if (!s.hasAddress) out.push("property_address");
  if (!s.timeline) out.push("timeline");
  if (!s.condition) out.push("condition");
  if (!s.occupancy) out.push("occupancy");
  if (!s.preferredOutcomes || s.preferredOutcomes.length === 0) {
    out.push("preferred_outcomes");
  }
  return out;
}

function buildComplianceNotes(): string[] {
  return [
    "Do not state a binding offer or guaranteed value.",
    "Phrase any number as a 'preliminary direct-purchase review, subject to inspection'.",
    "No agency relationship is created unless a written brokerage agreement is signed.",
    "Skip protected-class language; describe property + service area only.",
  ];
}

function buildScript(s: SellerSignals, route: SellerRoute): string {
  const opener =
    "Hi, this is Mike's team at Our Town Properties. Thanks for sharing your property details.";
  switch (route) {
    case "cash_offer_consult":
      return [
        opener,
        "Want to walk me through the property condition and your timeline so I can prep a direct-purchase review?",
        s.condition === "distressed" || s.condition === "needs_repairs"
          ? "If repairs are heavy, we'll factor that in. Subject to review — no commitment."
          : "We can compare direct-purchase and listing scenarios if you'd like.",
        "When can you give me 10 minutes for a quick walk-through call?",
      ].join(" ");
    case "listing_consult":
      return [
        opener,
        "Sounds like the home is in good shape. I'd like to walk you through what listing could look like — likely range, timeline, prep, and net.",
        "When works for a 15-minute call this week?",
      ].join(" ");
    case "compare_both_consult":
      return [
        opener,
        "We can compare a direct-purchase review against a listing scenario side by side so you can pick what fits your situation.",
        "When can we set up a quick call?",
      ].join(" ");
    case "nurture":
      return [
        opener,
        "When you're closer to making a move, we'll have updated comps and selling options ready. Want monthly updates by email?",
      ].join(" ");
  }
}
