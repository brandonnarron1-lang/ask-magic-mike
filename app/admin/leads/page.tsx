import type { ReactNode } from "react";
import Link from "next/link";
import { loadAdminLeadInbox, type AdminLeadView } from "../../lib/adminLeadView";
import {
  ADMIN_LEAD_STATUS_ACTIONS,
  type AdminLeadStatus,
} from "../../lib/adminLeadActions";
import {
  DISQUALIFIED_REASONS,
  LOST_REASONS,
  TERMINAL_REASON_LABELS,
  type LeadTerminalReason,
} from "../../lib/adminLeadLifecycle";
import { updateLeadStatusAction } from "./actions";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import {
  ADMIN_LEAD_INBOX_FILTERS,
} from "../../lib/adminLeadInboxFilters";
import { LeadSearchPanel } from "./lead-search-panel";
import { leadOwnership } from "../../lib/leadOwnership";
import { canAccessAssignedLead, hasLeadCenterPermission, type LeadCenterPrincipal } from "../../../src/lib/admin/rbac-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIELD_LABELS: Array<[keyof AdminLeadView["attribution"], string]> = [
  ["source", "Source"],
  ["medium", "Medium"],
  ["campaign", "Campaign"],
  ["placement", "Placement"],
  ["embed_host", "Embed host"],
  ["parent_url", "Parent URL"],
  ["landing_page", "Landing"],
  ["current_path", "Current path"],
  ["device_category", "Device"],
];

function shortDate(value: string | null) {
  if (!value) return "Unknown date";
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#cda24a33] bg-[#cda24a14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">
      {children}
    </span>
  );
}

