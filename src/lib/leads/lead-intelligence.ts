/**
 * Lead Intelligence Engine — per-lead AI Sales Brain.
 *
 * Pure deterministic scoring. No API calls. No writes.
 * Same inputs always produce the same output.
 *
 * Computes buying/selling intent, urgency, motivation, conversion likelihood,
 * commission estimates, and recommended agent actions from existing lead fields.
 */

import type { LeadType } from "./lead-types";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface LeadIntelligenceInput {
  leadType?: LeadType | string | null;
  primaryIntent?: "sell" | "buy" | "both" | "unknown" | null;
  score?: number | null;
  temperature?: string | null;
  grade?: string | null;
  status?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrerType?: string | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
  consentSms?: boolean;
  consentEmail?: boolean;
  consentCall?: boolean;
  questionRaw?: string | null;
  addressRaw?: string | null;
  createdAt?: string | null;
  lastContactedAt?: string | null;
  assignedAgentId?: string | null;
  /** Estimated home value if known (from address lookup, self-reported, etc.). */
  estimatedHomeValue?: number | null;
}

export type MotivationStrength = "strong" | "moderate" | "weak" | "unknown";
export type CommPref = "call" | "text" | "email" | "unknown";
export type IntentLabel = "high" | "moderate" | "low" | "none";

export interface CommissionRange {
  low: number;
  high: number;
  label: string;
}

export interface LeadIntelligenceResult {
  // Intent scores (0–100)
  buyingIntent: number;
  buyingIntentLabel: IntentLabel;
  sellingIntent: number;
  sellingIntentLabel: IntentLabel;
  // Behavioral signals
  urgencyScore: number;
  motivationStrength: MotivationStrength;
  confidenceScore: number;
  // Conversion probability
  likelyToRespond: number;
  likelyToConvert: number;
  closingProbability: number;
  // Contact preference
  commPref: CommPref;
  // Commission estimate
  commissionRange: CommissionRange;
  // Recommended actions
  recommendedFollowUpHours: number;
  recommendedFollowUpLabel: string;
  nextAction: string;
  suggestedScript: string;
  objectionHandling: string;
  appointmentCTA: string;
}

// ---------------------------------------------------------------------------
// Wilson NC market constants
// ---------------------------------------------------------------------------

const WILSON_AVG_HOME_PRICE = 215_000;
const WILSON_LOW_HOME_PRICE  = 140_000;
const WILSON_HIGH_HOME_PRICE = 380_000;
const COMMISSION_RATE        = 0.03;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function intentLabel(score: number): IntentLabel {
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  if (score >= 15) return "low";
  return "none";
}

