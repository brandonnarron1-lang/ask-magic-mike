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
      {/* Cyan top accent bar — animated shimmer, distinct from gold admin accent */}
      <div className="relative h-[2px] overflow-hidden bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent">
        <div
          aria-hidden="true"
          className="shimmer-line absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,207,234,0.18) 20%, rgba(0,207,234,0.80) 50%, rgba(0,207,234,0.18) 80%, transparent 100%)",
          }}
        />
      </div>

      <header
        className="sticky top-0 z-40 border-b border-cyan-500/[0.10] bg-[#070605]/95 backdrop-blur-md"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-5 py-3.5">
          {/* Cyan "A" logotype mark — h-9 w-9 with cyan glow */}
          <div
            aria-hidden="true"
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/[0.22] bg-gradient-to-b from-cyan-500/[0.12] to-cyan-500/[0.04] text-[13px] font-black tracking-tight text-cyan-400/90 select-none"
            style={{
              boxShadow:
                "0 0 16px rgba(0,207,234,0.12), inset 0 1px 0 rgba(0,207,234,0.15)",
            }}
          >
            A
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] tracking-label font-semibold uppercase text-cyan-400/60 mb-px leading-none">
              {eyebrow}
              {agentName && (
                <span className="ml-2 text-slate-600">· {agentName}</span>
              )}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-cream leading-tight truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live status badge — premium pill with pulse */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/[0.20] bg-cyan-500/[0.06] px-2.5 py-1 text-[9.5px] tracking-label font-bold uppercase text-cyan-400/80">
              <span
                aria-hidden="true"
                className="relative flex h-1.5 w-1.5 shrink-0"
              >
                <span
                  className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-cyan-400 opacity-60"
                  style={{ animationDuration: "2.4s" }}
                />
                <span
                  className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400"
                  style={{ boxShadow: "0 0 6px rgba(0,207,234,0.8)" }}
                />
              </span>
              Live
            </span>

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
                    "relative px-4 py-3 text-[10px] tracking-label font-semibold uppercase whitespace-nowrap",
                    "text-slate-500 hover:text-cyan-300 transition-colors duration-150",
                    // Active underline on hover; actual active state would need usePathname
                    "after:absolute after:bottom-0 after:inset-x-4 after:h-px after:rounded-full",
                    "after:bg-cyan-400/0 hover:after:bg-cyan-400/60 after:transition-all after:duration-150"
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
        "relative rounded-2xl border overflow-hidden backdrop-blur-[1px]",
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
            ? "bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        )}
      />
      {title && (
        <div className="px-5 pt-5 pb-0">
          <h3 className={cn(
            "flex items-center gap-2 text-[9.5px] tracking-label font-bold uppercase leading-none",
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
        "flex items-center gap-2.5 text-[9.5px] font-bold uppercase tracking-label text-slate-400/80",
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
