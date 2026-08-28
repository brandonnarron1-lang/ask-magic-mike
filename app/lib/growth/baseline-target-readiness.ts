import type { GrowthIntelligenceView } from "../persistence/neonGrowthIntelligenceView";

export const GROWTH_BASELINE_STATES = [
  "measured",
  "directional",
  "insufficient_sample",
  "not_instrumented",
  "unavailable",
] as const;

export type GrowthBaselineState = (typeof GROWTH_BASELINE_STATES)[number];

export type GrowthBaselineCategory =
  | "activation"
  | "acquisition"
  | "response"
  | "conversion"
  | "database"
  | "economics"
  | "portfolio"
  | "operations"
  | "experimentation"
  | "experience"
  | "trust";

export type GrowthBaselineUnit =
  | "count"
  | "percentage"
  | "minutes"
  | "milliseconds"
  | "usd"
  | "ratio"
  | "score";

export type GrowthBaselineDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "context_only";

export interface GrowthBaselineMetricDefinition {
  key: string;
  label: string;
  category: GrowthBaselineCategory;
  unit: GrowthBaselineUnit;
  direction: GrowthBaselineDirection;
  minimumSampleSize: number;
  requiresLiveDemand: boolean;
  targetCandidate: boolean;
  definition: string;
  instrumentationGap?: string;
}

