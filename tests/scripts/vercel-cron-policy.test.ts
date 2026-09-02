import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
});
