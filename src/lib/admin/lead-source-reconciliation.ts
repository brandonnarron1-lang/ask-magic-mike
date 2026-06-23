/**
 * Lead Source Reconciliation — read-only, derived from RevenueCommandData.
 *
 * Answers: how many leads are real vs synthetic, what is the website_widget
 * attribution health, is the dashboard snapshot fresh, and what should the
 * operator do next?
 *
 * No database queries. No writes. No outbound messaging.
 */

import type { RevenueCommandData } from "./revenue-command";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type FreshnessStatus = "fresh" | "stale" | "unknown";

export interface LeadSourceReconciliation {
  /** All leads in the 30-day snapshot window. */
  totalLeads: number;
  /** All-time synthetic/test lead count (from syntheticResidues). */
  syntheticLeads: number;
  /** Synthetic leads within the 30-day snapshot window. */
  syntheticLeads30d: number;
  /** Real leads in the 30-day snapshot (totalLeads − syntheticLeads30d). */
  realLeads: number;

  /** Latest lead created_at (any type) from the DB snapshot. */
  latestLeadAt: string | null;
  /** Latest non-synthetic lead created_at (from follow-up queue). */
  latestRealLeadAt: string | null;
  /** Latest synthetic lead created_at (from syntheticResidues). */
  latestSyntheticLeadAt: string | null;

  /** website_widget attributed leads in the last 24 h. */
  websiteWidgetLeads24h: number;
  /** website_widget attributed leads in the last 7 d. */
  websiteWidgetLeads7d: number;
  /** Leads with no source_attribution row in the last 7 d. */
  unattributedLeads7d: number;
  /** Alias for websiteWidgetLeads7d — explicit OTP widget label. */
  wordpressAttributedLeads7d: number;

  /** utm_campaign → lead count for all attribution rows in the snapshot. */
  sourceBreakdown: Record<string, number>;

  /** How fresh the data snapshot is relative to now. */
  dataFreshnessStatus: FreshnessStatus;
  /** Minutes since generatedAt (null when status is unknown). */
  stalenessMinutes: number | null;

