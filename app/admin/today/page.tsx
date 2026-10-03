import type { ReactNode } from "react";
import Link from "next/link";
import { loadAdminTodayQueue, type AdminTodayAction } from "../../lib/adminTodayView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import { completeTodayTask, reviewTodayAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function date(value: string | null, timezone: string) {
  if (!value) return "No due time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsed);
}

function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "ruby" | "cyan" | "muted" }) {
  const tones = {
    gold: "border-[#cda24a55] bg-[#cda24a14] text-[#f0cf7a]",
    ruby: "border-[#b7374d66] bg-[#3a0b14] text-[#ffb1bd]",
    cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    muted: "border-white/10 bg-white/[.03] text-[#a9a092]",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${tones[tone]}`}>{children}</span>;
}

function actionMessage(value?: string) {
  const messages: Record<string, string> = {
    snoozed: "Action snoozed for 24 hours.",
    dismissed: "Action dismissed with an audit reason.",
    completed: "Follow-up task completed and recorded.",
    stale_action: "This action changed in another session. The queue was refreshed; review it before trying again.",
    dismissal_reason_required: "Enter a brief reason before dismissing an action.",
    preview_data_disabled: "Preview is read-only. No action state changed.",
    forbidden: "Your role cannot change that action.",
  };
  return value ? messages[value] || value.replaceAll("_", " ") : null;
}

function ActionCard({ item, canReview }: { item: AdminTodayAction; canReview: boolean }) {
  const urgent = ["unassigned_exception", "hot", "overdue_sla"].includes(item.priorityBucket);
  return (
    <article className={`rounded-xl border bg-[linear-gradient(145deg,rgba(15,15,15,.98),rgba(5,5,5,.98))] p-5 shadow-[0_22px_70px_rgba(0,0,0,.24)] ${urgent ? "border-[#cda24a44]" : "border-white/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill tone={item.priorityBucket === "unassigned_exception" || item.priorityBucket === "overdue_sla" ? "ruby" : item.priorityBucket === "hot" ? "gold" : "cyan"}>
              {item.priorityBucket.replaceAll("_", " ")}
            </Pill>
            {item.blockers.map((blocker) => <Pill key={blocker} tone="ruby">{blocker.replaceAll("_", " ")}</Pill>)}
          </div>
          <Link href={`/admin/leads/${item.leadId}`} className="mt-3 block truncate font-serif text-2xl text-[#f7ecd5] outline-none transition hover:text-[#f0cf7a] focus-visible:ring-2 focus-visible:ring-cyan-300">
            {item.leadLabel}
          </Link>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9bfad]">{item.recommendedAction}</p>
        </div>
        <Link href={`/admin/leads/${item.leadId}`} className="inline-flex min-h-11 items-center rounded-md border border-[#cda24a66] bg-[#cda24a16] px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#f7ecd5] outline-none hover:bg-[#cda24a24] focus-visible:ring-2 focus-visible:ring-cyan-300">
          Open workspace
        </Link>
      </div>
      <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
        <div><dt className="uppercase tracking-[.13em] text-[#827a6e]">Why now</dt><dd className="mt-1 text-[#d8ceba]">{item.reasonCodes.map((reason) => reason.replaceAll("_", " ")).join(" · ")}</dd></div>
        <div><dt className="uppercase tracking-[.13em] text-[#827a6e]">Due</dt><dd className="mt-1 text-[#d8ceba]">{date(item.dueAt, item.timezone)}</dd></div>
        <div><dt className="uppercase tracking-[.13em] text-[#827a6e]">Evidence</dt><dd className="mt-1 break-words font-mono text-[11px] text-[#9c9488]">{item.evidenceReferences.join(" · ")}</dd></div>
      </dl>
      {canReview ? (
        <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-[auto_auto_1fr_auto]">
          {item.actionKind === "complete_task" && !item.blockers.length ? (
            <form action={completeTodayTask}>
              <input type="hidden" name="action_id" value={item.id} />
              <input type="hidden" name="lead_id" value={item.leadId} />
              <input type="hidden" name="record_version" value={item.recordVersion} />
              <button className="min-h-11 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Complete task</button>
            </form>
          ) : null}
          <form action={reviewTodayAction}>
            <input type="hidden" name="action_id" value={item.id} />
            <input type="hidden" name="lead_id" value={item.leadId} />
            <input type="hidden" name="record_version" value={item.recordVersion} />
            <input type="hidden" name="review_version" value={item.reviewVersion} />
            <input type="hidden" name="review_status" value="snoozed" />
            <button className="min-h-11 rounded-md border border-white/15 px-4 py-2 text-xs font-semibold text-[#d8ceba] outline-none hover:border-[#cda24a66] focus-visible:ring-2 focus-visible:ring-cyan-300">Snooze 24 hours</button>
          </form>
          <form action={reviewTodayAction} className="contents">
            <input type="hidden" name="action_id" value={item.id} />
            <input type="hidden" name="lead_id" value={item.leadId} />
            <input type="hidden" name="record_version" value={item.recordVersion} />
            <input type="hidden" name="review_version" value={item.reviewVersion} />
            <input type="hidden" name="review_status" value="dismissed" />
            <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#827a6e]">
              Dismissal reason
              <input name="reason" required minLength={3} maxLength={160} className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-black/40 px-3 text-sm normal-case tracking-normal text-[#f7ecd5] outline-none focus-visible:border-cyan-300" />
            </label>
            <button className="min-h-11 self-end rounded-md border border-[#b7374d66] bg-[#3a0b14] px-4 py-2 text-xs font-semibold text-[#ffb1bd] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Dismiss</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default async function AdminTodayPage({ searchParams }: { searchParams?: Promise<{ today_action?: string }> }) {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  const queue = await loadAdminTodayQueue(principal);
  const params = searchParams ? await searchParams : {};
  const notice = actionMessage(params.today_action);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-[#f7ecd5] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden rounded-2xl border border-[#cda24a33] bg-[radial-gradient(circle_at_85%_0%,rgba(16,156,181,.16),transparent_34%),linear-gradient(135deg,#12100c,#050505_62%)] p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#f0cf7a]">Ask Magic Mike · Agent Command Center</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">What needs attention today.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c9bfad]">A deterministic, permission-aware view of assignment exceptions, urgent opportunities, SLA evidence, delivery failures, appointments, and follow-up.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Today queue summary">
            {Object.entries(queue.counts).map(([bucket, count]) => (
              <div key={bucket} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8f8778]">{bucket.replaceAll("_", " ")}</p>
                <p className="mt-2 font-serif text-2xl">{count}</p>
              </div>
            ))}
          </div>
        </header>

        {notice ? <p role="status" className="mt-4 rounded-md border border-cyan-300/25 bg-cyan-300/[.08] p-3 text-sm text-cyan-100">{notice}</p> : null}
        {queue.error ? <p role="alert" className="mt-4 rounded-md border border-[#b7374d66] bg-[#3a0b14] p-3 text-sm text-[#ffb1bd]">{queue.error}</p> : null}

        <section className="mt-7" aria-labelledby="today-work-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#f0cf7a]">Priority work</p><h2 id="today-work-heading" className="mt-2 font-serif text-3xl">Your ordered queue</h2></div>
            <p className="text-xs text-[#827a6e]">Generated {date(queue.generatedAt, queue.timezone)} · {queue.timezone}</p>
          </div>
          <div className="space-y-4">
            {queue.items.length ? queue.items.map((item) => (
              <ActionCard key={item.id} item={item} canReview={Boolean(principal && hasLeadCenterPermission(principal.role, item.requiredPermission))} />
            )) : (
              <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-7"><h3 className="font-serif text-3xl">Queue clear</h3><p className="mt-3 text-sm text-[#c9bfad]">{queue.configured ? "No authorized open actions were returned." : "The canonical Neon database is not configured in this environment."}</p></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
