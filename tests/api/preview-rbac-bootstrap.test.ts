import { describe, expect, it } from "vitest";
import { previewRbacBootstrapAvailable } from "../../app/api/internal/preview/rbac-bootstrap/route";

const ready = {
  VERCEL_ENV: "preview",
  DATABASE_ENV: "preview",
  PREVIEW_DATA_MODE: "enabled",
  ALLOW_PREVIEW_DB_MUTATION: "true",
  LEAD_CENTER_RBAC_ENABLED: "true",
  DATABASE_URL: "postgresql://preview.invalid/neondb",
  RBAC_PREVIEW_BOOTSTRAP_TOKEN: "test-token",
};

describe("Preview RBAC bootstrap boundary", () => {
  it("is available only when every Preview isolation guard is explicit", () => {
    expect(previewRbacBootstrapAvailable(ready)).toBe(true);
    for (const key of Object.keys(ready)) {
      expect(previewRbacBootstrapAvailable({ ...ready, [key]: undefined })).toBe(false);
    }
  });

  it("can never activate in Production", () => {
    expect(previewRbacBootstrapAvailable({
      ...ready,
      VERCEL_ENV: "production",
      DATABASE_ENV: "production",
    })).toBe(false);
  });
});
