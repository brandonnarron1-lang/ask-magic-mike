/**
 * Weekly Executive Report Generator
 *
 * Builds a structured weekly summary from traffic command data.
 * No writes. No external calls. Export via clipboard copy in the UI.
 */

import type { TrafficCommandData } from "./traffic-command";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyExecutiveReport {
  periodLabel: string;
  generatedAt: string;

  revenue: {
    note: string;
    highIntentLeads24h: number;
    conversionRate: string;
    topSource: string | null;
  };

  leads: {
    total7d: number;
    real7d: number;
    synthetic7d: number;
    vsLastWeek: string;
  };

  traffic: {
    sessions7d: number;
    topLandingPage: string | null;
    topSource: string | null;
    organicVsPaid: string;
    returningPct: string;
  };

  conversion: {
    rate: string;
    topCampaign: string | null;
    websiteWidgetLeads: number;
  };

  questions: {
    totalAnalyzed: number;
    topCategory: string | null;
    highIntentCount: number;
    topQuestion: string | null;
  };

  recommendations: string[];

  exportText: string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildWeeklyExecutiveReport(
  data: TrafficCommandData,
  nowIso?: string
): WeeklyExecutiveReport {
  const now = nowIso ? new Date(nowIso) : new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const periodLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const conversionRate =
    data.summary.sessions7d > 0
      ? `${((data.summary.leads7d / data.summary.sessions7d) * 100).toFixed(1)}%`
      : "N/A";

  const organicCount = data.sourceRollup.organicCount;
  const paidCount    = data.sourceRollup.paidCount;
  const totalAttr    = organicCount + paidCount;
  const organicVsPaid =
    totalAttr > 0
      ? `${Math.round((organicCount / totalAttr) * 100)}% organic / ${Math.round((paidCount / totalAttr) * 100)}% paid`
      : "N/A";

  const returningPct =
    data.summary.sessions7d > 0
      ? `${((data.summary.returning7d / data.summary.sessions7d) * 100).toFixed(0)}% returning`
      : "N/A";

  const topQuestion = data.questionIntel.topQuestions[0]?.text ?? null;

  // Recommendations
  const recommendations: string[] = [];

  if (data.summary.leads7d === 0) {
    recommendations.push("0 leads this week — run pnpm run amm:verify:funnel to confirm the pipeline.");
  } else if (data.summary.leads7d < 3) {
    recommendations.push("Low lead volume — consider boosting the OTP website widget or posting locally on Facebook.");
  }

  if (data.questionIntel.highIntentCount > 0) {
    recommendations.push(
      `${data.questionIntel.highIntentCount} high-intent question${data.questionIntel.highIntentCount === 1 ? "" : "s"} this week — use the Viral Post Builder to turn them into social content.`
    );
  }

  if (data.summary.unattributed7d > 0) {
    recommendations.push(
      `${data.summary.unattributed7d} unattributed lead${data.summary.unattributed7d === 1 ? "" : "s"} — check the website widget UTM parameters.`
    );
  }

  if (data.sourceRollup.topPlatform) {
    recommendations.push(
      `Top traffic source is ${data.sourceRollup.topPlatform} — double down with one piece of content this week.`
    );
  }

  const fbBlocked = data.socialPreviewStatus === "blocked";
  if (fbBlocked) {
    recommendations.push(
      "Facebook preview still blocked on OTP — use direct AMM links in all social posts until Regency resolves the WAF issue."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("All systems healthy. Continue posting weekly and monitor lead volume.");
  }

  // Build export text
  const exportLines = [
    `ASK MAGIC MIKE — WEEKLY EXECUTIVE REPORT`,
    `Period: ${periodLabel}`,
    `Generated: ${now.toLocaleString()}`,
    ``,
    `LEADS`,
    `  Total (7d):        ${data.summary.leads7d}`,
    `  High-intent (24h): ${data.summary.highIntent24h}`,
    `  Unattributed (7d): ${data.summary.unattributed7d}`,
    `  Widget (7d):       ${data.summary.widgetLeads7d}`,
    ``,
    `TRAFFIC`,
    `  Sessions (7d):     ${data.summary.sessions7d}`,
    `  Conversion rate:   ${conversionRate}`,
    `  Top source:        ${data.sourceRollup.topPlatform ?? "—"}`,
    `  Top landing page:  ${data.summary.topLandingPage ?? "—"}`,
    `  Top campaign:      ${data.summary.topCampaign ?? "—"}`,
    `  Organic vs paid:   ${organicVsPaid}`,
    ``,
    `QUESTIONS`,
    `  Total analyzed:    ${data.questionIntel.totalQuestionsAnalyzed}`,
    `  Top category:      ${data.questionIntel.topCategory ?? "—"}`,
    `  High-intent:       ${data.questionIntel.highIntentCount}`,
    `  Top question:      ${topQuestion ?? "—"}`,
    ``,
    `RECOMMENDATIONS`,
    ...recommendations.map((r) => `  • ${r}`),
    ``,
    `Social Preview: ${fbBlocked ? "Facebook 403 on OTP — pending host WAF fix." : "All clear."}`,
    ``,
    `— Ask Magic Mike / Our Town Properties, Wilson NC`,
    `  askmagicmike.com`,
  ];

  return {
    periodLabel,
    generatedAt: now.toISOString(),
    revenue: {
      note: "Revenue tracked in CRM. High-intent leads below are the pipeline input.",
      highIntentLeads24h: data.summary.highIntent24h,
      conversionRate,
      topSource: data.sourceRollup.topPlatform,
    },
    leads: {
      total7d: data.summary.leads7d,
      real7d: data.summary.leads7d - data.summary.synthetic7d,
      synthetic7d: data.summary.synthetic7d,
      vsLastWeek: "N/A", // Would require a prior-week snapshot
    },
    traffic: {
      sessions7d: data.summary.sessions7d,
      topLandingPage: data.summary.topLandingPage,
      topSource: data.sourceRollup.topPlatform,
      organicVsPaid,
      returningPct,
    },
    conversion: {
      rate: conversionRate,
      topCampaign: data.summary.topCampaign,
      websiteWidgetLeads: data.summary.widgetLeads7d,
    },
    questions: {
      totalAnalyzed: data.questionIntel.totalQuestionsAnalyzed,
      topCategory: data.questionIntel.topCategory,
      highIntentCount: data.questionIntel.highIntentCount,
      topQuestion,
    },
    recommendations,
    exportText: exportLines.join("\n"),
  };
}
