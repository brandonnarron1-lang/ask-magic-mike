import { describe, expect, it, vi } from "vitest";
import { FirstLiveLeadMonitor } from "@/lib/operations/first-live-lead-monitor";

describe("FirstLiveLeadMonitor", () => {
  it("records one privacy-safe detection for a complete live lead", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{
        lead_id: "00000000-0000-4000-8000-000000000001",
        valid_created_at: true,
        valid_lead_type: true,
        consent_present: true,
        source_present: true,
        assignment_present: true,
        duplicate_suspected: false,
        email_status: "sent",
      }])
      .mockResolvedValueOnce([{ id: "audit-1" }]);

    const report = await new FirstLiveLeadMonitor({ query }).run();
    expect(report).toEqual({
      scanned: 1,
      detected: 1,
      escalated: 0,
      states: { invalidConsent: 0, missingSource: 0, missingAssignment: 0, missingInternalEmail: 0, deliveryFailure: 0, duplicateSuspicion: 0 },
    });
    expect(query).toHaveBeenCalledTimes(2);
    const serializedCalls = JSON.stringify(query.mock.calls);
    expect(serializedCalls).not.toContain("first_name");
    expect(serializedCalls).not.toContain("last_name");
    expect(serializedCalls).not.toContain("phone_normalized");
    expect(serializedCalls).not.toContain("question_raw");
  });

  it("records an escalation without consumer contact when readiness is incomplete", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{
        lead_id: "00000000-0000-4000-8000-000000000002",
        valid_created_at: true,
        valid_lead_type: true,
        consent_present: false,
        source_present: true,
        assignment_present: false,
        duplicate_suspected: true,
        email_status: "permanently_failed",
      }])
      .mockResolvedValueOnce([{ id: "audit-2" }]);

    const report = await new FirstLiveLeadMonitor({ query }).run();
    expect(report.detected).toBe(0);
    expect(report.escalated).toBe(1);
    expect(report.states).toEqual({ invalidConsent: 1, missingSource: 0, missingAssignment: 1, missingInternalEmail: 0, deliveryFailure: 1, duplicateSuspicion: 1 });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
