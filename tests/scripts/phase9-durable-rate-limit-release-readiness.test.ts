import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RELEASE_AUTHORITY,
  deploymentIdFromChecks,
  parseArguments,
  plan,
  sanitizeVercelEnvironmentInventory,
  validatePreflight,
} from "../../scripts/phase9-durable-rate-limit-release-readiness.mjs";

const source = readFileSync(
  "scripts/phase9-durable-rate-limit-release-readiness.mjs",
  "utf8",
);

function snapshot(overrides: Record<string, unknown> = {}) {
  const base = {
    mutates_production: false,
    git: {
      repository: RELEASE_AUTHORITY.repository,
      head: "candidate-head",
      clean: true,
      remote_main: RELEASE_AUTHORITY.productionCommit,
    },
    github: {
      pr: {
        number: RELEASE_AUTHORITY.pr,
        state: "OPEN",
        isDraft: true,
        mergeable: "MERGEABLE",
        mergeStateStatus: "CLEAN",
        headRefName: RELEASE_AUTHORITY.branch,
        headRefOid: "candidate-head",
        baseRefName: RELEASE_AUTHORITY.baseBranch,
        baseRefOid: RELEASE_AUTHORITY.productionCommit,
      },
      checks: [
        { name: "local-release-gate", bucket: "pass" },
        { name: "Vercel", bucket: "pass" },
      ],
      vercelDeploymentId: "dpl_candidate",
    },
    vercel: {
      project: {
        projectId: RELEASE_AUTHORITY.vercelProjectId,
        orgId: RELEASE_AUTHORITY.vercelOrgId,
        projectName: RELEASE_AUTHORITY.vercelProjectName,
      },
      environment: {
        keys: ["DATABASE_URL", "DATABASE_ENV"],
        databaseType: "sensitive",
        rateLimitHashSecretPresent: false,
      },
      preview: {
        id: "dpl_candidate",
        name: RELEASE_AUTHORITY.vercelProjectName,
        target: "preview",
        status: "READY",
        url: "ask-magic-mike-candidate-eyes-up-industries.vercel.app",
        aliases: [],
        health: {
          database: "ready",
          rate_limit_required: false,
          rate_limit_table: true,
          rate_limit_schema_ready: true,
          rate_limit_permissions_ready: true,
          rate_limit_rls_ready: true,
          rate_limit_store_ready: true,
          rate_limit_secret_ready: false,
          rate_limit_ready: true,
        },
      },
      production: {
        id: RELEASE_AUTHORITY.productionDeployment,
        name: RELEASE_AUTHORITY.vercelProjectName,
        target: "production",
        status: "READY",
        url: "ask-magic-mike-production-eyes-up-industries.vercel.app",
        aliases: ["www.askmagicmike.com", "askmagicmike.com"],
        health: { database: "ready" },
      },
    },
  };
  return Object.assign(base, overrides);
}

