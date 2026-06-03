import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AiAssistBadgeProps {
  className?: string;
  variant?: "default" | "subtle";
}

/**
 * AiAssistBadge — small, restrained badge that names the AI/human split.
 * Cyan is the only place we allow that hue, and it's a single dot.
 */
export function AiAssistBadge({
  className,
  variant = "default",
}: AiAssistBadgeProps) {
  return (
    <div
      data-testid="ai-assist-badge"
      className={cn(
        "inline-flex items-start gap-2.5",
        variant === "default"
          ? "rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-2"
          : "",
        className
      )}
    >
      <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-cyan-400/15 blur-[2px]" />
        <Sparkles className="relative h-3 w-3 text-cyan-300" aria-hidden="true" />
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
