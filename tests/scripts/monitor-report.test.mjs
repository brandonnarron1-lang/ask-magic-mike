import { describe, expect, it } from "vitest";
import {
  boundedAttemptCount,
  buildMonitorReport,
  formatMonitorMarkdown,
  summarizeFailures,
} from "../../scripts/lib/monitor-report.mjs";

function result(overrides = {}) {
  return {
    name: "home",
    path: "/",
    expected: 200,
    actual: 200,
    ok: true,
    duration_ms: 12,
    ...overrides,
  };
}

function attempt(number, results) {
  return {
    attempt: number,
    checked_at: `2026-09-01T00:00:0${number}.000Z`,
    passed: results.filter(({ ok }) => ok).length,
    failed: results.filter(({ ok }) => !ok).length,
    results,
  };
}

describe("production monitor incident summaries", () => {
  it("classifies database readiness failures with every required field", () => {
    const summary = summarizeFailures([result({
      name: "ready",
      path: "/api/health/ready",
      actual: 503,
      ok: false,
      contract_checks: { capture_function: false, leads_table: false },
    })]);

    expect(summary).toMatchObject({
      ROOT_CAUSE_CATEGORY: "DATABASE_OR_RUNTIME_READINESS",
      FAILED_COMPONENT: "ready",
      RETRY_SAFE: true,
    });
    expect(summary.EXPECTED).toContain("every required readiness flag true");
    expect(summary.ACTUAL).toContain("capture_function");
    expect(summary.REMEDIATION).toContain("canonical Neon Production branch");
    expect(summary.PRODUCTION_IMPACT).toContain("Lead capture");
  });

  it("records bounded recovery without hiding the initial failure", () => {
    const report = buildMonitorReport({
      attempts: [
        attempt(1, [result({ actual: 503, ok: false })]),
        attempt(2, [result()]),
      ],
      target: "https://www.askmagicmike.com",
      trigger: "schedule",
      maxAttempts: 3,
    });

    expect(report.status).toBe("recovered_after_retry");
    expect(report.attempt_count).toBe(2);
    expect(report.summary.ROOT_CAUSE_CATEGORY).toContain("TRANSIENT_RECOVERED");
    expect(report.summary.ACTUAL).toContain("Recovered on bounded attempt 2");
    expect(report.attempts[0].failed).toBe(1);
    expect(formatMonitorMarkdown(report)).toContain("ROOT_CAUSE_CATEGORY");
  });

  it("does not misclassify explicit rate-limit or push readiness failures as database failures", () => {
    const rateLimit = summarizeFailures([result({
      name: "ready",
      actual: 503,
      ok: false,
      contract_checks: { rate_limit_ready: false },
    })]);
    const push = summarizeFailures([result({
      name: "ready",
      actual: 503,
      ok: false,
      contract_checks: { push_ready: false },
    })]);

    expect(rateLimit.ROOT_CAUSE_CATEGORY).toBe("RATE_LIMIT_READINESS");
    expect(push.ROOT_CAUSE_CATEGORY).toBe("NOTIFICATION_READINESS");
  });

  it("caps retry attempts at three and never permits zero", () => {
    expect(boundedAttemptCount(99)).toBe(3);
    expect(boundedAttemptCount(0)).toBe(1);
    expect(boundedAttemptCount("invalid")).toBe(3);
  });
});
