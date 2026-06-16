/**
 * Ready–Willing–Able (RWA) lead qualification scorer.
 *
 * Returns three independent 0-100 dimensions for broker review:
 *   ready   — timeline pressure and motivation signals
 *   willing — engagement intent and contact consent
 *   able    — contact quality and data completeness
 *
 * Seller and buyer criteria intentionally differ. No fair-housing-sensitive
 * factors (race, religion, national origin, familial status, disability,
 * sex, or neighborhood safety) are used at any point.
 *
 * `brokerReviewRequired` is always true — this score is an input to broker
 * judgment, never a substitute for it.
 */

export interface RwaLead {
  leadType?: string | null;
  primaryIntent?: string | null;     // "sell"|"buy"|"both"|"unknown"
  timeline?: string | null;          // TimelineBucket string
  timelineMonths?: number | null;    // numeric legacy field
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
  intentText?: string | null;        // combined intent + notes free text
  sellerMotivation?: string | null;
  appointmentRequested?: boolean;
  consentSms?: boolean;
  consentEmail?: boolean;
  temperature?: string | null;       // "HOT"|"WARM"|"NURTURE"|"LOW_REVIEW" proxy
  spamScore?: number | null;
  complianceFlags?: string[];
}

export interface RwaScore {
  ready: number;
  willing: number;
  able: number;
  overall: number;
  tier: "cold" | "warm" | "hot" | "urgent";
  evidence: string[];
  missing: string[];
  brokerReviewRequired: true;
}

const MOTIVATION_RE =
  /\b(inherited|estate|probate|divorce|separation|relocation|relocating|downsize?|downsizing|financial pressure|foreclosure|job\s*change|job\s*loss|transfer)\b/i;
const MOTIVATION_LABELS: Array<[RegExp, string]> = [
  [/\b(inherited|estate|probate)\b/i, "inherited/estate"],
  [/\b(relocation|relocating|transfer)\b/i, "relocation"],
  [/\b(divorce|separation)\b/i, "divorce/separation"],
  [/\b(downsize?|downsizing)\b/i, "downsizing"],
  [/\b(financial pressure|foreclosure|job\s*change|job\s*loss)\b/i, "financial pressure"],
];
const PREAPPROVAL_RE = /\b(pre.?approv\w*|approval letter|financing|mortgage|pre-qual)\b/i;
const SEARCH_CRITERIA_RE = /\b(beds?|bedrooms?|bath|bathrooms?|budget|\$|price range|sq\.?\s*ft|square feet|sqft|garage|yard|pool)\b/i;

function timelineReadiness(lead: RwaLead): { score: number; evidence: string | null } {
  const t = lead.timeline;
  if (t === "asap")          return { score: 50, evidence: "Timeline: ASAP" };
  if (t === "0_30_days")     return { score: 35, evidence: "Timeline: 0-30 days" };
  if (t === "31_90_days")    return { score: 20, evidence: "Timeline: 1-3 months" };
  if (t === "3_6_months")    return { score: 10, evidence: "Timeline: 3-6 months" };
  if (t === "6_plus_months") return { score:  5, evidence: "Timeline: 6+ months" };

  const m = lead.timelineMonths;
  if (m !== null && m !== undefined) {
    if (m <= 0)  return { score: 50, evidence: "Timeline: ASAP (legacy)" };
    if (m <= 1)  return { score: 35, evidence: "Timeline: ~1 month (legacy)" };
    if (m <= 3)  return { score: 20, evidence: "Timeline: 1-3 months (legacy)" };
    if (m <= 6)  return { score: 10, evidence: "Timeline: 3-6 months (legacy)" };
    return { score: 5, evidence: "Timeline: 6+ months (legacy)" };
  }

  // Proxy from temperature when timeline is absent
  const temp = lead.temperature?.toUpperCase();
  if (temp === "HOT")        return { score: 45, evidence: null };
  if (temp === "WARM")       return { score: 25, evidence: null };
  if (temp === "NURTURE")    return { score: 10, evidence: null };
  return { score: 0, evidence: null };
}

function sellerReady(lead: RwaLead, evidence: string[], missing: string[]): number {
  const tl = timelineReadiness(lead);
  let score = tl.score;
  if (tl.evidence) evidence.push(tl.evidence);
  else missing.push("No timeline provided — key for seller prioritization");

  const text = [lead.intentText, lead.sellerMotivation].filter(Boolean).join(" ");
  if (MOTIVATION_RE.test(text)) {
    score += 20;
    const matched = MOTIVATION_LABELS.find(([re]) => re.test(text));
    if (matched) evidence.push(`Seller motivation: ${matched[1]}`);
  }
  if (lead.appointmentRequested) {
    score += 10;
    evidence.push("Appointment requested");
  }
  return Math.min(100, Math.max(0, score));
}

