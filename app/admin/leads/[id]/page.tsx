import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadAdminLeadDetail,
  type AdminLeadOutcomeRow,
} from "../../../lib/adminLeadView";
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
import { requireLeadCenterLeadPermission } from "../../../../src/lib/admin/rbac-session";
import { hasLeadCenterPermission } from "../../../../src/lib/admin/rbac-policy";
import { Phase6CopilotPanel } from "../../../../src/components/admin/phase6-copilot-panel";
import { Phase7MessagingControlPanel } from "../../../../src/components/admin/phase7-messaging-control-panel";
import { LeadQuickOverview } from "../../../components/admin/LeadQuickOverview";
import { isTerminalContactRecord } from "../../../lib/manualContactReview";
import { isPreviewRuntime } from "../../../../src/lib/preview-security";
import { ConversionMutationForm } from "../../../components/admin/ConversionMutationForm";
import { presentLead, leadSubtype } from "../../../lib/leadPresentation";
import { leadPageHeading, leadRequestLabel, leadSourceLabel, leadTimelineLabel } from "../../../lib/leadReadability";
import { LeadEvidenceWorkspace } from "../../../components/admin/LeadEvidenceWorkspace";
import {
  createAppointmentAction,
  createFollowupTaskAction,
  recordFirstHumanResponseAction,
  recordHumanFollowthroughAction,
  transitionAppointmentAction,
  updateFollowupTaskAction,
  updateLeadStatusAction,
} from "../actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortDate(value: string | null, timezone = "America/New_York") {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timezone ? { timeZone: timezone, timeZoneName: "short" as const } : {}),
  }).format(date);
}

