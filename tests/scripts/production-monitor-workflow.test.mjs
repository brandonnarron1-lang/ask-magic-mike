import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monitor = readFileSync(".github/workflows/production-monitor.yml", "utf8");
const postDeploy = readFileSync(".github/workflows/production-post-deploy.yml", "utf8");
const releaseGate = readFileSync(".github/workflows/release-gate.yml", "utf8");

describe("layered CI workflow topology", () => {
  it("uses one six-hour reusable monitor with bounded retries and incident authority", () => {
    expect(monitor).toContain('cron: "5 */6 * * *"');
    expect(monitor).toContain("workflow_call:");
    expect(monitor).toContain('MONITOR_MAX_ATTEMPTS: "3"');
    expect(monitor).toContain("issues: write");
    expect(monitor).toContain("report-production-incident.mjs");
    expect(monitor).toContain("Enforce production verification");
    expect(monitor).not.toContain("pnpm install");
  });

  it("runs the canonical verifier only after successful Production deployment status", () => {
    expect(postDeploy).toContain("deployment_status:");
    expect(postDeploy).toContain("deployment_status.state == 'success'");
    expect(postDeploy).toContain("deployment.environment == 'Production'");
    expect(postDeploy).toContain("uses: ./.github/workflows/production-monitor.yml");
  });

  it("keeps main as the only push release authority and removes duplicate Preview dispatch", () => {
    expect(releaseGate).toContain("- main");
    expect(releaseGate).not.toContain("platform/phase-2-release-hardening");
    expect(existsSync(".github/workflows/preview-qa-dispatch.yml")).toBe(false);
  });
});
