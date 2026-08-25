import { neon } from "@neondatabase/serverless";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION,
  localProfilePerformanceImportEnabled,
  localProfilePerformanceRowsForDatabase,
  localProfilePerformanceSummaryForDatabase,
  parseLocalProfilePerformanceCsv,
  type LocalProfilePerformanceIngressPreview,
} from "../growth/local-profile-performance-ingress";
import {
  growthDatabaseReadIdentityConfirmed,
  productionGrowthDatabaseIdentityConfirmed,
} from "./neonGrowthDatabaseIdentity";

type Row = Record<string, unknown>;

export interface LocalProfilePerformanceIngressQuery {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

export interface LocalProfilePerformanceImportReceipt {
  id: string;
  batchFingerprint: string;
  rowCount: number;
  insertedSignals: number;
  updatedSignals: number;
  unchangedSignals: number;
  insertedOpportunities: number;
  updatedOpportunities: number;
  unchangedOpportunities: number;
  impressionsTotal: number;
  interactionsTotal: number;
  interactionRate: number;
  websiteClicks: number;
  callClicks: number;
  directionRequests: number;
  conversations: number;
  bookings: number;
  dateStart: string;
  dateEnd: string;
  profileKey: string;
  dataState: string;
  approvalReference: string;
  importedBy: string;
  auditId: string;
  createdAt: string;
}

export interface LocalProfilePerformanceIngressState {
  configured: boolean;
  schemaReady: boolean;
  importEnabled: boolean;
  mutationAllowed: boolean;
  readIdentityConfirmed: boolean;
  productionIdentityConfirmed: boolean;
  receipts: LocalProfilePerformanceImportReceipt[];
  error?: string;
}

export type ImportLocalProfilePerformanceResult =
  | {
      ok: true;
      batchId: string;
      auditId: string;
      idempotentReplay: boolean;
      rowCount: number;
      insertedSignals: number;
      updatedSignals: number;
      unchangedSignals: number;
      insertedOpportunities: number;
      updatedOpportunities: number;
      unchangedOpportunities: number;
      preview: LocalProfilePerformanceIngressPreview;
    }
  | {
      ok: false;
      statusCode: 400 | 409 | 500 | 503;
      error: string;
      preview?: LocalProfilePerformanceIngressPreview;
    };

function queryFromEnv(
  env: Record<string, string | undefined> = process.env,
): LocalProfilePerformanceIngressQuery | null {
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

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function objectValue(value: unknown): Row | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null;
  } catch {
    return null;
  }
}

async function schemaReady(sql: LocalProfilePerformanceIngressQuery) {
  const result = rows(await sql.query(
    `SELECT
       to_regclass('public.market_signals') IS NOT NULL AS has_signals,
       to_regclass('public.market_opportunities') IS NOT NULL AS has_opportunities,
       to_regclass('public.local_profile_performance_import_batches') IS NOT NULL AS has_receipts,
       to_regprocedure('public.import_local_profile_performance_batch_v1(text,jsonb,jsonb,text,text,text)') IS NOT NULL AS has_function`,
  ));
  return booleanValue(result[0]?.has_signals) &&
    booleanValue(result[0]?.has_opportunities) &&
    booleanValue(result[0]?.has_receipts) &&
    booleanValue(result[0]?.has_function);
}

function normalizeReceipt(row: Row): LocalProfilePerformanceImportReceipt | null {
  const id = text(row.id).trim();
  const batchFingerprint = text(row.batch_fingerprint).trim();
  const auditId = text(row.audit_id).trim();
  if (!id || !/^[0-9a-f]{64}$/.test(batchFingerprint) || !auditId) return null;
  return {
    id,
    batchFingerprint,
    rowCount: numberValue(row.row_count),
    insertedSignals: numberValue(row.inserted_signals),
    updatedSignals: numberValue(row.updated_signals),
    unchangedSignals: numberValue(row.unchanged_signals),
    insertedOpportunities: numberValue(row.inserted_opportunities),
    updatedOpportunities: numberValue(row.updated_opportunities),
    unchangedOpportunities: numberValue(row.unchanged_opportunities),
    impressionsTotal: numberValue(row.impressions_total),
    interactionsTotal: numberValue(row.interactions_total),
    interactionRate: numberValue(row.interaction_rate),
    websiteClicks: numberValue(row.website_clicks),
    callClicks: numberValue(row.call_clicks),
    directionRequests: numberValue(row.direction_requests),
    conversations: numberValue(row.conversations),
    bookings: numberValue(row.bookings),
    dateStart: text(row.date_start),
    dateEnd: text(row.date_end),
    profileKey: text(row.profile_key),
    dataState: text(row.data_state),
    approvalReference: text(row.approval_reference),
    importedBy: text(row.imported_by),
    auditId,
    createdAt: text(row.created_at),
  };
}

