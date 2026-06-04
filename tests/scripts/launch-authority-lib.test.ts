import { describe, expect, it } from "vitest";
import { computeLaunchVerdict } from "../../scripts/launch-authority-lib.mjs";

const healthyDoctor = { healthy: true, blocking_failures: [] };
const passingSafety = { passed: true, pass_count: 14, fail_count: 0 };

const safePreviewQa = {
  preview_url: "https://example.vercel.app",
  run_at: "2026-06-04T15:00:00.000Z",
  access_blocked: false,
  protection_bypass_present: true,
  mutation_gate_allowed: false,
  mutation_gate_reason: "SAFE_DB_WRITE not set",
  health_summary: {
    safe_for_preview_mutation: false,
    live_sms_disabled: true,
    live_email_disabled: true,
    database_env: "preview",
  },
  totals: { pass: 12, skip: 6, fail: 0 },
};

const passingE2e = {
  passed: true,
  stats: { expected: 2, unexpected: 0, flaky: 0, skipped: 0 },
};

const fullDocs = { rollbackDoc: true, governanceDocs: true };

describe("computeLaunchVerdict", () => {
  it("returns BLOCKED when doctor is unhealthy", () => {
    const r = computeLaunchVerdict({
      doctor: { healthy: false, blocking_failures: ["files.scripts/foo"] },
      safetyScan: passingSafety,
      previewQa: safePreviewQa,
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("returns BLOCKED when safety scan failed", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: { passed: false, pass_count: 0, fail_count: 1 },
      previewQa: safePreviewQa,
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("returns LOCAL_READY when preview QA is missing", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: null,
      widgetE2e: null,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("LOCAL_READY");
    expect(r.missing_work.join(" ")).toMatch(/preview:qa/);
  });

  it("returns LOCAL_READY when preview QA was blocked by missing bypass", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: {
        ...safePreviewQa,
        access_blocked: true,
        totals: { pass: 0, skip: 0, fail: 1 },
      },
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("LOCAL_READY");
    expect(r.missing_work.join(" ")).toMatch(
      /VERCEL_AUTOMATION_BYPASS_SECRET/
    );
  });

  it("returns BLOCKED when preview QA has substantive failures", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: {
        ...safePreviewQa,
        totals: { pass: 5, skip: 0, fail: 2 },
      },
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("returns BLOCKED when mutation was allowed without safe health", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: {
        ...safePreviewQa,
        mutation_gate_allowed: true,
        health_summary: {
          ...safePreviewQa.health_summary,
          safe_for_preview_mutation: false,
        },
      },
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("returns BLOCKED when live SMS or email is enabled in preview env", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: {
        ...safePreviewQa,
        health_summary: {
          ...safePreviewQa.health_summary,
          live_sms_disabled: false,
        },
      },
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("returns PREVIEW_READY when preview QA and widget e2e pass but mutation is blocked", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: safePreviewQa,
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("PREVIEW_READY");
  });

  it("returns PROMOTION_READY when mutation was allowed against safe health AND rollback docs present", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: {
        ...safePreviewQa,
        mutation_gate_allowed: true,
        health_summary: {
          ...safePreviewQa.health_summary,
          safe_for_preview_mutation: true,
        },
        totals: { pass: 18, skip: 0, fail: 0 },
      },
      widgetE2e: passingE2e,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).toBe("PROMOTION_READY");
  });

  it("never returns PROMOTION_READY when widget e2e is missing", () => {
    const r = computeLaunchVerdict({
      doctor: healthyDoctor,
      safetyScan: passingSafety,
      previewQa: safePreviewQa,
      widgetE2e: null,
      releaseCandidate: null,
      docs: fullDocs,
    });
    expect(r.verdict).not.toBe("PROMOTION_READY");
    expect(["LOCAL_READY", "BLOCKED"]).toContain(r.verdict);
  });
});
