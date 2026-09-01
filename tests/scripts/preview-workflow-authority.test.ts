import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/preview-qa.yml";
const workflowSource = readFileSync(workflowPath, "utf8");

describe("Preview workflow launch authority", () => {
  it("the canonical workflow cannot finish green while launch authority is blocked", () => {
    const doctor = workflowSource.indexOf("npm run release:doctor");
    const authority = workflowSource.indexOf("npm run launch:authority");
    const strictAssert = workflowSource.indexOf("npm run release:assert");

    expect(doctor).toBeGreaterThan(-1);
    expect(authority).toBeGreaterThan(doctor);
    expect(strictAssert).toBeGreaterThan(authority);
    expect(workflowSource).toContain('REQUIRE_VERDICT: "PREVIEW_READY"');
    expect(workflowSource).toContain('SAFE_DB_WRITE: "false"');
    expect(workflowSource).toContain("target_ref:");
    expect(workflowSource).toContain(
      "npm run --silent preview:e2e -- --reporter=json > artifacts/widget-e2e-report.json",
    );
  });

  it("has one manual Preview QA authority instead of a duplicate dispatcher", () => {
    expect(existsSync(workflowPath)).toBe(true);
    expect(existsSync(".github/workflows/preview-qa-dispatch.yml")).toBe(false);
  });
});