function buyerReady(lead: RwaLead, evidence: string[], missing: string[]): number {
  const tl = timelineReadiness(lead);
  let score = tl.score;
  if (tl.evidence) evidence.push(tl.evidence);
  else missing.push("No timeline provided — key for buyer prioritization");

  const text = lead.intentText ?? "";
  if (PREAPPROVAL_RE.test(text)) {
    score += 15;
    evidence.push("Financing / pre-approval mentioned");
  }
  if (lead.appointmentRequested) {
    score += 15;
    evidence.push("Appointment requested");
  }
  return Math.min(100, Math.max(0, score));
}

function scoreWilling(lead: RwaLead, evidence: string[], missing: string[]): number {
  let score = 0;
  const flags = lead.complianceFlags ?? [];

  if (lead.hasAddress) {
    score += 30;
    evidence.push("Property address provided");
  } else {
    missing.push("No property address — required for qualification");
  }

  const intentLen = (lead.intentText ?? "").trim().length;
  if (intentLen > 20) {
    score += 20;
    evidence.push("Detailed intent notes");
  } else if (intentLen === 0) {
    missing.push("No intent notes — ask for context");
  }

  if (lead.appointmentRequested) score += 20;

  if (lead.consentSms) score += 10;
  if (lead.consentEmail) score += 10;

  if (flags.length > 0) {
    score -= 30;
    missing.push("Compliance review required — engagement blocked until resolved");
  }

  return Math.min(100, Math.max(0, score));
}

function scoreBuyerWilling(lead: RwaLead, evidence: string[], missing: string[]): number {
  let score = 0;
  const flags = lead.complianceFlags ?? [];
  const text = lead.intentText ?? "";

  if (SEARCH_CRITERIA_RE.test(text)) {
    score += 25;
    evidence.push("Specific search criteria mentioned");
  } else {
    missing.push("No search criteria — ask for beds/budget/area preferences");
  }

  const intentLen = text.trim().length;
  if (intentLen > 20) score += 15;

  if (lead.appointmentRequested) score += 20;
  if (lead.consentSms) score += 10;
  if (lead.consentEmail) score += 10;

  if (flags.length > 0) {
    score -= 30;
    missing.push("Compliance review required — engagement blocked until resolved");
  }

  return Math.min(100, Math.max(0, score));
}

function scoreAble(lead: RwaLead, evidence: string[], missing: string[]): number {
  let score = 0;
  const flags = lead.complianceFlags ?? [];
  const spam = lead.spamScore ?? 0;

  if (lead.hasPhone) {
    score += 40;
    evidence.push("Phone on file");
  } else {
    missing.push("No phone number — reduces contact options");
  }

  if (lead.hasEmail) {
    score += 25;
    evidence.push("Email on file");
  } else {
    missing.push("No email address — reduces contact options");
  }

  if (lead.hasAddress) score += 25;

  if (spam >= 50) {
    score -= 50;
    missing.push("High spam score — validate contact before outreach");
  }

  if (flags.length > 0) score -= 20;

  return Math.min(100, Math.max(0, score));
}

function tierFor(overall: number): RwaScore["tier"] {
  if (overall >= 80) return "urgent";
  if (overall >= 60) return "hot";
  if (overall >= 40) return "warm";
  return "cold";
}

function isSeller(lead: RwaLead): boolean {
  const lt = lead.leadType ?? "";
  const pi = lead.primaryIntent ?? "";
  return (
    ["seller", "seller_cash_offer", "home_value", "investor"].includes(lt) ||
    pi === "sell" ||
    pi === "both"
  );
}

export function computeReadyWillingAble(lead: RwaLead): RwaScore {
  const evidence: string[] = [];
  const missing: string[] = [];

  const seller = isSeller(lead);
  const ready   = seller ? sellerReady(lead, evidence, missing)     : buyerReady(lead, evidence, missing);
  const willing = seller ? scoreWilling(lead, evidence, missing)     : scoreBuyerWilling(lead, evidence, missing);
  const able    = scoreAble(lead, evidence, missing);

  const overall = Math.round((ready + willing + able) / 3);

  return {
    ready,
    willing,
    able,
    overall,
    tier: tierFor(overall),
    evidence: [...new Set(evidence)],
    missing: [...new Set(missing)],
    brokerReviewRequired: true,
  };
}
