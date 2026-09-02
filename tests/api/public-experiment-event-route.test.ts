import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.fn();
const nonDurableFallbackMock = vi.fn();
const recordMock = vi.fn();

vi.mock("../../src/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
  LIMITS: { analyticsEvent: { limit: 60, windowMs: 60_000 } },
  nonDurableRateLimitFallbackAllowed: () => nonDurableFallbackMock(),
  rateLimitKey: () => "test-client",
}));

vi.mock("../../app/lib/publicOrigin", () => ({
  isApprovedPublicOrigin: (origin: string | null) => origin === "https://www.askmagicmike.com",
}));

vi.mock("../../app/lib/persistence/neonPublicExperimentRepository", () => ({
  recordPublicExperimentEvent: (...args: unknown[]) => recordMock(...args),
}));

import { POST } from "../../app/api/experiments/event/route";

const EXPERIMENT_KEY = "home_value_trust_promise_v1";
const SUBJECT_KEY = "a".repeat(64);
const SURFACE = "/home-value";

function request(
  body: unknown,
  origin: string | null = "https://www.askmagicmike.com",
  userAgent = "Mozilla/5.0 Chrome/140",
) {
  const headers = new Headers({
    "content-type": "application/json",
    "user-agent": userAgent,
  });
  if (origin) headers.set("origin", origin);
  return new Request("https://www.askmagicmike.com/api/experiments/event", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function validExposure(overrides: Record<string, unknown> = {}) {
  return {
    experiment_key: EXPERIMENT_KEY,
    subject_key: SUBJECT_KEY,
    event_name: "exposure",
    surface: SURFACE,
    ...overrides,
  };
}

async function readResponse(response: Response) {
  const body = await response.json() as Record<string, unknown>;
  expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("X-AMM-Correlation-Id")).toBeTruthy();
  expect(body.correlation_id).toBe(response.headers.get("X-AMM-Correlation-Id"));
  return body;
}

describe("POST /api/experiments/event", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: true,
    });
    nonDurableFallbackMock.mockReset();
    nonDurableFallbackMock.mockReturnValue(false);
    recordMock.mockReset();
    recordMock.mockResolvedValue({
      active: false,
      recorded: false,
      variantKey: null,
      reason: "disabled",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an inert accepted response when the server-side gate is disabled", async () => {
    const response = await POST(request(validExposure()));
    expect(response.status).toBe(202);
    await expect(readResponse(response)).resolves.toMatchObject({
      active: false,
      recorded: false,
      variant_key: null,
    });
    expect(recordMock).toHaveBeenCalledWith({
      experimentKey: EXPERIMENT_KEY,
      subjectKey: SUBJECT_KEY,
      eventName: "exposure",
      surface: SURFACE,
    });
  });

  it("records only a valid exposure through the canonical repository", async () => {
    recordMock.mockResolvedValue({
      active: true,
      recorded: true,
      variantKey: "control",
      reason: "recorded",
    });
    const response = await POST(request(validExposure()));
    expect(response.status).toBe(202);
    await expect(readResponse(response)).resolves.toMatchObject({
      active: true,
      recorded: true,
      variant_key: "control",
    });
    expect(rateLimitMock).toHaveBeenCalledOnce();
    expect(recordMock).toHaveBeenCalledOnce();
  });

  it("fails closed in read-only Preview before limiter or experiment persistence", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DATABASE_ENV", "preview");
    vi.stubEnv("PREVIEW_DATA_MODE", "disabled");
    vi.stubEnv("ALLOW_PREVIEW_DB_MUTATION", "false");

    const response = await POST(request(validExposure()));
    expect(response.status).toBe(503);
    await expect(readResponse(response)).resolves.toMatchObject({
      active: false,
      recorded: false,
      code: "preview_data_disabled",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("accepts but never persists automated-browser exposure", async () => {
    const response = await POST(request(
      validExposure(),
      "https://www.askmagicmike.com",
      "Mozilla/5.0 HeadlessChrome/140",
    ));
    expect(response.status).toBe(202);
    await expect(readResponse(response)).resolves.toMatchObject({
      active: false,
      recorded: false,
      excluded: "automation",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it.each([null, "https://attacker.example"])(
    "rejects missing or foreign Origin before limiter and repository access: %s",
    async (origin) => {
      const response = await POST(request(validExposure(), origin));
      expect(response.status).toBe(403);
      await expect(readResponse(response)).resolves.toMatchObject({ code: "origin_not_approved" });
      expect(rateLimitMock).not.toHaveBeenCalled();
      expect(recordMock).not.toHaveBeenCalled();
    },
  );

  it("requires durable rate limiting in Production", async () => {
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    const response = await POST(request(validExposure()));
    expect(response.status).toBe(503);
    await expect(readResponse(response)).resolves.toMatchObject({
      code: "rate_limit_store_unavailable",
    });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("allows the exact controlled non-durable break-glass decision", async () => {
    rateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60_000,
      durable: false,
    });
    nonDurableFallbackMock.mockReturnValue(true);
    const response = await POST(request(validExposure()));
    expect(response.status).toBe(202);
    await readResponse(response);
    expect(recordMock).toHaveBeenCalledOnce();
  });

  it("returns a bounded Retry-After when the limiter rejects the request", async () => {
    rateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 10 * 60_000,
      durable: true,
    });
    const response = await POST(request(validExposure()));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(Number(response.headers.get("Retry-After"))).toBeLessThanOrEqual(60);
    await expect(readResponse(response)).resolves.toMatchObject({ code: "rate_limited" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and declared or streamed oversized payloads", async () => {
    const unsupported = await POST(new Request(
      "https://www.askmagicmike.com/api/experiments/event",
      {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          origin: "https://www.askmagicmike.com",
          "user-agent": "Mozilla/5.0 Chrome/140",
        },
        body: "not-json",
      },
    ));
    expect(unsupported.status).toBe(415);
    await expect(readResponse(unsupported)).resolves.toMatchObject({ code: "unsupported_media_type" });

    const declaredOversize = await POST(new Request(
      "https://www.askmagicmike.com/api/experiments/event",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "4097",
          origin: "https://www.askmagicmike.com",
          "user-agent": "Mozilla/5.0 Chrome/140",
        },
        body: "{}",
      },
    ));
    expect(declaredOversize.status).toBe(413);
    await expect(readResponse(declaredOversize)).resolves.toMatchObject({ code: "payload_too_large" });

    const streamedOversize = await POST(request(validExposure({ padding: "x".repeat(4_096) })));
    expect(streamedOversize.status).toBe(413);
    await expect(readResponse(streamedOversize)).resolves.toMatchObject({ code: "payload_too_large" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects unknown fields instead of silently accepting them", async () => {
    const response = await POST(request(validExposure({ unexpected: "value" })));
    expect(response.status).toBe(400);
    await expect(readResponse(response)).resolves.toMatchObject({ code: "unexpected_field" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects public conversion authorship even when a lead UUID is supplied", async () => {
    const response = await POST(request(validExposure({
      event_name: "lead_created",
      lead_id: "22222222-2222-4222-8222-222222222222",
    })));
    expect(response.status).toBe(400);
    await expect(readResponse(response)).resolves.toMatchObject({ code: "server_event_required" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it.each([
    validExposure({ subject_key: "not-a-subject-key" }),
    validExposure({ event_name: "manufactured_conversion" }),
    validExposure({ surface: "/ask" }),
    validExposure({ experiment_key: "unknown_experiment_v1" }),
    {
      experiment_key: EXPERIMENT_KEY,
      subject_key: SUBJECT_KEY,
      event_name: "exposure",
    },
  ])("rejects malformed, unknown, or cross-surface input %#", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    await readResponse(response);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it.each(["result", "throw"])(
    "fails closed when the experiment repository is unavailable: %s",
    async (mode) => {
      if (mode === "throw") recordMock.mockRejectedValue(new Error("synthetic database outage"));
      else recordMock.mockResolvedValue({ active: false, recorded: false, variantKey: null, reason: "unavailable" });

      const response = await POST(request(validExposure()));
      expect(response.status).toBe(503);
      await expect(readResponse(response)).resolves.toMatchObject({ code: "experiment_store_unavailable" });
    },
  );
});
