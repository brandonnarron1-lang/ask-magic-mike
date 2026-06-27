"use client";

import { ConfidenceBadge } from "./confidence-badge";
import type { BuyerReadiness } from "@/lib/intelligence/types";
import {
  BUYER_SIGNAL_LABELS,
  TIME_HORIZON_LABELS,
  TIME_HORIZON_COLORS,
} from "@/lib/intelligence/buyer-intelligence";

// ---------------------------------------------------------------------------
// BuyerScore — purchase probability ring
// ---------------------------------------------------------------------------

interface BuyerScoreProps {
  readiness: BuyerReadiness;
  size?:     "sm" | "md";
}

export function BuyerScore({ readiness: r, size = "md" }: BuyerScoreProps) {
  const dim    = size === "sm" ? 64  : 88;
  const radius = size === "sm" ? 24  : 34;
  const stroke = size === "sm" ? 4.5 : 5.5;
  const circumference = 2 * Math.PI * radius;
  const pct    = r.purchaseProbability / 100;
  const offset = circumference * (1 - pct);

  const color =
    r.purchaseProbability >= 75 ? "#4ade80" :
    r.purchaseProbability >= 55 ? "#c8a85a" :
    r.purchaseProbability >= 35 ? "#f59e0b" : "#e57068";

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} aria-label={`Buyer purchase probability: ${r.purchaseProbability}%`} role="img">
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
          <span className="font-bebas text-xl leading-none" style={{ color }}>{r.purchaseProbability}%</span>
          <span className="text-[7px] text-slate-600 uppercase tracking-wider">Buy Prob.</span>
        </div>
      </div>

      <div>
        <p className="text-[9px] tracking-[0.18em] font-semibold uppercase text-slate-500 mb-0.5">
          Time Horizon
        </p>
        <span className={["text-xs font-semibold", TIME_HORIZON_COLORS[r.timeHorizon]].join(" ")}>
          {TIME_HORIZON_LABELS[r.timeHorizon]}
        </span>
        <p className="text-[9px] text-slate-600 mt-1">
          Readiness: {r.readinessScore}/100
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BuyerReadinessCard — full card
// ---------------------------------------------------------------------------

interface BuyerReadinessCardProps {
  readiness:  BuyerReadiness;
  className?: string;
}

export function BuyerReadinessCard({ readiness: r, className = "" }: BuyerReadinessCardProps) {
  return (
    <article
      className={["rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 space-y-3", className].join(" ")}
      aria-label={`Buyer readiness for ${r.leadId}`}
    >
      <BuyerScore readiness={r} size="sm" />

      {r.signals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.signals.slice(0, 4).map((sig) => (
            <span
              key={sig}
              className="text-[9px] text-slate-600 border border-white/[0.04] rounded-full px-1.5 py-0.5"
            >
              {BUYER_SIGNAL_LABELS[sig]}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed">{r.reasoning}</p>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <ConfidenceBadge confidence={r.confidence} size="sm" />
      </div>

      <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-2.5">
        <p className="text-[9px] tracking-[0.18em] uppercase text-slate-600 mb-0.5">Next Best Action</p>
        <p className="text-[10px] text-gold-300/80 leading-relaxed">{r.nextBestAction}</p>
      </div>
    </article>
  );
}
