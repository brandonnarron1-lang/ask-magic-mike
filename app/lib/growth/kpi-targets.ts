import { createHash } from "node:crypto";

import type { GrowthIntelligenceView } from "../persistence/neonGrowthIntelligenceView";

export const KPI_TARGET_STATUSES = ["draft", "approved", "retired"] as const;
export type KpiTargetStatus = (typeof KPI_TARGET_STATUSES)[number];

export const KPI_BASELINE_STATES = [
  "measured",
  "directional",
  "insufficient_sample",
  "not_instrumented",
  "unavailable",
] as const;
export type KpiBaselineState = (typeof KPI_BASELINE_STATES)[number];

export type KpiMetricUnit =
  | "percentage"
  | "minutes"
  | "milliseconds"
  | "count"
  | "usd"
  | "ratio"
  | "score";
export type KpiMetricDirection = "higher_is_better" | "lower_is_better";
export type KpiMetricCategory =
  | "acquisition"
  | "response"
  | "conversion"
  | "database"
  | "economics"
  | "portfolio"
  | "operations"
  | "experimentation"
  | "experience_and_conversion_quality"
  | "trust_and_delivery";

export const KPI_METRIC_DEFINITIONS = [
  {
    key: "useful_source_attribution_rate",
    label: "Useful source attribution rate",
    category: "acquisition",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with a canonical non-direct source divided by eligible live leads in the selected window.",
  },
  {
    key: "median_first_response_minutes",
    label: "Median first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Median minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "p75_first_response_minutes",
    label: "75th percentile first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "75th percentile minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "p90_first_response_minutes",
    label: "90th percentile first-human-response time",
    category: "response",
    unit: "minutes",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "90th percentile minutes from durable lead creation to the immutable first human response milestone.",
  },
  {
    key: "contactable_rate",
    label: "Contactable rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with at least one validated, permitted one-to-one contact path divided by eligible live leads.",
  },
  {
    key: "qualification_rate",
    label: "Qualification rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads reaching the deterministic qualified-or-later lifecycle set divided by eligible live leads.",
  },
  {
    key: "appointment_set_rate",
    label: "Appointment-set rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with an explicitly recorded appointment-set outcome in the selected window divided by eligible live leads in that window.",
  },
  {
    key: "appointment_held_rate",
    label: "Appointment-held rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with an explicitly recorded appointment-held outcome divided by eligible live leads.",
  },
  {
    key: "signed_client_rate",
    label: "Signed-client rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with an explicitly recorded signed-client outcome in the selected window divided by eligible live leads in that window.",
  },
  {
    key: "close_rate",
    label: "Close rate",
    category: "conversion",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads reaching the canonical closed-or-won outcome set divided by eligible live leads.",
  },
  {
    key: "stale_lead_inventory",
    label: "Stale lead inventory",
    category: "database",
    unit: "count",
    direction: "lower_is_better",
    minimumSampleSize: 0,
    definition: "Eligible non-terminal leads currently meeting the documented stale-nurture rule.",
  },
  {
    key: "database_reactivation_rate",
    label: "Database-reactivation rate",
    category: "database",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible reactivation cohort members reaching a documented response or qualified outcome divided by enrolled cohort members.",
  },
  {
    key: "cost_per_lead",
    label: "Cost per lead",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    definition: "Reconciled acquisition spend divided by eligible attributed live leads for the same window and scope.",
  },
  {
    key: "cost_per_qualified_lead",
    label: "Cost per qualified lead",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    definition: "Reconciled acquisition spend divided by eligible qualified live leads for the same window and scope.",
  },
  {
    key: "cost_per_appointment",
    label: "Cost per appointment progression",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    definition: "Reconciled acquisition spend divided by leads reaching the current appointment-requested-or-later lifecycle set.",
  },
  {
    key: "cost_per_signed_client",
    label: "Cost per signed client",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 5,
    definition: "Reconciled acquisition spend divided by explicitly recorded signed-client outcomes for the same selected window.",
  },
  {
    key: "cost_per_close",
    label: "Cost per close",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 3,
    definition: "Reconciled acquisition spend divided by canonical closed-or-won outcomes.",
  },
  {
    key: "attributed_revenue",
    label: "Attributed revenue",
    category: "economics",
    unit: "usd",
    direction: "higher_is_better",
    minimumSampleSize: 0,
    definition: "Revenue amount from eligible canonical outcome records in the selected window.",
  },
  {
    key: "referral_cost",
    label: "Referral cost",
    category: "economics",
    unit: "usd",
    direction: "lower_is_better",
    minimumSampleSize: 0,
    definition: "Explicit referral fees and costs attached to eligible canonical outcomes in the selected window.",
  },
  {
    key: "return_on_ad_spend",
    label: "Return on ad spend",
    category: "economics",
    unit: "ratio",
    direction: "higher_is_better",
    minimumSampleSize: 3,
    definition: "Attributed revenue divided by reconciled acquisition spend for the same window and scope.",
  },
  {
    key: "margin_after_acquisition_cost",
    label: "Margin after acquisition cost",
    category: "economics",
    unit: "usd",
    direction: "higher_is_better",
    minimumSampleSize: 3,
    definition: "Attributed gross margin less reconciled acquisition and referral costs when all components are supportable.",
  },
  {
    key: "owned_demand_share",
    label: "Owned-demand share",
    category: "portfolio",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads from non-paid first-party channels divided by eligible live leads.",
  },
  {
    key: "rented_demand_share",
    label: "Rented-demand share",
    category: "portfolio",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads from paid or portal channels divided by eligible live leads.",
  },
  {
    key: "agent_acceptance_rate",
    label: "Agent acceptance rate",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Assigned live leads explicitly accepted within the configured claim window divided by assigned live leads.",
  },
  {
    key: "agent_follow_up_rate",
    label: "Agent first-follow-up coverage",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible live leads with immutable first-human-response evidence divided by eligible live leads.",
  },
  {
    key: "agent_conversion_rate",
    label: "Agent conversion rate",
    category: "operations",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 20,
    definition: "Eligible assigned live leads reaching a closed outcome divided by eligible assigned live leads, attributed to evidence-backed ownership.",
  },
  {
    key: "experiment_velocity",
    label: "Experiment velocity",
    category: "experimentation",
    unit: "count",
    direction: "higher_is_better",
    minimumSampleSize: 0,
    definition: "Controlled experiments reaching a documented decision during the selected window.",
  },
  {
    key: "experiment_decision_quality",
    label: "Experiment decision quality",
    category: "experimentation",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 5,
    definition: "Completed experiments meeting assignment, sample, guardrail, and documented-decision requirements divided by completed experiments.",
  },
  {
    key: "p75_largest_contentful_paint_ms",
    label: "75th percentile Largest Contentful Paint",
    category: "experience_and_conversion_quality",
    unit: "milliseconds",
    direction: "lower_is_better",
    minimumSampleSize: 75,
    definition: "75th percentile LCP from deduplicated, canonical production field reports on approved public Ask Magic Mike routes; Preview, QA, automation, query strings, and consumer identifiers are excluded.",
  },
  {
    key: "p75_interaction_to_next_paint_ms",
    label: "75th percentile Interaction to Next Paint",
    category: "experience_and_conversion_quality",
    unit: "milliseconds",
    direction: "lower_is_better",
    minimumSampleSize: 50,
    definition: "75th percentile INP from deduplicated, canonical production field reports on approved public Ask Magic Mike routes; Preview, QA, automation, query strings, and consumer identifiers are excluded.",
  },
  {
    key: "p75_cumulative_layout_shift",
    label: "75th percentile Cumulative Layout Shift",
    category: "experience_and_conversion_quality",
    unit: "score",
    direction: "lower_is_better",
    minimumSampleSize: 75,
    definition: "75th percentile CLS score from deduplicated, canonical production field reports on approved public Ask Magic Mike routes; Preview, QA, automation, query strings, and consumer identifiers are excluded.",
  },
  {
    key: "critical_accessibility_issue_count",
    label: "Critical accessibility issue count",
    category: "experience_and_conversion_quality",
    unit: "count",
    direction: "lower_is_better",
    minimumSampleSize: 0,
    definition: "Open critical accessibility issues supported by documented automated checks and human evaluation across the canonical funnel; this metric is not an accessibility certification.",
  },
  {
    key: "mobile_funnel_technical_success_rate",
    label: "Mobile funnel technical-success rate",
    category: "experience_and_conversion_quality",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 50,
    definition: "Eligible mobile funnel starts reaching a durable success or explicit safe failure state divided by eligible mobile funnel starts, using privacy-safe canonical cohorts.",
  },
  {
    key: "durable_funnel_completion_rate",
    label: "Durable funnel completion rate",
    category: "experience_and_conversion_quality",
    unit: "percentage",
    direction: "higher_is_better",
    minimumSampleSize: 50,
    definition: "Eligible public funnel starts resulting in one durably stored, non-test lead divided by eligible public funnel starts, deduplicated by a privacy-safe canonical cohort key.",
  },
  {
    key: "notification_failure_rate",
    label: "Notification failure rate",
    category: "trust_and_delivery",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Final failed internal notification records divided by terminal attempted internal notification records, excluding test and suppressed leads.",
  },
  {
    key: "bounce_rate",
    label: "Email bounce rate",
    category: "trust_and_delivery",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Provider-confirmed bounced eligible email deliveries divided by eligible sent email deliveries.",
  },
  {
    key: "opt_out_rate",
    label: "Opt-out rate",
    category: "trust_and_delivery",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Recorded eligible opt-outs divided by eligible delivered commercial messages for the same purpose and channel.",
  },
  {
    key: "complaint_rate",
    label: "Complaint rate",
    category: "trust_and_delivery",
    unit: "percentage",
    direction: "lower_is_better",
    minimumSampleSize: 20,
    definition: "Provider-confirmed complaints divided by eligible delivered customer email messages.",
  },
] as const;

