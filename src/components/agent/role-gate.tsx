import { cn } from "@/lib/utils/cn";
import type { AgentAccessDenied } from "@/lib/agent/agent-auth";
import { AGENT_DENIAL_MESSAGES } from "@/lib/agent/agent-auth";

// ---------------------------------------------------------------------------
// RoleGate — renders a permission notice instead of gated content.
//
// Used at the top of agent pages when resolveAgentAccess() returns ok=false.
// Intentionally does NOT import any admin auth utilities — the permission
// boundary is enforced at the data layer (resolveAgentAccess / agentOwnsLead),
// not by this UI component.
// ---------------------------------------------------------------------------

interface RoleGateProps {
  denial: AgentAccessDenied;
  className?: string;
}

export function RoleGate({ denial, className }: RoleGateProps) {
  const message = AGENT_DENIAL_MESSAGES[denial.reason] ?? denial.message;

  return (
    <div
      className={cn(
        "min-h-screen bg-[#080806] flex items-center justify-center p-8",
        className
      )}
      role="main"
      aria-label="Access required"
    >
      <div className="max-w-md w-full rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
        <div
          className="h-12 w-12 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] flex items-center justify-center mx-auto mb-4"
          aria-hidden="true"
        >
          <span className="font-bebas text-xl text-cyan-400">ID</span>
        </div>
        <h1 className="font-display text-xl font-semibold text-cream mb-2">
          Agent Portal
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{message}</p>

        {denial.reason === "no_agent_id" && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left">
            <p className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500 mb-2">
              How to access
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
              <li>1. Open the Routing Control Center in the admin portal</li>
              <li>2. Find the agent in the roster</li>
              <li>3. Copy their agent ID link from the roster card</li>
              <li>4. Share the link with the agent</li>
            </ul>
          </div>
        )}

        {denial.reason === "agent_inactive" && (
          <a
            href="/admin/routing"
            className="inline-block text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors mt-2"
          >
            Open Routing Control Center →
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PermissionNotice — inline notice for denied sub-actions (not full-page)
// ---------------------------------------------------------------------------

interface PermissionNoticeProps {
  message: string;
  action?: string;
  className?: string;
}

export function PermissionNotice({
  message,
  action,
  className,
}: PermissionNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-400/20 bg-amber-400/[0.03] px-4 py-3 flex items-start gap-3",
        className
      )}
      role="alert"
      aria-label="Permission notice"
    >
      <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60 mt-1.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-amber-400/80 leading-snug">{message}</p>
        {action && (
          <p className="text-[10px] text-slate-600 mt-1">{action}</p>
        )}
      </div>
    </div>
  );
}
