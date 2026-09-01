import { describe, expect, it } from "vitest";
import {
  buildIncidentMarkdown,
  findOpenIncident,
  PRODUCTION_INCIDENT_TITLE,
} from "../../scripts/lib/production-incident.mjs";

const report = {
  status: "failed",
  checked_at: "2026-09-01T00:00:00.000Z",
  trigger: "schedule",
  attempt_count: 3,
  max_attempts: 3,
  passed: 10,
  failed: 1,
  summary: {
    ROOT_CAUSE_CATEGORY: "DATABASE_OR_RUNTIME_READINESS",
    FAILED_COMPONENT: "ready",
    EXPECTED: "HTTP 200",
    ACTUAL: "HTTP 503",
    REMEDIATION: "Repair the canonical runtime credential.",
    RETRY_SAFE: true,
    PRODUCTION_IMPACT: "Lead storage may be unavailable.",
  },
};

describe("rolling production incident", () => {
  it("renders the required diagnostic contract without lead data", () => {
    const markdown = buildIncidentMarkdown(report, {
      runUrl: "https://github.com/example/repo/actions/runs/1",
    });
    for (const field of Object.keys(report.summary)) expect(markdown).toContain(field);
    expect(markdown).toContain("aggregate-only health evidence");
  });

  it("finds only the exact open rolling issue and ignores pull requests", () => {
    const issues = [
      { title: PRODUCTION_INCIDENT_TITLE, state: "open", pull_request: {} },
      { title: "unrelated", state: "open" },
      { number: 42, title: PRODUCTION_INCIDENT_TITLE, state: "open" },
    ];
    expect(findOpenIncident(issues)?.number).toBe(42);
  });
});
