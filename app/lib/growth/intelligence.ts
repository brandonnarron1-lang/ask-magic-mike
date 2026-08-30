export type GrowthActionClass =
  | "observe"
  | "recommend"
  | "draft"
  | "requires_approval"
  | "blocked";

export {
  assignExperimentVariant,
  evaluateExperiment,
} from "./experiment-engine";
export type {
  ExperimentDecision,
  ExperimentVariantResult,
  WeightedVariant,
} from "./experiment-engine";

export interface GrowthLeadFact {
  id: string;
  createdAt: string;
  status: string;
  conversionStage?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  leadType?: string | null;
  score?: number | null;
  timelineMonths?: number | null;
  lastContactedAt?: string | null;
  firstHumanResponseAt?: string | null;
  firstResponseOwnerKey?: string | null;
  firstResponseOwnerLabel?: string | null;
  firstResponseOwnerBasis?: "responder_agent" | "responder_user" | "assigned_owner_snapshot" | "unattributed" | null;
  isPaid?: boolean;
}

export interface GrowthSpendFact {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  spendUsd: number;
  impressions?: number;
  clicks?: number;
  platformLeads?: number;
}

export interface GrowthOutcomeFact {
  leadId: string;
  outcomeType: string;
  amountUsd?: number | null;
  occurredAt?: string | null;
}

export interface GrowthExperimentFact {
  experimentKey: string;
  name: string;
  surface: string;
  hypothesis: string;
  primaryMetric: string;
  status: string;
  approvalStatus: string;
  minimumSampleSize: number;
  variants: unknown;
  startsAt?: string | null;
  endsAt?: string | null;
  decision?: string | null;
}

export interface GrowthChannelEconomics {
  key: string;
  source: string;
  medium: string;
  campaign: string;
  paid: boolean;
  leads: number;
  qualified: number;
  appointments: number;
  agreements: number;
  closes: number;
  spendUsd: number;
  attributedRevenueUsd: number;
  referralFeesUsd: number;
  trackedContributionUsd: number | null;
  trackedContributionRate: number | null;
  closedRevenueRecordCount: number;
  closedRevenueCoverageRate: number | null;
  referralFeeRecordCount: number;
  referralFeeExpectedCloseCount: number;
  referralFeeCoverageRate: number | null;
  impressions: number;
  clicks: number;
  platformLeads: number;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerAppointment: number | null;
  costPerSignedClient: number | null;
  costPerClose: number | null;
  returnOnAdSpend: number | null;
  leadToQualifiedRate: number;
  leadToAppointmentRate: number;
  leadToCloseRate: number;
  qualityScore: number;
  confidence: number;
  firstResponseSampleSize: number;
  medianFirstResponseMinutes: number | null;
  p75FirstResponseMinutes: number | null;
  p90FirstResponseMinutes: number | null;
  flags: string[];
}

export interface GrowthResponseSegment {
  key: string;
  label: string;
  dimension: "lead_type" | "response_owner";
  eligibleLeads: number;
  firstResponseSampleSize: number;
  coverageRate: number | null;
  medianFirstResponseMinutes: number | null;
  p75FirstResponseMinutes: number | null;
  p90FirstResponseMinutes: number | null;
  sampleStatus: "collecting" | "directional" | "operational";
  attributionBasis?: "responder_agent" | "responder_user" | "assigned_owner_snapshot" | "unattributed";
}

export interface GrowthSummary {
  leads: number;
  qualified: number;
  appointments: number;
  agreements: number;
  closes: number;
  spendUsd: number;
  attributedRevenueUsd: number;
  referralFeesUsd: number;
  trackedContributionUsd: number | null;
  trackedContributionRate: number | null;
  closedRevenueRecordCount: number;
  closedRevenueCoverageRate: number | null;
  referralFeeRecordCount: number;
  referralFeeExpectedCloseCount: number;
  referralFeeCoverageRate: number | null;
  blendedCostPerLead: number | null;
  blendedCostPerQualifiedLead: number | null;
  blendedCostPerAppointment: number | null;
  blendedCostPerSignedClient: number | null;
  blendedCostPerClose: number | null;
  returnOnAdSpend: number | null;
  attributedLeadRate: number;
  paidLeadSpendCoverageRate: number;
  staleNurtureCandidates: number;
  speedToLeadRisks: number;
  firstResponseSampleSize: number;
  firstResponseCoverageRate: number;
  firstResponseOwnerAttributionRate: number;
  medianFirstResponseMinutes: number | null;
  p75FirstResponseMinutes: number | null;
  p90FirstResponseMinutes: number | null;
  runningExperiments: number;
}

export interface GrowthOpportunity {
  key: string;
  type: string;
  title: string;
  rationale: string;
  score: number;
  confidence: number;
  actionClass: GrowthActionClass;
  evidence: Record<string, number | string | boolean | null>;
  recommendedNextStep: string;
}

export interface GrowthIntelligence {
  summary: GrowthSummary;
  channels: GrowthChannelEconomics[];
  responseByLeadType: GrowthResponseSegment[];
  responseByAgent: GrowthResponseSegment[];
  opportunities: GrowthOpportunity[];
}