function statusActionMessage(code: string) {
  if (code === "lifecycle_updated_audit_failed") {
    return "Lifecycle updated, but the audit event could not be recorded.";
  }
  if (code === "invalid_terminal_reason") {
    return "Choose the required reason for that terminal lifecycle action.";
  }
  if (code === "invalid_outcome_amount") {
    return "Enter actual brokerage revenue as a positive dollar amount with no more than two decimal places.";
  }
  if (code === "revenue_permission_required") {
    return "Your role can update the lifecycle, but only an approved lead owner or administrator can record revenue.";
  }
  if (code === "outcome_revenue_updated") {
    return "Closed brokerage revenue updated without duplicating the lifecycle or outcome record.";
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

function responseActionMessage(code: string) {
  const labels: Record<string, string> = {
    recorded: "First human response recorded with immutable audit evidence.",
    first_response_already_recorded: "The first human response was already recorded; no duplicate was created.",
    confirmation_required: "Confirm that an actual one-to-one human follow-up occurred before recording the milestone.",
    invalid_response_time: "The response time was rejected because it falls outside the lead lifecycle.",
    first_response_record_failed: "The first response could not be recorded. No partial success was reported.",
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

function Panel({ title, children, collapsed = true }: { title: string; children: ReactNode; collapsed?: boolean }) {
  if (collapsed) return <details className="min-w-0 rounded-lg border border-white/10 bg-[#0b0b0b] px-4 sm:px-5">
    <summary className="cursor-pointer py-4 text-sm font-semibold text-[#e2c06f] focus-visible:outline-2 focus-visible:outline-cyan-300">{title}</summary><div className="min-w-0 pb-5">{children}</div>
  </details>;
  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-[#0b0b0b] p-4 sm:p-5">
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
  canRecordRevenue,
}: {
  leadId: string;
  currentStatus: string;
  status: AdminLeadStatus;
  label: string;
  intent: "standard" | "caution";
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  reasonSet?: "lost" | "disqualified";
  canRecordRevenue: boolean;
}) {
  if (currentStatus === status) return null;
  const buttonClass =
    intent === "caution"
      ? "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7] hover:border-[#d66b6b]"
      : "border-[#cda24a33] bg-[#cda24a14] text-[#f4ead4] hover:border-[#cda24a]";

  return (
    <ConversionMutationForm action={updateLeadStatusAction} submitLabel={label} successMessage="Lifecycle saved. No message sent." confirmationLabel={requiresConfirmation ? confirmationLabel : undefined} className={`rounded-md border p-3 ${buttonClass}`}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
      {reasonSet ? <ReasonSelect set={reasonSet} /> : null}
      {status === "converted" && canRecordRevenue ? (
        <label className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Attributed revenue (optional)
          <input
            name="outcome_amount_usd"
            inputMode="decimal"
            pattern="\d{1,8}(?:\.\d{1,2})?"
            placeholder="Actual brokerage revenue"
            className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]"
          />
          <span className="mt-1 block normal-case tracking-normal text-[#8f8778]">
            Brokerage revenue only—not sale price or estimated value.
          </span>
        </label>
      ) : null}
    </ConversionMutationForm>
  );
}

function Timeline({
  events,
  leadId,
  offset,
  limit,
  hasMore,
  complete,
  incompleteSources,
}: {
  events: AdminLeadTimelineEvent[];
  leadId: string;
  offset: number;
  limit: number;
  hasMore: boolean;
  complete: boolean;
  incompleteSources: string[];
}) {
  if (!events.length) {
    return <p className="text-sm text-[#8f8778]">No activity events returned.</p>;
  }
  return (
    <div>
      {!complete ? (
        <p role="status" className="mb-4 rounded-md border border-amber-300/25 bg-amber-300/[.07] p-3 text-sm text-amber-100">
          History is incomplete. Unavailable sources: {incompleteSources.join(", ")}.
        </p>
      ) : null}
      <ol className="space-y-3" aria-label="Lead activity timeline">
        {events.map((event) => (
          <li key={event.id} className="rounded-md border border-white/10 bg-[#080808] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#f4ead4]">{event.summary}</p>
              <p className="mt-1 text-xs text-[#8f8778]">{event.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={event.type === "notification" ? "cyan" : "gold"}>{event.type}</Badge>
              <Badge>{shortDate(event.occurred_at)}</Badge>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#8f8778]">
            Actor: {event.actor} · Source: {event.source_type}{event.snapshot ? " (current-state snapshot)" : ""}
          </p>
        </li>
        ))}
      </ol>
      {offset > 0 || hasMore ? (
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Activity history pages">
          {offset > 0 ? (
            <Link href={`/admin/leads/${leadId}?timeline_offset=${Math.max(0, offset - limit)}#activity`} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-[#d9ceb8]">
              Newer activity
            </Link>
          ) : null}
          {hasMore ? (
            <Link href={`/admin/leads/${leadId}?timeline_offset=${offset + limit}#activity`} className="rounded-md border border-[#cda24a55] bg-[#cda24a12] px-3 py-2 text-xs font-semibold text-[#f4ead4]">
              Older activity
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

function AppointmentCreateForm({ leadId }: { leadId: string }) {
  return (
    <ConversionMutationForm action={createAppointmentAction} submitLabel="Create appointment record" successMessage="Appointment record saved. No calendar event or invitation created." confirmationLabel="Confirm this appointment request or agreed schedule is real. This saves an internal record only." className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
      <p className="text-sm leading-6 text-[#d9ceb8]">Requested can have no scheduled time. Scheduled requires both start and end, with a duration of at most eight hours.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Status
          <select name="status" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]">
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
          Appointment timezone (starts and ends)
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
    </ConversionMutationForm>
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

function AppointmentCard({ leadId, appointment, canUpdate }: { leadId: string; appointment: AdminAppointmentRow; canUpdate: boolean }) {
  return (
    <article className="rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">{appointment.status.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-[#8f8778]">
            {appointment.starts_at ? shortDate(appointment.starts_at, appointment.timezone) : "No scheduled time"} · {appointment.timezone}
          </p>
        </div>
        <Badge tone={appointment.status === "completed" ? "cyan" : appointment.status === "canceled" || appointment.status === "no_show" ? "ruby" : "gold"}>
          {appointment.location_type}
        </Badge>
      </div>
      {appointment.location_label ? <p className="mt-3 text-xs text-[#d9ceb8]">{appointment.location_label}</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(canUpdate ? appointmentNextStatuses(appointment.status) : []).map((status) => (
          <ConversionMutationForm key={status} action={transitionAppointmentAction} submitLabel={`Mark ${status.replaceAll("_", " ")}`} successMessage={`Appointment marked ${status.replaceAll("_", " ")}. No calendar update or invitation sent.`} confirmationLabel={status === "completed" ? "Confirm this appointment actually took place. Task completion alone does not count." : status === "no_show" ? "Confirm the appointment time passed and the person did not attend." : status === "confirmed" ? "Confirm the person actually agreed to this appointment." : `Confirm the actual appointment change to ${status.replaceAll("_", " ")}.`} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <input type="hidden" name="record_version" value={appointment.updated_at || ""} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="timezone" value={appointment.timezone} />
            <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
            {status === "scheduled" ? (
              <div className="space-y-3"><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
                Starts ({appointment.timezone})
                <input required name="starts_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
              </label><label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">Ends ({appointment.timezone})<input required name="ends_at" type="datetime-local" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" /></label><p className="text-xs leading-5 text-[#b9b09f]">End must follow start; at most eight hours.</p></div>
            ) : null}
            {status === "canceled" ? (
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
                Cancellation reason
                <input name="cancellation_reason" maxLength={120} className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
              </label>
            ) : null}
          </ConversionMutationForm>
        ))}
      </div>
    </article>
  );
}

function AppointmentPanel({ leadId, appointments, canUpdate, canCreate = canUpdate }: { leadId: string; appointments: AdminAppointmentRow[]; canUpdate: boolean; canCreate?: boolean }) {
  return (
    <Panel title="Appointment operations">
      <div className="space-y-3">
        <p className="text-sm leading-6 text-[#d9ceb8]">Internal appointment records only. No calendar availability is checked, no external calendar event is created, and no invitation is sent.</p>
        {appointments.length ? appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} leadId={leadId} appointment={appointment} canUpdate={canUpdate} />
        )) : (
          <p className="text-sm text-[#8f8778]">No appointment record yet.</p>
        )}
        {canCreate && !appointments.some((appointment) => ["requested", "scheduled", "confirmed", "reschedule_requested"].includes(appointment.status)) ? <AppointmentCreateForm leadId={leadId} /> : null}
      </div>
    </Panel>
  );
}

function FollowupCreateForm({ leadId }: { leadId: string }) {
  return (
    <ConversionMutationForm action={createFollowupTaskAction} submitLabel="Add follow-up" successMessage="Follow-up task saved. No contact attempted and no first human response inferred." newActionLabel="Start a separate follow-up" className="rounded-md border border-white/10 bg-white/[0.03] p-4">
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
          Due timezone
          <input required name="timezone" defaultValue="America/New_York" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
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
    </ConversionMutationForm>
  );
}

function FollowupTaskCard({ leadId, task, canManage }: { leadId: string; task: AdminFollowupTaskRow; canManage: boolean }) {
  return (
    <article className="rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#f4ead4]">{task.title}</p>
          <p className="mt-1 text-xs text-[#8f8778]">{task.due_at ? `Due ${shortDate(task.due_at)}` : "No due date"} · {task.priority}</p>
        </div>
        <Badge tone={task.status === "done" ? "cyan" : task.status === "cancelled" ? "ruby" : "gold"}>{task.status}</Badge>
      </div>
      {canManage && (task.status === "open" || task.status === "in_progress") ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["complete", "cancel"] as const).map((action) => (
            <ConversionMutationForm key={action} action={updateFollowupTaskAction} submitLabel={action === "complete" ? "Complete task" : "Cancel task"} successMessage={action === "complete" ? "Task completed. First human response was not inferred." : "Task canceled. No message sent."}>
              <input type="hidden" name="lead_id" value={leadId} />
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="record_version" value={task.updated_at || ""} />
              <input type="hidden" name="task_action" value={action} />
              <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
            </ConversionMutationForm>
          ))}
          <ConversionMutationForm action={updateFollowupTaskAction} submitLabel="Reschedule follow-up" successMessage="Follow-up due time saved. No human response inferred." className="sm:col-span-2">
            <input type="hidden" name="lead_id" value={leadId} />
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="record_version" value={task.updated_at || ""} />
            <input type="hidden" name="task_action" value="reschedule" />
            <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
            <input aria-label="New follow-up due time" required name="due_at" type="datetime-local" className="mb-2 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-xs text-[#f4ead4]" />
            <label className="block text-xs text-[#d9ceb8]">New due timezone<input required name="timezone" defaultValue="America/New_York" className="mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-2 py-2 text-sm text-[#f4ead4]" /></label>
          </ConversionMutationForm>
        </div>
      ) : null}
    </article>
  );
}

function FollowupPanel({ leadId, tasks, canManage }: { leadId: string; tasks: AdminFollowupTaskRow[]; canManage: boolean }) {
  return (
    <Panel title="Follow-up tasks">
      <div className="space-y-3">
        <p className="text-sm leading-6 text-[#d9ceb8]">A task is a reminder, not contact evidence. Completing one never records first human response.</p>
        {tasks.length ? tasks.map((task) => (
          <FollowupTaskCard key={task.id} leadId={leadId} task={task} canManage={canManage} />
        )) : (
          <p className="text-sm text-[#8f8778]">No follow-up tasks yet.</p>
        )}
        {canManage ? <FollowupCreateForm leadId={leadId} /> : null}
      </div>
    </Panel>
  );
}

function ManualHumanFollowthroughForm({ leadId }: { leadId: string }) {
  const fieldClass = "mt-1 w-full rounded-md border border-[#cda24a33] bg-[#050505] px-3 py-2 text-sm text-[#f4ead4]";
  return (
    <Panel title="Log manual interaction + next task">
      <ConversionMutationForm action={recordHumanFollowthroughAction} submitLabel="Save interaction and next task" successMessage="Manual interaction and next task saved together. No message sent. A confirmed two-way conversation records first-response evidence atomically, without overwriting existing evidence." confirmationLabel="Confirm this manual interaction actually occurred and the next task reflects the agreed follow-through." newActionLabel="Log a separate interaction" className="rounded-md border border-white/10 bg-white/[0.03] p-4">
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
        <p className="text-sm leading-6 text-[#d9ceb8]">Operator-entered evidence, not a provider delivery receipt. The interaction and next reminder save together or neither saves. This form never calls, emails, sends a message, or books a calendar event.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[#d9ceb8]">Actual channel
            <select name="channel" required className={fieldClass}>
              <option value="phone">Phone</option><option value="email">Email</option><option value="in_person">In person</option><option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm text-[#d9ceb8]">Actual result
            <select name="interaction_result" required className={fieldClass}>
              <option value="attempted">Attempted — no conversation established</option><option value="no_answer">No answer</option><option value="two_way_conversation">Two-way conversation</option>
            </select>
          </label>
          <label className="text-sm text-[#d9ceb8]">Next task
            <select name="task_type" required className={fieldClass}>
              <option value="manual_callback">Manual callback</option><option value="qualification_followup">Qualification follow-up</option><option value="appointment_confirmation">Appointment confirmation</option><option value="appointment_followup">Appointment follow-up</option><option value="document_followup">Document follow-up</option><option value="nurture_check_in">Nurture check-in</option><option value="first_contact">First contact</option>
            </select>
          </label>
          <label className="text-sm text-[#d9ceb8]">Next task due
            <input name="due_at" type="datetime-local" required className={fieldClass} />
          </label>
          <label className="text-sm text-[#d9ceb8]">Due timezone
            <input name="timezone" required defaultValue="America/New_York" className={fieldClass} />
          </label>
          <label className="text-sm text-[#d9ceb8]">Safe interaction note
            <textarea name="note" required maxLength={160} rows={3} className={fieldClass} />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm leading-6 text-[#d9ceb8]">
          <input name="confirm_first_response" type="checkbox" value="yes" className="w-5 shrink-0 accent-[#cda24a]" />
          <span>Required for a two-way conversation: I confirm a real two-way conversation occurred now. Do not select for attempted contact or no answer. First-response evidence saves together with the next task and existing evidence is never overwritten.</span>
        </label>
      </ConversionMutationForm>
    </Panel>
  );
}

function money(value: number | null) {
  if (value === null) return "Not recorded";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function OutcomePanel({
  outcomes,
  canViewRevenue,
  leadId,
  leadStatus,
}: {
  outcomes: AdminLeadOutcomeRow[];
  canViewRevenue: boolean;
  leadId: string;
  leadStatus: string;
}) {
  return (
    <Panel title="Outcome ledger">
      {outcomes.length ? (
        <div className="space-y-3">
          {outcomes.map((outcome) => (
            <article key={outcome.id} className="rounded-md border border-white/10 bg-[#080808] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold capitalize text-[#f4ead4]">
                    {outcome.outcome_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-[#8f8778]">{shortDate(outcome.occurred_at)}</p>
                </div>
                {canViewRevenue && outcome.outcome_type === "closed" ? (
                  <Badge tone="cyan">{money(outcome.amount_usd)}</Badge>
                ) : (
                  <Badge>Recorded</Badge>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8f8778]">
          No canonical business outcome has been recorded yet.
        </p>
      )}
      {canViewRevenue && leadStatus === "converted" ? (
        <ConversionMutationForm action={updateLeadStatusAction} submitLabel="Update closed revenue" successMessage="Actual closed brokerage revenue saved." confirmationLabel="Confirm this is actual brokerage revenue, not sale price, list price, or estimated value." className="mt-4 rounded-md border border-cyan-400/20 bg-cyan-400/[.06] p-4">
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="status" value="converted" />
          <input type="hidden" name="return_to" value={`/admin/leads/${leadId}`} />
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Update actual closed brokerage revenue
            <input
              required
              name="outcome_amount_usd"
              inputMode="decimal"
              pattern="\d{1,8}(?:\.\d{1,2})?"
              placeholder="Actual brokerage revenue"
              className="mt-2 w-full rounded-md border border-cyan-400/25 bg-[#050505] px-3 py-2 text-sm text-[#f4ead4]"
            />
          </label>
        </ConversionMutationForm>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-[#8f8778]">
        Qualified, appointment-set, and terminal lifecycle actions write this ledger idempotently.
        Revenue is restricted to approved roles and must be actual brokerage revenue.
      </p>
    </Panel>
  );
}

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status_action?: string; appointment_action?: string; followup_action?: string; response_action?: string; timeline_offset?: string }>;
}) {
  const { id } = await params;
  const principal = await requireLeadCenterLeadPermission(id, "lead:view_assigned");
  const canRecordRevenue = Boolean(
    principal && hasLeadCenterPermission(principal.role, "lead:record_revenue"),
  );
  const canUpdateLead = Boolean(
    principal && hasLeadCenterPermission(principal.role, "lead:update_assigned"),
  );
  const canManageTasks = Boolean(principal && hasLeadCenterPermission(principal.role, "task:manage_assigned"));
  const emptyQuery: { status_action?: string; appointment_action?: string; followup_action?: string; response_action?: string; timeline_offset?: string } = {};
  const query = searchParams ? await searchParams : emptyQuery;
  const parsedOffset = Number.parseInt(query.timeline_offset || "0", 10);
  const timelineOffset = Number.isFinite(parsedOffset) ? Math.max(0, Math.min(parsedOffset, 1_000)) : 0;
  const detail = await loadAdminLeadDetail(id, principal, { offset: timelineOffset, limit: 30 });
  if (detail.configured && !detail.lead && detail.error === "lead_not_found") notFound();
  const lead = detail.lead;
  const contactBlocked = Boolean(lead && (lead.is_test || lead.communication_suppressed || isTerminalContactRecord(lead.status, lead.conversion_stage)));
  // Contact holds are not a new prohibition on maintaining existing internal
  // records. Preserve canonical task/appointment transitions on closed leads.
  const canMaintainRecords = Boolean(lead && canUpdateLead && !lead.is_test && !lead.communication_suppressed);
  const canFollowThrough = canUpdateLead && !contactBlocked;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-5 text-[#f4ead4] [overflow-wrap:anywhere]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 border-b border-[#cda24a33] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">Lead Center</p>
              <h1 className="mt-2 break-words text-2xl font-semibold">{leadPageHeading(lead?.name, lead?.is_test)}</h1>
            </div>
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
            {query.response_action ? (
              <p className="rounded-md border border-cyan-400/25 bg-cyan-400/[.08] p-3 text-sm text-cyan-100">
                Response result: {responseActionMessage(query.response_action)}
              </p>
            ) : null}
          </div>
        </header>

        {!lead ? (
          <Panel title="Lead detail status" collapsed={false}>
            <p className="text-sm text-[#d9ceb8]">
              {detail.error || "The canonical Neon database is not configured in this environment."}
            </p>
          </Panel>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="min-w-0 space-y-5">
              {principal ? <LeadQuickOverview view={presentLead({ lead, principal, tier: "assigned", evidence: {appointments:detail.appointments,followupTasks:detail.followupTasks,outcomes:detail.outcomes} })} leadId={lead.id} receivedAt={lead.created_at} request={leadRequestLabel(lead.funnel_type)} blocked={contactBlocked} canReview={canUpdateLead && !isPreviewRuntime()} status={lead.status}/> : null}
              {(["seller","cash_seller","investor_buyer"] as string[]).includes(leadSubtype(lead)) ? <LeadEvidenceWorkspace leadId={lead.id} kind={leadSubtype(lead) as "seller"|"cash_seller"|"investor_buyer"} allowed={canUpdateLead&&!lead.is_test&&!lead.communication_suppressed}/> : null}
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
                  <Field
                    label="First human response"
                    value={detail.firstResponse
                      ? `${shortDate(detail.firstResponse.first_human_response_at)} · ${detail.firstResponse.response_minutes} min`
                      : "Not yet measured"}
                  />
                  <Field label="Follow-up" value={shortDate(lead.next_follow_up_at)} />
                  <Field label="Conversion stage" value={lead.conversion_stage || "Not set"} />
                  <Field label="Terminal reason" value={lead.closed_lost_reason || "Not set"} />
                </dl>
              </Panel>

              {!detail.firstResponse && canFollowThrough ? (
                <Panel title="First-response evidence">
                  <ConversionMutationForm action={recordFirstHumanResponseAction} submitLabel="Record first human response" successMessage="First human response evidence saved at server time. No message sent." confirmationLabel="Confirm an actual one-to-one human follow-up occurred now. Completing a task does not establish this." className="rounded-md border border-cyan-400/20 bg-cyan-400/[.06] p-4">
                    <input type="hidden" name="lead_id" value={lead.id} />
                    <input type="hidden" name="return_to" value={`/admin/leads/${lead.id}`} />
                    <p className="text-sm leading-6 text-[#d9ceb8]">
                      Use this only immediately after a real one-to-one human follow-up. It records the current server time once, preserves later lifecycle stages, and never sends a message.
                    </p>
                  </ConversionMutationForm>
                </Panel>
              ) : null}

              <div id="follow-up">{canFollowThrough && canManageTasks ? <ManualHumanFollowthroughForm leadId={lead.id} /> : <FollowupPanel leadId={lead.id} tasks={detail.followupTasks} canManage={canMaintainRecords && canManageTasks}/>}</div>

              <details id="next-action-review" className="min-w-0 rounded-lg border border-white/10 p-4"><summary className="cursor-pointer text-sm font-semibold text-[#e2c06f]">AI draft tools (review required)</summary><div className="mt-4"><Phase6CopilotPanel
                leadId={lead.id}
                isTest={lead.is_test}
                suppressed={lead.communication_suppressed}
                initialDrafts={detail.aiDrafts || []}
              /></div></details>

              <details id="message-review" className="min-w-0 rounded-lg border border-white/10 p-4"><summary className="cursor-pointer text-sm font-semibold text-[#e2c06f]">Communication permissions & advanced messaging</summary><div className="mt-4"><Phase7MessagingControlPanel leadId={lead.id} /></div></details>

              <Panel title="Lifecycle controls">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(canUpdateLead ? ADMIN_LEAD_STATUS_ACTIONS : []).map((action) => (
                    <StatusActionForm
                      key={action.status}
                      leadId={lead.id}
                      currentStatus={lead.status}
                      canRecordRevenue={canRecordRevenue}
                      {...action}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#8f8778]">
                  Server-side transition validation is authoritative. Same-state submissions are idempotent.
                </p>
              </Panel>

              <div id="appointment-review"><AppointmentPanel leadId={lead.id} appointments={detail.appointments} canUpdate={canMaintainRecords} canCreate={canFollowThrough} /></div>

              <OutcomePanel
                outcomes={detail.outcomes}
                canViewRevenue={canRecordRevenue}
                leadId={lead.id}
                leadStatus={lead.status}
              />

              {canFollowThrough ? <FollowupPanel leadId={lead.id} tasks={detail.followupTasks} canManage={canManageTasks} /> : null}

              <div id="activity">
                <Panel title="Unified activity history">
                  <Timeline
                    events={detail.timeline}
                    leadId={lead.id}
                    offset={detail.timelinePage?.offset || 0}
                    limit={detail.timelinePage?.limit || 30}
                    hasMore={detail.timelinePage?.hasMore || false}
                    complete={detail.timelinePage?.complete ?? true}
                    incompleteSources={detail.timelinePage?.incompleteSources || []}
                  />
                </Panel>
              </div>
            </section>

            <aside className="min-w-0 space-y-5">
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

              <div id="contact-review"><Panel title="Operational profile">
                <dl className="grid gap-4">
                  <Field label="Name" value={lead.name || "Not provided"} />
                  <Field label="Contact" value={lead.contact_summary} />
                  <Field label="Funnel" value={leadSourceLabel(lead.funnel_type)} />
                  <Field label="Timeline" value={leadTimelineLabel(lead.timeline || lead.timeline_months)} />
                  <Field label="Grade" value={lead.lead_grade || "Unknown"} />
                  <Field label="Qualification score" value={lead.score == null ? "Not recorded" : `${lead.score}/100`} />
                  <Field label="Assignment" value={lead.assigned_agent_id ? "Assigned — review activity history" : "Unassigned"} />
                </dl>
                {lead.score_reasons?.length ? <details className="mt-4 min-w-0"><summary className="cursor-pointer py-2 text-sm text-[#e2c06f]">Recorded score factors</summary><ul className="mt-2 space-y-2 text-sm text-[#d9ceb8]">{lead.score_reasons.map((reason,index)=><li key={index}>{reason}</li>)}</ul></details> : null}
                <details className="mt-5 min-w-0 rounded-md border border-[#cda24a33] p-3">
                  <summary className="cursor-pointer text-sm text-[#e2c06f]">Technical record details (optional)</summary>
                  <dl className="mt-4 grid min-w-0 gap-4">
                    <Field label="Lead identifier" value={lead.id} />
                    <Field label="Agent identifier" value={lead.assigned_agent_id || "Unassigned"} />
                    <Field label="Original intake text (unaltered)" value={lead.question || "Not recorded"} />
                  </dl>
                </details>
              </Panel></div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
