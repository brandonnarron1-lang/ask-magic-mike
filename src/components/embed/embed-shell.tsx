"use client";

import { ArrowLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface EmbedShellProps {
  step: number;
  totalSteps: number;
  progress: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}

const LICENSE = process.env.NEXT_PUBLIC_AGENT_LICENSE;

export function EmbedShell({
  step,
  totalSteps,
  progress,
  onBack,
  showBack = false,
  children,
}: EmbedShellProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col font-sans">
      {/* Top gold line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

      {/* Compact header */}
      <div className="px-4 pt-4 pb-3 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {showBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-auto -ml-1">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <span className="text-gold-400 text-xs">✦</span>
            <span className="text-xs font-semibold text-slate-300 tracking-wide">Ask Magic Mike</span>
          </div>
          <span className="text-[11px] text-slate-600">
            {step} / {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-0.5" />
      </div>

      {/* Step content */}
      <div className={cn(
        "flex-1 px-4 pb-6 max-w-lg mx-auto w-full",
        step < 5 && "animate-slide-up"
      )}>
        {children}
      </div>

      {/* Trust footer — only before confirmation */}
      {step < 5 && (
        <div className="px-4 pb-4 max-w-lg mx-auto w-full">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-700">
            <span className="flex items-center gap-1">
              <Shield className="h-2.5 w-2.5 text-gold-400/30" />
              {LICENSE ? `Lic. #${LICENSE}` : "Licensed NC Broker"}
            </span>
            <span>·</span>
            <span>Mike Eatmon</span>
            <span>·</span>
            <span>Our Town Properties</span>
            <span>·</span>
            <span>Wilson, NC</span>
          </div>
        </div>
      )}
    </div>
  );
}
