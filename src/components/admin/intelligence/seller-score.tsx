"use client";

import { ConfidenceBadge } from "./confidence-badge";
import type { SellerReadiness } from "@/lib/intelligence/types";
import {
  SELLER_SIGNAL_LABELS,
  LISTING_WINDOW_LABELS,
  INTENT_GRADE_COLORS,
  OPPORTUNITY_COLORS,
} from "@/lib/intelligence/seller-intelligence";

// ---------------------------------------------------------------------------
// SellerScore — readiness ring + intent grade
// ---------------------------------------------------------------------------

interface SellerScoreProps {
  readiness: SellerReadiness;
  size?:     "sm" | "md";
}

export function SellerScore({ readiness: r, size = "md" }: SellerScoreProps) {
  const dim    = size === "sm" ? 64  : 88;
  const radius = size === "sm" ? 24  : 34;
  const stroke = size === "sm" ? 4.5 : 5.5;
  const circumference = 2 * Math.PI * radius;
  const pct    = r.readinessScore / 100;
  const offset = circumference * (1 - pct);

  const color =
    r.readinessScore >= 80 ? "#4ade80" :
    r.readinessScore >= 60 ? "#c8a85a" :
    r.readinessScore >= 40 ? "#f59e0b" :
                             "#e57068";

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} aria-label={`Seller readiness: ${r.readinessScore}/100`} role="img">
          <circle cx={dim/2} cy={dim/2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
          <circle
            cx={dim/2} cy={dim/2} r={radius} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim/2} ${dim/2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bebas text-xl leading-none" style={{ color }}>{r.readinessScore}</span>
          <span className="text-[7px] text-slate-600 uppercase tracking-wider">Ready</span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={["font-bebas text-2xl leading-none", INTENT_GRADE_COLORS[r.intentGrade]].join(" ")}>
            {r.intentGrade}
          </span>
          <span className={["text-[9px] font-semibold capitalize", OPPORTUNITY_COLORS[r.opportunity]].join(" ")}>
            {r.opportunity}
          </span>
        </div>
        <p className="text-[10px] text-slate-500">
          Window: {LISTING_WINDOW_LABELS[r.predictedListingWindow]}
        </p>
        <p className="text-[9px] text-slate-700 mt-0.5">
          Commission est. ${r.estimatedCommission.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SellerReadinessCard — full card
// ---------------------------------------------------------------------------

interface SellerReadinessCardProps {
  readiness:  SellerReadiness;
  className?: string;
}

export function SellerReadinessCard({ readiness: r, className = "" }: SellerReadinessCardProps) {
  const riskColor =
    r.risk === "low"    ? "text-emerald-400/70" :
    r.risk === "medium" ? "text-amber-400/70"   : "text-ruby-400/70";

  return (
    <article
      className={[
        "rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-3",
        className,
      ].join(" ")}
      aria-label={`Seller readiness for ${r.leadId}`}
    >
      <SellerScore readiness={r} size="sm" />

      {/* Key signals */}
      {r.signals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.signals.slice(0, 4).map((sig) => (
            <span
              key={sig}
              className="text-[9px] text-slate-600 border border-white/[0.04] rounded-full px-1.5 py-0.5"
            >
              {SELLER_SIGNAL_LABELS[sig]}
            </span>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <p className="text-[10px] text-slate-500 leading-relaxed">{r.reasoning}</p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <ConfidenceBadge confidence={r.confidence} size="sm" />
        <span className={["text-[9px] font-semibold uppercase", riskColor].join(" ")}>
          {r.risk} risk
        </span>
      </div>

      {r.recommendations.length > 0 && (
        <div className="pt-1">
          <p className="text-[9px] text-gold-300/70">→ {r.recommendations[0]}</p>
        </div>
      )}
    </article>
  );
}
