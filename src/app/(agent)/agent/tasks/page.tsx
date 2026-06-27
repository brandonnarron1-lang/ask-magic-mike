export const dynamic   = "force-dynamic";
export const revalidate = 0;

import { AgentShell, AgentSectionHeading } from "@/components/agent/agent-shell";
import { RoleGate } from "@/components/agent/role-gate";
import { TaskList } from "@/components/agent/task-list";
import { resolveAgentAccess } from "@/lib/agent/agent-auth";
import type { TaskItem } from "@/components/agent/task-list";

// ---------------------------------------------------------------------------
// Loader — reads tasks linked to this agent's leads
// ---------------------------------------------------------------------------

async function loadAgentTasks(agentId: string): Promise<{ tasks: TaskItem[]; configured: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { tasks: [], configured: false };

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = createAdminClient() as any;

    // Step 1: Get this agent's lead IDs (bounded)
    const { data: leadRows, error: leadErr } = await client
      .from("leads")
      .select("id")
      .eq("assigned_agent_id", agentId)
      .limit(200);

    if (leadErr || !leadRows || (leadRows as unknown[]).length === 0) {
      return { tasks: [], configured: true };
    }

    const leadIds = (leadRows as Array<{ id: string }>).map((r) => r.id);

    // Step 2: Get all tasks for those leads
    const { data: taskRows, error: taskErr } = await client
      .from("tasks")
      .select("id, title, due_at, status, lead_id, priority")
      .in("lead_id", leadIds)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(100);

    if (taskErr || !taskRows) return { tasks: [], configured: true };

    const tasks: TaskItem[] = (taskRows as Array<Record<string, unknown>>).map((t) => ({
      id:       t.id as string,
      title:    (t.title as string) ?? "Task",
      dueAt:    (t.due_at as string | null) ?? null,
      status:   (t.status as string) ?? "open",
      leadId:   (t.lead_id as string | null) ?? null,
      priority: (t.priority as string | null) ?? null,
    }));

    return { tasks, configured: true };
  } catch {
    return { tasks: [], configured: false };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentTasksPage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const access = await resolveAgentAccess(sp);

  if (!access.ok) return <RoleGate denial={access} />;

  const { agentId, agentName, isBrokerPreview } = access;
  const { tasks, configured } = await loadAgentTasks(agentId);

  const open      = tasks.filter((t) => t.status !== "completed");
  const completed = tasks.filter((t) => t.status === "completed");
  const overdue   = open.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now()
  );

  return (
    <AgentShell
      title="Tasks"
      eyebrow="Ask Magic Mike · Agent Portal"
      agentId={agentId}
      agentName={agentName}
      brokerPreview={isBrokerPreview}
      devMode={!configured}
      headerRight={
        open.length > 0 ? (
          <span className="text-xs text-slate-600 tabular-nums">
            {open.length} open
          </span>
        ) : undefined
      }
    >
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Overdue alert ── */}
        {overdue.length > 0 && (
          <div
            className="rounded-xl border border-ruby-400/20 bg-ruby-400/[0.03] px-5 py-3 flex items-center gap-3"
            role="alert"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-ruby-400 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
            <p className="text-xs font-semibold text-ruby-400">
              {overdue.length} task{overdue.length > 1 ? "s are" : " is"} overdue
            </p>
          </div>
        )}

        {/* ── Open tasks ── */}
        {open.length > 0 ? (
          <div>
            <AgentSectionHeading className="mb-3">
              Open Tasks — {open.length}
            </AgentSectionHeading>
            <TaskList tasks={open} agentId={agentId} showCompleted={false} />
          </div>
        ) : (
          <div
            className="text-center py-16 text-slate-600 text-xs"
            role="status"
            aria-label="No open tasks"
          >
            {configured
              ? "No open tasks. All clear."
              : "Database not configured — connect Supabase to load tasks."}
          </div>
        )}

        {/* ── Completed tasks ── */}
        {completed.length > 0 && (
          <div>
            <AgentSectionHeading className="mb-3">
              Completed — {completed.length}
            </AgentSectionHeading>
            <TaskList tasks={completed} agentId={agentId} showCompleted />
          </div>
        )}

      </main>
    </AgentShell>
  );
}
