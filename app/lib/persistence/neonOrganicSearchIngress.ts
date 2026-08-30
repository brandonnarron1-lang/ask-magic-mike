import { neon } from "@neondatabase/serverless";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  ORGANIC_SEARCH_INGRESS_CONFIRMATION,
  organicSearchImportEnabled,
  organicSearchRowsForDatabase,
  parseOrganicSearchCsv,
  type OrganicSearchIngressPreview,
} from "../growth/organic-search-ingress";
import {
  growthDatabaseReadIdentityConfirmed,
  productionGrowthDatabaseIdentityConfirmed,
} from "./neonGrowthDatabaseIdentity";

type Row = Record<string, unknown>;

export interface OrganicSearchIngressQuery {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

export interface OrganicSearchImportReceipt {
  id: string;
  batchFingerprint: string;
  rowCount: number;
  insertedSignals: number;
  updatedSignals: number;
  unchangedSignals: number;
  opportunityRows: number;
  insertedOpportunities: number;
  updatedOpportunities: number;
  unchangedOpportunities: number;
  impressionsTotal: number;
  clicksTotal: number;
  ctrTotal: number;
  dateStart: string;
  dateEnd: string;
  siteProperties: string[];
  pageHosts: string[];
  approvalReference: string;
  importedBy: string;
  auditId: string;
  createdAt: string;
}

export interface OrganicSearchIngressState {
  configured: boolean;
  schemaReady: boolean;
  importEnabled: boolean;
  mutationAllowed: boolean;
  readIdentityConfirmed: boolean;
  productionIdentityConfirmed: boolean;
  receipts: OrganicSearchImportReceipt[];
  error?: string;
}

export type ImportOrganicSearchResult =
  | {
      ok: true;
      batchId: string;
      auditId: string;
      idempotentReplay: boolean;
      rowCount: number;
      insertedSignals: number;
      updatedSignals: number;
      unchangedSignals: number;
      opportunityRows: number;
      insertedOpportunities: number;
      updatedOpportunities: number;
      unchangedOpportunities: number;
      preview: OrganicSearchIngressPreview;
    }
  | {
      ok: false;
      statusCode: 400 | 409 | 500 | 503;
      error: string;
      preview?: OrganicSearchIngressPreview;
    };

function queryFromEnv(
  env: Record<string, string | undefined> = process.env,
): OrganicSearchIngressQuery | null {
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

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(text).filter(Boolean) : [];
  } catch {
    return [];
  }
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

async function schemaReady(sql: OrganicSearchIngressQuery) {
  const result = rows(await sql.query(
    `SELECT
       to_regclass('public.market_signals') IS NOT NULL AS has_signals,
       to_regclass('public.market_opportunities') IS NOT NULL AS has_opportunities,
       to_regclass('public.organic_search_import_batches') IS NOT NULL AS has_receipts,
       to_regprocedure('public.import_organic_search_batch_v1(text,jsonb,text,text,text)') IS NOT NULL AS has_function`,
  ));
  return booleanValue(result[0]?.has_signals) &&
    booleanValue(result[0]?.has_opportunities) &&
    booleanValue(result[0]?.has_receipts) &&
    booleanValue(result[0]?.has_function);
}

function normalizeReceipt(row: Row): OrganicSearchImportReceipt | null {
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
    opportunityRows: numberValue(row.opportunity_rows),
    insertedOpportunities: numberValue(row.inserted_opportunities),
    updatedOpportunities: numberValue(row.updated_opportunities),
    unchangedOpportunities: numberValue(row.unchanged_opportunities),
    impressionsTotal: numberValue(row.impressions_total),
    clicksTotal: numberValue(row.clicks_total),
    ctrTotal: numberValue(row.ctr_total),
    dateStart: text(row.date_start),
    dateEnd: text(row.date_end),
    siteProperties: stringArray(row.site_properties),
    pageHosts: stringArray(row.page_hosts),
    approvalReference: text(row.approval_reference),
    importedBy: text(row.imported_by),
    auditId,
    createdAt: text(row.created_at),
  };
}