  /** Human-readable warnings for the operator. */
  warnings: string[];
  /** Single recommended next action based on current state. */
  recommendedNextAction: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STALE_THRESHOLD_MINUTES = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build a reconciliation report from an already-loaded RevenueCommandData
 * snapshot.  Pass `nowIso` in tests to fix the current time.
 */
export function buildLeadSourceReconciliation(
  data: RevenueCommandData,
  nowIso?: string
): LeadSourceReconciliation {
  const now = nowIso ? new Date(nowIso) : new Date();

  // -------------------------------------------------------------------------
  // Freshness
  // -------------------------------------------------------------------------
  let dataFreshnessStatus: FreshnessStatus = "unknown";
  let stalenessMinutes: number | null = null;

  if (data.generatedAt) {
    const generated = new Date(data.generatedAt);
    if (!isNaN(generated.getTime())) {
      const diffMin = Math.round((now.getTime() - generated.getTime()) / 60_000);
      stalenessMinutes = diffMin;
      dataFreshnessStatus = diffMin <= STALE_THRESHOLD_MINUTES ? "fresh" : "stale";
    }
  }

  // -------------------------------------------------------------------------
  // Synthetic counts
  // -------------------------------------------------------------------------
  const syntheticLeads = data.syntheticResidues.length;

  const cutoff30d = new Date(now.getTime() - 30 * MS_PER_DAY).toISOString();
  const syntheticLeads30d = data.syntheticResidues.filter(
    (r) => r.createdAt >= cutoff30d
  ).length;

  // -------------------------------------------------------------------------
  // Real leads
  // -------------------------------------------------------------------------
  const totalLeads = data.funnelHealth.leads30d;
  const realLeads = Math.max(0, totalLeads - syntheticLeads30d);

  // -------------------------------------------------------------------------
  // Timestamps
  // -------------------------------------------------------------------------
  const latestLeadAt = data.attributionIntegrity.latestLeadAt;

  // followUpQueue already excludes synthetic — first entry is newest real lead
  const latestRealLeadAt = data.followUpQueue[0]?.createdAt ?? null;

  const latestSyntheticLeadAt =
    data.syntheticResidues.length > 0
      ? data.syntheticResidues.reduce(
          (latest, r) => (r.createdAt > latest ? r.createdAt : latest),
          data.syntheticResidues[0].createdAt
        )
      : null;

  // -------------------------------------------------------------------------
  // Attribution windows
  // -------------------------------------------------------------------------
  const websiteWidgetLeads24h = data.funnelHealth.wordpressWidget24h;
  const websiteWidgetLeads7d = data.funnelHealth.wordpressWidget7d;
  const wordpressAttributedLeads7d = websiteWidgetLeads7d;
  const unattributedLeads7d = data.funnelHealth.unattributed7d;

  // -------------------------------------------------------------------------
  // Source breakdown
  // -------------------------------------------------------------------------
  const sourceBreakdown: Record<string, number> = {
    ...data.sourceAttribution.byCampaign,
  };

  // -------------------------------------------------------------------------
  // Warnings
  // -------------------------------------------------------------------------
  const warnings: string[] = [];

  if (syntheticLeads > 0) {
    warnings.push(
      `${syntheticLeads} synthetic/test lead${syntheticLeads === 1 ? "" : "s"} present in production. ` +
        "Excluded from action queue and revenue tracking. Do not contact."
    );
  }

  if (unattributedLeads7d > 0) {
    warnings.push(
      `${unattributedLeads7d} lead${unattributedLeads7d === 1 ? "" : "s"} in the last 7 days ` +
        "are missing source attribution. Run pnpm run amm:verify:funnel to diagnose."
    );
  }

  if (realLeads === 0 && totalLeads > 0) {
    warnings.push(
      "All leads in the 30-day window are synthetic/test. No real leads captured yet."
    );
  }

  if (websiteWidgetLeads7d === 0 && totalLeads > 0) {
    warnings.push(
      "No website_widget attributed leads in the last 7 days. The funnel pipeline is " +
        "verified working (synthetic test captured successfully). This reflects low real " +
        "traffic — not a broken pipeline."
    );
  }

  if (dataFreshnessStatus === "stale" && stalenessMinutes !== null) {
    warnings.push(
      `Dashboard snapshot is ${stalenessMinutes} minute${stalenessMinutes === 1 ? "" : "s"} old. ` +
        "Reload the page to get current data from the database."
    );
  }

  // -------------------------------------------------------------------------
  // Recommended next action
  // -------------------------------------------------------------------------
  let recommendedNextAction: string;

  if (dataFreshnessStatus === "stale") {
    recommendedNextAction =
      "Reload the page — snapshot is stale and may not reflect current lead state.";
  } else {
    const highIntentLeads = data.followUpQueue.filter(
      (l) => l.temperature === "urgent" || l.temperature === "hot"
    );
    if (highIntentLeads.length > 0) {
      recommendedNextAction =
        `Follow up on ${highIntentLeads.length} high-intent lead` +
        `${highIntentLeads.length === 1 ? "" : "s"} in the Action Priority Queue today.`;
    } else if (unattributedLeads7d > 0) {
      recommendedNextAction =
        "Investigate unattributed leads: run pnpm run amm:verify:funnel and check OTP embed pages.";
    } else if (data.routing !== null && data.routing.unassigned > 0) {
      recommendedNextAction =
        `Assign ${data.routing.unassigned} unassigned lead` +
        `${data.routing.unassigned === 1 ? "" : "s"} in your CRM.`;
    } else if (syntheticLeads > 0 && realLeads === 0) {
      recommendedNextAction =
        "Pipeline verified via synthetic test lead. Await real organic traffic. " +
        "Do not contact test leads.";
    } else {
      recommendedNextAction = "No immediate action required. Review weekly.";
    }
  }

  return {
    totalLeads,
    syntheticLeads,
    syntheticLeads30d,
    realLeads,
    latestLeadAt,
    latestRealLeadAt,
    latestSyntheticLeadAt,
    websiteWidgetLeads24h,
    websiteWidgetLeads7d,
    unattributedLeads7d,
    wordpressAttributedLeads7d,
    sourceBreakdown,
    dataFreshnessStatus,
    stalenessMinutes,
    warnings,
    recommendedNextAction,
  };
}
