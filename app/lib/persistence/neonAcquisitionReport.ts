import { neon } from "@neondatabase/serverless";
import { hasLeadCenterPermission, isLeadCenterRole, type LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";
import { isPreviewDataDisabled } from "../../../src/lib/preview-security";
import { ACQUISITION_PLACEMENTS, acquisitionTimestamp, MAX_ACQUISITION_RANGE_MS, type AcquisitionWindow } from "../growth/acquisition-window";

export const ACQUISITION_STATEMENT_TIMEOUT_MS = 5_000;
export const ACQUISITION_OPERATOR_FIELDS = ["inquiriesWithEnvelope", "noV6Recorded", "envelopes", "providerAccepted", "delivered", "pending", "retry", "failed", "unknown"] as const;
export type AcquisitionOperatorCounts = Record<(typeof ACQUISITION_OPERATOR_FIELDS)[number], number>;
export type AcquisitionCounts = { inquiries: number; contacts: number; unresolved: number; unknownOperatorEnvelopes: number; mike: AcquisitionOperatorCounts; brandon: AcquisitionOperatorCounts };
export type AcquisitionReport = {
  coverage: "complete" | "unavailable" | "stale"; reason?: string; window: AcquisitionWindow;
  generatedAt: string | null; scope: "all_eligible" | "assigned_workspace"; totals: AcquisitionCounts | null;
  placements: Array<{ key: string; counts: AcquisitionCounts }>;
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

type AggregateQuery = (text: string, params: unknown[]) => Promise<unknown>;
const validCount = (value: unknown): number => {
  if ((typeof value !== "string" && typeof value !== "number") || value === "") throw new Error("invalid_aggregate");
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error("invalid_aggregate"); return n;
};

export async function loadAcquisitionReport(window: AcquisitionWindow, principal: LeadCenterPrincipal | null,
  options: { query?: AggregateQuery; now?: Date } = {}): Promise<AcquisitionReport> {
  const scope = principal?.role === "primary_lead_owner" ? "assigned_workspace" : "all_eligible";
  const empty = (reason: string): AcquisitionReport => ({ coverage: "unavailable", reason, window, scope, generatedAt: null, totals: null, placements: [] });
  if (!principal || !isLeadCenterRole(principal.role) || !hasLeadCenterPermission(principal.role, "report:view")) return empty("Report permission required; no query executed.");
  if (isPreviewDataDisabled()) return empty("Preview data is disconnected or its physical isolation is unverified; no query executed.");
  if (scope === "assigned_workspace" && (!principal.agentId || !/^[a-f0-9-]{36}$/i.test(principal.agentId))) return empty("Assigned-workspace identity is unavailable; no query executed.");
  const now = options.now ?? new Date();
  if (!acquisitionTimestamp(window.from) || !acquisitionTimestamp(window.to) || Date.parse(window.from) >= Date.parse(window.to) || Date.parse(window.to) > now.getTime() || Date.parse(window.to)-Date.parse(window.from)>MAX_ACQUISITION_RANGE_MS ||
    (window.placement !== "all" && !ACQUISITION_PLACEMENTS.some(p=>p.key===window.placement))) return empty("Invalid bounded acquisition window; no query executed.");
  if (!options.query && !process.env.DATABASE_URL) return empty("Canonical database is disconnected.");
  try {
    const query: AggregateQuery = options.query ?? (async (text, params) => {
      const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { signal: AbortSignal.timeout(8_000) } });
      // The pinned Neon HTTP driver batches both statements on one read-only
      // transaction. SET LOCAL applies before the aggregate starts executing.
      const results = await sql.transaction([
        sql.query("SELECT set_config('statement_timeout', '5000', true)"), sql.query(text, params),
      ], { readOnly: true, isolationLevel: "RepeatableRead" });
      return results[1];
    });
    const result = await query(ACQUISITION_AGGREGATE_SQL, [window.from, window.to, JSON.stringify(ACQUISITION_PLACEMENTS.map(({ key }) => ({ key }))), window.placement, scope === "assigned_workspace" ? principal.agentId : null]);
    if (!Array.isArray(result) || result.length === 0 || result.length > 12) return empty("Invalid or missing aggregate; not a measured zero.");
    const rows = result as Record<string, unknown>[];
    const keys = ["all", ...ACQUISITION_PLACEMENTS.filter(p => window.placement === "all" || window.placement === p.key).map(p => p.key)];
    if (rows.length !== keys.length * 3 || rows.some(r => r.access_allowed !== true)) return empty("Required full-cohort read grants or row-security boundary unavailable.");
    let generatedAt: string | null = null;
    const mapped = keys.map(key => {
      const group = rows.filter(r => r.key === key);
      if (group.length !== 3 || new Set(group.map(r => r.operator)).size !== 3) throw new Error("invalid_aggregate");
      const base = group[0];
      const counts = { inquiries: validCount(base.inquiries), contacts: validCount(base.contacts), unresolved: validCount(base.unresolved), unknownOperatorEnvelopes: 0 } as AcquisitionCounts;
      if (counts.contacts + counts.unresolved > counts.inquiries) throw new Error("invalid_aggregate");
      for (const r of group) {
        const parsedDate = Date.parse(String(r.generated_at));
        if (!Number.isFinite(parsedDate)) throw new Error("invalid_aggregate");
        const date = new Date(parsedDate).toISOString();
        if ((generatedAt && generatedAt !== date) || r.inquiries !== base.inquiries || r.contacts !== base.contacts || r.unresolved !== base.unresolved) throw new Error("invalid_aggregate");
        generatedAt = date;
        if (r.operator === "unknown") { counts.unknownOperatorEnvelopes = validCount(r.envelopes); continue; }
        if (r.operator !== "mike" && r.operator !== "brandon") throw new Error("invalid_operator");
        const represented = validCount(r.represented);
        if (represented > counts.inquiries) throw new Error("invalid_aggregate");
        counts[r.operator] = { inquiriesWithEnvelope: represented, noV6Recorded: counts.inquiries - represented,
          envelopes: validCount(r.envelopes), providerAccepted: validCount(r.accepted), delivered: validCount(r.delivered),
          pending: validCount(r.pending), retry: validCount(r.retry), failed: validCount(r.failed), unknown: validCount(r.unknown) };
        const op = counts[r.operator];
        if (op.envelopes < represented || op.delivered + op.pending + op.retry + op.failed + op.unknown !== op.envelopes || op.providerAccepted > op.envelopes) throw new Error("invalid_aggregate");
      }
      return { key, counts };
    });
    const total=mapped[0].counts, placements=mapped.slice(1);
    if (placements.reduce((n,p)=>n+p.counts.inquiries,0)!==total.inquiries || placements.reduce((n,p)=>n+p.counts.unresolved,0)!==total.unresolved ||
      total.contacts>placements.reduce((n,p)=>n+p.counts.contacts,0) || total.contacts<Math.max(0,...placements.map(p=>p.counts.contacts))) throw new Error("invalid_aggregate");
    const age = now.getTime() - Date.parse(generatedAt!);
    if (age > 300_000 || age < -30_000) return { coverage: "stale", reason: "Snapshot clock/age exceeds five-minute freshness allowance. Refresh before operational use.", window, scope, generatedAt, totals: null, placements: [] };
    return { coverage: "complete", window, scope, generatedAt, totals: mapped[0].counts, placements: mapped.slice(1) };
  } catch {
    return empty("Aggregate unavailable: timeout, schema/grants or invalid result. Retry this read; do not infer zero or change delivery settings.");
  }
}
