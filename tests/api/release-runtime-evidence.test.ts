import { afterEach, describe, expect, it } from "vitest";

import { releaseRuntimeHeaders } from "@/lib/release/runtime-evidence";

const original = {
  sha: process.env.VERCEL_GIT_COMMIT_SHA,
  url: process.env.VERCEL_URL,
  target: process.env.VERCEL_TARGET_ENV,
  environment: process.env.VERCEL_ENV,
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    VERCEL_GIT_COMMIT_SHA: original.sha,
    VERCEL_URL: original.url,
    VERCEL_TARGET_ENV: original.target,
    VERCEL_ENV: original.environment,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("release runtime evidence", () => {
  it("exposes only non-sensitive Vercel source identity", () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "a".repeat(40);
    process.env.VERCEL_URL = "ask-magic-mike-preview.vercel.app";
    process.env.VERCEL_TARGET_ENV = "preview";
    expect(releaseRuntimeHeaders()).toEqual({
      "X-AMM-Release-Commit": "a".repeat(40),
      "X-AMM-Release-URL": "ask-magic-mike-preview.vercel.app",
      "X-AMM-Release-Target": "preview",
    });
  });

  it("fails observably rather than guessing when build metadata is absent", () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_TARGET_ENV;
    delete process.env.VERCEL_ENV;
    expect(releaseRuntimeHeaders()).toEqual({
      "X-AMM-Release-Commit": "unavailable",
      "X-AMM-Release-URL": "unavailable",
      "X-AMM-Release-Target": "unknown",
    });
  });
});
