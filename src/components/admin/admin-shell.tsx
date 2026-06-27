import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface AdminShellProps {
  children: React.ReactNode;
  /** Page title shown in header */
  title: string;
  /** Eyebrow line above title (defaults to "Ask Magic Mike · Cockpit") */
  eyebrow?: string;
  /** If set, renders a back link */
  backHref?: string;
  backLabel?: string;
  /** Optional right-side header slot */
  headerRight?: React.ReactNode;
  /** Shows amber dev mode chip */
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
    <div className={cn("min-h-screen bg-[#080806] text-cream", className)}>
      {/* Gold top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />

      <header className="border-b border-gold-400/[0.09] bg-[#0A0906]/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-label font-semibold uppercase text-gold-300/80 mb-0.5">
              {eyebrow}
            </p>
            <h1 className="font-display text-2xl font-semibold text-cream leading-tight truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {devMode && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/[0.10] px-2.5 py-1 text-[10.5px] tracking-label font-bold uppercase text-amber-400">
                Dev · Sample Data
              </span>
            )}
            {headerRight}
            {backHref && (
              <Link
                href={backHref}
                className="text-xs text-slate-400 hover:text-gold-300 transition-colors"
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

/** Shared card wrapper for admin sections */
export function AdminCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-white/[0.09] bg-white/[0.025] p-4", className)}>
      {title && (
        <p className="text-[10.5px] tracking-label uppercase font-semibold text-gold-300/85 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/** Section heading styled to dashboard command center hierarchy */
export function AdminSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-[10.5px] font-semibold uppercase tracking-label text-slate-500", className)}>
      {children}
    </h2>
  );
}
