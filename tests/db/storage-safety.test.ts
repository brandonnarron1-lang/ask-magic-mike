import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Reset env state around each test
function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const SUPABASE_URL = "https://test.supabase.co";
const SUPABASE_KEY = "test-service-key";

describe("storage safety functions", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    for (const key of ["NODE_ENV", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
      if (key in originalEnv) process.env[key] = (originalEnv as Record<string, string>)[key];
      else delete process.env[key];
    }
    vi.resetModules();
  });

  describe("shouldUseDevStorage()", () => {
    it("is true in development without Supabase", async () => {
      setEnv({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { shouldUseDevStorage } = await import("@/lib/db/types");
      expect(shouldUseDevStorage()).toBe(true);
    });

    it("is false in development WITH Supabase configured", async () => {
      setEnv({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY });
      vi.resetModules();
      const { shouldUseDevStorage } = await import("@/lib/db/types");
      expect(shouldUseDevStorage()).toBe(false);
    });

    it("is false in production even without Supabase", async () => {
      setEnv({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { shouldUseDevStorage } = await import("@/lib/db/types");
      expect(shouldUseDevStorage()).toBe(false);
    });

    it("is false in production WITH Supabase configured", async () => {
      setEnv({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY });
      vi.resetModules();
      const { shouldUseDevStorage } = await import("@/lib/db/types");
      expect(shouldUseDevStorage()).toBe(false);
    });
  });

  describe("isProduction()", () => {
    it("returns true when NODE_ENV is production", async () => {
      setEnv({ NODE_ENV: "production" });
      vi.resetModules();
      const { isProduction } = await import("@/lib/db/types");
      expect(isProduction()).toBe(true);
    });

    it("returns false when NODE_ENV is development", async () => {
      setEnv({ NODE_ENV: "development" });
      vi.resetModules();
      const { isProduction } = await import("@/lib/db/types");
      expect(isProduction()).toBe(false);
    });

    it("returns false when NODE_ENV is test", async () => {
      setEnv({ NODE_ENV: "test" });
      vi.resetModules();
      const { isProduction } = await import("@/lib/db/types");
      expect(isProduction()).toBe(false);
    });
  });

  describe("isSupabaseConfigured()", () => {
    it("returns true when both keys are set", async () => {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY });
      vi.resetModules();
      const { isSupabaseConfigured } = await import("@/lib/db/types");
      expect(isSupabaseConfigured()).toBe(true);
    });

    it("returns false when URL is missing", async () => {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY });
      vi.resetModules();
      const { isSupabaseConfigured } = await import("@/lib/db/types");
      expect(isSupabaseConfigured()).toBe(false);
    });

    it("returns false when key is missing", async () => {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { isSupabaseConfigured } = await import("@/lib/db/types");
      expect(isSupabaseConfigured()).toBe(false);
    });

    it("returns false when both are missing", async () => {
      setEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { isSupabaseConfigured } = await import("@/lib/db/types");
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe("requireSupabaseForProduction()", () => {
    it("throws in production without Supabase", async () => {
      setEnv({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { requireSupabaseForProduction } = await import("@/lib/db/types");
      expect(() => requireSupabaseForProduction()).toThrow("Supabase is required in production");
    });

    it("does not throw in development without Supabase", async () => {
      setEnv({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { requireSupabaseForProduction } = await import("@/lib/db/types");
      expect(() => requireSupabaseForProduction()).not.toThrow();
    });

    it("does not throw in production with Supabase configured", async () => {
      setEnv({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY });
      vi.resetModules();
      const { requireSupabaseForProduction } = await import("@/lib/db/types");
      expect(() => requireSupabaseForProduction()).not.toThrow();
    });
  });

  describe("getLeadsForAdmin() mode selection", () => {
    it("returns mode=dev in development without Supabase", async () => {
      setEnv({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { getLeadsForAdmin } = await import("@/lib/db/lead-repository");
      const result = await getLeadsForAdmin();
      expect(result.mode).toBe("dev");
      expect(result.leads.length).toBeGreaterThan(0);
    });

    it("returns mode=locked in production without Supabase — never shows mock data", async () => {
      setEnv({ NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
      vi.resetModules();
      const { getLeadsForAdmin } = await import("@/lib/db/lead-repository");
      const result = await getLeadsForAdmin();
      expect(result.mode).toBe("locked");
      expect(result.leads).toHaveLength(0);
    });
  });
});

describe("rate limiter", () => {
  it("allows requests within limit", async () => {
    const { checkRateLimit } = await import("@/lib/security/rate-limit");
    const result = checkRateLimit("test-ip-1", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over limit", async () => {
    const { checkRateLimit } = await import("@/lib/security/rate-limit");
    const key = `test-ip-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60000);
    const result = checkRateLimit(key, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const { checkRateLimit } = await import("@/lib/security/rate-limit");
    const key = `test-ip-reset-${Date.now()}`;
    for (let i = 0; i < 2; i++) checkRateLimit(key, 2, 1); // 1ms window
    await new Promise((r) => setTimeout(r, 5));
    const result = checkRateLimit(key, 2, 1);
    expect(result.allowed).toBe(true);
  });
});