export type KpiMetricDefinition = (typeof KPI_METRIC_DEFINITIONS)[number];
export type KpiMetricKey = KpiMetricDefinition["key"];

export interface KpiBaselineSnapshot {
  metricKey: KpiMetricKey;
  state: KpiBaselineState;
  value: number | null;
  sampleSize: number;
  windowDays: 30 | 90 | 365;
  observedAt: string;
  evidence: Record<string, number | string | boolean | null>;
  evidenceSha256: string;
  reason: string;
}

export interface KpiTargetInput {
  metricKey: string;
  status: string;
  targetValue: string | number | null;
  rationale: string;
  approvalReference?: string | null;
  windowDays: number;
  actor: string;
  isTest?: boolean;
}

export type ValidatedKpiTarget = {
  metric: KpiMetricDefinition;
  status: KpiTargetStatus;
  targetValue: number | null;
  rationale: string;
  approvalReference: string | null;
  baseline: KpiBaselineSnapshot;
  actor: string;
  isTest: boolean;
  idempotencyKey: string;
};

export type KpiTargetValidation =
  | { ok: true; value: ValidatedKpiTarget }
  | { ok: false; error: string };

const UNSUPPORTED_REASONS: Partial<Record<KpiMetricKey, string>> = {
  contactable_rate: "Validated contactability is not yet exposed in the Growth Intelligence aggregate.",
  appointment_held_rate: "Appointment-held outcomes are not yet exposed as a distinct aggregate.",
  database_reactivation_rate: "The revival command identifies candidates, but cohort enrollment and response outcomes are not yet joined into one rate.",
  referral_cost: "Referral fees are not yet separated from revenue in the Growth Intelligence aggregate.",
  margin_after_acquisition_cost: "Gross margin and referral cost are not both available in the current aggregate.",
  agent_acceptance_rate: "Explicit assignment acceptance/claim evidence is not yet aggregated.",
  agent_conversion_rate: "Closed outcomes are not yet joined to evidence-backed owner history at agent grain.",
  experiment_velocity: "The aggregate reports running experiments, not decisions completed inside the selected window.",
  experiment_decision_quality: "Experiment assignment, sample, guardrail, and decision-quality checks are not yet aggregated.",
  critical_accessibility_issue_count: "Automated checks alone cannot establish accessibility. A canonical issue ledger joining automated findings with documented human evaluation is not yet instrumented.",
  mobile_funnel_technical_success_rate: "Funnel events are not yet joined by device into privacy-safe cohorts with durable success and explicit technical-failure outcomes.",
  durable_funnel_completion_rate: "Funnel starts and durable lead creation are not yet joined into one privacy-safe, deduplicated canonical cohort denominator.",
  opt_out_rate: "Purpose-specific delivered-message denominators are not yet joined to suppression events.",
};

