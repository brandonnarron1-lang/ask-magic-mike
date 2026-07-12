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
import type {
  AdminAppointmentRow,
  AdminFollowupTaskRow,
  AppointmentStatus,
} from "../../../lib/adminAppointmentFollowupOps";
import {
  createAppointmentAction,
  createFollowupTaskAction,
  transitionAppointmentAction,
  updateFollowupTaskAction,
  updateLeadStatusAction,
} from "../actions";

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

function statusActionMessage(code: string) {
  if (code === "lifecycle_updated_audit_failed") {
    return "Lifecycle updated, but the audit event could not be recorded.";
  }
  if (code === "invalid_terminal_reason") {
    return "Choose the required reason for that terminal lifecycle action.";
  }
  if (code === "updated") return "Lifecycle updated.";
  return code.replaceAll("_", " ");
}

function operationMessage(code: string) {
  const labels: Record<string, string> = {
    updated: "Operation updated.",
    appointment_created_audit_failed: "Appointment updated, but the audit event could not be recorded.",
    appointment_updated_audit_failed: "Appointment updated, but the audit event could not be recorded.",
    appointment_status_already_current: "Appointment already has that status.",
    followup_status_already_current: "Follow-up already has that status.",
    duplicate_active_appointment: "This lead already has an active appointment.",
    appointment_start_required: "A scheduled, confirmed, or completed appointment needs a start time.",
    appointment_end_before_start: "Appointment end time must be after the start time.",
    invalid_timezone: "Choose a valid timezone.",
  };
  return labels[code] || code.replaceAll("_", " ");
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

function AppointmentCreateForm({ leadId }: { leadId: string }) {
  return (
    <form action={createAppointmentAction} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Status
          <select name="status" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]">
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Timezone
          <input name="timezone" defaultValue="America/New_York" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Starts
          <input name="starts_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Ends
          <input name="ends_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Location type
          <select name="location_type" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]">
            <option value="office">Office</option>
            <option value="property">Property</option>
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Safe location label
          <input name="location_label" maxLength={120} className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
      </div>
      <button type="submit" className="mt-3 rounded-md border border-[#cda24a33] bg-[#cda24a14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
        Create appointment
      </button>
    </form>
  );
}

function appointmentNextStatuses(status: AppointmentStatus): AppointmentStatus[] {
  const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    requested: ["scheduled", "canceled"],
    scheduled: ["confirmed", "canceled", "reschedule_requested"],
    confirmed: ["completed", "no_show", "canceled", "reschedule_requested"],
    completed: [],
    canceled: ["reschedule_requested"],
    no_show: ["reschedule_requested"],
    reschedule_requested: ["scheduled", "canceled"],
  };
  return transitions[status] || [];
}

function AppointmentCard({ leadId, appointment }: { leadId: string; appointment: AdminAppointmentRow }) {
  return (
    <article className="rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">{appointment.status.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-[#8f8778]">
            {appointment.starts_at ? shortDate(appointment.starts_at) : "No scheduled time"} · {appointment.timezone}
          </p>
        </div>
        <Badge tone={appointment.status === "completed" ? "cyan" : appointment.status === "canceled" || appointment.status === "no_show" ? "ruby" : "gold"}>
          {appointment.location_type}
        </Badge>
      </div>
      {appointment.location_label ? <p className="mt-3 text-xs text-[#d9ceb8]">{appointment.location_label}</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {appointmentNextStatuses(appointment.status).map((status) => (
          <form key={status} action={transitionAppointmentAction} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
            {status === "scheduled" ? (
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
                Starts
                <input required name="starts_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
              </label>
            ) : null}
            {status === "canceled" ? (
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
                Cancellation reason
                <input name="cancellation_reason" maxLength={120} className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
              </label>
            ) : null}
            <button className="w-full rounded-md border border-[#cda24a33] bg-[#cda24a14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
              Mark {status.replaceAll("_", " ")}
            </button>
          </form>
        ))}
      </div>
    </article>
  );
}

function AppointmentPanel({ leadId, appointments }: { leadId: string; appointments: AdminAppointmentRow[] }) {
  return (
    <Panel title="Appointment operations">
      <div className="space-y-3">
        {appointments.length ? appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} leadId={leadId} appointment={appointment} />
        )) : (
          <p className="text-sm text-[#8f8778]">No appointment record yet.</p>
        )}
        <AppointmentCreateForm leadId={leadId} />
      </div>
    </Panel>
  );
}

