"use client";

import { Home, Key, ArrowLeftRight, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { PrimaryIntent, TimelineMonths } from "@/types/domain.types";

const INTENT_OPTIONS: { value: PrimaryIntent; label: string; Icon: LucideIcon }[] = [
  { value: "sell", label: "Selling my home", Icon: Home },
  { value: "buy", label: "Buying a home", Icon: Key },
  { value: "both", label: "Buying & Selling", Icon: ArrowLeftRight },
  { value: "unknown", label: "Just exploring", Icon: Search },
];

const TIMELINE_OPTIONS: { value: TimelineMonths; label: string }[] = [
  { value: 0, label: "ASAP" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 24, label: "Not sure" },
];

interface StepIntentProps {
  intent: PrimaryIntent;
  timelineMonths: TimelineMonths | null;
  onIntentChange: (intent: PrimaryIntent) => void;
  onTimelineChange: (months: TimelineMonths) => void;
  onNext: () => void;
}

export function StepIntent({
  intent,
  timelineMonths,
  onIntentChange,
  onTimelineChange,
  onNext,
}: StepIntentProps) {
  const canProceed = intent !== "unknown" || timelineMonths !== null;

  return (
    <div className="pt-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cream mb-2 leading-snug">
        What&apos;s your situation?
      </h2>
      <p className="text-sm text-slate-400 mb-7 leading-relaxed">
        This helps Mike&apos;s team route the right local guidance to you.
      </p>

      {/* Intent selector */}
      <div className="mb-7">
        <label className="block text-[10.5px] font-semibold text-slate-400 mb-3 uppercase tracking-label">
          I&apos;m thinking about
        </label>
        <div className="grid grid-cols-2 gap-3">
          {INTENT_OPTIONS.map((opt) => {
            const selected = intent === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                data-testid={`intent-${opt.value}`}
                onClick={() => onIntentChange(opt.value)}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm text-left overflow-hidden",
                  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60",
                  selected
                    ? "border-gold-400/50 bg-gold-400/[0.08] text-gold-200 shadow-[0_0_24px_-4px_rgba(212,160,23,0.18),inset_0_0_0_1px_rgba(212,160,23,0.08)]"
                    : "border-white/[0.08] bg-[#0B0E14]/70 text-slate-200 hover:border-gold-400/25 hover:bg-white/[0.03]"
                )}
                style={selected ? { boxShadow: "0 0 28px -6px rgba(212,160,23,0.22), inset 0 1px 0 rgba(212,160,23,0.10)" } : undefined}
              >
                {/* Top rim on selected */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 top-0 h-px transition-opacity duration-200",
                    selected
                      ? "opacity-100 bg-gradient-to-r from-transparent via-gold-400/50 to-transparent"
                      : "opacity-0 bg-gradient-to-r from-transparent via-gold-400/30 to-transparent group-hover:opacity-100"
                  )}
                />
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                  selected
                    ? "bg-gold-400/15 text-gold-400"
                    : "bg-white/[0.04] text-slate-500"
                )}>
                  <opt.Icon size={14} aria-hidden="true" />
                </span>
                <span className="font-medium leading-snug">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-7">
        <label className="block text-[10.5px] font-semibold text-slate-400 mb-3 uppercase tracking-label">
          My timeframe
        </label>
        <div className="flex flex-wrap gap-2">
          {TIMELINE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`timeline-${opt.value}`}
              onClick={() => onTimelineChange(opt.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60",
                timelineMonths === opt.value
                  ? "border-gold-400/50 bg-gold-400/[0.10] text-gold-200 shadow-[0_0_16px_-4px_rgba(212,160,23,0.22)]"
                  : "border-white/[0.08] text-slate-300 hover:border-gold-400/25 hover:text-cream"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}
