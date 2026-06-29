import * as React from "react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

type MetricAccent = "gold" | "ruby" | "emerald" | "amber" | "cyan" | "neutral";

const ACCENT_STYLES: Record<MetricAccent, {
  wrap: string; rim: string; num: string; glow: string;
}> = {
  ruby:    { wrap: "border-ruby-400/22 bg-[#0D0606]/75",    rim: "via-ruby-400/35",    num: "text-ruby-300",    glow: "from-ruby-400/[0.06]"   },
  gold:    { wrap: "border-gold-400/22 bg-[#0D0A06]/75",    rim: "via-gold-400/35",    num: "text-gold-300",    glow: "from-gold-400/[0.05]"   },
  emerald: { wrap: "border-emerald-500/18 bg-[#060D08]/75", rim: "via-emerald-400/25", num: "text-emerald-300", glow: "from-emerald-400/[0.05]" },
  amber:   { wrap: "border-amber-500/18 bg-[#0C0A06]/75",   rim: "via-amber-400/30",   num: "text-amber-300",   glow: "from-amber-400/[0.05]"  },
  cyan:    { wrap: "border-cyan-500/18 bg-[#05090D]/75",    rim: "via-cyan-400/25",    num: "text-cyan-300",    glow: "from-cyan-400/[0.04]"   },
  neutral: { wrap: "border-white/[0.07] bg-[#0D0D0D]/60",   rim: "via-white/[0.10]",   num: "text-cream",       glow: "from-white/[0.02]"      },
};

export interface MetricTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  valueClassName?: string;
  sublabel?: string;
  accent?: MetricAccent;
  pulse?: boolean;
  href?: string;
  trend?: "up" | "down" | "neutral";
}

export function MetricTile({
  value,
  label,
  valueClassName,
  sublabel,
  accent = "neutral",
  pulse = false,
  href,
  className,
  children,
  ...props
}: MetricTileProps) {
  const s = ACCENT_STYLES[accent];

  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border backdrop-blur-sm px-5 py-4 h-full",
        "transition-all duration-200",
        s.wrap,
        href && "hover:border-opacity-50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.55)] cursor-pointer",
        className
      )}
      {...(!href ? props : {})}
    >
      {/* Top rim */}
      <div
        aria-hidden="true"
        className={cn("absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent", s.rim)}
      />
      {/* Ambient fill */}
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", s.glow)}
      />

      <div className="relative">
        <div className={cn("font-bebas text-5xl leading-none tracking-wide", s.num, valueClassName)}>
          {value}
        </div>
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400/80 mt-1.5">
          {label}
        </div>
        {sublabel && (
          <div className="text-[9.5px] text-slate-600 mt-0.5">{sublabel}</div>
        )}
        {children}
      </div>

      {pulse && (
        <span
          className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full motion-safe:animate-pulse"
          style={{
            backgroundColor: accent === "ruby" ? "rgba(193,39,45,0.9)" : "rgba(212,160,23,0.9)",
            boxShadow: `0 0 8px ${accent === "ruby" ? "rgba(193,39,45,0.6)" : "rgba(212,160,23,0.5)"}`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export interface MetricGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4 | 5;
}

export function MetricGrid({ cols = 4, className, children, ...props }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-2 sm:grid-cols-3",
        cols === 4 && "grid-cols-2 sm:grid-cols-4",
        cols === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
