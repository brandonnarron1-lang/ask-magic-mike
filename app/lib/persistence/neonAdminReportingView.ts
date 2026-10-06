import { neon } from "@neondatabase/serverless";
import {
  normalizeReportingLeadRow,
  summarizeReportingRows,
  reconcileConversionReporting,
  parseReportingDrillthroughCursor,
  unavailableOperationalTrust,
  type AdminOperationalTrust,
  type AdminReportingSummary,
  type AdminReportingDrillthrough,
} from "./supabase/adminReportingView";
import {
  hasLeadCenterPermission,
  type LeadCenterPrincipal,
} from "../../../src/lib/admin/rbac-policy";

type Query = ReturnType<typeof neon>;

export function filterOperationalRowsForLiveLeads<T extends Record<string, unknown>>(
  rows: T[],
  liveLeadIds: ReadonlySet<string>,
): T[] {
  return rows.filter((row) => typeof row.lead_id === "string" && liveLeadIds.has(row.lead_id));
}

function queryFromEnv(): Query | null {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

function emptySummary(
  configured: boolean,
  windowDays: 7 | 30 | 90,
  now: Date,
  error?: string,
): AdminReportingSummary {
  return {
    ...summarizeReportingRows([], now, windowDays),
    configured,
    conversionReporting: reconcileConversionReporting([], now, windowDays),
    ...(error ? { error } : {}),
  };
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : null;
}

export function normalizeOperationalTrustRow(
  row: Record<string, unknown> | undefined,
): AdminOperationalTrust {
  if (!row) return unavailableOperationalTrust();
  const canonicalLeads = count(row.canonical_leads);
  const responseMeasured = count(row.response_measured);
  const responseWithinTarget = count(row.response_within_target);
  const assignmentsMeasured = count(row.assignments_measured);
  const assignmentsAccepted = count(row.assignments_accepted);
  const notificationIntents = count(row.notification_intents);
  const providerAccepted = count(row.notifications_provider_accepted);
  const delivered = count(row.notifications_delivered);
  const failed = count(row.notifications_failed);
  const duplicateAliases = count(row.duplicate_aliases);
  const aiRequests = count(row.ai_requests);
  const aiFallbacks = count(row.ai_fallbacks);
  const estimatedCost = Number(row.ai_estimated_cost_usd);
  return {
    responseSla: {
      available: true,
      measured: responseMeasured,
      withinTarget: responseWithinTarget,
      targetMinutes: 5,
      unknown: Math.max(0, canonicalLeads - responseMeasured),
      rate: rate(responseWithinTarget, responseMeasured),
    },
    assignmentAcceptance: {
      available: true,
      measured: assignmentsMeasured,
      accepted: assignmentsAccepted,
      pending: count(row.assignments_pending),
      rate: rate(assignmentsAccepted, assignmentsMeasured),
    },
    notifications: {
      available: true,
      intents: notificationIntents,
      providerAccepted,
      delivered,
      failed,
      deliveryUnknown: Math.max(0, notificationIntents - delivered - failed),
      providerAcceptanceRate: rate(providerAccepted, notificationIntents),
      deliveryRate: rate(delivered, notificationIntents),
    },
    duplicates: {
      available: true,
      canonicalLeads,
      excludedAliases: duplicateAliases,
      submissionRecords: canonicalLeads + duplicateAliases,
      rate: rate(duplicateAliases, canonicalLeads + duplicateAliases),
    },
    aiUsage: {
      available: true,
      requests: aiRequests,
      providerResponses: count(row.ai_provider_responses),
      deterministicFallbacks: aiFallbacks,
      blocked: count(row.ai_blocked),
      fallbackRate: rate(aiFallbacks, aiRequests),
      estimatedCostUsd: Number.isFinite(estimatedCost) && estimatedCost >= 0 ? estimatedCost : 0,
    },
  };
}

/** Canonical Lead Center reporting reads. Test and suppressed records are
 * excluded in SQL before any KPI, source, or agent aggregation is built. */
export async function loadNeonAdminReportingSummary(
  windowDays: 7 | 30 | 90 = 30,
  principal: LeadCenterPrincipal | null = null,
  asOf?: Date,
): Promise<AdminReportingSummary> {
  const sql = queryFromEnv();
  const now = asOf || new Date();
  if (!sql) return emptySummary(false, windowDays, now);
  if (!principal) return emptySummary(true, windowDays, now, "lead_center_principal_required");
  if (!hasLeadCenterPermission(principal.role, "report:view")) {
    return emptySummary(true, windowDays, now, "lead_center_report_permission_required");
  }

  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const aggregateOnly = principal?.role === "read_only_analyst";
  const scoped = Boolean(principal && !aggregateOnly && !hasLeadCenterPermission(principal.role, "lead:view_all"));
  if (scoped && !principal?.agentId) return emptySummary(true, windowDays, now, "lead_center_agent_scope_required");
  const scopeClause = scoped ? " AND l.assigned_agent_id = $2::uuid" : "";
  const endParam = scoped ? "$3::timestamptz" : "$2::timestamptz";
  const cohortClause = `l.created_at >= $1::timestamptz AND l.created_at < ${endParam}`;
  const args = scoped ? [cutoff, principal?.agentId, now.toISOString()] : [cutoff, now.toISOString()];
  // Analysts receive contact-presence counts, not contact values, URL/query
  // strings, free-text details, addresses, session IDs, or agent identities.
  const privateColumns = aggregateOnly
    ? `NULL::text AS source_detail, NULL::text AS page_url, NULL::uuid AS assigned_agent_id,
       NULL::text AS address_raw, NULL::text AS email, NULL::text AS phone, NULL::text AS widget_session_id`
    : "l.source_detail, l.page_url, l.assigned_agent_id, l.address_raw, l.email, l.phone, l.widget_session_id";
  try {
    const [leadRows, appointmentRows, followupRows, exclusionRows, operationalRows] = await Promise.all([
      sql.query(
        `SELECT l.id, l.created_at, l.status, l.lead_type, l.source,
                l.timeline_months, l.primary_intent, ${privateColumns},
                l.assigned_at, l.last_contacted_at, l.lead_grade, l.conversion_stage,
                l.is_test, l.communication_suppressed, l.is_duplicate, l.duplicate_of_lead_id,
                (NULLIF(btrim(l.email), '') IS NOT NULL OR NULLIF(btrim(l.phone), '') IS NOT NULL) AS has_contact,
                NULLIF(ft.utm_source, '') AS first_touch_source,
                NULLIF(lt.utm_source, '') AS last_touch_source,
                COALESCE(NULLIF(lt.utm_campaign, ''), NULLIF(ft.utm_campaign, '')) AS attribution_campaign,
                COALESCE(NULLIF(lt.placement_id, ''), NULLIF(ft.placement_id, '')) AS attribution_placement,
                COALESCE(outcomes.outcome_types, ARRAY[]::text[]) AS outcome_types,
                EXISTS (
                  SELECT 1 FROM public.lead_response_milestones r
                   WHERE r.lead_id = l.id AND r.is_test = false AND r.communication_suppressed = false
                     AND r.first_human_response_at >= l.created_at
                     AND r.first_human_response_at < ${endParam} AND r.created_at < ${endParam}
                ) AS first_human_response_recorded,
                COALESCE(human.manual_attempt_recorded, false) AS manual_attempt_recorded,
                COALESCE(human.two_way_contact_recorded, false) AS two_way_contact_recorded
           FROM public.leads l
           LEFT JOIN LATERAL (
             SELECT COALESCE(NULLIF(sa.first_touch->>'source', ''), NULLIF(sa.first_touch->>'utm_source', ''), sa.utm_source) AS utm_source,
                    sa.utm_campaign, sa.placement_id
               FROM public.source_attribution sa
              WHERE sa.lead_id = l.id AND sa.created_at < ${endParam}
              ORDER BY CASE WHEN jsonb_typeof(sa.first_touch) = 'object' THEN 0 ELSE 1 END, sa.created_at ASC, sa.id ASC
              LIMIT 1
           ) ft ON true
           LEFT JOIN LATERAL (
             SELECT COALESCE(NULLIF(sa.last_touch->>'source', ''), NULLIF(sa.last_touch->>'utm_source', ''), sa.utm_source) AS utm_source,
                    sa.utm_campaign, sa.placement_id
               FROM public.source_attribution sa
              WHERE sa.lead_id = l.id AND sa.created_at < ${endParam}
              ORDER BY CASE WHEN jsonb_typeof(sa.last_touch) = 'object' THEN 0 ELSE 1 END, sa.created_at DESC, sa.id DESC
              LIMIT 1
           ) lt ON true
           LEFT JOIN LATERAL (
             SELECT array_agg(DISTINCT o.outcome_type ORDER BY o.outcome_type) AS outcome_types
               FROM public.lead_outcomes o
              WHERE o.lead_id = l.id
                AND o.is_test = false AND o.communication_suppressed = false
                AND o.occurred_at >= l.created_at AND o.occurred_at < ${endParam}
                AND o.created_at < ${endParam}
           ) outcomes ON true
           LEFT JOIN LATERAL (
             SELECT bool_or(a.metadata->>'result' IN ('attempted', 'no_answer', 'two_way_conversation')) AS manual_attempt_recorded,
                    bool_or(a.metadata->>'result' = 'two_way_conversation') AS two_way_contact_recorded
               FROM public.audit_logs a
              WHERE a.resource_type = 'lead' AND a.resource_id = l.id
                AND a.action = 'lead.human_interaction_recorded'
                AND a.metadata->>'provenance' = 'manual_operator_record'
                AND a.metadata->>'result' IN ('attempted', 'no_answer', 'two_way_conversation')
                AND a.metadata->>'channel' IN ('phone', 'email', 'in_person', 'other')
                AND a.created_at >= l.created_at AND a.created_at < ${endParam}
                AND CASE WHEN pg_input_is_valid(a.metadata->>'occurred_at', 'timestamp with time zone')
                         THEN (a.metadata->>'occurred_at')::timestamptz >= l.created_at
                          AND (a.metadata->>'occurred_at')::timestamptz < ${endParam}
                         ELSE false END
           ) human ON true
          WHERE ${cohortClause}
            AND l.is_test = false
            AND l.communication_suppressed = false
            AND l.status NOT IN ('spam', 'test', 'internal_qa')
            AND COALESCE(l.is_duplicate, false) = false
            AND l.duplicate_of_lead_id IS NULL${scopeClause}
          ORDER BY l.created_at DESC, l.id DESC`,
        args,
      ),
      sql.query(
        `SELECT a.id, a.status, a.starts_at, a.lead_id, a.assigned_agent_id, a.created_at
           FROM public.lead_appointments a
           JOIN public.leads l ON l.id = a.lead_id
          WHERE ${cohortClause}
            AND a.created_at >= l.created_at AND a.created_at < ${endParam}
            AND l.is_test = false
            AND l.communication_suppressed = false
            AND l.status NOT IN ('spam', 'test', 'internal_qa')
            AND COALESCE(l.is_duplicate, false) = false
            AND l.duplicate_of_lead_id IS NULL${scopeClause}
          ORDER BY a.created_at DESC, a.id DESC`,
        args,
      ),
      sql.query(
        `SELECT t.id, t.status, t.due_at, t.lead_id, t.agent_id, t.category, t.created_at
           FROM public.tasks t
           JOIN public.leads l ON l.id = t.lead_id
          WHERE t.category LIKE 'followup:%'
            AND ${cohortClause}
            AND t.created_at >= l.created_at AND t.created_at < ${endParam}
            AND l.is_test = false
            AND l.communication_suppressed = false
            AND l.status NOT IN ('spam', 'test', 'internal_qa')
            AND COALESCE(l.is_duplicate, false) = false
            AND l.duplicate_of_lead_id IS NULL${scopeClause}
          ORDER BY t.created_at DESC, t.id DESC`,
        args,
      ),
      sql.query(
        `SELECT
           count(*) FILTER (WHERE l.is_test = true)::integer AS excluded_test,
           count(*) FILTER (WHERE l.communication_suppressed = true)::integer AS excluded_suppressed,
           count(*) FILTER (
             WHERE l.is_test = false
               AND l.communication_suppressed = false
               AND (COALESCE(l.is_duplicate, false) = true OR l.duplicate_of_lead_id IS NOT NULL)
           )::integer AS excluded_duplicate
           FROM public.leads l
          WHERE ${cohortClause}${scopeClause}`,
        args,
      ),
      sql.query(
        `WITH eligible_leads AS MATERIALIZED (
           SELECT l.id, l.created_at
             FROM public.leads l
            WHERE ${cohortClause}
              AND l.is_test = false
              AND l.communication_suppressed = false
              AND l.status NOT IN ('spam', 'test', 'internal_qa')
              AND COALESCE(l.is_duplicate, false) = false
              AND l.duplicate_of_lead_id IS NULL${scopeClause}
         ), latest_assignments AS MATERIALIZED (
           SELECT DISTINCT ON (a.lead_id)
                  a.lead_id, a.status, a.accepted_at
             FROM public.agent_assignments a
             JOIN eligible_leads e ON e.id = a.lead_id
            WHERE a.created_at < ${endParam}
            ORDER BY a.lead_id, a.created_at DESC, a.id DESC
         ), notification_evidence AS MATERIALIZED (
           SELECT n.id, n.status, n.provider_message_id, n.metadata,
                  EXISTS (
                    SELECT 1
                      FROM public.communication_events ce
                     WHERE ce.lead_notification_id = n.id AND ce.occurred_at < ${endParam}
                       AND ce.event_type IN ('delivered', 'opened', 'clicked')
                  ) AS delivered_event
             FROM public.lead_notifications n
             JOIN eligible_leads e ON e.id = n.lead_id
            WHERE n.created_at < ${endParam}
         ), duplicate_aliases AS MATERIALIZED (
           SELECT l.id
             FROM public.leads l
            WHERE ${cohortClause}
              AND l.is_test = false
              AND l.communication_suppressed = false
              AND (COALESCE(l.is_duplicate, false) = true OR l.duplicate_of_lead_id IS NOT NULL)${scopeClause}
         ), scoped_ai AS MATERIALIZED (
           SELECT u.mode, u.estimated_cost_usd
             FROM public.ai_usage_events u
             JOIN eligible_leads e ON e.id = u.lead_id
            WHERE u.is_test = false AND u.created_at < ${endParam}
         ), response_evidence AS MATERIALIZED (
           SELECT r.lead_id, r.first_human_response_at, e.created_at
             FROM public.lead_response_milestones r
             JOIN eligible_leads e ON e.id = r.lead_id
            WHERE r.is_test = false AND r.communication_suppressed = false
              AND r.first_human_response_at >= e.created_at
              AND r.first_human_response_at < ${endParam} AND r.created_at < ${endParam}
         )
         SELECT
           (SELECT count(*) FROM eligible_leads)::integer AS canonical_leads,
           (SELECT count(*) FROM response_evidence)::integer AS response_measured,
           (SELECT count(*) FROM response_evidence
             WHERE first_human_response_at <= created_at + interval '5 minutes')::integer AS response_within_target,
           (SELECT count(*) FROM latest_assignments)::integer AS assignments_measured,
           (SELECT count(*) FROM latest_assignments WHERE status = 'accepted' OR accepted_at IS NOT NULL)::integer AS assignments_accepted,
           (SELECT count(*) FROM latest_assignments WHERE status = 'pending')::integer AS assignments_pending,
           (SELECT count(*) FROM notification_evidence)::integer AS notification_intents,
           (SELECT count(*) FROM notification_evidence WHERE provider_message_id IS NOT NULL)::integer AS notifications_provider_accepted,
           (SELECT count(*) FROM notification_evidence
             WHERE status NOT IN ('failed', 'permanently_failed')
               AND COALESCE(metadata->>'provider_delivery_status', '') NOT IN ('failed', 'undelivered')
               AND (delivered_event
                 OR metadata->>'provider_delivery_status' = 'delivered'
                 OR metadata->>'provider_delivery_confirmed' = 'true'))::integer AS notifications_delivered,
           (SELECT count(*) FROM notification_evidence
             WHERE status IN ('failed', 'permanently_failed')
                OR metadata->>'provider_delivery_status' IN ('failed', 'undelivered'))::integer AS notifications_failed,
           (SELECT count(*) FROM duplicate_aliases)::integer AS duplicate_aliases,
           (SELECT count(*) FROM scoped_ai)::integer AS ai_requests,
           (SELECT count(*) FROM scoped_ai WHERE mode = 'openai_responses')::integer AS ai_provider_responses,
           (SELECT count(*) FROM scoped_ai WHERE mode = 'deterministic_fallback')::integer AS ai_fallbacks,
           (SELECT count(*) FROM scoped_ai WHERE mode = 'blocked')::integer AS ai_blocked,
           COALESCE((SELECT sum(estimated_cost_usd) FROM scoped_ai), 0)::numeric AS ai_estimated_cost_usd`,
        args,
      ),
    ]);

    const normalized = (leadRows as Array<Record<string, unknown>>).map(normalizeReportingLeadRow);
    const liveLeadIds = new Set(normalized.map((row) => row.id));
    const liveAppointmentRows = filterOperationalRowsForLiveLeads(
      appointmentRows as Array<Record<string, unknown>>,
      liveLeadIds,
    );
    const liveFollowupRows = filterOperationalRowsForLiveLeads(
      followupRows as Array<Record<string, unknown>>,
      liveLeadIds,
    );
    const agentIds = aggregateOnly ? [] : [...new Set(normalized.map((row) => row.assigned_agent_id).filter(Boolean))] as string[];
    const agentRows = agentIds.length
      ? await sql.query(
          `SELECT id, name FROM public.agents WHERE id = ANY($1::uuid[])`,
          [agentIds],
        )
      : [];
    const agentNames = new Map<string, string>();
    for (const row of agentRows as Array<Record<string, unknown>>) {
      if (typeof row.id === "string" && typeof row.name === "string") {
        agentNames.set(row.id, row.name);
      }
    }

    const summary = summarizeReportingRows(
      normalized,
      now,
      windowDays,
      agentNames,
      liveAppointmentRows,
      liveFollowupRows,
      {
        test: Number((exclusionRows as Array<Record<string, unknown>>)[0]?.excluded_test || 0),
        suppressed: Number((exclusionRows as Array<Record<string, unknown>>)[0]?.excluded_suppressed || 0),
        duplicate: Number((exclusionRows as Array<Record<string, unknown>>)[0]?.excluded_duplicate || 0),
      },
      { complete: true, scope: aggregateOnly ? "aggregate_only" : scoped ? "assigned_live_leads" : "all_live_leads" },
    );
    const operationalTrust = normalizeOperationalTrustRow(
      (operationalRows as Array<Record<string, unknown>>)[0],
    );
    const excludedDuplicates = Number(
      (exclusionRows as Array<Record<string, unknown>>)[0]?.excluded_duplicate || 0,
    );
    const complete = {
      ...summary,
      operationalTrust,
      dataTrust: { ...summary.dataTrust, excludedDuplicates },
    };
    return aggregateOnly ? { ...complete, rows: [], hotLeads: [], topPages: [], agentPerformance: [] } : complete;
  } catch {
    return emptySummary(true, windowDays, now, "Canonical Neon reporting query failed");
  }
}

/** Stable, bounded read-only drill-through. Totals remain the separate full
 * scoped-cohort reconciliation; this page query never computes/caps totals. */
export async function loadNeonAdminReportingDrillthrough(input: {
  principal: LeadCenterPrincipal | null;
  windowDays?: 7 | 30 | 90;
  cursor?: string;
  limit?: number;
  asOf?: Date;
}): Promise<AdminReportingDrillthrough> {
  const windowDays = input.windowDays || 30;
  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(100, Math.floor(input.limit!))) : 50;
  const sql = queryFromEnv();
  const empty = (error?: string): AdminReportingDrillthrough => ({ configured: Boolean(sql), rows: [], limit,
    hasMore: false, nextCursor: null, ...(error ? { error } : {}) });
  if (!sql) return empty();
  const principal = input.principal;
  if (!principal) return empty("lead_center_principal_required");
  if (!hasLeadCenterPermission(principal.role, "report:view") ||
    !(hasLeadCenterPermission(principal.role, "lead:view_all") || hasLeadCenterPermission(principal.role, "lead:view_assigned"))) {
    return empty("lead_center_drillthrough_permission_required");
  }
  const scoped = !hasLeadCenterPermission(principal.role, "lead:view_all");
  if (scoped && !principal.agentId) return empty("lead_center_agent_scope_required");
  const cursor = input.cursor ? parseReportingDrillthroughCursor(input.cursor, windowDays) : null;
  if (input.cursor && !cursor) return empty("invalid_reporting_cursor");
  const end = cursor?.end || input.asOf || new Date();
  const cutoff = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const args: unknown[] = scoped ? [cutoff, principal.agentId, end.toISOString()] : [cutoff, end.toISOString()];
  const endParam = scoped ? "$3::timestamptz" : "$2::timestamptz";
  let cursorClause = "";
  if (cursor) {
    args.push(cursor.createdAt, cursor.id);
    cursorClause = ` AND (l.created_at, l.id) < ($${args.length - 1}::timestamptz, $${args.length}::uuid)`;
  }
  args.push(limit + 1);
  try {
    const records = await sql.query(
      `SELECT l.id, to_char(l.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
              l.assigned_agent_id
         FROM public.leads l
        WHERE l.created_at >= $1::timestamptz AND l.created_at < ${endParam}
          AND l.is_test = false AND l.communication_suppressed = false
          AND l.status NOT IN ('spam', 'test', 'internal_qa')
          AND COALESCE(l.is_duplicate, false) = false AND l.duplicate_of_lead_id IS NULL
          ${scoped ? "AND l.assigned_agent_id = $2::uuid" : ""}${cursorClause}
        ORDER BY l.created_at DESC, l.id DESC LIMIT $${args.length}::integer`, args,
    ) as Array<{ id: string; created_at: string; assigned_agent_id: string | null }>;
    const rows = records.slice(0, limit);
    const hasMore = records.length > limit;
    const last = rows.at(-1);
    return { configured: true, rows, limit, hasMore,
      nextCursor: hasMore && last
        ? `${windowDays}~${end.toISOString()}~${last.created_at}~${last.id}` : null };
  } catch { return empty("Canonical Neon reporting drill-through query failed"); }
}
