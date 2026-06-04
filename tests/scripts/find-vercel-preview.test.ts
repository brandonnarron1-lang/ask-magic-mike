import { describe, expect, it } from "vitest";
import {
  parseVercelLsOutput,
  pickReadyPreview,
} from "../../scripts/find-vercel-preview.mjs";

describe("parseVercelLsOutput", () => {
  it("returns the first Ready Preview row", () => {
    const out = [
      "Fetching deployments in eyes-up-industries",
      "> Deployments for eyes-up-industries/ask-magic-mike [180ms]",
      "",
      "  Age     Project                               Deployment                                                         Status      Environment     Duration     Username",
      "  9s      eyes-up-industries/ask-magic-mike     https://ask-magic-mike-l8xfwzg8r-eyes-up-industries.vercel.app     ● Ready     Preview         40s          askmagicmike-6186",
      "  14h     eyes-up-industries/ask-magic-mike     https://ask-magic-mike-66gbdddjl-eyes-up-industries.vercel.app     ● Ready     Production      37s          askmagicmike-6186",
    ].join("\n");
    const r = parseVercelLsOutput(out);
    expect(r).not.toBeNull();
    expect(r!.url).toBe(
      "https://ask-magic-mike-l8xfwzg8r-eyes-up-industries.vercel.app"
    );
    expect(r!.status).toBe("Ready");
    expect(r!.env).toBe("Preview");
  });

  it("skips Production rows and returns the first Ready Preview after them", () => {
    const out = [
      "  14h     eyes-up-industries/ask-magic-mike     https://ask-magic-mike-66gbdddjl-eyes-up-industries.vercel.app     ● Ready     Production      37s          askmagicmike-6186",
      "  15h     eyes-up-industries/ask-magic-mike     https://ask-magic-mike-2km318brn-eyes-up-industries.vercel.app     ● Ready     Preview         38s          askmagicmike-6186",
    ].join("\n");
    const r = parseVercelLsOutput(out);
    expect(r?.url).toBe(
      "https://ask-magic-mike-2km318brn-eyes-up-industries.vercel.app"
    );
  });

  it("skips Building rows", () => {
    const out =
      "  9s      eyes-up-industries/ask-magic-mike     https://building.vercel.app     ● Building     Preview         --           askmagicmike-6186\n" +
      "  10m     eyes-up-industries/ask-magic-mike     https://ready.vercel.app        ● Ready        Preview         40s          askmagicmike-6186";
    const r = parseVercelLsOutput(out);
    expect(r?.url).toBe("https://ready.vercel.app");
  });

  it("returns null when no Ready Preview row exists", () => {
    const out = [
      "  14h     eyes-up-industries/ask-magic-mike     https://prod-only.vercel.app     ● Ready     Production      37s          askmagicmike-6186",
    ].join("\n");
    expect(parseVercelLsOutput(out)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseVercelLsOutput("")).toBeNull();
  });
});

describe("pickReadyPreview (JSON envelope)", () => {
  const sample = {
    deployments: [
      {
        url: "ask-magic-mike-newest-eyes-up.vercel.app",
        state: "BUILDING",
        target: null,
        createdAt: 100,
        meta: { githubCommitRef: "platform/phase-2-release-hardening" },
      },
      {
        url: "ask-magic-mike-ready1-eyes-up.vercel.app",
        state: "READY",
        target: null,
        createdAt: 90,
        meta: {
          githubCommitRef: "platform/phase-2-release-hardening",
          githubCommitSha: "abc1234",
        },
      },
      {
        url: "ask-magic-mike-other-branch-eyes-up.vercel.app",
        state: "READY",
        target: null,
        createdAt: 80,
        meta: { githubCommitRef: "feature/other" },
      },
    ],
  };

  it("returns the first READY entry when no branch filter is set", () => {
    const r = pickReadyPreview(sample);
    expect(r?.url).toBe(
      "https://ask-magic-mike-ready1-eyes-up.vercel.app"
    );
    expect(r?.state).toBe("READY");
  });

  it("respects the branch filter when given", () => {
    const r = pickReadyPreview(sample, "feature/other");
    expect(r?.url).toBe(
      "https://ask-magic-mike-other-branch-eyes-up.vercel.app"
    );
  });

  it("returns null when no READY deployment matches", () => {
    expect(pickReadyPreview(sample, "no/such/branch")).toBeNull();
    expect(pickReadyPreview({ deployments: [] })).toBeNull();
    expect(pickReadyPreview(null)).toBeNull();
  });

  it("preserves a fully-qualified URL when the API already returns one", () => {
    const r = pickReadyPreview({
      deployments: [
        { url: "https://already-full.vercel.app", state: "READY" },
      ],
    });
    expect(r?.url).toBe("https://already-full.vercel.app");
  });
});
