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
                  "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60",
                  selected
                    ? "border-gold-400/55 bg-gold-400/[0.08] text-gold-200"
                    : "border-white/10 bg-[#0B0E14]/70 text-slate-200 hover:border-gold-400/30 hover:bg-white/[0.04]"
                )}
              >
                <opt.Icon
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 transition-colors",
                    selected ? "text-gold-400" : "text-slate-500"
                  )}
                />
                <span className="font-medium">{opt.label}</span>
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
                  ? "border-gold-400/55 bg-gold-400/[0.08] text-gold-200"
                  : "border-white/10 text-slate-300 hover:border-gold-400/30 hover:text-cream"
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