function StatusActionForm({
  lead,
  status,
  label,
  intent,
  requiresConfirmation,
  confirmationLabel,
  reasonSet,
}: {
  lead: AdminLeadView;
  status: AdminLeadStatus;
  label: string;
  intent: "standard" | "caution";
  requiresConfirmation?: boolean;
  confirmationLabel?: string;
  reasonSet?: "lost" | "disqualified";
}) {
  if (lead.status === status) return null;

  const buttonClass =
    intent === "caution"
      ? "border-[#7f1d1d] bg-[#2a0909] text-[#ffd7d7] hover:border-[#d66b6b]"
      : "border-[#cda24a33] bg-[#cda24a14] text-[#f4ead4] hover:border-[#cda24a]";

  return (
    <form action={updateLeadStatusAction} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <input type="hidden" name="lead_id" value={lead.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return_to" value="/admin/leads" />
      {reasonSet ? <ReasonSelect set={reasonSet} /> : null}
      {requiresConfirmation ? (
        <label className="mb-2 flex items-start gap-2 text-[11px] leading-4 text-[#d9ceb8]">
          <input
            required
            type="checkbox"
            name="confirm"
            value="yes"
            className="mt-0.5"
            aria-label={confirmationLabel}
          />
          <span>{confirmationLabel}</span>
        </label>
      ) : null}
      <button
        type="submit"
        className={`w-full rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${buttonClass}`}
      >
        {label}
      </button>
    </form>
  );
}

function ReasonSelect({ set }: { set: "lost" | "disqualified" }) {
  const reasons = set === "lost" ? LOST_REASONS : DISQUALIFIED_REASONS;
  return (
    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8778]">
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

function LeadStatusActions({ lead }: { lead: AdminLeadView }) {
  return (
    <div className="mt-5 rounded-md border border-white/10 bg-[#080808] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">
          Status actions
        </p>
        <p className="text-xs text-[#8f8778]">Current: {lead.status}</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_LEAD_STATUS_ACTIONS.map((action) => (
          <StatusActionForm key={action.status} lead={lead} {...action} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8f8778]">
        Spam / test lead marks internal QA and non-real submissions without deleting the record.
      </p>
    </div>
  );
}

function EmptyState({ configured, error }: { configured: boolean; error?: string }) {
  return (
    <section className="rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        Lead inbox
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">{error || !configured ? "Inbox unavailable" : "No inquiries in this view"}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
        {configured
          ? error || "No lead rows were returned by the configured lead store."
          : "The canonical Neon database is not configured in this environment, so the protected inbox is empty."}
      </p>
    </section>
  );
}

function LeadCard({ lead, principal }: { lead: AdminLeadView; principal:LeadCenterPrincipal|null }) {
  const visibleAttribution = FIELD_LABELS.map(([key, label]) => ({
    key,
    label,
    value: lead.attribution[key],
  })).filter((item) => item.value);

  return (
    <article className="min-w-0 rounded-2xl border border-[#cda24a33] bg-[#0b0b0b] p-4 [overflow-wrap:anywhere] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
            {lead.funnel_type} / {lead.lead_source_surface}
          </p>
          <Link href={`/admin/leads/${lead.id}`} className="mt-2 block font-serif text-2xl text-[#f4ead4] hover:text-[#e2c06f]">
            {lead.primary_detail}
          </Link>
          <p className="mt-2 text-sm text-[#d9ceb8]">{lead.contact_summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.is_test ? <Badge>Test</Badge> : null}
          {!lead.is_test && lead.communication_suppressed ? <Badge>Suppressed</Badge> : null}
          <Badge>{lead.status}</Badge>
          {lead.stalled_signals.length ? <Badge>Stalled</Badge> : null}
          {lead.routing_ready ? <Badge>Intake fields recorded — not routing eligibility</Badge> : null}
          {lead.assigned_agent_id ? <Badge>Assigned</Badge> : <Badge>Unassigned</Badge>}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Created</dt>
          <dd className="mt-1 text-[#f4ead4]">{shortDate(lead.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Name</dt>
          <dd className="mt-1 text-[#f4ead4]">{lead.name || "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Timeline</dt>
          <dd className="mt-1 text-[#f4ead4]">{lead.timeline || "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[#8f8778]">Agent</dt>
          <dd className="mt-1 text-[#f4ead4]">{leadOwnership(lead).label}</dd>
        </div>
      </dl>

      <Link href={`/admin/leads/${lead.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#d9af52] px-4 py-3 text-sm font-bold text-[#090909] focus-visible:outline-2 focus-visible:outline-cyan-200">Review request &amp; next step</Link>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-[#e2c06f] focus-visible:outline-2 focus-visible:outline-cyan-200">Supporting context &amp; existing internal actions</summary>
      {lead.question || lead.notes || lead.condition ? (
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Question</span>
            {lead.question || "Not provided"}
          </p>
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Condition</span>
            {lead.condition || "Not provided"}
          </p>
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[#d9ceb8]">
            <span className="block text-xs uppercase tracking-[0.14em] text-[#8f8778]">Notes</span>
            {lead.notes || "Not provided"}
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-md border border-[#cda24a24] bg-[#080808] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e2c06f]">
          Attribution
        </p>
        <p className="mt-2 text-sm text-[#d9ceb8]">{lead.attribution_summary}</p>
        {visibleAttribution.length ? (
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {visibleAttribution.map((item) => (
              <div key={item.key}>
                <dt className="uppercase tracking-[0.14em] text-[#8f8778]">{item.label}</dt>
                <dd className="mt-1 break-words text-[#f4ead4]">{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {principal && hasLeadCenterPermission(principal.role,"lead:update_assigned") && canAccessAssignedLead(principal,lead.assigned_agent_id) ? <LeadStatusActions lead={lead}/> : <p className="mt-4 text-sm text-[#d9ceb8]">Read-only ownership scope. Current server permission is required for any change.</p>}
      </details>
    </article>
  );
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; sort?: string; page?: string; status_action?: string }>;
}) {
  const principal = await requireLeadCenterPermission("lead:view_assigned");
  const params = searchParams ? await searchParams : {};
  const activeFilter = ADMIN_LEAD_INBOX_FILTERS.some((item) => item.key === params.filter)
    ? params.filter as "active" | "working" | "qualified" | "closed" | "all"
    : "active";
  const sort = ["newest", "oldest", "priority", "followup"].includes(params.sort || "")
    ? params.sort as "newest" | "oldest" | "priority" | "followup"
    : "newest";
  const requestedPage = Math.max(1, Math.min(Number.parseInt(params.page || "1", 10) || 1, 200));
  const pageSize = 25;
  const inbox = await loadAdminLeadInbox({
    filter: activeFilter,
    sort,
    offset: (requestedPage - 1) * pageSize,
    limit: pageSize,
  }, principal);
  const page = inbox.page || { offset: 0, limit: pageSize, total: inbox.leads.length, hasMore: false };
  const pageHref = (nextPage: number, filter = activeFilter) =>
    `/admin/leads?filter=${filter}&sort=${sort}&page=${nextPage}`;

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-5 text-[#f4ead4] [overflow-wrap:anywhere] sm:px-5 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">
                Ask Magic Mike · Protected inquiries
              </p>
              <h1 className="mt-3 font-serif text-4xl">Protected request inbox</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Find a saved request. Review its actual owner, current contact safeguards and
                one next human step in protected detail. No routing is activated here.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              <Link
                href="/admin/reporting"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Reporting
              </Link>
              <Link
                href="/admin/today"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Command desk
              </Link>
              <Link
                href="/admin/notifications"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Notifications
              </Link>
              <Link
                href="/admin/action-queue"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Action queue
              </Link>
            </nav>
          </div>
          {params.status_action ? (
            <p className="mt-4 rounded-md border border-[#cda24a33] bg-[#cda24a14] p-3 text-sm text-[#f4ead4]">
              Status action result: {statusActionMessage(params.status_action)}
            </p>
          ) : null}
        </header>

          <section className="space-y-4">
            <LeadSearchPanel />
            <nav className="flex flex-wrap gap-2" aria-label="Lead status filters">
              {ADMIN_LEAD_INBOX_FILTERS.map((filter) => (
                <a
                  key={filter.key}
                  href={pageHref(1, filter.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                    activeFilter === filter.key
                      ? "border-[#cda24a] bg-[#cda24a] text-black"
                      : "border-[#cda24a33] bg-[#0b0b0b] text-[#d9ceb8]"
                  }`}
                >
                  {filter.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#080808] p-3">
              <p className="text-xs text-[#8f8778]">
                {page.total.toLocaleString()} authorized lead{page.total === 1 ? "" : "s"} · page {requestedPage}
              </p>
              <form method="get" className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                <input type="hidden" name="filter" value={activeFilter} />
                <label className="text-xs text-[#8f8778]" htmlFor="lead-sort">Sort</label>
                <select id="lead-sort" name="sort" defaultValue={sort} className="min-h-11 min-w-0 max-w-full flex-1 rounded-md border border-[#cda24a33] bg-[#050505] px-3 py-2 text-xs text-[#f4ead4]">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="priority">Legacy score (not command-desk priority)</option>
                  <option value="followup">Next follow-up</option>
                </select>
                <button className="min-h-11 rounded-md border border-[#cda24a44] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#f0cf79]">Apply</button>
              </form>
            </div>
            {inbox.leads.length ? inbox.leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} principal={principal}/>
            )) : (
              <EmptyState configured={inbox.configured} error={inbox.error} />
            )}
            <nav className="flex items-center justify-between" aria-label="Lead inbox pagination">
              {requestedPage > 1 ? <Link href={pageHref(requestedPage - 1)} className="text-sm text-[#f0cf79]">Previous page</Link> : <span />}
              {page.hasMore ? <Link href={pageHref(requestedPage + 1)} className="text-sm text-[#f0cf79]">Next page</Link> : <span />}
            </nav>
          </section>
      </div>
    </main>
  );
}
