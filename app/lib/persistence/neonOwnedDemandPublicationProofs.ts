import { neon } from "@neondatabase/serverless";
import { assertDatabaseMutationAllowed } from "../../../src/lib/preview-security";
import {
  normalizeOwnedDemandPublicEvidenceUrl,
  validateOwnedDemandPublicationProof,
  type OwnedDemandPublicationProofInput,
  type OwnedDemandPlatformState,
  type OwnedDemandProofType,
} from "../growth/publication-proof";
import { currentWordPressChoice, wordpressAcquisitionGroup, wordpressTrackedChoices } from "../growth/wordpress-placement-catalog";
import type { OwnedDemandPlacementKey } from "../growth/owned-demand";

type Row = Record<string, unknown>;

export interface OwnedDemandPublicationQuery {
  query(text: string, params?: unknown[]): Promise<unknown>;
}

export interface OwnedDemandPublicationProofRow {
  id: string;
  channelKey: string;
  placementKey: OwnedDemandPlacementKey;
  platformState: OwnedDemandPlatformState;
  proofType: OwnedDemandProofType;
  campaignKey: string;
  source: string;
  medium: string;
  content: string;
  trackedUrl: string;
  evidenceUrl: string | null;
  evidenceReference: string | null;
  finalCopySha256: string;
  creativeAssetKey: string | null;
  approvalReference: string;
  observedAt: string;
  recordedBy: string;
  createdAt: string;
}

export interface OwnedDemandPublicationProofLedger {
  configured: boolean;
  schemaReady: boolean;
  generatedAt: string;
  proofs: OwnedDemandPublicationProofRow[];
  error?: string;
}

export type RecordOwnedDemandPublicationProofResult =
  | {
      ok: true;
      proofId: string;
      auditId: string | null;
      idempotentReplay: boolean;
    }
  | {
      ok: false;
      statusCode: 400 | 500 | 503;
      error: string;
    };

function queryFromEnv(
  env: Record<string, string | undefined> = process.env,
): OwnedDemandPublicationQuery | null {
  return env.DATABASE_URL ? neon(env.DATABASE_URL) : null;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((row): row is Row => Boolean(row && typeof row === "object")) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nullableText(value: unknown) {
  const normalized = text(value).trim();
  return normalized || null;
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const normalized = text(value).trim();
  return normalized || new Date(0).toISOString();
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseJsonObject(value: unknown): Row | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Row : null;
  } catch {
    return null;
  }
}

function normalizeProof(row: Row): OwnedDemandPublicationProofRow | null {
  const id = text(row.id).trim();
  const channelKey = text(row.channel_key).trim();
  const placementKey = text(row.placement_key).trim() as OwnedDemandPlacementKey;
  const platformState = text(row.platform_state).trim() as OwnedDemandPlatformState;
  const proofType = text(row.proof_type).trim() as OwnedDemandProofType;
  if (!id || !channelKey || !placementKey || !platformState || !proofType) return null;
  return {
    id,
    channelKey,
    placementKey,
    platformState,
    proofType,
    campaignKey: text(row.campaign_key),
    source: text(row.utm_source),
    medium: text(row.utm_medium),
    content: text(row.utm_content),
    trackedUrl: text(row.tracked_url),
    evidenceUrl: normalizeOwnedDemandPublicEvidenceUrl(channelKey, nullableText(row.evidence_url)),
    evidenceReference: nullableText(row.evidence_reference),
    finalCopySha256: text(row.final_copy_sha256),
    creativeAssetKey: nullableText(row.creative_asset_key),
    approvalReference: text(row.approval_reference),
    observedAt: timestamp(row.observed_at),
    recordedBy: text(row.recorded_by),
    createdAt: timestamp(row.created_at),
  };
}

async function schemaReady(sql: OwnedDemandPublicationQuery) {
  const result = rows(await sql.query(
    "SELECT to_regclass('public.owned_demand_publication_proofs') IS NOT NULL AS ready",
  ));
  return booleanValue(result[0]?.ready);
}

export async function loadOwnedDemandPublicationProofLedger(options: {
  query?: OwnedDemandPublicationQuery | null;
  env?: Record<string, string | undefined>;
  now?: Date;
} = {}): Promise<OwnedDemandPublicationProofLedger> {
  const now = options.now || new Date();
  const sql = options.query === undefined ? queryFromEnv(options.env) : options.query;
  if (!sql) {
    return { configured: false, schemaReady: false, generatedAt: now.toISOString(), proofs: [] };
  }
  try {
    if (!(await schemaReady(sql))) {
      return { configured: true, schemaReady: false, generatedAt: now.toISOString(), proofs: [] };
    }
    const result = rows(await sql.query(
      `SELECT id, channel_key, placement_key, platform_state, proof_type,
              campaign_key, utm_source, utm_medium, utm_content, tracked_url,
              evidence_url, evidence_reference, final_copy_sha256,
              creative_asset_key, approval_reference, observed_at, recorded_by,
              created_at
         FROM public.owned_demand_publication_proofs
        WHERE is_test = false
        ORDER BY observed_at DESC, created_at DESC
        LIMIT 250`,
    ));
    return {
      configured: true,
      schemaReady: true,
      generatedAt: now.toISOString(),
      proofs: result.map(normalizeProof).filter((proof): proof is OwnedDemandPublicationProofRow => Boolean(proof)),
    };
  } catch {
    return {
      configured: true,
      schemaReady: false,
      generatedAt: now.toISOString(),
      proofs: [],
      error: "publication_proof_read_failed",
    };
  }
}

