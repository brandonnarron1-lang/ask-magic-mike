import Link from "next/link";
import { cn } from "@/lib/utils/cn";

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
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <header className="sticky top-0 z-40 border-b border-cyan-500/[0.10] bg-[#080806]/92 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-5 py-3.5">
          {/* Cyan "A" logotype mark */}
          <div
            aria-hidden="true"
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/[0.18] bg-gradient-to-b from-cyan-500/[0.10] to-cyan-500/[0.03] text-[13px] font-black tracking-tight text-cyan-400/80 select-none"
          >
            A
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] tracking-[0.16em] font-semibold uppercase text-cyan-400/60 mb-px leading-none">
              {eyebrow}
              {agentName && (
                <span className="ml-2 text-slate-600">· {agentName}</span>
              )}
            </p>
            <h1 className="font-display text-xl font-semibold text-cream leading-tight truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live pulse */}
            <span
              aria-hidden="true"
              className="flex h-1.5 w-1.5 rounded-full bg-cyan-400"
              style={{ boxShadow: "0 0 6px rgba(0,207,234,0.7)" }}
            />

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
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5",
                  "text-[11px] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/25 transition-all duration-150"
                )}
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
          className="border-b border-white/[0.05] bg-[#080806]/60 backdrop-blur-sm"
          aria-label="Agent portal navigation"
        >
          <div className="max-w-5xl mx-auto px-5">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
              {[
                { href: `/agent?agent_id=${agentId}`,              label: "Dashboard" },
                { href: `/agent/leads?agent_id=${agentId}`,        label: "Lead Queue" },
                { href: `/agent/tasks?agent_id=${agentId}`,        label: "Tasks" },
                { href: `/agent/performance?agent_id=${agentId}`,  label: "Performance" },
              ].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "relative px-4 py-3 text-[10px] tracking-[0.14em] font-semibold uppercase whitespace-nowrap",
                    "text-slate-500 hover:text-slate-300 transition-colors duration-150",
                    "after:absolute after:bottom-0 after:inset-x-4 after:h-px after:rounded-full",
                    "after:bg-cyan-400/0 hover:after:bg-cyan-400/40 after:transition-all after:duration-150"
                  )}
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
        "relative rounded-xl border overflow-hidden backdrop-blur-[1px]",
        accent
          ? "border-cyan-500/[0.18] bg-[#0A0906]/70"
          : "border-white/[0.07] bg-white/[0.018]",
        className
      )}
    >
      {/* Top rim gradient */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          accent
            ? "bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
        )}
      />
      {title && (
        <div className="px-5 pt-4 pb-0">
          <h3 className={cn(
            "flex items-center gap-2 text-[9.5px] tracking-[0.16em] font-bold uppercase leading-none",
            accent ? "text-cyan-400/70" : "text-slate-500"
          )}>
            <span
              aria-hidden="true"
              className={cn(
                "block h-px w-3.5 bg-gradient-to-r shrink-0",
                accent ? "from-cyan-400/60 to-transparent" : "from-slate-500/50 to-transparent"
              )}
            />
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
        "flex items-center gap-2.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400/80",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="block h-px w-4 bg-gradient-to-r from-cyan-400/60 to-transparent shrink-0"
      />
      {children}
    </h2>
  );
}
