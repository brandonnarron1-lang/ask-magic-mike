import { neon } from "@neondatabase/serverless";
import { createHash, randomUUID } from "node:crypto";
import { hasLeadCenterPermission, isLeadCenterRole, type LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";
import { isPreviewDataDisabled, isPreviewRuntime } from "../../../src/lib/preview-security";
import { computeNeonEndpointAttestation } from "../../../src/lib/security/neon-endpoint-identity";
import { ACQUISITION_PLACEMENTS, acquisitionTimestamp, MAX_ACQUISITION_RANGE_MS, type AcquisitionWindow } from "../growth/acquisition-window";

export const ACQUISITION_STATEMENT_TIMEOUT_MS = 5_000;
export const ACQUISITION_OPERATOR_FIELDS = ["inquiriesWithEnvelope", "noV6Recorded", "envelopes", "providerAccepted", "delivered", "pending", "retry", "failed", "unknown"] as const;
export type AcquisitionOperatorCounts = Record<(typeof ACQUISITION_OPERATOR_FIELDS)[number], number>;
export type AcquisitionCounts = { inquiries: number; contacts: number; unresolved: number; unknownOperatorEnvelopes: number; mike: AcquisitionOperatorCounts; brandon: AcquisitionOperatorCounts };
export const ACQUISITION_SOURCE_GROUPS = ["social", "direct", "other", "unknown"] as const;
export type AcquisitionSourceGroup = (typeof ACQUISITION_SOURCE_GROUPS)[number];
export type AcquisitionReport = {
  coverage: "complete" | "unavailable" | "stale"; reason?: string; window: AcquisitionWindow;
  generatedAt: string | null; scope: "all_eligible" | "assigned_workspace"; totals: AcquisitionCounts | null;
  placements: Array<{ key: string; counts: AcquisitionCounts }>;
  allSources?: { totals: AcquisitionCounts; sources: Array<{ key: AcquisitionSourceGroup; counts: AcquisitionCounts }> } | null;
};

/** One snapshot, bounded aggregate output. Never return an inquiry/contact ID,
 * free text, recipient, address, URL supplied by a client, or callback row. */
export const ACQUISITION_AGGREGATE_SQL = `WITH catalog AS (
  SELECT key FROM jsonb_to_recordset($3::jsonb) AS p(key text)
), access AS MATERIALIZED (
  SELECT count(*)=3 AND bool_and(NOT row_security_active(c.oid) AND has_table_privilege(current_user,c.oid,'SELECT')) AS allowed
  FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
  WHERE ns.nspname='public' AND c.relname IN ('leads','source_attribution','lead_notifications')
), cohort AS MATERIALIZED (
  SELECT l.id, l.contact_id, p.key
  FROM public.leads l
  LEFT JOIN LATERAL (
    SELECT a.utm_source,a.utm_medium,a.utm_campaign,a.utm_content
    FROM public.source_attribution a WHERE a.lead_id=l.id
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1
  ) a ON true
  JOIN catalog p ON a.utm_source='ourtownproperties' AND a.utm_medium='owned_media'
    AND a.utm_campaign='amm_owned_demand_2026' AND a.utm_content=p.key
  WHERE l.created_at >= $1::timestamptz AND l.created_at < $2::timestamptz
    AND l.is_test=false AND l.communication_suppressed=false
    AND l.status NOT IN ('spam','test','internal_qa')
    AND ($4::text='all' OR p.key=$4)
    AND ($5::uuid IS NULL OR l.assigned_agent_id=$5::uuid)
), envelopes AS MATERIALIZED (
  SELECT n.id,c.id AS inquiry_id,c.key,
    CASE n.metadata->>'operator' WHEN 'mike' THEN 'mike' WHEN 'brandon' THEN 'brandon' ELSE 'unknown' END AS operator,
    (n.provider_accepted_at IS NOT NULL OR (n.status='sent' AND n.provider_message_id IS NOT NULL)) AS accepted,
    CASE WHEN n.status IN ('failed','permanently_failed','skipped') OR n.metadata->>'provider_terminal_failure'='true' THEN 'failed'
      WHEN n.metadata->>'provider_delivery_confirmed'='true' THEN 'delivered'
      WHEN n.provider_accepted_at IS NOT NULL OR (n.status='sent' AND n.provider_message_id IS NOT NULL) THEN 'accepted'
      WHEN n.status='pending' THEN 'pending' WHEN n.status='retry_scheduled' THEN 'retry' ELSE 'unknown' END AS state
  FROM cohort c JOIN public.lead_notifications n ON n.lead_id=c.id
  WHERE n.template_version='lead_alert_email_v6' AND n.notification_type='lead_alert'
    AND n.channel='email' AND n.recipient_type='internal'
), dimensions AS (
  SELECT 'all'::text AS key UNION ALL SELECT key FROM catalog WHERE $4::text='all' OR key=$4
), inquiries AS (
  SELECT d.key,count(c.id)::bigint AS inquiries,count(DISTINCT c.contact_id)::bigint AS contacts,
    count(c.id) FILTER(WHERE c.contact_id IS NULL)::bigint AS unresolved
  FROM dimensions d LEFT JOIN cohort c ON d.key='all' OR d.key=c.key GROUP BY d.key
), operators AS (
  SELECT d.key,o.operator,
    count(e.id)::bigint AS envelopes,count(DISTINCT e.inquiry_id)::bigint AS represented,
    count(e.id) FILTER(WHERE e.accepted)::bigint AS accepted,
    count(e.id) FILTER(WHERE e.state='delivered')::bigint AS delivered,
    count(e.id) FILTER(WHERE e.state='pending')::bigint AS pending,
    count(e.id) FILTER(WHERE e.state='retry')::bigint AS retry,
    count(e.id) FILTER(WHERE e.state='failed')::bigint AS failed,
    count(e.id) FILTER(WHERE e.state IN ('unknown','accepted'))::bigint AS unknown
  FROM dimensions d CROSS JOIN (VALUES ('mike'),('brandon'),('unknown')) o(operator)
  LEFT JOIN envelopes e ON (d.key='all' OR d.key=e.key) AND e.operator=o.operator
  GROUP BY d.key,o.operator
)
SELECT i.key,i.inquiries,i.contacts,i.unresolved,o.operator,o.envelopes,o.represented,o.accepted,
  o.delivered,o.pending,o.retry,o.failed,o.unknown,
  (SELECT allowed FROM access) AS access_allowed,transaction_timestamp() AS generated_at
FROM inquiries i JOIN operators o ON o.key=i.key ORDER BY i.key,o.operator`;

// Derive only the source dimension and remove ONLY the WordPress placement
// restriction. Eligibility, assignment, distinct grains and operator states stay
// byte-for-byte shared with the historic query above. No raw attribution leaves SQL.
function replaceSqlOnce(sql: string, before: string, after: string) {
  if (sql.split(before).length !== 2) throw new Error("acquisition_source_query_contract_drift");
  return sql.replace(before, after);
}
let sourceSql = replaceSqlOnce(ACQUISITION_AGGREGATE_SQL,
  "SELECT key FROM jsonb_to_recordset($3::jsonb) AS p(key text)",
  "SELECT key FROM (VALUES ('social'),('direct'),('other'),('unknown')) AS p(key)");
sourceSql = replaceSqlOnce(sourceSql, "SELECT l.id, l.contact_id, p.key", `SELECT l.id, l.contact_id,
    CASE
      WHEN lower(btrim(coalesce(a.utm_source,''))) IN ('facebook','facebook_page','facebook_personal','facebook_group','fb','facebook.com','m.facebook.com','l.facebook.com','lm.facebook.com','instagram','ig','instagram.com','threads','threads.net','linkedin','li','linkedin.com','lnkd.in','x','twitter','x.com','twitter.com','t.co','youtube','yt','youtube.com','youtu.be','nextdoor')
        OR lower(btrim(coalesce(a.utm_medium,''))) IN ('social','social_organic','organic_social','paid_social','social_paid')
        OR lower(btrim(coalesce(a.referrer_type,'')))='social' THEN 'social'
      WHEN lower(btrim(coalesce(a.utm_source,''))) IN ('direct','(direct)')
        OR (coalesce(nullif(btrim(a.utm_source),''),nullif(btrim(a.utm_medium),'')) IS NULL AND lower(btrim(a.referrer_type))='direct') THEN 'direct'
      WHEN lower(btrim(coalesce(a.utm_source,''))) IN ('','unknown','(not set)','(none)')
        AND lower(btrim(coalesce(a.utm_medium,''))) IN ('','unknown','(not set)','(none)')
        AND lower(btrim(coalesce(a.referrer_type,''))) IN ('','unknown','(not set)','(none)') THEN 'unknown'
      ELSE 'other' END AS key`);
sourceSql = replaceSqlOnce(sourceSql, "SELECT a.utm_source,a.utm_medium,a.utm_campaign,a.utm_content", "SELECT a.utm_source,a.utm_medium,a.utm_campaign,a.utm_content,a.referrer_type");
sourceSql = replaceSqlOnce(sourceSql, `  JOIN catalog p ON a.utm_source='ourtownproperties' AND a.utm_medium='owned_media'
    AND a.utm_campaign='amm_owned_demand_2026' AND a.utm_content=p.key\n`, "");
sourceSql = replaceSqlOnce(sourceSql, "    AND ($4::text='all' OR p.key=$4)\n", "");
sourceSql = replaceSqlOnce(sourceSql, "SELECT 'all'::text AS key UNION ALL SELECT key FROM catalog WHERE $4::text='all' OR key=$4", "SELECT 'all'::text AS key UNION ALL SELECT key FROM catalog");
export const ACQUISITION_SOURCE_AGGREGATE_SQL = sourceSql;
// One SQL response and the existing RepeatableRead transaction: never stitch
// separately timed snapshots. Maximum 12 historic + 15 source aggregate rows.
export const ACQUISITION_WITH_SOURCES_SQL = `WITH wordpress_report AS (
${ACQUISITION_AGGREGATE_SQL}
), source_report AS (
${ACQUISITION_SOURCE_AGGREGATE_SQL}
)
SELECT * FROM wordpress_report
UNION ALL
SELECT 'source:' || key,inquiries,contacts,unresolved,operator,envelopes,represented,accepted,
  delivered,pending,retry,failed,unknown,access_allowed,generated_at FROM source_report`;

type AggregateQuery = (text: string, params: unknown[]) => Promise<unknown>;
// Pinned-driver diagnostic label is checked against the installed lockfile in tests.
export const ACQUISITION_DRIVER = "@neondatabase/serverless@1.1.0";
type Diagnostic = Record<string, unknown>;
class InvalidAggregate extends Error { constructor(readonly condition: string) { super("invalid_aggregate"); } }
const kind = (value: unknown): string => value === null ? "null" : Array.isArray(value) ? "array" : value instanceof Date ? "date" : typeof value;
const validCount = (value: unknown, field: string): number => {
  if ((typeof value !== "string" && typeof value !== "number") || value === "") throw new InvalidAggregate(`count_type:${field}`);
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new InvalidAggregate(`count_value:${field}`); return n;
};

export async function loadAcquisitionReport(window: AcquisitionWindow, principal: LeadCenterPrincipal | null,
  options: { query?: AggregateQuery; now?: Date; onDiagnostic?: (event: Diagnostic) => void } = {}): Promise<AcquisitionReport> {
  const started = performance.now(), binding = computeNeonEndpointAttestation(process.env);
  const preview = isPreviewRuntime();
  const trace: Diagnostic = { schema: 1, correlation: randomUUID(), queryId: "acquisition.aggregate.v1", stage: "gate", aggregateExecution: "not_attempted",
    source: /^[a-f0-9]{40}$/.test(process.env.VERCEL_GIT_COMMIT_SHA ?? "") ? process.env.VERCEL_GIT_COMMIT_SHA : "local",
    deploymentFingerprint: process.env.VERCEL_URL ? createHash("sha256").update(process.env.VERCEL_URL).digest("hex").slice(0,16) : "local",
    runtime: process.versions.node, driver: ACQUISITION_DRIVER, targetBinding: binding.preview_endpoint_identity_confirmed,
    transaction: { readOnly: true, isolationLevel: "RepeatableRead", fullResults: false, arrayMode: false } };
  const emit = (condition: string) => {
    const elapsedMs = Math.round(performance.now()-started);
    const event = { ...trace, condition, elapsedMs, ...(trace.stage === "validation" ? { validationMs: Math.max(0,elapsedMs-Number(trace.gateMs)-Number(trace.queryMs)) } : {}) };
    // No raw error, SQL, parameters, contact data, session or connection URL.
    // At most query-start and final event; diagnostics never change the result.
    try { if (options.onDiagnostic) options.onDiagnostic(event); else if (preview) console.info("AMM_ACQUISITION_REPORT", JSON.stringify(event)); } catch { /* logging is not a data dependency */ }
  };
  const scope = principal?.role === "primary_lead_owner" ? "assigned_workspace" : "all_eligible";
  const empty = (reason: string, condition: string): AcquisitionReport => { emit(condition); return { coverage: "unavailable", reason, window, scope, generatedAt: null, totals: null, placements: [], allSources: null }; };
  if (!principal || !isLeadCenterRole(principal.role) || !hasLeadCenterPermission(principal.role, "report:view")) return empty("Report permission required; no query executed.", "gate:permission");
  if (isPreviewDataDisabled()) return empty("Preview data is disconnected or its physical isolation is unverified; no query executed.", "gate:preview_binding");
  if (scope === "assigned_workspace" && (!principal.agentId || !/^[a-f0-9-]{36}$/i.test(principal.agentId))) return empty("Assigned-workspace identity is unavailable; no query executed.", "gate:assignment_identity");
  const now = options.now ?? new Date();
  if (!acquisitionTimestamp(window.from) || !acquisitionTimestamp(window.to) || Date.parse(window.from) >= Date.parse(window.to) || Date.parse(window.to) > now.getTime() || Date.parse(window.to)-Date.parse(window.from)>MAX_ACQUISITION_RANGE_MS ||
    (window.placement !== "all" && !ACQUISITION_PLACEMENTS.some(p=>p.key===window.placement))) return empty("Invalid bounded acquisition window; no query executed.", "gate:window");
  if (!options.query && !process.env.DATABASE_URL) return empty("Canonical database is disconnected.", "gate:database_configuration");
  try {
    const query: AggregateQuery = options.query ?? (async (text, params) => {
      const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { signal: AbortSignal.timeout(8_000) } });
      // The pinned Neon HTTP driver batches both statements on one read-only
      // transaction. SET LOCAL applies before the aggregate starts executing.
      const results = await sql.transaction([
        sql.query("SELECT set_config('statement_timeout', '5000', true)"), sql.query(text, params),
      ], { readOnly: true, isolationLevel: "RepeatableRead" });
      trace.transactionContainer = kind(results);
      return results[1];
    });
    trace.stage = "transport"; trace.gateMs = Math.round(performance.now()-started); trace.aggregateExecution = "attempted_unconfirmed"; emit("query:start");
    const queryStarted = performance.now();
    const result = await query(ACQUISITION_WITH_SOURCES_SQL, [window.from, window.to, JSON.stringify(ACQUISITION_PLACEMENTS.map(({ key }) => ({ key }))), window.placement, scope === "assigned_workspace" ? principal.agentId : null]);
    trace.queryMs = Math.round(performance.now()-queryStarted); trace.aggregateExecution = "response_received"; trace.stage = "validation"; trace.resultContainer = kind(result);
    if (!Array.isArray(result) || result.length === 0 || result.length > 27) return empty("Invalid or missing aggregate; not a measured zero.", "result:container_or_size");
    const rows = result as Record<string, unknown>[];
    if (rows.some(r=>!r || typeof r!=="object" || Array.isArray(r))) return empty("Invalid or missing aggregate; not a measured zero.", "result:row_shape");
    const historicKeys = ["all", ...ACQUISITION_PLACEMENTS.filter(p => window.placement === "all" || window.placement === p.key).map(p => p.key)];
    const keys = [...historicKeys, "source:all", ...ACQUISITION_SOURCE_GROUPS.map(key => `source:${key}`)];
    trace.rowCount = rows.length; trace.expectedRows = keys.length*3;
    const fields = ["inquiries","contacts","unresolved","envelopes","represented","accepted","delivered","pending","retry","failed","unknown","access_allowed","generated_at"];
    trace.scalarTypes = Object.fromEntries(fields.map(field=>[field,[...new Set(rows.map(r=>kind(r?.[field])))]]));
    if (rows.length !== keys.length * 3 || rows.some(r => r.access_allowed !== true)) return empty("Required full-cohort read grants or row-security boundary unavailable.", rows.length !== keys.length*3 ? "result:dimensions" : "result:full_cohort_grants");
    let generatedAt: string | null = null;
    const mapped = keys.map(key => {
      const group = rows.filter(r => r.key === key);
      if (group.length !== 3 || new Set(group.map(r => r.operator)).size !== 3) throw new InvalidAggregate("operator_dimensions");
      const base = group[0];
      const counts = { inquiries: validCount(base.inquiries,"inquiries"), contacts: validCount(base.contacts,"contacts"), unresolved: validCount(base.unresolved,"unresolved"), unknownOperatorEnvelopes: 0 } as AcquisitionCounts;
      if (counts.contacts + counts.unresolved > counts.inquiries) throw new InvalidAggregate("contact_total");
      for (const r of group) {
        const parsedDate = Date.parse(String(r.generated_at));
        if (!Number.isFinite(parsedDate)) throw new InvalidAggregate("snapshot_parse");
        const date = new Date(parsedDate).toISOString();
        if (generatedAt && generatedAt !== date) throw new InvalidAggregate("snapshot_consistency");
        if (r.inquiries !== base.inquiries || r.contacts !== base.contacts || r.unresolved !== base.unresolved) throw new InvalidAggregate("cohort_scalar_consistency");
        generatedAt = date;
        if (r.operator === "unknown") { counts.unknownOperatorEnvelopes = validCount(r.envelopes,"envelopes"); continue; }
        if (r.operator !== "mike" && r.operator !== "brandon") throw new InvalidAggregate("operator_value");
        const represented = validCount(r.represented,"represented");
        if (represented > counts.inquiries) throw new InvalidAggregate("represented_total");
        counts[r.operator] = { inquiriesWithEnvelope: represented, noV6Recorded: counts.inquiries - represented,
          envelopes: validCount(r.envelopes,"envelopes"), providerAccepted: validCount(r.accepted,"accepted"), delivered: validCount(r.delivered,"delivered"),
          pending: validCount(r.pending,"pending"), retry: validCount(r.retry,"retry"), failed: validCount(r.failed,"failed"), unknown: validCount(r.unknown,"unknown") };
        const op = counts[r.operator];
        if (op.envelopes < represented || op.delivered + op.pending + op.retry + op.failed + op.unknown !== op.envelopes || op.providerAccepted > op.envelopes) throw new InvalidAggregate("operator_total");
      }
      return { key, counts };
    });
    const total=mapped[0].counts, placements=mapped.slice(1,historicKeys.length);
    if (placements.reduce((n,p)=>n+p.counts.inquiries,0)!==total.inquiries || placements.reduce((n,p)=>n+p.counts.unresolved,0)!==total.unresolved ||
      total.contacts>placements.reduce((n,p)=>n+p.counts.contacts,0) || total.contacts<Math.max(0,...placements.map(p=>p.counts.contacts))) throw new InvalidAggregate("placement_rollup");
    const sourceTotal=mapped[historicKeys.length].counts;
    const sources=mapped.slice(historicKeys.length+1).map(row => ({ key: row.key.slice("source:".length) as AcquisitionSourceGroup, counts: row.counts }));
    if (sources.reduce((n,p)=>n+p.counts.inquiries,0)!==sourceTotal.inquiries || sources.reduce((n,p)=>n+p.counts.unresolved,0)!==sourceTotal.unresolved ||
      sourceTotal.contacts>sources.reduce((n,p)=>n+p.counts.contacts,0) || sourceTotal.contacts<Math.max(0,...sources.map(p=>p.counts.contacts)) ||
      sourceTotal.inquiries<total.inquiries || sourceTotal.contacts<total.contacts || sourceTotal.unresolved<total.unresolved ||
      sources.reduce((n,p)=>n+p.counts.unknownOperatorEnvelopes,0)!==sourceTotal.unknownOperatorEnvelopes) throw new InvalidAggregate("source_rollup");
    for (const operator of ["mike", "brandon"] as const) {
      for (const field of ACQUISITION_OPERATOR_FIELDS) {
        if (sources.reduce((n,p)=>n+p.counts[operator][field],0)!==sourceTotal[operator][field]) throw new InvalidAggregate("source_operator_rollup");
      }
    }
    const age = now.getTime() - Date.parse(generatedAt!);
    if (age > 300_000 || age < -30_000) { emit("snapshot:stale"); return { coverage: "stale", reason: "Snapshot clock/age exceeds five-minute freshness allowance. Refresh before operational use.", window, scope, generatedAt, totals: null, placements: [], allSources: null }; }
    emit("complete");
    return { coverage: "complete", window, scope, generatedAt, totals: total, placements, allSources: { totals: sourceTotal, sources } };
  } catch (error) {
    if (trace.stage === "transport") trace.queryMs = Math.max(0,Math.round(performance.now()-started)-Number(trace.gateMs));
    const e=error as {name?:string;code?:string;cause?:{code?:string}};
    trace.error = { name: ["Error","TypeError","NeonDbError","AbortError","TimeoutError"].includes(e?.name??"") ? e.name : "other",
      sqlstate: /^[0-9A-Z]{5}$/.test(e?.code??"") ? e.code : null,
      abort: ["AbortError","TimeoutError"].includes(e?.name??"") || e?.code==="ABORT_ERR", statementTimeout: e?.code==="57014",
      transportCode: ["ECONNRESET","ETIMEDOUT","ENOTFOUND","ECONNREFUSED","UND_ERR_CONNECT_TIMEOUT"].includes(e?.cause?.code??"") ? e.cause?.code : null };
    return empty("Aggregate unavailable: timeout, schema/grants or invalid result. Retry this read; do not infer zero or change delivery settings.", error instanceof InvalidAggregate ? `validation:${error.condition}` : "exception");
  }
}
