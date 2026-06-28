export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { AnalyticsCard, MetricGrid, MetricTile } from "@/components/admin/analytics/analytics-card";
import { InsightCard } from "@/components/admin/analytics/insight-card";
import { RecommendationCard } from "@/components/admin/analytics/recommendation-card";
import { TrendBadge } from "@/components/admin/analytics/trend-badge";
import { PerformanceBadge } from "@/components/admin/analytics/performance-badge";
import { EmptyState } from "@/components/admin/analytics/empty-state";
import {
  ALL_CAMPAIGNS,
  buildCampaignAssets,
} from "@/lib/admin/campaign-assets";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import {
  calculateConversion,
  calculateTrend,
  calculateMomentum,
  calculateCampaignRank,
} from "@/lib/admin/intelligence-engine";
import {
  buildCampaignRecommendations,
  type CampaignSignal,
} from "@/lib/admin/recommendation-engine";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CampaignIntelligencePage() {
  const metrics = await loadDashboardMetrics();
  const devMode = !metrics.configured;

  const total = metrics.recentLeads.length;

  // Map campaign UTM slugs against source attribution
  const bySourceMap: Record<string, number> = {};
  for (const s of metrics.bySource) {
    if (s.source) bySourceMap[s.source.toLowerCase()] = s.count;
  }

  // Build campaign performance from what we can derive
  const campaignPerf = ALL_CAMPAIGNS.map((c) => {
    const utmMatch = bySourceMap[c.slug] ?? bySourceMap[c.slug.replace(/_/g, "-")] ?? 0;
    const conv = calculateConversion(utmMatch, Math.max(1, total));
    const trend = calculateTrend(utmMatch, Math.max(0, utmMatch - 1));
    const momentum = calculateMomentum(utmMatch, Math.max(0, utmMatch - 1), conv.rate);
    return { campaign: c, leads: utmMatch, conv, trend, momentum };
  });

  const totalCampaignLeads = campaignPerf.reduce((s, p) => s + p.leads, 0);
  const avgConversion = campaignPerf.length > 0
    ? campaignPerf.reduce((s, p) => s + p.conv.rate, 0) / campaignPerf.length
    : 0;
  const avgMomentum = campaignPerf.length > 0
    ? campaignPerf.reduce((s, p) => s + p.momentum.score, 0) / campaignPerf.length
    : 0;

  const rankedPerf = campaignPerf.map((p) => ({
    ...p,
    rank: calculateCampaignRank(p.conv.rate, p.momentum.score, avgConversion, avgMomentum),
  })).sort((a, b) => b.rank.score - a.rank.score);

  const topCampaign   = rankedPerf[0];
  const worstCampaign = rankedPerf[rankedPerf.length - 1];

  // Build signals for recommendations
  const signals: CampaignSignal[] = ALL_CAMPAIGNS.map((c) => {
    const p = campaignPerf.find((x) => x.campaign.slug === c.slug)!;
    return {
      slug: c.slug,
      name: c.name,
      conversionRate: p.conv.rate,
      leads7d: p.leads,
      leads7d_prev: Math.max(0, p.leads - 1),
      status: c.status,
    };
  });

  const recs = buildCampaignRecommendations(signals);

  return (
    <AdminShell
      title="Campaign Intelligence"
      eyebrow="Ask Magic Mike · Analytics"
      backHref="/admin/analytics"
      backLabel="← executive"
      devMode={devMode}
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Overview metrics ── */}
        <AnalyticsCard title="Campaign Overview" accent="gold">
          <MetricGrid cols={4}>
            <MetricTile label="Active Campaigns" value={ALL_CAMPAIGNS.filter((c) => c.status === "active").length} accent />
            <MetricTile label="Total Campaigns"  value={ALL_CAMPAIGNS.length} />
            <MetricTile label="Attributed Leads" value={totalCampaignLeads} />
            <MetricTile label="Top Campaign"     value={topCampaign?.campaign.name.split(" ")[0] ?? "—"} />
          </MetricGrid>
        </AnalyticsCard>

        {/* ── Top and bottom performers ── */}
        {rankedPerf.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topCampaign && (
              <InsightCard
                title="Best Performing Campaign"
                value={topCampaign.campaign.name}
                description={topCampaign.campaign.tagline}
                status="positive"
                badge="Leader"
              />
            )}
            {worstCampaign && worstCampaign.campaign.slug !== topCampaign?.campaign.slug && (
              <InsightCard
                title="Needs Attention"
                value={worstCampaign.campaign.name}
                description={`${worstCampaign.leads} attributed leads — review positioning`}
                status="warning"
                badge="Review"
              />
            )}
          </div>
        )}

        {/* ── Campaign scorecards ── */}
        <AnalyticsCard
          title="Campaign Scorecards"
          subtitle="All 6 Ask Magic Mike campaigns — UTM attribution from lead source data"
          action={
            <Link
              href="/admin/marketing"
              className="text-[10px] text-gold-300/70 hover:text-gold-300 transition-colors"
            >
              Marketing Command →
            </Link>
          }
        >
          <div className="space-y-4 mt-2">
            {rankedPerf.map(({ campaign: c, leads, conv, trend, momentum, rank }, i) => (
              <div
                key={c.slug}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[9px] font-mono text-slate-700">#{i + 1}</span>
                      <p className="text-sm font-semibold text-cream leading-none">{c.name}</p>
                      <PerformanceBadge tier={rank.tier} />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">{c.tagline}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TrendBadge trend={trend} />
                    <span
                      className={[
                        "text-[10px] tracking-label font-bold uppercase border rounded-full px-2 py-0.5",
                        c.status === "active"
                          ? "text-emerald-400 border-emerald-400/25 bg-emerald-400/[0.06]"
                          : c.status === "draft"
                          ? "text-slate-500 border-white/[0.08]"
                          : "text-amber-400 border-amber-400/25 bg-amber-400/[0.06]",
                      ].join(" ")}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Attributed Leads
                    </p>
                    <p className="text-xl font-bebas text-cream tabular-nums">{leads}</p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Share of Total
                    </p>
                    <p className="text-xl font-bebas text-cream tabular-nums">{conv.label}</p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Momentum
                    </p>
                    <p className={[
                      "text-xl font-bebas tabular-nums",
                      momentum.level === "strong" || momentum.level === "growing" ? "text-emerald-400"
                      : momentum.level === "steady" ? "text-gold-300"
                      : "text-amber-400",
                    ].join(" ")}>
                      {momentum.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Landing
                    </p>
                    <p className="text-xs font-mono text-slate-400">{c.landingPath}</p>
                  </div>
                </div>

                {/* Audience + CTA */}
                <div className="mt-3 pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Audience
                    </p>
                    <p className="text-xs text-slate-400">{c.targetAudience}</p>
                  </div>
                  <div>
                    <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                      Primary CTA
                    </p>
                    <p className="text-xs text-slate-400">{c.primaryCta}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <Link
                    href={`/admin/marketing?campaign=${c.slug}`}
                    className="text-[10px] text-gold-300/60 hover:text-gold-300 transition-colors"
                  >
                    View campaign assets →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        {/* ── Recommendations ── */}
        {recs.length > 0 && (
          <AnalyticsCard title="Campaign Recommendations" accent="amber">
            <div className="space-y-3 mt-1">
              {recs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} expanded />
              ))}
            </div>
          </AnalyticsCard>
        )}

        <p className="text-xs text-slate-700 text-center pb-4">
          Campaign attribution requires exact UTM slug match. Use links from Marketing Command to ensure tracking accuracy.
        </p>
      </main>
    </AdminShell>
  );
}