function round(value: number, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? round(numerator / denominator * 100, 1) : null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(stableValue(value)), "utf8").digest("hex");
}

function metricDefinition(key: string): KpiMetricDefinition | null {
  return KPI_METRIC_DEFINITIONS.find((metric) => metric.key === key) ?? null;
}

function baselineValue(
  metric: KpiMetricDefinition,
  growth: GrowthIntelligenceView,
): {
  value: number | null;
  sampleSize: number;
  evidence: Record<string, number | string | boolean | null>;
} {
  const summary = growth.summary;
  const paidLeads = growth.channels.filter((channel) => channel.paid)
    .reduce((total, channel) => total + channel.leads, 0);
  const ownedLeads = growth.channels.filter((channel) => !channel.paid)
    .reduce((total, channel) => total + channel.leads, 0);

  switch (metric.key) {
    case "useful_source_attribution_rate":
      return { value: summary.attributedLeadRate, sampleSize: summary.leads, evidence: { eligible_leads: summary.leads } };
    case "median_first_response_minutes":
      return { value: summary.medianFirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, evidence: { response_coverage_rate: summary.firstResponseCoverageRate } };
    case "p75_first_response_minutes":
      return { value: summary.p75FirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, evidence: { response_coverage_rate: summary.firstResponseCoverageRate } };
    case "p90_first_response_minutes":
      return { value: summary.p90FirstResponseMinutes, sampleSize: summary.firstResponseSampleSize, evidence: { response_coverage_rate: summary.firstResponseCoverageRate } };
    case "qualification_rate":
      return { value: percentage(summary.qualified, summary.leads), sampleSize: summary.leads, evidence: { eligible_leads: summary.leads, qualified_leads: summary.qualified } };
    case "appointment_set_rate":
      return {
        value: percentage(growth.outcomeMetrics.appointmentSetLeads, summary.leads),
        sampleSize: summary.leads,
        evidence: {
          eligible_leads: summary.leads,
          appointment_set_leads: growth.outcomeMetrics.appointmentSetLeads,
        },
      };
    case "signed_client_rate":
      return {
        value: percentage(growth.outcomeMetrics.signedClientLeads, summary.leads),
        sampleSize: summary.leads,
        evidence: {
          eligible_leads: summary.leads,
          signed_client_leads: growth.outcomeMetrics.signedClientLeads,
        },
      };
    case "close_rate":
      return { value: percentage(summary.closes, summary.leads), sampleSize: summary.leads, evidence: { eligible_leads: summary.leads, closed_leads: summary.closes } };
    case "stale_lead_inventory":
      return { value: summary.staleNurtureCandidates, sampleSize: summary.leads, evidence: { eligible_leads: summary.leads } };
    case "cost_per_lead":
      return { value: summary.blendedCostPerLead, sampleSize: summary.leads, evidence: { eligible_leads: summary.leads, spend_usd: summary.spendUsd } };
    case "cost_per_qualified_lead":
      return { value: summary.qualified > 0 ? round(summary.spendUsd / summary.qualified) : null, sampleSize: summary.qualified, evidence: { qualified_leads: summary.qualified, spend_usd: summary.spendUsd } };
    case "cost_per_appointment":
      return { value: summary.blendedCostPerAppointment, sampleSize: summary.appointments, evidence: { appointment_progressions: summary.appointments, spend_usd: summary.spendUsd } };
    case "cost_per_signed_client":
      return {
        value: growth.outcomeMetrics.signedClientLeads > 0
          ? round(summary.spendUsd / growth.outcomeMetrics.signedClientLeads)
          : null,
        sampleSize: growth.outcomeMetrics.signedClientLeads,
        evidence: {
          signed_client_leads: growth.outcomeMetrics.signedClientLeads,
          spend_usd: summary.spendUsd,
        },
      };
    case "cost_per_close":
      return { value: summary.blendedCostPerClose, sampleSize: summary.closes, evidence: { closed_leads: summary.closes, spend_usd: summary.spendUsd } };
    case "attributed_revenue":
      return { value: summary.attributedRevenueUsd, sampleSize: growth.outcomeRowsRead, evidence: { outcome_rows: growth.outcomeRowsRead } };
    case "return_on_ad_spend":
      return { value: summary.returnOnAdSpend, sampleSize: summary.closes, evidence: { spend_usd: summary.spendUsd, attributed_revenue_usd: summary.attributedRevenueUsd, closed_leads: summary.closes } };
    case "owned_demand_share":
      return { value: percentage(ownedLeads, summary.leads), sampleSize: summary.leads, evidence: { owned_leads: ownedLeads, eligible_leads: summary.leads } };
    case "rented_demand_share":
      return { value: percentage(paidLeads, summary.leads), sampleSize: summary.leads, evidence: { rented_leads: paidLeads, eligible_leads: summary.leads } };
    case "agent_follow_up_rate":
      return { value: summary.firstResponseCoverageRate, sampleSize: summary.leads, evidence: { eligible_leads: summary.leads, first_response_samples: summary.firstResponseSampleSize } };
    case "notification_failure_rate":
      return {
        value: percentage(
          growth.delivery.permanentInternalFailures,
          growth.delivery.terminalInternalNotifications,
        ),
        sampleSize: growth.delivery.terminalInternalNotifications,
        evidence: {
          terminal_internal_notifications: growth.delivery.terminalInternalNotifications,
          permanent_internal_failures: growth.delivery.permanentInternalFailures,
        },
      };
    case "bounce_rate":
      return {
        value: percentage(growth.delivery.emailBounces, growth.delivery.eligibleEmailSends),
        sampleSize: growth.delivery.eligibleEmailSends,
        evidence: {
          eligible_email_sends: growth.delivery.eligibleEmailSends,
          email_bounces: growth.delivery.emailBounces,
        },
      };
    case "complaint_rate":
      return {
        value: percentage(
          growth.delivery.customerComplaints,
          growth.delivery.deliveredCustomerMessages,
        ),
        sampleSize: growth.delivery.deliveredCustomerMessages,
        evidence: {
          delivered_customer_messages: growth.delivery.deliveredCustomerMessages,
          customer_complaints: growth.delivery.customerComplaints,
        },
      };
    case "p75_largest_contentful_paint_ms":
      return {
        value: growth.webVitals.lcpP75Ms,
        sampleSize: growth.webVitals.lcpSampleSize,
        evidence: { field_reports: growth.webVitals.lcpSampleSize, aggregation: "p75", metric_code: "LCP", traffic_class: "public_production" },
      };
    case "p75_interaction_to_next_paint_ms":
      return {
        value: growth.webVitals.inpP75Ms,
        sampleSize: growth.webVitals.inpSampleSize,
        evidence: { field_reports: growth.webVitals.inpSampleSize, aggregation: "p75", metric_code: "INP", traffic_class: "public_production" },
      };
    case "p75_cumulative_layout_shift":
      return {
        value: growth.webVitals.clsP75,
        sampleSize: growth.webVitals.clsSampleSize,
        evidence: { field_reports: growth.webVitals.clsSampleSize, aggregation: "p75", metric_code: "CLS", traffic_class: "public_production" },
      };
    default:
      return { value: null, sampleSize: 0, evidence: {} };
  }
}

