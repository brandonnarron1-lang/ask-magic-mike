import { neon } from "@neondatabase/serverless";
import { evaluateExperiment, type ExperimentDecision } from "../growth/experiment-engine";
import {
  HOME_VALUE_TRUST_EXPERIMENT,
  simulateExperimentAllocation,
  validateExperimentDefinition,
} from "../growth/experiment-registry";

type Query = ReturnType<typeof neon>;
type Row = Record<string, unknown>;

export type ExperimentVariantMetrics = {
  key: string;
  label: string;
  weight: number;
  assignments: number;
  exposures: number;
  durableLeads: number;
  qualifiedLeads: number;
  appointments: number;
  guardrailBreaches: number;
  durableLeadRate: number | null;
  qualifiedAppointmentRate: number | null;
};

export type ExperimentCommandRecord = {
  id: string;
  experimentKey: string;
  name: string;
  surface: string;
  hypothesis: string;
  primaryMetric: string;
  status: string;
  approvalStatus: string;
  minimumSampleSize: number;
  practicalUpliftPercent: number;
  startsAt: string | null;
  endsAt: string | null;
  owner: string;
  decisionText: string | null;
  variants: ExperimentVariantMetrics[];
  evaluation: ExperimentDecision;
};

export type ExperimentCommandView = {
  configured: boolean;
  schemaReady: boolean;
  masterEnabled: boolean;
  generatedAt: string;
  windowDays: 30 | 90 | 365;
  error?: string;
  candidate: {
    definition: typeof HOME_VALUE_TRUST_EXPERIMENT;
    validation: ReturnType<typeof validateExperimentDefinition>;
    simulation: ReturnType<typeof simulateExperimentAllocation>;
  };
  experiments: ExperimentCommandRecord[];
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "t";
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableText(value: unknown) {
  const normalized = text(value).trim();
  return normalized || null;
}

function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round(numerator / denominator * 10_000) / 100 : null;
}

function candidateView(
  configured: boolean,
  schemaReady: boolean,
  windowDays: 30 | 90 | 365,
  now: Date,
  error?: string,
): ExperimentCommandView {
  return {
    configured,
    schemaReady,
    masterEnabled: process.env.PUBLIC_EXPERIMENTS_ENABLED === "true",
    generatedAt: now.toISOString(),
    windowDays,
    ...(error ? { error } : {}),
    candidate: {
      definition: HOME_VALUE_TRUST_EXPERIMENT,
      validation: validateExperimentDefinition(HOME_VALUE_TRUST_EXPERIMENT),
      simulation: simulateExperimentAllocation(HOME_VALUE_TRUST_EXPERIMENT),
    },
    experiments: [],
  };
}

function parseRegistryVariants(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Row;
    const key = text(row.key).trim();
    if (!key) return [];
    return [{ key, label: text(row.label, key), weight: numberValue(row.weight) }];
  });
}

