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

  it("is linked to the dedicated Ask Magic Mike Vercel project", async () => {
    const linked = JSON.parse(await readFile(resolve(".vercel/project.json"), "utf8"));
    expect(linked).toEqual({
      projectId: "prj_gxOKtO9yz1ziGTeiuKGONkSdPjO8",
      orgId: "team_OVg2uOSyJCpX100BPgb8nJK9",
      projectName: "ask-magic-mike",
    });
  });
});
