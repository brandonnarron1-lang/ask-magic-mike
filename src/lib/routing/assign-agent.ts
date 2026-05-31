import type { Agent, RoutingDecision } from "@/types/domain.types";
import { SLA_ACCEPT_MS, SLA_CONTACT_MS } from "@/lib/scoring/constants";

function isAgentAvailable(agent: Agent): boolean {
  if (!agent.isActive) return false;
  if (agent.role === "admin") return false;
  if (agent.currentLoad >= agent.maxDailyLeads) return false;

  const now = new Date();
  const agentTime = new Date(
    now.toLocaleString("en-US", { timeZone: agent.timezone })
  );
  const day = agentTime
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase() as keyof Agent["availability"];
  const hour = agentTime.getHours();

  const window = agent.availability[day];
  if (!window) return false;

  const [start, end] = window;
  return hour >= start && hour < end;
}

export function assignAgent(
  agents: Agent[],
  context?: {
    preferredAgentId?: string;
    reason?: string;
  }
): RoutingDecision | null {
  // Prefer an explicitly requested agent if valid
  if (context?.preferredAgentId) {
    const preferred = agents.find(
      (a) => a.id === context.preferredAgentId && isAgentAvailable(a)
    );
    if (preferred) {
      return buildDecision(
        preferred,
        context.reason ?? "Manually assigned"
      );
    }
  }

  // Filter eligible agents
  const eligible = agents
    .filter(isAgentAvailable)
    .sort((a, b) => {
      // Sort: priority DESC, then current load ASC
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.currentLoad - b.currentLoad;
    });

  if (eligible.length === 0) return null;

  const selected = eligible[0];
  const reason = buildReason(selected, eligible.length);
  return buildDecision(selected, reason);
}

function buildDecision(agent: Agent, reason: string): RoutingDecision {
  return {
    agentId: agent.id,
    agentName: agent.name,
    agentEmail: agent.email,
    agentPriorityScore: agent.priorityScore,
    assignmentReason: reason,
    acceptDeadlineMs: SLA_ACCEPT_MS,
    contactDeadlineMs: SLA_CONTACT_MS,
  };
}

function buildReason(agent: Agent, eligibleCount: number): string {
  const parts: string[] = [
    `Selected from ${eligibleCount} eligible agent(s).`,
    `Priority score: ${agent.priorityScore}.`,
    `Current daily load: ${agent.currentLoad}/${agent.maxDailyLeads}.`,
    `Role: ${agent.role}.`,
  ];
  return parts.join(" ");
}

export function findAdminAgent(agents: Agent[]): Agent | null {
  return (
    agents.find(
      (a) => a.role === "admin" && a.isActive
    ) ?? null
  );
}
