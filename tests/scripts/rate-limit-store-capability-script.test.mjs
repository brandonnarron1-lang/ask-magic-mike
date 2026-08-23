import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("rate-limit store capability verifier", () => {
  it("fails safely without a database URL and does not disclose environment data", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "--experimental-strip-types",
        "scripts/verify-rate-limit-store-capability.mts",
      ],
      { cwd: process.cwd(), env, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      error: "database_not_configured",
    });
    expect(result.stdout).not.toContain("DATABASE_URL");
  });
});