export async function recordOwnedDemandPublicationProof(
  input: OwnedDemandPublicationProofInput,
  options: {
    query?: OwnedDemandPublicationQuery | null;
    env?: Record<string, string | undefined>;
    now?: Date;
  } = {},
): Promise<RecordOwnedDemandPublicationProofResult> {
  const now = options.now || new Date();
  const group = input.channelKey === "ourtown_wordpress" ? wordpressAcquisitionGroup(input.placementKey) : undefined;
  const urls = input.observedTrackedUrls ?? (input.observedTrackedUrl ? [input.observedTrackedUrl] : []);
  if (group && group.destinations.length > 1) {
    const choices = urls.map(url => currentWordPressChoice(group.key, url));
    if (urls.length !== group.destinations.length || choices.some(choice => !choice) || new Set(choices.map(choice => choice?.trackedUrl)).size !== group.destinations.length) return { ok: false, statusCode: 400, error: "complete_choice_group_required" };
  } else if (urls.length > 1) return { ok: false, statusCode: 400, error: "one_observed_destination_required" };
  // Fixed catalog order makes replay independent of line/query ordering.
  const ordered = group && group.destinations.length > 1 ? wordpressTrackedChoices(group.key).map(choice => choice.trackedUrl) : [urls[0]];
  const validations = ordered.map(observedTrackedUrl => validateOwnedDemandPublicationProof({ ...input, observedTrackedUrl }, now));
  const validated = validations[0];
  if (!validated.ok) return { ok: false, statusCode: 400, error: validated.error };
  for (const value of validations) if (!value.ok) return { ok: false, statusCode: 400, error: value.error };

  const mutation = assertDatabaseMutationAllowed(options.env);
  if (!mutation.ok) return { ok: false, statusCode: mutation.statusCode, error: mutation.error };

  const sql = options.query === undefined ? queryFromEnv(options.env) : options.query;
  if (!sql) return { ok: false, statusCode: 503, error: "publication_proof_store_not_configured" };

  try {
    if (!(await schemaReady(sql))) {
      return { ok: false, statusCode: 503, error: "publication_proof_schema_not_ready" };
    }
    const parameters = validations.map(value => {
      if (!value.ok) throw new Error("invalid_choice_group");
      const proof=value.value;
      return [proof.idempotencyKey, proof.placement.channelKey, proof.placement.placementKey,
        proof.platformState, proof.proofType, proof.placement.campaign, proof.placement.source,
        proof.placement.medium, proof.placement.content, proof.placement.trackedUrl,
        proof.evidenceUrl, proof.evidenceReference, proof.finalCopySha256, proof.creativeAssetKey,
        proof.approvalReference, proof.observedAt, proof.actor, proof.isTest];
    });
    if (parameters.length > 1) {
      // One PostgreSQL statement/transaction, existing RPC only. A failed RPC
      // result raises division-by-zero, rolling back ALL proof/audit rows.
      const calls=parameters.map((_, i) => `SELECT public.record_owned_demand_publication_proof_v1(${Array.from({length:18},(_,j)=>`$${i*18+j+1}${j===15?"::timestamptz":""}`).join(",")}) AS result`).join(" UNION ALL ");
      const aggregate=rows(await sql.query(`WITH receipts AS MATERIALIZED (${calls}) SELECT jsonb_agg(result) AS results, 1/min(COALESCE((result->>'ok')::boolean,false)::int) AS atomic_guard FROM receipts`,parameters.flat()));
      const results=rows(aggregate[0]?.results);
      if(results.length!==parameters.length || results.some(result=>result.ok!==true || !text(result.proof_id))) return {ok:false,statusCode:500,error:"publication_proof_record_failed"};
      return {ok:true,proofId:text(results[0].proof_id),auditId:nullableText(results[0].audit_id),idempotentReplay:results.every(result=>booleanValue(result.idempotent_replay))};
    }
    const proof = validated.value;
    const resultRows = rows(await sql.query(
      `SELECT public.record_owned_demand_publication_proof_v1(
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16::timestamptz, $17, $18
       ) AS result`,
      [
        proof.idempotencyKey,
        proof.placement.channelKey,
        proof.placement.placementKey,
        proof.platformState,
        proof.proofType,
        proof.placement.campaign,
        proof.placement.source,
        proof.placement.medium,
        proof.placement.content,
        proof.placement.trackedUrl,
        proof.evidenceUrl,
        proof.evidenceReference,
        proof.finalCopySha256,
        proof.creativeAssetKey,
        proof.approvalReference,
        proof.observedAt,
        proof.actor,
        proof.isTest,
      ],
    ));
    const result = parseJsonObject(resultRows[0]?.result);
    if (!result || result.ok !== true || !text(result.proof_id)) {
      return {
        ok: false,
        statusCode: result?.error === "invalid_publication_proof" ? 400 : 500,
        error: text(result?.error) || "publication_proof_record_failed",
      };
    }
    return {
      ok: true,
      proofId: text(result.proof_id),
      auditId: nullableText(result.audit_id),
      idempotentReplay: booleanValue(result.idempotent_replay),
    };
  } catch {
    return { ok: false, statusCode: 500, error: "publication_proof_record_failed" };
  }
}