const QUALIFIED_STATES = new Set([
  "qualified",
  "appointment_requested",
  "appointment_set",
  "appointment_scheduled",
  "under_contract",
  "agreement_signed",
  "converted",
  "closed",
  "won",
]);

const APPOINTMENT_STATES = new Set([
  "appointment_requested",
  "appointment_set",
  "appointment_scheduled",
  "appointment_confirmed",
  "under_contract",
  "agreement_signed",
  "converted",
  "closed",
  "won",
]);

const AGREEMENT_STATES = new Set([
  "agreement_signed",
  "under_contract",
  "converted",
  "closed",
  "won",
]);

const CLOSED_STATES = new Set(["converted", "closed", "won"]);
const TERMINAL_STATES = new Set([
  "converted",
  "closed",
  "won",
  "lost",
  "dead",
  "disqualified",
  "spam",
  "test",
]);

const PAID_MEDIUM_MARKERS = ["cpc", "ppc", "paid", "paid_social", "display", "cpm", "cpl"];
const PORTAL_SOURCES = new Set(["zillow", "realtor_com", "homes_com", "redfin"]);

function bounded(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function rate(numerator: number, denominator: number) {
  const result = safeDivide(numerator, denominator);
  return result == null ? 0 : round(result * 100, 1);
}

function percentile(values: number[], quantile: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = bounded(quantile, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const interpolated = sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  return round(interpolated, 1);
}

function firstResponseMinutes(lead: GrowthLeadFact): number | null {
  if (!lead.firstHumanResponseAt) return null;
  const created = new Date(lead.createdAt).getTime();
  const responded = new Date(lead.firstHumanResponseAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(responded) || responded < created) return null;
  return (responded - created) / 60000;
}

export function normalizeGrowthKey(value: unknown, fallback = "unknown") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/\.com\b/g, "_com")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return normalized || fallback;
}

export function normalizeVendorSource(value: unknown) {
  const key = normalizeGrowthKey(value);
  const aliases: Record<string, string> = {
    facebook: "meta",
    instagram: "meta",
    fb: "meta",
    meta_ads: "meta",
    google_ads: "google",
    google_adwords: "google",
    realtor: "realtor_com",
    realtor_com_connections_plus: "realtor_com",
    homes: "homes_com",
    homes_com_boost: "homes_com",
    followupboss: "follow_up_boss",
    fub: "follow_up_boss",
    kvcore: "boldtrail",
    inside_real_estate: "boldtrail",
    luxury_presence_ai: "luxury_presence",
  };
  return aliases[key] ?? key;
}

export function isPaidGrowthSource(source: unknown, medium: unknown, explicit?: boolean) {
  if (explicit) return true;
  const normalizedSource = normalizeVendorSource(source);
  const normalizedMedium = normalizeGrowthKey(medium, "");
  return PORTAL_SOURCES.has(normalizedSource) ||
    PAID_MEDIUM_MARKERS.some((marker) => normalizedMedium.includes(marker));
}

export function growthChannelKey(input: {
  source?: unknown;
  medium?: unknown;
  campaign?: unknown;
}) {
  return [
    normalizeVendorSource(input.source),
    normalizeGrowthKey(input.medium, "unspecified"),
    normalizeGrowthKey(input.campaign, "unspecified"),
  ].join("|");
}

function statusFor(lead: GrowthLeadFact) {
  return normalizeGrowthKey(lead.conversionStage || lead.status, "new");
}

function isQualifiedLead(lead: GrowthLeadFact) {
  const status = statusFor(lead);
  return QUALIFIED_STATES.has(status) || finiteNumber(lead.score, 0) >= 70;
}

function isAppointmentLead(lead: GrowthLeadFact) {
  return APPOINTMENT_STATES.has(statusFor(lead));
}

function isAgreementLead(lead: GrowthLeadFact) {
  return AGREEMENT_STATES.has(statusFor(lead));
}

function isClosedLead(lead: GrowthLeadFact) {
  return CLOSED_STATES.has(statusFor(lead));
}

function latestOutcomeByLead(outcomes: GrowthOutcomeFact[]) {
  const byLeadAndType = new Map<string, Map<string, GrowthOutcomeFact>>();
  for (const outcome of outcomes) {
    const outcomeType = normalizeGrowthKey(outcome.outcomeType, "");
    if (!outcome.leadId || !outcomeType) continue;
    const rows = byLeadAndType.get(outcome.leadId) ?? new Map<string, GrowthOutcomeFact>();
    const current = rows.get(outcomeType);
    const occurredAt = Date.parse(outcome.occurredAt ?? "");
    const currentOccurredAt = Date.parse(current?.occurredAt ?? "");
    if (
      !current ||
      (Number.isFinite(occurredAt) &&
        (!Number.isFinite(currentOccurredAt) || occurredAt >= currentOccurredAt))
    ) {
      rows.set(outcomeType, outcome);
    }
    byLeadAndType.set(outcome.leadId, rows);
  }
  return new Map(
    [...byLeadAndType.entries()].map(([leadId, rows]) => [leadId, [...rows.values()]]),
  );
}

