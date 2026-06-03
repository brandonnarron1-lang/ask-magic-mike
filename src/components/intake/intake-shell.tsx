"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AmmLockup } from "@/components/amm/amm-lockup";
import { MagicBackdrop } from "@/components/amm/magic-backdrop";
import { ammTokens } from "@/components/amm/tokens";

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
  "Your Question",
  "Your Timeline",
  "Contact Info",
  "Contact Consent",
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
    <div className={cn(ammTokens.pageShellPadded)}>
      <MagicBackdrop variant="card" />

      {/* Header strip */}
      <header className="relative z-10 px-5 sm:px-6 pt-5 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {showBack && step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                aria-label="Back"
                className="p-1.5 h-auto"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <AmmLockup size="sm" showTagline={false} />
          </div>

          <span className="text-[11px] text-slate-500 tracking-wide uppercase">
            Step {step} of {totalSteps}
          </span>
        </div>

        <Progress value={progress} className="h-1" />

        <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300/80">
          {stepLabel}
        </p>
      </header>

      {/* Content card */}
      <main
        className={cn(
          "relative z-10 flex-1 px-5 sm:px-6 pb-10 max-w-2xl mx-auto w-full"
        )}
      >
        <div
          className={cn(
            ammTokens.stepCard,
            "animate-slide-up",
            className
          )}
          data-testid={`intake-step-card-${step}`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