function scoreToMotivation(score: number): MotivationStrength {
  if (score >= 75) return "strong";
  if (score >= 45) return "moderate";
  if (score >= 20) return "weak";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Buying intent (0–100)
// ---------------------------------------------------------------------------

function computeBuyingIntent(input: LeadIntelligenceInput): number {
  const type = input.leadType ?? input.primaryIntent ?? "";
  let score = 0;

  if (type === "buyer" || type === "listing_inquiry" || type === "relocation" || type === "renter" || type === "buy") {
    score += 60;
  } else if (type === "general_question") {
    score += 15;
  } else if (type === "seller" || type === "seller_cash_offer" || type === "sell") {
    score += 0;
  }

  // Question content signals
  const q = (input.questionRaw ?? "").toLowerCase();
  if (q.includes("buy") || q.includes("purchase") || q.includes("afford") || q.includes("listing") || q.includes("looking for")) {
    score += 20;
  }
  if (q.includes("move") || q.includes("reloc") || q.includes("neighborhood")) {
    score += 10;
  }

  // UTM signals
  const campaign = (input.utmCampaign ?? "").toLowerCase();
  if (campaign.includes("buyer") || campaign.includes("buy") || campaign.includes("home_search")) {
    score += 10;
  }

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Selling intent (0–100)
// ---------------------------------------------------------------------------

function computeSellingIntent(input: LeadIntelligenceInput): number {
  const type = input.leadType ?? input.primaryIntent ?? "";
  let score = 0;

  if (type === "seller_cash_offer") {
    score += 80;
  } else if (type === "seller" || type === "home_value" || type === "sell") {
    score += 65;
  } else if (type === "investor") {
    score += 50;
  } else if (type === "general_question") {
    score += 15;
  }

  const q = (input.questionRaw ?? "").toLowerCase();
  if (q.includes("sell") || q.includes("worth") || q.includes("value") || q.includes("cash offer") || q.includes("list my")) {
    score += 20;
  }
  if (q.includes("move out") || q.includes("relocating") || q.includes("downsize") || q.includes("estate") || q.includes("divorce")) {
    score += 10;
  }

  const campaign = (input.utmCampaign ?? "").toLowerCase();
  if (campaign.includes("seller") || campaign.includes("sell") || campaign.includes("home_value") || campaign.includes("cash")) {
    score += 10;
  }

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Urgency (0–100)
// ---------------------------------------------------------------------------

function computeUrgency(input: LeadIntelligenceInput): number {
  const temp = input.temperature ?? "";
  let score = 0;

  switch (temp) {
    case "urgent": score += 90; break;
    case "hot":    score += 70; break;
    case "warm":   score += 45; break;
    case "nurture":score += 20; break;
    case "low":    score += 10; break;
    default:       score += 25; break;
  }

  const q = (input.questionRaw ?? "").toLowerCase();
  if (q.includes("asap") || q.includes("immediately") || q.includes("today") || q.includes("this week") || q.includes("urgent")) {
    score = Math.min(100, score + 15);
  }

  const type = input.leadType ?? "";
  if (type === "seller_cash_offer") score = Math.min(100, score + 10);

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Likelihood to respond (0–100)
// ---------------------------------------------------------------------------

function computeLikelyToRespond(input: LeadIntelligenceInput): number {
  let score = 30; // baseline

  if (input.hasPhone) score += 25;
  if (input.hasEmail) score += 15;
  if (input.consentSms)  score += 15;
  if (input.consentEmail) score += 10;
  if (input.consentCall) score += 10;

  // Fresh leads respond more
  const ageHours = input.createdAt
    ? (Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60)
    : null;
  if (ageHours !== null) {
    if (ageHours < 1)   score = Math.min(100, score + 20);
    else if (ageHours < 4)  score = Math.min(100, score + 10);
    else if (ageHours > 72) score = Math.max(0, score - 10);
    else if (ageHours > 168) score = Math.max(0, score - 20);
  }

  // Never contacted is actually positive — not exhausted
  if (!input.lastContactedAt) score = Math.min(100, score + 5);

  const source = input.referrerType ?? "";
  if (source === "paid") score = Math.min(100, score + 5);
  if (source === "organic") score = Math.min(100, score + 3);

  return clamp(score);
}

// ---------------------------------------------------------------------------
// Likelihood to convert (0–100)
// ---------------------------------------------------------------------------

function computeLikelyToConvert(input: LeadIntelligenceInput): number {
  const grade = input.grade ?? "C";
  const scoreVal = input.score ?? 50;

  let base = 0;
  switch (grade) {
    case "A+": base = 75; break;
    case "A":  base = 60; break;
    case "B":  base = 42; break;
    case "C":  base = 25; break;
    case "D":  base = 10; break;
    default:   base = 20; break;
  }

  // Adjust for composite score
  const scoreAdj = ((scoreVal - 50) / 50) * 15;
  let total = base + scoreAdj;

  if (input.hasAddress) total += 5;
  if (input.hasPhone && input.hasEmail) total += 5;
  if (input.consentSms || input.consentCall) total += 5;

  const type = input.leadType ?? "";
  if (type === "seller_cash_offer") total += 8;
  if (type === "buyer") total += 5;

  return clamp(Math.round(total));
}

// ---------------------------------------------------------------------------
// Closing probability (0–100)
// ---------------------------------------------------------------------------

function computeClosingProbability(
  likelyToConvert: number,
  sellingIntent: number,
  buyingIntent: number,
  urgency: number
): number {
  const intentBoost = Math.max(sellingIntent, buyingIntent) * 0.15;
  const urgencyBoost = urgency * 0.1;
  const base = likelyToConvert * 0.75;
  return clamp(Math.round(base + intentBoost + urgencyBoost));
}

// ---------------------------------------------------------------------------
// Communication preference
// ---------------------------------------------------------------------------

function computeCommPref(input: LeadIntelligenceInput): CommPref {
  if (input.consentCall && input.hasPhone) return "call";
  if (input.consentSms && input.hasPhone)  return "text";
  if (input.consentEmail && input.hasEmail) return "email";
  if (input.hasPhone) return "call";
  if (input.hasEmail) return "email";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Commission range
// ---------------------------------------------------------------------------

function computeCommissionRange(input: LeadIntelligenceInput): CommissionRange {
  const base = input.estimatedHomeValue ?? WILSON_AVG_HOME_PRICE;
  const low  = Math.round(WILSON_LOW_HOME_PRICE  * COMMISSION_RATE);
  const high = Math.round(WILSON_HIGH_HOME_PRICE * COMMISSION_RATE);
  const mid  = Math.round(base * COMMISSION_RATE);

  const formatK = (n: number) => `$${Math.round(n / 1000)}K`;

  if (input.estimatedHomeValue) {
    const est = Math.round(input.estimatedHomeValue * COMMISSION_RATE);
    return { low: est, high: est, label: `~${formatK(est)}` };
  }

  const type = input.leadType ?? "";
  if (type === "seller_cash_offer" || type === "seller" || type === "home_value") {
    return { low: low, high: high, label: `${formatK(low)}–${formatK(high)}` };
  }

  return { low: Math.round(mid * 0.8), high: Math.round(mid * 1.2), label: `~${formatK(mid)}` };
}

// ---------------------------------------------------------------------------
// Recommended follow-up interval
// ---------------------------------------------------------------------------

function computeFollowUpHours(input: LeadIntelligenceInput): number {
  const temp = input.temperature ?? "";
  const grade = input.grade ?? "C";

  // Temperature takes priority over grade
  if (temp === "urgent")  return 0.25;
  if (temp === "hot")     return 1;
  if (temp === "nurture") return 24 * 7;
  if (temp === "warm")    return 4;
  if (temp === "low")     return 24;
  // No temperature set — fall back to grade
  if (grade === "A+") return 0.25;
  if (grade === "A")  return 1;
  if (grade === "B")  return 4;
  return 24;
}

function followUpHoursLabel(hours: number): string {
  if (hours < 1)  return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  if (hours < 168) return `${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"}`;
  return `${Math.round(hours / 168)} week${Math.round(hours / 168) === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Recommended scripts / CTAs
// ---------------------------------------------------------------------------

function computeScript(input: LeadIntelligenceInput, urgency: number): string {
  const name = "(name)";
  const type = input.leadType ?? "";
  const temp = input.temperature ?? "low";

  if (type === "seller_cash_offer") {
    if (urgency >= 70) return `"Hi ${name}, I saw your request for a cash offer on your Wilson NC home — I can get you a number today. When's a good time to chat?"`;
    return `"Hi ${name}, I'm Mike Eatmon with Our Town Properties. You asked about a cash offer — I'd love to give you a real local estimate. Do you have 10 minutes this week?"`;
  }
  if (type === "seller" || type === "home_value") {
    if (temp === "urgent" || temp === "hot") return `"Hi ${name}, Mike Eatmon here. You asked about your home's value — Wilson NC is moving fast. I can run a quick CMA and call you back. Does today work?"`;
    return `"Hi ${name}, Mike with Our Town Properties. You reached out about your home's value — happy to give you a real local take. What's the best time to connect?"`;
  }
  if (type === "buyer" || type === "listing_inquiry") {
    return `"Hi ${name}, Mike Eatmon with Our Town Properties. You were looking at homes in Wilson NC — I'd love to hear what you're searching for and share a few properties. Got a few minutes?"`;
  }
  if (type === "investor") {
    return `"Hi ${name}, Mike Eatmon here — saw you're looking at investment properties in Wilson. Great timing. I have some off-market deals. When can we talk?"`;
  }
  return `"Hi ${name}, this is Mike Eatmon with Our Town Properties in Wilson NC. I saw your inquiry and wanted to reach out personally. What's your main real estate goal right now?"`;
}

function computeObjectionHandling(input: LeadIntelligenceInput): string {
  const type = input.leadType ?? "";

  if (type === "seller_cash_offer" || type === "seller" || type === "home_value") {
    return `If they say "just browsing": "Totally fine — I can send you a no-obligation estimate. Takes 2 minutes on my end." If they say "not ready yet": "That's perfect — the best time to know your number is before you're ready, so you can plan."`;
  }
  if (type === "buyer" || type === "listing_inquiry") {
    return `If they say "just looking": "Great — looking early is smart. I'll send you a few properties that match what you described." If they say "need to sell first": "I can help with both — let's talk about your home's value first."`;
  }
  return `If they say "not interested": "No problem — is it timing, or is there a concern I can help with?" Keep it open, non-pushy.`;
}

function computeAppointmentCTA(input: LeadIntelligenceInput, urgency: number): string {
  const type = input.leadType ?? "";

  if (type === "seller_cash_offer") {
    return urgency >= 70
      ? "Book a 15-min call today to discuss your cash offer number."
      : "Schedule a free 20-min home value consultation this week.";
  }
  if (type === "buyer" || type === "listing_inquiry") {
    return "Book a 30-min buyer consultation — I'll show you what's available in your price range.";
  }
  if (type === "seller" || type === "home_value") {
    return "Schedule a free CMA — I'll show you what similar Wilson homes sold for in the last 90 days.";
  }
  return "Schedule a quick 15-min call to discuss your real estate goals.";
}

function computeNextAction(input: LeadIntelligenceInput, urgency: number): string {
  const temp = input.temperature ?? "";
  const hasPhone = input.hasPhone ?? false;
  const hasSms = input.consentSms ?? false;
  const hasEmail = input.hasEmail ?? false;
  const status = input.status ?? "";

  if (status === "closed_won" || status === "closed_lost") return "No action needed — lead closed.";
  if (!hasPhone && !hasEmail) return "Cannot contact — missing phone and email. Flag for re-engagement.";

  if (urgency >= 80 || temp === "urgent") {
    if (hasPhone) return "Call immediately. This lead is urgent — same-day response expected.";
    return "Send email immediately with direct contact info.";
  }
  if (temp === "hot" || urgency >= 60) {
    if (hasPhone && hasSms) return "Text now, follow with a call within the hour.";
    if (hasPhone) return "Call within 1 hour.";
    return "Send email now with appointment booking link.";
  }
  if (temp === "warm") {
    if (hasPhone) return "Call or text within 4 hours. Offer a consultation this week.";
    return "Send personalized email today with your direct contact info.";
  }
  if (temp === "nurture") {
    return "Add to nurture sequence. Send market update email this week.";
  }
  if (!input.lastContactedAt) {
    if (hasPhone) return "First outreach — call or text today.";
    return "Send welcome email today.";
  }
  return "Monitor for re-engagement. No immediate action required.";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildLeadIntelligence(input: LeadIntelligenceInput): LeadIntelligenceResult {
  const buyingIntent  = computeBuyingIntent(input);
  const sellingIntent = computeSellingIntent(input);
  const urgencyScore  = computeUrgency(input);
  const motivationStrength = scoreToMotivation(Math.max(buyingIntent, sellingIntent));
  const confidenceScore = clamp(
    Math.round(
      (input.hasPhone ? 20 : 0) +
      (input.hasEmail ? 15 : 0) +
      (input.hasAddress ? 20 : 0) +
      (input.score != null ? 25 : 0) +
      ((input.utmSource || input.referrerType) ? 20 : 0)
    )
  );
  const likelyToRespond = computeLikelyToRespond(input);
  const likelyToConvert = computeLikelyToConvert(input);
  const closingProbability = computeClosingProbability(likelyToConvert, sellingIntent, buyingIntent, urgencyScore);
  const commPref = computeCommPref(input);
  const commissionRange = computeCommissionRange(input);
  const recommendedFollowUpHours = computeFollowUpHours(input);

  return {
    buyingIntent,
    buyingIntentLabel:  intentLabel(buyingIntent),
    sellingIntent,
    sellingIntentLabel: intentLabel(sellingIntent),
    urgencyScore,
    motivationStrength,
    confidenceScore,
    likelyToRespond,
    likelyToConvert,
    closingProbability,
    commPref,
    commissionRange,
    recommendedFollowUpHours,
    recommendedFollowUpLabel: followUpHoursLabel(recommendedFollowUpHours),
    nextAction:          computeNextAction(input, urgencyScore),
    suggestedScript:     computeScript(input, urgencyScore),
    objectionHandling:   computeObjectionHandling(input),
    appointmentCTA:      computeAppointmentCTA(input, urgencyScore),
  };
}
