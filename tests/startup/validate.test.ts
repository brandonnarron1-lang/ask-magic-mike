/**
 * Tests for src/lib/startup/validate.ts
 *
 * Verifies that the startup validation module correctly identifies missing
 * env vars, DB connectivity failures, and table access failures.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const dbError = { current: null as string | null };
  const tableErrors = { current: new Map<string, string>() };
  return { dbError, tableErrors };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string): any => ({
      // Returns a thenable that also has .limit() for chaining.
      // This covers both:
      //   from("sessions").select("id").limit(1)  — connectivity probe
      //   from(table).select("*", {head:true})    — table existence probe (awaited directly)
      select: (_cols: string, _opts?: Record<string, unknown>) => {
        const resolve = async () => {
          if (mocks.dbError.current) {
            return { data: null, error: { message: mocks.dbError.current } };
          }
          const tErr = mocks.tableErrors.current.get(table);
          if (tErr) {
            return { data: null, error: { message: tErr } };
          }
          return { data: [], error: null };
        };
        const promise = resolve();
        return Object.assign(promise, {
          limit: (_n: number) => promise,
        });
      },
    }),
  }),
}));

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { validateStartup } from "@/lib/startup/validate";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SECRET",
] as const;

function setRequiredEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.ADMIN_SECRET = "test-admin-secret";
}

function clearRequiredEnv() {
  for (const key of REQUIRED_ENV_KEYS) {
    delete (process.env as Record<string, string | undefined>)[key];
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("validateStartup — env var checks", () => {
  beforeEach(() => {
    mocks.dbError.current = null;
    mocks.tableErrors.current = new Map();
  });

  afterEach(() => {
    clearRequiredEnv();
  });

  it("fails when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.ADMIN_SECRET = "test-secret";

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const failing = result.fatal.map((c) => c.name);
    expect(failing).toContain("env:NEXT_PUBLIC_SUPABASE_URL");
  });

  it("fails when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.ADMIN_SECRET = "test-secret";

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const failing = result.fatal.map((c) => c.name);
    expect(failing).toContain("env:SUPABASE_SERVICE_ROLE_KEY");
  });

  it("fails when ADMIN_SECRET is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const failing = result.fatal.map((c) => c.name);
    expect(failing).toContain("env:ADMIN_SECRET");
  });

  it("warns when CRON_SECRET is missing but does not fail", async () => {
    setRequiredEnv();
    delete (process.env as Record<string, string | undefined>).CRON_SECRET;

    const result = await validateStartup();
    const warnNames = result.warnings.map((c) => c.name);
    expect(warnNames).toContain("env:CRON_SECRET");
    // warnings don't make ok false
    expect(result.ok).toBe(true);
  });

  it("passes env checks when all required vars are set", async () => {
    setRequiredEnv();

    const result = await validateStartup();
    const envFails = result.fatal.filter((c) => c.name.startsWith("env:"));
    expect(envFails).toHaveLength(0);
  });
});

describe("validateStartup — DB connectivity", () => {
  beforeEach(() => {
    mocks.dbError.current = null;
    mocks.tableErrors.current = new Map();
  });

  afterEach(() => {
    clearRequiredEnv();
  });

  it("passes when Supabase returns no error", async () => {
    setRequiredEnv();

    const result = await validateStartup();
    const dbCheck = result.checks.find((c) => c.name === "db:connectivity");
    expect(dbCheck?.status).toBe("ok");
  });

  it("fails when Supabase returns a connectivity error", async () => {
    setRequiredEnv();
    mocks.dbError.current = "connection refused";

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const dbCheck = result.fatal.find((c) => c.name === "db:connectivity");
    expect(dbCheck).toBeDefined();
    expect(dbCheck?.message).toContain("connection refused");
  });

  it("skips DB probe when Supabase env vars are missing", async () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    delete (process.env as Record<string, string | undefined>).SUPABASE_SERVICE_ROLE_KEY;
    process.env.ADMIN_SECRET = "test-secret";

    const result = await validateStartup();
    const dbCheck = result.fatal.find((c) => c.name === "db:connectivity");
    expect(dbCheck).toBeDefined();
    expect(dbCheck?.message).toContain("env vars missing");
  });
});

describe("validateStartup — table checks", () => {
  beforeEach(() => {
    mocks.dbError.current = null;
    mocks.tableErrors.current = new Map();
  });

  afterEach(() => {
    clearRequiredEnv();
  });

  it("reports all critical tables as ok when DB is healthy", async () => {
    setRequiredEnv();

    const result = await validateStartup();
    const tableFails = result.fatal.filter((c) => c.name.startsWith("db:table:"));
    expect(tableFails).toHaveLength(0);

    const tableOks = result.checks.filter(
      (c) => c.name.startsWith("db:table:") && c.status === "ok"
    );
    expect(tableOks.length).toBeGreaterThan(0);
  });

  it("fails when leads table is not accessible", async () => {
    setRequiredEnv();
    mocks.tableErrors.current.set("leads", "relation does not exist");

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const leadsCheck = result.fatal.find((c) => c.name === "db:table:leads");
    expect(leadsCheck).toBeDefined();
    expect(leadsCheck?.message).toContain("relation does not exist");
  });

  it("fails when agents table is not accessible", async () => {
    setRequiredEnv();
    mocks.tableErrors.current.set("agents", "relation does not exist");

    const result = await validateStartup();
    expect(result.ok).toBe(false);
    const check = result.fatal.find((c) => c.name === "db:table:agents");
    expect(check).toBeDefined();
    expect(check?.message).toContain("relation does not exist");
  });
});

describe("validateStartup — result shape", () => {
  beforeEach(() => {
    mocks.dbError.current = null;
    mocks.tableErrors.current = new Map();
  });

  afterEach(() => {
    clearRequiredEnv();
  });

  it("returns ok:true when all checks pass", async () => {
    setRequiredEnv();

    const result = await validateStartup();
    expect(result.ok).toBe(true);
    expect(result.fatal).toHaveLength(0);
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("returns structured check objects with name/status/message", async () => {
    setRequiredEnv();

    const result = await validateStartup();
    for (const check of result.checks) {
      expect(check).toHaveProperty("name");
      expect(check).toHaveProperty("status");
      expect(check).toHaveProperty("message");
      expect(["ok", "fail", "warn"]).toContain(check.status);
    }
  });

  it("fatal array contains only fail-status checks", async () => {
    setRequiredEnv();
    mocks.tableErrors.current.set("leads", "error");

    const result = await validateStartup();
    for (const c of result.fatal) {
      expect(c.status).toBe("fail");
    }
  });

  it("warnings array contains only warn-status checks", async () => {
    setRequiredEnv();
    delete (process.env as Record<string, string | undefined>).CRON_SECRET;

    const result = await validateStartup();
    for (const c of result.warnings) {
      expect(c.status).toBe("warn");
    }
  });
});
