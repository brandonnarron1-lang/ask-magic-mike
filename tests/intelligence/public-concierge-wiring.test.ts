import {readFileSync} from "node:fs";
import {expect,it} from "vitest";

it("selects both real concierge suites without letting next dev invalidate later compiled gates",()=>{
  const workflow=readFileSync(".github/workflows/release-gate.yml","utf8");
  const compiled=workflow.indexOf("tests/e2e/public-concierge.spec.ts");
  const staffCompiled=workflow.indexOf("Built staff handoff review");
  const development=workflow.indexOf("AMM_CONCIERGE_HANDOFF_ACCEPTANCE=1 AMM_E2E_BUILT=0");
  expect(compiled).toBeGreaterThan(0);
  expect(development).toBeGreaterThan(workflow.indexOf("pnpm run routes:assert"));
  expect(development).toBeGreaterThan(workflow.indexOf("Built lead navigation"));
  expect(development).toBeGreaterThan(compiled);
  expect(staffCompiled).toBeGreaterThan(compiled);
  expect(staffCompiled).toBeLessThan(workflow.indexOf("pnpm run routes:assert"));
  expect(development).toBeGreaterThan(staffCompiled);
  expect(workflow).toContain("tests/persistence/operator-handoff-postgres.test.ts");
  expect(workflow).toContain("tests/persistence/source-lifecycle-postgres.test.ts");
  expect(workflow).toContain("tests/persistence/intelligence-feedback-postgres.test.ts");
  const lifecycle=workflow.indexOf("AMM_R2_LIFECYCLE_ACCEPTANCE=1");
  expect(lifecycle).toBeGreaterThan(staffCompiled);
  expect(lifecycle).toBeLessThan(workflow.indexOf("pnpm run routes:assert"));
  const runner=readFileSync("scripts/amm/reference-session-acceptance.mjs","utf8");
  expect(runner).toContain('"tests/e2e/concierge-handoff-real-session.spec.ts"');
  expect(runner).toContain('explicit_clean_isolated_venue_required');
  expect(runner).toContain('EMAIL_ENABLED: "false"');
  expect(runner).toContain('exclusive_concierge_acceptance_selection_required');
  expect(runner).toContain('exclusive_r2_lifecycle_acceptance_selection_required');
  expect(runner).toContain('"tests/e2e/r2-source-feedback-real-session.spec.ts"');
});