// Reuses and updates the evidence vocabulary first reviewed in Draft PR #187.
// This catalog is read-only: it contains no target value, target write, or
// approval claim.
export const GROWTH_BASELINE_METRICS = [
  {
    key: "eligible_live_lead_volume",
    label: "Eligible live lead volume",
    category: "activation",
    unit: "count",
    direction: "higher_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Canonical leads in the selected window after test and communication-suppressed records are excluded.",
  },
  {
    key: "useful_source_attribution_rate",
    label: "Useful source attribution rate",
    category: "acquisition",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with a canonical non-direct source divided by eligible live leads.",
  },
  {
    key: "first_response_coverage_rate",
    label: "First-response evidence coverage",
    category: "response",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with an immutable first-human-response milestone divided by eligible live leads.",
  },
  {
    key: "median_first_response_minutes",
    label: "Median first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Median minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "p75_first_response_minutes",
    label: "P75 first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "75th percentile minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "p90_first_response_minutes",
    label: "P90 first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "90th percentile minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "contactable_rate",
    label: "Validated contactable rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with at least one validated and permitted one-to-one contact path divided by eligible live leads.",
    instrumentationGap: "The privacy-minimized Growth aggregate does not currently expose a contactability boolean. Raw contact details must not be added to this view.",
  },
  {
    key: "qualification_rate",
    label: "Qualification rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads reaching the deterministic qualified-or-later lifecycle set divided by eligible live leads.",
  },
  {
    key: "appointment_set_rate",
    label: "Appointment-set rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with an explicitly recorded appointment outcome divided by eligible live leads.",
  },
  {
    key: "appointment_held_rate",
    label: "Appointment-held rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with an explicitly recorded appointment-held outcome divided by eligible live leads.",
    instrumentationGap: "Appointment-held evidence is not yet exposed as a distinct canonical aggregate.",
  },
  {
    key: "signed_client_rate",
    label: "Signed-client rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with an explicitly recorded agreement-signed outcome divided by eligible live leads.",
  },
  {
    key: "close_rate",
    label: "Close rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads reaching the canonical closed-or-won lifecycle set divided by eligible live leads.",
  },
  {
    key: "stale_lead_inventory",
    label: "Stale lead inventory",
    category: "database",
    unit: "count",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible non-terminal live leads currently meeting the documented stale-nurture rule.",
  },
  {
    key: "speed_to_lead_risk_inventory",
    label: "Speed-to-lead risk inventory",
    category: "operations",
    unit: "count",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Recent eligible live leads without human follow-up after the documented response-risk threshold.",
  },
  {
    key: "database_reactivation_rate",
    label: "Database-reactivation rate",
    category: "database",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible revival cohort members reaching a documented response or qualified outcome divided by enrolled cohort members.",
    instrumentationGap: "Revival candidates exist, but cohort enrollment and response outcomes are not joined into one canonical rate.",
  },
  {
    key: "tracked_spend",
    label: "Reconciled tracked spend",
    category: "economics",
    unit: "usd",
    direction: "context_only",
    minimumSampleSize: 1,
    requiresLiveDemand: true,
    targetCandidate: false,
    definition: "Acquisition spend from canonical daily spend rows in the selected window.",
  },
  {
    key: "cost_per_lead",
    label: "Cost per lead",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Reconciled acquisition spend divided by eligible attributed live leads for the same window.",
  },
  {
    key: "cost_per_qualified_lead",
    label: "Cost per qualified lead",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Reconciled acquisition spend divided by eligible qualified live leads for the same window.",
  },
  {
    key: "cost_per_appointment",
    label: "Cost per appointment progression",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Reconciled acquisition spend divided by eligible leads reaching appointment-requested-or-later.",
  },
  {
    key: "cost_per_signed_client",
    label: "Cost per signed client",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Reconciled acquisition spend divided by explicitly recorded signed-client outcomes.",
  },
  {
    key: "cost_per_close",
    label: "Cost per close",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 3,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Reconciled acquisition spend divided by canonical closed-or-won outcomes.",
  },
  {
    key: "attributed_revenue",
    label: "Attributed brokerage revenue",
    category: "economics",
    unit: "usd",
    direction: "higher_is_better",
    minimumSampleSize: 3,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Actual brokerage revenue from eligible canonical close outcomes in the selected window.",
  },
  {
    key: "recorded_referral_fees",
    label: "Recorded referral fees",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 1,
    requiresLiveDemand: true,
    targetCandidate: false,
    definition: "Explicit referral-fee outcomes attached to eligible portal or referral closes; never added to revenue.",
  },
  {
    key: "tracked_contribution",
    label: "Tracked contribution",
    category: "economics",
    unit: "usd",
    direction: "higher_is_better",
    minimumSampleSize: 3,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Actual brokerage revenue less reconciled spend and recorded referral fees when coverage is complete; not net income.",
  },
  {
    key: "return_on_ad_spend",
    label: "Return on ad spend",
    category: "economics",
    unit: "ratio",
    direction: "higher_is_better",
    minimumSampleSize: 3,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Actual attributed brokerage revenue divided by reconciled acquisition spend when evidence coverage is complete.",
  },
  {
    key: "owned_demand_share",
    label: "Owned-demand share",
    category: "portfolio",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads from non-paid first-party channels divided by eligible live leads.",
  },
  {
    key: "rented_demand_share",
    label: "Rented-demand share",
    category: "portfolio",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads from paid or portal channels divided by eligible live leads.",
  },
  {
    key: "agent_acceptance_rate",
    label: "Agent acceptance rate",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Assigned live leads explicitly accepted within the configured claim window divided by assigned live leads.",
    instrumentationGap: "Explicit assignment acceptance or claim evidence is not yet aggregated.",
  },
  {
    key: "agent_first_follow_up_rate",
    label: "Agent first-follow-up coverage",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible live leads with immutable first-human-response evidence divided by eligible live leads.",
  },
  {
    key: "agent_conversion_rate",
    label: "Agent conversion rate",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible assigned live leads reaching a close divided by assigned live leads using evidence-backed owner history.",
    instrumentationGap: "Closed outcomes are not yet joined to immutable owner history at agent grain.",
  },
  {
    key: "experiment_velocity",
    label: "Experiment decision velocity",
    category: "experimentation",
    unit: "count",
    direction: "higher_is_better",
    minimumSampleSize: 1,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Controlled experiments reaching a documented decision during the selected window.",
    instrumentationGap: "The current aggregate reports running experiments, not decisions completed inside the selected window.",
  },
  {
    key: "experiment_decision_quality",
    label: "Experiment decision quality",
    category: "experimentation",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 5,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Completed experiments meeting assignment, sample, guardrail, and documented-decision requirements divided by completed experiments.",
    instrumentationGap: "Experiment assignment, sample, guardrail, and decision-quality evidence is not yet joined into one aggregate.",
  },
  {
    key: "p75_largest_contentful_paint_ms",
    label: "P75 Largest Contentful Paint",
    category: "experience",
    unit: "milliseconds",
    direction: "lower_is_better",
    minimumSampleSize: 75,
    requiresLiveDemand: false,
    targetCandidate: true,
    definition: "P75 LCP from deduplicated canonical Production field observations; Preview, QA, automation, query strings, and consumer identifiers are excluded.",
  },
  {
    key: "p75_interaction_to_next_paint_ms",
    label: "P75 Interaction to Next Paint",
    category: "experience",
    unit: "milliseconds",
    direction: "lower_is_better",
    minimumSampleSize: 50,
    requiresLiveDemand: false,
    targetCandidate: true,
    definition: "P75 INP from deduplicated canonical Production field observations under the privacy-minimized telemetry contract.",
  },
  {
    key: "p75_cumulative_layout_shift",
    label: "P75 Cumulative Layout Shift",
    category: "experience",
    unit: "score",
    direction: "lower_is_better",
    minimumSampleSize: 75,
    requiresLiveDemand: false,
    targetCandidate: true,
    definition: "P75 CLS from deduplicated canonical Production field observations under the privacy-minimized telemetry contract.",
  },
  {
    key: "critical_accessibility_issue_count",
    label: "Critical accessibility issue count",
    category: "experience",
    unit: "count",
    direction: "lower_is_better",
    minimumSampleSize: 1,
    requiresLiveDemand: false,
    targetCandidate: true,
    definition: "Open critical issues supported by documented automated checks and human evaluation; this is not an accessibility certification.",
    instrumentationGap: "A canonical issue ledger joining automated findings with documented human evaluation is not yet instrumented.",
  },
  {
    key: "mobile_funnel_technical_success_rate",
    label: "Mobile funnel technical-success rate",
    category: "experience",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 50,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible mobile funnel starts reaching durable success or an explicit safe failure state divided by eligible mobile funnel starts.",
    instrumentationGap: "Mobile funnel starts are not yet joined to durable outcomes in privacy-safe canonical cohorts.",
  },
  {
    key: "durable_funnel_completion_rate",
    label: "Durable funnel completion rate",
    category: "experience",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 50,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Eligible public funnel starts producing one durably stored, non-test lead divided by eligible starts.",
    instrumentationGap: "Funnel starts and durable lead creation are not yet joined into one privacy-safe deduplicated denominator.",
  },
  {
    key: "notification_failure_rate",
    label: "Internal notification failure rate",
    category: "trust",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Permanently failed internal notifications divided by terminal eligible internal notification attempts.",
  },
  {
    key: "email_bounce_rate",
    label: "Email bounce rate",
    category: "trust",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Provider-confirmed bounced eligible email deliveries divided by eligible terminal email sends.",
  },
  {
    key: "customer_complaint_rate",
    label: "Customer complaint rate",
    category: "trust",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Provider-confirmed customer complaints divided by eligible customer delivery confirmations.",
  },
  {
    key: "opt_out_rate",
    label: "Purpose-specific opt-out rate",
    category: "trust",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    requiresLiveDemand: true,
    targetCandidate: true,
    definition: "Recorded eligible opt-outs divided by delivered commercial messages for the same purpose and channel.",
    instrumentationGap: "Purpose-specific delivered-message denominators are not yet joined to suppression events.",
  },
] as const satisfies readonly GrowthBaselineMetricDefinition[];

