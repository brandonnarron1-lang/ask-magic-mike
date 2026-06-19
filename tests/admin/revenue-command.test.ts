/**
 * Tests for src/lib/admin/revenue-command.ts
 *
 * All tests mock the Supabase client — no network calls, no env vars needed.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import { loadRevenueCommand, isSyntheticEmail } from "@/lib/admin/revenue-command";

// ---------------------------------------------------------------------------
// Mock builder helpers
// ---------------------------------------------------------------------------

interface LeadRow {
  id: string;
  created_at: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  assigned_agent_id: string | null;
  status: string;
}

interface AttrRow {
  lead_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_type: string | null;
  created_at: string;
}

interface ScoreRow {
  lead_id: string;
  composite_score: number | null;
  temperature: string | null;
}

interface RoutingRow {
  lead_id: string;
  assigned_agent_id: string | null;
  status: string;
  created_at: string;
}

function makeLeadRow(override: Partial<LeadRow> & { id: string }): LeadRow {
  return {
    created_at: new Date(Date.now() - 60_000).toISOString(),
    first_name: "Test",
    email: "real@test-domain.com",
    phone: "555-0100",
    assigned_agent_id: null,
    status: "new",
    ...override,
  };
}

function makeAttrRow(override: Partial<AttrRow> & { lead_id: string }): AttrRow {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer_type: null,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    ...override,
  };
}

function makeScoreRow(override: Partial<ScoreRow> & { lead_id: string }): ScoreRow {
  return {
    composite_score: null,
    temperature: null,
    ...override,
  };
}

/**
 * Build a mock Supabase client.
 * `leadsData`  — rows returned by `.from("leads")` (both the 30-day fetch and the synthetic scan)
 * `attrData`   — rows returned by `.from("source_attribution")`
 * `scoreData`  — rows returned by `.from("lead_scores")`
 * `routingData`— rows returned by `.from("lead_routing")`, or null to simulate error
 */
function makeClient({
  leadsData = [] as LeadRow[],
  attrData = [] as AttrRow[],
  scoreData = [] as ScoreRow[],
  routingData = null as RoutingRow[] | null,
} = {}) {
  const fromFn = vi.fn((table: string) => {
    if (table === "leads") {
      return makeChain(leadsData);
    }
    if (table === "source_attribution") {
      return makeChain(attrData);
    }
    if (table === "lead_scores") {
      return makeChain(scoreData);
    }
    if (table === "lead_routing") {
      if (routingData === null) {
        // Simulate table-not-found error
        return makeErrorChain("relation does not exist");
      }
      return makeChain(routingData);
    }
    return makeChain([]);
  });

  return { from: fromFn };
}

/** A chainable query builder that always resolves with the given rows. */
function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "gte", "lte", "in", "order", "limit", "eq", "is"];
  for (const m of methods) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  // Make it thenable so `await client.from(...).select(...)...` works
  chain.then = (resolve: (v: { data: unknown[]; error: null; count?: number }) => void) => {
    resolve({ data: rows, error: null, count: rows.length });
    return Promise.resolve();
  };
  return chain;
}

/** A chainable query builder that always resolves with an error. */
function makeErrorChain(message: string) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "gte", "lte", "in", "order", "limit", "eq", "is"];
  for (const m of methods) {
    chain[m] = vi.fn((..._args: unknown[]) => chain);
  }
  chain.then = (resolve: (v: { data: null; error: { message: string } }) => void) => {
    resolve({ data: null, error: { message } });
    return Promise.resolve();
  };
  return chain;
}

// ---------------------------------------------------------------------------
// isSyntheticEmail unit tests
// ---------------------------------------------------------------------------

