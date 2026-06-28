import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  scoreSellerReadiness,
  deriveSellerSignalsFromBrokerage,
  rankSellersByReadiness,
  identifyHotSellers,
} from "@/lib/intelligence/seller-intelligence";
import { SellerReadinessCard } from "@/components/admin/intelligence/seller-score";

export default async function SellerIntelligencePage() {
  const signals  = await loadIntelligenceSignals();
  const sellers  = deriveSellerSignalsFromBrokerage(signals).map(scoreSellerReadiness);
  const ranked   = rankSellersByReadiness(sellers);
  const hot      = identifyHotSellers(sellers, 65);

  const totalCommission = sellers.reduce((s, r) => s + r.estimatedCommission, 0);
  const avgScore        = sellers.length > 0
    ? Math.round(sellers.reduce((s, r) => s + r.readinessScore, 0) / sellers.length)
    : 0;

  return (
    <AdminShell
      title="Seller Intelligence"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Seller Leads",       value: signals.sellerLeads                },
          { label: "Hot Sellers",        value: hot.length                         },
          { label: "Avg Readiness",      value: `${avgScore}/100`                  },
          { label: "Commission Est.",    value: `$${Math.round(totalCommission / 1000)}K` },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Trend indicators */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <TrendMetric label="Seller Conversations" trend={signals.sellerConversationsTrend} />
          <TrendMetric label="Lead Quality"         trend={signals.leadQualityTrend}          />
          <TrendMetric label="Conversion Rate"      trend={signals.conversionRateTrend}       />
        </div>
      </div>

      {/* Hot sellers */}
      {hot.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" aria-hidden="true" />
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/70">
              Hot Sellers (readiness ≥ 65)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hot.slice(0, 6).map((r) => (
              <SellerReadinessCard key={r.leadId} readiness={r} />
            ))}
          </div>
        </section>
      )}

      {/* Ranked list */}
      {ranked.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            All Sellers — Ranked by Readiness
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ranked.slice(0, 12).map((r) => (
              <SellerReadinessCard key={r.leadId} readiness={r} />
            ))}
          </div>
        </section>
      )}

      {ranked.length === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">
            No seller signals available. Connect Supabase to generate seller intelligence.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function TrendMetric({ label, trend }: { label: string; trend: number }) {
  const isPositive = trend > 0;
  const isNeutral  = trend === 0;
  const color = isNeutral ? "text-slate-500" : isPositive ? "text-emerald-400" : "text-ruby-400";
  const arrow = isNeutral ? "→" : isPositive ? "↑" : "↓";

  return (
    <div className="text-center">
      <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-1">{label}</p>
      <p className={["font-bebas text-xl leading-none", color].join(" ")}>
        {arrow} {Math.abs(trend)}%
      </p>
    </div>
  );
}
