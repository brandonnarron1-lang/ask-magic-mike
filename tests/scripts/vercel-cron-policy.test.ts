import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { config as middlewareConfig } from "../../middleware";

type CronConfig = {
  path?: string;
  schedule?: string;
};

describe("Vercel cron release policy", () => {
  it("sweeps SLA state every five minutes through the canonical route", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: CronConfig[] };

    const slaCron = config.crons?.filter(
      (entry) => entry.path === "/api/admin/sla/sweep",
    );

    expect(slaCron).toEqual([
      { path: "/api/admin/sla/sweep", schedule: "*/5 * * * *" },
    ]);
  });

  it("processes due notification retries every minute through the existing outbox route", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: CronConfig[] };

    const notificationRetryCron = config.crons?.filter(
      (entry) => entry.path === "/api/admin/notifications/retry",
    );

    expect(notificationRetryCron).toEqual([
      { path: "/api/admin/notifications/retry", schedule: "* * * * *" },
    ]);
  });

  it("keeps server-to-server cron routes outside the browser-admin matcher", () => {
    expect(middlewareConfig.matcher[0]).toBe("/admin/:path*");
    expect(JSON.stringify(middlewareConfig.matcher)).not.toContain("/api/admin");
  });
});
