import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scanner = readFileSync(join(root, "scripts/release-safety-scan.mjs"), "utf8");

describe("release safety current-router coverage", () => {
  it("scans both canonical app and retained src deployable trees", () => {
    expect(scanner).toContain("DEPLOYABLE_ROOTS");
    expect(scanner).toContain('join(REPO_ROOT, "app")');
    expect(scanner).toContain('join(REPO_ROOT, "src")');
  });

  it("covers canonical Neon, Better Auth, provider, and signing secrets", () => {
    for (const name of [
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "OPENAI_API_KEY",
      "SMTP_PASSWORD",
      "VAPID_PRIVATE_KEY",
      "WORDPRESS_BRIDGE_SECRET",
      "LEAD_NOTIFICATION_BCC",
    ]) {
      expect(scanner).toContain(`"${name}"`);
    }
  });

  it("checks active widget and listing routes instead of only retired routes", () => {
    expect(scanner).toContain("app/widget/v1/page.tsx");
    expect(scanner).toContain("app/widget-preview/page.tsx");
    expect(scanner).toContain("app/api/listings/search/route.ts");
    expect(scanner).toContain("app/api/listings/[id]/route.ts");
  });

  it("checks the active admin-health wrapper and reviewed implementation", () => {
    expect(scanner).toContain("app/api/admin/health/route.ts");
    expect(scanner).toContain("src/app/api/admin/health/route.ts");
    expect(scanner).toContain("Boolean\\\\(");
    expect(scanner).toContain("any other direct process.env reference remains a failure");
  });
});
