import { cn } from "@/lib/utils/cn";

export interface TaskItem {
  id: string;
  title: string;
  dueAt: string | null;
  status: string;
  leadId: string | null;
  priority: string | null;
}

interface TaskListProps {
  tasks: TaskItem[];
  agentId: string;
  showCompleted?: boolean;
  className?: string;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-ruby-400",
  high:   "bg-amber-400",
  medium: "bg-gold-400/60",
  low:    "bg-slate-600",
};

function formatDue(isoDate: string | null): string {
  if (!isoDate) return "No due date";
  const d    = new Date(isoDate);
  const now  = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isOverdue(isoDate: string | null): boolean {
  if (!isoDate) return false;
  return new Date(isoDate).getTime() < Date.now();
}

export function TaskRow({
  task,
  agentId,
  className,
}: {
  task: TaskItem;
  agentId: string;
  className?: string;
}) {
  const overdue = isOverdue(task.dueAt) && task.status !== "completed";
  const priorityDot = PRIORITY_DOT[task.priority ?? ""] ?? PRIORITY_DOT.low;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-colors",
        task.status === "completed"
          ? "border-white/[0.04] bg-white/[0.01] opacity-50"
          : overdue
          ? "border-ruby-400/20 bg-ruby-400/[0.03]"
          : "border-white/[0.06] bg-white/[0.015]",
        className
      )}
      aria-label={`Task: ${task.title}`}
    >
      {/* Checkbox-style indicator */}
      <div
        className={cn(
          "mt-0.5 h-4 w-4 rounded border shrink-0",
          task.status === "completed"
            ? "border-emerald-400/40 bg-emerald-400/[0.15]"
            : "border-white/[0.12] bg-white/[0.03]"
        )}
        aria-label={task.status === "completed" ? "Completed" : "Incomplete"}
      >
        {task.status === "completed" && (
          <svg viewBox="0 0 16 16" className="h-full w-full text-emerald-400/80" aria-hidden="true">
            <polyline points="3,8 6,11 13,4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Priority dot */}
      <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", priorityDot)} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug",
          task.status === "completed" ? "text-slate-600 line-through" : "text-cream"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className={cn(
            "text-[10px]",
            overdue ? "text-ruby-400/70" : "text-slate-600"
          )}>
            {formatDue(task.dueAt)}
          </p>
          {task.leadId && (
            <a
              href={`/agent/leads/${task.leadId}?agent_id=${agentId}`}
              className="text-[10px] text-cyan-400/50 hover:text-cyan-400 transition-colors"
              aria-label="View linked lead"
            >
              View lead →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskList({ tasks, agentId, showCompleted = false, className }: TaskListProps) {
  const visible = showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== "completed");

  if (visible.length === 0) {
    return (
      <div
        className={cn("text-center py-8 text-slate-600 text-xs", className)}
        role="status"
        aria-label="No tasks"
      >
        No {showCompleted ? "" : "open "}tasks
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="Task list">
      {visible.map((task) => (
        <div key={task.id} role="listitem">
          <TaskRow task={task} agentId={agentId} />
        </div>
      ))}
    </div>
  );
}