export type GrowthBaselineMetricKey = (typeof GROWTH_BASELINE_METRICS)[number]["key"];

export interface GrowthBaselineMetricSnapshot {
  key: GrowthBaselineMetricKey;
  label: string;
  category: GrowthBaselineCategory;
  unit: GrowthBaselineUnit;
  direction: GrowthBaselineDirection;
  definition: string;
  state: GrowthBaselineState;
  value: number | null;
  sampleSize: number;
  minimumSampleSize: number;
  ownerReviewReady: boolean;
  reason: string;
}

export type GrowthTargetGate =
  | "activation_required"
  | "evidence_collecting"
  | "owner_review_possible"
  | "unavailable";

export interface GrowthBaselineReadinessRegister {
  generatedAt: string;
  windowDays: 30 | 90 | 365;
  targetEntryEnabled: false;
  gate: GrowthTargetGate;
  gateLabel: string;
  priorityAction: string;
  priorityHref: "/admin/distribution" | "/admin/growth";
  metrics: GrowthBaselineMetricSnapshot[];
  counts: Record<GrowthBaselineState, number>;
  ownerReviewReadyCount: number;
}

type Observation = {
  available: boolean;
  value: number | null;
  sampleSize: number;
  emptyReason: string;
};

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1_000) / 10;
}

