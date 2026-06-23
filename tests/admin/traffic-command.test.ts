/**
 * Tests for src/lib/admin/traffic-command.ts
 *
 * Uses a mock Supabase client to avoid real DB calls.
 */
import { describe, expect, it, vi } from "vitest";
import { loadTrafficCommand } from "@/lib/admin/traffic-command";

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

type MockChain = {
  data: unknown;
  error: unknown;
};

function mockQuery(chain: MockChain) {
  // Supabase queries are thenable — awaiting the chain itself (no .limit()) must resolve.
  const q = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(chain),
    // PromiseLike — lets `await client.from(t).select(...).in(...)` resolve
    then: vi.fn((resolve: (v: MockChain) => unknown) => Promise.resolve(chain).then(resolve)),
  };
  return q;
}

function makeMockClient(options: {
  leads?: unknown[];
  attrs?: unknown[];
  events?: unknown[];
  scores?: unknown[];
} = {}) {
  const {
    leads = [],
    attrs = [],
    events = [],
    scores = [],
  } = options;

  const fromMap: Record<string, MockChain> = {
    leads: { data: leads, error: null },
    source_attribution: { data: attrs, error: null },
    analytics_events: { data: events, error: null },
    lead_scores: { data: scores, error: null },
  };

  return {
    from: vi.fn((table: string) => mockQuery(fromMap[table] ?? { data: [], error: null })),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date();
const ago1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
const ago2d = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
const ago10d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

function makeLeadRow(id: string, opts: {
  createdAt?: string;
  email?: string;
  intent?: string;
  leadType?: string;
  ctaChip?: string;
  question?: string;
  pageUrl?: string;
} = {}) {
  return {
    id,
    created_at: opts.createdAt ?? ago2d,
    email: opts.email ?? `lead-${id}@test.com`,
    primary_intent: opts.intent ?? "sell",
    lead_type: opts.leadType ?? "seller",
    cta_chip_used: opts.ctaChip ?? null,
    question_raw: opts.question ?? null,
    page_url: opts.pageUrl ?? "/",
  };
}

function makeAttrRow(leadId: string, opts: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerType?: string;
  landingPage?: string;
  isPaid?: boolean;
} = {}) {
  return {
    lead_id: leadId,
    utm_source: opts.utmSource ?? null,
    utm_medium: opts.utmMedium ?? null,
    utm_campaign: opts.utmCampaign ?? null,
    utm_content: null,
    referrer_type: opts.referrerType ?? null,
    landing_page: opts.landingPage ?? "/",
    is_paid: opts.isPaid ?? false,
  };
}

function makeEventRow(sessionId: string, createdAt?: string) {
  return {
    occurred_at: createdAt ?? ago2d,
    session_id: sessionId,
    event_name: "session_start",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("loadTrafficCommand", () => {
  it("returns a TrafficCommandData with all required fields", async () => {
    const client = makeMockClient();
    const result = await loadTrafficCommand(client);

    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("sourceRollup");
    expect(result).toHaveProperty("questionIntel");
    expect(result).toHaveProperty("contentOpportunities");
    expect(result).toHaveProperty("viralPosts");
    expect(result).toHaveProperty("marketHeatmap");
    expect(result).toHaveProperty("socialPreviewStatus");
    expect(result).toHaveProperty("generatedAt");
  });

  it("returns zero counts when there are no leads", async () => {
    const client = makeMockClient();
    const { summary } = await loadTrafficCommand(client);

    expect(summary.leads24h).toBe(0);
    expect(summary.leads7d).toBe(0);
    expect(summary.leads30d).toBe(0);
    expect(summary.highIntent24h).toBe(0);
    expect(summary.unattributed7d).toBe(0);
    expect(summary.widgetLeads7d).toBe(0);
  });

  it("counts leads correctly within time windows", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("a", { createdAt: ago1h }),       // 24h + 7d + 30d
        makeLeadRow("b", { createdAt: ago2d }),        // 7d + 30d
        makeLeadRow("c", { createdAt: ago10d }),       // 30d only
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    expect(summary.leads24h).toBe(1);
    expect(summary.leads7d).toBe(2);
    expect(summary.leads30d).toBe(3);
  });

  it("excludes synthetic/test leads from email-based detection", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("s1", { email: "qa+amm-test@example.com", createdAt: ago2d }),
        makeLeadRow("r1", { email: "real@gmail.com", createdAt: ago2d }),
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    // Both count in leads7d, but synthetic7d only catches the test email
    expect(summary.leads7d).toBe(2);
    expect(summary.synthetic7d).toBe(1);
  });

  it("marks unattributed7d for leads with no attribution row", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("a1", { createdAt: ago2d }),
        makeLeadRow("a2", { createdAt: ago2d }),
      ],
      attrs: [
        // Only one attribution row
        makeAttrRow("a1", { utmSource: "facebook" }),
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    expect(summary.unattributed7d).toBe(1);
  });

  it("counts widget leads from website_widget utm_campaign", async () => {
    const client = makeMockClient({
      leads: [makeLeadRow("w1", { createdAt: ago2d })],
      attrs: [makeAttrRow("w1", { utmCampaign: "website_widget" })],
    });
    const { summary } = await loadTrafficCommand(client);

    expect(summary.widgetLeads7d).toBe(1);
  });

  it("uses session events for session counts when available", async () => {
    const client = makeMockClient({
      events: [
        makeEventRow("sess-1", ago2d),
        makeEventRow("sess-1", ago2d),  // same session, 2 events
        makeEventRow("sess-2", ago2d),
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    expect(summary.sessions7d).toBe(2); // 2 unique sessions
    expect(summary.returning7d).toBe(1); // 1 session seen >1 time
  });

  it("falls back to leads7d for session count when no events", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("b1", { createdAt: ago2d }),
        makeLeadRow("b2", { createdAt: ago2d }),
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    // Fallback: sessions7d = leads7d
    expect(summary.sessions7d).toBe(2);
    expect(summary.returning7d).toBe(0);
  });

  it("computes conversionRate as null when sessions7d is 0", async () => {
    const client = makeMockClient();
    const { summary } = await loadTrafficCommand(client);
    expect(summary.conversionRate).toBeNull();
  });

  it("computes conversionRate as a percentage when sessions > 0", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("c1", { createdAt: ago2d }),
      ],
      events: [
        makeEventRow("s1", ago2d),
        makeEventRow("s2", ago2d),
        makeEventRow("s3", ago2d),
        makeEventRow("s4", ago2d),
      ],
    });
    const { summary } = await loadTrafficCommand(client);

    // 1 lead / 4 sessions = 25%
    expect(summary.conversionRate).toBe(25);
  });

  it("socialPreviewStatus is 'blocked' (WAF state hardcoded from RUN_STATE)", async () => {
    const client = makeMockClient();
    const { socialPreviewStatus } = await loadTrafficCommand(client);
    expect(socialPreviewStatus).toBe("blocked");
  });

  it("builds source rollup from attribution rows", async () => {
    const client = makeMockClient({
      leads: [makeLeadRow("d1", { createdAt: ago2d }), makeLeadRow("d2", { createdAt: ago2d })],
      attrs: [
        makeAttrRow("d1", { utmSource: "facebook" }),
        makeAttrRow("d2", { utmSource: "facebook" }),
      ],
    });
    const { sourceRollup } = await loadTrafficCommand(client);

    expect(sourceRollup.topPlatform).toBe("Facebook");
    expect(sourceRollup.byPlatform["Facebook"]).toBe(2);
  });

  it("builds question intelligence from leads", async () => {
    const client = makeMockClient({
      leads: [
        makeLeadRow("q1", { question: "What is my home worth?", createdAt: ago2d }),
        makeLeadRow("q2", { question: "What is my home worth?", createdAt: ago2d }),
      ],
    });
    const { questionIntel } = await loadTrafficCommand(client);

    expect(questionIntel.totalQuestionsAnalyzed).toBe(2);
    expect(questionIntel.topCategory).toBe("home_value");
  });

  it("returns contentOpportunities as a non-empty array", async () => {
    const client = makeMockClient();
    const { contentOpportunities } = await loadTrafficCommand(client);
    expect(Array.isArray(contentOpportunities)).toBe(true);
    expect(contentOpportunities.length).toBeGreaterThan(0);
  });

  it("returns viralPosts with all four social platforms", async () => {
    const client = makeMockClient();
    const { viralPosts } = await loadTrafficCommand(client);
    expect(viralPosts).toHaveProperty("facebook");
    expect(viralPosts).toHaveProperty("linkedin");
    expect(viralPosts).toHaveProperty("threads");
    expect(viralPosts).toHaveProperty("x");
  });

  it("returns marketHeatmap with segment breakdown", async () => {
    const client = makeMockClient({
      leads: [makeLeadRow("h1", { createdAt: ago2d, leadType: "buyer" })],
    });
    const { marketHeatmap } = await loadTrafficCommand(client);
    expect(marketHeatmap).toHaveProperty("bySegment");
    expect(marketHeatmap).toHaveProperty("topSegment");
    const total = Object.values(marketHeatmap.bySegment).reduce((s, c) => s + c, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("gracefully handles leads DB error", async () => {
    const errorClient = {
      from: vi.fn((table: string) => {
        if (table === "leads") {
          return mockQuery({ data: null, error: { message: "DB error" } });
        }
        return mockQuery({ data: [], error: null });
      }),
    };
    // Should not throw
    const result = await loadTrafficCommand(errorClient);
    expect(result.summary.leads30d).toBe(0);
  });
});
