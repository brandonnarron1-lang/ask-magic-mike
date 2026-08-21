import { describe, expect, it } from "vitest";
import { isApprovedPublicOrigin } from "../../app/lib/publicOrigin";

function testEnv(values: Record<string, string | undefined>) {
  return values as unknown as NodeJS.ProcessEnv;
}

describe("public origin boundary", () => {
  it("accepts canonical owned origins in every environment", () => {
    const env = testEnv({ NODE_ENV: "production", VERCEL_ENV: "production" });
    expect(isApprovedPublicOrigin("https://www.askmagicmike.com", env)).toBe(true);
    expect(isApprovedPublicOrigin("https://www.ourtownproperties.com", env)).toBe(true);
  });

  it("accepts only the exact Vercel deployment and branch origins in Preview", () => {
    const env = testEnv({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "ask-magic-mike-abc-eyes-up-industries.vercel.app",
      VERCEL_BRANCH_URL: "ask-magic-mike-git-feature-eyes-up-industries.vercel.app",
    });

    expect(isApprovedPublicOrigin("https://ask-magic-mike-abc-eyes-up-industries.vercel.app", env)).toBe(true);
    expect(isApprovedPublicOrigin("https://ask-magic-mike-git-feature-eyes-up-industries.vercel.app", env)).toBe(true);
    expect(isApprovedPublicOrigin("https://attacker-preview.vercel.app", env)).toBe(false);
  });

  it("never trusts Preview metadata while running as Production", () => {
    const env = testEnv({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_URL: "ask-magic-mike-preview.vercel.app",
      VERCEL_BRANCH_URL: "ask-magic-mike-git-feature.vercel.app",
    });

    expect(isApprovedPublicOrigin("https://ask-magic-mike-preview.vercel.app", env)).toBe(false);
    expect(isApprovedPublicOrigin("https://ask-magic-mike-git-feature.vercel.app", env)).toBe(false);
  });

  it("rejects insecure or malformed Preview origins", () => {
    const env = testEnv({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "ask-magic-mike-preview.vercel.app",
      VERCEL_BRANCH_URL: "not a host",
    });

    expect(isApprovedPublicOrigin("http://ask-magic-mike-preview.vercel.app", env)).toBe(false);
    expect(isApprovedPublicOrigin("https://not a host", env)).toBe(false);
  });

  it("retains localhost support only outside Production", () => {
    const development = testEnv({ NODE_ENV: "development" });
    const production = testEnv({ NODE_ENV: "production", VERCEL_ENV: "production" });

    expect(isApprovedPublicOrigin("http://localhost:3049", development)).toBe(true);
    expect(isApprovedPublicOrigin("http://127.0.0.1:3049", development)).toBe(true);
    expect(isApprovedPublicOrigin("http://localhost:3049", production)).toBe(false);
  });

  it("allows origin-less server-to-server requests without adding a host wildcard", () => {
    expect(isApprovedPublicOrigin(null, testEnv({}))).toBe(true);
  });
});