function outcomeHas(rows: GrowthOutcomeFact[] | undefined, ...types: string[]) {
  if (!rows?.length) return false;
  const wanted = new Set(types.map((type) => normalizeGrowthKey(type)));
  return rows.some((row) => wanted.has(normalizeGrowthKey(row.outcomeType)));
}

function outcomeAmount(rows: GrowthOutcomeFact[] | undefined, outcomeType: string) {
  const row = rows?.find((candidate) =>
    normalizeGrowthKey(candidate.outcomeType, "") === outcomeType,
  );
  if (row?.amountUsd == null) return null;
  const amount = Number(row.amountUsd);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

interface MutableChannel {
  source: string;
  medium: string;
  campaign: string;
  paid: boolean;
  leads: number;
  qualified: number;
  appointments: number;
  agreements: number;
  closes: number;
  spendUsd: number;
  attributedRevenueUsd: number;
  referralFeesUsd: number;
  closedRevenueRecordCount: number;
  referralFeeRecordCount: number;
  impressions: number;
  clicks: number;
  platformLeads: number;
  firstResponseMinutes: number[];
}

function emptyChannel(source: string, medium: string, campaign: string, paid: boolean): MutableChannel {
  return {
    source,
    medium,
    campaign,
    paid,
    leads: 0,
    qualified: 0,
    appointments: 0,
    agreements: 0,
    closes: 0,
    spendUsd: 0,
    attributedRevenueUsd: 0,
    referralFeesUsd: 0,
    closedRevenueRecordCount: 0,
    referralFeeRecordCount: 0,
    impressions: 0,
    clicks: 0,
    platformLeads: 0,
    firstResponseMinutes: [],
  };
}

function finalizeChannel(key: string, channel: MutableChannel): GrowthChannelEconomics {
  const leadToQualifiedRate = rate(channel.qualified, channel.leads);
  const leadToAppointmentRate = rate(channel.appointments, channel.leads);
  const leadToCloseRate = rate(channel.closes, channel.leads);
  const qualityScore = round(bounded(
    leadToQualifiedRate * 0.35 + leadToAppointmentRate * 0.25 + leadToCloseRate * 0.4,
    0,
    100,
  ), 1);
  const evidencePoints = Math.min(channel.leads, 30) / 30 * 0.55 +
    Math.min(channel.qualified, 10) / 10 * 0.2 +
    Math.min(channel.closes, 5) / 5 * 0.25;
  const confidence = round(bounded(evidencePoints, 0, 1), 2);
  const flags: string[] = [];
  const spendMissing = channel.paid && channel.leads > 0 && channel.spendUsd === 0;
  if (spendMissing) flags.push("spend_missing");
  if (channel.spendUsd > 0 && channel.leads === 0) flags.push("conversion_tracking_gap");
  if (channel.leads >= 5 && leadToQualifiedRate < 10) flags.push("low_qualification_rate");
  if (channel.leads >= 5 && channel.appointments === 0) flags.push("appointment_gap");
  const closedRevenueMissingCount = Math.max(
    0,
    channel.closes - channel.closedRevenueRecordCount,
  );
  const closedRevenueComplete = channel.closes > 0 && closedRevenueMissingCount === 0;
  const referralFeeExpectedCloseCount =
    PORTAL_SOURCES.has(channel.source) || channel.medium.includes("referral")
      ? channel.closes
      : 0;
  const referralFeeMissingCount = Math.max(
    0,
    referralFeeExpectedCloseCount - channel.referralFeeRecordCount,
  );
  const referralFeeReviewRequired = referralFeeMissingCount > 0;
  const economicsComplete = closedRevenueComplete && !referralFeeReviewRequired && !spendMissing;
  const trackedContributionUsd = economicsComplete
    ? round(channel.attributedRevenueUsd - channel.referralFeesUsd - channel.spendUsd)
    : null;
  const trackedContributionRate = trackedContributionUsd == null || channel.attributedRevenueUsd <= 0
    ? null
    : round(trackedContributionUsd / channel.attributedRevenueUsd * 100, 1);
  const roas = economicsComplete
    ? safeDivide(channel.attributedRevenueUsd, channel.spendUsd)
    : null;
  if (closedRevenueMissingCount > 0) flags.push("closed_revenue_missing");
  if (referralFeeReviewRequired) flags.push("referral_fee_review_required");
  if (trackedContributionUsd != null && trackedContributionUsd < 0) {
    flags.push("negative_tracked_contribution");
  }
  if (
    channel.closes >= 2 &&
    roas != null &&
    roas >= 3 &&
    trackedContributionUsd != null &&
    trackedContributionUsd > 0 &&
    !referralFeeReviewRequired
  ) {
    flags.push("scale_candidate");
  }
  if (channel.leads >= 10 && channel.spendUsd === 0 && !channel.paid && qualityScore >= 25) {
    flags.push("owned_channel_winner");
  }
  const medianFirstResponseMinutes = percentile(channel.firstResponseMinutes, 0.5);
  const p75FirstResponseMinutes = percentile(channel.firstResponseMinutes, 0.75);
  const p90FirstResponseMinutes = percentile(channel.firstResponseMinutes, 0.9);

  return {
    key,
    source: channel.source,
    medium: channel.medium,
    campaign: channel.campaign,
    paid: channel.paid,
    leads: channel.leads,
    qualified: channel.qualified,
    appointments: channel.appointments,
    agreements: channel.agreements,
    closes: channel.closes,
    spendUsd: round(channel.spendUsd),
    attributedRevenueUsd: round(channel.attributedRevenueUsd),
    referralFeesUsd: round(channel.referralFeesUsd),
    trackedContributionUsd,
    trackedContributionRate,
    closedRevenueRecordCount: channel.closedRevenueRecordCount,
    closedRevenueCoverageRate: channel.closes
      ? rate(channel.closedRevenueRecordCount, channel.closes)
      : null,
    referralFeeRecordCount: channel.referralFeeRecordCount,
    referralFeeExpectedCloseCount,
    referralFeeCoverageRate: referralFeeExpectedCloseCount
      ? rate(channel.referralFeeRecordCount, referralFeeExpectedCloseCount)
      : null,
    impressions: channel.impressions,
    clicks: channel.clicks,
    platformLeads: channel.platformLeads,
    costPerLead: channel.leads ? round(channel.spendUsd / channel.leads) : null,
    costPerQualifiedLead: channel.qualified ? round(channel.spendUsd / channel.qualified) : null,
    costPerAppointment: channel.appointments ? round(channel.spendUsd / channel.appointments) : null,
    costPerSignedClient: channel.agreements ? round(channel.spendUsd / channel.agreements) : null,
    costPerClose: channel.closes ? round(channel.spendUsd / channel.closes) : null,
    returnOnAdSpend: roas == null ? null : round(roas),
    leadToQualifiedRate,
    leadToAppointmentRate,
    leadToCloseRate,
    qualityScore,
    confidence,
    firstResponseSampleSize: channel.firstResponseMinutes.length,
    medianFirstResponseMinutes,
    p75FirstResponseMinutes,
    p90FirstResponseMinutes,
    flags,
  };
}

function responseSampleStatus(sampleSize: number): GrowthResponseSegment["sampleStatus"] {
  if (sampleSize >= 20) return "operational";
  if (sampleSize >= 5) return "directional";
  return "collecting";
}

function buildResponseBreakdowns(leads: GrowthLeadFact[]) {
  const leadTypes = new Map<string, {
    label: string;
    eligibleLeads: number;
    responseMinutes: number[];
  }>();
  const responseOwners = new Map<string, {
    label: string;
    basis: NonNullable<GrowthLeadFact["firstResponseOwnerBasis"]>;
    responseMinutes: number[];
  }>();

  for (const lead of leads) {
    const leadTypeKey = normalizeGrowthKey(lead.leadType, "unknown");
    const leadType = leadTypes.get(leadTypeKey) ?? {
      label: leadTypeKey.replaceAll("_", " "),
      eligibleLeads: 0,
      responseMinutes: [],
    };
    leadType.eligibleLeads += 1;
    const minutes = firstResponseMinutes(lead);
    if (minutes !== null) leadType.responseMinutes.push(minutes);
    leadTypes.set(leadTypeKey, leadType);

    if (minutes === null) continue;
    const ownerKey = normalizeGrowthKey(lead.firstResponseOwnerKey, "unattributed");
    const basis = lead.firstResponseOwnerBasis ?? "unattributed";
    const owner = responseOwners.get(ownerKey) ?? {
      label: String(lead.firstResponseOwnerLabel || "Unattributed responder").trim().slice(0, 120)
        || "Unattributed responder",
      basis,
      responseMinutes: [],
    };
    owner.responseMinutes.push(minutes);
    responseOwners.set(ownerKey, owner);
  }

  const responseByLeadType: GrowthResponseSegment[] = [...leadTypes.entries()]
    .map(([key, row]) => ({
      key,
      label: row.label,
      dimension: "lead_type" as const,
      eligibleLeads: row.eligibleLeads,
      firstResponseSampleSize: row.responseMinutes.length,
      coverageRate: rate(row.responseMinutes.length, row.eligibleLeads),
      medianFirstResponseMinutes: percentile(row.responseMinutes, 0.5),
      p75FirstResponseMinutes: percentile(row.responseMinutes, 0.75),
      p90FirstResponseMinutes: percentile(row.responseMinutes, 0.9),
      sampleStatus: responseSampleStatus(row.responseMinutes.length),
    }))
    .sort((a, b) => b.eligibleLeads - a.eligibleLeads || a.label.localeCompare(b.label));

  const responseByAgent: GrowthResponseSegment[] = [...responseOwners.entries()]
    .map(([key, row]) => ({
      key,
      label: row.label,
      dimension: "response_owner" as const,
      eligibleLeads: row.responseMinutes.length,
      firstResponseSampleSize: row.responseMinutes.length,
      coverageRate: null,
      medianFirstResponseMinutes: percentile(row.responseMinutes, 0.5),
      p75FirstResponseMinutes: percentile(row.responseMinutes, 0.75),
      p90FirstResponseMinutes: percentile(row.responseMinutes, 0.9),
      sampleStatus: responseSampleStatus(row.responseMinutes.length),
      attributionBasis: row.basis,
    }))
    .sort((a, b) => b.firstResponseSampleSize - a.firstResponseSampleSize || a.label.localeCompare(b.label));

  return { responseByLeadType, responseByAgent };
}

function isAttributed(lead: GrowthLeadFact) {
  const source = normalizeVendorSource(lead.source);
  return source !== "unknown" && source !== "direct" && source !== "unspecified";
}

function buildOpportunityRadar(input: {
  summary: GrowthSummary;
  channels: GrowthChannelEconomics[];
  experiments: GrowthExperimentFact[];
}): GrowthOpportunity[] {
  const { summary, channels, experiments } = input;
  const opportunities: GrowthOpportunity[] = [];
  const missingSpendLeads = channels
    .filter((channel) => channel.flags.includes("spend_missing"))
    .reduce((sum, channel) => sum + channel.leads, 0);
  const closesMissingRevenue = channels
    .filter((channel) => channel.flags.includes("closed_revenue_missing"))
    .reduce(
      (sum, channel) => sum + Math.max(0, channel.closes - channel.closedRevenueRecordCount),
      0,
    );
  const closesNeedingReferralReview = channels
    .filter((channel) => channel.flags.includes("referral_fee_review_required"))
    .reduce(
      (sum, channel) => sum + Math.max(
        0,
        channel.referralFeeExpectedCloseCount - channel.referralFeeRecordCount,
      ),
      0,
    );

  if (missingSpendLeads > 0) {
    opportunities.push({
      key: "complete_paid_channel_economics",
      type: "measurement",
      title: "Close the paid-channel economics gap",
      rationale: `${missingSpendLeads} paid-source leads have attribution but no corresponding spend ledger. Lead volume without cost is decorative accounting.`,
      score: bounded(70 + Math.min(missingSpendLeads, 20), 0, 100),
      confidence: 0.95,
      actionClass: "requires_approval",
      evidence: { missingSpendLeads, paidLeadSpendCoverageRate: summary.paidLeadSpendCoverageRate },
      recommendedNextStep: "Import daily portal and ad-platform spend, then reconcile campaign UTMs before changing budgets.",
    });
  }

  if (closesMissingRevenue > 0) {
    opportunities.push({
      key: "complete_closed_revenue_evidence",
      type: "measurement",
      title: "Record actual closed brokerage revenue",
      rationale: `${closesMissingRevenue} closed outcome${closesMissingRevenue === 1 ? "" : "s"} lack an actual recorded revenue amount. Close counts without revenue cannot support truthful ROAS or contribution decisions.`,
      score: bounded(76 + Math.min(closesMissingRevenue * 3, 18), 0, 100),
      confidence: 0.98,
      actionClass: "recommend",
      evidence: { closesMissingRevenue },
      recommendedNextStep: "Record actual brokerage revenue through the protected Lead Center outcome workflow; never substitute sale price, list price, projected commission, or an estimate.",
    });
  }

  if (closesNeedingReferralReview > 0) {
    opportunities.push({
      key: "reconcile_referral_fee_evidence",
      type: "measurement",
      title: "Reconcile referral-fee burden before scaling",
      rationale: `${closesNeedingReferralReview} portal or referral-channel close${closesNeedingReferralReview === 1 ? "" : "s"} lack complete referral-fee evidence. The system will not treat missing fee evidence as zero or recommend scale from incomplete economics.`,
      score: bounded(74 + Math.min(closesNeedingReferralReview * 3, 18), 0, 100),
      confidence: 0.95,
      actionClass: "recommend",
      evidence: { closesNeedingReferralReview },
      recommendedNextStep: "Confirm whether each close incurred a referral fee and record the actual fee as a separate referral-paid outcome; do not infer a contractual percentage.",
    });
  }

  if (summary.staleNurtureCandidates > 0) {
    opportunities.push({
      key: "database_reactivation",
      type: "database",
      title: "Reactivate dormant first-party demand",
      rationale: `${summary.staleNurtureCandidates} non-terminal leads are stale enough to warrant operator-reviewed reactivation. This is usually cheaper than buying strangers from a portal and then acting surprised when they also talk to other agents.`,
      score: bounded(55 + Math.min(summary.staleNurtureCandidates, 40), 0, 100),
      confidence: 0.9,
      actionClass: "draft",
      evidence: { staleNurtureCandidates: summary.staleNurtureCandidates },
      recommendedNextStep: "Generate consent-aware call, email, and SMS drafts by intent and last known context; require human approval before enrollment or sending.",
    });
  }

  if (summary.speedToLeadRisks > 0) {
    opportunities.push({
      key: "speed_to_lead",
      type: "operations",
      title: "Recover the first-response window",
      rationale: `${summary.speedToLeadRisks} recent leads remain uncontacted beyond the fifteen-minute operating threshold.`,
      score: bounded(75 + Math.min(summary.speedToLeadRisks * 3, 20), 0, 100),
      confidence: 0.98,
      actionClass: "recommend",
      evidence: { speedToLeadRisks: summary.speedToLeadRisks },
      recommendedNextStep: "Escalate to the action queue and measure median first-human-response time by source and assigned agent.",
    });
  }

  if (summary.leads > 0 && summary.firstResponseCoverageRate < 90) {
    opportunities.push({
      key: "first_response_measurement",
      type: "measurement",
      title: "Make first-response performance measurable",
      rationale: `${round(100 - summary.firstResponseCoverageRate, 1)}% of eligible leads lack immutable first-human-response evidence. Mutable last-contact timestamps cannot support a truthful speed-to-lead baseline.`,
      score: bounded(68 + (100 - summary.firstResponseCoverageRate) * 0.2, 0, 100),
      confidence: 0.98,
      actionClass: "recommend",
      evidence: {
        leads: summary.leads,
        firstResponseSampleSize: summary.firstResponseSampleSize,
        firstResponseCoverageRate: summary.firstResponseCoverageRate,
      },
      recommendedNextStep: "Record the immutable first-response milestone from the Lead Center whenever a human completes the first one-to-one follow-up.",
    });
  }

  if (summary.firstResponseSampleSize > 0 && summary.firstResponseOwnerAttributionRate < 90) {
    opportunities.push({
      key: "first_response_owner_attribution",
      type: "operations",
      title: "Attribute first response to the responsible operator",
      rationale: `${round(100 - summary.firstResponseOwnerAttributionRate, 1)}% of measured first responses lack a server-resolved Lead Center user or assignment snapshot. Agent performance is not trustworthy until that evidence is linked.`,
      score: bounded(64 + (100 - summary.firstResponseOwnerAttributionRate) * 0.25, 0, 100),
      confidence: 0.98,
      actionClass: "recommend",
      evidence: {
        firstResponseSampleSize: summary.firstResponseSampleSize,
        firstResponseOwnerAttributionRate: summary.firstResponseOwnerAttributionRate,
      },
      recommendedNextStep: "Link each approved Lead Center operator to the canonical agent roster and record future responses through the protected Lead Center action.",
    });
  }

  if (summary.attributedLeadRate < 90 && summary.leads > 0) {
    opportunities.push({
      key: "attribution_repair",
      type: "measurement",
      title: "Repair unattributed demand",
      rationale: `${round(100 - summary.attributedLeadRate, 1)}% of leads lack a useful source identity, weakening campaign optimization and offline conversion feedback.`,
      score: bounded(60 + (100 - summary.attributedLeadRate) * 0.4, 0, 100),
      confidence: 0.9,
      actionClass: "recommend",
      evidence: { attributedLeadRate: summary.attributedLeadRate, leads: summary.leads },
      recommendedNextStep: "Require first-touch, last-touch, landing-page, placement, and click-ID capture on every public and partner intake path.",
    });
  }

  const scalable = channels
    .filter((channel) => channel.flags.includes("scale_candidate"))
    .sort((a, b) => (b.returnOnAdSpend ?? 0) - (a.returnOnAdSpend ?? 0))[0];
  if (scalable) {
    opportunities.push({
      key: `scale_${scalable.key}`,
      type: "channel",
      title: `Test a controlled scale-up for ${scalable.source}`,
      rationale: `${scalable.source} has ${scalable.closes} closes and ${scalable.returnOnAdSpend}x attributed ROAS in the selected window.`,
      score: bounded(65 + scalable.qualityScore * 0.25, 0, 100),
      confidence: scalable.confidence,
      actionClass: "requires_approval",
      evidence: {
        closes: scalable.closes,
        roas: scalable.returnOnAdSpend,
        costPerClose: scalable.costPerClose,
      },
      recommendedNextStep: "Create a budget-capped experiment with a holdout, stop-loss guardrail, and no more than a 20% spend increase per review cycle.",
    });
  }

  const portalLeadCount = channels
    .filter((channel) => PORTAL_SOURCES.has(channel.source))
    .reduce((sum, channel) => sum + channel.leads, 0);
  const portalShare = summary.leads ? portalLeadCount / summary.leads * 100 : 0;
  if (portalShare >= 40) {
    opportunities.push({
      key: "reduce_portal_dependency",
      type: "portfolio",
      title: "Reduce rented-audience concentration",
      rationale: `${round(portalShare, 1)}% of tracked leads come from major portals. Portal demand can be useful, but it should not own the brokerage's oxygen supply.`,
      score: bounded(50 + portalShare * 0.5, 0, 100),
      confidence: 0.85,
      actionClass: "draft",
      evidence: { portalLeadCount, portalShare: round(portalShare, 1) },
      recommendedNextStep: "Build owned search, neighborhood, valuation, referral, and database-reactivation campaigns that retain first-party intent data.",
    });
  }

  const activeExperiments = experiments.filter((experiment) =>
    ["scheduled", "running", "paused"].includes(normalizeGrowthKey(experiment.status)),
  );
  if (activeExperiments.length === 0) {
    opportunities.push({
      key: "install_experiment_cadence",
      type: "experimentation",
      title: "Install a permanent conversion experiment cadence",
      rationale: "No active experiment is registered. Without controlled tests, every redesign becomes a committee séance with nicer typography.",
      score: 72,
      confidence: 0.95,
      actionClass: "draft",
      evidence: { registeredExperiments: experiments.length, activeExperiments: 0 },
      recommendedNextStep: "Run one public-funnel test and one operator-workflow test at a time, each with a primary metric, guardrails, minimum sample, and documented decision.",
    });
  }

  return opportunities
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 12);
}

