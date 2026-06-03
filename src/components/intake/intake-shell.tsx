"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/amm/brand-header";
import { MagicBackdrop } from "@/components/amm/magic-backdrop";
import { AiAssistBadge } from "@/components/amm/ai-assist-badge";
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
    <div className={cn(ammTokens.pageShellPadded)}>
      <MagicBackdrop variant="card" />

      <BrandHeader compact />

      <main className="relative z-10 flex-1 px-5 sm:px-6 pb-10 max-w-2xl mx-auto w-full">
        {/* Small trust cue + AI badge above the step card */}
        <div className="mt-2 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden border border-gold-400/25 bg-[#0B0E14]">
              <Image
                src="/images/ask-magic-mike/mike-eatmon-headshot.png"
                alt="Mike Eatmon"
                fill
                sizes="36px"
                className="object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-[#F7F1E8] truncate">
                Answer a few quick questions
              </p>
              <p className="text-[10.5px] text-slate-500 truncate">
                Mike Eatmon&apos;s team reviews the details
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
            Step {step} of {totalSteps}
          </span>
        </div>

        {/* Progress + step label */}
        <div className="mb-3">
          <Progress value={progress} className="h-1" />
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold-300/80">
              {stepLabel}
            </p>
            <span className="sm:hidden text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
              {step} / {totalSteps}
            </span>
          </div>
        </div>

        {/* Step card */}
        <div
          className={cn(ammTokens.stepCard, "animate-slide-up", className)}
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
              <span className="text-[12px]">Back</span>
            </Button>
          )}
          {children}
        </div>

        {/* AI assist note under the card */}
        <div className="mt-5 flex justify-center">
          <AiAssistBadge variant="subtle" />
        </div>
      </main>
    </div>
  );
}
