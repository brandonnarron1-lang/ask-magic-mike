"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { readAttribution, appendUtmsToParams } from "@/lib/attribution/client-storage";
import { motion } from "./motion";

export interface OptionCardProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  /** Forwarded to /ask?q=... so the intake opens with the right question. */
  question: string;
  /** Matching CTAChip enum value. */
  chip: string;
  /** Optional ribbon, e.g. "Most chosen". */
  ribbon?: string;
  className?: string;
  testId?: string;
}

/**
 * OptionCard — secondary path card on `/value`. Click forwards the user to
 * `/ask` with the matching question + chip and preserves UTMs from
 * sessionStorage (so attribution survives the route change without the URL
 * needing to carry them visibly).
 */
export function OptionCard({
  Icon,
  title,
  description,
  question,
  chip,
  ribbon,
  className,
  testId,
}: OptionCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      data-testid={testId ?? `option-card-${chip}`}
      onClick={() => {
        const attribution = readAttribution();
        const params = new URLSearchParams({ q: question, chip });
        appendUtmsToParams(params, attribution);
        router.push(`/ask?${params.toString()}`);
      }}
      className={cn(
        "group relative flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-[#0F131A]/85 p-5 text-left",
        "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.75)]",
        motion.hoverLift,
        motion.hoverGold,
        motion.focusGold,
        className
      )}
    >
      {ribbon && (
        <span className="absolute -top-2 right-3 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#0A0A0A]">
          {ribbon}
        </span>
      )}

      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/[0.10]">
          <Icon className="h-4 w-4 text-gold-300" aria-hidden="true" />
        </span>
        <h3 className="text-[16px] font-semibold text-[#F7F1E8] leading-tight">
          {title}
        </h3>
        <ArrowUpRight
          className="ml-auto h-4 w-4 text-slate-400 transition-colors group-hover:text-gold-300"
          aria-hidden="true"
        />
      </div>

      <p className="text-[13.5px] text-slate-200 leading-relaxed">{description}</p>
    </button>
  );
}
