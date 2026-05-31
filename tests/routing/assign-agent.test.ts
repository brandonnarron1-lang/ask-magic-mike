import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { assignAgent } from "@/lib/routing/assign-agent";
import type { Agent } from "@/types/domain.types";

const NOW = new Date("2025-06-15T14:00:00-04:00"); // Sunday 2pm ET

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "agent-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Test Agent",
    email: "agent@example.com",
    phone: null,
    role: "primary",
    isActive: true,
    maxDailyLeads: 20,
    currentLoad: 0,
    priorityScore: 50,
    availability: { mon: [8, 18], tue: [8, 18], wed: [8, 18], thu: [8, 18], fri: [8, 18] },
    timezone: "America/New_York",
    notificationEmail: true,
    notificationSms: true,
    notificationPhone: null,
    ...overrides,
  };
}

describe("assignAgent", () => {
  beforeEach(() => {
    // Mock to a Wednesday at 10am ET so most agents are "available"
    vi.setSystemTime(new Date("2025-06-11T10:00:00-04:00"));
  });

  it("returns null when no agents are available", () => {
    const result = assignAgent([]);
    expect(result).toBeNull();
  });

  it("returns null when all agents are inactive", () => {
    const result = assignAgent([makeAgent({ isActive: false })]);
    expect(result).toBeNull();
  });

  it("returns null when all agents are at max load", () => {
    const result = assignAgent([makeAgent({ currentLoad: 20, maxDailyLeads: 20 })]);
    expect(result).toBeNull();
  });

  it("returns null when agent is admin role", () => {
    const result = assignAgent([makeAgent({ role: "admin" })]);
    expect(result).toBeNull();
  });

  it("selects the only available agent", () => {
    const agent = makeAgent({ id: "agent-1" });
    const result = assignAgent([agent]);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe("agent-1");
  });

  it("selects highest priority agent first", () => {
    const lowPriority = makeAgent({ id: "low", priorityScore: 30 });
    const highPriority = makeAgent({ id: "high", priorityScore: 90 });
    const result = assignAgent([lowPriority, highPriority]);
    expect(result!.agentId).toBe("high");
  });

  it("breaks priority tie by lower current load", () => {
    const loaded = makeAgent({ id: "loaded", priorityScore: 50, currentLoad: 10 });
    const fresh = makeAgent({ id: "fresh", priorityScore: 50, currentLoad: 0 });
    const result = assignAgent([loaded, fresh]);
    expect(result!.agentId).toBe("fresh");
  });

  it("includes SLA deadlines in the decision", () => {
    const agent = makeAgent();
    const result = assignAgent([agent]);
    expect(result!.acceptDeadlineMs).toBe(120000);  // 2 min
    expect(result!.contactDeadlineMs).toBe(300000); // 5 min
  });

  it("respects preferred agent when valid", () => {
    const agent1 = makeAgent({ id: "a1", priorityScore: 100 });
    const agent2 = makeAgent({ id: "a2", priorityScore: 50 });
    const result = assignAgent([agent1, agent2], {
      preferredAgentId: "a2",
    });
    expect(result!.agentId).toBe("a2");
  });

  it("falls back to normal selection when preferred agent is at max load", () => {
    const preferred = makeAgent({
      id: "pref",
      currentLoad: 20,
      maxDailyLeads: 20,
    });
    const backup = makeAgent({ id: "backup" });
    const result = assignAgent([preferred, backup], { preferredAgentId: "pref" });
    expect(result!.agentId).toBe("backup");
  });

  it("skips agents outside availability window", () => {
    vi.setSystemTime(new Date("2025-06-11T22:00:00-04:00")); // 10pm
    const nightAgent = makeAgent({
      id: "night",
      availability: { wed: [8, 18] }, // only 8am-6pm
    });
    const result = assignAgent([nightAgent]);
    expect(result).toBeNull();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
