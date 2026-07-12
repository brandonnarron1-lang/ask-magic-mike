import type { ReactNode } from "react";
import Link from "next/link";
import {
  loadAdminReportingSummary,
  type AdminReportingGroup,
  type AdminAgentPerformanceGroup,
  type AdminReportingLeadRow,
  type AdminReportingSummary,
  type StatusBucketKey,
} from "../../lib/adminReportingView";

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
  }).format(date);
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
  if (summary.rows.length && !summary.error) return null;

  return (
    <section className="rounded-lg border border-[#cda24a33] bg-[#0d0d0d] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e2c06f]">
        Reporting status
      </p>
      <h2 className="mt-3 font-serif text-3xl text-[#f4ead4]">
        {summary.configured ? "No reporting rows returned" : "Supabase not configured"}
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
              <td className="max-w-[18rem] py-3 pr-4 font-mono text-xs text-[#d9ceb8]">{row.agent_id}</td>
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

function HotLeadList({ rows }: { rows: AdminReportingLeadRow[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.length ? rows.map((row) => (
        <article key={row.id} className="rounded-md border border-[#cda24a24] bg-[#080808] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-[#f4ead4]">
              {row.address_raw || row.page_url || row.id}
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
              <dd className="mt-1 text-[#d9ceb8]">{row.phone || row.email || "Not provided"}</dd>
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
  searchParams?: Promise<{ window?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const windowDays = parseWindow(params.window);
  const summary = await loadAdminReportingSummary(windowDays);

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
              <Link
                href="/admin/leads"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Lead inbox
              </Link>
              <Link
                href="/admin/allocation"
                className="rounded-full border border-[#cda24a33] bg-[#0b0b0b] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d9ceb8]"
              >
                Agent allocation
              </Link>
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
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Leads today" value={summary.kpis.leadsToday} />
          <MetricCard label="Leads last 7 days" value={summary.kpis.leadsLast7Days} />
          <MetricCard label="Leads last 30 days" value={summary.kpis.leadsLast30Days} />
          <MetricCard
            label="Contactable rate"
            value={`${summary.kpis.contactableRate}%`}
            note="Email or phone present"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <MetricCard label="Captured" value={summary.funnel.captured} />
          <MetricCard label="Contacted" value={summary.funnel.contacted} />
          <MetricCard label="Qualified" value={summary.funnel.qualified} />
          <MetricCard label="Appointment" value={summary.funnel.appointment} />
          <MetricCard label="Converted" value={summary.funnel.converted} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Qualification rate"
            value={`${summary.rates.qualificationRate}%`}
            note="Qualified or later / captured non-spam leads"
          />
          <MetricCard
            label="Appointment rate"
            value={`${summary.rates.appointmentRate}%`}
            note="Appointments set/requested / qualified-or-later leads"
          />
          <MetricCard
            label="Conversion rate"
            value={`${summary.rates.conversionRate}%`}
            note="Converted / captured non-spam leads"
          />
          <MetricCard
            label="Close rate"
            value={`${summary.rates.closeRate}%`}
            note="Converted / converted plus lost/disqualified"
          />
          <MetricCard
            label="Stalled leads"
            value={summary.stalledLeadCount}
            note="Operational stalls from SLA and lifecycle thresholds"
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

          <Panel title="Campaign/source-detail performance">
            <SourceTable rows={summary.campaigns} />
          </Panel>

          <Panel title="Agent performance">
            <AgentPerformanceTable rows={summary.agentPerformance} />
            <p className="mt-3 text-xs leading-5 text-[#8f8778]">
              Rates include sample counts and are operational indicators, not compensation or employment scoring.
            </p>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Top pages">
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
            </Panel>

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

          <Panel title="Hot lead indicators">
            <HotLeadList rows={summary.hotLeads} />
          </Panel>
        </div>
      </div>
    </main>
  );
}
