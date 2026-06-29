/**
 * Tests for src/lib/admin/launch-control.ts
 */
import { describe, expect, it } from "vitest";
import {
  computeLaunchDimensions,
  computeVerdict,
} from "@/lib/admin/launch-control";
import type { ReadinessDimension } from "@/lib/admin/launch-control";
import type { DashboardMetrics } from "@/lib/admin/dashboard-metrics";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTraffic(ammSafe = true, otpSafe = false) {
  return {
    ammLinksSafe: ammSafe,
    otpFacebookLinksSafe: otpSafe,
    recommendedPrimaryPostingDomain: "askmagicmike.com",
    blockedDomain: "ourtownproperties.com",
    blockerReason: "facebookexternalhit receives HTTP 403",
    doNotPostList: [],
    launchChecklist: [
      { step: 1, action: "Confirm AMM funnel", status: "done" as const },
      { step: 2, action: "Confirm social previews", status: "done" as const },
      { step: 3, action: "Post links", status: "waiting" as const },
      {
        step: 4,
        action: "Fix host WAF",
        status: "blocked" as const,
        blockerNote: "External action required",
      },
      { step: 5, action: "Run full verify after WAF fix", status: "blocked" as const },
    ],
    nextBestAction: "Post askmagicmike.com links. Use UTM Copy Bank.",
    socialPreviewScore: "40/42",
  };
}

function makeMetrics(overrides: Partial<DashboardMetrics["totals"]> = {}): DashboardMetrics {
  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    totals: {
      newToday: 3,
      hot: 2,
      unassigned: 0,
      overdueSla: 0,
      contacted: 5,
      appointmentsRequested: 1,
      sellerCashOffer: 0,
      listingInquiries: 0,
      followUpDue: 0,
      neverContacted: 0,
      ...overrides,
    },
    bySource: [],
    recentLeads: [],
  };
}

function makeRevenue(overrides: {
  leads24h?: number;
  leads7d?: number;
  unattributed7d?: number;
  pipelineLeads?: number;
  routingUnassigned?: number;
  routingAssigned?: number;
  routingNull?: boolean;
} = {}) {
  return {
    funnelHealth: {
      leads24h: overrides.leads24h ?? 3,
      leads7d:  overrides.leads7d  ?? 15,
      leads30d: 40,
      unattributed7d: overrides.unattributed7d ?? 1,
      wordpressWidget24h: 0,
      wordpressWidget7d:  2,
      highIntent24h: 1,
    },
    trafficPathScorecard: {
      website_widget:     { leads7d: 2, leads30d: 10, avgScore: 60, hotUrgentCount: 1, missingAttribution30d: 0 },
      homepage_cta:       { leads7d: 1, leads30d: 5,  avgScore: 55, hotUrgentCount: 0, missingAttribution30d: 0 },
      agent_profile_cta:  { leads7d: 0, leads30d: 2,  avgScore: 50, hotUrgentCount: 0, missingAttribution30d: 0 },
      direct_unknown:     { leads7d: 0, leads30d: 3,  avgScore: 40, hotUrgentCount: 0, missingAttribution30d: 1 },
    },
    sourceAttribution: {
      byReferrerType: { facebook: 5, direct: 3 },
      byUtmSource: {},
      byUtmMedium: {},
      byCampaign: {},
    },
    qualification: {
      byTemperature: { hot: 2, warm: 5, nurture: 3 },
      byScoreBand: { "0-25": 1, "26-50": 4, "51-75": 5, "76-100": 2 },
      missingScore: 0,
    },
    routing: overrides.routingNull
      ? null
      : {
          assigned: overrides.routingAssigned ?? 12,
          unassigned: overrides.routingUnassigned ?? 0,
          statusCounts: {},
          oldestUnassignedAge: null,
        },
    followUpQueue: [],
    pipelineLeads: Array.from({ length: overrides.pipelineLeads ?? 5 }, (_, i) => ({
      leadId: `lead-${i}`,
      name: `Lead ${i}`,
      score: 60,
      temperature: "warm",
      grade: "B",
      estimatedValue: 6000,
      probability: 0.3,
      expectedValue: 1800,
    })),
    attributionIntegrity: {
      missingAttribution7d: overrides.unattributed7d ?? 1,
      missingReferrerType: 0,
      websiteWidgetCount: 2,
      latestAttributionAt: new Date().toISOString(),
      latestLeadAt: new Date().toISOString(),
    },
    syntheticResidues: [],
    generatedAt: new Date().toISOString(),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------------------------------------------------------------------------
// computeLaunchDimensions
// ---------------------------------------------------------------------------

describe("computeLaunchDimensions — traffic dimension", () => {
  it("returns pass when both AMM and OTP safe", () => {
    const dims = computeLaunchDimensions(makeTraffic(true, true), makeMetrics(), null);
    expect(dims.find((d) => d.key === "traffic")?.status).toBe("pass");
  });

  it("returns warn when AMM safe but OTP blocked (current state)", () => {
    const dims = computeLaunchDimensions(makeTraffic(true, false), makeMetrics(), null);
    const t = dims.find((d) => d.key === "traffic");
    expect(t?.status).toBe("warn");
    expect(t?.ownerAction).toContain("Regency");
  });

  it("returns fail when AMM not safe", () => {
    const dims = computeLaunchDimensions(makeTraffic(false, false), makeMetrics(), null);
    expect(dims.find((d) => d.key === "traffic")?.status).toBe("fail");
  });
});

describe("computeLaunchDimensions — lead capture", () => {
  it("returns pass when leads24h > 0", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads24h: 3 }));
    expect(dims.find((d) => d.key === "lead_capture")?.status).toBe("pass");
  });

  it("returns warn when leads24h = 0 but leads7d > 0", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads24h: 0, leads7d: 5 }));
    expect(dims.find((d) => d.key === "lead_capture")?.status).toBe("warn");
  });

  it("returns fail when leads7d = 0", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads24h: 0, leads7d: 0 }));
    expect(dims.find((d) => d.key === "lead_capture")?.status).toBe("fail");
  });

  it("returns warn (not fail) when revenue is null", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), null);
    expect(dims.find((d) => d.key === "lead_capture")?.status).toBe("warn");
  });
});

