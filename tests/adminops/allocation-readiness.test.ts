import { describe, expect, it } from "vitest";
import { agentReadinessHolds, simulateAllocation, type AgentReadiness, type RouteInquiry } from "../../app/lib/allocationReadiness";
import { projectOperationalReadiness } from "../../app/lib/allocationReadinessProjection";
import type { AllocationWorkspaceState } from "../../app/lib/leadAllocationReadModel";
const at = "2026-10-27T16:00:00.000Z";
const proof = { reference: "synthetic-review-v1", reviewedBy: "synthetic-broker", reviewedAt: "2026-10-26T00:00:00Z", expiresAt: "2026-10-28T00:00:00Z" };
const inquiry = (extra: Partial<RouteInquiry> = {}): RouteInquiry => ({ id: "inquiry-1", intent: "buyer", region: "NC", locality: "Wilson", responsibleOwnerId: null, inheritedOwner: false, requestedAgentId: null, representation: "clear", relationshipAgentId: null, contactHeld: false, ...extra });
const agent = (id = "a", extra: Partial<AgentReadiness> = {}): AgentReadiness => ({ id, name: "Synthetic agent", bound: true, paused: false, towns: ["Wilson"], intents: ["buyer"], currentLoad: 0, outstanding: 0, concurrentCap: 2, dailyCap: 5, assignedToday: 0, availableNow: true, license: { ...proof, regions: ["NC"], active: true, supervisionConfirmed: true }, coverage: { ...proof }, acceptance: { ...proof }, channels: { web: true, email: false, sms: false }, lastOfferedAt: null, ...extra });
const run = (lead = inquiry(), roster = [agent()]) => simulateAllocation({ inquiry: lead, roster, at, policyVersion: 2 });
describe("channel-independent, effect-free allocation explanation", () => {
  it("allows a genuinely reviewed web-only candidate without SMS or email enrollment", () => {
    expect(run()).toMatchObject({ mode: "OFF", status: "WOULD_ROUTE", selectedAgentId: "a", effects: "NONE" });
  });
  it("does not infer property jurisdiction from another area", () => {
    expect(run(inquiry({ region: null })).status).toBe("HELD");
    expect(run(inquiry({ region: "VA" })).selectedAgentId).toBeNull();
  });
  it.each(["unknown", "conflict"] as const)("holds %s representation, without substituting an agent", representation => {
    expect(run(inquiry({ representation }))).toMatchObject({ status: "HELD", selectedAgentId: null });
  });
  it("requires a real representing relationship and current eligible requested agent", () => {
    expect(run(inquiry({ representation: "represented" })).status).toBe("HELD");
    expect(run(inquiry({ requestedAgentId: "absent" })).status).toBe("HELD");
    expect(run(inquiry({ requestedAgentId: "b" }), [agent(), agent("b")]).selectedAgentId).toBe("b");
    expect(run(inquiry({ requestedAgentId: "b", relationshipAgentId: "a" }), [agent(), agent("b")]).selectedAgentId).toBe("a");
  });
  it.each([true, false])("preserves direct/inherited responsibility (%s), never silently reassigns", inheritedOwner => {
    expect(run(inquiry({ responsibleOwnerId: "mike", inheritedOwner, requestedAgentId: "a" }))).toMatchObject({ status: "PRESERVE_OWNER", responsibleOwnerId: "mike", selectedAgentId: null });
  });
  it.each([
    { bound: false }, { paused: true }, { license: null }, { coverage: null }, { acceptance: null },
    { availableNow: null }, { assignedToday: null }, { currentLoad: 2 }, { outstanding: 2 },
    { assignedToday: 4, outstanding: 1 }, { currentLoad: -1 }, { currentLoad: NaN },
    { license: { ...proof, regions: ["NC"], active: false, supervisionConfirmed: true } },
    { license: { ...proof, regions: ["NC"], active: true, supervisionConfirmed: false } },
    { acceptance: { ...proof, expiresAt: at } }, { acceptance: { ...proof, reviewedAt: "2026-10-28T00:00:00Z" } },
  ] satisfies Partial<AgentReadiness>[])("holds missing/revoked/expired/capacity evidence %#", extra => {
    expect(agentReadinessHolds(agent("a", extra), inquiry(), at).length).toBeGreaterThan(0);
    expect(run(inquiry(), [agent("a", extra)]).status).toBe("HELD");
  });
  it("is deterministic across pool order, repeat calls and equal timestamps; changes no counters", () => {
    const roster = [agent("b"), agent("a")], before = JSON.stringify(roster);
    expect(run(inquiry(), roster)).toEqual(run(inquiry(), [...roster].reverse()));
    expect(run(inquiry(), roster)).toEqual(run(inquiry(), roster));
    expect(run(inquiry(), [agent("a", { lastOfferedAt: at }), agent("b")]).selectedAgentId).toBe("b");
    expect(JSON.stringify(roster)).toBe(before);
  });
  it("has no LIVE mode or mutation capability; invalid observation and contact-held records fail closed", () => {
    expect(simulateAllocation({ inquiry: inquiry(), roster: [agent()], at: "invalid", policyVersion: 1 }).status).toBe("HELD");
    expect(run(inquiry({ contactHeld: true })).selectedAgentId).toBeNull();
    expect(simulateAllocation({ inquiry: inquiry(), roster: [], at, policyVersion: 1, mode: "SHADOW" })).toMatchObject({ status: "HELD", effects: "NONE" });
  });
  it("never upgrades enrollment, directory, towns or channels into reviewed license/coverage/acceptance", () => {
    const state = { roster: [{ id: "a", name: "Synthetic", approved: true, paused: false, towns: ["Wilson"], intents: ["buyer"], currentLoad: 0, outstanding: 0, concurrentCap: 2, dailyCap: 5, weight: 1, channels: "email enrolled, SMS verified" }] } as AllocationWorkspaceState;
    const projected = projectOperationalReadiness(state);
    expect(projected[0]).toMatchObject({ license: null, coverage: null, acceptance: null, assignedToday: null, availableNow: null, channels: { web: true, email: true, sms: true } });
    expect(run(inquiry(), projected).status).toBe("HELD");
  });
});
