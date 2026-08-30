export type GrowthOpportunityConfidence = "high" | "directional" | "collecting";
export type GrowthOpportunityFreshness = "current" | "recent" | "stale" | "unknown";

export interface GrowthOpportunityDecisionInput {
  type: string;
  confidence: number;
  geography: string | null;
  segment: string | null;
  detectedAt: string;
  evidence: Record<string, unknown>;
}

export interface GrowthOpportunityEvidenceItem {
  key: string;
  label: string;
  value: string;
}

export interface GrowthOpportunityDecisionPacket {
  confidenceLabel: GrowthOpportunityConfidence;
  confidencePercent: number;
  freshness: GrowthOpportunityFreshness;
  freshnessLabel: string;
  evidenceWindow: string | null;
  evidence: GrowthOpportunityEvidenceItem[];
  context: string[];
  nextDecision: string;
  limitation: string;
  sourceHref: string;
  sourceLabel: string;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

const ORGANIC_TYPES = new Set([
  "organic_click_capture_gap",
  "organic_page_one_gap",
  "organic_visibility_gap",
]);

function boundedText(value: unknown, maximum = 96) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) return null;
  const hasControlCharacter = Array.from(normalized).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
  return hasControlCharacter ? null : normalized;
}

function evidenceNumber(evidence: Record<string, unknown>, key: string) {
  const value = evidence[key];
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length <= 40 &&
        /^-?\d+(?:\.\d+)?$/.test(value.trim())
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000_000_000
    ? parsed
    : null;
}

