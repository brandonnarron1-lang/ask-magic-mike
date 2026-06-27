import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  scoreBuyerReadiness,
  deriveBuyerSignalsFromBrokerage,
  rankBuyersByPurchaseProbability,
  identifyActiveBuyers,
  TIME_HORIZON_LABELS,
} from "@/lib/intelligence/buyer-intelligence";
import { BuyerReadinessCard } from "@/components/admin/intelligence/buyer-score";

export default async function BuyerIntelligencePage() {
  const signals = await loadIntelligenceSignals();
  const buyers  = deriveBuyerSignalsFromBrokerage(signals).map(scoreBuyerReadiness);
  const ranked  = rankBuyersByPurchaseProbability(buyers);
  const active  = identifyActiveBuyers(buyers, 60);

  const avgProb = buyers.length > 0
    ? Math.round(buyers.reduce((s, r) => s + r.purchaseProbability, 0) / buyers.length)
    : 0;

  const horizonCounts: Record<string, number> = {};
  for (const b of buyers) {
    horizonCounts[b.timeHorizon] = (horizonCounts[b.timeHorizon] ?? 0) + 1;
  }

  return (
    <AdminShell
      title="Buyer Intelligence"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Buyer Leads",        value: signals.buyerLeads    },
          { label: "Active Buyers",      value: active.length         },
          { label: "Avg Buy Probability",value: `${avgProb}%`         },
          { label: "Appt Acceptance",    value: `${Math.round(signals.appointmentAcceptanceRate * 100)}%` },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className="font-bebas text-2xl text-cream leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Time horizon distribution */}
      {Object.keys(horizonCounts).length > 0 && (
        <section className="mb-6">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-2">
            Purchase Time Horizon Distribution
          </h2>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(horizonCounts).map(([horizon, count]) => (
                <div key={horizon} className="rounded-lg border border-white/[0.05] bg-white/[0.01] p-2.5 text-center">
                  <p className="font-bebas text-xl text-cream leading-none mb-0.5">{count}</p>
                  <p className="text-[9px] text-slate-600">
                    {TIME_HORIZON_LABELS[horizon as keyof typeof TIME_HORIZON_LABELS] ?? horizon}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Active buyers */}
      {active.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-gold-400 motion-safe:animate-pulse" aria-hidden="true" />
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/70">
              Active Buyers (probability ≥ 60%)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.slice(0, 6).map((r) => (
              <BuyerReadinessCard key={r.leadId} readiness={r} />
            ))}
          </div>
        </section>
      )}

      {/* Full ranked list */}
      {ranked.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            All Buyers — Ranked by Purchase Probability
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ranked.slice(0, 12).map((r) => (
              <BuyerReadinessCard key={r.leadId} readiness={r} />
            ))}
          </div>
        </section>
      )}

      {ranked.length === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">
            No buyer signals available. Connect Supabase to generate buyer intelligence.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