describe("computeLaunchDimensions — attribution", () => {
  it("returns pass when < 20% unattributed", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads7d: 10, unattributed7d: 1 }));
    expect(dims.find((d) => d.key === "attribution")?.status).toBe("pass");
  });

  it("returns warn when 20–50% unattributed", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads7d: 10, unattributed7d: 3 }));
    expect(dims.find((d) => d.key === "attribution")?.status).toBe("warn");
  });

  it("returns fail when >= 50% unattributed", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ leads7d: 10, unattributed7d: 6 }));
    expect(dims.find((d) => d.key === "attribution")?.status).toBe("fail");
  });
});

describe("computeLaunchDimensions — follow-up", () => {
  it("returns pass when SLA clear and low never-contacted", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics({ overdueSla: 0, neverContacted: 2 }), makeRevenue());
    expect(dims.find((d) => d.key === "follow_up")?.status).toBe("pass");
  });

  it("returns warn when overdueSla > 0 but < 5", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics({ overdueSla: 2 }), makeRevenue());
    expect(dims.find((d) => d.key === "follow_up")?.status).toBe("warn");
  });

  it("returns fail when overdueSla >= 5", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics({ overdueSla: 5 }), makeRevenue());
    expect(dims.find((d) => d.key === "follow_up")?.status).toBe("fail");
  });

  it("includes /admin/ops link in ownerAction when SLA issues exist", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics({ overdueSla: 2 }), makeRevenue());
    const d = dims.find((d) => d.key === "follow_up");
    expect(d?.ownerAction).toContain("/admin/ops");
  });
});

describe("computeLaunchDimensions — routing", () => {
  it("returns pass when all leads assigned", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ routingAssigned: 5, routingUnassigned: 0 }));
    expect(dims.find((d) => d.key === "routing")?.status).toBe("pass");
  });

  it("returns warn when unassigned > 0", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ routingUnassigned: 3 }));
    expect(dims.find((d) => d.key === "routing")?.status).toBe("warn");
  });

  it("returns warn when routing table is null", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ routingNull: true }));
    expect(dims.find((d) => d.key === "routing")?.status).toBe("warn");
  });
});

describe("computeLaunchDimensions — revenue tracking", () => {
  it("returns pass when >= 3 pipeline leads", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ pipelineLeads: 5 }));
    expect(dims.find((d) => d.key === "revenue_tracking")?.status).toBe("pass");
  });

  it("returns warn when 1-2 pipeline leads", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ pipelineLeads: 2 }));
    expect(dims.find((d) => d.key === "revenue_tracking")?.status).toBe("warn");
  });

  it("returns fail when 0 pipeline leads", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue({ pipelineLeads: 0 }));
    expect(dims.find((d) => d.key === "revenue_tracking")?.status).toBe("fail");
  });
});

describe("computeLaunchDimensions — admin/auth", () => {
  it("returns pass when metrics configured", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), null);
    expect(dims.find((d) => d.key === "admin_auth")?.status).toBe("pass");
  });

  it("returns warn when metrics not configured", () => {
    const unconfigured: DashboardMetrics = {
      ...makeMetrics(),
      configured: false,
    };
    const dims = computeLaunchDimensions(makeTraffic(), unconfigured, null);
    expect(dims.find((d) => d.key === "admin_auth")?.status).toBe("warn");
  });
});