function FollowupCreateForm({ leadId }: { leadId: string }) {
  return (
    <form action={createFollowupTaskAction} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Type
          <select name="task_type" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]">
            <option value="first_contact">First contact</option>
            <option value="qualification_followup">Qualification follow-up</option>
            <option value="appointment_confirmation">Appointment confirmation</option>
            <option value="appointment_followup">Appointment follow-up</option>
            <option value="document_followup">Document follow-up</option>
            <option value="nurture_check_in">Nurture check-in</option>
            <option value="manual_callback">Manual callback</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Priority
          <select name="priority" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Due
          <input required name="due_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Safe note
          <input name="note" maxLength={160} className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
        </label>
      </div>
      <button className="mt-3 rounded-md border border-[#cda24a33] bg-[#cda24a14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
        Add follow-up
      </button>
    </form>
  );
}

function FollowupTaskCard({ leadId, task }: { leadId: string; task: AdminFollowupTaskRow }) {
  return (
    <article className="rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">{task.title}</p>
          <p className="mt-1 text-xs text-[#8f8778]">{task.due_at ? `Due ${shortDate(task.due_at)}` : "No due date"} · {task.priority}</p>
        </div>
        <Badge tone={task.status === "done" ? "cyan" : task.status === "cancelled" ? "ruby" : "gold"}>{task.status}</Badge>
      </div>
      {task.status === "open" || task.status === "in_progress" ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(["complete", "cancel"] as const).map((action) => (
            <form key={action} action={updateFollowupTaskAction}>
              <input type="hidden" name="lead_id" value={leadId} />
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="task_action" value={action} />
              <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
              <button className="w-full rounded-md border border-[#cda24a33] bg-[#cda24a14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
                {action}
              </button>
            </form>
          ))}
          <form action={updateFollowupTaskAction}>
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="task_action" value="reschedule" />
            <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
            <input aria-label="New follow-up due time" required name="due_at" type="datetime-local" className="mb-2 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
            <button className="w-full rounded-md border border-[#cda24a33] bg-[#cda24a14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f4ead4]">
              Reschedule
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function FollowupPanel({ leadId, tasks }: { leadId: string; tasks: AdminFollowupTaskRow[] }) {
  return (
    <Panel title="Follow-up tasks">
      <div className="space-y-3">
        {tasks.length ? tasks.map((task) => (
          <FollowupTaskCard key={task.id} leadId={leadId} task={task} />
        )) : (
          <p className="text-sm text-[#8f8778]">No follow-up tasks yet.</p>
        )}
        <FollowupCreateForm leadId={leadId} />
      </div>
    </Panel>
  );
}

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status_action?: string; appointment_action?: string; followup_action?: string }>;
}) {
  const { id } = await params;
  const emptyQuery: { status_action?: string; appointment_action?: string; followup_action?: string } = {};
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
              <Link href="/admin/action-queue" className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]">
                Action queue
              </Link>
            </nav>
          </div>
          <div className="mt-4 space-y-2">
            {query.status_action ? (
              <p className="rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
                Lifecycle result: {statusActionMessage(query.status_action)}
              </p>
            ) : null}
            {query.appointment_action ? (
              <p className="rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
                Appointment result: {operationMessage(query.appointment_action)}
              </p>
            ) : null}
            {query.followup_action ? (
              <p className="rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
                Follow-up result: {operationMessage(query.followup_action)}
              </p>
            ) : null}
          </div>
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

              <AppointmentPanel leadId={lead.id} appointments={detail.appointments} />

              <FollowupPanel leadId={lead.id} tasks={detail.followupTasks} />

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
