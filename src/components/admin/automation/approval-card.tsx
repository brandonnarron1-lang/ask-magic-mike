import { cn } from "@/lib/utils/cn";
import type { ApprovalQueueItem } from "@/lib/automation/execution-planner";
import { TRIGGER_LABELS, CATEGORY_LABELS } from "@/lib/automation/workflow-engine";
import { ImpactScore } from "./impact-score";
import { estimateCompletionTime } from "@/lib/automation/execution-planner";

// ---------------------------------------------------------------------------
// ApprovalCard — single approval item
// ---------------------------------------------------------------------------

interface ApprovalCardProps {
  item: ApprovalQueueItem;
  rank: number;
  className?: string;
}

function relativeTime(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs  = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ApprovalCard({ item, rank, className }: ApprovalCardProps) {
  const isTop = rank === 1;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.02] p-4 transition-colors",
        isTop
          ? "border-amber-400/25 bg-amber-400/[0.02]"
          : "border-white/[0.07] hover:border-white/[0.11]",
        className
      )}
      role="article"
      aria-label={`Approval ${rank}: ${item.workflowName}`}
    >
      {isTop && <div className="h-px bg-amber-400/30 -mx-4 -mt-4 mb-3" aria-hidden="true" />}

      <div className="flex items-start gap-3">
        {/* Rank + impact */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="font-bebas text-xl text-slate-600 leading-none tabular-nums">
            {String(rank).padStart(2, "0")}
          </span>
          <ImpactScore score={item.impactScore} level={item.priority} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-label font-semibold uppercase text-slate-500 mb-0.5">
            {TRIGGER_LABELS[item.trigger]} · {CATEGORY_LABELS[item.category]}
          </p>
          <h3 className="text-sm font-semibold text-cream leading-snug mb-2">
            {item.workflowName}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
            <span>{item.stepsPendingApproval} step{item.stepsPendingApproval !== 1 ? "s" : ""} need approval</span>
            <span className="text-slate-700">·</span>
            <span>{estimateCompletionTime(item.estimatedMinutes)} to review</span>
            <span className="text-slate-700">·</span>
            <span>Prepared {relativeTime(item.preparedAt)}</span>
          </div>
        </div>

        {/* Approve / Reject hint */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-1.5 text-[10px] font-semibold text-emerald-400">
            Approve
          </div>
          <div className="rounded-lg border border-ruby-400/15 bg-white/[0.01] px-3 py-1.5 text-[10px] text-slate-600 text-center">
            Reject
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApprovalQueue — ordered list of approval items
// ---------------------------------------------------------------------------

interface ApprovalQueueProps {
  items: ApprovalQueueItem[];
  emptyMessage?: string;
  className?: string;
}

export function ApprovalQueue({ items, emptyMessage, className }: ApprovalQueueProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn("text-center py-12 text-slate-600 text-xs", className)}
        role="status"
        aria-label="Approval queue empty"
      >
        {emptyMessage ?? "No approvals pending. All workflows are clear."}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} role="list" aria-label="Approval queue">
      {items.map((item, i) => (
        <div key={item.workflowId} role="listitem">
          <ApprovalCard item={item} rank={i + 1} />
        </div>
      ))}
    </div>
  );
}