describe("computeLaunchDimensions — public routes", () => {
  it("returns warn when first 2 checklist steps done but blocked steps exist (current baseline)", () => {
    const dims = computeLaunchDimensions(makeTraffic(true, false), makeMetrics(), null);
    expect(dims.find((d) => d.key === "public_routes")?.status).toBe("warn");
  });

  it("returns fail when funnel steps not done", () => {
    const traffic = makeTraffic();
    const modified = {
      ...traffic,
      launchChecklist: [
        { step: 1, action: "Confirm AMM funnel", status: "waiting" as const },
        ...traffic.launchChecklist.slice(1),
      ],
    };
    const dims = computeLaunchDimensions(modified, makeMetrics(), null);
    expect(dims.find((d) => d.key === "public_routes")?.status).toBe("fail");
  });

  it("returns pass when all steps done and no blocked", () => {
    const traffic = makeTraffic(true, true);
    traffic.launchChecklist = [
      { step: 1, action: "Confirm AMM funnel", status: "done" },
      { step: 2, action: "Confirm social previews", status: "done" },
    ];
    const dims = computeLaunchDimensions(traffic, makeMetrics(), null);
    expect(dims.find((d) => d.key === "public_routes")?.status).toBe("pass");
  });
});

describe("computeLaunchDimensions — dimension count and shape", () => {
  it("returns exactly 8 dimensions", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue());
    expect(dims).toHaveLength(8);
  });

  it("all dimensions have key, label, status, detail", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue());
    for (const d of dims) {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(["pass", "warn", "fail"]).toContain(d.status);
      expect(d.detail).toBeTruthy();
    }
  });

  it("no private data (emails, phone numbers) in dimension details", () => {
    const dims = computeLaunchDimensions(makeTraffic(), makeMetrics(), makeRevenue());
    for (const d of dims) {
      expect(d.detail).not.toMatch(/@\w+\.\w+/);
      expect(d.detail).not.toMatch(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/);
    }
  });
});

// ---------------------------------------------------------------------------
// computeVerdict
// ---------------------------------------------------------------------------

describe("computeVerdict", () => {
  it("returns Go when all 8 dimensions pass", () => {
    const allPass = Array.from({ length: 8 }, (_, i) => ({
      key: `dim-${i}`,
      label: `Dim ${i}`,
      status: "pass" as const,
      detail: "ok",
    }));
    const { verdict, score } = computeVerdict(allPass);
    expect(verdict).toBe("Go");
    expect(score).toBe(100);
  });

  it("returns Go when 7 pass and 1 warn (score = 94)", () => {
    const dims: ReadinessDimension[] = Array.from({ length: 7 }, (_, i) => ({
      key: `d${i}`,
      label: `D${i}`,
      status: "pass" as const,
      detail: "",
    }));
    dims.push({ key: "d7", label: "D7", status: "warn" as const, detail: "" });
    const { verdict, score } = computeVerdict(dims);
    expect(verdict).toBe("Go");
    expect(score).toBe(94);
  });

  it("returns Go With Conditions when 1 dimension fails and rest pass", () => {
    const dims = [
      { key: "fail", label: "Fail Dim", status: "fail" as const, detail: "" },
      ...Array.from({ length: 7 }, (_, i) => ({
        key: `d${i}`,
        label: `D${i}`,
        status: "pass" as const,
        detail: "",
      })),
    ];
    const { verdict } = computeVerdict(dims);
    expect(verdict).toBe("Go With Conditions");
  });

  it("returns No Go when 3+ dimensions fail", () => {
    const dims = [
      ...Array.from({ length: 3 }, (_, i) => ({
        key: `fail-${i}`,
        label: `Fail ${i}`,
        status: "fail" as const,
        detail: "",
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        key: `d${i}`,
        label: `D${i}`,
        status: "pass" as const,
        detail: "",
      })),
    ];
    const { verdict } = computeVerdict(dims);
    expect(verdict).toBe("No Go");
  });

  it("includes failing dimension labels in No Go reason", () => {
    const dims = [
      { key: "a", label: "Attribution", status: "fail" as const, detail: "" },
      { key: "b", label: "Routing",     status: "fail" as const, detail: "" },
      ...Array.from({ length: 6 }, (_, i) => ({
        key: `d${i}`,
        label: `D${i}`,
        status: "pass" as const,
        detail: "",
      })),
    ];
    const { reason } = computeVerdict(dims);
    expect(reason).toContain("Attribution");
    expect(reason).toContain("Routing");
  });

  it("score is 0 for all-fail", () => {
    const dims = Array.from({ length: 8 }, (_, i) => ({
      key: `d${i}`,
      label: `D${i}`,
      status: "fail" as const,
      detail: "",
    }));
    const { score } = computeVerdict(dims);
    expect(score).toBe(0);
  });

  it("score is 50 for half-pass half-fail", () => {
    const dims = [
      ...Array.from({ length: 4 }, (_, i) => ({
        key: `p${i}`,
        label: `P${i}`,
        status: "pass" as const,
        detail: "",
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        key: `f${i}`,
        label: `F${i}`,
        status: "fail" as const,
        detail: "",
      })),
    ];
    const { score } = computeVerdict(dims);
    expect(score).toBe(50);
  });

  it("handles empty dimensions without throwing", () => {
    const { score, verdict } = computeVerdict([]);
    expect(score).toBe(0);
    expect(verdict).toBe("No Go");
  });
});