describe("isSyntheticEmail", () => {
  it("returns false for a normal email", () => {
    expect(isSyntheticEmail("jane@realty.com")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSyntheticEmail(null)).toBe(false);
  });

  it("detects amm-wordpress-smoke marker", () => {
    expect(isSyntheticEmail("test-amm-wordpress-smoke@example.com")).toBe(true);
  });

  it("detects AMM_WORDPRESS marker", () => {
    expect(isSyntheticEmail("AMM_WORDPRESS_test@foo.com")).toBe(true);
  });

  it("detects DO_NOT_CONTACT marker", () => {
    expect(isSyntheticEmail("DO_NOT_CONTACT@anydomain.com")).toBe(true);
  });

  it("detects qa+amm- marker", () => {
    expect(isSyntheticEmail("qa+amm-smoke@test.com")).toBe(true);
  });

  it("detects @example.com domain", () => {
    expect(isSyntheticEmail("anyone@example.com")).toBe(true);
  });

  it("detects amm-wordpress-attribution-smoke marker", () => {
    expect(isSyntheticEmail("amm-wordpress-attribution-smoke-1@some.com")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1. Aggregates referrer_type / utm_source / utm_medium / utm_campaign
// ---------------------------------------------------------------------------

describe("sourceAttribution aggregates", () => {
  it("aggregates referrer_type correctly", async () => {
    const now = Date.now();
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
    ];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", referrer_type: "paid" }),
      makeAttrRow({ lead_id: "l2", referrer_type: "organic" }),
      makeAttrRow({ lead_id: "l3", referrer_type: "paid" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.sourceAttribution.byReferrerType["paid"]).toBe(2);
    expect(result.sourceAttribution.byReferrerType["organic"]).toBe(1);
  });

  it("aggregates utm_source correctly", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" })];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_source: "google" }),
      makeAttrRow({ lead_id: "l2", utm_source: "google" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.sourceAttribution.byUtmSource["google"]).toBe(2);
  });

  it("aggregates utm_medium correctly", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" })];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_medium: "cpc" }),
      makeAttrRow({ lead_id: "l2", utm_medium: "email" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.sourceAttribution.byUtmMedium["cpc"]).toBe(1);
    expect(result.sourceAttribution.byUtmMedium["email"]).toBe(1);
  });

  it("aggregates utm_campaign correctly", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" }), makeLeadRow({ id: "l3" })];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_campaign: "website_widget" }),
      makeAttrRow({ lead_id: "l2", utm_campaign: "spring_push" }),
      makeAttrRow({ lead_id: "l3", utm_campaign: "website_widget" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.sourceAttribution.byCampaign["website_widget"]).toBe(2);
    expect(result.sourceAttribution.byCampaign["spring_push"]).toBe(1);
  });

  it("uses (none) for null referrer_type", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const attrRows = [makeAttrRow({ lead_id: "l1", referrer_type: null })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.sourceAttribution.byReferrerType["(none)"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Counts unattributed leads (leads with no source_attribution row) in 7d
// ---------------------------------------------------------------------------

describe("unattributed leads", () => {
  it("counts leads without any source_attribution row", async () => {
    const ago6d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const leads = [
      makeLeadRow({ id: "l1", created_at: ago6d }),
      makeLeadRow({ id: "l2", created_at: ago6d }),
      makeLeadRow({ id: "l3", created_at: ago6d }),
    ];
    // Only l1 has attribution
    const attrRows = [makeAttrRow({ lead_id: "l1", referrer_type: "paid" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.unattributed7d).toBe(2);
    expect(result.attributionIntegrity.missingAttribution7d).toBe(2);
  });

  it("counts 0 unattributed when all leads have attribution", async () => {
    const ago6d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const leads = [makeLeadRow({ id: "l1", created_at: ago6d })];
    const attrRows = [makeAttrRow({ lead_id: "l1", referrer_type: "organic" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.unattributed7d).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Counts WordPress widget campaign leads in 7d
// ---------------------------------------------------------------------------

describe("WordPress widget campaign count", () => {
  it("counts leads with utm_campaign=website_widget in 7d", async () => {
    const ago3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const leads = [
      makeLeadRow({ id: "l1", created_at: ago3d }),
      makeLeadRow({ id: "l2", created_at: ago3d }),
      makeLeadRow({ id: "l3", created_at: ago3d }),
    ];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_campaign: "website_widget" }),
      makeAttrRow({ lead_id: "l2", utm_campaign: "other_campaign" }),
      makeAttrRow({ lead_id: "l3", utm_campaign: "website_widget" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.wordpressWidget7d).toBe(2);
  });

  it("counts 0 when no website_widget campaign in 7d", async () => {
    const ago3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const leads = [makeLeadRow({ id: "l1", created_at: ago3d })];
    const attrRows = [makeAttrRow({ lead_id: "l1", utm_campaign: "paid_search" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.wordpressWidget7d).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Buckets scores correctly into 0-25, 26-50, 51-75, 76-100 bands
// ---------------------------------------------------------------------------

describe("score band bucketing", () => {
  it("places score 0 in 0-25 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 0 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["0-25"]).toBe(1);
  });

  it("places score 25 in 0-25 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 25 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["0-25"]).toBe(1);
  });

  it("places score 26 in 26-50 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 26 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["26-50"]).toBe(1);
  });

  it("places score 50 in 26-50 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 50 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["26-50"]).toBe(1);
  });

  it("places score 51 in 51-75 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 51 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["51-75"]).toBe(1);
  });

  it("places score 75 in 51-75 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 75 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["51-75"]).toBe(1);
  });

  it("places score 76 in 76-100 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 76 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["76-100"]).toBe(1);
  });

  it("places score 100 in 76-100 band", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 100 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["76-100"]).toBe(1);
  });

  it("distributes multiple scores into correct bands", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
      makeLeadRow({ id: "l4" }),
    ];
    const scores = [
      makeScoreRow({ lead_id: "l1", composite_score: 10 }),
      makeScoreRow({ lead_id: "l2", composite_score: 40 }),
      makeScoreRow({ lead_id: "l3", composite_score: 60 }),
      makeScoreRow({ lead_id: "l4", composite_score: 90 }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.byScoreBand["0-25"]).toBe(1);
    expect(result.qualification.byScoreBand["26-50"]).toBe(1);
    expect(result.qualification.byScoreBand["51-75"]).toBe(1);
    expect(result.qualification.byScoreBand["76-100"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Excludes synthetic leads from followUpQueue
// ---------------------------------------------------------------------------

describe("followUpQueue synthetic exclusion", () => {
  it("excludes leads with synthetic email markers", async () => {
    const leads = [
      makeLeadRow({ id: "real1", email: "buyer@wilsonnc.com" }),
      makeLeadRow({ id: "syn1",  email: "amm-wordpress-smoke-test@example.com" }),
      makeLeadRow({ id: "syn2",  email: "qa+amm-test@domain.com" }),
      makeLeadRow({ id: "real2", email: "seller@realty.com" }),
    ];
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    const queueIds = result.followUpQueue.map((l) => l.id);
    expect(queueIds).toContain("real1");
    expect(queueIds).toContain("real2");
    expect(queueIds).not.toContain("syn1");
    expect(queueIds).not.toContain("syn2");
  });

  it("returns empty followUpQueue when all leads are synthetic", async () => {
    const leads = [
      makeLeadRow({ id: "s1", email: "AMM_WORDPRESS_test@foo.com" }),
      makeLeadRow({ id: "s2", email: "DO_NOT_CONTACT@anydomain.com" }),
    ];
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    expect(result.followUpQueue).toHaveLength(0);
  });

  it("caps followUpQueue at 20 real leads", async () => {
    const leads = Array.from({ length: 25 }, (_, i) =>
      makeLeadRow({ id: `real${i}`, email: `real${i}@domain.com` })
    );
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    expect(result.followUpQueue.length).toBe(20);
  });

  it("includes @example.com in synthetic exclusion", async () => {
    const leads = [
      makeLeadRow({ id: "s1", email: "user@example.com" }),
      makeLeadRow({ id: "r1", email: "user@real-example.org" }),
    ];
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    const queueIds = result.followUpQueue.map((l) => l.id);
    expect(queueIds).not.toContain("s1");
    expect(queueIds).toContain("r1");
  });
});

// ---------------------------------------------------------------------------
// 6. Synthetic residue warning counts
// ---------------------------------------------------------------------------

describe("syntheticResidues", () => {
  it("includes synthetic leads in syntheticResidues list", async () => {
    const leads = [
      makeLeadRow({ id: "real1", email: "buyer@wilsonnc.com" }),
      makeLeadRow({ id: "syn1",  email: "amm-wordpress-smoke-test@foo.com" }),
    ];
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    expect(result.syntheticResidues).toHaveLength(1);
    expect(result.syntheticResidues[0].id).toBe("syn1");
    expect(result.syntheticResidues[0].email).toBe("amm-wordpress-smoke-test@foo.com");
  });

  it("returns empty syntheticResidues when no synthetic leads exist", async () => {
    const leads = [
      makeLeadRow({ id: "r1", email: "mike@wilson.com" }),
      makeLeadRow({ id: "r2", email: "jane@realty.com" }),
    ];
    const client = makeClient({ leadsData: leads });
    const result = await loadRevenueCommand(client);
    expect(result.syntheticResidues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Handles null/missing lead_routing table gracefully
// ---------------------------------------------------------------------------

describe("lead_routing graceful degradation", () => {
  it("returns null for routing when lead_routing table is missing", async () => {
    // routingData = null → makeClient uses makeErrorChain
    const client = makeClient({ leadsData: [], routingData: null });
    const result = await loadRevenueCommand(client);
    expect(result.routing).toBeNull();
  });

  it("returns routing data when lead_routing table exists", async () => {
    const routingRows: RoutingRow[] = [
      { lead_id: "l1", assigned_agent_id: "agent1", status: "assigned", created_at: new Date(Date.now() - 3600_000).toISOString() },
      { lead_id: "l2", assigned_agent_id: null,      status: "pending",  created_at: new Date(Date.now() - 7200_000).toISOString() },
    ];
    const client = makeClient({ leadsData: [], routingData: routingRows });
    const result = await loadRevenueCommand(client);
    expect(result.routing).not.toBeNull();
    expect(result.routing?.assigned).toBe(1);
    expect(result.routing?.unassigned).toBe(1);
    expect(result.routing?.statusCounts["assigned"]).toBe(1);
    expect(result.routing?.statusCounts["pending"]).toBe(1);
  });

  it("tracks the oldest unassigned routing entry", async () => {
    const older = new Date(Date.now() - 7200_000).toISOString();
    const newer = new Date(Date.now() - 3600_000).toISOString();
    const routingRows: RoutingRow[] = [
      { lead_id: "l1", assigned_agent_id: null, status: "pending", created_at: newer },
      { lead_id: "l2", assigned_agent_id: null, status: "pending", created_at: older },
    ];
    const client = makeClient({ leadsData: [], routingData: routingRows });
    const result = await loadRevenueCommand(client);
    expect(result.routing?.oldestUnassignedAge).toBe(older);
  });
});

// ---------------------------------------------------------------------------
// 8. Handles null/missing lead_scores gracefully
// ---------------------------------------------------------------------------

describe("lead_scores graceful degradation", () => {
  it("counts leads without a score row as missingScore", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
    ];
    // Only l1 has a score
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: 80 })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.missingScore).toBe(2);
  });

  it("counts all leads as missingScore when no score rows exist", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" })];
    const client = makeClient({ leadsData: leads, scoreData: [] });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.missingScore).toBe(2);
  });

  it("counts leads with null composite_score as missingScore", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const scores = [makeScoreRow({ lead_id: "l1", composite_score: null })];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.missingScore).toBe(1);
  });

  it("returns 0 missingScore when all leads have valid scores", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" })];
    const scores = [
      makeScoreRow({ lead_id: "l1", composite_score: 45 }),
      makeScoreRow({ lead_id: "l2", composite_score: 72 }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scores });
    const result = await loadRevenueCommand(client);
    expect(result.qualification.missingScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// General shape / generatedAt
// ---------------------------------------------------------------------------

describe("result shape", () => {
  it("always returns generatedAt as an ISO string", async () => {
    const client = makeClient();
    const result = await loadRevenueCommand(client);
    expect(typeof result.generatedAt).toBe("string");
    expect(() => new Date(result.generatedAt)).not.toThrow();
  });

  it("returns all required top-level keys", async () => {
    const client = makeClient();
    const result = await loadRevenueCommand(client);
    expect(result).toHaveProperty("funnelHealth");
    expect(result).toHaveProperty("trafficPathScorecard");
    expect(result).toHaveProperty("sourceAttribution");
    expect(result).toHaveProperty("qualification");
    expect(result).toHaveProperty("routing");
    expect(result).toHaveProperty("followUpQueue");
    expect(result).toHaveProperty("attributionIntegrity");
    expect(result).toHaveProperty("syntheticResidues");
    expect(result).toHaveProperty("generatedAt");
  });
});

// ---------------------------------------------------------------------------
// 9. Traffic path scorecard
// ---------------------------------------------------------------------------

describe("trafficPathScorecard", () => {
  it("groups leads by utm_medium into correct path keys", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
    ];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_medium: "website_widget" }),
      makeAttrRow({ lead_id: "l2", utm_medium: "homepage_cta" }),
      makeAttrRow({ lead_id: "l3", utm_medium: "agent_profile_cta" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.website_widget.leads30d).toBe(1);
    expect(result.trafficPathScorecard.homepage_cta.leads30d).toBe(1);
    expect(result.trafficPathScorecard.agent_profile_cta.leads30d).toBe(1);
    expect(result.trafficPathScorecard.direct_unknown.leads30d).toBe(0);
  });

  it("routes leads without any attribution row to direct_unknown", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const client = makeClient({ leadsData: leads, attrData: [] });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.direct_unknown.leads30d).toBe(1);
    expect(result.trafficPathScorecard.website_widget.leads30d).toBe(0);
  });

  it("routes leads with unrecognized utm_medium to direct_unknown", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const attrRows = [makeAttrRow({ lead_id: "l1", utm_medium: "some_other_channel" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.direct_unknown.leads30d).toBe(1);
  });

  it("counts leads7d per path within the 7-day window only", async () => {
    const ago3d  = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000).toISOString();
    const ago20d = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const leads = [
      makeLeadRow({ id: "l1", created_at: ago3d }),
      makeLeadRow({ id: "l2", created_at: ago20d }),
    ];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_medium: "agent_profile_cta" }),
      makeAttrRow({ lead_id: "l2", utm_medium: "agent_profile_cta" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.agent_profile_cta.leads7d).toBe(1);
    expect(result.trafficPathScorecard.agent_profile_cta.leads30d).toBe(2);
  });

  it("increments hotUrgentCount for hot and urgent temperature only", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
    ];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_medium: "website_widget" }),
      makeAttrRow({ lead_id: "l2", utm_medium: "website_widget" }),
      makeAttrRow({ lead_id: "l3", utm_medium: "website_widget" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "l1", temperature: "hot" }),
      makeScoreRow({ lead_id: "l2", temperature: "urgent" }),
      makeScoreRow({ lead_id: "l3", temperature: "warm" }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.website_widget.hotUrgentCount).toBe(2);
  });

  it("computes avgScore per path as rounded mean of scored leads", async () => {
    const leads = [makeLeadRow({ id: "l1" }), makeLeadRow({ id: "l2" })];
    const attrRows = [
      makeAttrRow({ lead_id: "l1", utm_medium: "homepage_cta" }),
      makeAttrRow({ lead_id: "l2", utm_medium: "homepage_cta" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "l1", composite_score: 40 }),
      makeScoreRow({ lead_id: "l2", composite_score: 60 }),
    ];
    const client = makeClient({ leadsData: leads, attrData: attrRows, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.homepage_cta.avgScore).toBe(50);
  });

  it("returns null avgScore for paths with no scored leads", async () => {
    const leads = [makeLeadRow({ id: "l1" })];
    const attrRows = [makeAttrRow({ lead_id: "l1", utm_medium: "agent_profile_cta" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.agent_profile_cta.avgScore).toBeNull();
  });

  it("counts missingAttribution30d for leads whose path has no attr row", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }), // no attr → direct_unknown, missing++
      makeLeadRow({ id: "l2" }), // no attr → direct_unknown, missing++
      makeLeadRow({ id: "l3" }), // has attr → website_widget, missing stays 0
    ];
    const attrRows = [makeAttrRow({ lead_id: "l3", utm_medium: "website_widget" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.trafficPathScorecard.direct_unknown.missingAttribution30d).toBe(2);
    expect(result.trafficPathScorecard.website_widget.missingAttribution30d).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Priority-sorted follow-up queue
// ---------------------------------------------------------------------------

describe("followUpQueue priority sort", () => {
  it("sorts urgent leads before hot before warm before no-temperature", async () => {
    const leads = [
      makeLeadRow({ id: "warm1",   email: "warm@test.com" }),
      makeLeadRow({ id: "urgent1", email: "urgent@test.com" }),
      makeLeadRow({ id: "none1",   email: "none@test.com" }),
      makeLeadRow({ id: "hot1",    email: "hot@test.com" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "warm1",   temperature: "warm",   composite_score: 50 }),
      makeScoreRow({ lead_id: "urgent1", temperature: "urgent", composite_score: 50 }),
      makeScoreRow({ lead_id: "hot1",    temperature: "hot",    composite_score: 50 }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    const ids = result.followUpQueue.map((l) => l.id);
    expect(ids.indexOf("urgent1")).toBeLessThan(ids.indexOf("hot1"));
    expect(ids.indexOf("hot1")).toBeLessThan(ids.indexOf("warm1"));
    expect(ids.indexOf("warm1")).toBeLessThan(ids.indexOf("none1"));
  });

  it("within same temperature sorts by score descending", async () => {
    const leads = [
      makeLeadRow({ id: "hot_low",  email: "hotlow@test.com" }),
      makeLeadRow({ id: "hot_high", email: "hothigh@test.com" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "hot_low",  temperature: "hot", composite_score: 30 }),
      makeScoreRow({ lead_id: "hot_high", temperature: "hot", composite_score: 80 }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    const ids = result.followUpQueue.map((l) => l.id);
    expect(ids.indexOf("hot_high")).toBeLessThan(ids.indexOf("hot_low"));
  });

  it("within same temperature and score sorts newest first", async () => {
    const older = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const newer = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const leads = [
      makeLeadRow({ id: "older_lead", created_at: older, email: "older@test.com" }),
      makeLeadRow({ id: "newer_lead", created_at: newer, email: "newer@test.com" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "older_lead", temperature: "warm", composite_score: 50 }),
      makeScoreRow({ lead_id: "newer_lead", temperature: "warm", composite_score: 50 }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    const ids = result.followUpQueue.map((l) => l.id);
    expect(ids.indexOf("newer_lead")).toBeLessThan(ids.indexOf("older_lead"));
  });

  it("includes utmMedium field populated from attribution", async () => {
    const leads = [makeLeadRow({ id: "l1", email: "buyer@test.com" })];
    const attrRows = [makeAttrRow({ lead_id: "l1", utm_medium: "agent_profile_cta" })];
    const client = makeClient({ leadsData: leads, attrData: attrRows });
    const result = await loadRevenueCommand(client);
    expect(result.followUpQueue[0].utmMedium).toBe("agent_profile_cta");
  });

  it("utmMedium is null when lead has no attribution row", async () => {
    const leads = [makeLeadRow({ id: "l1", email: "buyer@test.com" })];
    const client = makeClient({ leadsData: leads, attrData: [] });
    const result = await loadRevenueCommand(client);
    expect(result.followUpQueue[0].utmMedium).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11. funnelHealth.highIntent24h
// ---------------------------------------------------------------------------

describe("funnelHealth.highIntent24h", () => {
  it("counts hot and urgent leads created within 24h", async () => {
    // makeLeadRow defaults to 60 seconds ago — safely within 24h
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
      makeLeadRow({ id: "l3" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "l1", temperature: "hot" }),
      makeScoreRow({ lead_id: "l2", temperature: "urgent" }),
      makeScoreRow({ lead_id: "l3", temperature: "warm" }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.highIntent24h).toBe(2);
  });

  it("does not count warm or null temperature leads as high intent", async () => {
    const leads = [
      makeLeadRow({ id: "l1" }),
      makeLeadRow({ id: "l2" }),
    ];
    const scoreRows = [
      makeScoreRow({ lead_id: "l1", temperature: "warm" }),
      makeScoreRow({ lead_id: "l2", temperature: null }),
    ];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.highIntent24h).toBe(0);
  });

  it("does not count hot leads older than 24h", async () => {
    const ago25h = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const leads = [makeLeadRow({ id: "l1", created_at: ago25h })];
    const scoreRows = [makeScoreRow({ lead_id: "l1", temperature: "hot" })];
    const client = makeClient({ leadsData: leads, scoreData: scoreRows });
    const result = await loadRevenueCommand(client);
    expect(result.funnelHealth.highIntent24h).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 12. Public copy — hero section
// ---------------------------------------------------------------------------

describe("hero section public copy", () => {
  const heroSource = readFileSync(
    join(process.cwd(), "src/components/landing/hero-section.tsx"),
    "utf-8"
  );
  const questionInputSource = readFileSync(
    join(process.cwd(), "src/components/landing/question-input.tsx"),
    "utf-8"
  );

  it("includes 'Not an appraisal' disclaimer in subtext", () => {
    expect(heroSource).toContain("Not an appraisal");
  });

  it("includes broker-reviewed trust strip", () => {
    expect(heroSource).toContain("Broker-reviewed guidance");
  });

  it("preserves 'Request Guidance' CTA button text in question input", () => {
    expect(questionInputSource).toContain("Request Guidance");
  });

  it("does not contain instant/guaranteed overpromise language", () => {
    expect(heroSource).not.toMatch(/instant valuation/i);
    expect(heroSource).not.toMatch(/guaranteed offer/i);
    expect(heroSource).not.toMatch(/offer engine/i);
  });
});
