import { neon } from "@neondatabase/serverless";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import { computeNeonEndpointAttestation } from "../../../src/lib/security/neon-endpoint-identity";
import {
  SPEND_INGRESS_CONFIRMATION,
  parseMarketingSpendCsv,
  spendImportEnabled,
  spendRowsForDatabase,
  type SpendIngressPreview,
} from "../growth/spend-ingress";

type Row = Record<string, unknown>;

export interface MarketingSpendIngressQuery {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

export interface MarketingSpendImportReceipt {
  id: string;
  batchFingerprint: string;
  rowCount: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  spendUsdTotal: number;
  dateStart: string;
  dateEnd: string;
  sourceSystems: string[];
  approvalReference: string;
  importedBy: string;
  auditId: string;
  createdAt: string;
}

export interface MarketingSpendIngressState {
  configured: boolean;
  schemaReady: boolean;
  importEnabled: boolean;
  mutationAllowed: boolean;
  readIdentityConfirmed: boolean;
  productionIdentityConfirmed: boolean;
  receipts: MarketingSpendImportReceipt[];
  error?: string;
}

export type ImportMarketingSpendResult =
  | {
      ok: true;
      batchId: string;
      auditId: string;
      idempotentReplay: boolean;
      rowCount: number;
      insertedRows: number;
      updatedRows: number;
      unchangedRows: number;
      preview: SpendIngressPreview;
    }
  | {
      ok: false;
      statusCode: 400 | 409 | 500 | 503;
      error: string;
      preview?: SpendIngressPreview;
    };

function queryFromEnv(
  env: Record<string, string | undefined> = process.env,
): MarketingSpendIngressQuery | null {
  return env.DATABASE_URL ? neon(env.DATABASE_URL) : null;
}

export function productionSpendDatabaseIdentityConfirmed(
  env: Record<string, string | undefined> = process.env,
) {
  const vercelEnvironment = (env.VERCEL_ENV ?? "").trim().toLowerCase();
  const databaseEnvironment = (env.DATABASE_ENV ?? "").trim().toLowerCase();
  const endpoint = computeNeonEndpointAttestation(env);
  return vercelEnvironment === "production" &&
    databaseEnvironment === "production" &&
    endpoint.endpoint_identity_configured &&
    endpoint.endpoint_ids_distinct &&
    endpoint.database_neon_endpoint_resolved &&
    endpoint.production_endpoint_match &&
    !endpoint.preview_endpoint_match;
}

export function spendDatabaseReadIdentityConfirmed(
  env: Record<string, string | undefined> = process.env,
) {
  const vercelEnvironment = (env.VERCEL_ENV ?? "").trim().toLowerCase();
  const databaseEnvironment = (env.DATABASE_ENV ?? "").trim().toLowerCase();
  const endpoint = computeNeonEndpointAttestation(env);
  const identityFoundation = endpoint.endpoint_identity_configured &&
    endpoint.endpoint_ids_distinct && endpoint.database_neon_endpoint_resolved;
  if (!identityFoundation || vercelEnvironment !== databaseEnvironment) return false;
  if (vercelEnvironment === "production") {
    return endpoint.production_endpoint_match && !endpoint.preview_endpoint_match;
  }
  if (vercelEnvironment === "preview") {
    return endpoint.preview_endpoint_match && !endpoint.production_endpoint_match;
  }
  return false;
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

async function schemaReady(sql: MarketingSpendIngressQuery) {
  const result = rows(await sql.query(
    `SELECT
       to_regclass('public.marketing_spend_import_batches') IS NOT NULL AS has_receipts,
       to_regprocedure('public.import_marketing_spend_batch_v1(text,jsonb,text,text,text)') IS NOT NULL AS has_function`,
  ));
  return booleanValue(result[0]?.has_receipts) && booleanValue(result[0]?.has_function);
}

function normalizeReceipt(row: Row): MarketingSpendImportReceipt | null {
  const id = text(row.id).trim();
  const batchFingerprint = text(row.batch_fingerprint).trim();
  const auditId = text(row.audit_id).trim();
  if (!id || !/^[0-9a-f]{64}$/.test(batchFingerprint) || !auditId) return null;
  return {
    id,
    batchFingerprint,
    rowCount: numberValue(row.row_count),
    insertedRows: numberValue(row.inserted_rows),
    updatedRows: numberValue(row.updated_rows),
    unchangedRows: numberValue(row.unchanged_rows),
    spendUsdTotal: numberValue(row.spend_usd_total),
    dateStart: text(row.date_start),
    dateEnd: text(row.date_end),
    sourceSystems: stringArray(row.source_systems),
    approvalReference: text(row.approval_reference),
    importedBy: text(row.imported_by),
    auditId,
    createdAt: text(row.created_at),
  };
}

export async function loadMarketingSpendIngressState(options: {
  query?: MarketingSpendIngressQuery | null;
  env?: Record<string, string | undefined>;
} = {}): Promise<MarketingSpendIngressState> {
  const env = options.env ?? process.env;
  const configured = options.query === undefined ? Boolean(env.DATABASE_URL) : Boolean(options.query);
  const readIdentityConfirmed = spendDatabaseReadIdentityConfirmed(env);
  const mutation = assertDatabaseMutationAllowed(env);
  const base = {
    configured,
    schemaReady: false,
    importEnabled: spendImportEnabled(env),
    mutationAllowed: mutation.ok,
    readIdentityConfirmed,
    productionIdentityConfirmed: productionSpendDatabaseIdentityConfirmed(env),
    receipts: [] as MarketingSpendImportReceipt[],
  };
  if (!readIdentityConfirmed) {
    return configured ? { ...base, error: "spend_database_identity_unconfirmed" } : base;
  }
  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) return base;

  try {
    if (!(await schemaReady(sql))) return base;
    const result = rows(await sql.query(
      `SELECT id, batch_fingerprint, row_count,
              inserted_rows, updated_rows, unchanged_rows,
              spend_usd_total, date_start, date_end, source_systems,
              approval_reference, imported_by, audit_id, created_at
         FROM public.marketing_spend_import_batches
        ORDER BY created_at DESC
        LIMIT 25`,
    ));
    return {
      ...base,
      schemaReady: true,
      receipts: result.map(normalizeReceipt).filter((value): value is MarketingSpendImportReceipt => Boolean(value)),
    };
  } catch {
    return { ...base, error: "spend_ingress_state_read_failed" };
  }
}

export async function importMarketingSpendCsv(input: {
  csv: string;
  batchFingerprint: string;
  approvalReference: string;
  confirmation: string;
  actor: string;
}, options: {
  query?: MarketingSpendIngressQuery | null;
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<ImportMarketingSpendResult> {
  const env = options.env ?? process.env;
  if (!spendImportEnabled(env)) {
    return { ok: false, statusCode: 409, error: "spend_import_disabled" };
  }

  const mutation = assertDatabaseMutationAllowed(env);
  if (!mutation.ok) {
    return { ok: false, statusCode: mutation.statusCode, error: mutation.error };
  }
  if (!productionSpendDatabaseIdentityConfirmed(env)) {
    return {
      ok: false,
      statusCode: 503,
      error: "spend_production_database_identity_unconfirmed",
    };
  }

  const preview = parseMarketingSpendCsv(input.csv, { now: options.now });
  if (!preview.ok || !preview.batchFingerprint) {
    return { ok: false, statusCode: 400, error: "spend_csv_invalid", preview };
  }
  if (preview.synthetic) {
    return { ok: false, statusCode: 400, error: "synthetic_spend_not_importable", preview };
  }
  if (input.batchFingerprint !== preview.batchFingerprint) {
    return { ok: false, statusCode: 409, error: "spend_preview_changed", preview };
  }
  if (input.confirmation !== SPEND_INGRESS_CONFIRMATION) {
    return { ok: false, statusCode: 400, error: "spend_confirmation_required", preview };
  }
  const approvalReference = input.approvalReference.trim();
  const actor = input.actor.trim();
  if (approvalReference.length < 4 || approvalReference.length > 160 || actor.length < 1 || actor.length > 180) {
    return { ok: false, statusCode: 400, error: "spend_import_metadata_invalid", preview };
  }

  const sql = options.query === undefined ? queryFromEnv(env) : options.query;
  if (!sql) {
    return { ok: false, statusCode: 503, error: "spend_import_store_not_configured", preview };
  }

  try {
    if (!(await schemaReady(sql))) {
      return { ok: false, statusCode: 503, error: "spend_import_schema_not_ready", preview };
    }
    const resultRows = rows(await sql.query(
      `SELECT public.import_marketing_spend_batch_v1(
         $1, $2::jsonb, $3, $4, $5
       ) AS result`,
      [
        preview.batchFingerprint,
        JSON.stringify(spendRowsForDatabase(preview.rows)),
        actor,
        approvalReference,
        input.confirmation,
      ],
    ));
    const result = objectValue(resultRows[0]?.result);
    if (!result || result.ok !== true) {
      const error = text(result?.error) || "spend_import_failed";
      const statusCode = error.includes("conflict") ? 409 : error.startsWith("invalid_") ? 400 : 500;
      return { ok: false, statusCode, error, preview };
    }
    const batchId = text(result.batch_id);
    const auditId = text(result.audit_id);
    if (!batchId || !auditId) {
      return { ok: false, statusCode: 500, error: "spend_import_receipt_invalid", preview };
    }
    return {
      ok: true,
      batchId,
      auditId,
      idempotentReplay: booleanValue(result.idempotent_replay),
      rowCount: numberValue(result.row_count),
      insertedRows: numberValue(result.inserted_rows),
      updatedRows: numberValue(result.updated_rows),
      unchangedRows: numberValue(result.unchanged_rows),
      preview,
    };
  } catch {
    return { ok: false, statusCode: 500, error: "spend_import_failed", preview };
  }
}
