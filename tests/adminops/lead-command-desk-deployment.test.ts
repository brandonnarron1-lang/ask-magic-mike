// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("command desk review-only deployment boundary",()=>{
  it("pins the standard runner supported by locked Playwright without weakening browser acceptance",()=>{
    const workflow=readFileSync(".github/workflows/release-gate.yml","utf8");
    expect(workflow).toContain("runs-on: ubuntu-24.04");
    expect(workflow).toContain("pnpm exec playwright install --with-deps chromium");
    expect(workflow).toContain("pnpm run test:reference:sessions");
    expect(workflow).toContain("timeout-minutes: 35");
  });
  it("explicitly disables app deployment for the review branch and retained state/source refs",()=>{
    const config=JSON.parse(readFileSync("vercel.json","utf8"));
    for(const branch of ["codex/today-task-fresh-review-20261109","codex/lead-command-desk-20261106","codex/mobile-direct-contact-20261101","codex/owned-social-publisher-20261101","codex/owned-social-publication-state"])expect(config.git.deploymentEnabled[branch]).toBe(false);
  });
});