function integer(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function decimal(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function percentage(value: number, maximumFractionDigits = 2) {
  return `${decimal(value * 100, maximumFractionDigits)}%`;
}

function strictDate(value: unknown) {
  const dateText = boundedText(value, 10);
  if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  const milliseconds = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const parsed = new Date(milliseconds);
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? { text: dateText, milliseconds }
    : null;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function evidenceWindow(evidence: Record<string, unknown>) {
  const start = strictDate(evidence.date_start);
  const end = strictDate(evidence.date_end);
  if (!start || !end || start.milliseconds > end.milliseconds) return null;
  return `${displayDate(start.text)} – ${displayDate(end.text)}`;
}

function confidenceLabel(confidence: number): GrowthOpportunityConfidence {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "directional";
  return "collecting";
}

function freshness(input: GrowthOpportunityDecisionInput, now: Date) {
  const evidenceEnd = strictDate(input.evidence.date_end);
  const detectedMilliseconds = Date.parse(input.detectedAt);
  const observedMilliseconds = evidenceEnd?.milliseconds ??
    (Number.isFinite(detectedMilliseconds) ? detectedMilliseconds : null);
  if (observedMilliseconds === null || !Number.isFinite(now.getTime())) {
    return { status: "unknown" as const, label: "Evidence date unavailable" };
  }
  const rawAge = Math.floor((now.getTime() - observedMilliseconds) / DAY_MS);
  if (rawAge < -1) return { status: "unknown" as const, label: "Future-dated · verify source" };
  const ageDays = Math.max(0, rawAge);
  if (ageDays <= 14) return { status: "current" as const, label: `Current · ${ageDays}d old` };
  if (ageDays <= 45) return { status: "recent" as const, label: `Recent · ${ageDays}d old` };
  return { status: "stale" as const, label: `Stale · ${ageDays}d old` };
}

function pushNumber(
  items: GrowthOpportunityEvidenceItem[],
  evidence: Record<string, unknown>,
  key: string,
  label: string,
  format: (value: number) => string = integer,
) {
  const value = evidenceNumber(evidence, key);
  if (value !== null) items.push({ key, label, value: format(value) });
}

function organicEvidence(evidence: Record<string, unknown>) {
  const items: GrowthOpportunityEvidenceItem[] = [];
  pushNumber(items, evidence, "impressions", "Impressions");
  pushNumber(items, evidence, "clicks", "Clicks");
  pushNumber(items, evidence, "ctr", "CTR", (value) => percentage(value));
  pushNumber(items, evidence, "position", "Avg. position", (value) => decimal(value, 1));
  pushNumber(items, evidence, "policy_ctr_threshold", "CTR review threshold", (value) => percentage(value));
  const dataState = boundedText(evidence.data_state, 24);
  if (dataState) items.push({ key: "data_state", label: "Data state", value: dataState });
  const device = boundedText(evidence.device, 24);
  if (device) items.push({ key: "device", label: "Device", value: device });
  return items.slice(0, 7);
}

function localProfileEvidence(evidence: Record<string, unknown>) {
  const items: GrowthOpportunityEvidenceItem[] = [];
  pushNumber(items, evidence, "impressions_total", "Search / Maps impressions");
  pushNumber(items, evidence, "interactions_total", "Reported interactions");
  pushNumber(items, evidence, "interaction_rate", "Interaction rate", (value) => percentage(value));
  pushNumber(items, evidence, "website_clicks", "Website clicks");
  pushNumber(items, evidence, "call_clicks", "Call clicks");
  pushNumber(items, evidence, "direction_requests", "Direction requests");
  pushNumber(items, evidence, "bookings", "Bookings");
  return items;
}

function safeContext(input: GrowthOpportunityDecisionInput) {
  return [boundedText(input.geography, 80), boundedText(input.segment, 120)]
    .filter((value): value is string => Boolean(value));
}

function organicDecision(type: string) {
  if (type === "organic_click_capture_gap") {
    return "Review the indexed page, title, description, and answer alignment; draft one measurable snippet/content improvement for owner approval.";
  }
  if (type === "organic_page_one_gap") {
    return "Inspect the current page against observed search intent and internal-link support; draft one bounded page-one experiment for owner approval.";
  }
  return "Verify that the page answers the observed local intent, then draft one evidence-backed content or internal-link test for owner approval.";
}

export function buildOpportunityDecisionPacket(
  input: GrowthOpportunityDecisionInput,
  options: { now?: Date } = {},
): GrowthOpportunityDecisionPacket {
  const now = options.now ?? new Date();
  const confidence = Math.max(0, Math.min(1, Number.isFinite(input.confidence) ? input.confidence : 0));
  const age = freshness(input, now);
  const window = evidenceWindow(input.evidence);

  if (ORGANIC_TYPES.has(input.type)) {
    return {
      confidenceLabel: confidenceLabel(confidence),
      confidencePercent: Math.round(confidence * 100),
      freshness: age.status,
      freshnessLabel: age.label,
      evidenceWindow: window,
      evidence: organicEvidence(input.evidence),
      context: safeContext(input),
      nextDecision: organicDecision(input.type),
      limitation: "Search Console aggregates can lag, omit anonymized queries, and truncate large result sets. This is a review cue—not a ranking promise or permission to publish.",
      sourceHref: "/admin/growth/search-ingress",
      sourceLabel: "Open organic-search workbench",
    };
  }

  if (input.type === "local_profile_interaction_gap") {
    return {
      confidenceLabel: confidenceLabel(confidence),
      confidencePercent: Math.round(confidence * 100),
      freshness: age.status,
      freshnessLabel: age.label,
      evidenceWindow: window,
      evidence: localProfileEvidence(input.evidence),
      context: safeContext(input),
      nextDecision: "Verify the owned profile identity, website destination, approved services, and conversion path; draft any profile or post change for owner review before publication.",
      limitation: "Aggregate Business Profile metrics are directional and cannot prove causation. Retired conversation metrics are excluded. No profile edit, post, message, or spend is authorized here.",
      sourceHref: "/admin/growth/local-profile-ingress",
      sourceLabel: "Open local-profile workbench",
    };
  }

  return {
    confidenceLabel: confidenceLabel(confidence),
    confidencePercent: Math.round(confidence * 100),
    freshness: age.status,
    freshnessLabel: age.label,
    evidenceWindow: window,
    evidence: [],
    context: safeContext(input),
    nextDecision: "Review the minimized source evidence and define one reversible, measurable next step before requesting execution approval.",
    limitation: "No evidence fields are surfaced for this unrecognized opportunity type. No sending, publishing, assignment, profile mutation, or spend is authorized.",
    sourceHref: "/admin/growth",
    sourceLabel: "Review in Growth Command Center",
  };
}
