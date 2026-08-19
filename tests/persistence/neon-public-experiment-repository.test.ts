import { describe, expect, it, vi } from "vitest";
import { NeonPublicExperimentRepository } from "../../app/lib/persistence/neonPublicExperimentRepository";

const EXPERIMENT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_KEY = "a".repeat(64);
const variants = [
  { key: "control", label: "Current trust promise", weight: 50 },
  { key: "broker_review", label: "Broker-review promise", weight: 50 },
];

describe("NeonPublicExperimentRepository", () => {
  it("does not query when the global runtime switch is off", async () => {
    const query = vi.fn();
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "false" });
    await expect(repository.record({
      experimentKey: "home_value_trust_promise_v1",
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
    })).resolves.toMatchObject({ active: false, recorded: false, reason: "disabled" });
    expect(query).not.toHaveBeenCalled();
  });

  it("fails closed when the canonical row is not approved and running", async () => {
    const query = vi.fn().mockResolvedValueOnce([{
      id: EXPERIMENT_ID,
      status: "approval_required",
      approval_status: "pending",
      variants,
    }]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: "home_value_trust_promise_v1",
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
    })).resolves.toMatchObject({ active: false, recorded: false, reason: "not_approved" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("records an idempotent assignment and exposure only after every gate agrees", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{
        id: EXPERIMENT_ID,
        status: "running",
        approval_status: "approved",
        variants,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ variant_key: "control" }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: "home_value_trust_promise_v1",
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
    })).resolves.toMatchObject({ active: true, recorded: true, variantKey: "control", reason: "recorded" });
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[1][0])).toContain("growth_experiment_assignments");
    expect(String(query.mock.calls[3][0])).toContain("growth_experiment_events");
    expect(String(query.mock.calls[3][0])).toContain("ON CONFLICT (idempotency_key)");
    expect(JSON.stringify(query.mock.calls)).not.toContain("person@");
  });

  it("refuses to count a test or suppressed lead as a conversion", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{
        id: EXPERIMENT_ID,
        status: "running",
        approval_status: "approved",
        variants,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ variant_key: "control" }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: "home_value_trust_promise_v1",
      subjectKey: SUBJECT_KEY,
      eventName: "lead_created",
      leadId: LEAD_ID,
    })).resolves.toMatchObject({ active: true, recorded: false, reason: "ineligible_lead" });
    expect(String(query.mock.calls[3][0])).toContain("is_test = false");
    expect(String(query.mock.calls[3][0])).toContain("communication_suppressed = false");
  });

  it("rejects a database variant configuration that differs from reviewed code", async () => {
    const query = vi.fn().mockResolvedValueOnce([{
      id: EXPERIMENT_ID,
      status: "running",
      approval_status: "approved",
      variants: [{ key: "control", weight: 10 }, { key: "unreviewed", weight: 90 }],
    }]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: "home_value_trust_promise_v1",
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
    })).resolves.toMatchObject({ active: false, recorded: false, reason: "registry_mismatch" });
  });
});
