import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Action Queue first-response coverage surface", () => {
  const source = readFileSync(
    resolve(process.cwd(), "app/admin/action-queue/page.tsx"),
    "utf8",
  );

  it("shows aggregate coverage and fails visibly when evidence or work coverage is missing", () => {
    expect(source).toContain("hasLeadCenterPermission(principal.role, \"lead:view_all\")");
    expect(source).toContain("canViewAll ? queue.firstResponseCoverage : null");
    expect(source).toContain("{responseCoverage ? (");
    expect(source).toContain("First-response coverage");
    expect(source).toContain("responseCoverage.evidenceAvailable");
    expect(source).toContain("responseCoverage.uncoveredCount > 0");
    expect(source).toContain("Every current response risk has a direct or existing operator action.");
    expect(source).toContain("Immutable response evidence is unavailable; coverage is not inferred.");
  });

  it("does not expose global response coverage to assigned-only roles", () => {
    expect(source).toContain("const canViewAll = Boolean(");
    expect(source).toContain("principal && !canViewAll");
    expect(source).not.toContain("responseCoverage = queue.firstResponseCoverage");
  });

  it("keeps execution on the existing protected lead-detail workflow", () => {
    expect(source).toContain("href={`/admin/leads/${item.lead_id}`}");
    expect(source).not.toContain("recordFirstHumanResponseAction");
    expect(source).not.toContain("sms:");
    expect(source).not.toContain("mailto:");
  });
});
