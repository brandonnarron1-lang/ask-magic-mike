import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("source-selected NC readiness acceptance", () => {
  it("selects the built real-session suite and retains genuine reference/conversion gates", () => {
    const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
    const runner = readFileSync("scripts/amm/reference-session-acceptance.mjs", "utf8");
    expect(workflow).toContain("AMM_NC_ROUTING_ACCEPTANCE=1 AMM_SESSION_ARTIFACT_DIR=.amm-run/nc-routing-ci pnpm run test:reference:sessions");
    expect(workflow).toContain(".amm-run/nc-routing-ci/receipt.json");
    expect(runner).toContain('ncRouting ? "tests/e2e/nc-routing-real-session.spec.ts"');
    expect(runner).toContain("exclusive_nc_routing_selection_required");
    expect(workflow).toContain("AMM_CONVERSION_SESSION_ACCEPTANCE=1 pnpm run test:reference:sessions");
    expect(workflow).toContain("tests/persistence/reference-allocation-postgres.test.ts");
  });
});
