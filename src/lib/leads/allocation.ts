import type { CreateLeadCanonicalInput } from "@/schemas/leads-canonical.schema";
import type { LeadType, TimelineBucket } from "@/lib/leads/lead-types";

export type LeadIntentCategory =
  | "seller_valuation"
  | "seller_appointment"
  | "buyer_search"
  | "investor_opportunity"
  | "listing_inquiry"
  | "relocation"
  | "refinance_cash_out_curiosity"
  | "general_question"
  | "agent_referral"
  | "spam_junk_invalid";

export type LeadTemperature = "HOT" | "WARM" | "NURTURE" | "LOW_REVIEW";

export type LeadAllocationQueue =
  | "mike_high_priority_seller_queue"
  | "seller_nurture_queue"
  | "buyer_inquiry_queue"
  | "investor_queue"
  | "listing_inquiry_queue"
  | "relocation_queue"
  | "vip_manual_review"
  | "invalid_spam_review"
  | "compliance_review"
  | "general_inquiry_queue";

export interface LeadAllocationResult {
  intentCategory: LeadIntentCategory;
  allocatedQueue: LeadAllocationQueue;
  allocatedOwner: string;
  nextAction: string;
  status:
    | "qualified"
    | "hot"
    | "warm"
    | "nurture"
    | "needs_manual_review"
    | "compliance_review"
    | "spam";
  leadScore: number;
  leadTemperature: LeadTemperature;
  complianceFlags: string[];
  spamScore: number;
  auditReason: string;
  notesRedacted: string;
}

export interface AllocateLeadOptions {
  hasValidEmail?: boolean;
  hasValidPhone?: boolean;
  hasValidAddress?: boolean;
  spamScore?: number;
}

const MIKE_OWNER = "Mike Eatmon / Our Town Properties";

const INVESTOR_RE = /\b(rental|rentals|flip|cash\s*flow|distressed|rehab|foreclosure|portfolio|landlord|tenant[-\s]?occupied)\b/i;
const APPOINTMENT_RE = /\b(appointment|meet|meeting|schedule|call me|come by|walkthrough|consult|consultation)\b/i;
const REFINANCE_RE = /\b(refinance|cash[-\s]?out|heloc|home equity|equity loan)\b/i;
const VIP_RE = /\b(existing client|past client|referral|referred|agent referral|realtor referral|broker referral)\b/i;
const SPAM_RE = /\b(seo package|crypto|casino|adult|viagra|payday|backlinks|guest post|bot traffic)\b/i;
const COMPLIANCE_RE =
  /\b(legal|lawsuit|discrimination|protected class|familial status|race|religion|national origin|disability|school ranking|best schools?|crime|safety|safe neighborhood|steering|appraisal guarantee|loan guarantee|guaranteed value|exact value|official value|will sell for|guaranteed offer|investment return|roi)\b/i;

