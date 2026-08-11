import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Ask Magic Mike system isolation", () => {
  it("never performs database schema DDL from the push request repository", async () => {
    const source = await readFile(
      resolve("app/lib/persistence/neonPushSubscriptionRepository.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|INDEX|POLICY)\b/i);
    expect(source).toContain("push_subscription_schema_missing");
  });

  it("pins the dedicated Ask Magic Mike Vercel identity in the release guard", async () => {
    const source = await readFile(resolve("scripts/amm/verify-system-isolation.mjs"), "utf8");
    expect(source).toContain('projectId: "prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8"');
    expect(source).toContain('orgId: "team_OVg2uOSyJCpX100BPgb8nJK9"');
    expect(source).toContain('projectName: "ask-magic-mike"');
    expect(source).toContain("process.env.VERCEL_PROJECT_ID");
    expect(source).toContain("process.env.VERCEL_ORG_ID");
  });
});
