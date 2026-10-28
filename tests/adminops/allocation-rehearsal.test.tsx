import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { rehearseAllocation, type AllocationRehearsalScope } from "../../app/lib/allocationRehearsal";
import { AllocationRehearsal } from "../../app/components/admin/AllocationRehearsal";
import { OfferDecision } from "../../app/components/admin/OfferDecision";
import { projectOperationalReadiness } from "../../app/lib/allocationReadinessProjection";
import { allocationWorkspaceFixture } from "../../app/lib/leadPresentationFixtures";
import type { AgentReadiness, RouteInquiry } from "../../app/lib/allocationReadiness";

const at = "2026-10-27T16:00:00.000Z";
const proof = { reference: "synthetic-only", reviewedBy: "synthetic-reviewer", reviewedAt: "2026-10-26T00:00:00Z", expiresAt: "2026-11-05T00:00:00Z" };
const agent: AgentReadiness = { id: "synthetic-agent", name: "SYNTHETIC", bound: true, paused: false, towns: ["Wilson"], intents: ["buyer"], currentLoad: 0, outstanding: 0, concurrentCap: 2, dailyCap: 5, assignedToday: 0, availableNow: true, license: { ...proof, regions: ["NC"], active: true, supervisionConfirmed: true }, coverage: proof, acceptance: proof, channels: { web: true, email: false, sms: false }, lastOfferedAt: null };
const inquiry: RouteInquiry = { id: "synthetic-inquiry", intent: "buyer", region: "NC", locality: "Wilson", responsibleOwnerId: null, inheritedOwner: false, requestedAgentId: null, representation: "clear", relationshipAgentId: null, contactHeld: false };
const scope: AllocationRehearsalScope = { startsAt: "2026-10-28T09:00:00-04:00", endsAt: "2026-10-29T09:00:00-04:00", maxNewInquiries: 10, agentIds: [agent.id] };
const input = () => ({ observedAt: at, policyVersion: 2, expectedPolicyVersion: 2, readAvailable: true, scope: { ...scope, agentIds: [...scope.agentIds] }, roster: [structuredClone(agent)], inquiry: { ...inquiry } });
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe("bounded web rehearsal, never activation", () => {
  it("reuses deterministic routing for a reviewed web-only synthetic scenario without storing or granting anything", () => {
    const fixture = input(), before = JSON.stringify(fixture);
    const result = rehearseAllocation(fixture);
    expect(result).toMatchObject({ status: "REHEARSED_ONLY", mode: "SHADOW", activationAllowed: false, saved: false, effects: "NONE", simulation: { selectedAgentId: agent.id, effects: "NONE" } });
    expect(rehearseAllocation(fixture)).toEqual(result); expect(JSON.stringify(fixture)).toBe(before);
  });
  it.each([
    { startsAt: "2026-10-26T09:00:00Z" }, { endsAt: scope.startsAt },
    { endsAt: "2026-11-05T09:00:00-04:00" }, { startsAt: "2026-10-28T09:00:00" },
    { startsAt: "2026-02-30T09:00:00Z" }, { maxNewInquiries: 0 }, { maxNewInquiries: 11 },
    { maxNewInquiries: 1.5 }, { agentIds: [] }, { agentIds: [agent.id, agent.id] },
    { agentIds: [agent.id, "b", "c"] }, { agentIds: ["invented"] },
  ] satisfies Partial<AllocationRehearsalScope>[])("holds invalid future scope %# before recommendation", extra => {
    const fixture = input(); fixture.scope = { ...fixture.scope, ...extra };
    expect(rehearseAllocation(fixture)).toMatchObject({ status: "HELD", activationAllowed: false, simulation: null });
  });
  it.each([{ observedAt: null }, { observedAt: "invalid" }, { readAvailable: false }, { policyVersion: null }, { expectedPolicyVersion: 1 }])("holds unavailable or changed snapshots %#", extra => {
    expect(rehearseAllocation({ ...input(), ...extra })).toMatchObject({ status: "HELD", simulation: null });
  });
  it("does not upgrade real operational enrollment to genuine readiness", () => {
    const fixture = input(); fixture.roster = projectOperationalReadiness({ ...allocationWorkspaceFixture, roster: [{ ...allocationWorkspaceFixture.roster[0], id: agent.id }] });
    const result = rehearseAllocation(fixture);
    expect(result).toMatchObject({ status: "HELD", activationAllowed: false, simulation: { selectedAgentId: null } });
    expect(result.simulation?.candidates[0].holds.join(" ")).toMatch(/license.*coverage.*acceptance.*availability/);
  });
  it.each([{ paused: true }, { bound: false }, { license: null }, { acceptance: null }, { outstanding: 2 }])("rechecks current candidate holds %#", extra => {
    const fixture = input(); fixture.roster[0] = { ...agent, ...extra };
    expect(rehearseAllocation(fixture)).toMatchObject({ status: "HELD", simulation: { selectedAgentId: null } });
  });
  it("preserves existing relationships and holds unknown/conflicting representation", () => {
    for (const representation of ["unknown", "conflict"] as const) expect(rehearseAllocation({ ...input(), inquiry: { ...inquiry, representation } }).status).toBe("HELD");
    expect(rehearseAllocation({ ...input(), inquiry: { ...inquiry, responsibleOwnerId: "existing-owner", inheritedOwner: true } })).toMatchObject({ activationAllowed: false, simulation: { status: "PRESERVE_OWNER", selectedAgentId: null } });
  });
  it("renders an unavailable snapshot truthfully, without an activation or contact action", () => {
    const html = renderToStaticMarkup(<AllocationRehearsal state={{ ...allocationWorkspaceFixture, ready: false, error: "unavailable" }}/>);
    expect(html).toContain("not recorded; refresh required"); expect(html).toContain("live allocation stays OFF");
    expect(html).toContain("<button type=\"submit\" disabled");
    expect(html).not.toContain("/api/"); expect(html).not.toMatch(/tel:|mailto:|sms:|localStorage|sessionStorage/);
  });
  it("runs locally, discards results after edits and hides results after snapshot/revision drift",()=>{
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
    const state={...allocationWorkspaceFixture,ready:true,observedAt:at};
    const {rerender}=render(<AllocationRehearsal state={state}/>);
    const button=screen.getByRole("button",{name:"Run no-effect rehearsal"});
    fireEvent.click(button);expect(screen.getByRole("status").textContent).toContain("HELD");
    fireEvent.change(screen.getByLabelText("Synthetic property locality"),{target:{value:"Synthetic change"}});
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(button);expect(screen.getByRole("status")).toBeTruthy();
    rerender(<AllocationRehearsal state={{...state,observedAt:"2026-10-27T16:01:00.000Z",policy:{...state.policy!,version:2}}}/>);
    expect(screen.queryByRole("status")).toBeNull();expect(fetch).not.toHaveBeenCalled();
  });
  it("describes a changed-eligibility claim truthfully and prevents a new action after the refusal",async()=>{
    const fetch=vi.fn().mockResolvedValue(Response.json({ok:false,error:"claim_eligibility_changed"},{status:409}));vi.stubGlobal("fetch",fetch);
    render(<OfferDecision id="synthetic-offer" version={2} active/>);
    fireEvent.click(screen.getByRole("button",{name:"Claim offer"}));
    const status=await screen.findByRole("status");expect(status.textContent).toContain("Coverage, service, working hours");
    expect(status.textContent).not.toContain("claim_eligibility_changed");expect(status.textContent).toContain("No message sent");
    expect(screen.getByRole("button",{name:"Claim offer"})).toBeDisabled();expect(screen.getByRole("button",{name:"Pass offer"})).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
