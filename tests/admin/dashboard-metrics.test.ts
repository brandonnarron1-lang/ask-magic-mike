/**
 * Tests for loadDashboardMetrics — specifically the daily-ops fields
 * added in the daily-operations-v1 milestone:
 *   followUpDue    — leads with next_follow_up_at <= now
 *   neverContacted — assigned leads with no last_contacted_at, created > 2h ago
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const followUpCountMock = vi.fn();
const neverContactedCountMock = vi.fn();
const leadSelectMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "leads") throw new Error(`Unexpected table: ${table}`);
      return {
        // Wide slice for totals
        select: (cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === "exact" && opts?.head) {
            // Count queries — distinguish by the chain of calls
            // We return a builder that inspects which filters are applied
            let isFollowUp = false;
            let isNeverContacted = false;
            const builder = {
              lte: (_col: string, _val: string) => { isFollowUp = true; return builder; },
              not: () => builder,
              eq: (_col: string, val: string) => { if (val === "assigned") isNeverContacted = true; return builder; },
              is: () => builder,
              lt: () => builder,
              then: (resolve: (v: unknown) => void) => {
                if (isFollowUp) resolve(followUpCountMock());
                else if (isNeverContacted) resolve(neverContactedCountMock());
                else resolve({ count: 0, error: null });
              },
            };
            return builder;
          }
          // Wide slice
          return leadSelectMock();
        },
      };
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSelectChain(rows: Record<string, unknown>[]): any {
  const chain = {
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain;
}

import { loadDashboardMetrics } from "@/lib/admin/dashboard-metrics";

describe("loadDashboardMetrics — daily-ops fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    leadSelectMock.mockReturnValue(makeSelectChain([]));
    followUpCountMock.mockReturnValue({ count: 0, error: null });
    neverContactedCountMock.mockReturnValue({ count: 0, error: null });
  });

  it("returns followUpDue=0 and neverContacted=0 when both queries return 0", async () => {
    const m = await loadDashboardMetrics();
    expect(m.configured).toBe(true);
    expect(m.totals.followUpDue).toBe(0);
    expect(m.totals.neverContacted).toBe(0);
  });

  it("surfaces followUpDue count from DB", async () => {
    followUpCountMock.mockReturnValue({ count: 7, error: null });
    const m = await loadDashboardMetrics();
    expect(m.totals.followUpDue).toBe(7);
  });

  it("surfaces neverContacted count from DB", async () => {
    neverContactedCountMock.mockReturnValue({ count: 3, error: null });
    const m = await loadDashboardMetrics();
    expect(m.totals.neverContacted).toBe(3);
  });

  it("returns both fields in empty state when Supabase not configured", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    const m = await loadDashboardMetrics();
    expect(m.configured).toBe(false);
    expect(m.totals.followUpDue).toBe(0);
    expect(m.totals.neverContacted).toBe(0);
  });

  it("treats null count as 0 (graceful DB error)", async () => {
    followUpCountMock.mockReturnValue({ count: null, error: { message: "timeout" } });
    const m = await loadDashboardMetrics();
    expect(m.totals.followUpDue).toBe(0);
  });
});
