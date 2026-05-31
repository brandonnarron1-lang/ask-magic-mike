"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { PrimaryIntent, TimelineMonths } from "@/types/domain.types";

const INTENT_OPTIONS: { value: PrimaryIntent; label: string; emoji: string }[] = [
  { value: "sell", label: "Selling my home", emoji: "🏠" },
  { value: "buy", label: "Buying a home", emoji: "🔑" },
  { value: "both", label: "Buying & Selling", emoji: "⇄" },
  { value: "unknown", label: "Just exploring", emoji: "👀" },
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
    <div className="pt-8">
      <h2 className="font-display text-3xl font-semibold text-cream mb-2">
        What&apos;s your situation?
      </h2>
      <p className="text-slate-400 mb-8">
        This helps Mike prioritize the right information for you.
      </p>

      {/* Intent selector */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
          I&apos;m thinking about
        </label>
        <div className="grid grid-cols-2 gap-3">
          {INTENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`intent-${opt.value}`}
              onClick={() => onIntentChange(opt.value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                intent === opt.value
                  ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                timelineMonths === opt.value
                  ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                  : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
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