const CORE_WEB_VITAL_METRICS = new Set<KpiMetricKey>([
  "p75_largest_contentful_paint_ms",
  "p75_interaction_to_next_paint_ms",
  "p75_cumulative_layout_shift",
]);

const OUTCOME_METRICS = new Set<KpiMetricKey>([
  "appointment_set_rate",
  "signed_client_rate",
  "cost_per_signed_client",
]);

const DELIVERY_METRICS = new Set<KpiMetricKey>([
  "notification_failure_rate",
  "bounce_rate",
  "complaint_rate",
]);

export function buildKpiBaselineSnapshot(
  metricKey: KpiMetricKey,
  growth: GrowthIntelligenceView,
): KpiBaselineSnapshot {
  const metric = metricDefinition(metricKey);
  if (!metric) throw new Error("unknown_kpi_metric");
  const unsupportedReason = UNSUPPORTED_REASONS[metricKey];
  const core = baselineValue(metric, growth);
  let state: KpiBaselineState;
  let reason: string;

  if (unsupportedReason) {
    state = "not_instrumented";
    reason = unsupportedReason;
  } else if (
    CORE_WEB_VITAL_METRICS.has(metricKey) &&
    (!growth.webVitals.configured || growth.webVitals.error)
  ) {
    state = "unavailable";
    reason = growth.webVitals.error || "Canonical production field telemetry is not configured.";
  } else if (
    OUTCOME_METRICS.has(metricKey) &&
    (!growth.outcomeMetrics.configured || growth.outcomeMetrics.error)
  ) {
    state = "unavailable";
    reason = growth.outcomeMetrics.error || "Canonical outcome telemetry is not configured.";
  } else if (
    DELIVERY_METRICS.has(metricKey) &&
    (!growth.delivery.configured || growth.delivery.error)
  ) {
    state = "unavailable";
    reason = growth.delivery.error || "Canonical notification-delivery telemetry is not configured.";
  } else if (!growth.configured || growth.error || !growth.schemaReady) {
    state = "unavailable";
    reason = growth.error || "Canonical Growth Intelligence is not fully available for this observation.";
  } else if (core.value == null) {
    state = "insufficient_sample";
    reason = "The denominator or required spend/outcome evidence is empty in the selected window.";
  } else if (core.sampleSize < metric.minimumSampleSize) {
    state = !CORE_WEB_VITAL_METRICS.has(metricKey) && core.sampleSize >= Math.min(5, metric.minimumSampleSize)
      ? "directional"
      : "insufficient_sample";
    reason = `Only ${core.sampleSize} qualifying observations are available; ${metric.minimumSampleSize} are required for an operational baseline.`;
  } else {
    state = "measured";
    reason = "Canonical, non-test, non-suppressed data meets the metric's minimum evidence threshold.";
  }

  const hashInput = {
    metric_key: metricKey,
    state,
    value: state === "measured" || state === "directional" ? core.value : null,
    sample_size: core.sampleSize,
    window_days: growth.windowDays,
    evidence: core.evidence,
  };
  return {
    metricKey,
    state,
    value: state === "measured" || state === "directional" ? core.value : null,
    sampleSize: core.sampleSize,
    windowDays: growth.windowDays,
    observedAt: growth.generatedAt,
    evidence: core.evidence,
    evidenceSha256: sha256(hashInput),
    reason,
  };
}

