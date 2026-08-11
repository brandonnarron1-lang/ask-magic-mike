import { describe, expect, it } from "vitest";
import { selectLeadAlertVisualTemplate, shouldQueueAgentUrgencySms } from "../../app/lib/leadAlertVisualTemplates";

describe("lead-alert visual template selection", () => {
  it("uses deterministic urgency bands and never uses an image for QA", () => {
    expect(selectLeadAlertVisualTemplate({ is_test: true }, { score: 100 }).id).toBe("qa_test");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 80 }).id).toBe("hot_priority");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 60 }).id).toBe("active_assignment");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 59 }).id).toBe("new_lead");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 80 }).backgroundAssetPath).toContain("lead-alert-hot-v2.png");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 60 }).backgroundAssetPath).toContain("lead-alert-active-v2.png");
    expect(selectLeadAlertVisualTemplate({ is_test: false }, { score: 59 }).backgroundAssetPath).toContain("lead-alert-new-v2.png");
  });

  it("allows agent urgency SMS only with both configured delivery and approved recipient", () => {
    expect(shouldQueueAgentUrgencySms({ isTest: false, score: 80, hasApprovedSmsRecipient: true, smsDeliveryEnabled: true })).toBe(true);
    expect(shouldQueueAgentUrgencySms({ isTest: true, score: 80, hasApprovedSmsRecipient: true, smsDeliveryEnabled: true })).toBe(false);
    expect(shouldQueueAgentUrgencySms({ isTest: false, score: 0, hasApprovedSmsRecipient: true, smsDeliveryEnabled: true })).toBe(true);
    expect(shouldQueueAgentUrgencySms({ isTest: false, score: 80, hasApprovedSmsRecipient: false, smsDeliveryEnabled: true })).toBe(false);
  });
});
