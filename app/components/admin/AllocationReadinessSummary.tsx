import { projectOperationalReadiness } from "../../lib/allocationReadinessProjection";
import type { AllocationWorkspaceState } from "../../lib/leadAllocationReadModel";

export function AllocationReadinessSummary({ state }: { state: AllocationWorkspaceState }) {
  const roster = projectOperationalReadiness(state);
  return <section aria-label="Future routing readiness" className="mt-5 min-w-0 rounded-xl border border-[#D9AF52]/30 bg-[#080A0B] p-4 [overflow-wrap:anywhere]">
    <h3 className="font-semibold text-[#F5EAD1]">Future routing readiness</h3>
    <p className="mt-2 text-sm leading-6 text-[#D9CEB8]">New readiness policy: OFF. Read-only review; no offers, assignments, capacity changes or messages. Current intake and Mike/Brandon alerts continue.</p>
    <p className="mt-2 text-sm leading-6 text-[#D9CEB8]">Web operating access is separate from email and SMS enrollment. Carrier approval is not the missing professional-readiness evidence.</p>
    {state.error ? <p className="mt-3 text-sm text-[#ffd7d7]" role="status">Readiness unavailable: {state.error} No empty roster or zero load is inferred.</p> : <>
      <p className="mt-3 text-sm">{roster.length} operational bindings loaded (at most 50). None is promoted to professionally verified from directory or enrollment alone.</p>
      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#D9AF52] focus-visible:outline-2 focus-visible:outline-cyan-300">Review missing readiness evidence</summary>
        <ul className="space-y-3">{roster.map(agent => <li key={agent.id} className="rounded-lg border border-white/15 p-3 text-sm leading-6">
          <p className="font-semibold">{agent.name}</p>
          <p>Current web binding: {agent.bound ? "approved operational binding" : "held"}. Preference: {agent.paused ? "paused" : "not paused"}.</p>
          <p>License/supervision, broker-reviewed coverage and genuine operator acceptance: not recorded in this projection. Hours and daily assignment count: not established here.</p>
          <p>Existing load {agent.currentLoad} + {agent.outstanding} outstanding / {agent.concurrentCap} concurrent cap. These snapshots are not a claim-time capacity grant.</p>
        </li>)}</ul>
      </details>
    </>}
    <p className="mt-3 text-sm leading-6 text-[#D9CEB8]">One activation prerequisite: broker-reviewed, current license/supervision and coverage evidence, working hours/capacity, representation policy, and genuine participating-agent acceptance. A bounded future-inquiry policy needs its own exact scope; no backlog is moved.</p>
  </section>;
}
