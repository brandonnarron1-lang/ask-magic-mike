import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { loadLeadIntelligenceFacts } from "@/lib/ai/neon-intelligence";

const COPILOT_ROUTE = readFileSync("app/api/admin/copilot/route.ts", "utf8");
const ASYNC_INTELLIGENCE = readFileSync("src/lib/ai/neon-intelligence.ts", "utf8");
const PERMISSION_REPOSITORY = readFileSync("src/lib/messaging/neon-communication-repository.ts", "utf8");

describe("Phase 7 Production lead-schema compatibility", () => {
  it("uses one canonical Production lead-facts loader for interactive and async Copilot", () => {
    expect(COPILOT_ROUTE).toContain("loadLeadIntelligenceFacts(");
    expect(ASYNC_INTELLIGENCE).toContain("l.lead_type");
    expect(ASYNC_INTELLIGENCE).toContain("l.source_detail");
    expect(ASYNC_INTELLIGENCE).toContain("l.question_raw");
    for (const source of [COPILOT_ROUTE, ASYNC_INTELLIGENCE]) {
      expect(source).not.toContain("l.funnel_type");
      expect(source).not.toContain("l.lead_source_surface");
      expect(source).not.toContain("l.timeline,");
      expect(source).not.toContain("l.question,");
    }
  });

  it("uses canonical source fields for communication permission review", () => {
    expect(PERMISSION_REPOSITORY).toContain("source, source_detail, page_url");
    expect(PERMISSION_REPOSITORY).not.toContain("lead_source_surface");
    expect(PERMISSION_REPOSITORY).not.toContain("source_url");
  });

  it("maps canonical Production rows into advisory-only AI facts", async () => {
    const query = vi.fn().mockResolvedValueOnce([{
      id: "59bba7cf-fe27-42c3-adb6-27b27727e5c7",
      lead_type: "seller",
      status: "assigned",
      score: 83,
      score_factors: [{ label: "Timeline", explanation: "ASAP" }],
      source: "internal_qa",
      source_detail: "seller_page",
      timeline_months: 0,
      target_geography: "Wilson, NC",
      city: "Wilson",
      is_test: true,
      communication_suppressed: true,
      question_raw: "INTERNAL QA — DO NOT CONTACT",
      notes: null,
      placement_id: "phase7_acceptance",
    }]).mockResolvedValueOnce([{
      channel: "email",
      purpose: "requested_service_response",
      state: "allowed",
      manual_review_required: false,
      updated_at: "2026-10-02T12:00:00.000Z",
    }]);

    const loaded = await loadLeadIntelligenceFacts({ query } as never, "59bba7cf-fe27-42c3-adb6-27b27727e5c7");

    expect(loaded?.facts).toMatchObject({
      leadType: "seller",
      source: "internal_qa",
      placement: "phase7_acceptance",
      timeline: "0 months",
      consentEmail: true,
      consentSms: false,
      isTest: true,
      suppressed: true,
      question: "INTERNAL QA — DO NOT CONTACT",
    });
    expect(String(query.mock.calls[0]?.[0])).not.toMatch(/l\.(funnel_type|lead_source_surface|timeline|question)(?:\W|$)/);
  });
});
