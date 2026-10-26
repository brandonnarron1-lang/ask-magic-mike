import type { ReactNode } from "react";
import Link from "next/link";
import { loadAdminTodayQueue, type AdminTodayAction } from "../../lib/adminTodayView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";
import { completeTodayTask, reviewTodayAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const priorityLabels: Record<string, string> = {
  unassigned_exception: "Needs an owner", hot: "High priority", overdue_sla: "Overdue or needs scheduling",
  notification_failure: "Delivery needs review", active: "Active request", new_followup: "New or due today",
};
const blockerLabels: Record<string, string> = {
  test_record: "Test record — do not contact", communication_suppressed: "Contact held",
  contact_permission_missing: "Contact permission needs review", lead_unassigned: "No assigned owner",
};

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
    queue_unavailable: "The queue could not be read completely. No action was changed; open the request to review current information.",
  };
  return value ? messages[value] || value.replaceAll("_", " ") : null;
}

function ActionCard({ item, canReview }: { item: AdminTodayAction; canReview: boolean }) {
  const urgent = ["unassigned_exception", "hot", "overdue_sla"].includes(item.priorityBucket);
  return (
    <article className={`rounded-xl border bg-[linear-gradient(145deg,rgba(15,15,15,.98),rgba(5,5,5,.98))] p-4 shadow-[0_22px_70px_rgba(0,0,0,.24)] sm:p-5 ${urgent ? "border-[#cda24a44]" : "border-white/10"}`}>
      <div className="flex min-w-0 flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div className="w-full min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Pill tone={item.priorityBucket === "unassigned_exception" || item.priorityBucket === "overdue_sla" ? "ruby" : item.priorityBucket === "hot" ? "gold" : "cyan"}>
              {priorityLabels[item.priorityBucket]}
            </Pill>
            {item.blockers.map((blocker) => <Pill key={blocker} tone="ruby">{blockerLabels[blocker]}</Pill>)}
          </div>
          <h3 className="mt-3 break-words font-serif text-2xl text-[#f7ecd5] [overflow-wrap:anywhere]">
            {item.leadLabel}
          </h3>
          <p className="mt-2 break-words text-sm text-[#c9bfad]">{item.requestContext || "Saved request"} · Received {date(item.receivedAt || null, item.timezone)}</p>
          <p className="mt-2 text-sm text-cyan-100">{item.ownership === "inherited" ? "Inherited owner · repeat inquiry" : item.assignedAgentId ? "Directly assigned" : "No assigned owner"}{item.readOnly ? " · Read-only access" : ""}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c9bfad]">{item.recommendedAction}</p>
        </div>
        <Link href={`/admin/leads/${item.leadId}`} className="inline-flex min-h-11 max-w-full items-center self-start rounded-md border border-[#cda24a66] bg-[#cda24a16] px-4 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#f7ecd5] outline-none hover:bg-[#cda24a24] focus-visible:ring-2 focus-visible:ring-cyan-300">
          Open request
        </Link>
      </div>
      <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
        <div><dt className="uppercase tracking-[.13em] text-[#827a6e]">Why now</dt><dd className="mt-1 text-[#d8ceba]">{item.reasonCodes.map((reason) => reason.replaceAll("_", " ")).join(" · ")}</dd></div>
        <div><dt className="uppercase tracking-[.13em] text-[#827a6e]">Due</dt><dd className="mt-1 text-[#d8ceba]">{date(item.dueAt, item.timezone)}</dd></div>
        <div><dt className="uppercase tracking-[.13em] text-[#a9a092]">Access</dt><dd className="mt-1 text-[#d8ceba]">{item.readOnly ? "View this inquiry. Inherited ownership does not permit changes or contact." : "Actions remain subject to current permissions and contact safeguards."}</dd></div>
      </dl>
      <details className="mt-3 break-words text-xs text-[#a9a092] [overflow-wrap:anywhere]"><summary className="min-h-11 cursor-pointer py-3">Supporting references</summary><p>{item.evidenceReferences.join(" · ")}</p></details>
      {canReview && !item.readOnly ? (
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
  const readable = queue.configured && !queue.error;
  const limited = queue.coverage?.state === "limited";
  const complete = readable && !limited;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-[#f7ecd5] [overflow-wrap:anywhere] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="relative min-w-0 rounded-2xl border border-[#cda24a33] bg-[radial-gradient(circle_at_85%_0%,rgba(16,156,181,.16),transparent_34%),linear-gradient(135deg,#12100c,#050505_62%)] p-4 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#f0cf7a]">Ask Magic Mike · Agent Command Center</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Your next step.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c9bfad]">Open a request to review its details, contact safeguards and next step.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Today queue summary">
            {Object.entries(queue.counts).map(([bucket, count]) => (
              <div key={bucket} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#a9a092]">{priorityLabels[bucket]}</p>
                <p className="mt-2 font-serif text-2xl">{readable ? count : "—"}</p>
              </div>
            ))}
          </div>
        </header>

        {notice ? <p role="status" className="mt-4 rounded-md border border-cyan-300/25 bg-cyan-300/[.08] p-3 text-sm text-cyan-100">{notice}</p> : null}
        {queue.error ? <p role="alert" className="mt-4 rounded-md border border-[#b7374d66] bg-[#3a0b14] p-3 text-sm text-[#ffb1bd]">{queue.error}</p> : null}
        <p role="status" className="mt-4 text-sm leading-6 text-[#c9bfad]">
          {!readable ? "Queue unavailable. No measured counts are available; this does not mean there is no work."
            : limited ? `Limited results: ${queue.coverage?.leadCount} recent authorized open requests. The ${queue.coverage?.limitedBy.join(", ")} query reached its limit; counts describe returned actions only. Open a request for current details. Queue changes are held.`
            : `Read completed for ${queue.coverage?.leadCount ?? "the returned"} authorized open requests (maximum 1,000 recent requests). Counts are actions, not unique inquiries. Test records are excluded; completed or dismissed work is not shown.`}
        </p>

        <section className="mt-7" aria-labelledby="today-work-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#f0cf7a]">Priority work</p><h2 id="today-work-heading" className="mt-2 font-serif text-3xl">Your ordered queue</h2></div>
            <p className="text-xs text-[#827a6e]">Generated {date(queue.generatedAt, queue.timezone)} · {queue.timezone}</p>
          </div>
          <div className="space-y-4">
            {queue.items.length ? queue.items.map((item) => (
              <ActionCard key={item.id} item={item} canReview={Boolean(complete && principal && hasLeadCenterPermission(principal.role, item.requiredPermission))} />
            )) : (
              <div className="rounded-xl border border-white/10 bg-[#0b0b0b] p-7"><h3 className="font-serif text-3xl">{!readable ? "Queue unavailable" : limited ? "No actions in limited results" : "No open actions returned"}</h3><p className="mt-3 text-sm text-[#c9bfad]">{!readable ? "Open Lead Center to review requests. A failed or unconfigured read is not a clear queue." : limited ? "This bounded read cannot establish that all work is complete." : "No open actions were returned within this authorized scope."}</p><Link href="/admin/leads" className="mt-4 inline-flex min-h-11 items-center underline focus-visible:ring-2 focus-visible:ring-cyan-300">Open Lead Center</Link></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
