import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.fn();
const recordMock = vi.fn();

vi.mock("../../src/lib/security/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
  LIMITS: { analyticsEvent: { limit: 60, windowMs: 60_000 } },
  rateLimitKey: () => "test-client",
}));

vi.mock("../../app/lib/publicOrigin", () => ({
  isApprovedPublicOrigin: (origin: string | null) => origin === "https://www.askmagicmike.com",
}));

vi.mock("../../app/lib/persistence/neonPublicExperimentRepository", () => ({
  recordPublicExperimentEvent: (...args: unknown[]) => recordMock(...args),
}));

import { POST } from "../../app/api/experiments/event/route";

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

describe("POST /api/experiments/event", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "production");
    rateLimitMock.mockReset();
    rateLimitMock.mockResolvedValue({ allowed: true });
    recordMock.mockReset();
    recordMock.mockResolvedValue({ active: false, recorded: false, variantKey: null, reason: "disabled" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an inert accepted response when the server-side gate is disabled", async () => {
    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
    }));
    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toMatchObject({ active: false, recorded: false, variant_key: null });
  });

  it("fails closed in read-only Preview before limiter or experiment persistence", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DATABASE_ENV", "preview");
    vi.stubEnv("PREVIEW_DATA_MODE", "disabled");
    vi.stubEnv("ALLOW_PREVIEW_DB_MUTATION", "false");

    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      active: false,
      recorded: false,
      error: "preview_data_disabled",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("accepts but does not persist automated-browser experiment exposure", async () => {
    const response = await POST(request(
      {
        experiment_key: "home_value_trust_promise_v1",
        subject_key: "a".repeat(64),
        event_name: "exposure",
      },
      "https://www.askmagicmike.com",
      "Mozilla/5.0 HeadlessChrome/140",
    ));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      active: false,
      recorded: false,
      excluded: "automation",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("fails closed before rate limiting or persisting ordinary Preview experiment telemetry", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      active: false,
      recorded: false,
      error: "preview_data_disabled",
    });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects unapproved origins before repository access", async () => {
    const response = await POST(request({}, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects a missing browser Origin before rate limiting or repository access", async () => {
    const response = await POST(request({}, null));
    expect(response.status).toBe(403);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and oversized payloads before repository access", async () => {
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

    const streamedOversize = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
      padding: "x".repeat(4_096),
    }));
    expect(streamedOversize.status).toBe(413);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      experiment_key: "A".repeat(81),
      subject_key: "a".repeat(64),
      event_name: "exposure",
    },
    {
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "not-a-subject-key",
      event_name: "exposure",
    },
    {
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
      lead_id: "00000000-0000-4000-8000-000000000001",
    },
    {
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "lead_created",
      lead_id: "not-a-uuid",
    },
    {
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "exposure",
      surface: "person@example.com",
    },
  ])("rejects malformed or context-inconsistent experiment input %#", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("rejects event-name substitution instead of coercing it to an exposure", async () => {
    const response = await POST(request({
      experiment_key: "home_value_trust_promise_v1",
      subject_key: "a".repeat(64),
      event_name: "manufactured_conversion",
    }));
    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });
});