export function buildGrowthIntelligence(input: {
  leads: GrowthLeadFact[];
  spend?: GrowthSpendFact[];
  outcomes?: GrowthOutcomeFact[];
  experiments?: GrowthExperimentFact[];
  now?: Date;
}): GrowthIntelligence {
  const spend = input.spend ?? [];
  const outcomes = input.outcomes ?? [];
  const experiments = input.experiments ?? [];
  const now = input.now ?? new Date();
  const outcomeMap = latestOutcomeByLead(outcomes);
  const channels = new Map<string, MutableChannel>();

  for (const lead of input.leads) {
    const source = normalizeVendorSource(lead.source);
    const medium = normalizeGrowthKey(lead.medium, "unspecified");
    const campaign = normalizeGrowthKey(lead.campaign, "unspecified");
    const key = growthChannelKey({ source, medium, campaign });
    const row = channels.get(key) ?? emptyChannel(
      source,
      medium,
      campaign,
      isPaidGrowthSource(source, medium, lead.isPaid),
    );
    const leadOutcomes = outcomeMap.get(lead.id);
    row.leads += 1;
    if (isQualifiedLead(lead) || outcomeHas(leadOutcomes, "qualified")) row.qualified += 1;
    if (isAppointmentLead(lead) || outcomeHas(leadOutcomes, "appointment")) row.appointments += 1;
    if (
      isAgreementLead(lead) ||
      outcomeHas(leadOutcomes, "agreement_signed", "under_contract", "closed")
    ) {
      row.agreements += 1;
    }
    const closed = isClosedLead(lead) || outcomeHas(leadOutcomes, "closed");
    if (closed) row.closes += 1;
    const closedRevenue = outcomeAmount(leadOutcomes, "closed");
    if (closedRevenue !== null) {
      row.attributedRevenueUsd += closedRevenue;
      row.closedRevenueRecordCount += 1;
    }
    const referralFee = outcomeAmount(leadOutcomes, "referral_paid");
    if (referralFee !== null) {
      row.referralFeesUsd += referralFee;
      if (closed) row.referralFeeRecordCount += 1;
    }
    const responseMinutes = firstResponseMinutes(lead);
    if (responseMinutes !== null) row.firstResponseMinutes.push(responseMinutes);
    channels.set(key, row);
  }

  for (const spendRow of spend) {
    const source = normalizeVendorSource(spendRow.source);
    const medium = normalizeGrowthKey(spendRow.medium, "unspecified");
    const campaign = normalizeGrowthKey(spendRow.campaign, "unspecified");
    const key = growthChannelKey({ source, medium, campaign });
    const row = channels.get(key) ?? emptyChannel(source, medium, campaign, true);
    row.paid = row.paid || isPaidGrowthSource(source, medium, true);
    row.spendUsd += Math.max(0, finiteNumber(spendRow.spendUsd, 0));
    row.impressions += Math.max(0, finiteNumber(spendRow.impressions, 0));
    row.clicks += Math.max(0, finiteNumber(spendRow.clicks, 0));
    row.platformLeads += Math.max(0, finiteNumber(spendRow.platformLeads, 0));
    channels.set(key, row);
  }

  const finalizedChannels = [...channels.entries()]
    .map(([key, value]) => finalizeChannel(key, value))
    .sort((a, b) => b.attributedRevenueUsd - a.attributedRevenueUsd || b.leads - a.leads);

  const totals = finalizedChannels.reduce(
    (acc, channel) => ({
      leads: acc.leads + channel.leads,
      qualified: acc.qualified + channel.qualified,
      appointments: acc.appointments + channel.appointments,
      agreements: acc.agreements + channel.agreements,
      closes: acc.closes + channel.closes,
      spendUsd: acc.spendUsd + channel.spendUsd,
      revenueUsd: acc.revenueUsd + channel.attributedRevenueUsd,
      referralFeesUsd: acc.referralFeesUsd + channel.referralFeesUsd,
      closedRevenueRecordCount: acc.closedRevenueRecordCount + channel.closedRevenueRecordCount,
      referralFeeEvidenceRecordCount: acc.referralFeeEvidenceRecordCount + Math.min(
        channel.referralFeeRecordCount,
        channel.referralFeeExpectedCloseCount,
      ),
      referralFeeExpectedCloseCount:
        acc.referralFeeExpectedCloseCount + channel.referralFeeExpectedCloseCount,
    }),
    {
      leads: 0,
      qualified: 0,
      appointments: 0,
      agreements: 0,
      closes: 0,
      spendUsd: 0,
      revenueUsd: 0,
      referralFeesUsd: 0,
      closedRevenueRecordCount: 0,
      referralFeeEvidenceRecordCount: 0,
      referralFeeExpectedCloseCount: 0,
    },
  );

  const economicsComplete = totals.closes > 0 && finalizedChannels.every((channel) =>
    !channel.flags.includes("spend_missing") &&
    !channel.flags.includes("closed_revenue_missing") &&
    !channel.flags.includes("referral_fee_review_required"),
  );
  const trackedContributionUsd = economicsComplete
    ? round(totals.revenueUsd - totals.referralFeesUsd - totals.spendUsd)
    : null;

  const attributedLeads = input.leads.filter(isAttributed).length;
  const paidLeads = finalizedChannels
    .filter((channel) => channel.paid)
    .reduce((sum, channel) => sum + channel.leads, 0);
  const paidLeadsWithSpend = finalizedChannels
    .filter((channel) => channel.paid && channel.spendUsd > 0)
    .reduce((sum, channel) => sum + channel.leads, 0);
  const staleCutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const recentCutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const responseThreshold = now.getTime() - 15 * 60 * 1000;
  const measuredFirstResponses = input.leads
    .map(firstResponseMinutes)
    .filter((value): value is number => value !== null);
  const attributedFirstResponseOwners = input.leads.filter((lead) =>
    firstResponseMinutes(lead) !== null &&
    normalizeGrowthKey(lead.firstResponseOwnerKey, "unattributed") !== "unattributed",
  ).length;
  const responseBreakdowns = buildResponseBreakdowns(input.leads);

  let staleNurtureCandidates = 0;
  let speedToLeadRisks = 0;
  for (const lead of input.leads) {
    const created = new Date(lead.createdAt).getTime();
    const contacted = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : null;
    const firstResponded = lead.firstHumanResponseAt
      ? new Date(lead.firstHumanResponseAt).getTime()
      : null;
    const terminal = TERMINAL_STATES.has(statusFor(lead));
    if (!terminal && Number.isFinite(created) && created < staleCutoff &&
      (contacted == null || !Number.isFinite(contacted) || contacted < staleCutoff)) {
      staleNurtureCandidates += 1;
    }
    if (!terminal && Number.isFinite(created) && created >= recentCutoff && created <= responseThreshold &&
      (firstResponded == null || !Number.isFinite(firstResponded)) &&
      (contacted == null || !Number.isFinite(contacted))) {
      speedToLeadRisks += 1;
    }
  }

  const summary: GrowthSummary = {
    leads: totals.leads,
    qualified: totals.qualified,
    appointments: totals.appointments,
    agreements: totals.agreements,
    closes: totals.closes,
    spendUsd: round(totals.spendUsd),
    attributedRevenueUsd: round(totals.revenueUsd),
    referralFeesUsd: round(totals.referralFeesUsd),
    trackedContributionUsd,
    trackedContributionRate: trackedContributionUsd != null && totals.revenueUsd > 0
      ? round(trackedContributionUsd / totals.revenueUsd * 100, 1)
      : null,
    closedRevenueRecordCount: totals.closedRevenueRecordCount,
    closedRevenueCoverageRate: totals.closes
      ? rate(totals.closedRevenueRecordCount, totals.closes)
      : null,
    referralFeeRecordCount: totals.referralFeeEvidenceRecordCount,
    referralFeeExpectedCloseCount: totals.referralFeeExpectedCloseCount,
    referralFeeCoverageRate: totals.referralFeeExpectedCloseCount
      ? rate(totals.referralFeeEvidenceRecordCount, totals.referralFeeExpectedCloseCount)
      : null,
    blendedCostPerLead: totals.leads ? round(totals.spendUsd / totals.leads) : null,
    blendedCostPerQualifiedLead: totals.qualified
      ? round(totals.spendUsd / totals.qualified)
      : null,
    blendedCostPerAppointment: totals.appointments ? round(totals.spendUsd / totals.appointments) : null,
    blendedCostPerSignedClient: totals.agreements
      ? round(totals.spendUsd / totals.agreements)
      : null,
    blendedCostPerClose: totals.closes ? round(totals.spendUsd / totals.closes) : null,
    returnOnAdSpend: totals.spendUsd && economicsComplete
      ? round(totals.revenueUsd / totals.spendUsd)
      : null,
    attributedLeadRate: rate(attributedLeads, input.leads.length),
    paidLeadSpendCoverageRate: rate(paidLeadsWithSpend, paidLeads),
    staleNurtureCandidates,
    speedToLeadRisks,
    firstResponseSampleSize: measuredFirstResponses.length,
    firstResponseCoverageRate: rate(measuredFirstResponses.length, input.leads.length),
    firstResponseOwnerAttributionRate: rate(
      attributedFirstResponseOwners,
      measuredFirstResponses.length,
    ),
    medianFirstResponseMinutes: percentile(measuredFirstResponses, 0.5),
    p75FirstResponseMinutes: percentile(measuredFirstResponses, 0.75),
    p90FirstResponseMinutes: percentile(measuredFirstResponses, 0.9),
    runningExperiments: experiments.filter((experiment) =>
      normalizeGrowthKey(experiment.status) === "running",
    ).length,
  };

  return {
    summary,
    channels: finalizedChannels,
    ...responseBreakdowns,
    opportunities: buildOpportunityRadar({ summary, channels: finalizedChannels, experiments }),
  };
}
