export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { AnalyticsCard, MetricGrid, MetricTile } from "@/components/admin/analytics/analytics-card";
import { InsightCard } from "@/components/admin/analytics/insight-card";
import { TrendBadge } from "@/components/admin/analytics/trend-badge";
import { RecommendationCard } from "@/components/admin/analytics/recommendation-card";
import { EmptyState } from "@/components/admin/analytics/empty-state";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import {
  calculateConversion,
  calculateTrend,
  calculateSourceRank,
} from "@/lib/admin/intelligence-engine";
import {
  buildSourceRecommendations,
  type SourceSignal,
} from "@/lib/admin/recommendation-engine";
import { buildSourceRollup } from "@/lib/admin/source-attribution-rollup";
import type { AttrInputRow } from "@/lib/admin/source-attribution-rollup";

// ---------------------------------------------------------------------------
// PLATFORM DISPLAY METADATA
// ---------------------------------------------------------------------------

const PLATFORM_META: Record<string, { color: string; desc: string }> = {
  "Facebook":       { color: "text-blue-400",    desc: "Organic posts, Groups, Ads" },
  "Instagram":      { color: "text-pink-400",    desc: "Posts, Reels, Stories, Ads" },
  "Threads":        { color: "text-slate-300",   desc: "Text posts and engagement" },
  "LinkedIn":       { color: "text-sky-400",     desc: "Professional network posts" },
  "X / Twitter":    { color: "text-slate-300",   desc: "Short-form and linked content" },
  "YouTube":        { color: "text-ruby-400",    desc: "Video content and CTAs" },
  "Email":          { color: "text-amber-400",   desc: "Email campaigns and signatures" },
  "Direct":         { color: "text-cream",       desc: "Direct URL or typed navigation" },
  "QR Code":        { color: "text-emerald-400", desc: "Flyer and print QR scans" },
  "Website Widget": { color: "text-gold-300",    desc: "WordPress AMM widget" },
  "Google":         { color: "text-cyan-400",    desc: "Google Search / Organic" },
  "Bing":           { color: "text-sky-300",     desc: "Bing Search" },
  "Organic Search": { color: "text-emerald-300", desc: "General organic search" },
  "Referral":       { color: "text-violet-400",  desc: "Inbound referral links" },
  "Other":          { color: "text-slate-500",   desc: "Uncategorized traffic" },
};

// ---------------------------------------------------------------------------
// Suggested actions by platform
// ---------------------------------------------------------------------------

