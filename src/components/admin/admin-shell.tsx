import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  headerRight?: React.ReactNode;
  devMode?: boolean;
  className?: string;
}

export function AdminShell({
  children,
  title,
  eyebrow = "Ask Magic Mike · Cockpit",
  backHref,
  backLabel = "← dashboard",
  headerRight,
  devMode = false,
  className,
}: AdminShellProps) {
  return (
    <div className={cn("min-h-screen bg-[#060604] text-cream", className)}>
      {/* Animated top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

      <header className="sticky top-0 z-sticky border-b border-white/[0.055] bg-[#070605]/92 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Gold "M" logotype mark */}
            <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.12] to-gold-400/[0.04]"
              style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.15)" }}>
              <span className="font-bebas text-[15px] leading-none text-gold-400 select-none">M</span>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] tracking-label font-semibold uppercase text-gold-400/55 mb-px select-none">
                {eyebrow}
              </p>
              <h1 className="font-display text-xl font-semibold text-cream leading-tight truncate sm:text-[22px]">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {devMode && (
              <span className="rounded-full border border-amber-400/35 bg-amber-400/[0.08] px-2.5 py-0.5 text-[9px] tracking-label font-bold uppercase text-amber-400">
                Dev
              </span>
            )}
            {headerRight}

            {/* Live pulse indicator */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
              <span className="text-[9px] tracking-label uppercase text-emerald-400/80 font-semibold">Live</span>
            </div>

            {backHref && (
              <Link
                href={backHref}
                className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[11px] text-slate-400 hover:text-gold-300 hover:border-gold-400/20 hover:bg-gold-400/[0.04] transition-all duration-150"
              >
                {backLabel}
              </Link>
            )}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

export function AdminCard({
  title,
  children,
  className,
  accent,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "gold" | "ruby" | "emerald" | "default";
}) {
  const accentStyles = {
    gold:    "border-gold-400/20 bg-[#0C0A06]/70",
    ruby:    "border-ruby-400/20 bg-[#0C0606]/70",
    emerald: "border-emerald-500/15 bg-[#060C09]/70",
    default: "border-white/[0.07] bg-[#0D0D0D]/60",
  };

  const rimStyles = {
    gold:    "via-gold-400/30",
    ruby:    "via-ruby-400/25",
    emerald: "via-emerald-400/20",
    default: "via-white/10",
  };

  const a = accent ?? "default";

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border backdrop-blur-sm p-4",
      accentStyles[a],
      className
    )}>
      {/* Top rim gradient */}
      <div className={cn("absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent", rimStyles[a])} />
      {title && (
        <p className="text-[9.5px] tracking-label uppercase font-semibold text-gold-300/75 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function AdminSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn(
      "flex items-center gap-2.5 text-[9.5px] font-bold uppercase tracking-label text-slate-400/90",
      className
    )}>
      <span className="block h-px w-4 bg-gradient-to-r from-gold-400/70 to-transparent shrink-0" aria-hidden="true" />
      {children}
    </h2>
  );
}
