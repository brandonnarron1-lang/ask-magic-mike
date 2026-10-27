/** Pure, channel-independent review projection. It cannot create an offer or
 * authorize a claim. Existing transactional claim/consent checks remain final. */
export type ReadinessEvidence = {
  reference: string; reviewedBy: string; reviewedAt: string; expiresAt: string;
};
export type AgentReadiness = {
  id: string; name: string; bound: boolean; paused: boolean;
  towns: string[]; intents: string[];
  currentLoad: number; outstanding: number; concurrentCap: number;
  dailyCap: number; assignedToday: number | null;
  availableNow: boolean | null;
  /** Only genuine source-bound staff review can populate these. Directory or
   * channel enrollment is not a license, coverage approval, or acceptance. */
  license: (ReadinessEvidence & { regions: string[]; active: boolean; supervisionConfirmed: boolean }) | null;
  coverage: ReadinessEvidence | null;
  acceptance: ReadinessEvidence | null;
  channels: { web: boolean; email: boolean; sms: boolean };
  lastOfferedAt: string | null;
};
export type RouteInquiry = {
  id: string; intent: string; region: string | null; locality: string | null;
  responsibleOwnerId: string | null; inheritedOwner: boolean;
  requestedAgentId: string | null;
  representation: "unknown" | "clear" | "represented" | "conflict";
  relationshipAgentId: string | null; contactHeld: boolean;
};
export type RouteSimulation = {
  version: "allocation_readiness_v1"; mode: "OFF" | "SHADOW";
  policyVersion: number | null; observedAt: string;
  status: "HELD" | "WOULD_ROUTE" | "PRESERVE_OWNER";
  selectedAgentId: string | null; responsibleOwnerId: string | null;
  reasons: string[];
  candidates: Array<{ id: string; name: string; eligible: boolean; holds: string[]; channels: AgentReadiness["channels"] }>;
  effects: "NONE";
};
const validTime = (value: string) => Number.isFinite(Date.parse(value));
function current(evidence: ReadinessEvidence | null, now: number) {
  return Boolean(evidence && evidence.reference.trim() && evidence.reviewedBy.trim()
    && validTime(evidence.reviewedAt) && validTime(evidence.expiresAt)
    && Date.parse(evidence.reviewedAt) <= now && now < Date.parse(evidence.expiresAt));
}
function nonnegative(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}
export function agentReadinessHolds(agent: AgentReadiness, inquiry: RouteInquiry, at: string): string[] {
  const now = Date.parse(at), holds: string[] = [];
  if (!Number.isFinite(now)) return ["Observation time is unavailable."];
  if (!agent.bound) holds.push("Current authenticated agent binding is not approved.");
  if (agent.paused) holds.push("Agent is paused.");
  if (!current(agent.license, now) || !agent.license?.active || !agent.license.supervisionConfirmed)
    holds.push("Current license and required supervision review is missing or expired.");
  if (!inquiry.region || !agent.license?.regions.includes(inquiry.region)) holds.push("Property jurisdiction is not covered by verified licensure.");
  if (!current(agent.coverage, now)) holds.push("Broker-approved service and geographic coverage review is missing or expired.");
  if (!inquiry.locality || !agent.towns.includes(inquiry.locality)) holds.push("Explicit property-area coverage is not established.");
  if (!agent.intents.includes(inquiry.intent)) holds.push("Requested service is not in the reviewed coverage.");
  if (!current(agent.acceptance, now)) holds.push("Genuine operator acceptance is missing or expired.");
  if (agent.availableNow !== true) holds.push("Current working-hours availability is not established.");
  if (!nonnegative(agent.currentLoad) || !nonnegative(agent.outstanding) || !nonnegative(agent.concurrentCap)
    || agent.currentLoad + agent.outstanding >= agent.concurrentCap) holds.push("Concurrent capacity is unavailable or unknown.");
  if (!nonnegative(agent.assignedToday) || !nonnegative(agent.dailyCap) || agent.assignedToday + agent.outstanding >= agent.dailyCap)
    holds.push("Daily capacity is unavailable or unknown.");
  // Web is an authenticated operating channel, not a Twilio possession grant.
  if (!agent.channels.web) holds.push("Authenticated web operating access is unavailable.");
  return holds;
}