function paidAndOwnedLeadCounts(growth: GrowthIntelligenceView) {
  return growth.channels.reduce((result, channel) => {
    if (channel.paid) result.paid += channel.leads;
    else result.owned += channel.leads;
    return result;
  }, { paid: 0, owned: 0 });
}

function observationFor(
  key: GrowthBaselineMetricKey,
  growth: GrowthIntelligenceView,
): Observation {
  const summary = growth.summary;
  const leadAggregateAvailable = growth.configured && !growth.error;
  const economicsAvailable = leadAggregateAvailable && growth.schemaReady;
  const outcomesAvailable = leadAggregateAvailable && growth.outcomeMetrics.configured;
  const deliveryAvailable = leadAggregateAvailable && growth.delivery.configured;
  const fieldAvailable = leadAggregateAvailable && growth.webVitals.configured;
  const portfolio = paidAndOwnedLeadCounts(growth);
  const spendPresent = economicsAvailable && growth.spendRowsRead > 0;

  switch (key) {
    case "eligible_live_lead_volume":
      return { available: leadAggregateAvailable, value: summary.leads, sampleSize: summary.leads, emptyReason: "No eligible live lead exists in the selected window." };
    case "useful_source_attribution_rate":
      return { available: leadAggregateAvailable, value: summary.leads ? summary.attributedLeadRate : null, sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "first_response_coverage_rate":
    case "agent_first_follow_up_rate":
      return { available: leadAggregateAvailable, value: percentage(summary.firstResponseSampleSize, summary.leads), sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "median_first_response_minutes":
      return { available: leadAggregateAvailable, value: summary.medianFirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, emptyReason: "No immutable first-response sample exists in the selected window." };
    case "p75_first_response_minutes":
      return { available: leadAggregateAvailable, value: summary.p75FirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, emptyReason: "No immutable first-response sample exists in the selected window." };
    case "p90_first_response_minutes":
      return { available: leadAggregateAvailable, value: summary.p90FirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, emptyReason: "No immutable first-response sample exists in the selected window." };
    case "qualification_rate":
      return { available: leadAggregateAvailable, value: percentage(summary.qualified, summary.leads), sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "appointment_set_rate":
      return { available: outcomesAvailable, value: percentage(growth.outcomeMetrics.appointmentSetLeads, summary.leads), sampleSize: summary.leads, emptyReason: "Eligible live leads and exact appointment outcomes are required." };
    case "signed_client_rate":
      return { available: outcomesAvailable, value: percentage(growth.outcomeMetrics.signedClientLeads, summary.leads), sampleSize: summary.leads, emptyReason: "Eligible live leads and exact agreement-signed outcomes are required." };
    case "close_rate":
      return { available: leadAggregateAvailable, value: percentage(summary.closes, summary.leads), sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "stale_lead_inventory":
      return { available: leadAggregateAvailable, value: summary.staleNurtureCandidates, sampleSize: summary.leads, emptyReason: "No eligible live inventory exists in the selected window." };
    case "speed_to_lead_risk_inventory":
      return { available: leadAggregateAvailable, value: summary.speedToLeadRisks, sampleSize: summary.leads, emptyReason: "No eligible live inventory exists in the selected window." };
    case "tracked_spend":
      return { available: economicsAvailable, value: spendPresent ? summary.spendUsd : null, sampleSize: growth.spendRowsRead, emptyReason: "No reconciled spend row exists in the selected window." };
    case "cost_per_lead":
      return { available: economicsAvailable, value: spendPresent ? summary.blendedCostPerLead : null, sampleSize: summary.leads, emptyReason: "Eligible live leads and reconciled spend are both required." };
    case "cost_per_qualified_lead":
      return { available: economicsAvailable, value: spendPresent ? summary.blendedCostPerQualifiedLead : null, sampleSize: summary.qualified, emptyReason: "Qualified live leads and reconciled spend are both required." };
    case "cost_per_appointment":
      return { available: economicsAvailable, value: spendPresent ? summary.blendedCostPerAppointment : null, sampleSize: summary.appointments, emptyReason: "Appointment progression and reconciled spend are both required." };
    case "cost_per_signed_client":
      return { available: economicsAvailable, value: spendPresent ? summary.blendedCostPerSignedClient : null, sampleSize: summary.agreements, emptyReason: "Signed-client outcomes and reconciled spend are both required." };
    case "cost_per_close":
      return { available: economicsAvailable, value: spendPresent ? summary.blendedCostPerClose : null, sampleSize: summary.closes, emptyReason: "Closed outcomes and reconciled spend are both required." };
    case "attributed_revenue":
      return { available: economicsAvailable, value: growth.outcomeRowsRead ? summary.attributedRevenueUsd : null, sampleSize: summary.closedRevenueRecordCount, emptyReason: "Actual brokerage-revenue outcome evidence is required." };
    case "recorded_referral_fees":
      return { available: economicsAvailable, value: summary.referralFeeExpectedCloseCount ? summary.referralFeesUsd : null, sampleSize: summary.referralFeeExpectedCloseCount, emptyReason: "No eligible portal or referral close currently requires fee evidence." };
    case "tracked_contribution":
      return { available: economicsAvailable, value: summary.trackedContributionUsd, sampleSize: summary.closes, emptyReason: "Complete spend, close-revenue, and applicable referral-fee evidence is required." };
    case "return_on_ad_spend":
      return { available: economicsAvailable, value: summary.returnOnAdSpend, sampleSize: summary.closes, emptyReason: "Complete spend and actual closed-revenue evidence is required." };
    case "owned_demand_share":
      return { available: leadAggregateAvailable, value: percentage(portfolio.owned, summary.leads), sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "rented_demand_share":
      return { available: leadAggregateAvailable, value: percentage(portfolio.paid, summary.leads), sampleSize: summary.leads, emptyReason: "A live lead denominator is required." };
    case "p75_largest_contentful_paint_ms":
      return { available: fieldAvailable, value: growth.webVitals.lcp.p75, sampleSize: growth.webVitals.lcp.sampleSize, emptyReason: "No eligible canonical Production LCP field observation exists." };
    case "p75_interaction_to_next_paint_ms":
      return { available: fieldAvailable, value: growth.webVitals.inp.p75, sampleSize: growth.webVitals.inp.sampleSize, emptyReason: "No eligible canonical Production INP field observation exists." };
    case "p75_cumulative_layout_shift":
      return { available: fieldAvailable, value: growth.webVitals.cls.p75, sampleSize: growth.webVitals.cls.sampleSize, emptyReason: "No eligible canonical Production CLS field observation exists." };
    case "notification_failure_rate":
      return { available: deliveryAvailable, value: percentage(growth.delivery.permanentInternalFailures, growth.delivery.terminalInternalNotifications), sampleSize: growth.delivery.terminalInternalNotifications, emptyReason: "No terminal eligible internal notification denominator exists." };
    case "email_bounce_rate":
      return { available: deliveryAvailable, value: percentage(growth.delivery.emailBounces, growth.delivery.eligibleEmailSends), sampleSize: growth.delivery.eligibleEmailSends, emptyReason: "No eligible terminal email-send denominator exists." };
    case "customer_complaint_rate":
      return { available: deliveryAvailable, value: percentage(growth.delivery.customerComplaints, growth.delivery.deliveredCustomerMessages), sampleSize: growth.delivery.deliveredCustomerMessages, emptyReason: "No eligible customer delivery-confirmation denominator exists." };
    default:
      return { available: leadAggregateAvailable, value: null, sampleSize: 0, emptyReason: "The canonical aggregate does not expose this evidence contract." };
  }
}

function stateFor(
  definition: GrowthBaselineMetricDefinition,
  growth: GrowthIntelligenceView,
  observation: Observation,
): Pick<GrowthBaselineMetricSnapshot, "state" | "value" | "ownerReviewReady" | "reason"> {
  if (definition.instrumentationGap) {
    return {
      state: "not_instrumented",
      value: null,
      ownerReviewReady: false,
      reason: definition.instrumentationGap,
    };
  }
  if (!observation.available) {
    return {
      state: "unavailable",
      value: null,
      ownerReviewReady: false,
      reason: growth.error || "The required canonical aggregate is unavailable in this environment.",
    };
  }
  if (definition.requiresLiveDemand && growth.summary.leads === 0) {
    return {
      state: "insufficient_sample",
      value: null,
      ownerReviewReady: false,
      reason: "No eligible non-test, non-suppressed live lead exists in the selected window. QA records cannot establish this baseline.",
    };
  }
  if (observation.value == null) {
    return {
      state: "insufficient_sample",
      value: null,
      ownerReviewReady: false,
      reason: observation.emptyReason,
    };
  }
  if (observation.sampleSize < definition.minimumSampleSize) {
    const directionalFloor = Math.max(1, Math.ceil(definition.minimumSampleSize * 0.25));
    const directional = observation.sampleSize >= directionalFloor;
    return {
      state: directional ? "directional" : "insufficient_sample",
      value: directional ? observation.value : null,
      ownerReviewReady: false,
      reason: `${observation.sampleSize} qualifying observations exist; ${definition.minimumSampleSize} are required for an operational baseline.`,
    };
  }
  return {
    state: "measured",
    value: observation.value,
    ownerReviewReady: definition.targetCandidate,
    reason: definition.targetCandidate
      ? "Canonical evidence meets the minimum threshold for owner review; no target is recorded or approved."
      : "Canonical evidence meets the minimum threshold for operational context; this metric is not a target candidate.",
  };
}

export function buildGrowthBaselineReadiness(
  growth: GrowthIntelligenceView,
): GrowthBaselineReadinessRegister {
  const metrics = GROWTH_BASELINE_METRICS.map((definition): GrowthBaselineMetricSnapshot => {
    const observation = observationFor(definition.key, growth);
    return {
      key: definition.key,
      label: definition.label,
      category: definition.category,
      unit: definition.unit,
      direction: definition.direction,
      definition: definition.definition,
      sampleSize: observation.sampleSize,
      minimumSampleSize: definition.minimumSampleSize,
      ...stateFor(definition, growth, observation),
    };
  });
  const counts = Object.fromEntries(
    GROWTH_BASELINE_STATES.map((state) => [
      state,
      metrics.filter((metric) => metric.state === state).length,
    ]),
  ) as Record<GrowthBaselineState, number>;
  const ownerReviewReadyCount = metrics.filter((metric) => metric.ownerReviewReady).length;

  let gate: GrowthTargetGate;
  let gateLabel: string;
  let priorityAction: string;
  let priorityHref: GrowthBaselineReadinessRegister["priorityHref"];

  if (!growth.configured || growth.error) {
    gate = "unavailable";
    gateLabel = "Canonical evidence unavailable";
    priorityAction = "Restore the canonical read-only Growth aggregate before evaluating baselines or targets.";
    priorityHref = "/admin/growth";
  } else if (growth.summary.leads === 0) {
    gate = "activation_required";
    gateLabel = "Activation evidence required";
    priorityAction = "Activate one already-approved owned-demand placement through the existing Distribution Command, record native publication proof, and wait for a genuine eligible lead. Do not set conversion or economics targets from QA rows.";
    priorityHref = "/admin/distribution";
  } else if (ownerReviewReadyCount === 0) {
    gate = "evidence_collecting";
    gateLabel = "Collecting an operational sample";
    priorityAction = "Continue the approved owned-demand flight and complete immutable response and outcome evidence until at least one metric reaches its documented sample threshold.";
    priorityHref = "/admin/distribution";
  } else {
    gate = "owner_review_possible";
    gateLabel = "Evidence ready for owner review";
    priorityAction = "Review measured baselines with the owner before proposing a numeric operating target. This page remains read-only and records no approval.";
    priorityHref = "/admin/growth";
  }

  return {
    generatedAt: growth.generatedAt,
    windowDays: growth.windowDays,
    targetEntryEnabled: false,
    gate,
    gateLabel,
    priorityAction,
    priorityHref,
    metrics,
    counts,
    ownerReviewReadyCount,
  };
}

export function formatGrowthBaselineValue(
  value: number | null,
  unit: GrowthBaselineUnit,
) {
  if (value == null) return "Not measured";
  if (unit === "percentage") return `${value}%`;
  if (unit === "minutes") return `${value} min`;
  if (unit === "milliseconds") return `${Math.round(value)} ms`;
  if (unit === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (unit === "ratio") return `${value}x`;
  if (unit === "score") {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
