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
  consentCall?: boolean;
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
  // V2 additions
  whyItMatters: string;
  whyNow: string;
  riskIfIgnored: string;
  suggestedSms: string | null;
  suggestedEmailSubject: string | null;
  suggestedEmailBody: string | null;
  phoneOpener: string | null;
  appointmentCTA: string;
  successProbability: number;    // 0–100
  successProbabilityLabel: string;
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

// ---------------------------------------------------------------------------
// V2 enrichment functions
// ---------------------------------------------------------------------------

function deriveWhyItMatters(input: NextBestActionInput): string {
  const type = input.leadType ?? "";
  const temp = input.temperature ?? "";
  const score = input.score ?? 0;
  if (type === "seller_cash_offer") return "Cash offer inquiries convert at 3–4× the rate of general inquiries. This is your highest-value lead type.";
  if (type === "seller" || type === "home_value") return "Seller leads represent a direct listing opportunity. Every listing is 2–4× the commission of a buyer lead.";
  if (type === "buyer") return "Buyer leads are your fastest path to a closing. Wilson NC buyers in this temperature bracket close within 45–90 days.";
  if (temp === "urgent" || temp === "hot") return `Score ${score} — top-tier lead. Speed of response determines whether you win this.`;
  return "Every lead that goes uncontacted for 24+ hours loses 50–70% of its conversion probability.";
}

function deriveWhyNow(input: NextBestActionInput): string {
  const temp = input.temperature ?? "";
  const type = input.leadType ?? "";
  if (temp === "urgent") return "Urgent leads expect same-day contact. Delay past today drops conversion probability by over 80%.";
  if (temp === "hot")    return "Hot leads are actively researching. They're evaluating other agents right now.";
  if (temp === "warm")   return "Warm leads convert 60% more often when contacted within the first week of inquiry.";
  if (type === "seller_cash_offer") return "Cash offer leads have high intent but low patience — they'll accept offers from whoever responds first.";
  return "Best time to make contact is within the first 24 hours. After 72 hours, the probability drops sharply.";
}

function deriveRiskIfIgnored(input: NextBestActionInput): string {
  const temp = input.temperature ?? "";
  const type = input.leadType ?? "";
  if (temp === "urgent" || temp === "hot") return "Loss risk: HIGH. Lead will likely contact a competitor agent within 24 hours if not contacted.";
  if (type === "seller_cash_offer") return "Risk: Cash offer leads go with whoever responds first. Ignoring = loss.";
  if (temp === "warm")              return "Risk: MEDIUM. Lead will cool to nurture-tier within 48–72 hours without contact.";
  return "Risk: LOW in the short term, but unconte leads rarely self-revive. Add to a structured nurture sequence.";
}

function deriveSuggestedSms(input: NextBestActionInput): string | null {
  if (!input.hasPhone || (!input.consentSms && !input.consentCall)) return null;
  const name = input.firstName ?? "there";
  const type = input.leadType ?? "";
  if (type === "seller_cash_offer") {
    return `Hi ${name}, this is Mike Eatmon with Our Town Properties in Wilson NC. You asked about a cash offer — I can get you a number today. Best time to chat?`;
  }
  if (type === "seller" || type === "home_value") {
    return `Hi ${name}, Mike Eatmon here. You asked about your home's value in Wilson NC — happy to give you a real local estimate. Got 10 minutes this week?`;
  }
  if (type === "buyer") {
    return `Hi ${name}, Mike Eatmon with Our Town Properties. Saw you're looking at homes in Wilson NC — I'd love to help. What's your timeline?`;
  }
  return `Hi ${name}, this is Mike Eatmon with Our Town Properties in Wilson NC. Saw your inquiry — happy to help. Best time to chat?`;
}

function deriveSuggestedEmail(input: NextBestActionInput): { subject: string; body: string } | null {
  if (!input.hasEmail || !input.consentEmail) return null;
  const name = input.firstName ?? "there";
  const type = input.leadType ?? "";
  if (type === "seller_cash_offer") {
    return {
      subject: `Your Wilson NC cash offer estimate — Mike Eatmon`,
      body: `Hi ${name},\n\nI'm Mike Eatmon with Our Town Properties. You reached out about getting a cash offer on your Wilson NC home — I'd love to help.\n\nI specialize in Wilson NC and can give you a real, local estimate. Takes about 10 minutes by phone.\n\nWhen's a good time to connect this week?\n\nBest,\nMike Eatmon\nOur Town Properties · Wilson, NC\nLic. #226434`,
    };
  }
  if (type === "buyer") {
    return {
      subject: `Wilson NC homes that match your search — Mike Eatmon`,
      body: `Hi ${name},\n\nMike Eatmon here with Our Town Properties. You were looking at Wilson NC homes and I wanted to reach out personally.\n\nI'd love to share a few properties that match what you're looking for and answer any questions about the Wilson market.\n\nAre you available for a quick call this week?\n\nBest,\nMike Eatmon\nOur Town Properties · Wilson, NC`,
    };
  }
  return {
    subject: `Your real estate question — Mike Eatmon, Our Town Properties`,
    body: `Hi ${name},\n\nI'm Mike Eatmon with Our Town Properties in Wilson NC. You reached out with a question and I wanted to follow up personally.\n\nI'm happy to help — what's the best time to connect?\n\nBest,\nMike Eatmon\nOur Town Properties · Wilson, NC`,
  };
}