export async function loadOrganicSearchIngressState(options: {
  query?: OrganicSearchIngressQuery | null;
  env?: Record<string, string | undefined>;
} = {}): Promise<OrganicSearchIngressState> {
  const env = options.env ?? process.env;
  const configured = options.query === undefined ? Boolean(env.DATABASE_URL) : Boolean(options.query);
  const readIdentityConfirmed = growthDatabaseReadIdentityConfirmed(env);
  const mutation = assertDatabaseMutationAllowed(env);
  const base = {
    configured,
    schemaReady: false,
    importEnabled: organicSearchImportEnabled(env),
    mutationAllowed: mutation.ok,
    readIdentityConfirmed,
    productionIdentityConfirmed: productionGrowthDatabaseIdentityConfirmed(env),
    receipts: [] as OrganicSearchImportReceipt[],
  };
  if (!readIdentityConfirmed) {
    return configured ? { ...base, error: "organic_search_database_identity_unconfirmed" } : base;
  }
  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) return base;

  try {
    if (!(await schemaReady(sql))) return base;
    const result = rows(await sql.query(
      `SELECT id, batch_fingerprint, row_count,
              inserted_signals, updated_signals, unchanged_signals,
              opportunity_rows, inserted_opportunities,
              updated_opportunities, unchanged_opportunities,
              impressions_total, clicks_total, ctr_total,
              date_start, date_end, site_properties, page_hosts,
              approval_reference, imported_by, audit_id, created_at
         FROM public.organic_search_import_batches
        ORDER BY created_at DESC
        LIMIT 25`,
    ));
    return {
      ...base,
      schemaReady: true,
      receipts: result.map(normalizeReceipt).filter((value): value is OrganicSearchImportReceipt => Boolean(value)),
    };
  } catch {
    return { ...base, error: "organic_search_ingress_state_read_failed" };
  }
}

export async function importOrganicSearchCsv(input: {
  csv: string;
  batchFingerprint: string;
  approvalReference: string;
  confirmation: string;
  actor: string;
}, options: {
  query?: OrganicSearchIngressQuery | null;
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<ImportOrganicSearchResult> {
  const env = options.env ?? process.env;
  if (!organicSearchImportEnabled(env)) {
    return { ok: false, statusCode: 409, error: "organic_search_import_disabled" };
  }

  const mutation = assertDatabaseMutationAllowed(env);
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }
  if (!productionGrowthDatabaseIdentityConfirmed(env)) {
    return {
      ok: false,
      statusCode: 503,
      error: "organic_search_production_database_identity_unconfirmed",
    };
  }

  const preview = parseOrganicSearchCsv(input.csv, { now: options.now });
  if (!preview.ok || !preview.batchFingerprint) {
    return { ok: false, statusCode: 400, error: "organic_search_csv_invalid", preview };
  }
  if (preview.synthetic) {
    return { ok: false, statusCode: 400, error: "synthetic_organic_search_not_importable", preview };
  }
  if (input.batchFingerprint !== preview.batchFingerprint) {
    return { ok: false, statusCode: 409, error: "organic_search_preview_changed", preview };
  }
  if (input.confirmation !== ORGANIC_SEARCH_INGRESS_CONFIRMATION) {
    return { ok: false, statusCode: 400, error: "organic_search_confirmation_required", preview };
  }
  const approvalReference = input.approvalReference.trim();
  const actor = input.actor.trim();
  if (approvalReference.length < 4 || approvalReference.length > 160 || actor.length < 1 || actor.length > 180) {
    return { ok: false, statusCode: 400, error: "organic_search_import_metadata_invalid", preview };
  }

  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) {
    return { ok: false, statusCode: 503, error: "organic_search_import_store_not_configured", preview };
  }

  try {
    if (!(await schemaReady(sql))) {
      return { ok: false, statusCode: 503, error: "organic_search_import_schema_not_ready", preview };
    }
    const resultRows = rows(await sql.query(
      `SELECT public.import_organic_search_batch_v1(
         $1, $2::jsonb, $3, $4, $5
       ) AS result`,
      [
        preview.batchFingerprint,
        JSON.stringify(organicSearchRowsForDatabase(preview.rows)),
        actor,
        approvalReference,
        input.confirmation,
      ],
    ));
    const result = objectValue(resultRows[0]?.result);
    if (!result || result.ok !== true) {
      const error = text(result?.error) || "organic_search_import_failed";
      const statusCode = error.includes("conflict") ? 409 : error.startsWith("invalid_") ? 400 : 500;
      return { ok: false, statusCode, error, preview };
    }
    const batchId = text(result.batch_id);
    const auditId = text(result.audit_id);
    if (!batchId || !auditId) {
      return { ok: false, statusCode: 500, error: "organic_search_import_receipt_invalid", preview };
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
      opportunityRows: numberValue(result.opportunity_rows),
      insertedOpportunities: numberValue(result.inserted_opportunities),
      updatedOpportunities: numberValue(result.updated_opportunities),
      unchangedOpportunities: numberValue(result.unchanged_opportunities),
      preview,
    };
  } catch {
    return { ok: false, statusCode: 500, error: "organic_search_import_failed", preview };
  }
}