/** Stable round-robin explanation only. Explicit snapshots, no Date.now(), random,
 * fetch, storage, load increments, assignments, notification or audit writes. */
export function simulateAllocation(input: {
  inquiry: RouteInquiry; roster: AgentReadiness[]; at: string;
  policyVersion: number | null; mode?: "OFF" | "SHADOW";
}): RouteSimulation {
  const { inquiry, at } = input;
  const candidates = [...input.roster].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(agent => {
    const holds = agentReadinessHolds(agent, inquiry, at);
    return { id: agent.id, name: agent.name, eligible: holds.length === 0, holds, channels: { ...agent.channels } };
  });
  const base: RouteSimulation = { version: "allocation_readiness_v1", mode: input.mode || "OFF",
    policyVersion: input.policyVersion, observedAt: at, status: "HELD", selectedAgentId: null,
    responsibleOwnerId: inquiry.responsibleOwnerId, reasons: [], candidates, effects: "NONE" };
  if (!validTime(at)) return { ...base, reasons: ["Observation time is unavailable; retain current responsibility."] };
  if (input.policyVersion === null || !Number.isSafeInteger(input.policyVersion) || input.policyVersion < 1)
    return { ...base, reasons: ["A current versioned policy snapshot is unavailable; retain current responsibility."] };
  if (new Set(input.roster.map(agent => agent.id)).size !== input.roster.length)
    return { ...base, reasons: ["Conflicting roster identities require review; no selection was made."], candidates: candidates.map(agent => ({ ...agent, eligible: false, holds: [...agent.holds, "Conflicting roster identities."] })) };
  if (inquiry.contactHeld) return { ...base, reasons: ["Contact is held for this record; no new routing recommendation."] };
  if (inquiry.representation === "conflict") return { ...base, reasons: ["Representation conflict requires broker review; retain current responsibility."] };
  if (inquiry.representation === "unknown") return { ...base, reasons: ["Representation and relationship constraints are not recorded; broker review is required."] };
  if (!inquiry.region || !inquiry.locality) return { ...base, reasons: ["Explicit property jurisdiction and service area must be established; no location inference."] };
  // Existing ownership is responsibility, not proof of representation. Neither
  // inherited read access nor a new requested name permits automatic reassignment.
  if (inquiry.responsibleOwnerId) return { ...base, status: "PRESERVE_OWNER", reasons: [
    inquiry.inheritedOwner ? "Retain inherited canonical responsibility; no direct assignment was created." : "Retain existing direct responsibility; no reassignment was authorized.",
    "Review any requested agent or relationship change with the responsible broker.",
  ] };
  const eligible = input.roster.filter(agent => candidates.find(row => row.id === agent.id)?.eligible);
  const preferred = inquiry.relationshipAgentId || inquiry.requestedAgentId;
  if (inquiry.representation === "represented" && !inquiry.relationshipAgentId)
    return { ...base, reasons: ["Representing relationship is unresolved; broker review is required."] };
  if (preferred && !eligible.some(agent => agent.id === preferred))
    return { ...base, reasons: ["The relationship/requested agent is not currently eligible; do not silently substitute another agent."] };
  eligible.sort((a,b) => {
    // No offer is treated as oldest only for this explanation; it is not persisted.
    const aTime = a.lastOfferedAt && validTime(a.lastOfferedAt) ? Date.parse(a.lastOfferedAt) : -Infinity;
    const bTime = b.lastOfferedAt && validTime(b.lastOfferedAt) ? Date.parse(b.lastOfferedAt) : -Infinity;
    return aTime === bTime ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : aTime < bTime ? -1 : 1;
  });
  const selected = preferred ? eligible.find(agent => agent.id === preferred) : eligible[0];
  if (!selected) return { ...base, reasons: ["No genuinely eligible agent is established. Keep capture and current custodian alerts running; broker exception review is needed."] };
  return { ...base, status: "WOULD_ROUTE", selectedAgentId: selected.id, reasons: [
    inquiry.relationshipAgentId ? "Verified eligible existing relationship takes precedence." : inquiry.requestedAgentId ? "Verified eligible requested agent takes precedence." : "Eligible pool ordered by oldest offer, then stable agent ID (round robin).",
    "Simulation only. No offer, owner, capacity, task, audit or message was changed. Live activation requires a separately reviewed future-inquiry policy.",
  ] };
}
