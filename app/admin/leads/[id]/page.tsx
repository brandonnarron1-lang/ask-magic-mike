import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAdminLeadDetail } from "../../../lib/adminLeadView";
import type { AdminLeadTimelineEvent } from "../../../lib/adminLeadTimeline";
import {
  ADMIN_LEAD_STATUS_ACTIONS,
  DISQUALIFIED_REASONS,
  LOST_REASONS,
  TERMINAL_REASON_LABELS,
  type AdminLeadStatus,
  type LeadTerminalReason,
} from "../../../lib/adminLeadLifecycle";
import { updateLeadStatusAction } from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "ruby" | "cyan" }) {
  const styles = {
    gold: "border-[#cda24a33] bg-[#cda24a14] text-[#e2c06f]",
    ruby: "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7]",
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#f4ead4]">{value}</dd>
    </div>
  );
}

function ReasonSelect({ set }: { set: "lost" | "disqualified" }) {
  const reasons = set === "lost" ? LOST_REASONS : DISQUALIFIED_REASONS;
  return (
    <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
      Reason
      <select
        name="reason"
        className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]"
      >
        {reasons.map((reason) => (
          <option key={reason} value={reason}>
            {TERMINAL_REASON_LABELS[reason as LeadTerminalReason]}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusActionForm({
  leadId,
  currentStatus,
  status,
  label,
  intent,
  requiresConfirmation,
  confirmationLabel,
  reasonSet,
}: {
  leadId: string;
  currentStatus: string;
  status: AdminLeadStatus;
  label: string;
  intent: "standard" | "caution";
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  reasonSet?: "lost" | "disqualified";
}) {
  if (currentStatus === status) return null;
  const buttonClass =
    intent === "caution"
      ? "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7] hover:border-[#d66b6b]"
      : "border-[#cda24a33] bg-[#cda24a14] text-[#f4ead4] hover:border-[#cda24a]";

  return (
    <form action={updateLeadStatusAction} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
      {reasonSet ? <ReasonSelect set={reasonSet} /> : null}
      {requiresConfirmation ? (
        <label className="mt-2 flex items-start gap-2 text-[11px] leading-4 text-[#d9ceb8]">
          <input required type="checkbox" name="confirm" value="yes" className="mt-0.5" aria-label={confirmationLabel} />
          <span>{confirmationLabel}</span>
        </label>
      ) : null}
      <button
        type="submit"
        className={`mt-3 w-full rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${buttonClass}`}
      >
        {label}
      </button>
    </form>
  );
}

function Timeline({ events }: { events: AdminLeadTimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-[#8f8778]">No activity events returned.</p>;
  }
  return (
    <ol className="space-y-3" aria-label="Lead activity timeline">
      {events.map((event) => (
        <li key={event.id} className="rounded-md border border-white/10 bg-[#080808] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#f4ead4]">{event.label}</p>
              <p className="mt-1 text-xs text-[#8f8778]">{event.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={event.type === "notification" ? "cyan" : "gold"}>{event.type}</Badge>
              <Badge>{shortDate(event.occurred_at)}</Badge>
            </div>
          </div>
          {event.actor ? <p className="mt-3 text-xs text-[#8f8778]">Actor: {event.actor}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status_action?: string }>;
}) {
  const { id } = await params;
  const emptyQuery: { status_action?: string } = {};
  const [detail, query] = await Promise.all([
    loadAdminLeadDetail(id),
    searchParams ? searchParams : Promise.resolve(emptyQuery),
  ]);
  if (detail.configured && !detail.lead && detail.error === "lead_not_found") notFound();
  const lead = detail.lead;

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">AdminOps</p>
              <h1 className="mt-3 font-serif text-4xl">{lead?.primary_detail || "Lead detail"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Validated lifecycle controls, stalled-lead signals, attribution, and unified activity history.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link href="/admin/leads" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Lead inbox
              </Link>
              <Link href="/admin/reporting" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Reporting
              </Link>
            </nav>
          </div>
          {query.status_action ? (
            <p className="mt-4 rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
              Lifecycle result: {query.status_action.replaceAll("_", " ")}
            </p>
          ) : null}
        </header>

        {!lead ? (
          <Panel title="Lead detail status">
            <p className="text-sm text-[#d9ceb8]">
              {detail.error || "Supabase is not configured in this environment."}
            </p>
          </Panel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-5">
              <Panel title="Lead state">
                <div className="flex flex-wrap gap-2">
                  <Badge>{lead.status}</Badge>
                  {lead.assigned_agent_id ? <Badge>Assigned</Badge> : <Badge tone="ruby">Unassigned</Badge>}
                  {lead.stalled_signals.length ? <Badge tone="ruby">Stalled</Badge> : <Badge tone="cyan">On track</Badge>}
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Created" value={shortDate(lead.created_at)} />
                  <Field label="Assigned" value={shortDate(lead.assigned_at)} />
                  <Field label="Last contacted" value={shortDate(lead.last_contacted_at)} />
                  <Field label="Follow-up" value={shortDate(lead.next_follow_up_at)} />
                  <Field label="Conversion stage" value={lead.conversion_stage || "Not set"} />
                  <Field label="Terminal reason" value={lead.closed_lost_reason || "Not set"} />
                </dl>
              </Panel>

              <Panel title="Lifecycle controls">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {ADMIN_LEAD_STATUS_ACTIONS.map((action) => (
                    <StatusActionForm key={action.status} leadId={lead.id} currentStatus={lead.status} {...action} />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#8f8778]">
                  Server-side transition validation is authoritative. Same-state submissions are idempotent.
                </p>
              </Panel>

              <Panel title="Unified activity history">
                <Timeline events={detail.timeline} />
              </Panel>
            </section>

            <aside className="space-y-5">
              <Panel title="Stalled signals">
                {lead.stalled_signals.length ? (
                  <div className="space-y-3">
                    {lead.stalled_signals.map((signal) => (
                      <div key={signal.key} className="rounded-md border border-[#7f1d1d] bg-[#2a0909] p-3">
                        <p className="text-sm font-semibold text-[#ffd7d7]">{signal.label}</p>
                        <p className="mt-1 text-xs text-[#d9ceb8]">
                          {signal.ageHours}h old. Next: {signal.nextAction}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8f8778]">No stalled-lead signals for this lead.</p>
                )}
              </Panel>

              <Panel title="Attribution">
                <dl className="grid gap-4">
                  <Field label="Summary" value={lead.attribution_summary} />
                  <Field label="Source" value={lead.source || "Unknown"} />
                  <Field label="Detail" value={lead.source_detail || "Unknown"} />
                  <Field label="Campaign" value={lead.attribution.campaign || "Unknown"} />
                  <Field label="Surface" value={lead.lead_source_surface} />
                </dl>
              </Panel>

              <Panel title="Operational profile">
                <dl className="grid gap-4">
                  <Field label="Name" value={lead.name || "Not provided"} />
                  <Field label="Contact" value={lead.contact_summary} />
                  <Field label="Funnel" value={lead.funnel_type} />
                  <Field label="Timeline" value={lead.timeline || (lead.timeline_months ?? "Unknown")} />
                  <Field label="Grade" value={lead.lead_grade || "Unknown"} />
                  <Field label="Assigned agent" value={lead.assigned_agent_id || "Unassigned"} />
                </dl>
              </Panel>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
