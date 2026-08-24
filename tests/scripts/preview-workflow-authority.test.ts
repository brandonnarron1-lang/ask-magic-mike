import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflows = [
  ".github/workflows/preview-qa.yml",
  ".github/workflows/preview-qa-dispatch.yml",
].map((path) => ({ path, source: readFileSync(path, "utf8") }));

describe("Preview workflow launch authority", () => {
  it.each(workflows)(
    "$path cannot finish green while launch authority is blocked",
    ({ source }) => {
      const doctor = source.indexOf("npm run release:doctor");
      const authority = source.indexOf("npm run launch:authority");
      const strictAssert = source.indexOf("npm run release:assert");

      expect(doctor).toBeGreaterThan(-1);
      expect(authority).toBeGreaterThan(doctor);
      expect(strictAssert).toBeGreaterThan(authority);
      expect(source).toContain('REQUIRE_VERDICT: "PREVIEW_READY"');
      expect(source).toContain('SAFE_DB_WRITE: "false"');
      expect(source).toContain(
        "npm run --silent preview:e2e -- --reporter=json > artifacts/widget-e2e-report.json",
      );
    },
  );
});
