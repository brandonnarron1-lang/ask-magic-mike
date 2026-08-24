import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const releaseCandidateSource = readFileSync(
  resolve(process.cwd(), "scripts/release-candidate-report.mjs"),
  "utf8"
);
const launchAuthoritySource = readFileSync(
  resolve(process.cwd(), "scripts/launch-authority-report.mjs"),
  "utf8"
);
const activeReportSources = `${releaseCandidateSource}\n${launchAuthoritySource}`;

describe("active release-report safety copy", () => {
  it("does not hardcode a production commit", () => {
    expect(activeReportSources).not.toContain("ecf59c9");
    expect(activeReportSources).toContain(
      "This report does not touch, merge, promote, migrate, or message Production."
    );
  });

  it("documents the canonical preview mutation controls", () => {
    expect(releaseCandidateSource).toContain("DATABASE_ENV");
    expect(releaseCandidateSource).toContain("PREVIEW_NEON_ENDPOINT_ID");
    expect(releaseCandidateSource).toContain("PRODUCTION_NEON_ENDPOINT_ID");
    expect(releaseCandidateSource).toContain("ALLOW_PREVIEW_DB_MUTATION");
    expect(releaseCandidateSource).toContain("PREVIEW_DATA_MODE");
    expect(releaseCandidateSource).not.toContain("PREVIEW_SUPABASE_PROJECT_REF");
  });
});
