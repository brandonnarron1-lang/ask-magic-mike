/**
 * Revenue Sentinel — read-only alert and action logic.
 *
 * Derives all signal from a RevenueCommandData snapshot.
 * No database queries. No writes. No outbound messaging.
 */

import type { RevenueCommandData } from "./revenue-command";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SentinelSeverity = "ok" | "info" | "warning" | "critical";

export interface RevenueSentinelAlert {
  id: string;
  severity: SentinelSeverity;
  title: string;
  message: string;
  action: string;
  metric?: string;
  value?: number | string;
}

export interface TodayActionItem {
  id: string;
  priority: "urgent" | "high" | "normal";
  title: string;
  reason: string;
  action: string;
  leadId?: string;
  leadDetailHref?: string;
}

export interface RevenueSentinelResult {
  generatedAt: string;
  overallStatus: SentinelSeverity;
  alerts: RevenueSentinelAlert[];
  todayActions: TodayActionItem[];
  summary: {
    criticalCount: number;
    warningCount: number;
    actionCount: number;
    highIntent24h: number;
    wordpressWidget24h: number;
    unattributed7d: number;
  };
}

// ---------------------------------------------------------------------------
// Severity ordering
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<SentinelSeverity, number> = {
  ok: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

function max(a: SentinelSeverity, b: SentinelSeverity): SentinelSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Main builder — pure, synchronous, derives from command data
// ---------------------------------------------------------------------------

export function buildRevenueSentinel(data: RevenueCommandData): RevenueSentinelResult {
  const alerts: RevenueSentinelAlert[] = [];
  const todayActions: TodayActionItem[] = [];

  const {
    funnelHealth,
    followUpQueue,
    routing,
    syntheticResidues,
  } = data;

  const {
    wordpressWidget24h,
    wordpressWidget7d,
    unattributed7d,
    highIntent24h,
  } = funnelHealth;

  // -------------------------------------------------------------------------
  // Rule 1 — Funnel Quiet (24h zero but 7d non-zero)
  // -------------------------------------------------------------------------
  if (wordpressWidget24h === 0 && wordpressWidget7d > 0) {
    alerts.push({
      id: "funnel-quiet-24h",
      severity: "warning",
      title: "WordPress funnel quiet in last 24 h",
      message: `No WordPress-attributed leads in the last 24 h, but ${wordpressWidget7d} arrived in the last 7 d. The funnel may be temporarily quiet or a CTA may have changed.`,
      action: "Run live funnel QA and confirm /ask-mike/, homepage CTA, and Mike profile CTA still point to the canonical funnel.",
      metric: "wordpressWidget24h",
      value: 0,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 2 — Funnel Dead (both 24h and 7d zero)
  // -------------------------------------------------------------------------
  if (wordpressWidget24h === 0 && wordpressWidget7d === 0) {
    alerts.push({
      id: "funnel-dead-7d",
      severity: "critical",
      title: "No WordPress-attributed leads in 7 days",
      message: "Zero website_widget leads in the last 7 days. The OTP embed may be broken or the CTA may be pointing to the wrong URL.",
      action: "Run funnel verification immediately and inspect OTP CTA placement.",
      metric: "wordpressWidget7d",
      value: 0,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 3 — Missing Attribution
  // -------------------------------------------------------------------------
  if (unattributed7d > 0) {
    alerts.push({
      id: "missing-attribution-7d",
      severity: "warning",
      title: "Unattributed leads detected",
      message: `${unattributed7d} lead${unattributed7d !== 1 ? "s" : ""} in the last 7 d have no source_attribution row. Attribution data may be dropped at submission.`,
      action: "Check amm-loader.js, iframe UTM capture, and source_attribution writes.",
      metric: "unattributed7d",
      value: unattributed7d,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 4 — High Intent Today
  // -------------------------------------------------------------------------
  if (highIntent24h > 0) {
    alerts.push({
      id: "high-intent-24h",
      severity: "info",
      title: "High-intent lead activity today",
      message: `${highIntent24h} hot or urgent lead${highIntent24h !== 1 ? "s" : ""} created in the last 24 h.`,
      action: "Review the Action Priority Queue first.",
      metric: "highIntent24h",
      value: highIntent24h,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 5 — Synthetic Residue
  // -------------------------------------------------------------------------
  if (syntheticResidues.length > 0) {
    alerts.push({
      id: "synthetic-residue",
      severity: "warning",
      title: "Synthetic/test residue visible",
      message: `${syntheticResidues.length} test lead${syntheticResidues.length !== 1 ? "s" : ""} found. These are from integration QA and are not real people.`,
      action: "Do not contact synthetic records. Keep them excluded from follow-up.",
      metric: "syntheticResidueCount",
      value: syntheticResidues.length,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 6 — Unassigned Leads
  // -------------------------------------------------------------------------
  if (routing && routing.unassigned > 0) {
    alerts.push({
      id: "unassigned-leads",
      severity: "warning",
      title: "Unassigned leads need review",
      message: `${routing.unassigned} lead${routing.unassigned !== 1 ? "s" : ""} have no assigned agent.`,
      action: "Assign or review ownership before follow-up stalls.",
      metric: "unassignedCount",
      value: routing.unassigned,
    });
  }

  // -------------------------------------------------------------------------
  // Rule 7 — Oldest Unassigned >= 24 h
  // -------------------------------------------------------------------------
  if (routing?.oldestUnassignedAge) {
    const ageMs = Date.now() - new Date(routing.oldestUnassignedAge).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours >= 24) {
      alerts.push({
        id: "oldest-unassigned-24h",
        severity: "critical",
        title: "Unassigned lead older than 24 hours",
        message: `The oldest unassigned lead has been waiting ${Math.floor(ageHours)} h. Unassigned hot leads go cold quickly.`,
        action: "Review routing and assign owner.",
        metric: "oldestUnassignedAgeHours",
        value: Math.floor(ageHours),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Today Action Board — build up to 8 items
  // -------------------------------------------------------------------------

  // Source 1: First 3 hot/urgent leads from queue
  const hotUrgentLeads = followUpQueue
    .filter((l) => l.temperature === "hot" || l.temperature === "urgent")
    .slice(0, 3);

  for (const lead of hotUrgentLeads) {
    todayActions.push({
      id: `lead-priority-${lead.id}`,
      priority: lead.temperature === "urgent" ? "urgent" : "high",
      title: `Follow up with ${lead.firstName ?? "lead"} (${lead.temperature})`,
      reason: `Temperature: ${lead.temperature}${lead.score != null ? `, score ${lead.score}` : ""}`,
      action: "Open lead detail and initiate contact.",
      leadId: lead.id,
      leadDetailHref: lead.leadDetailUrl,
    });
  }

  // Source 2: First 3 unassigned leads from queue (not already added)
  const addedLeadIds = new Set(hotUrgentLeads.map((l) => l.id));
  const unassignedLeads = followUpQueue
    .filter((l) => !l.assigned && !addedLeadIds.has(l.id))
    .slice(0, 3);

  for (const lead of unassignedLeads) {
    todayActions.push({
      id: `lead-unassigned-${lead.id}`,
      priority: "high",
      title: `Assign lead: ${lead.firstName ?? lead.id}`,
      reason: "No agent assigned — ownership gap.",
      action: "Review lead detail and assign owner in CRM.",
      leadId: lead.id,
      leadDetailHref: lead.leadDetailUrl,
    });
  }

  // Source 3: Attribution remediation
  if (unattributed7d > 0) {
    todayActions.push({
      id: "action-attribution-gap",
      priority: "normal",
      title: "Investigate attribution gap",
      reason: `${unattributed7d} lead${unattributed7d !== 1 ? "s" : ""} in 7 d have no source attribution.`,
      action: "Run pnpm run amm:verify:funnel and check source_attribution writes.",
    });
  }

  // Source 4: Funnel QA
  if (wordpressWidget24h === 0) {
    todayActions.push({
      id: "action-funnel-qa",
      priority: wordpressWidget7d === 0 ? "urgent" : "normal",
      title: "Run live funnel QA",
      reason: wordpressWidget7d === 0
        ? "No WordPress-attributed leads in 7 days — funnel may be broken."
        : "No WordPress-attributed leads in the last 24 h.",
      action: "Run: pnpm run amm:verify:funnel",
    });
  }

  // Source 5: Synthetic residue review
  if (syntheticResidues.length > 0) {
    todayActions.push({
      id: "action-synthetic-review",
      priority: "normal",
      title: "Review synthetic/test lead residue",
      reason: `${syntheticResidues.length} test record${syntheticResidues.length !== 1 ? "s" : ""} in production. Not real people — do not contact.`,
      action: "Verify these are known QA seeds and take no follow-up action.",
    });
  }

  // Sort: urgent first, high second, normal third; cap at 8
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
  todayActions.sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
  );
  const cappedActions = todayActions.slice(0, 8);

  // -------------------------------------------------------------------------
  // Overall status — highest severity alert
  // -------------------------------------------------------------------------
  let overallStatus: SentinelSeverity = "ok";
  for (const alert of alerts) {
    overallStatus = max(overallStatus, alert.severity);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount  = alerts.filter((a) => a.severity === "warning").length;

  return {
    generatedAt: data.generatedAt,
    overallStatus,
    alerts,
    todayActions: cappedActions,
    summary: {
      criticalCount,
      warningCount,
      actionCount: cappedActions.length,
      highIntent24h,
      wordpressWidget24h,
      unattributed7d,
    },
  };
}
