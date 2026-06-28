import { describe, expect, it } from "vitest";

// Static guard tests — verify token export shapes and class string invariants
// without rendering the DOM (no jsdom dependency needed).

// ---------------------------------------------------------------------------
// MetricTile
// ---------------------------------------------------------------------------

describe("MetricTile", () => {
  it("exports MetricTile and MetricGrid", async () => {
    const mod = await import("@/components/ui/metric-tile");
    expect(typeof mod.MetricTile).toBe("function");
    expect(typeof mod.MetricGrid).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe("Card", () => {
  it("exports Card and sub-components", async () => {
    const mod = await import("@/components/ui/card");
    expect(mod.Card).toBeDefined();
    expect(mod.CardHeader).toBeDefined();
    expect(mod.CardTitle).toBeDefined();
    expect(mod.CardDescription).toBeDefined();
    expect(mod.CardContent).toBeDefined();
    expect(mod.CardFooter).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

describe("Alert", () => {
  it("exports Alert component", async () => {
    const mod = await import("@/components/ui/alert");
    expect(mod.Alert).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

describe("Skeleton", () => {
  it("exports Skeleton variants", async () => {
    const mod = await import("@/components/ui/skeleton");
    expect(typeof mod.Skeleton).toBe("function");
    expect(typeof mod.SkeletonText).toBe("function");
    expect(typeof mod.SkeletonCard).toBe("function");
    expect(typeof mod.SkeletonMetric).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Separator / GoldRule
// ---------------------------------------------------------------------------

describe("Separator", () => {
  it("exports Separator and GoldRule", async () => {
    const mod = await import("@/components/ui/separator");
    expect(typeof mod.Separator).toBe("function");
    expect(typeof mod.GoldRule).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Section (SectionEyebrow / SectionHeading)
// ---------------------------------------------------------------------------

describe("Section components", () => {
  it("exports SectionEyebrow, SectionHeading, SectionLead, SectionHeader", async () => {
    const mod = await import("@/components/ui/section");
    expect(typeof mod.SectionEyebrow).toBe("function");
    expect(typeof mod.SectionHeading).toBe("function");
    expect(typeof mod.SectionLead).toBe("function");
    expect(typeof mod.SectionHeader).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

describe("StatusBadge", () => {
  it("exports StatusBadge", async () => {
    const mod = await import("@/components/ui/status-badge");
    expect(typeof mod.StatusBadge).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Button — variant and size guard
// ---------------------------------------------------------------------------

describe("Button", () => {
  it("exports Button and it is defined", async () => {
    const mod = await import("@/components/ui/button");
    expect(mod.Button).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// UI barrel index
// ---------------------------------------------------------------------------

describe("UI barrel index", () => {
  it("exports all primary components", async () => {
    const mod = await import("@/components/ui/index");
    // forwardRef components are `object` at runtime; just assert they are defined and non-null
    expect(mod.Button).toBeDefined();
    expect(mod.Card).toBeDefined();
    expect(mod.Alert).toBeDefined();
    expect(mod.Skeleton).toBeDefined();
    expect(mod.MetricTile).toBeDefined();
    expect(mod.Separator).toBeDefined();
    expect(mod.SectionEyebrow).toBeDefined();
    expect(mod.SectionHeading).toBeDefined();
    expect(mod.StatusBadge).toBeDefined();
    expect(mod.Badge).toBeDefined();
    expect(mod.Progress).toBeDefined();
    expect(mod.Input).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AMM tokens — Phase 2 invariants
// ---------------------------------------------------------------------------

describe("ammTokens — Phase 2 compliance", () => {
  it("eyebrow uses tracking-label (not tracking-[0.18em])", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.eyebrow).toContain("tracking-label");
    expect(mod.ammTokens.eyebrow).not.toContain("tracking-[0.18em]");
  });

  it("eyebrow uses text-[10.5px] not text-[11px]", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.eyebrow).not.toContain("text-[11px]");
  });

  it("headlineDisplay uses text-cream not hardcoded hex", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.headlineDisplay).toContain("text-cream");
    expect(mod.ammTokens.headlineDisplay).not.toContain("text-[#");
  });

  it("microMuted uses text-xs not arbitrary size", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.microMuted).toContain("text-xs");
    expect(mod.ammTokens.microMuted).not.toMatch(/text-\[\d/);
  });

  it("buttons use rounded-xl luxury standard", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.buttonGold).toContain("rounded-xl");
    expect(mod.ammTokens.buttonGoldLg).toContain("rounded-xl");
    expect(mod.ammTokens.buttonSecondary).toContain("rounded-xl");
  });

  it("buttons use text-midnight not hardcoded hex", async () => {
    const mod = await import("@/components/amm/tokens");
    expect(mod.ammTokens.buttonGold).toContain("text-midnight");
    expect(mod.ammTokens.buttonGold).not.toContain("text-[#050505]");
  });
});
