import { describe, expect, it, vi } from "vitest";
import { assignExperimentVariant } from "../../app/lib/growth/experiment-engine";
import { NeonPublicExperimentRepository } from "../../app/lib/persistence/neonPublicExperimentRepository";

const EXPERIMENT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const SUBJECT_KEY = "a".repeat(64);
const EXPERIMENT_KEY = "home_value_trust_promise_v1";
const SURFACE = "/home-value";
const variants = [
  { key: "control", label: "Current trust promise", weight: 50 },
  { key: "broker_review", label: "Broker-review promise", weight: 50 },
];
const ASSIGNED_VARIANT = assignExperimentVariant(EXPERIMENT_KEY, SUBJECT_KEY, variants);
const OTHER_VARIANT = ASSIGNED_VARIANT === "control" ? "broker_review" : "control";

function approvedExperiment() {
  return {
    id: EXPERIMENT_ID,
    status: "running",
    approval_status: "approved",
    variants,
  };
}

describe("NeonPublicExperimentRepository", () => {
  it("does not query when the global runtime switch is off", async () => {
    const query = vi.fn();
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "false" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
      surface: SURFACE,
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
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
      surface: SURFACE,
    })).resolves.toMatchObject({ active: false, recorded: false, reason: "not_approved" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("records an idempotent assignment and exposure only after every gate agrees", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([approvedExperiment()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ variant_key: ASSIGNED_VARIANT }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
      surface: SURFACE,
    })).resolves.toMatchObject({
      active: true,
      recorded: true,
      variantKey: ASSIGNED_VARIANT,
      reason: "recorded",
    });
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[1][0])).toContain("INSERT INTO public.growth_experiment_assignments");
    expect(String(query.mock.calls[3][0])).toContain("growth_experiment_events");
    expect(String(query.mock.calls[3][0])).toContain("ON CONFLICT (idempotency_key)");
    expect(JSON.stringify(query.mock.calls)).not.toContain("person@");
  });

  it("requires a durable prior exposure before recording a conversion", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([approvedExperiment()])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      variantKey: ASSIGNED_VARIANT,
      surface: SURFACE,
      eventName: "lead_created",
      leadId: LEAD_ID,
    })).resolves.toMatchObject({
      active: true,
      recorded: false,
      reason: "missing_exposure",
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[1][0])).toContain("SELECT variant_key");
    expect(JSON.stringify(query.mock.calls)).not.toContain("FROM public.leads");
    expect(JSON.stringify(query.mock.calls)).not.toContain("growth_experiment_events");
  });

  it("rejects a conversion variant that differs from the stored deterministic assignment", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([approvedExperiment()])
      .mockResolvedValueOnce([{ variant_key: ASSIGNED_VARIANT }]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      variantKey: OTHER_VARIANT,
      surface: SURFACE,
      eventName: "lead_created",
      leadId: LEAD_ID,
    })).resolves.toMatchObject({
      active: true,
      recorded: false,
      variantKey: ASSIGNED_VARIANT,
      reason: "variant_mismatch",
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("records a server-bound conversion for the exact eligible durable lead", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([approvedExperiment()])
      .mockResolvedValueOnce([{ variant_key: ASSIGNED_VARIANT }])
      .mockResolvedValueOnce([{ id: LEAD_ID }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      variantKey: ASSIGNED_VARIANT,
      surface: SURFACE,
      eventName: "lead_created",
      leadId: LEAD_ID,
    })).resolves.toMatchObject({
      active: true,
      recorded: true,
      variantKey: ASSIGNED_VARIANT,
      reason: "recorded",
    });
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[1][0])).toContain("SELECT variant_key");
    expect(String(query.mock.calls[1][0])).not.toContain("INSERT INTO");
    expect(String(query.mock.calls[2][0])).toContain("FROM public.leads");
    expect(String(query.mock.calls[2][0])).toContain("is_test = false");
    expect(String(query.mock.calls[2][0])).toContain("communication_suppressed = false");
    expect(String(query.mock.calls[3][0])).toContain("growth_experiment_events");
    expect(String(query.mock.calls[3][1])).toContain(LEAD_ID);
  });

  it("refuses to count a test, suppressed, or missing lead as a conversion", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([approvedExperiment()])
      .mockResolvedValueOnce([{ variant_key: ASSIGNED_VARIANT }])
      .mockResolvedValueOnce([]);
    const repository = new NeonPublicExperimentRepository({ query }, { PUBLIC_EXPERIMENTS_ENABLED: "true" });
    await expect(repository.record({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      variantKey: ASSIGNED_VARIANT,
      surface: SURFACE,
      eventName: "lead_created",
      leadId: LEAD_ID,
    })).resolves.toMatchObject({ active: true, recorded: false, reason: "ineligible_lead" });
    expect(query).toHaveBeenCalledTimes(3);
    expect(String(query.mock.calls[2][0])).toContain("is_test = false");
    expect(String(query.mock.calls[2][0])).toContain("communication_suppressed = false");
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
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
      surface: SURFACE,
    })).resolves.toMatchObject({ active: false, recorded: false, reason: "registry_mismatch" });
  });
});
