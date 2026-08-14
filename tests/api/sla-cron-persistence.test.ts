import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "../../src/app/api/admin/sla/sweep/route";
import { SlaSweepEngine } from "../../src/lib/engines/sla-sweep";

const envKeys = [
  "ADMIN_SECRET",
  "CRON_SECRET",
  "DATABASE_URL",
  "VERCEL_ENV",
  "DATABASE_ENV",
] as const;

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of envKeys) delete process.env[key];
});

describe("scheduled SLA persistence", () => {
  it("persists authenticated cron sweeps without requiring a query string", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    process.env.DATABASE_URL = "postgresql://user:password@example.invalid/neondb";
    process.env.VERCEL_ENV = "production";
    process.env.DATABASE_ENV = "production";
    const sweep = vi.spyOn(SlaSweepEngine.prototype, "sweep").mockResolvedValue({
      scanned: 0,
      breaches: [],
      summary: { total: 0, withinTarget: 0, breached: 0, hitRate: 1 },
      flaggedCount: 0,
    });

    const response = await GET(new NextRequest("https://www.askmagicmike.com/api/admin/sla/sweep", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(200);
    expect(sweep).toHaveBeenCalledWith({ persistBreaches: true });
  });

  it("keeps manual administrator sweeps dry-run by default", async () => {
    process.env.ADMIN_SECRET = "admin-test-secret";
    process.env.DATABASE_URL = "postgresql://user:password@example.invalid/neondb";
    const sweep = vi.spyOn(SlaSweepEngine.prototype, "sweep").mockResolvedValue({
      scanned: 0,
      breaches: [],
      summary: { total: 0, withinTarget: 0, breached: 0, hitRate: 1 },
      flaggedCount: 0,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/sla/sweep", {
      headers: { "x-admin-secret": "admin-test-secret" },
    }));

    expect(response.status).toBe(200);
    expect(sweep).toHaveBeenCalledWith({ persistBreaches: false });
  });
});
