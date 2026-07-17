import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { advisorsSummary } from "../../scripts/release/pr121-offline-release.mjs";

const ROOT = process.cwd();
const RELEASE_SCRIPT = readFileSync(path.join(ROOT, "scripts/release/pr121-offline-release.mjs"), "utf8");

describe("PR121 offline release orchestration", () => {
  it("labels representative advisor JSON shapes and unsupported shapes", () => {
    expect(advisorsSummary("[]")).toEqual({
      parseStatus: "recognized",
      findingCount: 0,
      errorFindingCount: 0,
    });
    expect(advisorsSummary(JSON.stringify({ lints: [{ name: "example" }] }))).toEqual({
      parseStatus: "recognized",
      findingCount: 1,
      errorFindingCount: 1,
    });
    expect(advisorsSummary(JSON.stringify({ unexpected: true }))).toEqual({
      parseStatus: "unrecognized",
    });
  });

  it("requires a clean tracked tree for authoritative evidence", () => {
    expect(RELEASE_SCRIPT).toContain("authoritative_rehearsal_requires_clean_tracked_worktree");
    expect(RELEASE_SCRIPT).toContain("trackedWorktreeClean");
    expect(RELEASE_SCRIPT).toContain("headTree");
    expect(RELEASE_SCRIPT).toContain("targetMigrationBlob");
    expect(RELEASE_SCRIPT).toContain("preflightScriptBlob");
    expect(RELEASE_SCRIPT).toContain("fixtureFileBlob");
  });

  it("writes sanitized failure evidence without raw command streams", () => {
    const failureBlock = RELEASE_SCRIPT.slice(
      RELEASE_SCRIPT.indexOf("function writeFailureEvidence"),
      RELEASE_SCRIPT.indexOf("async function main"),
    );
    expect(failureBlock).toContain("failure-summary.json");
    expect(failureBlock).toContain("failedStage");
    expect(failureBlock).toContain("failureCode");
    expect(failureBlock).toContain("completedSteps");
    expect(failureBlock).not.toContain("stdout");
    expect(failureBlock).not.toContain("stderr");
  });

  it("surfaces stop failures and exact-project remaining containers", () => {
    expect(RELEASE_SCRIPT).toContain("local_supabase_stop_failed");
    expect(RELEASE_SCRIPT).toContain("local_supabase_containers_still_running");
    expect(RELEASE_SCRIPT).toContain("exactProjectRemainingContainerCount");
    expect(RELEASE_SCRIPT).not.toContain("runningNextProcessCount");
  });

  it("uses local-only Supabase migration commands", () => {
    expect(RELEASE_SCRIPT).toContain("\"db\", \"reset\", \"--local\"");
    expect(RELEASE_SCRIPT).toContain("\"migration\", \"up\", \"--local\"");
    expect(RELEASE_SCRIPT).not.toContain("--linked");
    expect(RELEASE_SCRIPT).not.toContain("--db-url");
  });
});
