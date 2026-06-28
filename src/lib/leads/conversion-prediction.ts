/**
 * Conversion Prediction — 0-100 score with color tier and signal breakdown.
 *
 * Pure deterministic. No API calls. No writes.
 * Surfaces the top 5 positive and negative signals driving the score
 * so the operator knows exactly why a lead ranks high or low.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversionColorTier = "green" | "yellow" | "amber" | "red";

export interface ConversionPrediction {
  score: number;                  // 0–100
  colorTier: ConversionColorTier;
  colorClass: string;             // Tailwind classes for display
  label: string;
  primaryReason: string;
  positiveSignals: string[];      // up to 5
  negativeSignals: string[];      // up to 5
}

export interface ConversionPredictionInput {
  grade?: string | null;
  score?: number | null;
  temperature?: string | null;
  leadType?: string | null;
  primaryIntent?: string | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
  consentSms?: boolean;
  consentEmail?: boolean;
  consentCall?: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  referrerType?: string | null;
  questionRaw?: string | null;
  status?: string | null;
  assignedAgentId?: string | null;
  spamScore?: number | null;
  createdAt?: string | null;
}

// ---------------------------------------------------------------------------
// Signal definitions
// Positive/negative signals are tuples of [description, points]
// ---------------------------------------------------------------------------

type Signal = { label: string; points: number };

function buildSignals(input: ConversionPredictionInput): {
  positive: Signal[];
  negative: Signal[];
} {
  const positive: Signal[] = [];
  const negative: Signal[] = [];

  // Grade signals
  const grade = input.grade ?? "C";
  switch (grade) {
    case "A+": positive.push({ label: "Grade A+ lead — highest intent tier", points: 25 }); break;
    case "A":  positive.push({ label: "Grade A lead — high intent", points: 18 }); break;
    case "B":  positive.push({ label: "Grade B lead — moderate intent", points: 10 }); break;
    case "D":  negative.push({ label: "Grade D lead — very low intent", points: -15 }); break;
  }

  // Temperature signals
  const temp = input.temperature ?? "";
  if (temp === "urgent") positive.push({ label: "Urgent temperature — same-day action required", points: 20 });
  else if (temp === "hot")  positive.push({ label: "Hot temperature — high likelihood of closing", points: 15 });
  else if (temp === "warm") positive.push({ label: "Warm temperature — active engagement window", points: 8 });
  else if (temp === "nurture") negative.push({ label: "Nurture temperature — low near-term probability", points: -8 });
  else if (!temp)  negative.push({ label: "No temperature score — not yet evaluated", points: -5 });

  // Lead type signals
  const type = input.leadType ?? input.primaryIntent ?? "";
  if (type === "seller_cash_offer") positive.push({ label: "Cash offer inquiry — highly motivated seller", points: 15 });
  else if (type === "seller")       positive.push({ label: "Seller lead — strong selling intent", points: 10 });
  else if (type === "buyer")        positive.push({ label: "Buyer lead — active purchase intent", points: 8 });
  else if (type === "home_value")   positive.push({ label: "Home value inquiry — selling consideration", points: 6 });
  else if (type === "general_question") negative.push({ label: "General inquiry — intent not yet confirmed", points: -5 });

  // Contact info signals
  if (input.hasPhone && input.hasEmail) positive.push({ label: "Has both phone and email — reachable", points: 10 });
  else if (input.hasPhone) positive.push({ label: "Phone number provided", points: 6 });
  else if (input.hasEmail) positive.push({ label: "Email provided", points: 4 });
  else negative.push({ label: "No contact info — cannot reach lead", points: -20 });

  // Consent signals
  if (input.consentSms || input.consentCall) positive.push({ label: "SMS/call consent given — direct contact allowed", points: 8 });
  else if (input.consentEmail) positive.push({ label: "Email consent given — outbound email allowed", points: 4 });
  else negative.push({ label: "No contact consent — outbound blocked", points: -10 });

  // Address signal
  if (input.hasAddress) positive.push({ label: "Property address provided — concrete need", points: 7 });
  else negative.push({ label: "No property address — abstract inquiry", points: -3 });

  // Attribution signals
  const source = input.referrerType ?? "";
  if (source === "paid") positive.push({ label: "Paid traffic source — high-intent visitor", points: 6 });
  else if (source === "organic") positive.push({ label: "Organic search — actively researching", points: 5 });
  else if (!source && !input.utmSource) negative.push({ label: "Unattributed traffic — unknown intent signal", points: -3 });

  // Assignment signal
  if (input.assignedAgentId) positive.push({ label: "Lead is assigned — active follow-up owner", points: 4 });
  else negative.push({ label: "Unassigned — no follow-up owner yet", points: -5 });

  // Question depth
  const qLen = (input.questionRaw ?? "").trim().length;
  if (qLen > 80) positive.push({ label: "Detailed question — high engagement and specificity", points: 6 });
  else if (qLen > 30) positive.push({ label: "Specific question — clear need stated", points: 3 });
  else if (qLen < 10) negative.push({ label: "Minimal question — low engagement depth", points: -3 });

  // Spam score
  const spam = input.spamScore ?? 0;
  if (spam >= 70) negative.push({ label: "High spam score — lead quality suspect", points: -15 });
  else if (spam >= 40) negative.push({ label: "Moderate spam score — verify before contacting", points: -7 });

  // Lead age
  const ageHours = input.createdAt
    ? (Date.now() - new Date(input.createdAt).getTime()) / 3_600_000
    : null;
  if (ageHours !== null && ageHours < 2) {
    positive.push({ label: "New lead — response within 2 hours maximizes conversion", points: 8 });
  } else if (ageHours !== null && ageHours > 72) {
    negative.push({ label: "Stale lead — conversion probability lower after 72 hours", points: -5 });
  }

  // Status signals
  const status = input.status ?? "";
  if (status === "qualified") positive.push({ label: "Status: qualified — broker-reviewed intent confirmed", points: 8 });
  if (status === "contacted") positive.push({ label: "Status: contacted — response loop open", points: 5 });
  if (status === "closed_won") positive.push({ label: "Closed won — conversion confirmed", points: 50 });
  if (status === "closed_lost") negative.push({ label: "Closed lost — conversion failed", points: -50 });
  if (status === "disqualified") negative.push({ label: "Disqualified — not a real opportunity", points: -30 });

  return { positive, negative };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildConversionPrediction(input: ConversionPredictionInput): ConversionPrediction {
  const { positive, negative } = buildSignals(input);

  // Base score from composite lead score if available
  let base = input.score != null ? Math.round(input.score * 0.5) : 30;

  // Add/subtract signal points
  for (const s of positive) base += s.points;
  for (const s of negative) base += s.points; // negatives have negative points

  const score = Math.max(0, Math.min(100, Math.round(base)));

  const colorTier: ConversionColorTier =
    score >= 70 ? "green"
    : score >= 50 ? "yellow"
    : score >= 30 ? "amber"
    : "red";

  const colorClass: Record<ConversionColorTier, string> = {
    green:  "bg-emerald-500/[0.14] text-emerald-300 border-emerald-500/30",
    yellow: "bg-gold-400/20 text-gold-300 border-gold-400/30",
    amber:  "bg-amber-500/[0.14] text-amber-300 border-amber-500/30",
    red:    "bg-ruby-400/[0.12] text-ruby-300 border-ruby-400/30",
  };

  const label: Record<ConversionColorTier, string> = {
    green:  "High",
    yellow: "Moderate",
    amber:  "Low",
    red:    "Very Low",
  };

  // Pick primary reason: the single strongest signal
  const allSignals = [
    ...positive.map(s => ({ ...s, kind: "positive" as const })),
    ...negative.map(s => ({ ...s, kind: "negative" as const })),
  ].sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

  const primaryReason = allSignals[0]?.label ?? "Insufficient data to determine primary conversion driver";

  // Top 5 of each
  const topPositive = positive
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(s => s.label);

  const topNegative = negative
    .sort((a, b) => a.points - b.points)
    .slice(0, 5)
    .map(s => s.label);

  return {
    score,
    colorTier,
    colorClass: colorClass[colorTier],
    label: label[colorTier],
    primaryReason,
    positiveSignals: topPositive,
    negativeSignals: topNegative,
  };
}