export function buildKpiBaselineRegister(growth: GrowthIntelligenceView) {
  return KPI_METRIC_DEFINITIONS.map((metric) => buildKpiBaselineSnapshot(metric.key, growth));
}

function normalizeText(value: unknown, maxLength: number) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : "";
}

function targetNumber(value: string | number | null) {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? round(parsed, 4) : Number.NaN;
}

function targetInRange(value: number, unit: KpiMetricUnit) {
  if (value < 0) return false;
  if (unit === "percentage") return value <= 100;
  if (unit === "minutes") return value <= 10080;
  if (unit === "milliseconds") return value <= 600_000;
  if (unit === "count") return Number.isInteger(value) && value <= 1_000_000_000;
  if (unit === "usd") return value <= 1_000_000_000_000;
  if (unit === "score") return value <= 100;
  return value <= 1_000_000;
}

const PII_OR_SECRET = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b(?:api[_-]?key|password|secret|token|authorization)\b\s*[:=])/i;

export function validateKpiTarget(
  input: KpiTargetInput,
  baseline: KpiBaselineSnapshot,
): KpiTargetValidation {
  const metric = metricDefinition(input.metricKey);
  if (!metric || metric.key !== baseline.metricKey) return { ok: false, error: "invalid_kpi_metric" };
  if (!KPI_TARGET_STATUSES.includes(input.status as KpiTargetStatus)) return { ok: false, error: "invalid_kpi_target_status" };
  if (![30, 90, 365].includes(input.windowDays) || input.windowDays !== baseline.windowDays) {
    return { ok: false, error: "invalid_kpi_window" };
  }

  const status = input.status as KpiTargetStatus;
  const value = targetNumber(input.targetValue);
  if (Number.isNaN(value)) return { ok: false, error: "invalid_kpi_target_value" };
  if (value != null && !targetInRange(value, metric.unit)) return { ok: false, error: "invalid_kpi_target_value" };

  const rationale = normalizeText(input.rationale, 500);
  if (rationale.length < 20 || PII_OR_SECRET.test(rationale)) return { ok: false, error: "invalid_kpi_rationale" };
  const actor = normalizeText(input.actor, 180);
  if (!actor || PII_OR_SECRET.test(actor)) return { ok: false, error: "invalid_kpi_actor" };
  const approvalReference = normalizeText(input.approvalReference, 160) || null;
  if (approvalReference && PII_OR_SECRET.test(approvalReference)) return { ok: false, error: "invalid_kpi_approval_reference" };

  if (status === "draft" && approvalReference) {
    return { ok: false, error: "draft_kpi_target_cannot_claim_approval" };
  }
  if (status === "retired") {
    if (value != null) return { ok: false, error: "retired_kpi_target_must_clear_value" };
    if (!approvalReference || approvalReference.length < 4) {
      return { ok: false, error: "kpi_target_retirement_reference_required" };
    }
  }
  if (value != null && (baseline.state !== "measured" || baseline.value == null)) {
    return { ok: false, error: "measured_kpi_baseline_required" };
  }
  if (status === "approved") {
    if (value == null) return { ok: false, error: "approved_kpi_target_value_required" };
    if (baseline.state !== "measured" || baseline.value == null) {
      return { ok: false, error: "measured_kpi_baseline_required" };
    }
    if (!approvalReference || approvalReference.length < 4) {
      return { ok: false, error: "kpi_target_approval_reference_required" };
    }
  }

  const idempotencyKey = sha256({
    metric_key: metric.key,
    status,
    target_value: value,
    rationale,
    approval_reference: approvalReference,
    baseline_evidence_sha256: baseline.evidenceSha256,
    is_test: Boolean(input.isTest),
  });
  return {
    ok: true,
    value: {
      metric,
      status,
      targetValue: value,
      rationale,
      approvalReference,
      baseline,
      actor,
      isTest: Boolean(input.isTest),
      idempotencyKey,
    },
  };
}

export function formatKpiValue(value: number | null, unit: KpiMetricUnit) {
  if (value == null) return "Not measured";
  if (unit === "percentage") return `${value}%`;
  if (unit === "minutes") return `${value} min`;
  if (unit === "milliseconds") return `${Math.round(value)} ms`;
  if (unit === "usd") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  if (unit === "ratio") return `${value}x`;
  if (unit === "score") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
  return new Intl.NumberFormat("en-US").format(value);
}
