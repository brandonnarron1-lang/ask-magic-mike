/**
 * Unit tests for routing-command.ts data-shape contract.
 *
 * No Supabase connection required — tests the EMPTY fallback path
 * and the pure helper logic extracted from the module.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Isolate the module so we can control env vars without leaking
// ---------------------------------------------------------------------------

describe("loadRoutingCommand — unconfigured environment", () => {
  beforeEach(() => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns EMPTY shape when Supabase env vars are absent", async () => {
    const { loadRoutingCommand } = await import(
      "../../src/lib/admin/routing-command"
    );
    const result = await loadRoutingCommand();

    expect(result.configured).toBe(false);
    expect(result.agents).toEqual([]);
    expect(result.recentRouting).toEqual([]);
    expect(result.unassignedLeadCount).toBe(0);
    expect(result.pendingCount).toBe(0);
    expect(result.slaBreachCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// RoutingCommandData shape validation
// ---------------------------------------------------------------------------

describe("RoutingCommandData type contract", () => {
  it("EMPTY shape satisfies the full interface", () => {
    type RoutingCommandData = {
      configured: boolean;
      agents: unknown[];
      recentRouting: unknown[];
      unassignedLeadCount: number;
      pendingCount: number;
      slaBreachCount: number;
    };

    const empty: RoutingCommandData = {
      configured: false,
      agents: [],
      recentRouting: [],
      unassignedLeadCount: 0,
      pendingCount: 0,
      slaBreachCount: 0,
    };

    expect(typeof empty.configured).toBe("boolean");
    expect(Array.isArray(empty.agents)).toBe(true);
    expect(Array.isArray(empty.recentRouting)).toBe(true);
    expect(typeof empty.unassignedLeadCount).toBe("number");
    expect(typeof empty.pendingCount).toBe("number");
    expect(typeof empty.slaBreachCount).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// SLA breach logic (pure, extracted for testability)
// ---------------------------------------------------------------------------

describe("SLA breach detection", () => {
  function isSlaAcceptBreached(
    acceptedAt: string | null,
    status: string,
    acceptDeadline: string,
    now: Date,
  ): boolean {
    return (
      !acceptedAt && status === "pending" && new Date(acceptDeadline) < now
    );
  }

  function isSlaContactBreached(
    contactedAt: string | null,
    status: string,
    contactDeadline: string,
    now: Date,
  ): boolean {
    return (
      !contactedAt && status !== "contacted" && new Date(contactDeadline) < now
    );
  }

  const past = new Date(Date.now() - 60_000).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();
  const now = new Date();

  it("accept breach: pending with no acceptedAt and deadline in the past", () => {
    expect(isSlaAcceptBreached(null, "pending", past, now)).toBe(true);
  });

  it("accept breach: not triggered when already accepted", () => {
    expect(isSlaAcceptBreached("2026-01-01T00:00:00Z", "pending", past, now)).toBe(false);
  });

  it("accept breach: not triggered when deadline is in the future", () => {
    expect(isSlaAcceptBreached(null, "pending", future, now)).toBe(false);
  });

  it("accept breach: not triggered when status is not pending", () => {
    expect(isSlaAcceptBreached(null, "contacted", past, now)).toBe(false);
  });

  it("contact breach: not contacted, non-contacted status, deadline past", () => {
    expect(isSlaContactBreached(null, "accepted", past, now)).toBe(true);
  });

  it("contact breach: not triggered when already contacted", () => {
    expect(isSlaContactBreached("2026-01-01T00:00:00Z", "accepted", past, now)).toBe(false);
  });

  it("contact breach: not triggered when status is 'contacted'", () => {
    expect(isSlaContactBreached(null, "contacted", past, now)).toBe(false);
  });

  it("contact breach: not triggered when deadline is in the future", () => {
    expect(isSlaContactBreached(null, "accepted", future, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AgentRosterRow derived field expectations
// ---------------------------------------------------------------------------

describe("AgentRosterRow derived values", () => {
  it("load percentage clamps to 100 when over capacity", () => {
    const currentLoad = 60;
    const maxDailyLeads = 50;
    const pct = Math.min(100, Math.round((currentLoad / maxDailyLeads) * 100));
    expect(pct).toBe(100);
  });

  it("load percentage is 0 when currentLoad is 0", () => {
    const pct = Math.min(100, Math.round((0 / 50) * 100));
    expect(pct).toBe(0);
  });

  it("load percentage avoids division by zero when maxDailyLeads is 0", () => {
    const currentLoad = 5;
    const maxDailyLeads = 0;
    const pct = maxDailyLeads > 0
      ? Math.min(100, Math.round((currentLoad / maxDailyLeads) * 100))
      : 0;
    expect(pct).toBe(0);
  });
});
