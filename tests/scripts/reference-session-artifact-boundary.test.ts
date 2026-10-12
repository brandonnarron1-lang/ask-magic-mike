import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("isolated session artifact boundary", () => {
  for (const directory of ["output/not-private", ".amm-run/../../outside"]) {
    it(`rejects runner output ${directory} before database setup`, () => {
      const result = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/amm/reference-session-acceptance.mjs"], {
        cwd: process.cwd(), encoding: "utf8", timeout: 4000,
        // Application-wide required env typings do not apply to this child.
        // Do not inherit provider credentials just to satisfy that interface.
        env: { PATH: process.env.PATH, AMM_QA_POSTGRES_TEST: "1", AMM_SESSION_ARTIFACT_DIR: directory } as unknown as NodeJS.ProcessEnv,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("private_session_artifact_directory_required");
      expect(result.stdout).toBe("");
    });
    it(`rejects transport output ${directory} before constructing its pool`, () => {
      const result = spawnSync(process.execPath, ["--import=./tests/support/isolated-neon-transport.mjs", "-e", "process.exitCode=0"], {
        cwd: process.cwd(), encoding: "utf8", timeout: 4000,
        env: { PATH: process.env.PATH, AMM_SESSION_ARTIFACT_DIR: directory } as unknown as NodeJS.ProcessEnv,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("private_session_artifact_directory_required");
      expect(result.stdout).toBe("");
    });
  }
});
