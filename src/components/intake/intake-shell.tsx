"use client";

import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="min-h-screen bg-hero-gradient flex flex-col">
      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {showBack && step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-1.5 h-auto"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-gold-400 text-sm">✦</span>
            <span className="text-xs text-slate-400">Ask Magic Mike</span>
          </div>

          <span className="text-xs text-slate-500">
            Step {step} of {totalSteps} &middot; {STEP_LABELS[step - 1]}
          </span>
        </div>

        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 px-6 pb-10 max-w-2xl mx-auto w-full",
          "animate-slide-up",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
