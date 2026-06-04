import { describe, expect, it } from "vitest";
import {
  matchesDeployment,
  pickMatchingDeployment,
} from "../../scripts/wait-for-vercel-preview.mjs";

const FULL_SHA = "abc1234567890def1234567890abcdef12345678";
const SHORT_SHA = "abc1234";
const BRANCH = "platform/phase-2-release-hardening";

function dep(overrides: Partial<{
  state: string;
  ref: string | null;
  sha: string | null;
  url: string;
}> = {}) {
  return {
    state: overrides.state ?? "READY",
    url: overrides.url ?? "ask-magic-mike-test.vercel.app",
    meta: {
      githubCommitRef: overrides.ref ?? BRANCH,
      githubCommitSha: overrides.sha ?? FULL_SHA,
    },
  };
}

describe("matchesDeployment", () => {
  it("matches exact branch + full SHA", () => {
    expect(
      matchesDeployment(dep(), { branch: BRANCH, sha: FULL_SHA })
    ).toBe(true);
  });

  it("matches abbreviated SHA against full SHA from Vercel", () => {
    expect(
      matchesDeployment(dep(), { branch: BRANCH, sha: SHORT_SHA })
    ).toBe(true);
  });

  it("matches full SHA against abbreviated meta SHA", () => {
    expect(
      matchesDeployment(dep({ sha: SHORT_SHA }), {
        branch: BRANCH,
        sha: FULL_SHA,
      })
    ).toBe(true);
  });

  it("rejects wrong branch", () => {
    expect(
      matchesDeployment(dep({ ref: "feature/other" }), {
        branch: BRANCH,
        sha: FULL_SHA,
      })
    ).toBe(false);
  });

  it("rejects wrong commit on the same branch", () => {
    expect(
      matchesDeployment(dep({ sha: "deadbeefdeadbeefdeadbeef" }), {
        branch: BRANCH,
        sha: FULL_SHA,
      })
    ).toBe(false);
  });

  it("rejects non-READY state even when SHA matches", () => {
    expect(
      matchesDeployment(dep({ state: "BUILDING" }), {
        branch: BRANCH,
        sha: FULL_SHA,
      })
    ).toBe(false);
  });

  it("rejects when target.sha is empty", () => {
    expect(
      matchesDeployment(dep(), { branch: BRANCH, sha: "" })
    ).toBe(false);
  });

  it("skips branch check when target.branch is null", () => {
    expect(
      matchesDeployment(dep({ ref: "any" }), { branch: null, sha: FULL_SHA })
    ).toBe(true);
  });
});

describe("pickMatchingDeployment", () => {
  it("returns the first matching deployment, ignoring earlier non-matches", () => {
    const r = pickMatchingDeployment(
      {
        deployments: [
          dep({ state: "BUILDING" }),
          dep({ ref: "feature/other" }),
          dep(),
        ],
      },
      { branch: BRANCH, sha: SHORT_SHA }
    );
    expect(r).not.toBeNull();
    expect(r!.state).toBe("READY");
  });

  it("returns null when no deployment matches", () => {
    expect(
      pickMatchingDeployment(
        { deployments: [dep({ sha: "deadbeefdeadbeefdeadbeef" })] },
        { branch: BRANCH, sha: FULL_SHA }
      )
    ).toBeNull();
  });

  it("returns null for empty or malformed envelopes", () => {
    expect(pickMatchingDeployment(null, { branch: BRANCH, sha: FULL_SHA })).toBeNull();
    expect(
      pickMatchingDeployment({ deployments: [] }, { branch: BRANCH, sha: FULL_SHA })
    ).toBeNull();
  });
});