const SUGGESTED_ACTIONS: Record<string, string> = {
  "Facebook":       "Increase posting frequency; run story CTAs",
  "Instagram":      "Test Reels format; add Ask link to bio",
  "Threads":        "Engage daily; comment on trending real estate topics",
  "LinkedIn":       "Post broker insights; target relocation audience",
  "X / Twitter":    "Tweet market updates with UTM link in replies",
  "QR Code":        "Deploy on printed flyers in Wilson neighborhoods",
  "Website Widget": "Ensure widget placement above the fold on all pages",
  "Email":          "Add UTM-tracked Ask link to every email signature",
  "Google":         "Optimize /ask and /value meta descriptions",
  "Direct":         "Ensure vanity URL askmagicmike.com is in all offline materials",
  "Referral":       "Identify top referral domains and cultivate those relationships",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SourceIntelligencePage() {
  const metrics = await loadDashboardMetrics();
  const devMode = !metrics.configured;

  const total = metrics.recentLeads.length;
  const bySource = metrics.bySource;

  // Build source rollup from summary data
  // The bySource array gives us platform counts; synthesize rollup input
  const attrRows: AttrInputRow[] = bySource.map((s) => ({
    utm_source: s.source,
    referrer_type: null,
    utm_medium: null,
    is_paid: null,
  }));

  const rollup = attrRows.length > 0
    ? buildSourceRollup(attrRows)
    : null;

  // Build signals for recommendation engine
  const sourceSignals: SourceSignal[] = bySource.slice(0, 8).map((s) => ({
    platform: s.source ?? "Unknown",
    count7d: s.count,
    conversion: total > 0 ? (s.count / total) * 100 : 0,
    trend: 0, // trend not available without historical data
  }));

  const sourceRecs = buildSourceRecommendations(sourceSignals);

  // Rank sources
  const avgConversion = 100 / Math.max(1, bySource.length);
  const rankedSources = bySource.map((s) => {
    const conv = total > 0 ? (s.count / total) * 100 : 0;
    const rank = calculateSourceRank(s.count, conv, total, avgConversion);
    const trend = calculateTrend(s.count, Math.max(0, s.count - 1)); // placeholder trend
    return { ...s, conv, rank, trend };
  }).sort((a, b) => b.count - a.count);

  return (
    <AdminShell
      title="Source Intelligence"
      eyebrow="Ask Magic Mike · Analytics"
      backHref="/admin/analytics"
      backLabel="← executive"
      devMode={devMode}
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Summary metrics ── */}
        <AnalyticsCard title="Traffic Overview" accent="gold">
          <MetricGrid cols={4}>
            <MetricTile label="Total Leads"    value={total}                      accent />
            <MetricTile label="Sources Active" value={bySource.length}            />
            <MetricTile label="Top Source"     value={bySource[0]?.source ?? "—"} />
            <MetricTile
              label="Organic"
              value={rollup?.organicCount ?? "—"}
              sub={rollup ? `${((rollup.organicCount / Math.max(1, total)) * 100).toFixed(0)}% of total` : undefined}
            />
          </MetricGrid>
        </AnalyticsCard>

        {/* ── Platform breakdown ── */}
        <AnalyticsCard
          title="Platform Breakdown"
          subtitle="Lead count and share by traffic source — current 500-lead window"
        >
          {rankedSources.length === 0 ? (
            <EmptyState
              title="No source data available"
              description="UTM parameters and referrer data will populate this section once leads arrive."
              variant="data"
            />
          ) : (
            <div className="space-y-2 mt-2">
              {rankedSources.map((s, i) => {
                const conv = calculateConversion(s.count, total);
                const meta = PLATFORM_META[s.source ?? ""] ?? { color: "text-slate-400", desc: "" };
                const action = SUGGESTED_ACTIONS[s.source ?? ""] ?? "Continue monitoring this source";
                const barWidth = Math.max(4, (s.count / Math.max(1, rankedSources[0].count)) * 100);

                return (
                  <div
                    key={s.source ?? i}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank */}
                      <span className="text-[10px] font-mono text-slate-700 w-4 shrink-0 mt-1">
                        {i + 1}
                      </span>

                      {/* Platform info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <p className={["text-sm font-semibold leading-none", meta.color].join(" ")}>
                            {s.source ?? "Unknown"}
                          </p>
                          {meta.desc && (
                            <p className="text-[10px] text-slate-600">{meta.desc}</p>
                          )}
                          <TrendBadge trend={s.trend} className="ml-auto" />
                        </div>

                        {/* Bar */}
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gold-400/50 rounded-full"
                            style={{ width: `${barWidth}%` }}
                            aria-label={`${barWidth.toFixed(0)}% relative to top source`}
                          />
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <div>
                            <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                              Leads
                            </p>
                            <p className="text-sm font-mono text-cream tabular-nums">{s.count}</p>
                          </div>
                          <div>
                            <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                              Share
                            </p>
                            <p className="text-sm font-mono text-slate-300 tabular-nums">{conv.label}</p>
                          </div>
                          <div>
                            <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                              Suggested
                            </p>
                            <p className="text-[10px] text-slate-500 leading-snug">{action}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnalyticsCard>

        {/* ── Recommendations ── */}
        {sourceRecs.length > 0 && (
          <AnalyticsCard title="Source Recommendations" accent="amber">
            <div className="space-y-3 mt-1">
              {sourceRecs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} expanded />
              ))}
            </div>
          </AnalyticsCard>
        )}

        {/* ── UTM guidance ── */}
        <AnalyticsCard
          title="UTM Attribution Guide"
          subtitle="How to maximize attribution quality"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300">What is tracked automatically</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>UTM source from Ask Magic Mike campaign links</li>
                <li>WordPress widget referrer type</li>
                <li>Direct navigation (no referrer)</li>
              </ul>
            </div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-300">How to improve attribution</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Always use UTM links from Marketing Command</li>
                <li>Use QR codes with embedded UTM parameters</li>
                <li>Include UTM links in email signatures</li>
                <li>Never share bare askmagicmike.com URLs in campaigns</li>
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin/marketing"
              className="inline-flex items-center gap-1 text-xs text-gold-300/70 hover:text-gold-300 transition-colors"
            >
              Generate UTM links in Marketing Command →
            </Link>
          </div>
        </AnalyticsCard>

      </main>
    </AdminShell>
  );
}
