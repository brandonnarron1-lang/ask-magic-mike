/**
 * Launch Control — read-only data aggregator.
 *
 * Loads existing admin engines and synthesizes a go/no-go verdict.
 * No writes. No outbound. Degrades gracefully when Supabase is absent.
 */

import { buildLaunchReadiness } from "./traffic-launch-readiness";
import { buildLeadSourceReconciliation } from "./lead-source-reconciliation";
import type { LaunchChecklistItem, DoNotPostItem } from "./traffic-launch-readiness";
import type { RevenueCommandData } from "./revenue-command";
import type { DashboardMetrics } from "./dashboard-metrics";
import type { LeadSourceReconciliation } from "./lead-source-reconciliation";

export type DimensionStatus = "pass" | "warn" | "fail";
export type LaunchVerdict = "Go" | "Go With Conditions" | "No Go";

export interface ReadinessDimension {
  key: string;
  label: string;
  status: DimensionStatus;
  detail: string;
  ownerAction?: string;
}

export interface LaunchControlData {
  configured: boolean;
  readinessScore: number;
  verdict: LaunchVerdict;
  verdictReason: string;
  dimensions: ReadinessDimension[];
  ownerActions: string[];
  trafficChecklist: LaunchChecklistItem[];
  doNotPostList: DoNotPostItem[];
  nextBestAction: string;
  socialPreviewScore: string;
  reconciliation: LeadSourceReconciliation | null;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Pure dimension builder — testable without DB
// ---------------------------------------------------------------------------

export function computeLaunchDimensions(
  traffic: ReturnType<typeof buildLaunchReadiness>,
  metrics: DashboardMetrics,
  revenue: RevenueCommandData | null,
): ReadinessDimension[] {
  const dims: ReadinessDimension[] = [];

  // 1. Traffic / social posting
  dims.push({
    key: "traffic",
    label: "Traffic Readiness",
    status: traffic.ammLinksSafe
      ? traffic.otpFacebookLinksSafe
        ? "pass"
        : "warn"
      : "fail",
    detail: traffic.ammLinksSafe
      ? traffic.otpFacebookLinksSafe
        ? "All posting domains verified safe."
        : "AMM links safe. OTP Facebook blocked — WAF fix pending at Regency/Liquid Web."
      : "AMM funnel not verified. Run pnpm run amm:verify:social-preview.",
    ownerAction: !traffic.ammLinksSafe
      ? "Run pnpm run amm:verify:social-preview before posting."
      : !traffic.otpFacebookLinksSafe
      ? "Contact Regency/Liquid Web to whitelist facebookexternalhit for ourtownproperties.com."
      : undefined,
  });

  // 2. Lead capture
  const leads24h = revenue?.funnelHealth.leads24h ?? 0;
  const leads7d  = revenue?.funnelHealth.leads7d  ?? 0;
  dims.push({
    key: "lead_capture",
    label: "Lead Capture",
    status: !revenue
      ? "warn"
      : leads24h > 0
      ? "pass"
      : leads7d > 0
      ? "warn"
      : "fail",
    detail: !revenue
      ? "Database not configured — lead capture not verifiable."
      : leads24h > 0
      ? `${leads24h} lead${leads24h !== 1 ? "s" : ""} in the last 24 h.`
      : leads7d > 0
      ? `No leads in the last 24 h, but ${leads7d} in the last 7 days.`
      : "No leads in the last 7 days. Check funnel connectivity.",
    ownerAction:
      revenue && leads7d === 0
        ? "Verify /ask form is live and submitting to the database."
        : undefined,
  });

  // 3. Attribution
  const unattributed7d = revenue?.funnelHealth.unattributed7d ?? 0;
  const unattribPct = leads7d > 0 ? unattributed7d / leads7d : 0;
  dims.push({
    key: "attribution",
    label: "Attribution",
    status: !revenue
      ? "warn"
      : unattribPct < 0.2
      ? "pass"
      : unattribPct < 0.5
      ? "warn"
      : "fail",
    detail: !revenue
      ? "Database not configured — attribution not verifiable."
      : `${Math.round(unattribPct * 100)}% of 7-day leads missing source attribution (${unattributed7d}/${leads7d}).`,
    ownerAction:
      revenue && unattribPct >= 0.5
        ? "Review UTM parameters and source_attribution table. Check captureAttribution() is firing."
        : revenue && unattribPct >= 0.2
        ? "Some leads missing attribution — confirm UTM copy bank links are in use."
        : undefined,
  });

  // 4. Follow-up
  const overdueSla     = metrics.totals.overdueSla;
  const neverContacted = metrics.totals.neverContacted;
  dims.push({
    key: "follow_up",
    label: "Follow-Up",
    status: !metrics.configured
      ? "warn"
      : overdueSla >= 5
      ? "fail"
      : overdueSla > 0 || neverContacted > 10
      ? "warn"
      : "pass",
    detail: !metrics.configured
      ? "Database not configured — follow-up queue not visible."
      : overdueSla >= 5
      ? `${overdueSla} SLA breaches and ${neverContacted} leads never contacted.`
      : overdueSla > 0
      ? `${overdueSla} SLA breach${overdueSla > 1 ? "es" : ""} — action needed.`
      : neverContacted > 0
      ? `${neverContacted} lead${neverContacted !== 1 ? "s" : ""} never contacted. SLA clear.`
      : "SLA clear. All leads contacted.",
    ownerAction:
      metrics.configured && (overdueSla > 0 || neverContacted > 10)
        ? "Review /admin/ops for the priority action queue."
        : undefined,
  });

  // 5. Routing
  const routing = revenue?.routing ?? null;
  dims.push({
    key: "routing",
    label: "Routing",
    status: !revenue
      ? "warn"
      : routing === null
      ? "warn"
      : routing.unassigned > 0
      ? "warn"
      : "pass",
    detail: !revenue
      ? "Database not configured — routing not verifiable."
      : routing === null
      ? "Routing table not found. Lead assignment may be manual."
      : routing.unassigned > 0
      ? `${routing.unassigned} lead${routing.unassigned !== 1 ? "s" : ""} unassigned. ${routing.assigned} assigned.`
      : `All leads assigned. ${routing.assigned} active assignment${routing.assigned !== 1 ? "s" : ""}.`,
    ownerAction:
      routing && routing.unassigned > 0
        ? "Assign unassigned leads via /admin/routing or add active agents."
        : undefined,
  });

  // 6. Revenue tracking
  const pipelineLeads = revenue?.pipelineLeads ?? [];
  dims.push({
    key: "revenue_tracking",
    label: "Revenue Tracking",
    status: !revenue
      ? "warn"
      : pipelineLeads.length >= 3
      ? "pass"
      : pipelineLeads.length > 0
      ? "warn"
      : "fail",
    detail: !revenue
      ? "Database not configured — revenue pipeline not verifiable."
      : pipelineLeads.length >= 3
      ? `${pipelineLeads.length} leads in the revenue pipeline.`
      : pipelineLeads.length > 0
      ? `${pipelineLeads.length} lead${pipelineLeads.length !== 1 ? "s" : ""} in the pipeline — still building.`
      : "No pipeline leads. Score and grade incoming leads to build the forecast.",
    ownerAction:
      revenue && pipelineLeads.length === 0
        ? "Use /admin/leads to score and grade new leads."
        : undefined,
  });

  // 7. Admin / auth
  dims.push({
    key: "admin_auth",
    label: "Admin / Auth",
    status: metrics.configured ? "pass" : "warn",
    detail: metrics.configured
      ? "Supabase configured. Admin access verified."
      : "Supabase not configured. Admin running in dev/read-only mode.",
    ownerAction: !metrics.configured
      ? "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in production."
      : undefined,
  });

  // 8. Public route health
  const funnelChecksDone = traffic.launchChecklist
    .filter((s) => s.step <= 2)
    .every((s) => s.status === "done");
  const hasBlockedSteps = traffic.launchChecklist.some((s) => s.status === "blocked");
  dims.push({
    key: "public_routes",
    label: "Public Routes",
    status: funnelChecksDone
      ? hasBlockedSteps
        ? "warn"
        : "pass"
      : "fail",
    detail: funnelChecksDone
      ? hasBlockedSteps
        ? "AMM funnel routes verified. OTP Facebook preview blocked — see Traffic dimension."
        : "All funnel routes verified."
      : "Funnel route verification not confirmed. Run pnpm run amm:verify:funnel.",
    ownerAction: !funnelChecksDone
      ? "Run pnpm run amm:verify:funnel and confirm /ask, /value, /embed return 200."
      : undefined,
  });

  return dims;
}

// ---------------------------------------------------------------------------
// Verdict engine — pure, testable
// ---------------------------------------------------------------------------

const DIM_SCORE: Record<DimensionStatus, number> = { pass: 2, warn: 1, fail: 0 };

export function computeVerdict(dimensions: ReadinessDimension[]): {
  score: number;
  verdict: LaunchVerdict;
  reason: string;
} {
  const earned = dimensions.reduce((sum, d) => sum + DIM_SCORE[d.status], 0);
  const max    = dimensions.length * 2;
  const score  = max > 0 ? Math.round((earned / max) * 100) : 0;

  const failing = dimensions.filter((d) => d.status === "fail");
  const warning = dimensions.filter((d) => d.status === "warn");

  let verdict: LaunchVerdict;
  let reason: string;

  if (score >= 88 && failing.length === 0) {
    verdict = "Go";
    reason  = warning.length > 0
      ? `${warning.length} dimension${warning.length > 1 ? "s" : ""} have minor warnings but no blockers.`
      : "All dimensions pass. Ready to launch.";
  } else if (score >= 63 && failing.length <= 1) {
    verdict = "Go With Conditions";
    reason  = failing.length === 1
      ? `${failing[0].label} needs attention before full launch.`
      : `${warning.length} dimension${warning.length > 1 ? "s" : ""} require action.`;
  } else {
    verdict = "No Go";
    reason  = failing.length > 0
      ? `${failing.length} critical dimension${failing.length > 1 ? "s" : ""} failing: ${failing.map((d) => d.label).join(", ")}.`
      : "Too many warnings to proceed. Resolve items below.";
  }

  return { score, verdict, reason };
}

// ---------------------------------------------------------------------------
// Async loader — aggregates all engines
// ---------------------------------------------------------------------------

export async function loadLaunchControl(): Promise<LaunchControlData> {
  const traffic = buildLaunchReadiness();

  const { loadDashboardMetrics } = await import("./dashboard-metrics");
  const metrics = await loadDashboardMetrics();

  let revenue: RevenueCommandData | null = null;
  let reconciliation: LeadSourceReconciliation | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const [{ createAdminClient }, { loadRevenueCommand }] = await Promise.all([
        import("@/lib/supabase/admin"),
        import("./revenue-command"),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      revenue = await loadRevenueCommand(createAdminClient() as any);
      reconciliation = buildLeadSourceReconciliation(revenue);
    } catch {
      // Non-fatal — degrade to traffic-only view
    }
  }

  const dimensions  = computeLaunchDimensions(traffic, metrics, revenue);
  const { score, verdict, reason } = computeVerdict(dimensions);

  const ownerActions = dimensions
    .filter((d) => d.ownerAction)
    .map((d) => d.ownerAction as string);

  return {
    configured: metrics.configured,
    readinessScore: score,
    verdict,
    verdictReason: reason,
    dimensions,
    ownerActions,
    trafficChecklist: traffic.launchChecklist,
    doNotPostList: traffic.doNotPostList,
    nextBestAction: traffic.nextBestAction,
    socialPreviewScore: traffic.socialPreviewScore,
    reconciliation,
    generatedAt: new Date().toISOString(),
  };
}
