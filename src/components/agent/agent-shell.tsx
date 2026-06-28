import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// AgentShell — Agent portal chrome.
// Deliberately separate from AdminShell so agent pages never accidentally
// import or render broker-only admin controls.
// ---------------------------------------------------------------------------

interface AgentShellProps {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  agentName?: string | null;
  agentId?: string;
  backHref?: string;
  backLabel?: string;
  headerRight?: React.ReactNode;
  /** Shows amber chip when broker is previewing agent view */
  brokerPreview?: boolean;
  devMode?: boolean;
  className?: string;
}

export function AgentShell({
  children,
  title,
  eyebrow = "Ask Magic Mike · Agent Portal",
  agentName,
  agentId,
  backHref,
  backLabel = "← queue",
  headerRight,
  brokerPreview = false,
  devMode = false,
  className,
}: AgentShellProps) {
  return (
    <div className={cn("min-h-screen bg-[#080806] text-cream", className)}>
      {/* Cyan top accent — distinct from gold admin accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <header className="border-b border-cyan-500/[0.08] bg-[#0A0906]/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10.5px] tracking-label font-semibold uppercase text-cyan-400/70 mb-0.5">
              {eyebrow}
              {agentName && (
                <span className="ml-2 text-slate-500">· {agentName}</span>
              )}
            </p>
            <h1 className="font-display text-2xl font-semibold text-cream leading-tight truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {brokerPreview && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/[0.10] px-2.5 py-1 text-[10px] tracking-label font-bold uppercase text-amber-400">
                Broker Preview
              </span>
            )}
            {devMode && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/[0.10] px-2.5 py-1 text-[10px] tracking-label font-bold uppercase text-amber-400">
                Dev · No Data
              </span>
            )}
            {headerRight}
            {backHref && (
              <Link
                href={backHref}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                {backLabel}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Agent nav strip */}
      {agentId && (
        <nav
          className="border-b border-white/[0.05] bg-[#0A0906]/60 backdrop-blur-sm"
          aria-label="Agent portal navigation"
        >
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
              {[
                { href: `/agent?agent_id=${agentId}`,                      label: "Dashboard" },
                { href: `/agent/leads?agent_id=${agentId}`,                label: "Lead Queue" },
                { href: `/agent/tasks?agent_id=${agentId}`,                label: "Tasks" },
                { href: `/agent/performance?agent_id=${agentId}`,          label: "Performance" },
              ].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-4 py-3 text-[10.5px] tracking-label font-semibold uppercase whitespace-nowrap text-slate-500 hover:text-slate-300 border-b-2 border-transparent transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {children}
    </div>
  );
}

/** Card for agent portal sections */
export function AgentCard({
  title,
  children,
  accent = false,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.025] overflow-hidden",
        accent ? "border-cyan-500/20" : "border-white/[0.07]",
        className
      )}
    >
      {accent && <div className="h-px bg-cyan-500/30" aria-hidden="true" />}
      {title && (
        <div className="px-5 pt-4 pb-0">
          <h3 className="text-[10.5px] tracking-label font-semibold uppercase text-cyan-400/70 leading-none">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5 pt-4">{children}</div>
    </div>
  );
}

/** Section heading for agent pages */
export function AgentSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[10.5px] tracking-label font-semibold uppercase text-slate-500 leading-none",
        className
      )}
    >
      {children}
    </h2>
  );
}
