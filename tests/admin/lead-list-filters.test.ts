import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadLeadList, mapLeadListRow } from "@/lib/admin/lead-list";

// ---------------------------------------------------------------------------
// Supabase mock for filter-wiring tests (vi.mock is hoisted by vitest)
// ---------------------------------------------------------------------------

const lteMock = vi.fn();
const notFilterMock = vi.fn();
const eqMock = vi.fn();
const isMock = vi.fn();
const ltMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "leads") {
        return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
      }
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.range = () => q;
      q.order = () => q;
      q.eq = (...a: unknown[]) => { eqMock(...a); return q; };
      q.is = (...a: unknown[]) => { isMock(...a); return q; };
      q.lte = (...a: unknown[]) => { lteMock(...a); return q; };
      q.not = (...a: unknown[]) => { notFilterMock(...a); return q; };
      q.lt = (...a: unknown[]) => { ltMock(...a); return q; };
      q.gte = () => q;
      q.ilike = () => q;
      q.or = () => q;
      q.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: [], count: 0, error: null });
      return q;
    },
  }),
}));

describe("loadLeadList — mock mode (no Supabase)", () => {
  it("returns a stable empty shape when Supabase isn't configured", async () => {
    const r = await loadLeadList({ limit: 25 });
    expect(r.configured).toBe(false);
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.limit).toBe(25);
    expect(r.offset).toBe(0);
  });

  it("caps limit at 100", async () => {
    const r = await loadLeadList({ limit: 999 });
    expect(r.limit).toBeLessThanOrEqual(100);
  });

  it("never goes negative on offset", async () => {
    const r = await loadLeadList({ offset: -100 });
    expect(r.offset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mapLeadListRow — attribution and score supplement mapping
// ---------------------------------------------------------------------------

describe("mapLeadListRow — attribution supplement", () => {
  const baseRow: Record<string, unknown> = {
    id: "lead-abc",
    created_at: "2026-06-18T00:00:00Z",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    phone: null,
    lead_type: "seller",
    status: "new",
    lead_grade: "A",
    source: "organic",
    assigned_agent_id: null,
    last_contacted_at: null,
    spam_score: 0,
    city: "Wilson",
    state: "NC",
  };

  it("maps referrerType and isPaid from attribution supplement", () => {
    const row = mapLeadListRow(
      baseRow,
      { utm_source: "google", utm_medium: "cpc", utm_campaign: "spring", referrer_type: "paid", is_paid: true, landing_page: "/" },
      null
    );
    expect(row.referrerType).toBe("paid");
    expect(row.isPaid).toBe(true);
    expect(row.utmSource).toBe("google");
    expect(row.utmMedium).toBe("cpc");
    expect(row.utmCampaign).toBe("spring");
    expect(row.landingPage).toBe("/");
  });

  it("defaults referrerType to null and isPaid to false when no supplement", () => {
    const row = mapLeadListRow(baseRow, null, null);
    expect(row.referrerType).toBeNull();
    expect(row.isPaid).toBe(false);
    expect(row.utmSource).toBeNull();
    expect(row.utmMedium).toBeNull();
    expect(row.utmCampaign).toBeNull();
    expect(row.landingPage).toBeNull();
  });

  it("sets attributionEvidence=source_attribution when supplement present", () => {
    const row = mapLeadListRow(
      baseRow,
      { utm_source: null, utm_medium: null, utm_campaign: null, referrer_type: "direct", is_paid: false, landing_page: null },
      null
    );
    expect(row.attributionEvidence).toBe("source_attribution");
  });

  it("sets attributionEvidence=lead_row when no supplement but source set on lead", () => {
    const row = mapLeadListRow(baseRow, null, null);
    expect(row.attributionEvidence).toBe("lead_row");
  });

  it("sets attributionEvidence=none when no supplement and no source on lead", () => {
    const row = mapLeadListRow({ ...baseRow, source: null }, null, null);
    expect(row.attributionEvidence).toBe("none");
  });
});

describe("mapLeadListRow — score supplement", () => {
  const baseRow: Record<string, unknown> = {
    id: "lead-xyz",
    created_at: "2026-06-18T00:00:00Z",
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    lead_type: "buyer",
    status: "scored",
    lead_grade: null,
    source: null,
    assigned_agent_id: null,
    last_contacted_at: null,
    spam_score: null,
    city: null,
    state: null,
  };

  it("maps score and temperature from score supplement", () => {
    const row = mapLeadListRow(baseRow, null, { composite_score: 72, temperature: "hot" });
    expect(row.score).toBe(72);
    expect(row.temperature).toBe("hot");
  });

  it("defaults score and temperature to null when no supplement", () => {
    const row = mapLeadListRow(baseRow, null, null);
    expect(row.score).toBeNull();
    expect(row.temperature).toBeNull();
  });

  it("ignores non-numeric composite_score", () => {
    const row = mapLeadListRow(baseRow, null, { composite_score: null, temperature: "warm" });
    expect(row.score).toBeNull();
    expect(row.temperature).toBe("warm");
  });
});

// ---------------------------------------------------------------------------
// Filter wiring — followUpDue / neverContacted
// ---------------------------------------------------------------------------

describe("loadLeadList — followUpDue / neverContacted filter wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  afterEach(() => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns configured: true when Supabase is configured", async () => {
    const r = await loadLeadList({});
    expect(r.configured).toBe(true);
  });

  it("applies lte(next_follow_up_at) + not-null guard when followUpDue: true", async () => {
    await loadLeadList({ followUpDue: true });
    expect(lteMock).toHaveBeenCalledWith("next_follow_up_at", expect.any(String));
    expect(notFilterMock).toHaveBeenCalledWith("next_follow_up_at", "is", null);
  });

  it("applies eq(status=assigned) + is(last_contacted_at, null) + lt(created_at) when neverContacted: true", async () => {
    await loadLeadList({ neverContacted: true });
    expect(eqMock).toHaveBeenCalledWith("status", "assigned");
    expect(isMock).toHaveBeenCalledWith("last_contacted_at", null);
    expect(ltMock).toHaveBeenCalledWith("created_at", expect.any(String));
  });

  it("does not apply followUpDue filters when flag is absent", async () => {
    await loadLeadList({});
    expect(lteMock).not.toHaveBeenCalledWith("next_follow_up_at", expect.any(String));
    expect(notFilterMock).not.toHaveBeenCalled();
  });

  it("does not apply neverContacted filters when flag is absent", async () => {
    await loadLeadList({});
    expect(isMock).not.toHaveBeenCalledWith("last_contacted_at", null);
    expect(ltMock).not.toHaveBeenCalledWith("created_at", expect.any(String));
  });
});
