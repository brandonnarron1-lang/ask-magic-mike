import { simulateAllocation, type AgentReadiness, type RouteInquiry } from "./allocationReadiness";
import { z } from "zod";

export type AllocationRehearsalScope = {
  startsAt: string;
  endsAt: string;
  maxNewInquiries: number;
  agentIds: string[];
};

/** A bounded, effect-free rehearsal, not a saved policy or activation receipt.
 * Actor authorization and the operational snapshot belong to the existing
 * Allocation page. Never accepts license/coverage attestations from a form. */
export function rehearseAllocation(input: {
  observedAt: string | null;
  policyVersion: number | null;
  expectedPolicyVersion: number | null;
  readAvailable: boolean;
  scope: AllocationRehearsalScope;
  roster: AgentReadiness[];
  inquiry: RouteInquiry;
}) {
  const { scope } = input;
  const at = Date.parse(input.observedAt || "");
  const zonedTime = z.string().datetime({ offset: true });
  const start = zonedTime.safeParse(scope.startsAt).success ? Date.parse(scope.startsAt) : NaN;
  const end = zonedTime.safeParse(scope.endsAt).success ? Date.parse(scope.endsAt) : NaN;
  const holds: string[] = [];
  if (!input.readAvailable || !Number.isFinite(at)) holds.push("Current authorized policy/roster read is unavailable. Refresh Allocation; no empty roster is inferred.");
  if (!Number.isSafeInteger(input.policyVersion) || input.policyVersion === null || input.policyVersion < 1
    || input.policyVersion !== input.expectedPolicyVersion) holds.push("Policy revision is missing or changed. Reopen the rehearsal from current Allocation.");
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < at || end <= start || end - start > 7 * 24 * 60 * 60 * 1000)
    holds.push("Choose a future inquiry cutoff and a positive window no longer than seven days, with an explicit timezone.");
  if (!Number.isSafeInteger(scope.maxNewInquiries) || scope.maxNewInquiries < 1 || scope.maxNewInquiries > 10)
    holds.push("The rehearsal cap must be one through ten new inquiries; existing inquiries are never included.");
  if (!scope.agentIds.length || scope.agentIds.length > 2 || new Set(scope.agentIds).size !== scope.agentIds.length)
    holds.push("Select one or two distinct existing operational bindings, not an invented participant.");
  if (new Set(input.roster.map(agent => agent.id)).size !== input.roster.length
    || scope.agentIds.some(id => !input.roster.some(agent => agent.id === id)))
    holds.push("A selected agent is absent or the current roster has conflicting identities. No substitute was selected.");
  const roster = input.roster.filter(agent => scope.agentIds.includes(agent.id));
  // Invalid scope cannot fall through to a favorable routing recommendation.
  const simulation = holds.length ? null : simulateAllocation({
    inquiry: input.inquiry, roster, at: input.observedAt!, policyVersion: input.policyVersion, mode: "SHADOW",
  });
  return {
    version: "allocation_rehearsal_v1" as const,
    mode: "SHADOW" as const,
    saved: false as const,
    activationAllowed: false as const,
    effects: "NONE" as const,
    observedAt: input.observedAt,
    policyVersion: input.policyVersion,
    scope: { ...scope, agentIds: [...scope.agentIds] },
    status: holds.length || simulation?.status === "HELD" ? "HELD" as const : "REHEARSED_ONLY" as const,
    holds,
    simulation,
    nextStep: "Keep live allocation OFF. Review the genuine broker policy, license/supervision, service coverage, staffed hours/capacity and participant acceptance. A rehearsal cannot activate, claim or contact.",
    continuity: "Existing responsibility, follow-ups, appointments, intake and Mike/Brandon alerts are unchanged. Use the saved request and Today for real obligations.",
  };
}
