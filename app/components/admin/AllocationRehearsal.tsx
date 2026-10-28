"use client";
import { useState } from "react";
import type { AllocationWorkspaceState } from "../../lib/leadAllocationReadModel";
import { projectOperationalReadiness } from "../../lib/allocationReadinessProjection";
import { rehearseAllocation } from "../../lib/allocationRehearsal";

export function AllocationRehearsal({ state }: { state: AllocationWorkspaceState }) {
  const [scope, setScope] = useState({ startsAt: "", endsAt: "", maxNewInquiries: 10, agentIds: [] as string[] });
  const [region, setRegion] = useState(""), [locality, setLocality] = useState(""), [intent, setIntent] = useState("buyer");
  const [result, setResult] = useState<ReturnType<typeof rehearseAllocation> | null>(null);
  // Bind this form to the loaded revision. A refreshed revision invalidates the
  // old result; edits discard it rather than leaving a stale favorable badge.
  const [revision] = useState(state.policy?.version ?? null);
  const currentResult = result && result.observedAt === state.observedAt && result.policyVersion === state.policy?.version ? result : null;
  const field = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#D9AF52]/40 bg-[#080A0B] px-3 py-3 text-base focus-visible:outline-2 focus-visible:outline-cyan-300";
  return <details className="mt-5 min-w-0 rounded-xl border border-[#D9AF52]/30 p-3" aria-label="Bounded routing rehearsal">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-cyan-300">Rehearse a bounded web-only policy</summary>
    <p className="text-sm leading-6">SHADOW rehearsal only · live allocation stays OFF. These are synthetic scenario fields, not edits to a saved inquiry, roster approval or a stored policy.</p>
    <p className="mt-2 text-sm leading-6 text-[#D9CEB8]">Snapshot: {state.observedAt || "not recorded; refresh required"}. Existing policy {state.policy ? `v${state.policy.version}` : "not available"}. At most two agents, ten future inquiries and seven days. This rehearsal enables no SMS or email transport.</p>
    <form className="mt-4 space-y-4" onSubmit={event => {
      event.preventDefault();
      setResult(rehearseAllocation({ observedAt: state.observedAt ?? null, readAvailable: state.ready && !state.error,
        policyVersion: state.policy?.version ?? null, expectedPolicyVersion: revision, scope,
        roster: projectOperationalReadiness(state), inquiry: { id: "synthetic-rehearsal-only", intent, region: region.trim() || null,
          locality: locality.trim() || null, responsibleOwnerId: null, inheritedOwner: false, requestedAgentId: null,
          representation: "clear", relationshipAgentId: null, contactHeld: false } }));
    }} onChange={() => setResult(null)}>
      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Proposed scope · not saved</legend>
        <label className="min-w-0 text-sm">Future inquiry cutoff (ISO date with timezone)<input className={field} value={scope.startsAt} placeholder="2026-10-28T09:00:00-04:00" maxLength={35} onChange={event => setScope({ ...scope, startsAt: event.target.value })}/></label>
        <label className="min-w-0 text-sm">Window ends (ISO date with timezone)<input className={field} value={scope.endsAt} placeholder="2026-10-29T09:00:00-04:00" maxLength={35} onChange={event => setScope({ ...scope, endsAt: event.target.value })}/></label>
        <label className="min-w-0 text-sm">Maximum new inquiries<input type="number" min={1} max={10} step={1} className={field} value={scope.maxNewInquiries} onChange={event => setScope({ ...scope, maxNewInquiries: Number(event.target.value) })}/></label>
      </fieldset>
      <fieldset><legend className="text-sm font-semibold">Existing operational bindings · not proof of readiness</legend>
        {state.roster.length ? state.roster.map(agent => <label key={agent.id} className="flex min-h-11 items-start gap-3 py-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-[#D9AF52]" checked={scope.agentIds.includes(agent.id)} onChange={event => setScope({ ...scope, agentIds: event.target.checked ? [...scope.agentIds, agent.id] : scope.agentIds.filter(id => id !== agent.id) })}/><span className="min-w-0 [overflow-wrap:anywhere]">{agent.name} · {agent.approved ? "operational binding" : "binding held"}{agent.paused ? " · paused" : ""}</span></label>) : <p className="mt-2 text-sm">No bindings loaded in this bounded read. No participant was invented.</p>}
      </fieldset>
      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Synthetic unassigned inquiry · relationship clear for this example only</legend>
        <label className="min-w-0 text-sm">Synthetic service<select className={field} value={intent} onChange={event => setIntent(event.target.value)}><option value="buyer">Buying help</option><option value="home_value">Home value review</option><option value="seller">Selling options</option><option value="renter">Rental-to-owner</option></select></label>
        <label className="min-w-0 text-sm">Synthetic property state<input className={field} value={region} maxLength={2} placeholder="NC" onChange={event => setRegion(event.target.value.toUpperCase())}/></label>
        <label className="min-w-0 text-sm">Synthetic property locality<input className={field} value={locality} maxLength={100} placeholder="Enter the example locality" onChange={event => setLocality(event.target.value)}/></label>
      </fieldset>
      <p className="text-sm leading-6 text-[#D9CEB8]">Do not enter customer details. No readiness evidence is editable here. An unknown or conflicting real relationship always requires review in the saved request.</p>
      <button type="submit" disabled={!state.ready || Boolean(state.error)} className="min-h-11 rounded-lg bg-[#D9AF52] px-4 py-3 text-sm font-semibold text-black disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-cyan-300">Run no-effect rehearsal</button>
    </form>
    {currentResult ? <section aria-label="Routing rehearsal result" className="mt-4 rounded-lg border border-cyan-300/30 p-3 text-sm leading-6 [overflow-wrap:anywhere]" role="status">
      <h4 className="font-semibold">{currentResult.status} · SHADOW · not saved</h4>
      <p>Effects: NONE. Live activation: unavailable from this rehearsal. Eligibility describes only the displayed snapshot, not a promise of staffing throughout the proposed window.</p>
      <ul className="mt-2 list-disc pl-5">{currentResult.holds.map(hold => <li key={hold}>{hold}</li>)}{currentResult.simulation?.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
      {currentResult.simulation?.candidates.map(agent => <div key={agent.id} className="mt-3"><p className="font-semibold">{agent.name} · {agent.eligible ? "eligible in this snapshot only" : "held"}</p><ul className="list-disc pl-5">{agent.holds.map(hold => <li key={hold}>{hold}</li>)}</ul></div>)}
      <p className="mt-3">{currentResult.nextStep}</p><p className="mt-2">{currentResult.continuity}</p>
      <a href="/admin/today" className="mt-2 inline-flex min-h-11 items-center underline focus-visible:outline-2 focus-visible:outline-cyan-300">Review existing obligations in Today</a>
    </section> : null}
  </details>;
}
