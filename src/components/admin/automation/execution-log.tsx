import { cn } from "@/lib/utils/cn";
import type { AuditEvent } from "@/lib/automation/audit-log";
import { AUDIT_EVENT_LABELS, AUDIT_EVENT_COLORS } from "@/lib/automation/audit-log";

// ---------------------------------------------------------------------------
// ExecutionLog — scrollable audit event list
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const d    = Math.floor(hrs / 24);
  return `${d}d ago`;
}

interface ExecutionLogEntryProps {
  event: AuditEvent;
}

function ExecutionLogEntry({ event }: ExecutionLogEntryProps) {
  const color  = AUDIT_EVENT_COLORS[event.eventType] ?? "text-slate-400";
  const label  = AUDIT_EVENT_LABELS[event.eventType] ?? event.eventType;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0">
      <span className={cn("text-[9px] font-bold uppercase border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5", color,
        "border-current/20 bg-current/[0.06]"
      )}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 leading-snug">{event.detail}</p>
        <p className="text-[9px] text-slate-700 mt-0.5">
          {event.workflowName} · by {event.actorLabel}
        </p>
      </div>
      <span className="text-[9px] text-slate-700 shrink-0 tabular-nums">
        {relativeTime(event.timestamp)}
      </span>
    </div>
  );
}

interface ExecutionLogProps {
  events: AuditEvent[];
  title?: string;
  className?: string;
}

export function ExecutionLog({ events, title = "Audit Log", className }: ExecutionLogProps) {
  return (
    <div
      className={cn("rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden", className)}
      role="log"
      aria-label={title}
    >
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <h3 className="text-[10.5px] tracking-label font-semibold uppercase text-slate-500">{title}</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-8">No audit events recorded yet.</p>
      ) : (
        <div className="px-4">
          {events.map((event) => (
            <ExecutionLogEntry key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FailureCard — failure diagnostic display
// ---------------------------------------------------------------------------

interface FailureCardProps {
  workflowName: string;
  reason: string;
  occurredAt: string;
  workflowId?: string;
  className?: string;
}

export function FailureCard({ workflowName, reason, occurredAt, className }: FailureCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ruby-400/25 bg-ruby-400/[0.03] p-4",
        className
      )}
      role="alert"
      aria-label={`Failure in ${workflowName}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-2 w-2 rounded-full bg-ruby-400 shrink-0 mt-1.5 motion-safe:animate-pulse" aria-hidden="true" />
        <div>
          <p className="text-[10.5px] tracking-label font-bold uppercase text-ruby-400 mb-0.5">
            Failure Detected
          </p>
          <p className="text-sm font-semibold text-cream">{workflowName}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{reason}</p>
          <p className="text-[9px] text-slate-700 mt-1">{relativeTime(occurredAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RetryCard — retry event display
// ---------------------------------------------------------------------------

interface RetryCardProps {
  workflowName: string;
  attemptNumber: number;
  reason: string;
  scheduledAt: string;
  className?: string;
}

export function RetryCard({ workflowName, attemptNumber, reason, scheduledAt, className }: RetryCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gold-400/20 bg-gold-400/[0.02] p-4",
        className
      )}
      aria-label={`Retry attempt ${attemptNumber} for ${workflowName}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-2 w-2 rounded-full bg-gold-400 shrink-0 mt-1.5 motion-safe:animate-pulse" aria-hidden="true" />
        <div>
          <p className="text-[10.5px] tracking-label font-bold uppercase text-gold-300 mb-0.5">
            Retry #{attemptNumber}
          </p>
          <p className="text-sm font-semibold text-cream">{workflowName}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{reason}</p>
          <p className="text-[9px] text-slate-700 mt-1">Scheduled: {relativeTime(scheduledAt)}</p>
        </div>
      </div>
    </div>
  );
}
