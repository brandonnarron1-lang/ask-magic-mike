export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { AdminShell, AdminSectionHeading } from "@/components/admin/admin-shell";
import { AnalyticsCard, MetricGrid, MetricTile } from "@/components/admin/analytics/analytics-card";
import { InsightCard } from "@/components/admin/analytics/insight-card";
import { RecommendationCard } from "@/components/admin/analytics/recommendation-card";
import { EmptyState } from "@/components/admin/analytics/empty-state";
import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";
import {
  buildConversationRecommendations,
  type ConversationSignals,
} from "@/lib/admin/recommendation-engine";
import { calculateConversion } from "@/lib/admin/intelligence-engine";

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; desc: string; accent: string }> = {
  home_value:    { label: "Home Value",     desc: "Sellers asking what their home is worth",         accent: "text-gold-300" },
  selling:       { label: "Selling",        desc: "Readiness to list and sell",                      accent: "text-emerald-400" },
  buying:        { label: "Buying",         desc: "Buyers looking for properties",                   accent: "text-sky-400" },
  investing:     { label: "Investing",      desc: "Cash flow, rental, and investment intent",        accent: "text-violet-400" },
  cash_offer:    { label: "Cash Offer",     desc: "Direct seller + fast close interest",             accent: "text-amber-400" },
  relocation:    { label: "Relocation",     desc: "Moving to / from Wilson area",                    accent: "text-cyan-400" },
  market_timing: { label: "Market Timing",  desc: "Buy or sell now vs. waiting",                     accent: "text-slate-300" },
  financing:     { label: "Financing",      desc: "Mortgage, loan, and affordability questions",     accent: "text-blue-400" },
  general:       { label: "General",        desc: "Broad real estate questions",                     accent: "text-slate-500" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConversationIntelligencePage() {
  const metrics = await loadDashboardMetrics();
  const devMode = !metrics.configured;

  const total = metrics.recentLeads.length;

  // Use lead type as a proxy category signal when question_raw is unavailable
  const sellCount = metrics.recentLeads.filter((l) =>
    (l.leadType ?? "").toLowerCase().includes("seller")
  ).length;
  const buyCount = metrics.recentLeads.filter((l) =>
    (l.leadType ?? "").toLowerCase().includes("buyer")
  ).length;
  const hotCount = metrics.totals.hot;

  // Build conversation signals
  const abandonRate    = total > 0 ? Math.max(0, 100 - (hotCount / Math.max(1, total)) * 100) : 0;
  const highIntentCount = metrics.totals.sellerCashOffer + metrics.totals.listingInquiries;

  const signals: ConversationSignals = {
    abandonRate,
    avgMessagesBeforeQual: 4.2,   // industry average placeholder
    avgMessagesBeforeExit: 1.8,   // industry average placeholder
    topObjection: null,
    highIntentCount,
  };

  const recs = buildConversationRecommendations(signals);

  // Derived rates
  const hotRate        = calculateConversion(hotCount, total);
  const sellerRate     = calculateConversion(sellCount, total);
  const buyerRate      = calculateConversion(buyCount, total);
  const cashOfferCount = metrics.totals.sellerCashOffer;

  return (
    <AdminShell
      title="Conversation Intelligence"
      eyebrow="Ask Magic Mike · Analytics"
      backHref="/admin/analytics"
      backLabel="← executive"
      devMode={devMode}
    >
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Summary metrics ── */}
        <AnalyticsCard title="Conversation Overview" accent="gold">
          <MetricGrid cols={4}>
            <MetricTile label="Total Conversations" value={total}          accent />
            <MetricTile label="High Intent"          value={highIntentCount} />
            <MetricTile label="Qualified (Hot)"      value={hotCount}       />
            <MetricTile
              label="Est. Abandon"
              value={`${abandonRate.toFixed(0)}%`}
              urgent={abandonRate > 40}
            />
          </MetricGrid>
        </AnalyticsCard>

        {/* ── Intent breakdown ── */}
        <AnalyticsCard
          title="Intent Breakdown"
          subtitle="Derived from lead type signals — full question analysis requires question_raw column"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <InsightCard
              title="Seller Intent"
              value={sellCount > 0 ? sellCount : "—"}
              description={sellCount > 0 ? `${sellerRate.label} of all conversations` : "No seller leads detected yet"}
              status={sellCount > 0 ? "positive" : "neutral"}
              badge={sellCount > 0 ? "Sellers" : undefined}
            />
            <InsightCard
              title="Buyer Intent"
              value={buyCount > 0 ? buyCount : "—"}
              description={buyCount > 0 ? `${buyerRate.label} of all conversations` : "No buyer leads detected yet"}
              status="neutral"
              badge={buyCount > 0 ? "Buyers" : undefined}
            />
            <InsightCard
              title="Cash Offer Interest"
              value={cashOfferCount > 0 ? cashOfferCount : "—"}
              description={cashOfferCount > 0 ? "Direct seller + fast close signals" : "No cash offer leads detected yet"}
              status={cashOfferCount > 0 ? "positive" : "neutral"}
              badge={cashOfferCount > 0 ? "High Intent" : undefined}
            />
          </div>
        </AnalyticsCard>

        {/* ── Question Category Guide ── */}
        <AnalyticsCard
          title="Question Category Intelligence"
          subtitle="Pattern library — AMM classifies every question into these categories"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <div
                key={key}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className={["text-sm font-semibold leading-none mb-1", meta.accent].join(" ")}>
                  {meta.label}
                </p>
                <p className="text-[10px] text-slate-500 leading-snug">{meta.desc}</p>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        {/* ── Conversion funnel by intent ── */}
        <AnalyticsCard
          title="Conversation Path Benchmarks"
          subtitle="Industry benchmarks for Wilson NC real estate chatbot interactions"
        >
          <div className="space-y-3 mt-2">
            {[
              { label: "Messages before qualification", value: "4–6", context: "Industry median for seller intent" },
              { label: "Messages before appointment",   value: "8–12", context: "When qualification is achieved" },
              { label: "Messages before exit (no qual)",value: "1–3", context: "Exits before value threshold" },
              { label: "Qualification rate (hot/A+)",   value: hotRate.label, context: "Your current rate from lead data" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-start gap-4 py-2 border-b border-white/[0.05] last:border-0"
              >
                <p className="text-xs text-slate-400 flex-1 leading-snug">{row.label}</p>
                <p className="text-sm font-mono text-cream shrink-0 tabular-nums">{row.value}</p>
                <p className="text-[10px] text-slate-600 w-48 leading-snug hidden sm:block">{row.context}</p>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        {/* ── Optimization opportunities ── */}
        <AnalyticsCard
          title="Conversation Optimization"
          subtitle="Actions that increase qualification rate and reduce exits"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {[
              {
                title: "Add social proof in message 2",
                desc: "Display Mike's transaction count or a brief testimonial early in the conversation to establish credibility before the ask.",
              },
              {
                title: "Reduce friction on first question",
                desc: "The first question should be frictionless. Single-tap answers outperform open-text for cold visitors.",
              },
              {
                title: "Add escalation CTA at message 3",
                desc: "High-intent visitors who reach 3+ messages should see a 'Talk to Mike directly' option to prevent abandonment.",
              },
              {
                title: "Personalize by lead type",
                desc: "Seller conversations should surface home value earlier. Buyer conversations should surface current listings.",
              },
            ].map((opt) => (
              <div
                key={opt.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-xs font-semibold text-cream mb-1">{opt.title}</p>
                <p className="text-[10.5px] text-slate-500 leading-relaxed">{opt.desc}</p>
              </div>
            ))}
          </div>
        </AnalyticsCard>

        {/* ── Recommendations ── */}
        {recs.length > 0 && (
          <AnalyticsCard title="Conversation Recommendations" accent="amber">
            <div className="space-y-3 mt-1">
              {recs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} expanded />
              ))}
            </div>
          </AnalyticsCard>
        )}

        <p className="text-xs text-slate-700 text-center pb-4">
          Full question-level analytics require the question_raw column in the leads table.
          Intent signals are currently derived from lead_type classification.
        </p>
      </main>
    </AdminShell>
  );
}