describe("Phase 9 durable rate-limit release readiness", () => {
  it("publishes a secret-free, no-write plan with the exact unconsumed gate", () => {
    const output = JSON.stringify(plan());
    expect(output).toContain(RELEASE_AUTHORITY.exactGate);
    expect(output).toContain(RELEASE_AUTHORITY.productionDeployment);
    expect(output).toContain(RELEASE_AUTHORITY.vercelProjectId);
    expect(output).not.toContain("postgresql://");
    expect(plan()).toMatchObject({
      mutates_production: false,
      writes_local_files: false,
    });
  });

  it("exposes plan and preflight modes only", () => {
    expect(parseArguments([])).toMatchObject({ mode: "plan" });
    expect(parseArguments(["--", "--plan"]))
      .toMatchObject({ mode: "plan" });
    expect(parseArguments(["--preflight", "--vercel-cwd", "/safe/link"]))
      .toEqual({ mode: "preflight", vercelCwd: "/safe/link" });
    expect(parseArguments(["--vercel-cwd=/safe/link", "--plan"]))
      .toEqual({ mode: "plan", vercelCwd: "/safe/link" });
    expect(() => parseArguments(["--execute"]))
      .toThrow("write_mode_not_supported");
    expect(() => parseArguments(["--merge"]))
      .toThrow("write_mode_not_supported");
    expect(() => parseArguments(["--deploy"]))
      .toThrow("write_mode_not_supported");
  });

  it("sanitizes Vercel metadata and fails if a protected value is returned", () => {
    expect(sanitizeVercelEnvironmentInventory([
      {
        key: "DATABASE_URL",
        type: "sensitive",
        target: ["production"],
      },
      {
        key: "NEXT_PUBLIC_SITE_URL",
        type: "plain",
        target: ["production"],
        value: "https://www.askmagicmike.com",
      },
    ])).toEqual([
      {
        key: "DATABASE_URL",
        type: "sensitive",
        target: ["production"],
      },
      {
        key: "NEXT_PUBLIC_SITE_URL",
        type: "plain",
        target: ["production"],
      },
    ]);
    expect(() => sanitizeVercelEnvironmentInventory([{
      key: "DATABASE_URL",
      type: "sensitive",
      target: ["production"],
      value: "must-never-be-returned",
    }])).toThrow("vercel_sensitive_value_returned");
  });

  it("binds the successful Vercel check to one deployment ID", () => {
    expect(deploymentIdFromChecks([
      {
        name: "Vercel",
        bucket: "pass",
        link: "https://vercel.com/eyes-up-industries/ask-magic-mike/ABC123",
      },
    ])).toBe("dpl_ABC123");
    expect(() => deploymentIdFromChecks([
      {
        name: "Vercel",
        bucket: "pending",
        link: "https://vercel.com/eyes-up-industries/ask-magic-mike/ABC123",
      },
    ])).toThrow("successful_vercel_check_missing");
  });

  it("accepts only the exact clean pre-release boundary", () => {
    expect(validatePreflight(snapshot())).toMatchObject({
      local_head_is_pr_head: true,
      production_commit_pinned: true,
      preview_rate_limit_store: true,
      dedicated_secret_absent_before_cutover: true,
      no_nellyselly_identity: true,
    });
  });

  it("fails closed on git, PR, check, deployment, secret, or Neon drift", () => {
    expect(() => validatePreflight(snapshot({
      git: {
        repository: RELEASE_AUTHORITY.repository,
        head: "different-head",
        clean: true,
        remote_main: RELEASE_AUTHORITY.productionCommit,
      },
    }))).toThrow("local_head_is_pr_head");

    const pending = snapshot();
    pending.github.checks[0].bucket = "pending";
    expect(() => validatePreflight(pending)).toThrow("github_checks_all_pass");

    const deploymentDrift = snapshot();
    (deploymentDrift.vercel.production as { id: string }).id = "dpl_unreviewed";
    expect(() => validatePreflight(deploymentDrift))
      .toThrow("production_deployment_pinned");

    const secretDrift = snapshot();
    secretDrift.vercel.environment.rateLimitHashSecretPresent = true;
    expect(() => validatePreflight(secretDrift))
      .toThrow("dedicated_secret_absent_before_cutover");

    const storeDrift = snapshot();
    storeDrift.vercel.preview.health.rate_limit_permissions_ready = false;
    expect(() => validatePreflight(storeDrift))
      .toThrow("preview_rate_limit_permissions");
  });

  it("rejects any NellySelly deployment or environment collision", () => {
    const collision = snapshot();
    collision.vercel.environment.keys.push("NELLYSELLY_DATABASE_URL");
    expect(() => validatePreflight(collision)).toThrow("no_nellyselly_identity");
  });

  it("contains no command path that can write, merge, deploy, or expose a secret", () => {
    for (const forbidden of [
      "vercel env add",
      "vercel env rm",
      "gh pr merge",
      "vercel deploy",
      "vercel promote",
      "git push",
      "git merge",
      "git reset",
      "DATABASE_URL=",
    ]) {
      expect(source).not.toContain(forbidden);
    }
    expect(source).toContain('"env", "ls", "production"');
    expect(source).toContain('"curl", "/api/health/ready"');
    expect(source).toContain("mutates_production: false");
  });
});
