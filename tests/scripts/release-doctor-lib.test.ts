import { describe, expect, it } from "vitest";
import {
  decideExitCode,
  summarize,
} from "../../scripts/release-doctor-lib.mjs";

describe("decideExitCode", () => {
  it("returns 0 when no blocking checks failed", () => {
    expect(
      decideExitCode([
        { status: "pass", blocking: true },
        { status: "fail", blocking: false },
        { status: "skip", blocking: true },
      ])
    ).toBe(0);
  });

  it("returns 1 when any blocking check failed", () => {
    expect(
      decideExitCode([
        { status: "pass", blocking: true },
        { status: "fail", blocking: true },
        { status: "pass", blocking: false },
      ])
    ).toBe(1);
  });

  it("returns 0 on an empty result list", () => {
    expect(decideExitCode([])).toBe(0);
  });
});

describe("summarize", () => {
  it("collects totals, blocking failures, and healthy flag", () => {
    const out = summarize({
      generated_at: "2026-06-04T00:00:00.000Z",
      git: { branch: "x", clean: true, commit: "abc" },
      results: [
        { id: "a", status: "pass", blocking: true, message: "" },
        { id: "b", status: "fail", blocking: false, message: "advisory" },
        { id: "c", status: "fail", blocking: true, message: "blocking" },
        { id: "d", status: "skip", blocking: false, message: "" },
      ],
    });
    expect(out.totals).toEqual({ pass: 1, fail: 2, skip: 1 });
    expect(out.blocking_failures).toEqual(["c"]);
    expect(out.healthy).toBe(false);
  });

  it("marks healthy when only advisory failures exist", () => {
    const out = summarize({
      generated_at: "x",
      git: { branch: "x", clean: true, commit: "x" },
      results: [
        { id: "a", status: "pass", blocking: true, message: "" },
        { id: "b", status: "fail", blocking: false, message: "advisory" },
      ],
    });
    expect(out.healthy).toBe(true);
    expect(out.blocking_failures).toEqual([]);
  });
});
