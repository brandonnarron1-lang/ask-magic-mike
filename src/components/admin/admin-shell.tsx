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
      {/* Animated top accent — shimmer line */}
      <div className="relative h-[2px] overflow-hidden bg-gradient-to-r from-transparent via-gold-400/80 to-transparent">
        <div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          style={{ animation: "shimmerLine 2.4s ease-in-out infinite" }}
        />
      </div>

      <style>{`
        @keyframes shimmerLine {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(400%); }
        }
        @keyframes statusPing {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      <header
        className="sticky top-0 z-sticky border-b border-white/[0.06] bg-[#070605]/95 backdrop-blur-md"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Gold "M" logotype mark */}
            <div
              className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-400/25 bg-gradient-to-b from-gold-400/20 to-gold-600/10"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(212,160,23,0.20), 0 0 16px rgba(212,160,23,0.08)",
              }}
            >
              <span className="font-bebas text-[17px] leading-none text-gold-400 select-none">
                M
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] tracking-label font-semibold uppercase text-gold-400/70 mb-px select-none">
                {eyebrow}
              </p>
              <h1 className="font-display text-xl font-bold text-cream leading-tight truncate sm:text-2xl">
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

            {/* Live pulse badge */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                  style={{ animation: "statusPing 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
                />
              </span>
              <span className="text-[10px] tracking-label uppercase text-emerald-400/80 font-semibold">
                Live
              </span>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex flex-col items-center cursor-pointer group">
              <div className="flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] text-slate-600 font-mono group-hover:text-slate-400 group-hover:border-white/[0.12] transition-colors duration-150">
                ⌘K
              </div>
              <span className="text-[8px] text-slate-700 uppercase tracking-label text-center mt-0.5">
                Command
              </span>
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
    gold:    "border-gold-400/20 bg-[#0C0A06]/70 hover:border-gold-400/[0.12]",
    ruby:    "border-ruby-400/20 bg-[#0C0606]/70 hover:border-ruby-400/[0.12]",
    emerald: "border-emerald-500/15 bg-[#060C09]/70 hover:border-emerald-500/[0.12]",
    default: "border-white/[0.07] bg-[#0D0D0D]/60 hover:border-white/[0.12]",
  };

  const rimStyles = {
    gold:    "from-transparent via-gold-400/30 to-transparent",
    ruby:    "from-transparent via-ruby-400/25 to-transparent",
    emerald: "from-transparent via-emerald-400/20 to-transparent",
    default: "from-transparent via-white/10 to-transparent",
  };

  const a = accent ?? "default";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-sm p-5 transition-all duration-200",
        accentStyles[a],
        className
      )}
    >
      {/* Top rim gradient */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-px bg-gradient-to-r",
          rimStyles[a]
        )}
      />
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
  count,
}: {
  children: React.ReactNode;
  className?: string;
  count?: string | number;
}) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-label text-slate-400/90",
        className
      )}
    >
      <span
        className="block h-px w-5 bg-gradient-to-r from-gold-400/70 to-transparent shrink-0"
        aria-hidden="true"
      />
      <span className="flex-1">{children}</span>
      {count !== undefined && (
        <span className="ml-auto rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px text-[9px] font-semibold tabular-nums text-slate-500">
          {count}
        </span>
      )}
    </h2>
  );
}
