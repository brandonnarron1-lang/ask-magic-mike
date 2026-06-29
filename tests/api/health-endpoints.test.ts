/**
 * Tests for health endpoints:
 *   GET /api/health/live
 *   GET /api/health/ready
 *   GET /api/health/dependencies
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  return {
    dbError: { current: null as string | null },
    validateResult: {
      current: {
        ok: true,
        fatal: [] as Array<{ name: string; status: string; message: string }>,
        warnings: [] as Array<{ name: string; status: string; message: string }>,
        checks: [
          { name: "env:NEXT_PUBLIC_SUPABASE_URL", status: "ok", message: "configured" },
          { name: "db:connectivity", status: "ok", message: "reachable" },
        ] as Array<{ name: string; status: string; message: string }>,
      },
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (_table: string): any => ({
      select: () => ({
        limit: () => {
          if (mocks.dbError.current) {
            return Promise.resolve({ error: { message: mocks.dbError.current } });
          }
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }),
  }),
}));

vi.mock("@/lib/startup/validate", () => ({
  validateStartup: () => Promise.resolve(mocks.validateResult.current),
}));

vi.mock("@/lib/admin/auth", () => ({
  checkAdminAuth: (req: NextRequest) => {
    const secret = req.headers.get("x-admin-secret");
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) return { ok: false, error: "admin_secret_not_configured", status: 503 };
    if (secret !== adminSecret) return { ok: false, error: "unauthorized", status: 401 };
    return { ok: true };
  },
}));

import { GET as liveGET } from "@/app/api/health/live/route";
import { GET as readyGET } from "@/app/api/health/ready/route";
import { GET as depsGET } from "@/app/api/health/dependencies/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost${path}`, { headers });
}

function authed(path: string): NextRequest {
  return makeReq(path, { "x-admin-secret": "test-secret" });
}

// ─── /api/health/live ─────────────────────────────────────────────────────────

describe("GET /api/health/live", () => {
  it("returns 200 with ok:true and status:live", async () => {
    const res = await liveGET();
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.status).toBe("live");
  });

  it("always returns 200 regardless of env or DB state", async () => {
    mocks.dbError.current = "connection refused";
    const res = await liveGET();
    expect(res.status).toBe(200);
    mocks.dbError.current = null;
  });
});

// ─── /api/health/ready ────────────────────────────────────────────────────────

describe("GET /api/health/ready", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.ADMIN_SECRET = "test-secret";
    mocks.dbError.current = null;
  });

  it("returns 200 with ok:true and status:ready when all checks pass", async () => {
    const res = await readyGET();
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ready");
  });

  it("returns 503 with reason:configuration_error when env vars missing", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    const res = await readyGET();
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("configuration_error");
  });

  it("returns 503 with reason:db_unreachable when DB returns error", async () => {
    mocks.dbError.current = "connection refused";
    const res = await readyGET();
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("db_unreachable");
  });

  it("does not expose which env var is missing in 503 response", async () => {
    delete (process.env as Record<string, string | undefined>).ADMIN_SECRET;
    const res = await readyGET();
    const body = await res.json() as Record<string, unknown>;
    // Should not leak the specific var name — only generic reason
    expect(body.reason).toBe("configuration_error");
    expect(JSON.stringify(body)).not.toContain("ADMIN_SECRET");
  });
});

// ─── /api/health/dependencies ─────────────────────────────────────────────────

describe("GET /api/health/dependencies", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret";
    mocks.dbError.current = null;
    mocks.validateResult.current = {
      ok: true,
      fatal: [],
      warnings: [],
      checks: [
        { name: "env:NEXT_PUBLIC_SUPABASE_URL", status: "ok", message: "configured" },
        { name: "db:connectivity", status: "ok", message: "reachable" },
        { name: "db:table:leads", status: "ok", message: "accessible" },
      ],
    };
  });

  it("returns 401 without admin auth", async () => {
    const res = await depsGET(makeReq("/api/health/dependencies"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong admin secret", async () => {
    const res = await depsGET(makeReq("/api/health/dependencies", { "x-admin-secret": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok:true when all dependencies healthy", async () => {
    const res = await depsGET(authed("/api/health/dependencies"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.status).toBe("healthy");
  });

  it("response includes summary with check counts", async () => {
    const res = await depsGET(authed("/api/health/dependencies"));
    const body = await res.json() as Record<string, unknown>;
    const summary = body.summary as Record<string, unknown>;
    expect(typeof summary.total).toBe("number");
    expect(typeof summary.passed).toBe("number");
    expect(typeof summary.failed).toBe("number");
    expect(typeof summary.warnings).toBe("number");
  });

  it("response includes checks array", async () => {
    const res = await depsGET(authed("/api/health/dependencies"));
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.checks)).toBe(true);
  });

  it("response includes timestamp", async () => {
    const res = await depsGET(authed("/api/health/dependencies"));
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns 503 with status:degraded when a dependency fails", async () => {
    mocks.validateResult.current = {
      ok: false,
      fatal: [{ name: "db:connectivity", status: "fail", message: "unreachable" }],
      warnings: [],
      checks: [
        { name: "env:NEXT_PUBLIC_SUPABASE_URL", status: "ok", message: "configured" },
        { name: "db:connectivity", status: "fail", message: "unreachable" },
      ],
    };

    const res = await depsGET(authed("/api/health/dependencies"));
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.status).toBe("degraded");
  });

  it("summary.failed matches the count of fatal checks", async () => {
    mocks.validateResult.current = {
      ok: false,
      fatal: [
        { name: "db:connectivity", status: "fail", message: "unreachable" },
        { name: "db:table:leads", status: "fail", message: "missing" },
      ],
      warnings: [],
      checks: [
        { name: "env:NEXT_PUBLIC_SUPABASE_URL", status: "ok", message: "configured" },
        { name: "db:connectivity", status: "fail", message: "unreachable" },
        { name: "db:table:leads", status: "fail", message: "missing" },
      ],
    };

    const res = await depsGET(authed("/api/health/dependencies"));
    const body = await res.json() as Record<string, unknown>;
    const summary = body.summary as Record<string, unknown>;
    expect(summary.failed).toBe(2);
  });

  it("response does not include Cache-Control: public", async () => {
    const res = await depsGET(authed("/api/health/dependencies"));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("no-store");
    expect(cc).not.toContain("public");
  });
});
