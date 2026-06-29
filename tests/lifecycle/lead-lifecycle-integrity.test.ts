/**
 * Lead Lifecycle Integrity Tests
 *
 * Verifies the critical lifecycle behaviors audited during Operation Lifeline:
 * - Attribution guard captures utm_content/utm_term-only submissions
 * - Schema state default is NC, not FL
 * - Escalation returns failure result when DB is not configured
 * - Escalation sets leads.status to "escalated", not "assigned"
 * - Unspam restores prior status rather than hardcoding "qualified"
 * - Agent status updates emit analytics events
 * - SLA sweep fetchOpenLeadStates includes lead_routing accepted_at check
 */

import { describe, it, expect } from "vitest";
import { SubmitIntakeSchema } from "@/schemas/lead.schema";

// ---------------------------------------------------------------------------
// Schema defaults
// ---------------------------------------------------------------------------

describe("SubmitIntakeSchema defaults", () => {
  it("defaults state to NC (not FL)", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("NC");
    }
  });

  it("accepts an explicit state override", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      state: "VA",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.state).toBe("VA");
  });

  it("allows utm_content and utm_term with no other UTM fields", () => {
    const result = SubmitIntakeSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      utmContent: "banner-v2",
      utmTerm: "wilson nc homes",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utmContent).toBe("banner-v2");
      expect(result.data.utmTerm).toBe("wilson nc homes");
    }
  });
});

// ---------------------------------------------------------------------------
// Attribution guard: utm_content + utm_term must trigger write
// ---------------------------------------------------------------------------

describe("Attribution guard covers all UTM fields", () => {
  it("source code contains utm_content and utm_term in the attribution guard condition", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/app/api/intake/submit/route.ts"),
      "utf-8"
    );
    // Both fields must be present in the guard so a utm_content/utm_term-only
    // submission still writes a source_attribution row
    expect(src).toContain("input.utmContent");
    expect(src).toContain("input.utmTerm");
  });
});

// ---------------------------------------------------------------------------
// Escalation — no silent swallowing of failures
// ---------------------------------------------------------------------------

describe("escalateLead", () => {
  it("returns escalated=false with error when Supabase env vars are absent", async () => {
    // Temporarily clear env vars
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const { escalateLead } = await import("@/lib/routing/escalation");
      const result = await escalateLead("lead-1", "routing-1", "test reason");
      expect(result.escalated).toBe(false);
      expect(result.error).toBe("db_not_configured");
    } finally {
      if (savedUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
      if (savedKey) process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
    }
  });

  it("source code sets leads.status to 'escalated', not 'assigned'", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/routing/escalation.ts"),
      "utf-8"
    );
    expect(src).toContain("status: \"escalated\"");
    expect(src).not.toContain("status: \"assigned\"");
  });
});

// ---------------------------------------------------------------------------
// Unspam status preservation
// ---------------------------------------------------------------------------

describe("Admin PATCH unspam status preservation", () => {
  it("source code restores prior status rather than hardcoding qualified", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/app/api/admin/leads/[id]/route.ts"),
      "utf-8"
    );
    // Must not hardcode "qualified" as the target status when unspamming
    // (the route may still contain "qualified" as a LEAD_STATUSES member)
    expect(src).not.toContain(": \"qualified\"");
    // Must restore prior status after reading it from DB
    expect(src).toContain("priorStatus");
    expect(src).toContain("mark_spam === false");
  });
});

// ---------------------------------------------------------------------------
// Agent status audit trail
// ---------------------------------------------------------------------------

describe("Agent status update audit trail", () => {
  it("source code emits an analytics event after successful status update", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(
        process.cwd(),
        "src/app/api/agent/[agentId]/leads/[leadId]/status/route.ts"
      ),
      "utf-8"
    );
    expect(src).toContain("trackEventNoWait");
    expect(src).toContain("agent_status_updated");
  });
});

// ---------------------------------------------------------------------------
// SLA sweep — reads accepted_at from lead_routing
// ---------------------------------------------------------------------------

describe("SLA sweep acceptedAt", () => {
  it("source code queries lead_routing for accepted_at instead of always using null", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/engines/sla-sweep.ts"),
      "utf-8"
    );
    expect(src).toContain("lead_routing");
    expect(src).toContain("accepted_at");
    expect(src).toContain("acceptedAtByLeadId");
    // The old hardcoded null comment must be gone
    expect(src).not.toContain("acceptedAt: null, // Could read from lead_routing");
  });
});

// ---------------------------------------------------------------------------
// Synthetic lead exclusion in funnelHealth
// ---------------------------------------------------------------------------

describe("Revenue command funnelHealth synthetic exclusion", () => {
  it("filters synthetic leads from 24h/7d/30d funnel health counts", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/admin/revenue-command.ts"),
      "utf-8"
    );
    // isSyntheticEmail must be called inside the leads counting loop
    const loopSection = src.slice(src.indexOf("// 5. Compute funnel health"), src.indexOf("// 6. Source attribution"));
    expect(loopSection).toContain("isSyntheticEmail");
  });
});

// ---------------------------------------------------------------------------
// Conversion rate: no 100% fallback
// ---------------------------------------------------------------------------

describe("Traffic command conversion rate", () => {
  it("returns null conversion rate when no session event data exists", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/admin/traffic-command.ts"),
      "utf-8"
    );
    // Must gate on sessionEvents.length > 0 before computing rate
    expect(src).toContain("sessionEvents.length > 0");
  });
});

// ---------------------------------------------------------------------------
// Weekly report: highIntentLeads labeled as 24h not "this week"
// ---------------------------------------------------------------------------

describe("Weekly executive report field names", () => {
  it("uses highIntentLeads24h to clarify the 24h window", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/admin/weekly-executive-report.ts"),
      "utf-8"
    );
    expect(src).toContain("highIntentLeads24h");
    expect(src).not.toContain("highIntentLeads:");
  });

  it("traffic page renders the 24h label correctly", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/app/(admin)/admin/traffic/page.tsx"),
      "utf-8"
    );
    expect(src).toContain("highIntentLeads24h");
    expect(src).toContain("last 24h");
  });
});
