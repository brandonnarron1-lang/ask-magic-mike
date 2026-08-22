import { neon } from "@neondatabase/serverless";

import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  KPI_BASELINE_STATES,
  KPI_METRIC_DEFINITIONS,
  KPI_TARGET_STATUSES,
  buildKpiBaselineSnapshot,
  validateKpiTarget,
  type KpiBaselineState,
  type KpiMetricDirection,
  type KpiMetricKey,
  type KpiMetricUnit,
  type KpiTargetInput,
  type KpiTargetStatus,
} from "../growth/kpi-targets";
import {
  loadNeonGrowthIntelligence,
  type GrowthIntelligenceView,
} from "./neonGrowthIntelligenceView";

type Row = Record<string, unknown>;

export interface GrowthKpiTargetQuery {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

export interface GrowthKpiTargetVersionRow {
  id: string;
  metricKey: KpiMetricKey;
  metricUnit: KpiMetricUnit;
  direction: KpiMetricDirection;
  status: KpiTargetStatus;
  targetValue: number | null;
  baselineValue: number | null;
  baselineState: KpiBaselineState;
  baselineSampleSize: number;
  baselineWindowDays: 30 | 90 | 365;
  baselineEvidenceSha256: string;
  baselineObservedAt: string;
  rationale: string;
  approvalReference: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface GrowthKpiTargetRegister {
  configured: boolean;
  schemaReady: boolean;
  generatedAt: string;
  versions: GrowthKpiTargetVersionRow[];
  latestByMetric: Partial<Record<KpiMetricKey, GrowthKpiTargetVersionRow>>;
  error?: string;
}

export type RecordGrowthKpiTargetResult =
  | {
      ok: true;
      versionId: string;
      auditId: string | null;
      idempotentReplay: boolean;
    }
  | {
      ok: false;
      statusCode: 400 | 409 | 500 | 503;
      error: string;
    };

function queryFromEnv(
  env: Record<string, string | undefined> = process.env,
): GrowthKpiTargetQuery | null {
  return env.DATABASE_URL ? neon(env.DATABASE_URL) : null;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((row): row is Row => Boolean(row && typeof row === "object"))
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nullableText(value: unknown) {
  const normalized = text(value).trim();
  return normalized || null;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return text(value).trim() || new Date(0).toISOString();
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseResult(value: unknown): Row | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null;
  } catch {
    return null;
  }
}

function isMetricKey(value: string): value is KpiMetricKey {
  return KPI_METRIC_DEFINITIONS.some((metric) => metric.key === value);
}

function isMetricUnit(value: string): value is KpiMetricUnit {
  return ["percentage", "minutes", "milliseconds", "count", "usd", "ratio", "score"].includes(value);
}

function isDirection(value: string): value is KpiMetricDirection {
  return value === "higher_is_better" || value === "lower_is_better";
}

function isTargetStatus(value: string): value is KpiTargetStatus {
  return KPI_TARGET_STATUSES.includes(value as KpiTargetStatus);
}

function isBaselineState(value: string): value is KpiBaselineState {
  return KPI_BASELINE_STATES.includes(value as KpiBaselineState);
}

function normalizeVersion(row: Row): GrowthKpiTargetVersionRow | null {
  const metricKey = text(row.metric_key).trim();
  const metricUnit = text(row.metric_unit).trim();
  const direction = text(row.direction).trim();
  const status = text(row.status).trim();
  const baselineState = text(row.baseline_state).trim();
  const windowDays = numberValue(row.baseline_window_days);
  if (
    !text(row.id).trim() ||
    !isMetricKey(metricKey) ||
    !isMetricUnit(metricUnit) ||
    !isDirection(direction) ||
    !isTargetStatus(status) ||
    !isBaselineState(baselineState) ||
    ![30, 90, 365].includes(windowDays)
  ) return null;

  return {
    id: text(row.id).trim(),
    metricKey,
    metricUnit,
    direction,
    status,
    targetValue: nullableNumber(row.target_value),
    baselineValue: nullableNumber(row.baseline_value),
    baselineState,
    baselineSampleSize: numberValue(row.baseline_sample_size),
    baselineWindowDays: windowDays as 30 | 90 | 365,
    baselineEvidenceSha256: text(row.baseline_evidence_sha256).trim(),
    baselineObservedAt: timestamp(row.baseline_observed_at),
    rationale: text(row.rationale).trim(),
    approvalReference: nullableText(row.approval_reference),
    recordedBy: text(row.recorded_by).trim(),
    createdAt: timestamp(row.created_at),
  };
}

export async function loadGrowthKpiTargetRegister(options: {
  query?: GrowthKpiTargetQuery | null;
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<GrowthKpiTargetRegister> {
  const now = options.now ?? new Date();
  const sql = options.query === undefined ? queryFromEnv(options.env) : options.query;
  const empty = (configured: boolean, error?: string): GrowthKpiTargetRegister => ({
    configured,
    schemaReady: false,
    generatedAt: now.toISOString(),
    versions: [],
    latestByMetric: {},
    ...(error ? { error } : {}),
  });
  if (!sql) return empty(false);

  try {
    const readiness = rows(await sql.query(
      `SELECT
         to_regclass('public.growth_kpi_target_versions') IS NOT NULL
         AND to_regprocedure('public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)') IS NOT NULL
           AS ready`,
    ));
    if (!booleanValue(readiness[0]?.ready)) return empty(true);

    const result = rows(await sql.query(
      `SELECT id, metric_key, metric_unit, direction, status, target_value,
              baseline_value, baseline_state, baseline_sample_size,
              baseline_window_days, baseline_evidence_sha256,
              baseline_observed_at, rationale, approval_reference,
              recorded_by, created_at
         FROM public.growth_kpi_target_versions
        WHERE is_test = false
        ORDER BY created_at DESC, id DESC
        LIMIT 500`,
    ));
    const versions = result.map(normalizeVersion).filter((row): row is GrowthKpiTargetVersionRow => Boolean(row));
    const latestByMetric: Partial<Record<KpiMetricKey, GrowthKpiTargetVersionRow>> = {};
    for (const version of versions) {
      if (!latestByMetric[version.metricKey]) latestByMetric[version.metricKey] = version;
    }
    return {
      configured: true,
      schemaReady: true,
      generatedAt: now.toISOString(),
      versions,
      latestByMetric,
    };
  } catch {
    return empty(true, "Canonical Neon KPI target register query failed");
  }
}

export async function recordGrowthKpiTarget(
  input: KpiTargetInput,
  options: {
    query?: GrowthKpiTargetQuery | null;
    env?: Record<string, string | undefined>;
    now?: Date;
    growth?: GrowthIntelligenceView;
  } = {},
): Promise<RecordGrowthKpiTargetResult> {
  const env = options.env ?? process.env;
  const mutation = assertDatabaseMutationAllowed(env);
  if (!mutation.ok) return { ok: false, statusCode: 503, error: mutation.error };
  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) return { ok: false, statusCode: 503, error: "database_not_configured" };
  const metric = KPI_METRIC_DEFINITIONS.find((candidate) => candidate.key === input.metricKey);
  if (!metric || ![30, 90, 365].includes(input.windowDays)) {
    return { ok: false, statusCode: 400, error: "invalid_kpi_metric_or_window" };
  }

  const growth = options.growth ?? await loadNeonGrowthIntelligence(input.windowDays as 30 | 90 | 365);
  const baseline = buildKpiBaselineSnapshot(metric.key, growth);
  const validation = validateKpiTarget(input, baseline);
  if (!validation.ok) return { ok: false, statusCode: 400, error: validation.error };

  try {
    const readiness = rows(await sql.query(
      `SELECT
         to_regclass('public.growth_kpi_target_versions') IS NOT NULL
         AND to_regprocedure('public.record_growth_kpi_target_version_v1(text,text,text,text,numeric,text,text,numeric,text,integer,integer,text,text,timestamptz,text,boolean)') IS NOT NULL
           AS ready`,
    ));
    if (!booleanValue(readiness[0]?.ready)) {
      return { ok: false, statusCode: 409, error: "kpi_target_schema_not_ready" };
    }

    const value = validation.value;
    const resultRows = rows(await sql.query(
      `SELECT public.record_growth_kpi_target_version_v1(
         $1::text, $2::text, $3::text, $4::text, $5::numeric,
         $6::text, $7::text, $8::numeric, $9::text, $10::integer,
         $11::integer, $12::text, $13::text, $14::timestamptz, $15::text, $16::boolean
       ) AS result`,
      [
        value.idempotencyKey,
        value.metric.key,
        value.metric.unit,
        value.metric.direction,
        value.targetValue,
        value.status,
        value.baseline.state,
        value.baseline.value,
        value.baseline.evidenceSha256,
        value.baseline.sampleSize,
        value.baseline.windowDays,
        value.rationale,
        value.approvalReference,
        value.baseline.observedAt,
        value.actor,
        value.isTest,
      ],
    ));
    const result = parseResult(resultRows[0]?.result);
    if (!result || !booleanValue(result.ok)) {
      return { ok: false, statusCode: 400, error: text(result?.error).trim() || "kpi_target_recording_failed" };
    }
    return {
      ok: true,
      versionId: text(result.version_id).trim(),
      auditId: nullableText(result.audit_id),
      idempotentReplay: booleanValue(result.idempotent_replay),
    };
  } catch {
    return { ok: false, statusCode: 500, error: "kpi_target_recording_failed" };
  }
}
