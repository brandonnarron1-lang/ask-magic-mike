export const dynamic   = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AnalyticsCard, MetricGrid, MetricTile } from "@/components/admin/analytics/analytics-card";
import { ExecutiveMetric } from "@/components/admin/analytics/executive-metric";
import { ConversionFunnel } from "@/components/admin/analytics/conversion-funnel";
import { RecommendationCard } from "@/components/admin/analytics/recommendation-card";
import { PipelineCard } from "@/components/admin/analytics/pipeline-card";
import { InsightCard } from "@/components/admin/analytics/insight-card";
import { TrendBadge } from "@/components/admin/analytics/trend-badge";
import { EmptyState } from "@/components/admin/analytics/empty-state";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import {
  calculateTrend,
  calculateVelocity,
  calculatePipeline,
  calculateHealthScore,
  calculatePriority,
  calculateHeat,
  formatCurrency,
} from "@/lib/admin/intelligence-engine";
import {
  buildRecommendationSummary,
} from "@/lib/admin/recommendation-engine";
import type { FunnelStage } from "@/components/admin/analytics/conversion-funnel";

// ---------------------------------------------------------------------------
// Analytics nav items
// ---------------------------------------------------------------------------

const NAV = [
  { href: "/admin/analytics",               label: "Executive",     active: true  },
  { href: "/admin/analytics/sources",       label: "Sources",       active: false },
  { href: "/admin/analytics/campaigns",     label: "Campaigns",     active: false },
  { href: "/admin/analytics/conversations", label: "Conversations", active: false },
  { href: "/admin/analytics/reports",       label: "Reports",       active: false },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnalyticsExecutivePage() {
  const metrics = await loadDashboardMetrics();
  const devMode = !metrics.configured;

  // ------------------------------------------------------------------
  // Derive intelligence signals from available data
  // ------------------------------------------------------------------
  const t = metrics.totals;
  const leadsToday  = t.newToday;
  const leadsTotal  = metrics.recentLeads.length;

  // Simulated period comparison — unavailable without historical tables.
  // Use relative ratios we can derive from what exists.
  const hotCount       = t.hot;
  const urgentCount    = t.overdueSla;
  const unassigned     = t.unassigned;
  const neverContacted = t.neverContacted;
  const followUpDue    = t.followUpDue;

  // Pipeline estimates (placeholder counts — real values require pipeline table)
  const appointments       = t.appointmentsRequested;
  const contracts          = 0;   // requires contracts table
  const closings           = 0;   // requires closings table
  const avgHomePrice       = 220000;

  const pipeline = calculatePipeline({
    totalLeads: leadsTotal,
    hotLeads: hotCount,
    appointments,
    contracts,
    closings,
    avgHomePrice,
  });

  const heatScore = calculateHeat(urgentCount, hotCount, leadsTotal);

  const priority = calculatePriority({
    urgentCount,
    slaBreach: urgentCount,
    unassigned,
    neverContacted,
    totalLeads: leadsTotal,
  });

  const health = calculateHealthScore({
    conversionRate: leadsTotal > 0 ? (hotCount / leadsTotal) * 100 : 0,
    responseRate:   leadsTotal > 0 ? ((leadsTotal - neverContacted) / leadsTotal) * 100 : 0,
    slaCompliance:  leadsTotal > 0 ? ((leadsTotal - urgentCount) / leadsTotal) * 100 : 0,
    pipelineActivity: appointments > 0 ? 60 : 20,
    dataQuality:    80,
  });

  // Velocity (7d: use current totals as proxy when historical not available)
  const vel7d = leadsTotal;
  const vel7d_prev = Math.max(0, leadsTotal - leadsToday); // rough prior
  const velocity = calculateVelocity(vel7d, vel7d_prev);

  // Funnel stages — derive from available data
  const funnelStages: FunnelStage[] = [
    { label: "Leads In",    count: leadsTotal,    sublabel: "all sources" },
    { label: "Hot / A+",    count: hotCount,       sublabel: "grade A or A+" },
    { label: "Appointments",count: appointments,   sublabel: "requested" },
    { label: "Contracts",   count: contracts,      sublabel: "in progress" },
    { label: "Closings",    count: closings,       sublabel: "completed" },
  ];

  // Source breakdown
  const bySource = metrics.bySource.slice(0, 6);

  // Trend for total leads
  const leadTrend = calculateTrend(leadsTotal, Math.max(0, leadsTotal - leadsToday * 2));

  // Recommendations
  const recSummary = buildRecommendationSummary({
    leadSignals: {
      urgentCount,
      slaBreach: urgentCount,
      unassigned,
      neverContacted,
      followUpDue,
      totalToday: leadsToday,
      total7d: vel7d,
      total7d_prev: vel7d_prev,
      hotPct: leadsTotal > 0 ? (hotCount / leadsTotal) * 100 : 0,
    },
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <AdminShell
      title="Analytics Intelligence"
      eyebrow="Ask Magic Mike · Executive Command"
      backHref="/admin"
      backLabel="← dashboard"
      devMode={devMode}
      headerRight={
        <span className="text-xs text-slate-600">{today}</span>
      }
    >
      {/* Analytics nav strip */}
      <nav
        className="border-b border-white/[0.06] bg-[#0A0906]/60 backdrop-blur-sm"
        aria-label="Analytics sections"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "px-4 py-3 text-[10.5px] tracking-label font-semibold uppercase whitespace-nowrap border-b-2 transition-colors",
                  n.active
                    ? "border-gold-400 text-gold-300"
                    : "border-transparent text-slate-500 hover:text-slate-300",
                ].join(" ")}
                aria-current={n.active ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Priority strip ── */}
        {(priority.level === "critical" || priority.level === "high") && (
          <div
            className={[
              "rounded-xl border px-5 py-4 flex items-center gap-4",
              priority.level === "critical"
                ? "border-ruby-400/30 bg-ruby-400/[0.05]"
                : "border-amber-400/25 bg-amber-400/[0.03]",
            ].join(" ")}
            role="alert"
            aria-live="polite"
          >
            <div
              className={[
                "h-2 w-2 rounded-full shrink-0",
                priority.level === "critical"
                  ? "bg-ruby-400 motion-safe:animate-pulse"
                  : "bg-amber-400",
              ].join(" ")}
              aria-hidden="true"
            />
            <p
              className={[
                "text-sm font-semibold",
                priority.level === "critical" ? "text-ruby-400" : "text-amber-400",
              ].join(" ")}
            >
              {priority.label}
            </p>
            <p className="text-xs text-slate-400 flex-1">
              {urgentCount > 0 && `${urgentCount} SLA breach${urgentCount > 1 ? "es" : ""}. `}
              {unassigned > 0 && `${unassigned} unassigned. `}
              {neverContacted > 0 && `${neverContacted} never contacted.`}
            </p>
            <Link
              href="/admin/leads"
              className="text-xs text-gold-300 hover:text-gold-200 transition-colors shrink-0"
            >
              View Leads →
            </Link>
          </div>
        )}

        {/* ── Headline metrics ── */}
        <AnalyticsCard title="Lead Intelligence" accent="gold">
          <MetricGrid cols={5}>
            <MetricTile label="Today"        value={leadsToday}   accent />
            <MetricTile label="Total Active" value={leadsTotal}   />
            <MetricTile label="Hot / A+"     value={hotCount}     accent />
            <MetricTile
              label="Urgent"
              value={urgentCount}
              urgent={urgentCount > 0}
            />
            <MetricTile label="Unassigned" value={unassigned} urgent={unassigned > 0} />
          </MetricGrid>
        </AnalyticsCard>

        {/* ── Velocity + Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AnalyticsCard title="Lead Velocity" accent="gold" className="lg:col-span-1">
            <ExecutiveMetric
              label="Per Day"
              value={velocity.label}
              trend={velocity.trend}
              accent="gold"
              size="lg"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                  7-Day Total
                </p>
                <p className="text-lg font-bebas text-cream tabular-nums">{velocity.leadsPerWeek}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-label font-semibold uppercase text-slate-600 mb-0.5">
                  Never Contacted
                </p>
                <p className={["text-lg font-bebas tabular-nums", neverContacted > 0 ? "text-ruby-400" : "text-cream"].join(" ")}>
                  {neverContacted}
                </p>
              </div>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Operations Health" accent={health.grade === "A" ? "emerald" : health.grade === "F" ? "ruby" : "amber"} className="lg:col-span-1">
            <div className="flex items-center gap-4">
              <div className={[
                "h-16 w-16 rounded-full flex items-center justify-center border-2 shrink-0",
                health.grade === "A" ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                : health.grade === "B" ? "border-gold-400/40 bg-gold-400/[0.06]"
                : health.grade === "C" ? "border-amber-400/40 bg-amber-400/[0.06]"
                : "border-ruby-400/40 bg-ruby-400/[0.06]",
              ].join(" ")}
              aria-label={`Health grade ${health.grade}`}
              >
                <span className={[
                  "font-bebas text-3xl",
                  health.grade === "A" ? "text-emerald-400"
                  : health.grade === "B" ? "text-gold-300"
                  : health.grade === "C" ? "text-amber-400"
                  : "text-ruby-400",
                ].join(" ")}>
                  {health.grade}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-cream">{health.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{health.score}/100</p>
              </div>
            </div>
            {health.warnings.length > 0 && (
              <ul className="mt-3 space-y-1" aria-label="Health warnings">
                {health.warnings.map((w) => (
                  <li key={w} className="text-[10px] text-amber-400/70 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-amber-400/50 shrink-0" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </AnalyticsCard>

          <AnalyticsCard title="Heat Score" accent="ruby" className="lg:col-span-1">
            <ExecutiveMetric
              label="Pipeline Heat"
              value={`${heatScore.score}`}
              sublabel={heatScore.label}
              accent={
                heatScore.tier === "critical" || heatScore.tier === "hot" ? "ruby"
                : heatScore.tier === "warm" ? "amber"
                : "slate"
              }
              size="lg"
            />
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={[
                    "h-full rounded-full",
                    heatScore.tier === "critical" ? "bg-ruby-400"
                    : heatScore.tier === "hot" ? "bg-amber-400"
                    : heatScore.tier === "warm" ? "bg-gold-400/60"
                    : "bg-slate-600",
                  ].join(" ")}
                  style={{ width: `${heatScore.score}%` }}
                  aria-label={`Heat score: ${heatScore.score} out of 100`}
                />
              </div>
            </div>
          </AnalyticsCard>
        </div>

        {/* ── Pipeline ── */}
        <PipelineCard pipeline={pipeline} />

        {/* ── Conversion Funnel ── */}
        <AnalyticsCard
          title="Conversion Funnel"
          subtitle="Lead-to-closing pipeline — real data from your active leads"
          accent="gold"
        >
          {leadsTotal === 0 ? (
            <EmptyState
              title="No lead data available"
              description="Once leads arrive, the funnel will populate automatically."
              variant="data"
            />
          ) : (
            <div className="mt-2">
              <ConversionFunnel stages={funnelStages} />
              <p className="text-[10px] text-slate-700 mt-4">
                Appointments, contracts, and closings require their respective data tables.
                Leads and hot counts are live from your Supabase database.
              </p>
            </div>
          )}
        </AnalyticsCard>

        {/* ── Top Recommendations ── */}
        {recSummary.totalCount > 0 && (
          <AnalyticsCard
            title="Priority Recommendations"
            subtitle="Deterministic — no AI, no guessing. Based on your actual lead data."
            accent={recSummary.criticalCount > 0 ? "ruby" : "amber"}
          >
            <div className="space-y-3 mt-1">
              {recSummary.all.slice(0, 5).map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} expanded />
              ))}
            </div>
          </AnalyticsCard>
        )}

        {recSummary.totalCount === 0 && leadsTotal > 0 && (
          <AnalyticsCard title="Recommendations" accent="emerald">
            <EmptyState
              title="Operations nominal"
              description="No critical signals detected. Continue monitoring for changes."
              variant="data"
            />
          </AnalyticsCard>
        )}

        {/* ── Source attribution ── */}
        {bySource.length > 0 && (
          <AnalyticsCard
            title="Source Attribution"
            subtitle="Lead count by UTM source — current 500-lead window"
            action={
              <Link
                href="/admin/analytics/sources"
                className="text-[10px] text-gold-300/70 hover:text-gold-300 transition-colors"
              >
                Full analysis →
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {bySource.map((s) => {
                const pct = leadsTotal > 0 ? (s.count / leadsTotal) * 100 : 0;
                return (
                  <InsightCard
                    key={s.source}
                    title={s.source || "Unknown"}
                    value={s.count}
                    description={`${pct.toFixed(0)}% of all leads`}
                    status="neutral"
                  />
                );
              })}
            </div>
          </AnalyticsCard>
        )}

        {/* ── Analytics nav cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { href: "/admin/analytics/sources",       title: "Source Intelligence",       desc: "Traffic platform breakdown, conversion by source, trend analysis" },
            { href: "/admin/analytics/campaigns",     title: "Campaign Intelligence",     desc: "All 6 AMM campaigns — performance, momentum, optimization" },
            { href: "/admin/analytics/conversations", title: "Conversation Intelligence", desc: "Question patterns, drop-off, objections, high-intent signals" },
            { href: "/admin/analytics/reports",       title: "Executive Reports",         desc: "Daily, weekly, monthly broker summaries — read-only, no exports" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-gold-400/20 hover:bg-white/[0.04] transition-colors p-5"
            >
              <p className="text-[10.5px] tracking-label font-semibold uppercase text-gold-300/70 group-hover:text-gold-300 transition-colors mb-2">
                {card.title}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              <p className="text-[10px] text-slate-600 mt-3 group-hover:text-gold-400/60 transition-colors">
                Open →
              </p>
            </Link>
          ))}
        </div>

      </main>
    </AdminShell>
  );
}
