/**
 * Tests for admin + agent workflow navigation links.
 * Verifies the daily ops click path is discoverable from each key page.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const read = (rel: string) =>
  readFileSync(path.resolve(__dirname, "../../src", rel), "utf8");

// ── Admin: Leads Inbox ───────────────────────────────────────────────────────

describe("admin/leads/page.tsx — workflow nav", () => {
  const src = read("app/(admin)/admin/leads/page.tsx");

  it("links to Lead Ops Queue", () => {
    expect(src).toContain("/admin/ops");
  });

  it("links to Agent Routing", () => {
    expect(src).toContain("/admin/routing");
  });

  it("links to Launch Control", () => {
    expect(src).toContain("/admin/launch");
  });
});

// ── Admin: Lead Detail ───────────────────────────────────────────────────────

describe("admin/leads/[id]/page.tsx — workflow nav", () => {
  const src = read("app/(admin)/admin/leads/[id]/page.tsx");

  it("links back to Lead Ops Queue", () => {
    expect(src).toContain("/admin/ops");
  });

  it("links forward to Agent Routing", () => {
    expect(src).toContain("/admin/routing");
  });

  it("imports Link from next/link", () => {
    expect(src).toMatch(/import Link from ["']next\/link["']/);
  });
});

// ── Admin: Routing Command ───────────────────────────────────────────────────

describe("admin/routing/page.tsx — workflow nav", () => {
  const src = read("app/(admin)/admin/routing/page.tsx");

  it("links back to Lead Ops Queue", () => {
    expect(src).toContain("/admin/ops");
  });

  it("links to Leads Inbox", () => {
    expect(src).toContain("/admin/leads");
  });

  it("links to Launch Control", () => {
    expect(src).toContain("/admin/launch");
  });

  it("links to agent portal from active agent cards", () => {
    expect(src).toContain("/agent?agent_id=");
  });
});

// ── Admin: Launch Control ─────────────────────────────────────────────────────

describe("admin/launch/page.tsx — workflow nav", () => {
  const src = read("app/(admin)/admin/launch/page.tsx");

  it("links to Lead Ops Queue", () => {
    expect(src).toContain("/admin/ops");
  });

  it("links to Agent Routing", () => {
    expect(src).toContain("/admin/routing");
  });
});

// ── Admin: Lead Ops Queue ─────────────────────────────────────────────────────

describe("admin/ops/page.tsx — workflow nav", () => {
  const src = read("app/(admin)/admin/ops/page.tsx");

  it("links to Launch Control", () => {
    expect(src).toContain("/admin/launch");
  });

  it("links to Leads Inbox", () => {
    expect(src).toContain("/admin/leads");
  });

  it("links to Agent Routing", () => {
    expect(src).toContain("/admin/routing");
  });

  it("queue rows use detailUrl from OpsQueueItem to link to lead pages", () => {
    expect(src).toContain("item.detailUrl");
  });
});

// ── Agent: Lead Detail ────────────────────────────────────────────────────────

describe("agent/leads/[id]/page.tsx — workflow nav", () => {
  const src = read("app/(agent)/agent/leads/[id]/page.tsx");

  it("has Mark Contacted quick action", () => {
    expect(src).toContain("/contact");
  });

  it("has Set Follow-up quick action", () => {
    expect(src).toContain("/follow-up");
  });

  it("has back link to agent lead queue", () => {
    expect(src).toContain("/agent/leads");
  });

  it("enforces ownership check before showing lead data", () => {
    expect(src).toContain("agentOwnsLead");
  });
});

// ── Agent: Tasks ──────────────────────────────────────────────────────────────

describe("agent task-list.tsx — workflow nav", () => {
  const src = read("components/agent/task-list.tsx");

  it("tasks with a leadId link to the agent lead detail page", () => {
    expect(src).toContain("/agent/leads/");
    expect(src).toContain("task.leadId");
  });
});
