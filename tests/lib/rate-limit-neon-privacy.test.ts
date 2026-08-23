import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const neonState = vi.hoisted(() => ({
  calls: [] as Array<{ text: string; values: unknown[] }>,
  failure: null as Error | null,
  neon: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: (...args: unknown[]) => {
    neonState.neon(...args);
    return async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (neonState.failure) throw neonState.failure;
      neonState.calls.push({ text: strings.join("?"), values });
      return [{ request_count: 1, reset_at: Date.now() + 60_000 }];
    };
  },
}));

const originalEnv = { ...process.env };

describe("Neon durable rate-limit privacy", () => {
  beforeEach(() => {
    vi.resetModules();
    neonState.calls.length = 0;
    neonState.failure = null;
    neonState.neon.mockClear();
    process.env.DATABASE_URL = "postgresql://rate-limit.invalid/neondb";
    process.env.RATE_LIMIT_HASH_SECRET = "unit-test-rate-limit-secret-32-chars";
    process.env.CONSENT_IP_HASH_SALT = "";
    process.env.CRON_SECRET = "";
    process.env.ADMIN_SECRET = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("sends only an HMAC bucket identifier to Neon and prunes stale buckets", async () => {
    const { checkRateLimit } = await import("@/lib/security/rate-limit");
    const rawKey = "203.0.113.42";

    const result = await checkRateLimit(rawKey, 10, 60_000, "intakeSubmit");

    expect(result).toMatchObject({ allowed: true, remaining: 9, durable: true });
    expect(neonState.neon).toHaveBeenCalledWith(process.env.DATABASE_URL);
    expect(neonState.calls).toHaveLength(1);
    expect(neonState.calls[0].text).toContain("DELETE FROM public.rate_limit_buckets");
    expect(neonState.calls[0].text).toContain("updated_at = NOW()");
    expect(neonState.calls[0].values).not.toContain(rawKey);
    expect(neonState.calls[0].values).not.toContain(process.env.RATE_LIMIT_HASH_SECRET);
    expect(neonState.calls[0].values).toContain(24 * 60 * 60 * 1000);
    expect(neonState.calls[0].values).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^amm:rl:v1:intakeSubmit:[0-9a-f]{64}$/),
      ]),
    );
  });

  it("redacts Neon failure details from runtime logs", async () => {
    const credentialMarker = "SYNTHETIC_PRIVATE_CONNECTION_DETAIL_DO_NOT_LOG";
    neonState.failure = new Error(`connect failed; detail=${credentialMarker}`);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { checkRateLimit } = await import("@/lib/security/rate-limit");

    const result = await checkRateLimit("203.0.113.43", 10, 60_000, "intakeSubmit");

    expect(result).toMatchObject({ allowed: true, durable: false });
    expect(consoleError).toHaveBeenCalledWith(
      "[rate-limit] Failed to use Neon durable rate limiting; error_code=connection_failed",
    );
    const serializedCalls = JSON.stringify(consoleError.mock.calls);
    expect(serializedCalls).not.toContain(credentialMarker);
    expect(serializedCalls).not.toContain("SYNTHETIC_PRIVATE_CONNECTION_DETAIL");
  });
});