function derivePhoneOpener(input: NextBestActionInput): string | null {
  if (!input.hasPhone) return null;
  const name = input.firstName ?? "(name)";
  const type = input.leadType ?? "";
  if (type === "seller_cash_offer") {
    return `"Hi, is this ${name}? This is Mike Eatmon with Our Town Properties — you reached out about a cash offer on your home. Is now a good time for two minutes?"`;
  }
  if (type === "seller" || type === "home_value") {
    return `"Hi ${name}, this is Mike Eatmon with Our Town Properties in Wilson. You asked about your home's value — I just wanted to introduce myself. Is now an okay time?"`;
  }
  if (type === "buyer") {
    return `"Hi ${name}, this is Mike Eatmon with Our Town Properties. You were looking at homes in Wilson NC — I'm one of the local agents. Do you have a couple of minutes?"`;
  }
  return `"Hi, is this ${name}? This is Mike Eatmon with Our Town Properties in Wilson NC. You reached out through our site — happy to help. Is now a good time to chat?"`;
}

function deriveAppointmentCTA(input: NextBestActionInput): string {
  const type = input.leadType ?? "";
  const temp = input.temperature ?? "";
  if (type === "seller_cash_offer") {
    return temp === "urgent" || temp === "hot"
      ? "Book a same-day call — I'll give you a cash offer range on the spot."
      : "Schedule a free 15-min call to discuss your cash offer options.";
  }
  if (type === "seller" || type === "home_value") {
    return "Book a free CMA consultation — I'll show you what similar Wilson homes sold for in the last 90 days.";
  }
  if (type === "buyer") {
    return "Book a free 30-min buyer consult — I'll show you what's available in your price range and timeline.";
  }
  return "Schedule a free 15-min real estate consultation with Mike.";
}

function deriveSuccessProbability(input: NextBestActionInput): number {
  const temp = input.temperature ?? "";
  const score = input.score ?? 40;
  const type = input.leadType ?? "";
  let base = 20;
  if (temp === "urgent") base = 55;
  else if (temp === "hot") base = 40;
  else if (temp === "warm") base = 28;
  else if (temp === "nurture") base = 12;
  const scoreBoost = ((score - 50) / 50) * 15;
  if (type === "seller_cash_offer") base += 10;
  if (input.hasPhone && input.consentSms) base += 8;
  if (input.hasEmail && input.consentEmail) base += 5;
  return Math.max(0, Math.min(100, Math.round(base + scoreBoost)));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildNextBestAction(input: NextBestActionInput): NextBestActionResult {
  const synthetic = input.isSynthetic || isSyntheticLead(input.email ?? null);
  const missing = deriveMissingInfo(input);
  const followUpAngle = deriveFollowUpAngle({ ...input, isSynthetic: synthetic }, missing);
  const successProbability = deriveSuccessProbability(input);

  const emailV2 = deriveSuggestedEmail(input);

  return {
    sourcePath:        deriveSourcePath(input),
    scoreLabel:        deriveScoreLabel(input.score),
    temperatureLabel:  deriveTemperatureLabel(input.temperature),
    intentSummary:     deriveIntentSummary(input),
    missingInfo:       missing,
    followUpAngle,
    isSynthetic:       synthetic,
    doNotContact:      synthetic || (!input.consentEmail && !input.consentSms),
    // V2
    whyItMatters:             deriveWhyItMatters(input),
    whyNow:                   deriveWhyNow(input),
    riskIfIgnored:            deriveRiskIfIgnored(input),
    suggestedSms:             deriveSuggestedSms(input),
    suggestedEmailSubject:    emailV2?.subject ?? null,
    suggestedEmailBody:       emailV2?.body ?? null,
    phoneOpener:              derivePhoneOpener(input),
    appointmentCTA:           deriveAppointmentCTA(input),
    successProbability,
    successProbabilityLabel:  `${successProbability}%`,
  };
}
