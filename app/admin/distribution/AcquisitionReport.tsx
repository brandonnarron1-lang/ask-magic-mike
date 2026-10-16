import { ACQUISITION_PLACEMENTS, acquisitionBaselines, acquisitionTimestamp, MAX_ACQUISITION_RANGE_MS, type AcquisitionFilters, type AcquisitionPlacement } from "../../lib/growth/acquisition-window";
import type { AcquisitionReport as Report, AcquisitionCounts, AcquisitionOperatorCounts } from "../../lib/persistence/neonAcquisitionReport";
import type { OwnedDemandPublicationProofLedger } from "../../lib/persistence/neonOwnedDemandPublicationProofs";

function Operator({ name, counts }: { name: string; counts: AcquisitionOperatorCounts }) {
  return <div className="min-w-0 rounded-lg border border-white/10 p-3">
    <h4 className="font-semibold text-[#f4ead4]">{name}</h4>
    <p>{counts.inquiriesWithEnvelope} inquiries with an identified v6 envelope; {counts.noV6Recorded} without one recorded.</p>
    <p>{counts.envelopes} envelopes · {counts.providerAccepted} provider accepted · {counts.delivered} recipient-server delivered.</p>
    <p>{counts.pending} pending · {counts.retry} retry scheduled · {counts.failed} held/failed · {counts.unknown} delivery unconfirmed/unknown.</p>
    <p className="mt-2 text-[#a99f90]">Mailbox receipt: not observed by this report.</p>
  </div>;
}
function Delivery({ counts }: { counts: AcquisitionCounts }) {
  return <div className="mt-3 space-y-3 text-sm leading-6 [overflow-wrap:anywhere]">
    {counts.unknownOperatorEnvelopes > 0 ? <p role="status" className="text-[#f0cf79]">{counts.unknownOperatorEnvelopes} envelopes have unrecognized operator metadata. Mike/Brandon values below cover known tags only; zero is not complete operator coverage.</p> : null}
    <div className="grid gap-3 md:grid-cols-2"><Operator name="Mike" counts={counts.mike} /><Operator name="Brandon" counts={counts.brandon} /></div>
  </div>;
}
export function AcquisitionReport({ report, error, filters, ledger, now }: {
  report: Report | null; error?: string; filters: AcquisitionFilters;
  ledger: OwnedDemandPublicationProofLedger; now: Date;
}) {
  const baselines = acquisitionBaselines(ledger, now);
  const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#cda24a55] bg-[#090909] px-3 py-2 text-[#f4ead4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]";
  const scalar = (value: string | string[] | undefined, fallback = "") => typeof value === "string" ? value : fallback;
  const selectedBaseline=baselines[scalar(filters.placement) as AcquisitionPlacement];
  const baselineAvailable=Boolean(selectedBaseline && now.getTime()-Date.parse(selectedBaseline.observedAt)<=MAX_ACQUISITION_RANGE_MS);
  const eastern=(value:string)=>new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",dateStyle:"medium",timeStyle:"long"}).format(new Date(value));
  return <section aria-labelledby="acquisition-heading" className="mt-6 min-w-0 rounded-2xl border border-[#cda24a55] bg-[#0a0a0a] p-4 sm:p-6 [overflow-wrap:anywhere]">
    <p className="text-xs font-bold uppercase tracking-widest text-[#e2c06f]">Acquisition operations</p>
    <h2 id="acquisition-heading" className="mt-2 font-serif text-2xl text-[#f4ead4]">Inquiries, recorded contacts and operator delivery</h2>
    <p className="mt-2 text-sm leading-6 text-[#c9bdab]">Three published WordPress pages, five entry choices, three shared tracking tags. Exact full-cohort aggregates—not the legacy 5,000-record sample below.</p>
    <form method="get" action="/admin/distribution" className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Acquisition report filters">
      <label className="min-w-0 text-sm text-[#d8c8a9]">Inquiry window<select name="acq_window" className={inputClass} defaultValue={scalar(filters.window, "30")}>
        <option value="7">Last 7 days</option><option value="30">Last 30 days</option>
        <option value="baseline" disabled={!baselineAvailable}>Since verified live observation{baselineAvailable ? "" : " (proof/placement required)"}</option><option value="range">Explicit offset date range</option>
      </select></label>
      <label className="min-w-0 text-sm text-[#d8c8a9]">Placement<select name="acq_placement" className={inputClass} defaultValue={scalar(filters.placement, "all")}>
        <option value="all">All three tracking tags</option>{ACQUISITION_PLACEMENTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select></label>
      <label className="min-w-0 text-sm text-[#d8c8a9]">From (range only, with offset)<input name="acq_from" className={inputClass} placeholder="2026-10-15T09:00-04:00" defaultValue={acquisitionTimestamp(scalar(filters.from)) ?? ""} maxLength={35} /></label>
      <label className="min-w-0 text-sm text-[#d8c8a9]">To (exclusive, with offset)<input name="acq_to" className={inputClass} placeholder="2026-10-16T09:00-04:00" defaultValue={acquisitionTimestamp(scalar(filters.to)) ?? ""} maxLength={35} /></label>
      <button className="min-h-11 rounded-lg border border-[#cda24a] bg-[#cda24a] px-4 py-3 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]" type="submit">Read report</button>
    </form>
    <p className="mt-3 text-sm leading-6 text-[#a99f90]">7/30-day reports remain available without baseline proof. Explicit ranges are limited to 31 elapsed days.</p>
    <details className="mt-3 text-sm leading-6 text-[#c9bdab]"><summary className="min-h-11 cursor-pointer py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Baseline evidence availability</summary>
      <p>Baseline requires one placement and its existing live-observation proof; it is not first publication or causal lift. Select a placement and read its report before choosing an available baseline. Explicit offsets avoid daylight-saving ambiguity. An unavailable/capped proof ledger cannot establish the first retained observation.</p>
      {ACQUISITION_PLACEMENTS.map(p => <p key={p.key}>{p.label}: {baselines[p.key] ? `observed ${baselines[p.key]!.observedAt}; recorded ${baselines[p.key]!.recordedAt}` : "Unavailable—record a genuine current observation through the existing publication-proof form. No date is inferred."}</p>)}
    </details>
    {error ? <p role="alert" className="mt-4 text-[#f0cf79]">{error} No aggregate query was executed for these invalid filters.</p> : null}
    {report ? <>
      <p role="status" className="mt-4 text-sm leading-6 text-[#f0cf79]">Coverage: {report.coverage.toUpperCase()}{report.reason ? ` — ${report.reason}` : " — all eligible records in the selected window; no inquiry-row cap."}</p>
      <p className="mt-2 text-sm leading-6 text-[#c9bdab]">{report.window.label}. Acceptance: [{report.window.from}, {report.window.to}) UTC. America/New_York: {eastern(report.window.from)} to {eastern(report.window.to)} (end exclusive). Snapshot/generated: {report.generatedAt || "Unavailable"}. Delivery is current state at that snapshot, not historical as-of delivery.</p>
      <p className="mt-2 text-sm text-[#a99f90]">Authorized scope: {report.scope === "assigned_workspace" ? "your assigned workspace only" : "all eligible inquiries for the selected tracking tags"}. All distinct-contact totals are within this scope.</p>
      {report.window.baseline ? <p className="mt-2 text-sm text-[#a99f90]">Live observation {report.window.baseline.observedAt}; recorded {report.window.baseline.recordedAt}. Earliest retained matching tracking-tag proof, not necessarily this copy revision&apos;s first live time.</p> : null}
      {report.totals ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Exact acquisition summary">
          {[['Accepted eligible inquiries', report.totals.inquiries], ['Globally distinct recorded contacts', report.totals.contacts], ['Unresolved contact linkage', report.totals.unresolved]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-white/10 p-3"><p className="text-sm text-[#a99f90]">{label}</p><p className="mt-2 font-serif text-3xl text-[#f4ead4]">{value}</p></div>)}
        </div>
        <Delivery counts={report.totals} />
        <div className="mt-4" role="region" aria-label="Acquisition placement totals">
          <div className="space-y-3 text-sm leading-6 text-[#c9bdab] md:hidden" aria-label="Placement totals on narrow screens">
            {report.placements.map(row => {const p=ACQUISITION_PLACEMENTS.find(p=>p.key===row.key)!;return <article key={row.key} className="min-w-0 rounded-lg border border-white/10 p-3">
              <h3 className="font-semibold text-[#f4ead4]">{p.label} · page {p.page}</h3>
              <dl className="mt-2 space-y-1"><div><dt className="inline">Inquiries: </dt><dd className="inline font-semibold">{row.counts.inquiries}</dd></div><div><dt className="inline">Recorded contacts: </dt><dd className="inline font-semibold">{row.counts.contacts}</dd></div><div><dt className="inline">Unresolved linkage: </dt><dd className="inline font-semibold">{row.counts.unresolved}</dd></div></dl>
              <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Placement and operator detail</summary>
                <a href={p.pageUrl} className="inline-block min-h-11 py-2 underline">Public page</a><p>{p.destinations.join(" · ")}</p><p className="text-xs">{p.key}</p><Delivery counts={row.counts}/>
              </details>
            </article>;})}
          </div>
          <table className="hidden w-full table-fixed text-left text-sm leading-6 text-[#c9bdab] md:table">
            <caption className="py-3 text-left">Exact tracking-tag totals. A shared contact can appear in several rows; row contact counts must not be summed.</caption>
            <thead><tr><th scope="col" className="w-1/2 p-2">Placement</th><th scope="col" className="p-2">Inquiries</th><th scope="col" className="p-2">Contacts / unresolved</th></tr></thead>
            <tbody>{report.placements.map(row => { const p = ACQUISITION_PLACEMENTS.find(p => p.key === row.key)!; return <tr key={row.key} className="border-t border-white/10 align-top"><th scope="row" className="p-2 font-normal"><p className="font-semibold">{p.label} · page {p.page}</p><a href={p.pageUrl} className="inline-block min-h-11 py-2 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Public page</a><p>{p.destinations.join(" · ")}</p><p className="text-xs text-[#a99f90]">{p.key}</p><details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Operator detail</summary><Delivery counts={row.counts} /></details></th><td className="p-2">{row.counts.inquiries}</td><td className="p-2">{row.counts.contacts} / {row.counts.unresolved}</td></tr>; })}</tbody>
          </table>
        </div>
      </> : null}
    </> : null}
    <details className="mt-4 text-sm leading-6 text-[#a99f90]"><summary className="min-h-11 cursor-pointer py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Count and delivery definitions</summary><p>Definition: one durable accepted inquiry row; same-key replay adds none. Repeat property requests remain inquiries even when linked to one canonical contact ID. Test/suppressed records and spam/test statuses are excluded; declined contact permission alone is not an exclusion. Exact stored source=ourtownproperties, medium=owned_media, campaign=amm_owned_demand_2026 and the displayed content tag establish latest-touch attribution—not signed capture or causation. Homepage choices share one tag; this report does not invent a branch split. No v6 envelope recorded is not a failure or proof of eligibility; legacy/pre-cutoff records may intentionally have none. Provider acceptance, recipient-server delivery and mailbox receipt are different evidence.</p></details>
  </section>;
}
