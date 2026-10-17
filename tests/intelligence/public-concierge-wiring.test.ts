import {readFileSync} from "node:fs";
import {expect,it} from "vitest";

it("selects both real concierge suites without letting next dev invalidate later compiled gates",()=>{
  const workflow=readFileSync(".github/workflows/release-gate.yml","utf8");
  const compiled=workflow.indexOf("tests/e2e/public-concierge.spec.ts");
  const development=workflow.indexOf("AMM_CONCIERGE_HANDOFF_ACCEPTANCE=1");
  expect(compiled).toBeGreaterThan(0);
  expect(development).toBeGreaterThan(workflow.indexOf("pnpm run routes:assert"));
  expect(development).toBeGreaterThan(workflow.indexOf("Built lead navigation"));
  expect(development).toBeGreaterThan(compiled);
  const runner=readFileSync("scripts/amm/reference-session-acceptance.mjs","utf8");
  expect(runner).toContain('"tests/e2e/concierge-handoff-real-session.spec.ts"');
  expect(runner).toContain('explicit_clean_isolated_venue_required');
  expect(runner).toContain('EMAIL_ENABLED: "false"');
  expect(runner).toContain('exclusive_concierge_acceptance_selection_required');
});