export function allocateLead(
  input: CreateLeadCanonicalInput,
  options: AllocateLeadOptions = {}
): LeadAllocationResult {
  const text = [
    input.intent,
    input.notes,
    input.source_detail,
    input.seller_motivation,
    input.property_address,
  ]
    .filter(Boolean)
    .join(" ");

  const hasValidEmail = options.hasValidEmail ?? Boolean(input.email);
  const hasValidPhone = options.hasValidPhone ?? Boolean(input.phone);
  const hasValidAddress =
    options.hasValidAddress ?? Boolean((input.property_address ?? "").trim());
  const spamScore = options.spamScore ?? 0;

  const complianceFlags = findComplianceFlags(text);
  const fakeContact = !hasValidEmail && !hasValidPhone;
  const spamLanguage = SPAM_RE.test(text) || spamScore >= 50;
  const intentCategory = classifyIntent(input.lead_type, text, fakeContact || spamLanguage);
  const score = computeOperatingLeadScore(input, {
    hasValidEmail,
    hasValidPhone,
    hasValidAddress,
    complianceFlags,
    fakeContact,
    spamLanguage,
  });
  const leadTemperature = temperatureFor(score);

  if (fakeContact || spamLanguage || intentCategory === "spam_junk_invalid") {
    return buildResult({
      intentCategory: "spam_junk_invalid",
      allocatedQueue: "invalid_spam_review",
      status: "spam",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Review invalid contact/spam signals; do not discard without audit.",
      auditReason: fakeContact
        ? "missing reliable contact method"
        : "spam language or spam score threshold",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (complianceFlags.length > 0) {
    return buildResult({
      intentCategory,
      allocatedQueue: "compliance_review",
      status: "compliance_review",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Compliance review required before response.",
      auditReason: `compliance trigger: ${complianceFlags.join(", ")}`,
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (VIP_RE.test(text) || input.lead_type === "agent_referral") {
    return buildResult({
      intentCategory: "agent_referral",
      allocatedQueue: "vip_manual_review",
      status: "needs_manual_review",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Manual VIP/referral review by Mike.",
      auditReason: "referral or existing-client language",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (intentCategory === "investor_opportunity") {
    return buildResult({
      intentCategory,
      allocatedQueue: "investor_queue",
      status: "qualified",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Qualify investor criteria and ask for preferred opportunity type.",
      auditReason: "investor intent detected",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (intentCategory === "buyer_search") {
    return buildResult({
      intentCategory,
      allocatedQueue: "buyer_inquiry_queue",
      status: "qualified",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Follow up on home criteria and appointment availability.",
      auditReason: "buyer search intent",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (intentCategory === "listing_inquiry") {
    return buildResult({
      intentCategory,
      allocatedQueue: "listing_inquiry_queue",
      status: "qualified",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Respond with public listing details and offer a showing conversation.",
      auditReason: "listing-specific inquiry",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (intentCategory === "relocation") {
    return buildResult({
      intentCategory,
      allocatedQueue: "relocation_queue",
      status: "qualified",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Clarify move timeline, current location, and buyer/seller needs.",
      auditReason: "relocation intent",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (
    (intentCategory === "seller_valuation" ||
      intentCategory === "seller_appointment") &&
    hasValidAddress &&
    hasValidPhone
  ) {
    return buildResult({
      intentCategory,
      allocatedQueue: "mike_high_priority_seller_queue",
      status:
        leadTemperature === "HOT"
          ? "hot"
          : leadTemperature === "WARM"
            ? "warm"
            : "nurture",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Call/text seller lead and prepare broker-reviewed local market snapshot.",
      auditReason: "seller lead with address and phone",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  if (
    (intentCategory === "seller_valuation" ||
      intentCategory === "seller_appointment") &&
    hasValidAddress &&
    hasValidEmail
  ) {
    return buildResult({
      intentCategory,
      allocatedQueue: "seller_nurture_queue",
      status: leadTemperature === "HOT" ? "warm" : "nurture",
      leadScore: score,
      leadTemperature,
      complianceFlags,
      spamScore,
      nextAction: "Email seller follow-up and request best phone for priority review.",
      auditReason: "seller lead with address and email only",
      notesRedacted: redactOperationalNotes(text),
    });
  }

  return buildResult({
    intentCategory,
    allocatedQueue: "general_inquiry_queue",
    status: score >= 40 ? "qualified" : "nurture",
    leadScore: score,
    leadTemperature,
    complianceFlags,
    spamScore,
    nextAction: "Clarify intent and collect missing qualification details.",
    auditReason: "general inquiry or incomplete seller details",
    notesRedacted: redactOperationalNotes(text),
  });
}

function classifyIntent(
  leadType: LeadType,
  text: string,
  invalid: boolean
): LeadIntentCategory {
  if (invalid) return "spam_junk_invalid";
  if (leadType === "agent_referral") return "agent_referral";
  if (leadType === "listing_inquiry") return "listing_inquiry";
  if (leadType === "relocation") return "relocation";
  if (leadType === "investor" || INVESTOR_RE.test(text)) return "investor_opportunity";
  if (REFINANCE_RE.test(text)) return "refinance_cash_out_curiosity";
  if (APPOINTMENT_RE.test(text)) return "seller_appointment";
  if (
    leadType === "seller" ||
    leadType === "seller_cash_offer" ||
    leadType === "home_value" ||
    /\b(sell|seller|home value|worth|valuation|cash offer|downsiz|inherited)\b/i.test(text)
  ) {
    return "seller_valuation";
  }
  if (leadType === "buyer" || /\b(buy|buyer|homes?|tour|showing|looking for)\b/i.test(text)) {
    return "buyer_search";
  }
  return "general_question";
}

function computeOperatingLeadScore(
  input: CreateLeadCanonicalInput,
  context: {
    hasValidEmail: boolean;
    hasValidPhone: boolean;
    hasValidAddress: boolean;
    complianceFlags: string[];
    fakeContact: boolean;
    spamLanguage: boolean;
  }
): number {
  let score = 0;
  if (["seller", "seller_cash_offer", "home_value"].includes(input.lead_type)) score += 30;
  if (context.hasValidAddress) score += 25;
  if (context.hasValidPhone) score += 20;
  if (input.timeline === "asap" || input.timeline === "0_30_days") score += 15;
  if (input.timeline === "31_90_days") score += 10;
  if (APPOINTMENT_RE.test([input.intent, input.notes].filter(Boolean).join(" "))) score += 10;
  if (/\b(inherited|downsizing|downsize|relocating|relocation|buying another home)\b/i.test([input.intent, input.notes, input.seller_motivation].filter(Boolean).join(" "))) {
    score += 10;
  }
  if (context.hasValidEmail) score += 5;
  if (context.fakeContact) score -= 50;
  if (context.spamLanguage) score -= 40;
  if (!input.lead_type || input.lead_type === "unknown") score -= 25;
  if (input.property_address && !context.hasValidAddress) score -= 20;
  if (context.complianceFlags.length > 0) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function temperatureFor(score: number): LeadTemperature {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  if (score >= 10) return "NURTURE";
  return "LOW_REVIEW";
}

function findComplianceFlags(text: string): string[] {
  if (!COMPLIANCE_RE.test(text)) return [];
  const flags: string[] = [];
  const checks: Array<[string, RegExp]> = [
    ["legal_or_regulatory", /\blegal|lawsuit\b/i],
    ["fair_housing_or_steering", /\bdiscrimination|protected class|familial status|race|religion|national origin|disability|steering\b/i],
    ["school_or_safety_claim", /\bschool ranking|best schools?|crime|safety|safe neighborhood\b/i],
    ["valuation_or_loan_guarantee", /\bappraisal guarantee|loan guarantee|guaranteed value|exact value|official value|will sell for|guaranteed offer\b/i],
    ["investment_return_claim", /\binvestment return|roi\b/i],
  ];
  for (const [flag, re] of checks) if (re.test(text)) flags.push(flag);
  return flags.length ? flags : ["compliance_review_required"];
}

function redactOperationalNotes(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/\b\d{1,6}\s+[A-Za-z0-9.' -]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir)\b/gi, "[REDACTED_ADDRESS]")
    .slice(0, 500);
}

function buildResult(
  partial: Omit<LeadAllocationResult, "allocatedOwner">
): LeadAllocationResult {
  return {
    allocatedOwner: MIKE_OWNER,
    ...partial,
  };
}

export function timelineBucketForCanonicalLead(
  timeline: TimelineBucket | undefined
): "0_to_30_days" | "31_to_90_days" | "90_plus_days" | "unknown" {
  if (timeline === "asap" || timeline === "0_30_days") return "0_to_30_days";
  if (timeline === "31_90_days") return "31_to_90_days";
  if (timeline === "3_6_months" || timeline === "6_plus_months") return "90_plus_days";
  return "unknown";
}
