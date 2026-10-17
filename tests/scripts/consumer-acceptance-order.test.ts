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
});
