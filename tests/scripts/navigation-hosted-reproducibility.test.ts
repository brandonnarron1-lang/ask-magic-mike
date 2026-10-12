import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hosted navigation acceptance reproducibility", () => {
  it("runs the exact compiled navigation suite in an isolated private namespace", () => {
    const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
    expect(workflow).toContain("AMM_LEAD_READABILITY_ACCEPTANCE=1 AMM_SESSION_ARTIFACT_DIR=.amm-run/lead-navigation-ci pnpm run test:reference:sessions");
    expect(workflow).toContain(".amm-run/lead-navigation-ci/receipt.json");
    expect(workflow).toContain(".amm-run/lead-navigation-ci/screenshots/*.png");
  });
  it("renders synthetic email from source rather than an ignored local HTML artifact", () => {
    const suite = readFileSync("tests/e2e/lead-readability-real-session.spec.ts", "utf8");
    expect(suite).toContain("renderReadableLeadAlert(emailFixture).html");
    expect(suite).toContain("Synthetic review only. No consumer exists.");
    expect(suite).not.toContain("email-preview.html");
    expect(suite).toContain('expect(errors).toEqual([])');
  });
});
