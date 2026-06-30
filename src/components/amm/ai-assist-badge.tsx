import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AiAssistBadgeProps {
  className?: string;
  variant?: "default" | "subtle" | "inline";
}

export function AiAssistBadge({
  className,
  variant = "default",
}: AiAssistBadgeProps) {
  if (variant === "inline") {
    return (
      <span
        data-testid="ai-assist-badge"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-gold-400/25 bg-gold-400/[0.06] px-3 py-1 text-[11.5px] tracking-label uppercase text-gold-400/80",
          className
        )}
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        AI-assisted &middot; Local human follow-up
      </span>
    );
  }

  return (
    <div
      data-testid="ai-assist-badge"
      className={cn(
        "inline-flex items-start gap-2.5",
        variant === "default"
          ? "rounded-lg border border-gold-400/15 bg-gold-400/[0.04] px-3 py-2"
          : "",
        className
      )}
    >
      <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gold-400/15 blur-[2px]" />
        <Sparkles className="relative h-3 w-3 text-gold-300" aria-hidden="true" />
      </span>
      <div className="text-[11.5px] leading-snug">
        <p className="font-semibold text-[#F7F1E8]">AI-assisted intake</p>
        <p className="text-slate-400">
          Local human follow-up · Reviewed by Our Town Properties
        </p>
      </div>
    </div>
  );
}
