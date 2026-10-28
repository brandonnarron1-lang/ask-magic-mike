import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";

describe("shared Next build acceptance ordering", () => {
  it("runs development diagnostics only after all production-build consumers", () => {
    const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
    const diagnostic = workflow.indexOf("- name: Development guest canonical intake diagnostic");
    expect(diagnostic).toBeGreaterThan(0);
    const steps = [...workflow.matchAll(/- name: ([^\n]+)/g)];
    const compiled = steps.filter(step => /Built |Build$|Assert canonical route manifest|Launch authority report/.test(step[1]));
    expect(compiled.length).toBeGreaterThanOrEqual(9);
    for (const step of compiled) expect(step.index, step[1]).toBeLessThan(diagnostic);
    expect(workflow.slice(diagnostic)).toContain("AMM_E2E_BUILT=0");
  });
  it("bounds the receipt wait beyond the required gate budget without accepting an unfinished gate", () => {
    const gate=readFileSync(".github/workflows/release-gate.yml","utf8");
    const post=readFileSync(".github/workflows/production-post-deploy.yml","utf8");
    const script=readFileSync("scripts/release/generate-production-acceptance-receipt.mjs","utf8");
    const gateMinutes=Number(gate.match(/timeout-minutes: (\d+)/)?.[1]);
    const receiptMinutes=Number(post.match(/timeout-minutes: (\d+)/)?.[1]);
    const attempts=Number(script.match(/RELEASE_GATE_WAIT_ATTEMPTS \|\| (\d+)/)?.[1]);
    const delay=Number(script.match(/RELEASE_GATE_WAIT_MS \|\| ([\d_]+)/)?.[1]?.replaceAll("_",""));
    const waitMinutes=(attempts-1)*delay/60_000;
    expect(waitMinutes).toBeGreaterThan(gateMinutes);
    expect(waitMinutes+3).toBeLessThan(receiptMinutes);
    // Hosted run 40693373201 completed the test steps but hit 24 minutes during
    // finalization. Keep all three budgets finite and coherent, never waive CI.
    expect(gateMinutes).toBe(28);
    expect(receiptMinutes).toBe(35);
    expect(attempts).toBe(120);
    expect(script).toContain("Math.min(120,");
    expect(script).toContain("Math.min(15_000,");
    expect(script).toContain('if (run.conclusion !== "success") throw new Error("receipt_release_gate_failed")');
    expect(script).toContain('throw new Error("receipt_release_gate_timeout")');
  });
});
