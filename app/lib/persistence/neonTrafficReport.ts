import { neon } from "@neondatabase/serverless";
import { isPreviewDataDisabled } from "../../../src/lib/preview-security";
import { hasLeadCenterPermission, type LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";

export const TRAFFIC_METRICS = ["pageViews","embeddedViews","visits","browsers","identifiedViews","starts","embeddedStarts",
  "inquiries","contacts","cashReview","homeValue","buyer","other","reviewFactsComplete","unassigned","failedAlerts","recordedResponses","appointmentsRequested","appointmentsConfirmed"] as const;
export type TrafficMetrics = Record<(typeof TRAFFIC_METRICS)[number], number>;
export type TrafficReport = { coverage: "complete" | "partial" | "unavailable"; reason: string; from: string; to: string;
  generatedAt: string | null; collectionStartedAt: string | null; metrics: TrafficMetrics | null };
export type TrafficQuery = (sql: string, params: unknown[]) => Promise<unknown>;
/** One snapshot; bounded aggregate only. No guessed joins or raw browser IDs. */
export const TRAFFIC_REPORT_SQL = `WITH access AS (
 SELECT count(*)=6 AND bool_and(has_table_privilege(current_user,c.oid,'SELECT') AND NOT row_security_active(c.oid)) allowed
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 AND c.relname IN ('analytics_events','leads','lead_notifications','lead_response_milestones','lead_appointments','source_attribution')
), events AS MATERIALIZED (
 SELECT e.* FROM public.analytics_events e
 WHERE e.occurred_at >= $1::timestamptz AND e.occurred_at < $2::timestamptz
 AND e.event_name IN ('page_view','intake_started') AND e.properties->>'traffic_version'='1'
 AND coalesce(e.properties->>'is_test','false') <> 'true'
 AND coalesce(e.user_agent,'') NOT ILIKE '%automation%'
 AND ($3::text IS NULL OR lower(btrim(e.utm_source))=$3)
 AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE (l.id=e.lead_id OR l.session_id=e.session_id
   OR l.session_id::text=e.properties->>'funnel_session_id') AND
   (l.is_test OR l.communication_suppressed OR l.status IN ('spam','test','internal_qa')))
), cohort AS MATERIALIZED (
 SELECT l.* FROM public.leads l WHERE l.created_at >= $1::timestamptz AND l.created_at < $2::timestamptz
 AND l.is_test=false AND l.communication_suppressed=false AND l.status NOT IN ('spam','test','internal_qa')
 AND ($3::text IS NULL OR lower(btrim((SELECT a.utm_source FROM public.source_attribution a
   WHERE a.lead_id=l.id ORDER BY a.created_at DESC,a.id DESC LIMIT 1)))=$3)
)
SELECT (SELECT allowed FROM access) AS allowed, now() AS generated_at,
 jsonb_build_object(
 'pageViews',count(*) FILTER(WHERE event_name='page_view' AND properties->>'traffic_context'='top_level'),
 'embeddedViews',count(*) FILTER(WHERE event_name='page_view' AND properties->>'traffic_context'='embedded'),
 'visits',count(DISTINCT properties->>'traffic_visit_id') FILTER(WHERE properties->>'traffic_context'='top_level'),
 'browsers',count(DISTINCT properties->>'traffic_browser_id') FILTER(WHERE properties->>'traffic_context'='top_level'),
 'identifiedViews',count(*) FILTER(WHERE event_name='page_view' AND properties->>'traffic_context'='top_level' AND properties ? 'traffic_visit_id'),
 'starts',count(*) FILTER(WHERE event_name='intake_started' AND properties->>'traffic_context'='top_level'),
 'embeddedStarts',count(*) FILTER(WHERE event_name='intake_started' AND properties->>'traffic_context'='embedded'),
 'inquiries',(SELECT count(*) FROM cohort), 'contacts',(SELECT count(DISTINCT contact_id) FROM cohort),
 'cashReview',(SELECT count(*) FROM cohort WHERE lead_type='seller_cash_offer'),
 'homeValue',(SELECT count(*) FROM cohort WHERE lead_type='home_value'),
 'buyer',(SELECT count(*) FROM cohort WHERE lead_type='buyer'),
 'other',(SELECT count(*) FROM cohort WHERE lead_type NOT IN ('seller_cash_offer','home_value','buyer')),
 'reviewFactsComplete',(SELECT count(*) FROM cohort WHERE seller_request->>'relationship' IN ('owner','co-owner','authorized-helper')
   AND seller_request->>'representation' IN ('represented','not-represented') AND address_raw IS NOT NULL AND timeline_months IS NOT NULL),
 'unassigned',(SELECT count(*) FROM cohort WHERE assigned_agent_id IS NULL),
 'failedAlerts',(SELECT count(*) FROM public.lead_notifications n JOIN cohort l ON l.id=n.lead_id
   WHERE n.recipient_type='internal' AND n.status IN ('failed','permanently_failed')),
 'recordedResponses',(SELECT count(DISTINCT m.lead_id) FROM public.lead_response_milestones m JOIN cohort l ON l.id=m.lead_id WHERE m.is_test=false AND m.communication_suppressed=false),
 'appointmentsRequested',(SELECT count(DISTINCT a.lead_id) FROM public.lead_appointments a JOIN cohort l ON l.id=a.lead_id WHERE a.status='requested'),
 'appointmentsConfirmed',(SELECT count(DISTINCT a.lead_id) FROM public.lead_appointments a JOIN cohort l ON l.id=a.lead_id WHERE a.status='confirmed')
 ) metrics FROM events`;

export async function readTrafficReport(from: string, to: string, options: { query?: TrafficQuery; now?: Date; collectionStartedAt?: string; source?: "instagram" } = {}): Promise<TrafficReport> {
  const start = options.collectionStartedAt ?? process.env.PUBLIC_TRAFFIC_COLLECTION_STARTED_AT ?? null;
  const unavailable = (reason: string): TrafficReport => ({ coverage:"unavailable", reason, from, to, generatedAt:null, collectionStartedAt:start, metrics:null });
  const now = options.now ?? new Date();
  if (!Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(from)>=Date.parse(to) ||
    Date.parse(to)>now.getTime() || Date.parse(to)-Date.parse(from)>31*86400000) return unavailable("Invalid bounded window.");
  if (isPreviewDataDisabled()) return unavailable("Database isolation/disconnection gate.");
  if (!options.query && !process.env.DATABASE_URL) return unavailable("Canonical database unavailable.");
  try {
    const query = options.query ?? (async (text, params) => {
      const sql = neon(process.env.DATABASE_URL!, {fetchOptions:{signal:AbortSignal.timeout(8000)}});
      const results = await sql.transaction([sql.query("SELECT set_config('statement_timeout','5000',true),set_config('lock_timeout','1000',true)"),sql.query(text,params)],{readOnly:true,isolationLevel:"RepeatableRead"});
      return results[1];
    });
    const rows = await query(TRAFFIC_REPORT_SQL,[from,to,options.source ?? null]);
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.allowed !== true) return unavailable("Required full-cohort grants/schema unavailable.");
    const {metrics, generated_at} = rows[0];
    if (!metrics || !TRAFFIC_METRICS.every(k=>Number.isSafeInteger(metrics[k]) && metrics[k]>=0) || !Number.isFinite(Date.parse(generated_at)) ||
      Math.abs(now.getTime()-Date.parse(generated_at))>300000) return unavailable("Invalid/stale aggregate; not a measured zero.");
    const partial = !start || !Number.isFinite(Date.parse(start)) || Date.parse(start)>Date.parse(from);
    return {coverage:partial?"partial":"complete",reason:partial?"Traffic collection began during this day or activation time is unverified. Earlier coverage is unknown.":"Recorded first-party coverage, not all people. Identity is optional and consent-dependent.",
      from,to,generatedAt:new Date(generated_at).toISOString(),collectionStartedAt:start,metrics};
  } catch { return unavailable("Aggregate timeout, schema, grants or storage failure; values are UNKNOWN."); }
}
export function loadTrafficReport(from: string, to: string, principal: LeadCenterPrincipal | null, options: Parameters<typeof readTrafficReport>[2] = {}) {
  if (!principal || !hasLeadCenterPermission(principal.role,"report:view") || principal.role==="primary_lead_owner")
    return Promise.resolve<TrafficReport>({coverage:"unavailable",reason:"Site-wide report authority required.",from,to,generatedAt:null,collectionStartedAt:null,metrics:null});
  return readTrafficReport(from,to,options);
}
