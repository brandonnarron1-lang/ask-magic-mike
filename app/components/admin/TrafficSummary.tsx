import type { TrafficReport } from "../../lib/persistence/neonTrafficReport";
export function TrafficSummary({ report }: {report: TrafficReport}) {
  const m=report.metrics;
  return <section className="mt-6 rounded-2xl border border-[#cda24a55] p-4 sm:p-6" aria-label="Public traffic measurement">
    <h2 className="font-serif text-2xl text-[#f4ead4]">Public traffic and request readiness</h2>
    <p role="status" className="mt-3 text-sm leading-6">{report.coverage.toUpperCase()} · {report.reason}</p>
    <p className="mt-2 break-words text-xs">[{report.from}, {report.to}) · snapshot {report.generatedAt || "unavailable"}</p>
    {m ? <dl className="mt-4 grid gap-4 sm:grid-cols-3">{[
      ["Recorded top-level page views",m.pageViews],["Measured visits / sessions (consented)",m.identifiedViews?m.visits:"UNKNOWN"],
      ["Estimated unique browsers (consented)",m.identifiedViews?m.browsers:"UNKNOWN"],["Recorded form starts (not people)",m.starts],
      ["Embedded views / starts",m.embeddedViews+" / "+m.embeddedStarts],["Durable eligible inquiries / contacts",m.inquiries+" / "+m.contacts],
      ["Cash / Home Value / buyer / other",m.cashReview+" / "+m.homeValue+" / "+m.buyer+" / "+m.other],
      ["Review facts complete (not buyer eligibility)",m.reviewFactsComplete],["Unassigned / failed alert envelopes",m.unassigned+" / "+m.failedAlerts],
      ["Recorded human responses",m.recordedResponses],["Appointment requested / confirmed",m.appointmentsRequested+" / "+m.appointmentsConfirmed]
    ].map(([label,value])=><div key={label}><dt className="text-xs text-[#d9ceb8]">{label}</dt><dd className="mt-2 text-xl text-[#f4ead4]">{value}</dd></div>)}</dl>:null}
    <details className="mt-4 text-sm leading-6"><summary className="min-h-11 cursor-pointer py-3">Definitions and limitations</summary>
      <p>Views count hydrated public pathname transitions, including refresh; not prefetches. Remounts and query/hash-only changes do not add a view. Known staff, QA, previews and automation are excluded, not all possible bots/operators. Embedded loads remain separate.</p>
      <p>Consented first-party visit IDs expire after 30 idle minutes per tab; browser IDs after 90 days. These estimate browsers, never exact humans. Storage denial leaves unlinked events. {m?.identifiedViews ?? "UNKNOWN"} top-level views carried a visit ID. Starts are first input per mounted form. Anonymous activity creates no lead or contact.</p>
      <p>Inquiry eligibility excludes test/suppressed/spam/internal-QA records; consent refusal alone is not excluded. Repeat inquiries count separately; distinct contact IDs count once. Review completeness means supplied address, relationship, representation and timing; not an offer, readiness score or license approval. Delivery and outcomes are current recorded state for this capture cohort. No conversion rate is inferred across incompatible populations.</p>
    </details>
  </section>;
}
