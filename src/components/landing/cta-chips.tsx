"use client";

import { Home, TrendingUp, CalendarCheck, DollarSign, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CTAChip } from "@/types/domain.types";

interface CTAChipConfig {
  id: CTAChip;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "gold" | "ruby";
  defaultQuestion: string;
}

const CHIPS: CTAChipConfig[] = [
  {
    id: "home_worth",
    label: "What's my home worth?",
    icon: Home,
    variant: "gold",
    defaultQuestion: "I'd like to know the current market value of my home in Wilson, NC.",
  },
  {
    id: "should_sell_now",
    label: "Should I sell now?",
    icon: TrendingUp,
    variant: "gold",
    defaultQuestion: "Is now a good time to sell my home in Eastern NC? What's the market like?",
  },
  {
    id: "tour_home",
    label: "Can I tour a home?",
    icon: CalendarCheck,
    variant: "gold",
    defaultQuestion: "I'm interested in touring homes for sale in Wilson or Eastern NC. Can you help me schedule a showing?",
  },
  {
    id: "what_can_afford",
    label: "What can I afford?",
    icon: DollarSign,
    variant: "gold",
    defaultQuestion: "I want to understand what price range I can afford to buy a home in Wilson or Eastern NC.",
  },
  {
    id: "talk_to_mike",
    label: "Talk to Mike",
    icon: Phone,
    variant: "ruby",
    defaultQuestion: "I'd like to speak directly with Mike Eatmon about buying or selling real estate.",
  },
];

interface CTAChipsProps {
  onSelect?: (chip: CTAChip, question: string) => void;
  selected?: CTAChip | null;
  className?: string;
}

export function CTAChips({ onSelect, selected, className }: CTAChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {CHIPS.map((chip) => {
        const Icon = chip.icon;
        const isSelected = selected === chip.id;
        const isRuby = chip.variant === "ruby";

        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelect?.(chip.id, chip.defaultQuestion)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium",
              "border transition-all duration-200 motion-reduce:transition-none",
              "hover:-translate-y-[2px] active:translate-y-0 motion-reduce:hover:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
              !isRuby && [
                "border-gold-400/25 text-gold-300 bg-gold-400/[0.05]",
                "hover:bg-gold-400/[0.10] hover:border-gold-400/50 hover:text-gold-200",
                "hover:shadow-[0_4px_16px_rgba(212,160,23,0.12)]",
                isSelected && "bg-gold-400/[0.14] border-gold-400/65 text-gold-100 shadow-[0_4px_20px_rgba(212,160,23,0.18)]",
              ],
              isRuby && [
                "border-ruby-400/35 text-ruby-300 bg-ruby-400/[0.05]",
                "hover:bg-ruby-400/[0.10] hover:border-ruby-400/60 hover:text-ruby-200",
                "hover:shadow-[0_4px_16px_rgba(193,39,45,0.12)]",
                isSelected && "bg-ruby-400/[0.14] border-ruby-400/65 text-ruby-100 shadow-[0_4px_20px_rgba(193,39,45,0.18)]",
              ]
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
