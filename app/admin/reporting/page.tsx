import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  loadAdminReportingSummary,
  loadAdminReportingDrillthrough,
  parseReportingDrillthroughCursor,
  REPORTING_APPOINTMENT_STATES,
  type AdminReportingGroup,
  type AdminAgentPerformanceGroup,
  type AdminReportingLeadRow,
  type AdminReportingSummary,
  type StatusBucketKey,
  type ConversionReportingGroup,
} from "../../lib/adminReportingView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";
import { canAccessAssignedLead, hasLeadCenterPermission } from "../../../src/lib/admin/rbac-policy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOWS = [7, 30, 90] as const;

const STATUS_BUCKET_LABELS: Record<StatusBucketKey, string> = {
  new: "New",
  working: "Working",
  qualified_appointment: "Qualified / Appointment",
  closed: "Closed",
  spam_test: "Spam / Test",
};

function parseWindow(value?: string): 7 | 30 | 90 {
  const parsed = Number(value);
  return WINDOWS.includes(parsed as 7 | 30 | 90) ? (parsed as 7 | 30 | 90) : 30;
}

function compactUrl(value: string) {
  if (value.length <= 58) return value;
  return value.slice(0, 34) + "..." + value.slice(-18);
}

function shortDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function contactPresence(row: AdminReportingLeadRow) {
  if (row.email && row.phone) return "Email and phone present";
  if (row.email) return "Email present";
  if (row.phone) return "Phone present";
  return "Not provided";
}

function evidenceRate(
  numerator: number,
  denominator: number,
  rate: number | null,
  available: boolean,
) {
  if (!available) return "Unavailable";
  return `${numerator}/${denominator} · ${rate === null ? "—" : `${rate}%`}`;
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-[#cda24a24] bg-[#0b0b0b] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl text-[#f4ead4]">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-[#8f8778]">{note}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0b0b0b] p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyNotice({ summary }: { summary: AdminReportingSummary }) {
  if (summary.conversionReporting.available && summary.conversionReporting.cohort.denominator && !summary.error) return null;

  return (
    <section className="rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        Reporting status
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">
        {summary.error ? "Reporting unavailable" : summary.configured ? "No leads captured in this cohort" : "Canonical Neon database not configured"}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d9ceb8]">
        {summary.error ||
          "This protected reporting view is read-only. It will populate when the configured lead store returns rows for the selected window."}
      </p>
    </section>
  );
}

