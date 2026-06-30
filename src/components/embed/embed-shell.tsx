"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/amm/brand-header";
import { MikeTrustCard } from "@/components/amm/mike-trust-card";
import { AiAssistBadge } from "@/components/amm/ai-assist-badge";
import { ammTokens } from "@/components/amm/tokens";

interface EmbedShellProps {
  step: number;
  totalSteps: number;
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}

const STEP_LABELS = [
  "Your question",
  "Your timeline",
  "Contact info",
  "Contact consent",
  "Confirmation",
];

export function EmbedShell({
  step,
  totalSteps,
  progress,
  onBack,
  showBack = false,
  children,
}: EmbedShellProps) {
  const stepLabel = STEP_LABELS[step - 1] ?? "";
  const showTrust = step < 5;

  return (
    <div className="min-h-screen bg-[#080806] text-[#F7F1E8] flex flex-col font-sans">
      <BrandHeader compact />

      <main className="flex-1 px-4 pb-6 max-w-lg mx-auto w-full">
        {showTrust && (
          <div className="mt-1 mb-3">
            <MikeTrustCard variant="compact" />
          </div>
        )}

        <div className="mb-3 mt-2">
          <Progress value={progress} className="h-0.5" />
          <div className="mt-2">
            <p className="text-[10px] font-semibold tracking-label uppercase text-gold-300/70">
              {stepLabel}
            </p>
          </div>
        </div>

        <div
          className={cn(
            ammTokens.stepCard,
            "p-4 sm:p-5",
            step < 5 && "animate-slide-up"
          )}
          data-testid={`embed-step-card-${step}`}
        >
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="Back"
              className="-ml-2 mb-2 p-1 h-auto text-slate-400 hover:text-[#F7F1E8]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-[12px]">Back</span>
            </Button>
          )}
          {children}
        </div>

        {showTrust && (
          <div className="mt-4 flex justify-center">
            <AiAssistBadge variant="inline" />
          </div>
        )}
      </main>
    </div>
  );
}
