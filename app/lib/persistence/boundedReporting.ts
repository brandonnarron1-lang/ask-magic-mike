import { REPORTING_APPOINTMENT_STATES, normalizeReportingLeadRow, summarizeReportingRows, timelineLabel, type AdminReportingSummary, type ConversionReportingGroup, type ReportingScope, } from './supabase/adminReportingView';
export const REPORTING_GROUP_LIMIT = 50;
export const REPORTING_DETAIL_LIMIT = 50;
const states = [...REPORTING_APPOINTMENT_STATES, 'reschedule_requested'];
const boolCount = (condition: string) => `count(*) FILTER (WHERE ${condition})::integer`;
/** The five accepted reads become CTEs of ONE statement: one MVCC snapshot,
 * no customer-sized row arrays cross the DB boundary. No schema/grant changes.
 * High-cardinality dimensions retain an explicit exact remainder, not a cap on totals.
 */
export function boundedReportingSql(reads: string[], end: string, aggregateOnly: boolean, cohort: string): string {
    if (reads.length !== 5)
        throw Error('reporting_read_contract');
    const [leads, appointments, tasks, exclusions, operational] = reads;
    const clean = (field: string) => `NULLIF(btrim(r.${field}), '')`;
    const sums: Record<string, string> = {
        captured: 'true', contactable: 'has_contact OR email IS NOT NULL OR phone IS NOT NULL',
        qualified: 'qualified', qualifiedAppointment: 'qualified OR appointment', appointments: 'appointment', closedWon: 'converted',
        firstHumanResponse: 'first_human_response_recorded', manualAttempted: 'manual_attempt_recorded',
        twoWayContact: 'two_way_contact_recorded', manualEvidenceUnknown: 'NOT manual_attempt_recorded',
        appointmentEvidenceUnknown: 'NOT appointment', otherAppointmentStates: "'reschedule_requested'=ANY(appointment_states)",
        outcomeEvidenceUnknown: 'cardinality(outcome_types)=0', lost: 'status_normalized=\'dead\'', stalled: 'stalled',
        unknownFirstTouch: 'first_touch_source IS NULL', unknownLastTouch: 'last_touch_source IS NULL',
        outcomesObserved: 'cardinality(outcome_types)>0',
        today: `created_at >= date_trunc('day', ${end} AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
        last7: `created_at >= ${end}-interval '7 days'`, last30: `created_at >= ${end}-interval '30 days'`,
        bucketNew: "bucket='new'", bucketWorking: "bucket='working'", bucketQualified: "bucket='qualified_appointment'", bucketClosed: "bucket='closed'",
    };
    for (const state of REPORTING_APPOINTMENT_STATES)
        sums[`state_${state}`] = `'${state}'=ANY(appointment_states)`;
    const metrics = Object.entries(sums).map(([key, condition]) => `${boolCount(condition)} AS "${key}"`).join(',\n');
    const metricJson = Object.keys(sums).flatMap(key => [`'${key}'`, `"${key}"`]).join(',');
    const dimensions: Record<string, string> = {
        sources: "COALESCE(source,'Unknown source')||'||'||COALESCE(source_detail,'No detail')",
        campaigns: "COALESCE(attribution_campaign,source_detail,source,'Unknown campaign')",
        conversionSources: "COALESCE(first_touch_source,'Unknown first touch')",
        agents: 'assigned_agent_id::text', pages: 'page_url', types: "COALESCE(lead_type,'Unknown')",
        intents: "COALESCE(primary_intent,'Unknown')", timelines: "COALESCE(timeline_months::text,'unknown')",
    };
    const groups = Object.entries(dimensions).map(([kind, expr]) => `SELECT '${kind}' AS kind, ${expr} AS key, ${metrics}
    FROM facts ${['agents', 'pages'].includes(kind) ? `WHERE ${expr} IS NOT NULL` : ''} GROUP BY ${expr}`).join('\nUNION ALL\n');
    const rolled = Object.keys(sums).map(k => `sum("${k}")::integer AS "${k}"`).join(',');
    // Display ordering remains count-based; all groups above the bound are combined
    // and explicitly labeled, with additive/distinct-per-lead counts preserved.
    return `WITH reporting_cohort AS MATERIALIZED (${cohort}), human_facts AS MATERIALIZED (
      SELECT l.id AS lead_id,
        bool_or(a.metadata->>'result' IN ('attempted','no_answer','two_way_conversation')) AS manual_attempt_recorded,
        bool_or(a.metadata->>'result'='two_way_conversation') AS two_way_contact_recorded
      FROM reporting_cohort l LEFT JOIN public.audit_logs a ON a.resource_id=l.id
        AND a.resource_type='lead' AND a.action='lead.human_interaction_recorded'
        AND a.metadata->>'provenance'='manual_operator_record'
        AND a.metadata->>'result' IN ('attempted','no_answer','two_way_conversation')
        AND a.metadata->>'channel' IN ('phone','email','in_person','other')
        AND a.created_at>=l.created_at AND a.created_at<${end}
        AND CASE WHEN pg_input_is_valid(a.metadata->>'occurred_at','timestamp with time zone')
          THEN (a.metadata->>'occurred_at')::timestamptz>=l.created_at AND (a.metadata->>'occurred_at')::timestamptz<${end} ELSE false END
      GROUP BY l.id
    ), raw AS MATERIALIZED (${leads}), appts AS MATERIALIZED (${appointments}),
    followups AS MATERIALIZED (${tasks}), exclusions AS (${exclusions}), operational AS (${operational}),
    normalized AS MATERIALIZED (
      SELECT r.id,r.created_at,COALESCE(${clean('status')},'new') AS status,
       lower(COALESCE(${clean('status')},'new')) AS status_normalized,
       ${['source', 'source_detail', 'page_url', 'lead_type', 'primary_intent', 'first_touch_source', 'last_touch_source', 'attribution_campaign', 'address_raw', 'email', 'phone', 'lead_grade'].map(k => `${clean(k)} AS ${k}`).join(',')},
       r.timeline_months,r.assigned_agent_id,r.assigned_at,r.last_contacted_at,
       r.has_contact,r.first_human_response_recorded,r.manual_attempt_recorded,r.two_way_contact_recorded,
       r.outcome_types,COALESCE(a.states,ARRAY[]::text[]) AS appointment_states,
       COALESCE(a.states,ARRAY[]::text[]) <> ARRAY[]::text[] AS appointment
      FROM raw r LEFT JOIN (
        SELECT lead_id,array_agg(DISTINCT btrim(status)) AS states FROM appts
        WHERE btrim(status) IN (${states.map(s => `'${s}'`).join(',')}) GROUP BY lead_id
      ) a ON a.lead_id=r.id
      WHERE lower(COALESCE(${clean('status')},'new')) NOT IN ('spam','test','internal_qa')
    ), facts AS MATERIALIZED (
      SELECT n.*,status_normalized='qualified' OR 'qualified'=ANY(outcome_types) AS qualified,
       'closed'=ANY(outcome_types) AS converted,
       CASE WHEN status_normalized IN ('contacted','nurture') THEN 'working'
        WHEN status_normalized IN ('qualified','appointment_requested','appointment_set') THEN 'qualified_appointment'
        WHEN status_normalized IN ('converted','dead','closed','closed_won','closed_lost') THEN 'closed' ELSE 'new' END AS bucket,
       status NOT IN ('converted','dead','spam') AND (
         (assigned_agent_id IS NULL AND created_at <= ${end}-interval '4 hours') OR
         (assigned_agent_id IS NOT NULL AND last_contacted_at IS NULL AND assigned_at <= ${end}-interval '2 hours') OR
         (status='contacted' AND last_contacted_at <= ${end}-interval '72 hours') OR
         (status='appointment_requested' AND last_contacted_at <= ${end}-interval '48 hours') OR
         ((lead_grade IN ('A+','A') OR timeline_months=0) AND
          (CASE WHEN status IN ('new','scored','qualified','assigned','contacted','appointment_requested','appointment_set','nurture','dead','converted','spam','escalated') THEN status ELSE 'new' END)
            IN ('new','scored','assigned','escalated') AND created_at <= ${end}-interval '24 hours')
       ) IS TRUE AS stalled
      FROM normalized n
    ), totals AS (SELECT ${metrics} FROM facts), groups AS MATERIALIZED (${groups}),
    ranked AS (SELECT *,row_number() OVER(PARTITION BY kind ORDER BY
       CASE WHEN kind='campaigns' THEN "closedWon" ELSE captured END DESC,captured DESC,key COLLATE "C") AS rank FROM groups),
    display_groups AS (
      SELECT kind,key,${Object.keys(sums).map(k => `"${k}"`).join(',')},false AS remainder,1 AS group_count FROM ranked WHERE rank<=${REPORTING_GROUP_LIMIT}
      UNION ALL SELECT kind,NULL::text AS key,${rolled},true AS remainder,count(*)::integer AS group_count FROM ranked WHERE rank>${REPORTING_GROUP_LIMIT} GROUP BY kind
    ) SELECT
     (SELECT jsonb_build_object(${metricJson}) FROM totals) AS totals,
     COALESCE((SELECT jsonb_agg(jsonb_build_object('kind',kind,'key',key,'remainder',remainder,'groupCount',group_count,'metrics',jsonb_build_object(${metricJson}))) FROM display_groups),'[]') AS groups,
     (SELECT to_jsonb(exclusions) FROM exclusions) AS exclusions,
     (SELECT to_jsonb(operational) FROM operational) AS operational,
     (SELECT jsonb_build_object('open',${boolCount("lower(btrim(status))='open'")},
       'overdue',${boolCount(`lower(btrim(status))='open' AND due_at<${end}`)},
       'dueToday',${boolCount(`lower(btrim(status))='open' AND due_at>=date_trunc('day',${end} AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND due_at<(date_trunc('day',${end} AT TIME ZONE 'UTC')+interval '1 day') AT TIME ZONE 'UTC'`)},
       'completed',${boolCount("lower(btrim(status))='done'")},'cancelled',${boolCount("lower(btrim(status))='cancelled'")}) FROM followups) AS followups,
     ${aggregateOnly ? "'[]'::jsonb" : `COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM (SELECT * FROM raw ORDER BY created_at DESC,id DESC LIMIT ${REPORTING_DETAIL_LIMIT})d),'[]')`} AS details,
     COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM (SELECT * FROM raw
       WHERE NULLIF(btrim(phone),'') IS NOT NULL AND timeline_months=0 AND lower(btrim(primary_intent))='sell'
        AND lower(btrim(lead_type)) IN ('seller','seller_cash_offer','home_value')
        AND lower(btrim(status)) IN ('new','scored','qualified','appointment_requested')
       ORDER BY created_at DESC,id DESC LIMIT 12)h),'[]') AS hot,
     ${aggregateOnly ? "'{}'::jsonb" : `COALESCE((SELECT jsonb_object_agg(a.id,a.name) FROM public.agents a WHERE a.id IN
       (SELECT key::uuid FROM ranked WHERE kind='agents' AND rank<=${REPORTING_GROUP_LIMIT})),'{}')`} AS agent_names`;
}
type Metrics = Record<string, number>;
type Group = {
    kind: string;
    key: string | null;
    remainder: boolean;
    groupCount: number;
    metrics: Metrics;
};
export type BoundedReportingRow = {
    totals: Metrics;
    groups: Group[];
    exclusions: Record<string, number>;
    operational: Record<string, unknown>;
    followups: AdminReportingSummary['followupOps'];
    details: Record<string, unknown>[];
    hot: Record<string, unknown>[];
    agent_names: Record<string, string>;
};
const pct = (n: number, d: number) => d ? Math.round(n / d * 100) : 0;
function conversion(m: Metrics, source: string): ConversionReportingGroup {
    return { source, captured: m.captured, qualified: m.qualified, firstHumanResponse: m.firstHumanResponse,
        manualAttempted: m.manualAttempted, twoWayContact: m.twoWayContact, manualEvidenceUnknown: m.manualEvidenceUnknown,
        appointments: m.appointments, appointmentStates: Object.fromEntries(REPORTING_APPOINTMENT_STATES.map(s => [s, m[`state_${s}`]])) as ConversionReportingGroup['appointmentStates'],
        otherAppointmentStates: m.otherAppointmentStates, appointmentEvidenceUnknown: m.appointmentEvidenceUnknown,
        closedWon: m.closedWon, outcomeEvidenceUnknown: m.outcomeEvidenceUnknown, commissions: null,
        conversionRate: m.captured ? pct(m.closedWon, m.captured) : null };
}
export function mapBoundedReporting(row: BoundedReportingRow, now: Date, window: 7 | 30 | 90, scope: ReportingScope): AdminReportingSummary {
    if (!row?.totals || !Array.isArray(row.groups) || !row.operational || !row.exclusions)
        throw Error('incomplete_reporting_snapshot');
    const result = summarizeReportingRows([], now, window, new Map(), [], [], {}, { complete: true, scope });
    const m = row.totals;
    const grouped = (kind: string) => row.groups.filter(g => g.kind === kind);
    const label = (g: Group) => g.remainder ? `Other ${g.groupCount} groups (combined)` : g.key!;
    const table = (kind: string) => grouped(kind).map(g => ({ key: g.remainder ? '__amm_combined_remainder__' : g.key!,
        label: g.remainder ? label(g) : kind === 'sources' ? label(g).replace('||', ' / ') : label(g), count: g.metrics.captured,
        contactable: g.metrics.contactable, qualifiedAppointment: g.metrics.qualifiedAppointment,
        converted: g.metrics.closedWon, conversionRate: pct(g.metrics.closedWon, g.metrics.captured) }));
    // qualified OR appointment, not sum, is computed independently in SQL.
    result.sources = table('sources').sort((a, b) => b.count - a.count || b.contactable - a.contactable || b.qualifiedAppointment - a.qualifiedAppointment || b.converted - a.converted || a.label.localeCompare(b.label));
    result.campaigns = table('campaigns').sort((a, b) => b.converted - a.converted || b.count - a.count || a.label.localeCompare(b.label));
    const detail = (r: Record<string, unknown>) => normalizeReportingLeadRow({ ...r,
        ...Object.fromEntries(['created_at', 'assigned_at', 'last_contacted_at'].map(key => [key, r[key] ? new Date(String(r[key])) : null])) });
    result.rows = row.details.map(detail);
    result.hotLeads = row.hot.map(detail);
    result.kpis = { leadsToday: m.today, leadsLast7Days: m.last7, leadsLast30Days: m.last30, contactableRate: pct(m.contactable, m.captured) };
    result.funnel = { captured: m.captured, contacted: m.firstHumanResponse, qualified: m.qualified, appointment: m.appointments, converted: m.closedWon, lostDisqualified: m.lost };
    result.rates = { qualificationRate: pct(m.qualified, m.captured), appointmentRate: pct(m.appointments, m.captured), conversionRate: pct(m.closedWon, m.captured), closeRate: pct(m.closedWon, m.closedWon + m.lost), disqualificationRate: 0 };
    result.stalledLeadCount = m.stalled;
    result.statusBuckets = { new: m.bucketNew, working: m.bucketWorking, qualified_appointment: m.bucketQualified, closed: m.bucketClosed, spam_test: 0 };
    result.conversionReporting.cohort = { ...result.conversionReporting.cohort, denominator: m.captured, calculation: 'database_snapshot_aggregate' };
    result.conversionReporting.totals = conversion(m, 'All included leads');
    result.conversionReporting.sources = grouped('conversionSources').map(g => conversion(g.metrics, label(g))).sort((a, b) => b.captured - a.captured || a.source.localeCompare(b.source));
    result.sourceConversion = result.conversionReporting.sources.map(g => ({ source: g.source, captured: g.captured, qualified: g.qualified, appointments: g.appointments, closedWon: g.closedWon, commissions: null, conversionRate: g.conversionRate }));
    result.appointmentOps = { ...result.conversionReporting.totals.appointmentStates, noShow: m.state_no_show, requestToScheduledRate: null, scheduledToCompletedRate: null, noShowRate: m.captured ? pct(m.state_no_show, m.captured) : null };
    result.followupOps = { ...row.followups, completionRate: pct(row.followups.completed, row.followups.open + row.followups.completed + row.followups.cancelled) };
    result.dataTrust = { included: m.captured, excludedTest: row.exclusions.excluded_test, excludedSuppressed: row.exclusions.excluded_suppressed, excludedDuplicates: row.exclusions.excluded_duplicate, unknownFirstTouch: m.unknownFirstTouch, unknownLastTouch: m.unknownLastTouch, outcomesObserved: m.outcomesObserved };
    result.agentPerformance = grouped('agents').map(g => ({ agent_id: g.remainder ? '__amm_combined_remainder__' : g.key!, agent_name: g.remainder ? label(g) : row.agent_names[g.key!] || 'Unknown agent', assigned: g.metrics.captured, qualified: g.metrics.qualified, appointments: g.metrics.appointments, converted: g.metrics.closedWon, closedLost: g.metrics.lost, stalled: g.metrics.stalled, conversionRate: pct(g.metrics.closedWon, g.metrics.captured) })).sort((a, b) => b.assigned - a.assigned || b.converted - a.converted || a.agent_name.localeCompare(b.agent_name) || a.agent_id.localeCompare(b.agent_id));
    result.topPages = grouped('pages').filter(g => !g.remainder).map(g => ({ page_url: g.key!, count: g.metrics.captured })).sort((a, b) => b.count - a.count || a.page_url.localeCompare(b.page_url)).slice(0, 10);
    result.leadTypes = grouped('types').map(g => ({ lead_type: label(g), count: g.metrics.captured })).sort((a, b) => b.count - a.count || a.lead_type.localeCompare(b.lead_type));
    result.intents = grouped('intents').map(g => ({ primary_intent: label(g), count: g.metrics.captured })).sort((a, b) => b.count - a.count || a.primary_intent.localeCompare(b.primary_intent));
    result.timelines = grouped('timelines').map(g => ({ timeline_months: g.remainder || g.key === 'unknown' ? null : Number(g.key), label: g.remainder ? label(g) : timelineLabel(g.key === 'unknown' ? null : Number(g.key)), count: g.metrics.captured })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    result.displayBounds = { leadRows: REPORTING_DETAIL_LIMIT, dimensionGroups: REPORTING_GROUP_LIMIT, remainderGroups: row.groups.filter(g => g.remainder).map(g => ({ dimension: g.kind, groups: g.groupCount, leads: g.metrics.captured })) };
    return result;
}