export async function loadLocalProfilePerformanceIngressState(options: {
  query?: LocalProfilePerformanceIngressQuery | null;
  env?: Record<string, string | undefined>;
} = {}): Promise<LocalProfilePerformanceIngressState> {
  const env = options.env ?? process.env;
  const configured = options.query === undefined ? Boolean(env.DATABASE_URL) : Boolean(options.query);
  const readIdentityConfirmed = growthDatabaseReadIdentityConfirmed(env);
  const mutation = assertDatabaseMutationAllowed(env);
  const base = {
    configured,
    schemaReady: false,
    importEnabled: localProfilePerformanceImportEnabled(env),
    mutationAllowed: mutation.ok,
    readIdentityConfirmed,
    productionIdentityConfirmed: productionGrowthDatabaseIdentityConfirmed(env),
    receipts: [] as LocalProfilePerformanceImportReceipt[],
  };
  if (!readIdentityConfirmed) {
    return configured ? { ...base, error: "local_profile_database_identity_unconfirmed" } : base;
  }
  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) return base;

  try {
    if (!(await schemaReady(sql))) return base;
    const result = rows(await sql.query(
      `SELECT id, batch_fingerprint, row_count,
              inserted_signals, updated_signals, unchanged_signals,
              inserted_opportunities, updated_opportunities, unchanged_opportunities,
              impressions_total, interactions_total, interaction_rate,
              website_clicks, call_clicks, direction_requests, conversations, bookings,
              date_start, date_end, profile_key, data_state,
              approval_reference, imported_by, audit_id, created_at
         FROM public.local_profile_performance_import_batches
        ORDER BY created_at DESC
        LIMIT 25`,
    ));
    return {
      ...base,
      schemaReady: true,
      receipts: result
        .map(normalizeReceipt)
        .filter((value): value is LocalProfilePerformanceImportReceipt => Boolean(value)),
    };
  } catch {
    return { ...base, error: "local_profile_ingress_state_read_failed" };
  }
}

export async function importLocalProfilePerformanceCsv(input: {
  csv: string;
  batchFingerprint: string;
  approvalReference: string;
  confirmation: string;
  actor: string;
}, options: {
  query?: LocalProfilePerformanceIngressQuery | null;
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<ImportLocalProfilePerformanceResult> {
  const env = options.env ?? process.env;
  if (!localProfilePerformanceImportEnabled(env)) {
    return { ok: false, statusCode: 409, error: "local_profile_import_disabled" };
  }

  const mutation = assertDatabaseMutationAllowed(env);
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }
  if (!productionGrowthDatabaseIdentityConfirmed(env)) {
    return {
      ok: false,
      statusCode: 503,
      error: "local_profile_production_database_identity_unconfirmed",
    };
  }

  const preview = parseLocalProfilePerformanceCsv(input.csv, { now: options.now });
  if (!preview.ok || !preview.batchFingerprint) {
    return { ok: false, statusCode: 400, error: "local_profile_csv_invalid", preview };
  }
  if (preview.synthetic) {
    return { ok: false, statusCode: 400, error: "synthetic_local_profile_not_importable", preview };
  }
  if (input.batchFingerprint !== preview.batchFingerprint) {
    return { ok: false, statusCode: 409, error: "local_profile_preview_changed", preview };
  }
  if (input.confirmation !== LOCAL_PROFILE_PERFORMANCE_INGRESS_CONFIRMATION) {
    return { ok: false, statusCode: 400, error: "local_profile_confirmation_required", preview };
  }
  const approvalReference = input.approvalReference.trim();
  const actor = input.actor.trim();
  if (approvalReference.length < 4 || approvalReference.length > 160 || actor.length < 1 || actor.length > 180) {
    return { ok: false, statusCode: 400, error: "local_profile_import_metadata_invalid", preview };
  }

  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) {
    return { ok: false, statusCode: 503, error: "local_profile_import_store_not_configured", preview };
  }

  try {
    if (!(await schemaReady(sql))) {
      return { ok: false, statusCode: 503, error: "local_profile_import_schema_not_ready", preview };
    }
    const resultRows = rows(await sql.query(
      `SELECT public.import_local_profile_performance_batch_v1(
         $1, $2::jsonb, $3::jsonb, $4, $5, $6
       ) AS result`,
      [
        preview.batchFingerprint,
        JSON.stringify(localProfilePerformanceRowsForDatabase(preview.rows)),
        JSON.stringify(localProfilePerformanceSummaryForDatabase(preview)),
        actor,
        approvalReference,
        input.confirmation,
      ],
    ));
    const result = objectValue(resultRows[0]?.result);
    if (!result || result.ok !== true) {
      const error = text(result?.error) || "local_profile_import_failed";
      const statusCode = error.includes("conflict") ? 409 : error.startsWith("invalid_") ? 400 : 500;
      return { ok: false, statusCode, error, preview };
    }
    const batchId = text(result.batch_id);
    const auditId = text(result.audit_id);
    if (!batchId || !auditId) {
      return { ok: false, statusCode: 500, error: "local_profile_import_receipt_invalid", preview };
    }
    return {
      ok: true,
      batchId,
      auditId,
      idempotentReplay: booleanValue(result.idempotent_replay),
      rowCount: numberValue(result.row_count),
      insertedSignals: numberValue(result.inserted_signals),
      updatedSignals: numberValue(result.updated_signals),
      unchangedSignals: numberValue(result.unchanged_signals),
      insertedOpportunities: numberValue(result.inserted_opportunities),
      updatedOpportunities: numberValue(result.updated_opportunities),
      unchangedOpportunities: numberValue(result.unchanged_opportunities),
      preview,
    };
  } catch {
    return { ok: false, statusCode: 500, error: "local_profile_import_failed", preview };
  }
}
