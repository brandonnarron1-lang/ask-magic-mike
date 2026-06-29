"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BrandShell } from "@/components/amm/brand-shell";
import { BrandHeader } from "@/components/amm/brand-header";
import { MikeTrustCard } from "@/components/amm/mike-trust-card";
import { AiAssistBadge } from "@/components/amm/ai-assist-badge";
import { ammTokens } from "@/components/amm/tokens";
import { motion } from "@/components/amm/motion";

interface IntakeShellProps {
  step: number;
  totalSteps: number;
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
  className?: string;
}

const STEP_LABELS = [
  "Your question",
  "Your timeline",
  "Contact info",
  "Contact consent",
  "Confirmation",
];

export function IntakeShell({
  step,
  totalSteps,
  progress,
  onBack,
  showBack = true,
  children,
  className,
}: IntakeShellProps) {
  const stepLabel = STEP_LABELS[step - 1] ?? "";

  return (
    <BrandShell variant="card">
      <BrandHeader compact />

      <main className="relative z-10 flex-1 px-5 sm:px-6 pb-10 max-w-2xl mx-auto w-full">
        {/* Trust cue */}
        <div className={cn("mt-2 mb-4", motion.fadeUp)}>
          <MikeTrustCard variant="compact" />
        </div>

        {/* Progress + step label */}
        <div className="mb-3">
          <Progress
            value={progress}
            className="h-1.5 bg-white/[0.07]"
            indicatorClassName="progress-gold"
            style={{ boxShadow: "0 0 12px rgba(212,160,23,0.4)" } as React.CSSProperties}
          />

          {/* Step dots */}
          <div className="mt-3 flex items-center justify-center gap-2" aria-hidden="true">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const dotStep = i + 1;
              const completed = dotStep < step;
              const active = dotStep === step;
              return (
                <span
                  key={dotStep}
                  className={cn(
                    "rounded-full transition-all duration-500",
                    completed
                      ? "h-2 w-2 bg-gold-400 shadow-[0_0_6px_rgba(212,160,23,0.55)]"
                      : active
                      ? "h-2.5 w-2.5 bg-gold-300 shadow-[0_0_10px_rgba(212,160,23,0.70)] ring-2 ring-gold-400/40"
                      : "h-1.5 w-1.5 border border-gold-400/30 bg-transparent"
                  )}
                />
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-label uppercase text-gold-300">
              {stepLabel}
            </p>
            <span className="text-xs uppercase tracking-label text-slate-300">
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Step card */}
        <div
          className={cn(
            ammTokens.stepCard,
            motion.fadeUp,
            className
          )}
          data-testid={`intake-step-card-${step}`}
        >
          {showBack && step > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2 mb-2 p-1.5 h-auto text-slate-400 hover:text-[#F7F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs">Back</span>
            </Button>
          )}
          {children}
        </div>

        {/* AI assist note under the card */}
        <div className="mt-5 flex justify-center">
          <AiAssistBadge variant="inline" />
        </div>
      </main>
    </BrandShell>
  );
}
