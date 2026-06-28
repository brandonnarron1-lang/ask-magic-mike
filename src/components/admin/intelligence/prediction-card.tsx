"use client";

import { ConfidenceBadge, ImpactBadge } from "./confidence-badge";
import type { Prediction } from "@/lib/intelligence/types";
import { PREDICTION_TYPE_LABELS } from "@/lib/intelligence/prediction-engine";

// ---------------------------------------------------------------------------
// PredictionCard
// ---------------------------------------------------------------------------

interface PredictionCardProps {
  prediction: Prediction;
  rank?:      number;
  compact?:   boolean;
  className?: string;
}

export function PredictionCard({ prediction: p, rank, compact = false, className = "" }: PredictionCardProps) {
  const isUrgent = p.urgency === "critical" || p.urgency === "high";

  return (
    <article
      className={[
        "relative rounded-xl border bg-white/[0.015] overflow-hidden transition-colors",
        isUrgent
          ? "border-gold-400/15 hover:border-gold-400/25"
          : "border-white/[0.06] hover:border-white/[0.1]",
        className,
      ].join(" ")}
      aria-label={`Prediction: ${p.label}`}
    >
      {/* Priority accent line */}
      {p.urgency === "critical" && (
        <div className="absolute inset-x-0 top-0 h-px bg-ruby-400/60" aria-hidden="true" />
      )}
      {p.urgency === "high" && (
        <div className="absolute inset-x-0 top-0 h-px bg-gold-400/50" aria-hidden="true" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {rank !== undefined && (
              <span className="text-[9px] font-bold text-slate-600 tabular-nums font-bebas w-4">
                #{rank}
              </span>
            )}
            <span className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500">
              {PREDICTION_TYPE_LABELS[p.type]}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ImpactBadge urgency={p.urgency} />
            <ConfidenceBadge confidence={p.confidence} size="sm" />
          </div>
        </div>

        <p className="text-sm font-semibold text-cream mb-1 leading-snug">{p.reasoning}</p>

        {!compact && (
          <>
            <p className="text-xs text-slate-500 leading-relaxed mb-2">{p.historicalSupport}</p>

            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-3">
              <span>⏱ {p.expectedTimeframe}</span>
            </div>

            {p.supportingSignals.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {p.supportingSignals.map((sig) => (
                  <span
                    key={sig}
                    className="text-[9px] text-slate-600 border border-white/[0.05] rounded-full px-1.5 py-0.5"
                  >
                    {sig}
                  </span>
                ))}
              </div>
            )}

            {p.recommendedWorkflow && (
              <div className="mt-2 pt-2.5 border-t border-white/[0.05]">
                <p className="text-[9px] text-amber-400/60">
                  → Workflow: <code className="text-amber-400/80">{p.recommendedWorkflow}</code>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// PredictionEvidence
// ---------------------------------------------------------------------------

interface PredictionEvidenceProps {
  prediction: Prediction;
}

export function PredictionEvidence({ prediction: p }: PredictionEvidenceProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-3">
      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1">Historical Support</p>
        <p className="text-xs text-slate-400 leading-relaxed">{p.historicalSupport}</p>
      </div>

      {p.supportingSignals.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-600 mb-1">Supporting Signals</p>
          <ul className="space-y-0.5">
            {p.supportingSignals.map((sig) => (
              <li key={sig} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1 w-1 rounded-full bg-gold-400/40 shrink-0" aria-hidden="true" />
                {sig}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <ConfidenceBadge confidence={p.confidence} />
        <span className="text-[10px] text-slate-600">Expected: {p.expectedTimeframe}</span>
      </div>
    </div>
  );
}
