import { describe, expect, it, vi } from "vitest";
import { normalizeAdminLeadRow } from "../../app/lib/adminLeadView";
import { repeatInquiryReviewState, reviewRepeatInquiry } from "../../app/lib/repeatInquiryReview";
import { isTerminalContactRecord } from "../../app/lib/manualContactReview";
const data = { duplicate_of_lead_id: "00000000-0000-4000-8000-000000000001", status: "new", conversion_stage: "duplicate", is_test: false, communication_suppressed: false };
const row = (extra = {}) => normalizeAdminLeadRow({ ...data, ...extra });
describe("per-inquiry supervisor resolution, not inherited mutation authority", () => {
  it("makes the unresolved request visible while keeping it contact-terminal", () => {
    expect(repeatInquiryReviewState(row())).toBe("direct_assignment_required");
    expect(isTerminalContactRecord("new", "duplicate")).toBe(true);
    expect(repeatInquiryReviewState(row({ assigned_agent_id: data.duplicate_of_lead_id }))).toBe("supervisor_review");
  });
  it.each([{ is_test: true }, { communication_suppressed: true }, { status: "dead" }, { status: "converted" }])("never clears QA, suppression or later lifecycle: %o", extra => expect(repeatInquiryReviewState(row(extra))).toBe("held"));
  it("does not reopen resolved/historical ordinary records", () => {
    expect(repeatInquiryReviewState(row({ conversion_stage: "assigned" }))).toBe("not_required");
    expect(repeatInquiryReviewState(row({ duplicate_of_lead_id: null }))).toBe("not_required");
  });
  it("denies an inherited agent before persistence or provider access", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    try {
      expect(await reviewRepeatInquiry(data.duplicate_of_lead_id, { userId: "synthetic", agentId: "synthetic", role: "approved_agent", name: "SYNTHETIC", email: "synthetic@example.test" }, true)).toEqual({ ok: false, error: "forbidden" });
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
});
