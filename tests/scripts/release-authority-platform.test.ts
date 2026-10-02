import { describe, expect, it } from "vitest";

import {
  extractVercelDeploymentId,
  findSuccessfulVercelStatus,
} from "../../scripts/lib/release-authority-platform.mjs";

const expected = { team: "eyes-up-industries", project: "ask-magic-mike" };

describe("release authority platform evidence", () => {
  it("extracts a deployment only from the canonical Vercel project target", () => {
    expect(
      extractVercelDeploymentId(
        "https://vercel.com/eyes-up-industries/ask-magic-mike/AbC123",
        expected,
      ),
    ).toBe("dpl_AbC123");
    expect(() =>
      extractVercelDeploymentId(
        "https://vercel.com/eyes-up-industries/nellyselly/AbC123",
        expected,
      ),
    ).toThrow("vercel_status_project_mismatch");
  });

  it("rejects missing, failed, or foreign Vercel commit status", () => {
    expect(() => findSuccessfulVercelStatus({ sha: "a", statuses: [] }, expected)).toThrow(
      "vercel_success_status_missing",
    );
    expect(() =>
      findSuccessfulVercelStatus(
        {
          sha: "a",
          statuses: [{
            context: "Vercel",
            state: "success",
            target_url: "https://vercel.com/other/ask-magic-mike/AbC123",
          }],
        },
        expected,
      ),
    ).toThrow("vercel_status_team_mismatch");
  });
});
