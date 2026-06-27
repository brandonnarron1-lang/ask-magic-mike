import { AdminShell } from "@/components/admin/admin-shell";
import { loadIntelligenceSignals } from "@/lib/intelligence/intelligence-signals";
import {
  generatePredictions,
  rankPredictionsByConfidence,
  filterPredictionsByType,
  PREDICTION_TYPE_LABELS,
  PREDICTION_URGENCY_COLORS,
} from "@/lib/intelligence/prediction-engine";
import { PredictionCard, PredictionEvidence } from "@/components/admin/intelligence/prediction-card";
import { ConfidenceBadge } from "@/components/admin/intelligence/confidence-badge";

export default async function PredictionsPage() {
  const signals    = await loadIntelligenceSignals();
  const predSigs   = { signals, timestamp: new Date().toISOString() };
  const predictions = generatePredictions(predSigs);
  const byConf     = rankPredictionsByConfidence(predictions);

  const critical   = predictions.filter((p) => p.urgency === "critical");
  const high       = predictions.filter((p) => p.urgency === "high");
  const other      = predictions.filter((p) => p.urgency !== "critical" && p.urgency !== "high");
  const topPred    = byConf[0] ?? null;

  return (
    <AdminShell
      title="Prediction Engine"
      eyebrow="Intelligence Brain"
      backHref="/admin/intelligence"
      backLabel="Intelligence"
    >
      {/* Urgency summary */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.04] mb-6">
        {[
          { label: "Total",    value: predictions.length, color: "text-cream"       },
          { label: "Critical", value: critical.length,    color: "text-ruby-400"    },
          { label: "High",     value: high.length,        color: "text-gold-300"    },
          { label: "Other",    value: other.length,       color: "text-slate-400"   },
        ].map((m) => (
          <div key={m.label} className="bg-[#0a0a0a] px-3 py-3 text-center">
            <p className="text-[8px] tracking-[0.15em] uppercase text-slate-600 mb-0.5">{m.label}</p>
            <p className={["font-bebas text-2xl leading-none", m.color].join(" ")}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Featured prediction with full evidence */}
      {topPred && (
        <section className="mb-8">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            Highest Confidence
          </h2>
          <PredictionEvidence prediction={topPred} />
        </section>
      )}

      {/* Critical predictions */}
      {critical.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-ruby-400 motion-safe:animate-pulse" aria-hidden="true" />
            <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-ruby-400">
              Critical Predictions
            </h2>
          </div>
          <div className="space-y-3">
            {critical.map((p, i) => (
              <PredictionCard key={p.id} prediction={p} rank={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* High priority */}
      {high.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-gold-300/60 mb-3">
            High Priority
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {high.map((p, i) => (
              <PredictionCard key={p.id} prediction={p} rank={critical.length + i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* By type breakdown */}
      {predictions.length > 0 && (
        <section>
          <h2 className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-3">
            By Prediction Type
          </h2>
          <div className="space-y-1">
            {Object.keys(PREDICTION_TYPE_LABELS).map((type) => {
              const group = filterPredictionsByType(
                predictions,
                type as Parameters<typeof filterPredictionsByType>[1],
              );
              if (group.length === 0) return null;
              return (
                <div key={type} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-b-0">
                  <span className="text-[10px] text-slate-500">
                    {PREDICTION_TYPE_LABELS[type as keyof typeof PREDICTION_TYPE_LABELS]}
                  </span>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge
                      confidence={Math.round(group.reduce((s, p) => s + p.confidence, 0) / group.length)}
                      size="sm"
                    />
                    <span className="font-bebas text-base text-cream">{group.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {predictions.length === 0 && (
        <div className="rounded-xl border border-white/[0.05] p-8 text-center">
          <p className="text-[10px] text-slate-700">No predictions available. Connect Supabase to populate signal data.</p>
        </div>
      )}
    </AdminShell>
  );
}
