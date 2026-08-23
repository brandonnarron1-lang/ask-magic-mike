import { describe, expect, it } from "vitest";
import { evaluateReadinessContract } from "../../scripts/lib/monitor-contracts.mjs";

const readyBody = {
  ok: true,
  capture_function: true,
  leads_table: true,
  notification_table: true,
  rate_limit_required: true,
  rate_limit_table: true,
  rate_limit_secret_ready: true,
  rate_limit_ready: true,
  push_ready: true,
};

describe("production monitor readiness contract", () => {
  it("passes only when every required readiness dependency is true", () => {
    expect(evaluateReadinessContract(readyBody)).toEqual({
      ok: true,
      checks: readyBody,
    });
  });

  it.each([
    "ok",
    "capture_function",
    "leads_table",
    "notification_table",
    "rate_limit_required",
    "rate_limit_table",
    "rate_limit_secret_ready",
    "rate_limit_ready",
    "push_ready",
  ])("fails when %s is false or absent", (field) => {
    const falseResult = evaluateReadinessContract({ ...readyBody, [field]: false });
    const missing = { ...readyBody };
    delete missing[field];
    const missingResult = evaluateReadinessContract(missing);

    expect(falseResult.ok).toBe(false);
    expect(falseResult.checks[field]).toBe(false);
    expect(missingResult.ok).toBe(false);
    expect(missingResult.checks[field]).toBe(false);
  });

  it("fails safely for malformed response bodies", () => {
    expect(evaluateReadinessContract(null).ok).toBe(false);
    expect(evaluateReadinessContract([]).ok).toBe(false);
    expect(evaluateReadinessContract("ready").ok).toBe(false);
  });
});