function SourceTable({ rows }: { rows: AdminReportingGroup[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.14em] text-[#8f8778]">
          <tr>
            <th className="py-2 pr-4">Source / detail</th>
            <th className="py-2 pr-4">Count</th>
            <th className="py-2 pr-4">Contactable</th>
            <th className="py-2 pr-4">Qualified / appointment</th>
            <th className="py-2 pr-4">Converted</th>
            <th className="py-2">Conv. rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-[#f4ead4]">
          {rows.length ? rows.map((row) => (
            <tr key={row.key}>
              <td className="max-w-[22rem] py-3 pr-4 text-[#d9ceb8]">{row.label}</td>
              <td className="py-3 pr-4">{row.count}</td>
              <td className="py-3 pr-4">{row.contactable}</td>
              <td className="py-3 pr-4">{row.qualifiedAppointment}</td>
              <td className="py-3 pr-4">{row.converted}</td>
              <td className="py-3">{row.conversionRate}%</td>
            </tr>
          )) : (
            <tr>
              <td className="py-3 text-[#8f8778]" colSpan={6}>No source rows.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AgentPerformanceTable({ rows }: { rows: AdminAgentPerformanceGroup[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.14em] text-[#8f8778]">
          <tr>
            <th className="py-2 pr-4">Agent</th>
            <th className="py-2 pr-4">Assigned</th>
            <th className="py-2 pr-4">Qualified</th>
            <th className="py-2 pr-4">Appointments</th>
            <th className="py-2 pr-4">Converted</th>
            <th className="py-2 pr-4">Lost/disqualified</th>
            <th className="py-2 pr-4">Stalled</th>
            <th className="py-2">Conv. rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-[#f4ead4]">
          {rows.length ? rows.map((row) => (
            <tr key={row.agent_id}>
              <td className="max-w-[18rem] py-3 pr-4 text-[#d9ceb8]">
                <span className="block font-semibold text-[#f4ead4]">{row.agent_name}</span>
                <span className="mt-1 block font-mono text-[11px] text-[#8f8778]">{row.agent_id}</span>
              </td>
              <td className="py-3 pr-4">{row.assigned}</td>
              <td className="py-3 pr-4">{row.qualified}</td>
              <td className="py-3 pr-4">{row.appointments}</td>
              <td className="py-3 pr-4">{row.converted}</td>
              <td className="py-3 pr-4">{row.closedLost}</td>
              <td className="py-3 pr-4">{row.stalled}</td>
              <td className="py-3">{row.conversionRate}%</td>
            </tr>
          )) : (
            <tr>
              <td className="py-3 text-[#8f8778]" colSpan={8}>No assigned leads in this window.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SourceConversionTable({ rows }: { rows: ConversionReportingGroup[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.14em] text-[#8f8778]">
          <tr>
            <th className="py-2 pr-4">First-touch source</th>
            <th className="py-2 pr-4">Captured</th>
            <th className="py-2 pr-4">Qualified</th>
            <th className="py-2 pr-4">First human response</th>
            <th className="py-2 pr-4">Manual attempted</th>
            <th className="py-2 pr-4">Two-way contact</th>
            <th className="py-2 pr-4">No manual evidence</th>
            {REPORTING_APPOINTMENT_STATES.map((state) => (
              <th key={state} className="py-2 pr-4">{state.replaceAll("_", " ")}</th>
            ))}
            <th className="py-2 pr-4">No appointment evidence</th>
            <th className="py-2 pr-4">Closed won</th>
            <th className="py-2 pr-4">Commissions</th>
            <th className="py-2">Closed / captured</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-[#f4ead4]">
          {rows.length ? rows.map((row) => (
            <tr key={row.source}>
              <td className="py-3 pr-4 text-[#d9ceb8]">{row.source}</td>
              <td className="py-3 pr-4">{row.captured}</td>
              <td className="py-3 pr-4">{row.qualified}</td>
              <td className="py-3 pr-4">{row.firstHumanResponse}</td>
              <td className="py-3 pr-4">{row.manualAttempted ?? "Unavailable"}</td>
              <td className="py-3 pr-4">{row.twoWayContact ?? "Unavailable"}</td>
              <td className="py-3 pr-4">{row.manualEvidenceUnknown}</td>
              {REPORTING_APPOINTMENT_STATES.map((state) => (
                <td key={state} className="py-3 pr-4">
                  {evidenceRate(row.appointmentStates[state], row.captured,
                    row.captured ? Math.round(row.appointmentStates[state] / row.captured * 100) : null, true)}
                </td>
              ))}
              <td className="py-3 pr-4">{row.appointmentEvidenceUnknown}</td>
              <td className="py-3 pr-4">{row.closedWon}</td>
              <td className="py-3 pr-4">{row.commissions ?? "Unavailable"}</td>
              <td className="py-3">{evidenceRate(row.closedWon, row.captured, row.conversionRate, true)}</td>
            </tr>
          )) : (
            <tr><td className="py-3 text-[#8f8778]" colSpan={17}>No included leads in this window.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HotLeadList({ rows }: { rows: AdminReportingLeadRow[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.length ? rows.map((row) => (
        <article key={row.id} className="rounded-md border border-[#cda24a24] bg-[#080808] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-[#f4ead4]">
              <Link href={`/admin/leads/${encodeURIComponent(row.id)}`}>
                {row.address_raw || row.id}
              </Link>
            </p>
            <span className="rounded-full border border-[#cda24a33] bg-[#cda24a14] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#e2c06f]">
              {row.status}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Created</dt>
              <dd className="mt-1 text-[#d9ceb8]">{shortDate(row.created_at)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Contact</dt>
              <dd className="mt-1 text-[#d9ceb8]">{contactPresence(row)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Type</dt>
              <dd className="mt-1 text-[#d9ceb8]">{row.lead_type || "Unknown"}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.14em] text-[#8f8778]">Source</dt>
              <dd className="mt-1 text-[#d9ceb8]">{row.source || "Unknown"}</dd>
            </div>
          </dl>
        </article>
      )) : (
        <p className="text-sm text-[#8f8778]">No hot lead indicators in this window.</p>
      )}
    </div>
  );
}

export default async function AdminReportingPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string; after?: string }>;
}) {
  const principal = await requireLeadCenterPermission("report:view");
  // The shared compatibility guard can return null when RBAC is disabled.
  // This reporting surface still requires a genuine scoped session.
  if (!principal) redirect("/lead-center-login?error=session");
  const params = searchParams ? await searchParams : {};
  const windowDays = parseWindow(params.window);
  const parsedCursor = params.after ? parseReportingDrillthroughCursor(params.after, windowDays) : null;
  const asOf = parsedCursor?.end || new Date();
  const summary = await loadAdminReportingSummary(windowDays, principal, asOf);
  const visibleHotLeads = summary.hotLeads.filter((row) => canAccessAssignedLead(principal, row.assigned_agent_id));
  const canViewLeads = hasLeadCenterPermission(principal.role, "lead:view_all") ||
    hasLeadCenterPermission(principal.role, "lead:view_assigned");
  const drillthrough = canViewLeads ? await loadAdminReportingDrillthrough({
    principal, windowDays, cursor: params.after, asOf,
  }) : null;
  const permittedRows = drillthrough?.rows.filter((row) => canAccessAssignedLead(principal, row.assigned_agent_id)) || [];
  const conversion = summary.conversionReporting;
  const cohortCount = conversion.cohort.denominator ?? 0;

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-[#f4ead4]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-[#cda24a33] pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2c06f]">
                AdminOps
              </p>
              <h1 className="mt-3 font-serif text-4xl">Analytics and reporting</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#d9ceb8]">
                Protected read-only reporting for lead volume, source attribution, status movement,
                timeline mix, and hot lead indicators.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
              {canViewLeads ? (
              <Link
                href="/admin/leads"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Lead inbox
              </Link>
              ) : null}
              {hasLeadCenterPermission(principal.role, "lead:assign") ? (
              <Link
                href="/admin/allocation"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Agent allocation
              </Link>
              ) : null}
              {hasLeadCenterPermission(principal.role, "task:manage_assigned") ? (
              <Link
                href="/admin/action-queue"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Action queue
              </Link>
              ) : null}
            </nav>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Reporting windows">
            {WINDOWS.map((days) => (
              <a
                key={days}
                href={`/admin/reporting?window=${days}`}
                className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
                  windowDays === days
                    ? "border-[#cda24a] bg-[#cda24a] text-black"
                    : "border-[#cda24a33] bg-[#0b0b0b] text-[#d9ceb8]"
                }`}
              >
                {days} days
              </a>
            ))}
          </nav>
          <p className="mt-4 text-xs leading-5 text-[#d9ceb8]">
            Lead-capture cohort: {conversion.cohort.startInclusive} inclusive to {conversion.cohort.endExclusive} exclusive.
            Timezone: UTC. Denominator: {conversion.cohort.denominator ?? "Unavailable"} distinct canonical live leads.
            Scope: {conversion.cohort.scope.replaceAll("_", " ")}. Totals: {conversion.cohort.totals}; not limited by drill-through pages.
            Calculation: full scoped cohort fetched and reconciled in memory, not SQL aggregate totals.
            Test, suppressed, spam, and duplicate aliases are excluded. Outcomes are observed canonical records, not predicted conversions.
          </p>
        </header>

        {!conversion.available ? <EmptyNotice summary={summary} /> : <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Leads today" value={summary.kpis.leadsToday} />
          <MetricCard label="Leads last 7 days" value={summary.kpis.leadsLast7Days} note="Within the selected capture cohort" />
          <MetricCard label="Leads last 30 days" value={summary.kpis.leadsLast30Days} note="Within the selected capture cohort" />
          <MetricCard
            label="Contactable rate"
            value={cohortCount ? `${summary.kpis.contactableRate}%` : "—"}
            note="Email or phone present"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <MetricCard label="Captured" value={summary.funnel.captured} />
          <MetricCard label="First human response" value={summary.funnel.contacted} note="Immutable recorded evidence; not proof of two-way contact" />
          <MetricCard label="Qualified" value={summary.funnel.qualified} />
          <MetricCard label="Appointment" value={summary.funnel.appointment} />
          <MetricCard label="Closed outcome" value={summary.funnel.converted} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Manual attempted" value={conversion.totals!.manualAttempted ?? "Unavailable"} note="Distinct leads with canonical operator attempted, no-answer, or two-way audit records" />
          <MetricCard label="Two-way contact" value={conversion.totals!.twoWayContact ?? "Unavailable"} note="Explicit manual two_way_conversation audit result only" />
          <MetricCard label="No manual evidence" value={conversion.totals!.manualEvidenceUnknown} note="Unknown, not confirmed no attempts" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Qualification rate"
            value={evidenceRate(summary.funnel.qualified, cohortCount, cohortCount ? summary.rates.qualificationRate : null, true)}
            note="Qualified status or recorded qualified outcome / captured cohort"
          />
          <MetricCard
            label="Appointment rate"
            value={evidenceRate(summary.funnel.appointment, cohortCount, cohortCount ? summary.rates.appointmentRate : null, true)}
            note="Distinct leads with canonical appointment records / captured cohort"
          />
          <MetricCard
            label="Conversion rate"
            value={evidenceRate(summary.funnel.converted, cohortCount, cohortCount ? summary.rates.conversionRate : null, true)}
            note="Recorded closed outcome / captured cohort; not settled commission"
          />
          <MetricCard
            label="Close rate"
            value={evidenceRate(summary.funnel.converted, summary.funnel.converted + summary.funnel.lostDisqualified,
              summary.funnel.converted + summary.funnel.lostDisqualified ? summary.rates.closeRate : null, true)}
            note="Recorded closed outcome / closed outcomes plus closed-lost leads"
          />
          <MetricCard
            label="No outcome evidence"
            value={conversion.totals!.outcomeEvidenceUnknown}
            note="Unknown, not confirmed no conversion"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Stalled leads"
            value={summary.stalledLeadCount}
            note="Operational stalls from SLA and lifecycle thresholds"
          />
          <MetricCard
            label="Lost / disqualified"
            value={summary.funnel.lostDisqualified}
            note="Closed-lost plus spam or disqualified records"
          />
        </div>

        <div className="mt-6 space-y-5">
          <EmptyNotice summary={summary} />

          <Panel title="Status buckets">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(STATUS_BUCKET_LABELS) as StatusBucketKey[]).map((key) => (
                <MetricCard
                  key={key}
                  label={STATUS_BUCKET_LABELS[key]}
                  value={summary.statusBuckets[key]}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Source attribution">
            <SourceTable rows={summary.sources} />
          </Panel>

          <Panel title="Source to outcome">
            <SourceConversionTable rows={conversion.sources} />
            <p className="mt-3 text-xs leading-5 text-[#8f8778]">
              Each state uses distinct leads / that source&apos;s captured cohort. States are exact current appointment records,
              not inferred milestones; one lead can appear in multiple states across different appointments.
              Missing appointment/outcome records mean unknown evidence, not a confirmed negative outcome.
            </p>
            {conversion.limitations.map((limitation) => <p key={limitation} className="mt-2 text-xs leading-5 text-[#8f8778]">{limitation}</p>)}
          </Panel>

          <Panel title="Reporting data trust">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <MetricCard label="Included" value={summary.dataTrust.included} />
              <MetricCard label="Test excluded" value={summary.dataTrust.excludedTest} />
              <MetricCard label="Suppressed excluded" value={summary.dataTrust.excludedSuppressed} />
              <MetricCard label="Duplicate aliases excluded" value={summary.dataTrust.excludedDuplicates} />
              <MetricCard label="Unknown first touch" value={summary.dataTrust.unknownFirstTouch} />
              <MetricCard label="Unknown last touch" value={summary.dataTrust.unknownLastTouch} />
              <MetricCard label="Outcome coverage" value={`${summary.dataTrust.outcomesObserved}/${summary.dataTrust.included}`} />
            </div>
          </Panel>

          <Panel title="Operational evidence">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="First response ≤ 5 min"
                value={evidenceRate(
                  summary.operationalTrust.responseSla.withinTarget,
                  summary.operationalTrust.responseSla.measured,
                  summary.operationalTrust.responseSla.rate,
                  summary.operationalTrust.responseSla.available,
                )}
                note={`${summary.operationalTrust.responseSla.unknown} included leads have no immutable first-response evidence. Internal service target; not a public promise.`}
              />
              <MetricCard
                label="Assignment accepted"
                value={evidenceRate(
                  summary.operationalTrust.assignmentAcceptance.accepted,
                  summary.operationalTrust.assignmentAcceptance.measured,
                  summary.operationalTrust.assignmentAcceptance.rate,
                  summary.operationalTrust.assignmentAcceptance.available,
                )}
                note={`${summary.operationalTrust.assignmentAcceptance.pending} latest assignments remain pending.`}
              />
              <MetricCard
                label="Provider accepted"
                value={evidenceRate(
                  summary.operationalTrust.notifications.providerAccepted,
                  summary.operationalTrust.notifications.intents,
                  summary.operationalTrust.notifications.providerAcceptanceRate,
                  summary.operationalTrust.notifications.available,
                )}
                note="Provider message ID / notification intents. Acceptance is not delivery."
              />
              <MetricCard
                label="Provider delivered"
                value={evidenceRate(
                  summary.operationalTrust.notifications.delivered,
                  summary.operationalTrust.notifications.intents,
                  summary.operationalTrust.notifications.deliveryRate,
                  summary.operationalTrust.notifications.available,
                )}
                note={`${summary.operationalTrust.notifications.failed} failed; ${summary.operationalTrust.notifications.deliveryUnknown} lack terminal delivery evidence. Delivery is not inbox placement.`}
              />
              <MetricCard
                label="Duplicate aliases"
                value={evidenceRate(
                  summary.operationalTrust.duplicates.excludedAliases,
                  summary.operationalTrust.duplicates.submissionRecords,
                  summary.operationalTrust.duplicates.rate,
                  summary.operationalTrust.duplicates.available,
                )}
                note="Aliases / canonical plus alias submission records. Aliases are excluded from business KPIs."
              />
              <MetricCard
                label="AI deterministic fallback"
                value={evidenceRate(
                  summary.operationalTrust.aiUsage.deterministicFallbacks,
                  summary.operationalTrust.aiUsage.requests,
                  summary.operationalTrust.aiUsage.fallbackRate,
                  summary.operationalTrust.aiUsage.available,
                )}
                note={`${summary.operationalTrust.aiUsage.providerResponses} provider responses; ${summary.operationalTrust.aiUsage.blocked} blocked; estimated recorded cost $${summary.operationalTrust.aiUsage.estimatedCostUsd.toFixed(4)}.`}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8f8778]">
              Cohort grain is distinct canonical live leads created in the selected UTC window. Test, suppressed, and duplicate-alias records are excluded before joins; unavailable evidence is never rendered as zero success.
            </p>
          </Panel>

          <Panel title="Campaign/source-detail performance">
            <SourceTable rows={summary.campaigns} />
          </Panel>

          {canViewLeads ? <Panel title="Agent performance">
            <AgentPerformanceTable rows={summary.agentPerformance} />
            <p className="mt-3 text-xs leading-5 text-[#8f8778]">
              Rates include sample counts and are operational indicators, not compensation or employment scoring.
            </p>
          </Panel> : null}

          <Panel title="Appointment operations">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {REPORTING_APPOINTMENT_STATES.map((state) => (
                <MetricCard key={state} label={state.replaceAll("_", " ")}
                  value={evidenceRate(conversion.totals!.appointmentStates[state], cohortCount,
                    cohortCount ? Math.round(conversion.totals!.appointmentStates[state] / cohortCount * 100) : null, true)}
                  note="Distinct leads in this exact current state / captured cohort" />
              ))}
              <MetricCard label="Reschedule requested" value={conversion.totals!.otherAppointmentStates} />
              <MetricCard label="No appointment evidence" value={conversion.totals!.appointmentEvidenceUnknown} note="Unknown, not confirmed no appointment" />
            </div>
            <p className="mt-3 text-xs text-[#8f8778]">Request-to-scheduled and scheduled-to-completed transition rates are unavailable without historical transition evidence.</p>
          </Panel>

          <Panel title="Follow-up operations">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Open follow-ups" value={summary.followupOps.open} />
              <MetricCard label="Overdue" value={summary.followupOps.overdue} />
              <MetricCard label="Due today" value={summary.followupOps.dueToday} />
              <MetricCard label="Completed" value={summary.followupOps.completed} />
              <MetricCard label="Canceled" value={summary.followupOps.cancelled} />
              <MetricCard
                label="Completion rate"
                value={summary.followupOps.open + summary.followupOps.completed + summary.followupOps.cancelled
                  ? `${summary.followupOps.completionRate}%` : "—"}
                note="Completed / canonical follow-up tasks belonging to the captured cohort; task completion is not contact evidence"
              />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            {canViewLeads ? <Panel title="Top pages">
              <div className="space-y-3 text-sm">
                {summary.topPages.length ? summary.topPages.map((row) => (
                  <div key={row.page_url} className="flex items-center justify-between gap-4">
                    <span className="break-all text-[#d9ceb8]" title={row.page_url}>
                      {compactUrl(row.page_url)}
                    </span>
                    <span className="font-serif text-xl text-[#f4ead4]">{row.count}</span>
                  </div>
                )) : <p className="text-[#8f8778]">No page URLs captured.</p>}
              </div>
            </Panel> : null}

            <Panel title="Intent and timeline mix">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">
                    Lead type
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#d9ceb8]">
                    {summary.leadTypes.map((row) => (
                      <li key={row.lead_type} className="flex justify-between gap-3">
                        <span>{row.lead_type}</span>
                        <span>{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">
                    Primary intent
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#d9ceb8]">
                    {summary.intents.map((row) => (
                      <li key={row.primary_intent} className="flex justify-between gap-3">
                        <span>{row.primary_intent}</span>
                        <span>{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8f8778]">
                    Timeline
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#d9ceb8]">
                    {summary.timelines.map((row) => (
                      <li key={`${row.timeline_months ?? "unknown"}-${row.label}`} className="flex justify-between gap-3">
                        <span>{row.label}</span>
                        <span>{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          </div>

          {canViewLeads ? <Panel title="Hot lead indicators">
            <HotLeadList rows={visibleHotLeads} />
          </Panel> : null}
          {canViewLeads ? <Panel title="Permitted cohort drill-through">
            <p className="mb-3 text-xs text-[#8f8778]">Showing up to {drillthrough?.limit || 50} permitted records per scoped SQL page with a stable UTC cohort anchor. This display limit does not cap any reporting total. Detail routes recheck access.</p>
            {drillthrough?.error ? <p className="mb-3 text-sm text-[#d9ceb8]">Drill-through unavailable: {drillthrough.error}</p> : null}
            <ul className="space-y-2 text-sm">
              {permittedRows.map((row) => (
                <li key={row.id}><Link href={`/admin/leads/${encodeURIComponent(row.id)}`} className="text-[#e2c06f]">Lead {row.id}</Link></li>
              ))}
            </ul>
            <nav className="mt-4 flex gap-4 text-sm" aria-label="Cohort record pages">
              {params.after ? <Link href={`/admin/reporting?window=${windowDays}`}>First page</Link> : null}
              {drillthrough?.nextCursor ? <Link href={`/admin/reporting?window=${windowDays}&after=${encodeURIComponent(drillthrough.nextCursor)}`}>Next page</Link> : null}
            </nav>
          </Panel> : null}
        </div>
        </>}
      </div>
    </main>
  );
}
