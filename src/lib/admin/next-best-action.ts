/**
 * Next Best Action — read-only, pure function.
 *
 * Derives a conversation summary and suggested follow-up angle from
 * existing stored lead fields. No DB queries. No writes. No outbound messaging.
 */

export interface NextBestActionInput {
  leadType?: string | null;
  status?: string | null;
  temperature?: string | null;
  score?: number | null;
  source?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  firstName?: string | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
  email?: string | null;
  phone?: string | null;
  addressRaw?: string | null;
  consentSms?: boolean;
  consentEmail?: boolean;
  isSynthetic?: boolean;
}

export interface NextBestActionResult {
  sourcePath: string;
  scoreLabel: string;
  temperatureLabel: string;
  intentSummary: string;
  missingInfo: string[];
  followUpAngle: string;
  isSynthetic: boolean;
  doNotContact: boolean;
}

import { isSyntheticEmail } from "@/lib/leads/synthetic-detection";

// Alias kept for backward compatibility with existing tests.
export function isSyntheticLead(email?: string | null): boolean {
  return isSyntheticEmail(email);
}

function deriveSourcePath(input: NextBestActionInput): string {
  const medium = input.utmMedium ?? "";
  const campaign = input.utmCampaign ?? "";
  const source = input.source ?? "";

  if (medium === "website_widget" || campaign.includes("wordpress_widget")) {
    return "OTP WordPress embed (website_widget)";
  }
  if (medium === "homepage_cta") return "OTP homepage CTA";
  if (medium === "agent_profile_cta") return "Mike Eatmon profile CTA";
  if (medium === "direct_purchase") return "Direct-purchase review path";
  if (source === "we_buy_houses_landing") return "We Buy Houses landing page";
  if (source === "direct" || medium === "" || medium === "direct") return "Direct / unknown source";
  if (medium) return `${medium}${campaign ? ` / ${campaign}` : ""}`;
  return source || "Unknown";
}

function deriveScoreLabel(score?: number | null): string {
  if (score == null) return "Not scored";
  if (score >= 90) return `${score} — very high`;
  if (score >= 75) return `${score} — high`;
  if (score >= 50) return `${score} — moderate`;
  if (score >= 25) return `${score} — low`;
  return `${score} — very low`;
}

function deriveTemperatureLabel(temperature?: string | null): string {
  switch (temperature) {
    case "urgent":  return "Urgent — act same day";
    case "hot":     return "Hot — act within 24 h";
    case "warm":    return "Warm — follow up this week";
    case "nurture": return "Nurture — follow up next month";
    case "low":     return "Low — add to long-term list";
    default:        return "Not assessed";
  }
}

function deriveIntentSummary(input: NextBestActionInput): string {
  const type = input.leadType ?? "";
  if (type === "seller_cash_offer" || type === "seller")   return "Selling intent — homeowner exploring selling options";
  if (type === "buyer")                                     return "Buying intent — actively exploring purchase";
  if (type === "general_question")                          return "General inquiry — no explicit buying/selling intent detected";
  if (type === "direct_purchase")                           return "Direct-purchase inquiry — off-market or cash-offer path";
  return "Intent unclear — review intake question for context";
}

function deriveMissingInfo(input: NextBestActionInput): string[] {
  const missing: string[] = [];
  if (!input.hasEmail && !input.email)   missing.push("Email address");
  if (!input.hasPhone && !input.phone)   missing.push("Phone number");
  if (!input.hasAddress && !input.addressRaw) missing.push("Property address");
  if (!input.consentEmail && !input.consentSms) missing.push("Contact consent (email or SMS)");
  return missing;
}

function deriveFollowUpAngle(input: NextBestActionInput, missing: string[]): string {
  if (input.isSynthetic || isSyntheticLead(input.email)) {
    return "DO NOT CONTACT — synthetic/test lead. No follow-up action.";
  }

  const temp = input.temperature ?? "low";
  const type = input.leadType ?? "";

  if (missing.includes("Contact consent (email or SMS)")) {
    return "Consent gap — do not initiate outbound until consent is collected.";
  }

  if (temp === "urgent" || temp === "hot") {
    if (type === "seller_cash_offer" || type === "seller") {
      return "Call or text seller directly. Lead is hot — ask about timeline, motivation, and whether they've had other offers.";
    }
    if (type === "buyer") {
      return "Reach out today. Ask about must-haves, timeline, and pre-approval status.";
    }
    return "Hot lead — make contact today. Ask open question about their primary goal.";
  }

  if (temp === "warm") {
    if (type === "seller_cash_offer" || type === "seller") {
      return "Follow up within the week. Ask: \"Have you thought more about your timeline?\"";
    }
    if (type === "buyer") {
      return "Follow up this week. Ask what neighborhoods or price ranges they're focused on.";
    }
    return "Warm lead — reach out this week with a low-pressure check-in.";
  }

  if (temp === "nurture") {
    return "Nurture lead — re-engage in 30 days with a market update or value check-in.";
  }

  if (missing.length > 0) {
    return `Low-urgency lead — consider collecting missing info (${missing.join(", ")}) before following up.`;
  }

  return "Low urgency — no immediate follow-up needed. Monitor for re-engagement.";
}

export function buildNextBestAction(input: NextBestActionInput): NextBestActionResult {
  const synthetic = input.isSynthetic || isSyntheticLead(input.email ?? null);
  const missing = deriveMissingInfo(input);
  const followUpAngle = deriveFollowUpAngle({ ...input, isSynthetic: synthetic }, missing);

  return {
    sourcePath:        deriveSourcePath(input),
    scoreLabel:        deriveScoreLabel(input.score),
    temperatureLabel:  deriveTemperatureLabel(input.temperature),
    intentSummary:     deriveIntentSummary(input),
    missingInfo:       missing,
    followUpAngle,
    isSynthetic:       synthetic,
    doNotContact:      synthetic || (!input.consentEmail && !input.consentSms),
  };
}
