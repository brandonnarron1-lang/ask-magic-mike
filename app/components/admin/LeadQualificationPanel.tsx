import type { LeadQualificationDossier, QualificationField } from "../../lib/leadQualificationDossier";
import type { RouteSimulation } from "../../lib/allocationReadiness";
import { leadRequestLabel, leadTimelineLabel } from "../../lib/leadReadability";

function value(field: QualificationField<string | number | boolean>): string {
  return field.state === "unknown" ? "Not recorded" : String(field.value);
}
function Fact({ label, fact }: { label: string; fact: QualificationField<string | number | boolean> }) {
  return <div className="min-w-0"><dt className="text-sm text-[#D9CEB8]">{label}</dt><dd className="mt-1 text-sm text-[#F5EAD1]">{value(fact)}{fact.state === "fact" ? <span className="mt-1 block text-xs text-[#D9CEB8]">Client-reported / retained entry · {fact.evidence.map(item => item.field).join(", ")}</span> : null}</dd></div>;
}
/** Server-rendered only after the canonical scoped detail load; enclosed by the
 * existing revocation-aware LeadContactDisclosure, never a pre-claim/audit DTO. */
export function LeadQualificationPanel({ dossier, simulation }: { dossier: LeadQualificationDossier; simulation: RouteSimulation | null }) {
  const fields = [
    ["Property / request address", dossier.property.address], ["Unit", dossier.property.unit],
    ["Country", dossier.property.country], ["State / region", dossier.property.region],
    ["Locality", dossier.property.locality], ["County", dossier.property.county],
    ["Representation", dossier.agency.representation], ["Requested agent", dossier.agency.requestedAgent],
    ["Established agency relationship", dossier.agency.relationship],
    ["Stated condition", dossier.enteredFacts.condition], ["Stated financing (not verified)", dossier.enteredFacts.financing],
    ["Stated preapproval (not verified)", dossier.enteredFacts.preapproval],
  ] as const;
  const action = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D9AF52]/40 px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300";
  return <section aria-label="Qualification and routing" id="qualification-review" className="min-w-0 rounded-xl border border-[#D9AF52]/35 bg-[#121619] p-4 text-[#F5EAD1] [overflow-wrap:anywhere]">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#D9AF52]">Facts before routing</p>
    <h2 className="mt-2 text-xl font-semibold">Qualification snapshot</h2>
    <p className="mt-2 text-sm leading-6 text-[#D9CEB8]">{leadRequestLabel(dossier.intent.value === null ? null : String(dossier.intent.value))} · {dossier.timeframe.text.value || leadTimelineLabel(dossier.timeframe.months.value)}</p>
    <p className="mt-2 text-sm leading-6">Responsibility: {dossier.ownership.kind === "inherited" ? "inherited from the canonical lead (read access only)" : dossier.ownership.kind === "direct" ? "existing direct assignment retained" : "not assigned; current custodian workflow retained"}. Assignment is not proof of representation.</p>
    <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-300/5 p-3 text-sm leading-6">{dossier.holds.length ? dossier.nextStep.message : dossier.jurisdiction.ncHumanReviewRequired ? "Client-reported NC property. Broker agency review is needed before confidential discussion; representation is not established." : dossier.nextStep.message}</p>
    <nav aria-label="Qualification next steps" className="mt-3 flex flex-wrap gap-3"><a href="#follow-up" className={action}>Review follow-up</a><a href="/admin/today" className={action}>Open Today</a></nav>
    {dossier.jurisdiction.reference ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300">NC agency review guidance</summary><p className="text-sm leading-6 text-[#D9CEB8]">{dossier.jurisdiction.message}</p><p className="mt-2 text-sm"><a className="underline focus-visible:outline-2 focus-visible:outline-cyan-300" href={dossier.jurisdiction.reference.url} target="_blank" rel="noopener noreferrer">NCREC review reference</a> · observed {dossier.jurisdiction.reference.observedOn}; not a completed broker review.</p></details> : <p className="mt-2 text-sm leading-6 text-[#D9CEB8]">{dossier.jurisdiction.message}</p>}
    <details className="mt-4 rounded-lg border border-white/15 px-3">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300">Facts and evidence</summary>
      <p className="mb-3 text-sm leading-6 text-[#D9CEB8]">Retained on this inquiry, not independently verified. A desired area or listing link does not establish property jurisdiction, ownership or availability.</p>
      <dl className="grid gap-4 pb-4 sm:grid-cols-2">{fields.map(([label, fact]) => <Fact key={label} label={label} fact={fact}/>)}</dl>
      {dossier.buyerInterest.kind === "search" ? <dl className="pb-4"><Fact label="Desired search area (not property jurisdiction)" fact={dossier.buyerInterest.desiredArea}/></dl> : null}
      {dossier.buyerInterest.kind === "specific" ? <p className="pb-4 text-sm">{dossier.buyerInterest.properties.length} submitted property interest(s). Review the original saved interest above; no listing availability is inferred.</p> : null}
      <p className="pb-3 text-xs leading-5 text-[#D9CEB8]">Evidence time is inquiry creation, not a field verification date.</p><details className="pb-4"><summary className="min-h-11 cursor-pointer py-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan-300">Projection limits</summary><p className="text-xs leading-5 text-[#D9CEB8]">{dossier.limitations.join(" ")}</p></details>
    </details>
    {simulation ? <details className="mt-3 rounded-lg border border-white/15 px-3" open>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300">Routing simulation · {simulation.status}</summary>
      <p className="text-sm leading-6">{simulation.mode} · policy {simulation.policyVersion === null ? "not available" : `v${simulation.policyVersion}`} · effects: {simulation.effects}. No new routing is enabled by this view.</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">{simulation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      <details className="my-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300">Agent-by-agent readiness explanation ({simulation.candidates.length})</summary>
        {simulation.candidates.length ? <ul className="space-y-3 pb-3">{simulation.candidates.map(agent => <li key={agent.id} className="rounded-lg border border-white/15 p-3 text-sm leading-6"><p className="font-semibold">{agent.name} · {agent.eligible ? "eligible in this snapshot only" : "held"}</p><ul className="mt-1 list-disc pl-5">{agent.holds.map(hold => <li key={hold}>{hold}</li>)}</ul><p className="mt-2 text-[#D9CEB8]">Web binding {agent.channels.web ? "available" : "held"}; email {agent.channels.email ? "enrolled" : "not enrolled"}; SMS {agent.channels.sms ? "enrolled" : "not enrolled"}. A transport grant is not professional readiness.</p></li>)}</ul> : <p className="pb-3 text-sm">No current operational bindings available in this bounded read; this is not proof that no agents exist.</p>}
      </details>
    </details> : <p className="mt-3 text-sm leading-6 text-[#D9CEB8]">Routing readiness is reviewed by an authorized administrator. Your contact and record permissions are unchanged.</p>}
    <p className="mt-3 text-sm leading-6 text-[#D9CEB8]">Use the existing contact-permission review above before any human outreach. Opening a composer is not a sent message or a human response. Record the actual result and next task only after it occurs.</p>
  </section>;
}