export async function loadNeonExperimentCommand(
  windowDays: 30 | 90 | 365 = 90,
): Promise<ExperimentCommandView> {
  const now = new Date();
  const sql: Query | null = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  if (!sql) return candidateView(false, false, windowDays, now);
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const schemaRows = await sql.query(
      `SELECT
         to_regclass('public.growth_experiments') IS NOT NULL AS has_experiments,
         to_regclass('public.growth_experiment_assignments') IS NOT NULL AS has_assignments,
         to_regclass('public.growth_experiment_events') IS NOT NULL AS has_events`,
    ) as Row[];
    const schema = schemaRows[0] ?? {};
    const schemaReady = booleanValue(schema.has_experiments)
      && booleanValue(schema.has_assignments)
      && booleanValue(schema.has_events);
    if (!schemaReady) return candidateView(true, false, windowDays, now);

    const experimentRows = await sql.query(
      `SELECT id, experiment_key, name, surface, hypothesis, primary_metric,
              status, approval_status, variants, allocation, guardrails,
              minimum_sample_size, starts_at, ends_at, owner, decision, metadata
         FROM public.growth_experiments
        WHERE status <> 'archived'
        ORDER BY created_at DESC
        LIMIT 100`,
    ) as Row[];
    const metricRows = await sql.query(
      `WITH assignment_rollup AS (
         SELECT experiment_id, variant_key, COUNT(*)::integer AS assignments
           FROM public.growth_experiment_assignments
          GROUP BY experiment_id, variant_key
       ), event_rollup AS (
         SELECT e.experiment_id,
                e.variant_key,
                COUNT(*) FILTER (WHERE e.event_name = 'exposure')::integer AS exposures,
                COUNT(DISTINCT e.metadata->>'lead_id') FILTER (
                  WHERE e.event_name = 'lead_created' AND l.id IS NOT NULL
                )::integer AS durable_leads,
                COUNT(DISTINCT l.id) FILTER (
                  WHERE e.event_name = 'lead_created'
                    AND (COALESCE(l.score, 0) >= 60 OR COALESCE(l.conversion_stage, '') IN (
                      'qualified', 'appointment_requested', 'appointment_set', 'appointment_scheduled',
                      'appointment_confirmed', 'agreement_signed', 'under_contract', 'closed', 'won'
                    ))
                )::integer AS qualified_leads,
                COUNT(DISTINCT l.id) FILTER (
                  WHERE e.event_name = 'lead_created'
                    AND COALESCE(l.conversion_stage, '') IN (
                      'appointment_requested', 'appointment_set', 'appointment_scheduled',
                      'appointment_confirmed', 'agreement_signed', 'under_contract', 'closed', 'won'
                    )
                )::integer AS appointments,
                COUNT(*) FILTER (WHERE e.event_name = 'guardrail_breach')::integer AS guardrail_breaches
           FROM public.growth_experiment_events e
           LEFT JOIN public.leads l
             ON l.id::text = e.metadata->>'lead_id'
            AND l.is_test = false
            AND l.communication_suppressed = false
          WHERE e.occurred_at >= $1::timestamptz
          GROUP BY e.experiment_id, e.variant_key
       )
       SELECT COALESCE(a.experiment_id, e.experiment_id) AS experiment_id,
              COALESCE(a.variant_key, e.variant_key) AS variant_key,
              COALESCE(a.assignments, 0)::integer AS assignments,
              COALESCE(e.exposures, 0)::integer AS exposures,
              COALESCE(e.durable_leads, 0)::integer AS durable_leads,
              COALESCE(e.qualified_leads, 0)::integer AS qualified_leads,
              COALESCE(e.appointments, 0)::integer AS appointments,
              COALESCE(e.guardrail_breaches, 0)::integer AS guardrail_breaches
         FROM assignment_rollup a
         FULL OUTER JOIN event_rollup e
           ON e.experiment_id = a.experiment_id AND e.variant_key = a.variant_key
        LIMIT 500`,
      [cutoff],
    ) as Row[];
    const metricsByExperiment = new Map<string, Map<string, Row>>();
    for (const row of metricRows) {
      const experimentId = text(row.experiment_id);
      const variantKey = text(row.variant_key);
      if (!experimentId || !variantKey) continue;
      const variantMap = metricsByExperiment.get(experimentId) ?? new Map<string, Row>();
      variantMap.set(variantKey, row);
      metricsByExperiment.set(experimentId, variantMap);
    }

    const experiments = experimentRows.map((row): ExperimentCommandRecord => {
      const id = text(row.id);
      const minimumSampleSize = numberValue(row.minimum_sample_size, 100);
      const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Row : {};
      const practicalUpliftPercent = numberValue(metadata.minimum_relative_uplift_percent, 10);
      const metricMap = metricsByExperiment.get(id) ?? new Map<string, Row>();
      const variants = parseRegistryVariants(row.variants).map((variant): ExperimentVariantMetrics => {
        const metrics = metricMap.get(variant.key) ?? {};
        const assignments = numberValue(metrics.assignments);
        const exposures = numberValue(metrics.exposures);
        const durableLeads = numberValue(metrics.durable_leads);
        const qualifiedLeads = numberValue(metrics.qualified_leads);
        const appointments = numberValue(metrics.appointments);
        const guardrailBreaches = numberValue(metrics.guardrail_breaches);
        return {
          ...variant,
          assignments,
          exposures,
          durableLeads,
          qualifiedLeads,
          appointments,
          guardrailBreaches,
          durableLeadRate: safeRate(durableLeads, exposures),
          qualifiedAppointmentRate: safeRate(appointments, exposures),
        };
      });
      return {
        id,
        experimentKey: text(row.experiment_key),
        name: text(row.name),
        surface: text(row.surface),
        hypothesis: text(row.hypothesis),
        primaryMetric: text(row.primary_metric),
        status: text(row.status),
        approvalStatus: text(row.approval_status),
        minimumSampleSize,
        practicalUpliftPercent,
        startsAt: nullableText(row.starts_at),
        endsAt: nullableText(row.ends_at),
        owner: text(row.owner),
        decisionText: nullableText(row.decision),
        variants,
        evaluation: evaluateExperiment({
          variants: variants.map((variant) => ({
            key: variant.key,
            exposures: variant.exposures,
            conversions: variant.appointments,
            guardrailBreaches: variant.guardrailBreaches,
          })),
          minimumSampleSize,
          minimumRelativeUpliftPercent: practicalUpliftPercent,
        }),
      };
    });

    return {
      ...candidateView(true, true, windowDays, now),
      experiments,
    };
  } catch {
    return candidateView(true, false, windowDays, now, "Canonical Neon experiment query failed");
  }
}
