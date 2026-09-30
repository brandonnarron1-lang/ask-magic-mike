import { beforeEach, describe, expect, it, vi } from "vitest";

const recordMock = vi.fn();

vi.mock("../../app/lib/persistence/neonPublicExperimentRepository", () => ({
  recordPublicExperimentEvent: (...args: unknown[]) => recordMock(...args),
}));

import { recordLeadExperimentConversion } from "../../app/lib/growth/lead-experiment-conversion";

const context = {
  experimentKey: "home_value_trust_promise_v1",
  subjectKey: "c".repeat(64),
  variantKey: "control",
  surface: "/home-value",
};
const LEAD_ID = "22222222-2222-4222-8222-222222222222";

describe("recordLeadExperimentConversion", () => {
  beforeEach(() => {
    recordMock.mockReset();
    recordMock.mockResolvedValue({
      active: true,
      recorded: true,
      variantKey: "control",
      reason: "recorded",
    });
  });

  it("does nothing when a lead has no verified experiment context", async () => {
    await expect(recordLeadExperimentConversion({
      context: null,
      leadId: LEAD_ID,
      isTest: false,
    })).resolves.toEqual({ attempted: false, reason: "no_context" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("excludes unmistakable QA leads from conversion accounting", async () => {
    await expect(recordLeadExperimentConversion({
      context,
      leadId: LEAD_ID,
      isTest: true,
    })).resolves.toEqual({ attempted: false, reason: "test_lead" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("authors the conversion server-side with the exact durable lead ID", async () => {
    const outcome = await recordLeadExperimentConversion({
      context,
      leadId: LEAD_ID,
      isTest: false,
    });
    expect(outcome).toMatchObject({
      attempted: true,
      result: { recorded: true, reason: "recorded" },
    });
    expect(recordMock).toHaveBeenCalledWith({
      experimentKey: context.experimentKey,
      subjectKey: context.subjectKey,
      variantKey: context.variantKey,
      surface: context.surface,
      eventName: "lead_created",
      leadId: LEAD_ID,
    });
  });
});
