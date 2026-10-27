import type { AllocationWorkspaceState } from "./leadAllocationReadModel";
import type { AgentReadiness } from "./allocationReadiness";

/** An operational directory is not a professional-readiness attestation. Until
 * genuine versioned review records exist, legal/coverage/acceptance stay null.
 * In particular neither email nor SMS enrollment manufactures web eligibility. */
export function projectOperationalReadiness(state: AllocationWorkspaceState): AgentReadiness[] {
  return state.roster.map(agent => ({
    id: agent.id, name: agent.name, bound: agent.approved, paused: agent.paused,
    towns: [...agent.towns], intents: [...agent.intents], currentLoad: agent.currentLoad,
    outstanding: agent.outstanding, concurrentCap: agent.concurrentCap, dailyCap: agent.dailyCap,
    assignedToday: null, availableNow: null, license: null, coverage: null, acceptance: null,
    channels: { web: agent.approved, email: agent.channels.split(", ").includes("email enrolled"),
      sms: agent.channels.split(", ").includes("SMS verified") }, lastOfferedAt: null,
  }));
}
