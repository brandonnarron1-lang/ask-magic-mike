import type { ReactNode } from "react";
import Link from "next/link";
import { loadGrowthIntelligence } from "../../lib/growthIntelligenceView";
import { requireLeadCenterPermission } from "../../../src/lib/admin/rbac-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOWS = [30, 90, 365] as const;

type GrowthWindow = (typeof WINDOWS)[number];

function parseWindow(value?: string): GrowthWindow {
  const parsed = Number(value);
  return WINDOWS.includes(parsed as GrowthWindow) ? parsed as GrowthWindow : 90;
}

function money(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function responseMinutes(value: number | null) {
  if (value == null) return "—";
  if (value < 60) return `${number(value)}m`;
  return `${number(value / 60)}h`;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function MetricCard({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <article className={`rounded-xl border p-4 ${
      emphasis
        ? "border-[#cda24a66] bg-[linear-gradient(145deg,#171108,#090909)]"
        : "border-white/10 bg-[#0a0a0a]"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f8778]">{label}</p>
      <p className={`mt-3 font-serif text-3xl ${emphasis ? "text-[#f0cf79]" : "text-[#f4ead4]"}`}>
        {value}
      </p>
      {note ? <p className="mt-2 text-xs leading-5 text-[#8f8778]">{note}</p> : null}
    </article>
  );
}

function Panel({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-[#080808] p-5 shadow-[0_26px_80px_rgba(0,0,0,.34)] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d1aa53]">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl text-[#f4ead4] sm:text-3xl">{title}</h2>
        {note ? <p className="max-w-2xl text-xs leading-5 text-[#8f8778]">{note}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StateBanner({
  configured,
  schemaReady,
  error,
}: {
  configured: boolean;
  schemaReady: boolean;
  error?: string;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-[#a21f3d66] bg-[#2a0710] px-5 py-4 text-sm text-[#ffdbe4]">
        <strong className="text-[#ff8ca7]">Growth intelligence query blocked.</strong>{" "}
        {error}. No production mutation was attempted.
      </div>
    );
  }
  if (!configured) {
    return (
      <div className="rounded-xl border border-[#cda24a55] bg-[#1a1308] px-5 py-4 text-sm text-[#f4ead4]">
        <strong className="text-[#f0cf79]">Canonical Neon is not configured in this environment.</strong>{" "}
        The command center remains locked rather than inventing numbers, a surprisingly rare courtesy among software dashboards.
      </div>
    );
  }
  if (!schemaReady) {
    return (
      <div className="rounded-xl border border-[#4baab866] bg-[#06171b] px-5 py-4 text-sm leading-6 text-[#d9f5f8]">
        <strong className="text-[#7ee7f1]">Phase 9 schema gate is pending.</strong>{" "}
        Existing live leads are being analyzed now. Spend, outcomes, immutable first-response evidence, registered experiments, and persistent opportunity queues populate only after their additive migrations are reviewed and applied.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#4a8c6f66] bg-[#071712] px-5 py-4 text-sm text-[#d9f4e8]">
      <strong className="text-[#83dab4]">Growth intelligence schema ready.</strong>{" "}
      Channel economics, outcome attribution, first-response percentiles, experiments, and opportunity queues are available in the selected window.
    </div>
  );
}

function Flag({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  const critical = ["spend_missing", "conversion_tracking_gap", "appointment_gap"].includes(value);
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
      critical
        ? "border-[#a21f3d66] bg-[#a21f3d1c] text-[#ff9ab1]"
        : "border-[#cda24a44] bg-[#cda24a12] text-[#e4c36f]"
    }`}>
      {label}
    </span>
  );
}

function SampleStatus({ value }: { value: "collecting" | "directional" | "operational" }) {
  const tone = value === "operational"
    ? "border-[#4a8c6f66] bg-[#071712] text-[#83dab4]"
    : value === "directional"
      ? "border-[#4baab866] bg-[#06171b] text-[#7ee7f1]"
      : "border-[#cda24a55] bg-[#171207] text-[#e4c36f]";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.11em] ${tone}`}>
      {value}
    </span>
  );
}

export default async function GrowthCommandCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string }>;
}) {
  await requireLeadCenterPermission("report:view");
  const params = searchParams ? await searchParams : {};
  const windowDays = parseWindow(params.window);
  const data = await loadGrowthIntelligence(windowDays);
  const summary = data.summary;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_75%_0%,rgba(145,19,50,.17),transparent_34%),radial-gradient(circle_at_15%_15%,rgba(205,162,74,.11),transparent_30%),#040404] px-4 py-7 text-[#f4ead4] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-[#cda24a33] bg-[linear-gradient(135deg,rgba(18,18,18,.96),rgba(5,5,5,.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#d1aa53]">
                Ask Magic Mike · Growth Intelligence
              </p>
              <h1 className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-6xl">
                Own the demand. Measure the money. Improve the machine.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c9bdab] sm:text-base">
                A protected operating layer for portal economics, paid media, owned demand, database reactivation,
                market opportunities, and controlled experiments. The system may observe, calculate, rank, and draft.
                Spending, sending, publishing, assigning, and production rollout remain human-approved.
              </p>
            </div>
            <div className="rounded-xl border border-[#cda24a44] bg-black/45 p-4 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">Selected window</p>
              <p className="mt-2 font-serif text-3xl text-[#f0cf79]">{windowDays} days</p>
              <p className="mt-1 text-xs text-[#8f8778]">Generated {dateTime(data.generatedAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <nav className="flex flex-wrap gap-2" aria-label="Lead Center navigation">
              {[
                ["Lead inbox", "/admin/leads"],
                ["Reporting", "/admin/reporting"],
                ["Allocation", "/admin/allocation"],
                ["Action queue", "/admin/action-queue"],
                ["Experiments", "/admin/experiments"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] text-[#d9ceb8] transition hover:border-[#cda24a66] hover:text-[#f0cf79]"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <nav className="flex flex-wrap gap-2" aria-label="Growth reporting windows">
              {WINDOWS.map((days) => (
                <Link
                  key={days}
                  href={`/admin/growth?window=${days}`}
                  className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.11em] ${
                    windowDays === days
                      ? "border-[#cda24a] bg-[#cda24a] text-black"
                      : "border-white/10 bg-black/30 text-[#a89c8b]"
                  }`}
                >
                  {days}d
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="mt-5">
          <StateBanner configured={data.configured} schemaReady={data.schemaReady} error={data.error} />
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" aria-label="Growth performance metrics">
          <MetricCard label="Leads" value={summary.leads} note={`${summary.attributedLeadRate}% usefully attributed`} />
          <MetricCard label="Qualified" value={summary.qualified} note="Score or lifecycle qualified" />
          <MetricCard label="Appointments" value={summary.appointments} note="Requested or later" />
          <MetricCard label="Closes" value={summary.closes} note="Outcome-led when available" emphasis />
          <MetricCard label="Tracked spend" value={money(summary.spendUsd)} note={`${summary.paidLeadSpendCoverageRate}% paid-lead spend coverage`} />
          <MetricCard label="Attributed revenue" value={money(summary.attributedRevenueUsd)} note="Closed and referral outcomes" emphasis />
          <MetricCard label="Blended CPL" value={money(summary.blendedCostPerLead)} />
          <MetricCard label="Cost / appointment" value={money(summary.blendedCostPerAppointment)} />
          <MetricCard label="Cost / close" value={money(summary.blendedCostPerClose)} />
          <MetricCard label="ROAS" value={summary.returnOnAdSpend == null ? "—" : `${number(summary.returnOnAdSpend)}x`} />
          <MetricCard label="Dormant opportunities" value={summary.staleNurtureCandidates} note="Non-terminal and stale 30+ days" />
          <MetricCard label="Response risks" value={summary.speedToLeadRisks} note="Recent, uncontacted after 15 minutes" />
          <MetricCard label="Response coverage" value={`${summary.firstResponseCoverageRate}%`} note={`${summary.firstResponseSampleSize} immutable milestones`} />
          <MetricCard label="Response owner attribution" value={`${summary.firstResponseOwnerAttributionRate}%`} note="Server-resolved operator or assignment snapshot" />
          <MetricCard label="Median response" value={responseMinutes(summary.medianFirstResponseMinutes)} note="P50 first human follow-up" emphasis />
          <MetricCard label="P75 response" value={responseMinutes(summary.p75FirstResponseMinutes)} note="75% responded by this point" />
          <MetricCard label="P90 response" value={responseMinutes(summary.p90FirstResponseMinutes)} note="Tail speed-to-lead performance" />
        </section>

        <div className="mt-5">
          <Panel
            eyebrow="Speed to lead"
            title="First-human-response performance"
            note="Immutable response evidence by required operating dimension. Small samples are labeled—not dressed up as certainty."
          >
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-white/[.08] bg-black/30 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-2xl text-[#f4ead4]">By lead type</h3>
                    <p className="mt-1 text-xs leading-5 text-[#8f8778]">Coverage uses every eligible live lead of that type in the selected window.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {data.responseByLeadType.length ? data.responseByLeadType.map((segment) => (
                    <article key={segment.key} className="rounded-xl border border-white/[.08] bg-[#080808] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold capitalize text-[#f4ead4]">{segment.label}</h4>
                          <p className="mt-1 text-[10px] text-[#8f8778]">
                            n={segment.firstResponseSampleSize} of {segment.eligibleLeads} · {segment.coverageRate}% coverage
                          </p>
                        </div>
                        <SampleStatus value={segment.sampleStatus} />
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[
                          ["P50", segment.medianFirstResponseMinutes],
                          ["P75", segment.p75FirstResponseMinutes],
                          ["P90", segment.p90FirstResponseMinutes],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-lg border border-white/[.07] bg-black/30 p-2.5">
                            <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">{label}</dt>
                            <dd className="mt-1 font-serif text-lg text-[#f0cf79]">{responseMinutes(value as number | null)}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  )) : <p className="text-sm text-[#8f8778]">No eligible live lead rows in this window.</p>}
                </div>
              </section>

              <section className="min-w-0 rounded-xl border border-white/[.08] bg-black/30 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-2xl text-[#f4ead4]">By response owner</h3>
                    <p className="mt-1 text-xs leading-5 text-[#8f8778]">Uses the server-resolved responder first, then the immutable assignment snapshot. It never uses today's mutable owner for historical credit.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {data.responseByAgent.length ? data.responseByAgent.map((segment) => (
                    <article key={segment.key} className="rounded-xl border border-white/[.08] bg-[#080808] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-[#f4ead4]">{segment.label}</h4>
                          <p className="mt-1 text-[10px] capitalize text-[#8f8778]">
                            n={segment.firstResponseSampleSize} measured responses · {segment.attributionBasis?.replaceAll("_", " ")}
                          </p>
                        </div>
                        <SampleStatus value={segment.sampleStatus} />
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[
                          ["P50", segment.medianFirstResponseMinutes],
                          ["P75", segment.p75FirstResponseMinutes],
                          ["P90", segment.p90FirstResponseMinutes],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-lg border border-white/[.07] bg-black/30 p-2.5">
                            <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#746d62]">{label}</dt>
                            <dd className="mt-1 font-serif text-lg text-[#f0cf79]">{responseMinutes(value as number | null)}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  )) : <p className="text-sm text-[#8f8778]">No measured response-owner evidence in this window.</p>}
                </div>
              </section>
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
          <Panel
            eyebrow="Economics"
            title="Channel truth table"
            note={`${data.sourceRowsRead} lead rows · ${data.spendRowsRead} spend rows · ${data.outcomeRowsRead} outcome rows`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                  <tr>
                    <th className="px-2 py-3">Source / campaign</th>
                    <th className="px-2 py-3">Leads</th>
                    <th className="px-2 py-3">Qualified</th>
                    <th className="px-2 py-3">Appts.</th>
                    <th className="px-2 py-3">Closes</th>
                    <th className="px-2 py-3">Spend</th>
                    <th className="px-2 py-3">CPL</th>
                    <th className="px-2 py-3">Cost / close</th>
                    <th className="px-2 py-3">ROAS</th>
                    <th className="px-2 py-3">P50 / P75 / P90</th>
                    <th className="px-2 py-3">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.07]">
                  {data.channels.length ? data.channels.map((channel) => (
                    <tr key={channel.key} className="align-top">
                      <td className="px-2 py-4">
                        <span className="block font-semibold text-[#f4ead4]">{channel.source}</span>
                        <span className="mt-1 block max-w-[18rem] text-xs text-[#8f8778]">
                          {channel.medium} · {channel.campaign}
                        </span>
                      </td>
                      <td className="px-2 py-4">{channel.leads}</td>
                      <td className="px-2 py-4">{channel.qualified}</td>
                      <td className="px-2 py-4">{channel.appointments}</td>
                      <td className="px-2 py-4 text-[#f0cf79]">{channel.closes}</td>
                      <td className="px-2 py-4">{money(channel.spendUsd)}</td>
                      <td className="px-2 py-4">{money(channel.costPerLead)}</td>
                      <td className="px-2 py-4">{money(channel.costPerClose)}</td>
                      <td className="px-2 py-4">{channel.returnOnAdSpend == null ? "—" : `${channel.returnOnAdSpend}x`}</td>
                      <td className="px-2 py-4">
                        <span className="block">{responseMinutes(channel.medianFirstResponseMinutes)}</span>
                        <span className="mt-1 block text-[10px] text-[#8f8778]">
                          {responseMinutes(channel.p75FirstResponseMinutes)} / {responseMinutes(channel.p90FirstResponseMinutes)}
                        </span>
                        <span className="mt-1 block text-[10px] text-[#746d62]">n={channel.firstResponseSampleSize}</span>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex max-w-[18rem] flex-wrap gap-1.5">
                          {channel.flags.length
                            ? channel.flags.map((flag) => <Flag key={flag} value={flag} />)
                            : <span className="text-xs text-[#746d62]">Collecting evidence</span>}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-2 py-5 text-[#8f8778]" colSpan={11}>No eligible live lead rows in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            eyebrow="Autonomy envelope"
            title="Power without recklessness"
            note="AI authority is deliberately narrower than operator authority. Civilization has tried the reverse arrangement often enough."
          >
            <div className="space-y-3">
              {[
                {
                  label: "May run autonomously",
                  tone: "border-[#4a8c6f55] bg-[#071712]",
                  text: "Read minimized operational data; calculate economics; detect stale leads, response risk, attribution gaps, and market signals; rank opportunities; draft experiments and compliant operator suggestions.",
                },
                {
                  label: "Requires explicit approval",
                  tone: "border-[#cda24a55] bg-[#171207]",
                  text: "Consumer email or SMS; campaign launch; budget changes; experiment rollout; public publishing; lead reassignment; CRM mutation; calendar booking; offers, valuations, or external data purchases.",
                },
                {
                  label: "Blocked",
                  tone: "border-[#a21f3d55] bg-[#21070e]",
                  text: "Protected-trait inference; discriminatory targeting; invented consent or property facts; legal or lending decisions; secret collection; raw provider payload retention; autonomous production deployment.",
                },
              ].map((item) => (
                <article key={item.label} className={`rounded-xl border p-4 ${item.tone}`}>
                  <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#f4ead4]">{item.label}</h3>
                  <p className="mt-2 text-xs leading-6 text-[#bdb2a1]">{item.text}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel
            eyebrow="Opportunity radar"
            title="Highest-leverage moves"
            note="Derived from live operational facts and deterministic rules. Scores prioritize review; they do not grant execution authority."
          >
            <div className="space-y-3">
              {data.opportunities.length ? data.opportunities.map((opportunity, index) => (
                <article key={opportunity.key} className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f8778]">
                        {String(index + 1).padStart(2, "0")} · {opportunity.type} · {opportunity.actionClass.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 font-serif text-xl text-[#f4ead4]">{opportunity.title}</h3>
                    </div>
                    <div className="rounded-lg border border-[#cda24a44] bg-[#cda24a12] px-3 py-2 text-center">
                      <span className="block text-[9px] uppercase tracking-[0.12em] text-[#8f8778]">Priority</span>
                      <strong className="mt-1 block font-serif text-2xl text-[#f0cf79]">{number(opportunity.score)}</strong>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#bdb2a1]">{opportunity.rationale}</p>
                  <p className="mt-3 border-l-2 border-[#cda24a88] pl-3 text-xs leading-5 text-[#e2d5bd]">
                    {opportunity.recommendedNextStep}
                  </p>
                </article>
              )) : (
                <p className="text-sm leading-6 text-[#8f8778]">No opportunity rules fired in this window.</p>
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="Experiment OS"
            title="Controlled improvement ledger"
            note={`${data.experiments.length} registered · ${summary.runningExperiments} running`}
          >
            <div className="space-y-3">
              {data.experiments.length ? data.experiments.map((experiment) => (
                <article key={experiment.experimentKey} className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8f8778]">
                        {experiment.surface} · {experiment.primaryMetric}
                      </p>
                      <h3 className="mt-2 font-serif text-xl text-[#f4ead4]">{experiment.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Flag value={experiment.status} />
                      <Flag value={experiment.approvalStatus} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#bdb2a1]">{experiment.hypothesis}</p>
                  <p className="mt-2 text-xs text-[#8f8778]">Minimum sample per variant: {experiment.minimumSampleSize}</p>
                  {experiment.decision ? <p className="mt-3 text-xs leading-5 text-[#e2d5bd]">Decision: {experiment.decision}</p> : null}
                </article>
              )) : (
                <div className="rounded-xl border border-dashed border-[#cda24a44] bg-[#120e07] p-5">
                  <p className="text-sm font-semibold text-[#f0cf79]">No experiments registered yet.</p>
                  <p className="mt-2 text-xs leading-6 text-[#a89c8b]">
                    The schema supports deterministic assignment, minimum samples, practical-uplift thresholds,
                    guardrails, approval state, and documented decisions. Start with one funnel hypothesis and one operator-workflow hypothesis.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel
            eyebrow="Persistent queue"
            title="Reviewed market opportunities"
            note="Rows appear after the Phase 9 migration and an approved ingestion or review process writes minimized evidence."
          >
            <div className="space-y-2">
              {data.persistedOpportunities.length ? data.persistedOpportunities.map((item) => (
                <article key={item.key} className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-black/30 p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                      {item.type} · {item.status} · {item.actionClass.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 text-sm font-semibold text-[#f4ead4]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#a89c8b]">{item.rationale}</p>
                  </div>
                  <strong className="font-serif text-2xl text-[#f0cf79]">{number(item.score)}</strong>
                </article>
              )) : <p className="text-sm leading-6 text-[#8f8778]">No persisted opportunity rows.</p>}
            </div>
          </Panel>

          <Panel
            eyebrow="Advisory queue"
            title="AI and rule-based recommendations"
            note="Approval is data, not a vague nod in a meeting. Execution remains separate and auditable."
          >
            <div className="space-y-2">
              {data.recommendations.length ? data.recommendations.map((item) => (
                <article key={item.key} className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[#8f8778]">
                        P{item.priority} · {item.scope} · {item.status}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-[#f4ead4]">{item.title}</h3>
                    </div>
                    <Flag value={item.actionClass} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#a89c8b]">{item.rationale}</p>
                </article>
              )) : <p className="text-sm leading-6 text-[#8f8778]">No proposed or approved recommendations.</p>}
            </div>
          </Panel>
        </div>

        <Panel
          eyebrow="Winning operating model"
          title="The moat is the closed loop"
          note="The goal is not to copy every vendor feature. It is to own the parts they rent to everyone else."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Acquire", "Portals, paid search, social, referrals, local SEO, open houses, direct response, and partner feeds enter one normalized attribution model."],
              ["Recognize", "First-party behavior, questions, property context, timeline, prior conversation, and market signals update intent without inventing facts."],
              ["Respond", "Deterministic routing and SLA controls get humans to qualified demand fast; AI prepares context and drafts but does not impersonate permission."],
              ["Recycle", "Every non-terminal lead remains eligible for consent-aware property alerts, market updates, equity conversations, events, and personal follow-up."],
              ["Learn", "Spend, outcomes, revenue, experiments, response time, and agent performance feed the next operator decision and approved platform conversion event."],
            ].map(([label, copy], index) => (
              <article key={label} className="rounded-xl border border-[#cda24a2b] bg-[#0c0a07] p-4">
                <p className="font-serif text-3xl text-[#4baab8]">0{index + 1}</p>
                <h3 className="mt-3 text-sm font-bold uppercase tracking-[0.15em] text-[#f0cf79]">{label}</h3>
                <p className="mt-3 text-xs leading-6 text-[#a89c8b]">{copy}</p>
              </article>
            ))}
          </div>
        </Panel>

        <footer className="mt-6 border-t border-white/10 py-6 text-xs leading-5 text-[#746d62]">
          Growth Intelligence is internal operational software. It is not a valuation engine, lending decision system,
          fair-housing targeting tool, legal advisor, or authority to contact consumers. Test and suppressed records remain excluded.
        </footer>
      </div>
    </main>
  );
}
